<?php
declare(strict_types=1);

// Supplier compliance by jurisdiction. The registry and fiscal_rules.php
// decide which identifiers, declarations and documents a supplier needs; this
// module collects them, stores them encrypted and keeps a server-computed
// evaluation per legal entity (tenant_supplier_compliance). Loaded by index.php.

require_once __DIR__ . '/cfdi/SatCatalog.php';

const COMPLIANCE_DOCUMENT_MAX_BYTES = 3145728;

function compliance_document_require_write(array $session): void {
    if (!tenant_header_origin_is_safe() || !hash_equals($session['csrf'], workspace_header('X-Buyniverse-CSRF')) || workspace_header('X-Buyniverse-Request') !== 'compliance-document-v1')
        fail_response(403, 'Request verification failed');
    if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > COMPLIANCE_DOCUMENT_MAX_BYTES + 65536) fail_response(413, 'The document is larger than 3 MB');
    $lastWrite = (float) ($_SESSION['compliance_document_last_write'] ?? 0);
    if (microtime(true) - $lastWrite < 1.5) fail_response(429, 'Please wait before uploading again');
    $_SESSION['compliance_document_last_write'] = microtime(true);
}

function compliance_country(string $code): ?array {
    $code = strtoupper(trim($code));
    if ($code === 'OTHER') $code = 'ZZ';
    return preg_match('/^[A-Z]{2}$/', $code) === 1 ? fiscal_find_country(fiscal_registry(), $code) : null;
}

/** Only answers to the jurisdiction's own questions, as booleans or short codes. */
function compliance_clean_answers($raw, array $country): array {
    $answers = [];
    if (!is_array($raw)) return $answers;
    foreach ($country['questions'] ?? [] as $question) {
        $value = $raw[$question['id']] ?? null;
        if (($question['type'] ?? 'boolean') === 'boolean') { if (is_bool($value)) $answers[$question['id']] = $value; }
        else {
            $allowed = array_map(fn($option) => $option[0], $question['options'] ?? []);
            if (is_string($value) && in_array($value, $allowed, true)) $answers[$question['id']] = $value;
        }
    }
    return $answers;
}

/** Only declarations the jurisdiction defines; booleans or trimmed text. */
function compliance_clean_declarations($raw, array $country): array {
    $out = [];
    if (!is_array($raw)) return $out;
    foreach ($country['requirements'] as $requirement) {
        if ($requirement['kind'] !== 'declaration' || !array_key_exists($requirement['id'], $raw)) continue;
        $value = $raw[$requirement['id']];
        if (($requirement['input']['type'] ?? 'boolean') === 'boolean') { if (is_bool($value)) $out[$requirement['id']] = $value; }
        elseif (is_string($value)) $out[$requirement['id']] = tenant_text($value, 80);
    }
    return $out;
}

/**
 * Checks Mexican postal codes against the SAT catalogue, exactly: the code
 * must exist and belong to the declared state. Returns an error code or null.
 */
function compliance_mx_postal_error(string $postalCode, string $state): ?string {
    $info = \Buyniverse\Cfdi\SatCatalog::postalInfo($postalCode);
    if (!$info) return 'postal_unknown';
    return $info['state'] !== $state ? 'postal_state_mismatch' : null;
}

/** Requirement failures worth returning to the client (never secrets). */
function compliance_failures(array $evaluation, string $phase = 'enrollment'): array {
    $failures = [];
    foreach ($evaluation['requirements'] as $item) {
        if (!$item['blocking'] || $item['status'] === 'met' || ($phase === 'enrollment' && $item['phase'] !== 'enrollment')) continue;
        $failures[] = ['id'=>$item['id'], 'status'=>$item['status'], 'code'=>$item['code'] ?? null];
    }
    return $failures;
}

function compliance_status(array $evaluation): string {
    if ($evaluation['summary']['formal']) return 'formal';
    return $evaluation['summary']['enrollmentReady'] ? 'enrolled' : 'incomplete';
}

/** Rebuilds the profile from storage and re-evaluates it. */
function compliance_reevaluate(PDO $pdo, string $tenantId, string $entityId, string $key): ?array {
    $entity = $pdo->prepare('SELECT legal_name, tax_identifier, rfc, tax_regime, country_code, residence_country, fiscal_subdivision, fiscal_county, fiscal_postal_code FROM tenant_legal_entities WHERE id = ? AND tenant_id = ? LIMIT 1');
    $entity->execute([$entityId, $tenantId]); $row = $entity->fetch();
    $stored = $pdo->prepare('SELECT answers_json, declarations_ciphertext, declarations_iv, declarations_tag FROM tenant_supplier_compliance WHERE tenant_id = ? AND legal_entity_id = ? LIMIT 1');
    $stored->execute([$tenantId, $entityId]); $compliance = $stored->fetch();
    if (!is_array($row) || !is_array($compliance)) return null;
    $declarations = [];
    if ($compliance['declarations_ciphertext'] !== null) {
        $plain = openssl_decrypt((string) $compliance['declarations_ciphertext'], 'aes-256-gcm', $key, OPENSSL_RAW_DATA, (string) $compliance['declarations_iv'], (string) $compliance['declarations_tag'], 'buyniverse-compliance-v1|' . $tenantId . '|' . $entityId);
        $declarations = is_string($plain) ? (json_decode($plain, true) ?: []) : [];
    }
    $documents = [];
    $docs = $pdo->prepare('SELECT requirement_id, issued_on FROM tenant_compliance_documents WHERE tenant_id = ? AND legal_entity_id = ?');
    $docs->execute([$tenantId, $entityId]);
    foreach ($docs->fetchAll() as $doc) $documents[$doc['requirement_id']] = ['issuedOn'=>(string) $doc['issued_on']];
    $profile = [
        'accountKind'=>'business', 'taxId'=>(string) ($row['tax_identifier'] ?? $row['rfc'] ?? ''), 'legalName'=>(string) $row['legal_name'],
        'taxRegime'=>(string) ($row['tax_regime'] ?? ''), 'subdivision'=>(string) ($row['fiscal_subdivision'] ?? ''), 'county'=>(string) ($row['fiscal_county'] ?? ''),
        'postalCode'=>(string) ($row['fiscal_postal_code'] ?? ''), 'residenceCountry'=>(string) ($row['residence_country'] ?? ''),
        'answers'=>json_decode((string) ($compliance['answers_json'] ?? '{}'), true) ?: [], 'declarations'=>$declarations, 'documents'=>$documents,
    ];
    $evaluation = fiscal_evaluate(fiscal_registry(), (string) $row['country_code'], $profile);
    $pdo->prepare('UPDATE tenant_supplier_compliance SET status = ?, rules_version = ?, evaluation_json = ? WHERE tenant_id = ? AND legal_entity_id = ?')
        ->execute([compliance_status($evaluation), fiscal_registry()['version'], json_encode($evaluation, JSON_UNESCAPED_UNICODE), $tenantId, $entityId]);
    return $evaluation;
}

function compliance_store(PDO $pdo, string $tenantId, string $entityId, string $country, array $answers, array $declarations, array $evaluation, string $key): void {
    $box = $declarations ? workspace_encrypt(json_encode($declarations, JSON_UNESCAPED_UNICODE), $key, 'buyniverse-compliance-v1|' . $tenantId . '|' . $entityId) : [null, null, null];
    $pdo->prepare('INSERT INTO tenant_supplier_compliance (tenant_id, legal_entity_id, country_code, rules_version, status, answers_json, declarations_ciphertext, declarations_iv, declarations_tag, evaluation_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        ->execute([$tenantId, $entityId, $country, fiscal_registry()['version'], compliance_status($evaluation), json_encode((object) $answers), $box[0], $box[1], $box[2], json_encode($evaluation, JSON_UNESCAPED_UNICODE)]);
}

/** GET /api/v1/onboarding/compliance and POST /api/v1/onboarding/compliance-documents. */
function handle_compliance(string $uri, array $config, array $session, PDO $pdo, string $key): void {
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    $context = tenant_context($pdo, $config, $session, $key);
    $tenantId = (string) $context['tenant']['id']; $entityId = (string) $context['company']['id'];
    if (str_starts_with($uri, '/api/v1/onboarding/compliance-documents')) {
        if ($method !== 'POST') fail_response(405, 'Method not allowed');
        compliance_document_require_write($session);
        if (!hash_equals($entityId, strtolower((string) ($_POST['companyId'] ?? ''))) || !tenant_can_manage_company($pdo, $context, $entityId)) fail_response(403, 'Company administration permission is required');
        $evaluation = compliance_reevaluate($pdo, $tenantId, $entityId, $key);
        if (!$evaluation) fail_response(409, 'This company has no supplier profile');
        $requirementId = (string) ($_POST['requirementId'] ?? '');
        $requirement = null;
        foreach ($evaluation['requirements'] as $item) if ($item['id'] === $requirementId && $item['kind'] === 'document') $requirement = $item;
        if (!$requirement) fail_response(400, 'This document is not required for the company');
        $issuedOn = (string) ($_POST['issuedOn'] ?? '');
        $issued = DateTime::createFromFormat('!Y-m-d', $issuedOn, new DateTimeZone('UTC'));
        if (!$issued || $issued->format('Y-m-d') !== $issuedOn || $issued->getTimestamp() > time() + 86400) fail_response(400, 'Enter the date the document was issued');
        $file = $_FILES['document'] ?? null;
        if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file((string) ($file['tmp_name'] ?? ''))) fail_response(400, 'Attach the document as a PDF');
        $content = (string) file_get_contents($file['tmp_name']);
        if (strlen($content) < 64 || strlen($content) > COMPLIANCE_DOCUMENT_MAX_BYTES || !str_starts_with($content, '%PDF-')) fail_response(400, 'The document must be a PDF of up to 3 MB');
        $box = workspace_encrypt($content, $key, 'buyniverse-compliance-doc-v1|' . $tenantId . '|' . $entityId . '|' . $requirementId);
        $pdo->beginTransaction();
        try {
            $pdo->prepare('DELETE FROM tenant_compliance_documents WHERE tenant_id = ? AND legal_entity_id = ? AND requirement_id = ?')->execute([$tenantId, $entityId, $requirementId]);
            $id = tenant_uuid();
            $pdo->prepare('INSERT INTO tenant_compliance_documents (id, tenant_id, legal_entity_id, requirement_id, issued_on, content_ciphertext, content_iv, content_tag, content_sha256, byte_size, uploaded_by_principal_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                ->execute([$id, $tenantId, $entityId, $requirementId, $issuedOn, $box[0], $box[1], $box[2], hash('sha256', $content), strlen($content), $context['principalId']]);
            $evaluation = compliance_reevaluate($pdo, $tenantId, $entityId, $key);
            tenant_audit($pdo, $context, 'compliance.document_uploaded', 'tenant_compliance_documents', $id, ['requirement'=>$requirementId, 'issuedOn'=>$issuedOn, 'status'=>compliance_status($evaluation)], $key);
            $pdo->commit();
        } catch (Throwable $error) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $error; }
        workspace_json(['evaluation'=>$evaluation, 'status'=>compliance_status($evaluation), 'csrf'=>$session['csrf']]);
    }
    if ($method !== 'GET') fail_response(405, 'Method not allowed');
    $evaluation = compliance_reevaluate($pdo, $tenantId, $entityId, $key);
    workspace_json(['companyId'=>$entityId, 'evaluation'=>$evaluation, 'status'=>$evaluation ? compliance_status($evaluation) : null, 'csrf'=>$session['csrf']]);
}
