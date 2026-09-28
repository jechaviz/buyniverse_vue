<?php
declare(strict_types=1);

// Secure social onboarding and write-only fiscal credentials, split from
// index.php. Loaded only by index.php.

function tenant_fiscal_uploaded_file(string $name, string $extension, int $maxBytes): string {
    $file = $_FILES[$name] ?? null;
    if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_string($file['tmp_name'] ?? null) || !is_uploaded_file($file['tmp_name']))
        fail_response(400, 'Both fiscal credential files are required');
    $original = strtolower((string)($file['name'] ?? ''));
    if (substr($original, -strlen($extension)) !== $extension || (int)($file['size'] ?? 0) < 16 || (int)($file['size'] ?? 0) > $maxBytes)
        fail_response(400, 'Fiscal credential file format is invalid');
    $content = file_get_contents($file['tmp_name']);
    if (!is_string($content) || strlen($content) < 16 || strlen($content) > $maxBytes)
        fail_response(400, 'Fiscal credential file is invalid');
    return $content;
}
function tenant_fiscal_certificate_fingerprint(string $certificate): string {
    if (!function_exists('openssl_x509_read') || !function_exists('openssl_x509_fingerprint')) fail_response(503, 'Certificate verification is unavailable');
    $pem = str_contains($certificate, '-----BEGIN CERTIFICATE-----')
        ? $certificate
        : "-----BEGIN CERTIFICATE-----\n" . chunk_split(base64_encode($certificate), 64, "\n") . "-----END CERTIFICATE-----\n";
    $parsed = @openssl_x509_read($pem);
    if ($parsed === false) fail_response(400, 'The .cer file is not a valid certificate');
    $fingerprint = openssl_x509_fingerprint($parsed, 'sha256');
    if (is_resource($parsed) && function_exists('openssl_x509_free')) openssl_x509_free($parsed);
    if (!is_string($fingerprint) || !preg_match('/^[a-f0-9]{64}$/i', $fingerprint)) fail_response(400, 'The .cer certificate fingerprint is invalid');
    return strtolower($fingerprint);
}

function handle_onboarding(string $uri): void {
    $config = workspace_config(); $session = workspace_session(); $pdo = workspace_pdo($config); $key = workspace_key($config);
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    try {
        $isCredentialUpload = str_starts_with($uri, '/api/v1/onboarding/fiscal-credentials');
        if ($isCredentialUpload) {
            if ($method !== 'POST') fail_response(405, 'Method not allowed');
            tenant_fiscal_credential_require_write($session);
            $principal = tenant_onboarding_principal($pdo, $config, $session, $key);
            if (!tenant_principal_has_membership($pdo, $principal['id'])) fail_response(403, 'Complete workspace setup first');
            $context = tenant_context($pdo, $config, $session, $key);
            $companyId = strtolower((string)($_POST['companyId'] ?? ''));
            if (!tenant_is_uuid($companyId) || !hash_equals((string)$context['company']['id'], $companyId) || !tenant_can_manage_company($pdo, $context, $companyId))
                fail_response(403, 'Company administration permission is required');
            $company = $pdo->prepare('SELECT country_code FROM tenant_legal_entities WHERE id = ? AND tenant_id = ? AND status = "active" LIMIT 1');
            $company->execute([$companyId, $context['tenant']['id']]); $country = $company->fetch();
            if (!is_array($country) || (string)$country['country_code'] !== 'MX') fail_response(400, 'CSD credentials are available only for a Mexican fiscal profile');
            $profile = $pdo->prepare('SELECT id, issuance_mode, connector_key, status FROM tenant_fiscal_profiles WHERE tenant_id = ? AND legal_entity_id = ? LIMIT 1');
            $profile->execute([$context['tenant']['id'], $companyId]); $fiscalProfile = $profile->fetch();
            if (!is_array($fiscalProfile) || $fiscalProfile['issuance_mode'] !== 'buyniverse' || $fiscalProfile['connector_key'] !== 'odoo_fiax') fail_response(409, 'Buyniverse invoicing is not enabled for this company');
            $certificate = tenant_fiscal_uploaded_file('certificate', '.cer', 262144); $privateKey = tenant_fiscal_uploaded_file('privateKey', '.key', 262144);
            $password = (string)($_POST['privateKeyPassword'] ?? '');
            if (strlen($password) < 1 || strlen($password) > 512 || preg_match('/[\x00]/', $password)) fail_response(400, 'Private-key password is invalid');
            $certificateFingerprint = tenant_fiscal_certificate_fingerprint($certificate);
            $certificateSha = hash('sha256', $certificate); $privateKeySha = hash('sha256', $privateKey);
            $aadPrefix = 'buyniverse-fiscal-v1|' . $context['tenant']['id'] . '|' . $companyId . '|';
            $certificateBox = workspace_encrypt($certificate, $key, $aadPrefix . 'certificate'); $privateKeyBox = workspace_encrypt($privateKey, $key, $aadPrefix . 'private-key'); $passwordBox = workspace_encrypt($password, $key, $aadPrefix . 'private-key-password');
            $pdo->beginTransaction();
            try {
                $existing = $pdo->prepare('SELECT id FROM tenant_fiscal_credentials WHERE tenant_id = ? AND legal_entity_id = ? FOR UPDATE');
                $existing->execute([$context['tenant']['id'], $companyId]); $credentialId = $existing->fetchColumn();
                $rotated = (bool)$credentialId;
                if ($credentialId) {
                    $update = $pdo->prepare('UPDATE tenant_fiscal_credentials SET certificate_ciphertext = ?, certificate_iv = ?, certificate_tag = ?, private_key_ciphertext = ?, private_key_iv = ?, private_key_tag = ?, password_ciphertext = ?, password_iv = ?, password_tag = ?, certificate_sha256 = ?, private_key_sha256 = ?, certificate_fingerprint = ?, active = 1, created_by_principal_id = ?, rotated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?');
                    $update->execute([$certificateBox[0],$certificateBox[1],$certificateBox[2],$privateKeyBox[0],$privateKeyBox[1],$privateKeyBox[2],$passwordBox[0],$passwordBox[1],$passwordBox[2],$certificateSha,$privateKeySha,$certificateFingerprint,$principal['id'],$credentialId,$context['tenant']['id']]);
                } else {
                    $credentialId = tenant_uuid();
                    $insert = $pdo->prepare('INSERT INTO tenant_fiscal_credentials (id, tenant_id, legal_entity_id, certificate_ciphertext, certificate_iv, certificate_tag, private_key_ciphertext, private_key_iv, private_key_tag, password_ciphertext, password_iv, password_tag, certificate_sha256, private_key_sha256, certificate_fingerprint, created_by_principal_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                    $insert->execute([$credentialId,$context['tenant']['id'],$companyId,$certificateBox[0],$certificateBox[1],$certificateBox[2],$privateKeyBox[0],$privateKeyBox[1],$privateKeyBox[2],$passwordBox[0],$passwordBox[1],$passwordBox[2],$certificateSha,$privateKeySha,$certificateFingerprint,$principal['id']]);
                }
                $pdo->prepare('UPDATE tenant_fiscal_profiles SET status = "ready" WHERE id = ? AND tenant_id = ?')->execute([$fiscalProfile['id'], $context['tenant']['id']]);
                tenant_audit($pdo, $context, 'fiscal.csd_secured', 'tenant_fiscal_credentials', (string)$credentialId, ['companyId'=>$companyId,'certificateFingerprint'=>substr($certificateFingerprint,0,16),'rotated'=>$rotated], $key);
                $pdo->commit();
            } catch (Throwable $error) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $error; }
            workspace_json(['companyId'=>$companyId,'secured'=>true,'csrf'=>$session['csrf']]);
        }

        if (!in_array($method, ['GET','POST'], true)) fail_response(405, 'Method not allowed');
        $principal = tenant_onboarding_principal($pdo, $config, $session, $key);
        $hasMembership = tenant_principal_has_membership($pdo, $principal['id']);
        if ($method === 'GET') {
            if (!$hasMembership) workspace_json(['complete'=>false,'identity'=>['displayName'=>$principal['displayName'],'provider'=>$principal['provider']],'csrf'=>$session['csrf']]);
            $context = tenant_context($pdo, $config, $session, $key);
            $fiscal = $pdo->prepare('SELECT issuance_mode, connector_key, status FROM tenant_fiscal_profiles WHERE tenant_id = ? AND legal_entity_id = ? LIMIT 1');
            $fiscal->execute([$context['tenant']['id'], $context['company']['id']]); $profile = $fiscal->fetch();
            $needsFiscalCredentials = is_array($profile) && $profile['issuance_mode'] === 'buyniverse' && $profile['connector_key'] === 'odoo_fiax' && $profile['status'] === 'credentials_required' && ($context['company']['countryCode'] ?? '') === 'MX';
            workspace_json(['complete'=>true,'companyId'=>$context['company']['id'],'needsFiscalCredentials'=>$needsFiscalCredentials,'identity'=>['displayName'=>$principal['displayName'],'provider'=>$principal['provider']],'csrf'=>$session['csrf']]);
        }

        tenant_onboarding_require_write($session);
        if ($hasMembership) fail_response(409, 'This identity already has a workspace');
        $input = tenant_request_body();
        $accountKind = (string)($input['accountKind'] ?? '');
        $roles = tenant_marketplace_roles($input['marketplaceRoles'] ?? null);
        $workspaceName = tenant_text($input['workspaceName'] ?? '', 180);
        $countryCode = tenant_country_code($input['countryCode'] ?? '');
        $invoiceMode = (string)($input['invoiceMode'] ?? '');
        if (!in_array($accountKind, ['individual','business'], true) || !$roles || $workspaceName === '' || $countryCode === '' || !in_array($invoiceMode, ['external','buyniverse'], true))
            fail_response(400, 'A valid profile, workspace, country and invoicing choice are required');
        $legalName = $accountKind === 'business' ? tenant_text($input['legalName'] ?? '', 220) : $workspaceName;
        $taxIdentifier = ''; $taxRegime = ''; $billingEmail = ''; $address = ['street'=>'','city'=>'','region'=>'','postalCode'=>'']; $locations = [];
        if ($accountKind === 'business') {
            $taxIdentifier = tenant_tax_identifier($input['taxIdentifier'] ?? '', $countryCode);
            $taxRegime = tenant_text($input['taxRegime'] ?? '', 12);
            $billingEmail = strtolower(trim((string)($input['billingEmail'] ?? '')));
            $rawAddress = is_array($input['address'] ?? null) ? $input['address'] : [];
            $address = ['street'=>tenant_text($rawAddress['street'] ?? '',240),'city'=>tenant_text($rawAddress['city'] ?? '',120),'region'=>tenant_text($rawAddress['region'] ?? '',120),'postalCode'=>tenant_text($rawAddress['postalCode'] ?? '',24)];
            if ($legalName === '' || $taxIdentifier === '' || !filter_var($billingEmail, FILTER_VALIDATE_EMAIL) || in_array('', $address, true) || ($countryCode === 'MX' && $taxRegime === ''))
                fail_response(400, 'Complete the required legal and fiscal company fields');
            $rawLocations = $input['locations'] ?? [];
            if (!is_array($rawLocations) || count($rawLocations) > 50) fail_response(400, 'Company locations are invalid');
            $seenLocationCodes = [];
            foreach ($rawLocations as $rawLocation) {
                if (!is_array($rawLocation)) fail_response(400, 'Company location is invalid');
                $kind = (string)($rawLocation['kind'] ?? ''); $code = strtoupper(tenant_text($rawLocation['code'] ?? '',40)); $name = tenant_text($rawLocation['name'] ?? '',160);
                if (!in_array($kind, ['branch','warehouse'], true) || !preg_match('/^[A-Z0-9_-]{2,40}$/', $code) || $name === '' || isset($seenLocationCodes[$code])) fail_response(400, 'Each branch or warehouse needs a unique valid code and name');
                $seenLocationCodes[$code] = true; $locations[] = ['kind'=>$kind,'code'=>$code,'name'=>$name];
            }
        } elseif ($invoiceMode !== 'external') {
            fail_response(400, 'An individual account must use external invoicing');
        }
        $tenantId = tenant_uuid(); $companyId = tenant_uuid();
        $rfc = $countryCode === 'MX' && $accountKind === 'business' ? $taxIdentifier : null;
        $rfcHash = $rfc === null ? null : hash_hmac('sha256', $rfc, $key);
        $taxHash = $accountKind === 'business' ? hash_hmac('sha256', $taxIdentifier, $key) : null;
        $billingBox = $billingEmail !== '' ? workspace_encrypt($billingEmail, $key, 'buyniverse-fiscal-v1|' . $tenantId . '|' . $companyId . '|billing-email') : [null,null,null];
        $profileStatus = $invoiceMode === 'buyniverse' ? 'credentials_required' : 'external';
        $connectorKey = $invoiceMode === 'buyniverse' ? 'odoo_fiax' : 'external';
        $pdo->beginTransaction();
        try {
            $pdo->prepare('INSERT INTO tenant_accounts (id, display_name, account_kind) VALUES (?, ?, ?)')->execute([$tenantId, $workspaceName, $accountKind]);
            $entity = $pdo->prepare('INSERT INTO tenant_legal_entities (id, tenant_id, legal_name, rfc, rfc_hash, tax_identifier, tax_identifier_hash, tax_regime, country_code, fiscal_street, fiscal_city, fiscal_region, fiscal_postal_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $entity->execute([$companyId,$tenantId,$legalName,$rfc,$rfcHash,$taxIdentifier ?: null,$taxHash,$taxRegime ?: null,$countryCode,$address['street'] ?: null,$address['city'] ?: null,$address['region'] ?: null,$address['postalCode'] ?: null]);
            $pdo->prepare('INSERT INTO tenant_memberships (id, tenant_id, principal_id, role_key, scope_kind) VALUES (?, ?, ?, "owner", "tenant")')->execute([tenant_uuid(),$tenantId,$principal['id']]);
            $membership = $pdo->prepare('INSERT INTO tenant_memberships (id, tenant_id, principal_id, role_key, scope_kind, legal_entity_id) VALUES (?, ?, ?, ?, "legal_entity", ?)');
            foreach ($roles as $role) $membership->execute([tenant_uuid(),$tenantId,$principal['id'],$role,$companyId]);
            $locationInsert = $pdo->prepare('INSERT INTO tenant_locations (id, tenant_id, legal_entity_id, kind, code, name) VALUES (?, ?, ?, ?, ?, ?)');
            foreach ($locations as $location) $locationInsert->execute([tenant_uuid(),$tenantId,$companyId,$location['kind'],$location['code'],$location['name']]);
            $pdo->prepare('INSERT INTO tenant_onboarding_profiles (principal_id, account_kind, marketplace_roles) VALUES (?, ?, ?)')->execute([$principal['id'],$accountKind,json_encode($roles, JSON_UNESCAPED_SLASHES)]);
            $fiscal = $pdo->prepare('INSERT INTO tenant_fiscal_profiles (id, tenant_id, legal_entity_id, issuance_mode, connector_key, status, billing_email_ciphertext, billing_email_iv, billing_email_tag) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $fiscal->execute([tenant_uuid(),$tenantId,$companyId,$invoiceMode,$connectorKey,$profileStatus,$billingBox[0],$billingBox[1],$billingBox[2]]);
            $auditContext = ['principalId'=>$principal['id'],'tenant'=>['id'=>$tenantId],'company'=>['id'=>$companyId],'location'=>['id'=>null]];
            tenant_audit($pdo, $auditContext, 'tenant.social_onboarding_completed', 'tenant_account', $tenantId, ['accountKind'=>$accountKind,'roles'=>$roles,'country'=>$countryCode,'locations'=>count($locations),'invoicing'=>$invoiceMode], $key);
            $pdo->commit();
        } catch (PDOException $error) { if ($pdo->inTransaction()) $pdo->rollBack(); fail_response(409, 'This legal tax identifier is already registered in the workspace'); }
        catch (Throwable $error) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $error; }
        $_SESSION['tenant_context'] = ['companyId'=>$companyId,'locationId'=>null];
        $context = tenant_context($pdo, $config, $session, $key);
        $identity = $_SESSION['buyniverse_identity'] ?? null;
        // Welcome mail is best-effort and idempotent. A mail-provider outage
        // must never roll back the tenant boundary that was already committed.
        if (is_array($identity) && ($identity['emailVerified'] ?? false) === true && is_string($identity['email'] ?? null) && filter_var($identity['email'], FILTER_VALIDATE_EMAIL)) {
            try {
                $pdo->beginTransaction();
                $welcome = mail_enqueue($pdo, $config, $key, $context, 'auth.welcome', strtolower($identity['email']), [
                    'recipient_name'=>$principal['displayName'],
                    'workspace_name'=>$context['tenant']['name'],
                    'action_url'=>mail_public_url($config, '/#/dashboard'),
                ], 'auth-welcome:' . $principal['id'], null, 'es');
                tenant_audit($pdo, $context, 'email.queued', 'email_outbox', $welcome['id'], ['template'=>'auth.welcome','reused'=>!$welcome['queued']], $key);
                $pdo->commit();
            } catch (Throwable $error) { if ($pdo->inTransaction()) $pdo->rollBack(); }
        }
        $needsFiscalCredentials = $accountKind === 'business' && $invoiceMode === 'buyniverse' && $countryCode === 'MX';
        workspace_json(['companyId'=>$companyId,'context'=>$context,'needsFiscalCredentials'=>$needsFiscalCredentials,'csrf'=>$session['csrf']], 201);
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        fail_response(503, 'Secure onboarding is temporarily unavailable');
    }
}
