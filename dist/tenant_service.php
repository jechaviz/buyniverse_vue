<?php
declare(strict_types=1);

// SaaS tenant boundary
// ---------------------------------------------------------------------------
// Context is derived from the server session and memberships. Client-provided
// company, branch and warehouse ids are selectors only; they can never grant
// a permission by themselves.
function tenant_uuid(): string {
    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
    $hex = bin2hex($bytes);
    return substr($hex, 0, 8) . '-' . substr($hex, 8, 4) . '-' . substr($hex, 12, 4) . '-' . substr($hex, 16, 4) . '-' . substr($hex, 20);
}
function tenant_is_uuid($value): bool {
    return is_string($value) && preg_match('/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i', $value) === 1;
}
function tenant_text($value, int $limit): string {
    if (!is_string($value)) return '';
    $value = trim(preg_replace('/[\x00-\x1f\x7f]/u', '', $value) ?? '');
    return function_exists('mb_substr') ? mb_substr($value, 0, $limit, 'UTF-8') : substr($value, 0, $limit);
}
function tenant_rfc($value): string {
    $rfc = strtoupper(tenant_text($value, 13));
    return preg_match('/^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/u', $rfc) === 1 ? $rfc : '';
}
function tenant_country_code($value): string {
    $value = strtoupper(tenant_text($value, 8));
    return in_array($value, ['MX','US','CA','ES','OTHER'], true) ? ($value === 'OTHER' ? 'ZZ' : $value) : '';
}
function tenant_tax_identifier($value, string $countryCode): string {
    $value = strtoupper(tenant_text($value, 40));
    if ($countryCode === 'MX') return tenant_rfc($value);
    return preg_match('/^[A-Z0-9][A-Z0-9&._\/-]{2,39}$/', $value) === 1 ? $value : '';
}
function tenant_marketplace_roles($value): array {
    if (!is_array($value) || count($value) < 1 || count($value) > 2) return [];
    $roles = [];
    foreach ($value as $role) if (is_string($role) && in_array($role, ['buyer','supplier'], true)) $roles[$role] = true;
    return array_keys($roles);
}
function tenant_header_origin_is_safe(): bool {
    $origin = workspace_header('Origin');
    if ($origin === '') return true; // SameSite + CSRF protects older clients without Origin.
    $parts = parse_url($origin);
    $host = strtolower((string) ($parts['host'] ?? ''));
    $requestHost = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
    $requestHost = preg_replace('/:\d+$/', '', $requestHost) ?? '';
    $secure = (($_SERVER['HTTPS'] ?? '') === 'on') || strtolower(workspace_header('X-Forwarded-Proto')) === 'https';
    $scheme = strtolower((string) ($parts['scheme'] ?? ''));
    return $host !== '' && hash_equals($requestHost, $host) && ($secure ? $scheme === 'https' : in_array($scheme, ['http','https'], true));
}
function tenant_require_write(array $session): void {
    if (!tenant_header_origin_is_safe() || !hash_equals($session['csrf'], workspace_header('X-Buyniverse-CSRF')) || workspace_header('X-Buyniverse-Request') !== 'tenant-context-v1')
        fail_response(403, 'Request verification failed');
    $lastWrite = (float) ($_SESSION['tenant_last_write'] ?? 0);
    if (microtime(true) - $lastWrite < 0.35) fail_response(429, 'Please wait before saving again');
    $_SESSION['tenant_last_write'] = microtime(true);
}
function tenant_onboarding_require_write(array $session): void {
    if (!tenant_header_origin_is_safe() || !hash_equals($session['csrf'], workspace_header('X-Buyniverse-CSRF')) || workspace_header('X-Buyniverse-Request') !== 'onboarding-v1')
        fail_response(403, 'Request verification failed');
    $lastWrite = (float) ($_SESSION['tenant_onboarding_last_write'] ?? 0);
    if (microtime(true) - $lastWrite < 0.80) fail_response(429, 'Please wait before submitting again');
    $_SESSION['tenant_onboarding_last_write'] = microtime(true);
}
function tenant_fiscal_credential_require_write(array $session): void {
    if (!tenant_header_origin_is_safe() || !hash_equals($session['csrf'], workspace_header('X-Buyniverse-CSRF')) || workspace_header('X-Buyniverse-Request') !== 'fiscal-credential-v1')
        fail_response(403, 'Request verification failed');
    if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 786432) fail_response(413, 'Fiscal credential upload is too large');
    $lastWrite = (float) ($_SESSION['tenant_fiscal_credential_last_write'] ?? 0);
    if (microtime(true) - $lastWrite < 1.5) fail_response(429, 'Please wait before uploading again');
    $_SESSION['tenant_fiscal_credential_last_write'] = microtime(true);
}
function tenant_request_body(): array {
    if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 32768) fail_response(413, 'Request body too large');
    $body = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($body) || !workspace_safe_value($body)) fail_response(400, 'Invalid request payload');
    return $body;
}
function tenant_audit(PDO $pdo, array $context, string $action, string $resourceType, string $resourceId, array $payload, string $key): void {
    $payloadJson = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if (!is_string($payloadJson)) throw new RuntimeException('Unable to encode audit payload');
    // The tenant/id index and FOR UPDATE serialize concurrent events per tenant.
    $last = $pdo->prepare('SELECT chain_hash FROM tenant_audit_events WHERE tenant_id = ? ORDER BY id DESC LIMIT 1 FOR UPDATE');
    $last->execute([$context['tenant']['id']]);
    $previous = (string) (($last->fetch()['chain_hash'] ?? str_repeat('0', 64)));
    $digest = hash('sha256', $payloadJson);
    $chain = hash('sha256', implode('|', [$previous, $context['tenant']['id'], $context['company']['id'], $context['location']['id'] ?? '', $context['principalId'], $action, $resourceType, $resourceId, $digest]));
    $mac = hash_hmac('sha256', $chain, $key);
    $write = $pdo->prepare('INSERT INTO tenant_audit_events (tenant_id, legal_entity_id, location_id, actor_principal_id, action, resource_type, resource_id, payload_digest, previous_hash, chain_hash, event_mac) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $write->execute([$context['tenant']['id'], $context['company']['id'], $context['location']['id'] ?? null, $context['principalId'], $action, $resourceType, $resourceId, $digest, $previous, $chain, $mac]);
}
function tenant_seed_demo(PDO $pdo, array $principal, string $key): void {
    $membership = $pdo->prepare('SELECT id FROM tenant_memberships WHERE principal_id = ? AND status = "active" LIMIT 1');
    $membership->execute([$principal['id']]);
    if ($membership->fetch()) return;
    $tenantId = tenant_uuid(); $companyOne = tenant_uuid(); $companyTwo = tenant_uuid();
    $branch = tenant_uuid(); $warehouse = tenant_uuid(); $secondBranch = tenant_uuid();
    $pdo->beginTransaction();
    try {
        $pdo->prepare('INSERT INTO tenant_accounts (id, display_name) VALUES (?, ?)')->execute([$tenantId, 'Demo multi-company workspace']);
        $company = $pdo->prepare('INSERT INTO tenant_legal_entities (id, tenant_id, legal_name, rfc, rfc_hash, tax_regime) VALUES (?, ?, ?, ?, ?, ?)');
        $company->execute([$companyOne, $tenantId, 'Grupo Nébula Servicios, S.A. de C.V.', 'XAXX010101000', hash_hmac('sha256', 'XAXX010101000', $key), '601']);
        $company->execute([$companyTwo, $tenantId, 'Nébula Operaciones, S.A. de C.V.', 'XEXX010101000', hash_hmac('sha256', 'XEXX010101000', $key), '601']);
        $location = $pdo->prepare('INSERT INTO tenant_locations (id, tenant_id, legal_entity_id, kind, code, name) VALUES (?, ?, ?, ?, ?, ?)');
        $location->execute([$branch, $tenantId, $companyOne, 'branch', 'CDMX-MAT', 'Matriz CDMX']);
        $location->execute([$warehouse, $tenantId, $companyOne, 'warehouse', 'CDMX-CEDIS', 'CEDIS Ciudad de México']);
        $location->execute([$secondBranch, $tenantId, $companyTwo, 'branch', 'MTY-OP', 'Operaciones Monterrey']);
        $pdo->prepare('INSERT INTO tenant_memberships (id, tenant_id, principal_id, role_key, scope_kind) VALUES (?, ?, ?, "owner", "tenant")')->execute([tenant_uuid(), $tenantId, $principal['id']]);
        $context = ['principalId'=>$principal['id'], 'tenant'=>['id'=>$tenantId], 'company'=>['id'=>$companyOne], 'location'=>['id'=>null]];
        tenant_audit($pdo, $context, 'tenant.demo_seeded', 'tenant_account', $tenantId, ['companies'=>2,'locations'=>3], $key);
        $pdo->commit();
    } catch (Throwable $error) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $error; }
}
function tenant_seed_personal_workspace(PDO $pdo, array $principal, string $key): void {
    $membership = $pdo->prepare('SELECT id FROM tenant_memberships WHERE principal_id = ? AND status = "active" LIMIT 1');
    $membership->execute([$principal['id']]);
    if ($membership->fetch()) return;
    $tenantId = tenant_uuid(); $workspaceId = tenant_uuid();
    $displayName = tenant_text($principal['display_name'] ?? 'Personal', 160) ?: 'Personal';
    $pdo->beginTransaction();
    try {
        // A personal workspace is a tenant boundary, not an RFC-bearing fiscal
        // entity. The row keeps the existing authorization model uniform while
        // fiscal modules can require a verified business entity before issuing.
        $pdo->prepare('INSERT INTO tenant_accounts (id, display_name, account_kind) VALUES (?, ?, "individual")')->execute([$tenantId, $displayName . ' · Personal']);
        $pdo->prepare('INSERT INTO tenant_legal_entities (id, tenant_id, legal_name, rfc, rfc_hash, tax_regime) VALUES (?, ?, ?, NULL, NULL, NULL)')->execute([$workspaceId, $tenantId, $displayName . ' · Personal workspace']);
        $pdo->prepare('INSERT INTO tenant_memberships (id, tenant_id, principal_id, role_key, scope_kind) VALUES (?, ?, ?, "owner", "tenant")')->execute([tenant_uuid(), $tenantId, $principal['id']]);
        $context = ['principalId'=>$principal['id'], 'tenant'=>['id'=>$tenantId], 'company'=>['id'=>$workspaceId], 'location'=>['id'=>null]];
        tenant_audit($pdo, $context, 'tenant.personal_workspace_created', 'tenant_account', $tenantId, ['identityProvider'=>$principal['provider']], $key);
        $pdo->commit();
    } catch (Throwable $error) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $error; }
}
function tenant_principal_has_membership(PDO $pdo, string $principalId): bool {
    $membership = $pdo->prepare('SELECT 1 FROM tenant_memberships WHERE principal_id = ? AND status = "active" LIMIT 1');
    $membership->execute([$principalId]);
    return (bool) $membership->fetchColumn();
}
function tenant_principal(PDO $pdo, array $config, array $session, string $key): array {
    $identity = $_SESSION['buyniverse_identity'] ?? null;
    if (is_array($identity) && in_array($identity['provider'] ?? '', ['entra_oidc','aws_ldaps','google_oidc','facebook_oauth'], true) && is_string($identity['subject'] ?? null) && strlen($identity['subject']) >= 6) {
        $provider = (string) $identity['provider'];
        $subject = (string) $identity['subject'];
        $displayName = tenant_text($identity['displayName'] ?? 'Enterprise user', 180) ?: 'Enterprise user';
        $emailHash = isset($identity['email']) && is_string($identity['email']) ? hash_hmac('sha256', strtolower(trim($identity['email'])), $key) : null;
    } elseif (workspace_mode($config) === 'demo' && ($config['allow_demo_workspace_state'] ?? false) === true) {
        if (empty($_SESSION['tenant_demo_subject'])) $_SESSION['tenant_demo_subject'] = bin2hex(random_bytes(32));
        $provider = 'demo'; $subject = (string) $_SESSION['tenant_demo_subject']; $displayName = 'Demo workspace owner'; $emailHash = null;
    } else {
        fail_response(401, 'Enterprise identity is required');
    }
    $subjectHash = hash_hmac('sha256', $subject, $key);
    $find = $pdo->prepare('SELECT id, provider, display_name, status FROM tenant_principals WHERE provider = ? AND subject_hash = ? LIMIT 1');
    $find->execute([$provider, $subjectHash]); $principal = $find->fetch();
    if (!$principal) {
        $id = tenant_uuid();
        $pdo->prepare('INSERT INTO tenant_principals (id, provider, subject_hash, display_name, email_hash) VALUES (?, ?, ?, ?, ?)')->execute([$id, $provider, $subjectHash, $displayName, $emailHash]);
        $principal = ['id'=>$id, 'provider'=>$provider, 'display_name'=>$displayName, 'status'=>'active'];
    }
    if (($principal['status'] ?? '') !== 'active') fail_response(403, 'Identity is disabled');
    if ($provider === 'demo') tenant_seed_demo($pdo, $principal, $key);
    return ['id'=>(string) $principal['id'], 'provider'=>(string) $principal['provider'], 'displayName'=>(string) $principal['display_name']];
}
function tenant_context(PDO $pdo, array $config, array $session, string $key, ?array $requested = null): array {
    $principal = tenant_principal($pdo, $config, $session, $key);
    $rows = $pdo->prepare('SELECT id, tenant_id, role_key, scope_kind, legal_entity_id, location_id FROM tenant_memberships WHERE principal_id = ? AND status = "active" ORDER BY created_at ASC');
    $rows->execute([$principal['id']]); $memberships = $rows->fetchAll();
    if (!$memberships) fail_response(403, 'No active company membership');
    $tenantIds = array_values(array_unique(array_map(static fn($row) => (string) $row['tenant_id'], $memberships)));
    $tenantQuery = $pdo->prepare('SELECT id, display_name, account_kind FROM tenant_accounts WHERE id IN (' . implode(',', array_fill(0, count($tenantIds), '?')) . ') AND status = "active"');
    $tenantQuery->execute($tenantIds); $tenants = [];
    foreach ($tenantQuery->fetchAll() as $tenant) $tenants[(string) $tenant['id']] = $tenant;
    if (!$tenants) fail_response(403, 'No active tenant');
    $entityQuery = $pdo->prepare('SELECT id, tenant_id, legal_name, rfc, tax_identifier, tax_regime, country_code FROM tenant_legal_entities WHERE tenant_id IN (' . implode(',', array_fill(0, count($tenantIds), '?')) . ') AND status = "active" ORDER BY legal_name ASC');
    $entityQuery->execute($tenantIds); $entities = [];
    foreach ($entityQuery->fetchAll() as $entity) $entities[(string) $entity['id']] = $entity;
    $locationQuery = $pdo->prepare('SELECT id, tenant_id, legal_entity_id, kind, code, name FROM tenant_locations WHERE tenant_id IN (' . implode(',', array_fill(0, count($tenantIds), '?')) . ') AND status = "active" ORDER BY name ASC');
    $locationQuery->execute($tenantIds); $locations = [];
    foreach ($locationQuery->fetchAll() as $location) $locations[(string) $location['id']] = $location;
    $access = []; $roles = []; $locationAccess = [];
    foreach ($memberships as $membership) {
        $tenantId = (string) $membership['tenant_id']; if (!isset($tenants[$tenantId])) continue;
        $roles[$tenantId][] = ['role'=>(string)$membership['role_key'], 'scope'=>(string)$membership['scope_kind'], 'entity'=>(string)($membership['legal_entity_id'] ?? ''), 'location'=>(string)($membership['location_id'] ?? '')];
        if ($membership['scope_kind'] === 'tenant') {
            foreach ($entities as $entityId => $entity) if ($entity['tenant_id'] === $tenantId) { $access[$entityId] = true; $locationAccess[$entityId] = '*'; }
        } elseif ($membership['scope_kind'] === 'legal_entity' && isset($entities[$membership['legal_entity_id']])) {
            $access[(string)$membership['legal_entity_id']] = true; $locationAccess[(string)$membership['legal_entity_id']] = '*';
        } elseif ($membership['scope_kind'] === 'location' && isset($locations[$membership['location_id']])) {
            $entityId = (string)$membership['legal_entity_id']; $access[$entityId] = true;
            if (($locationAccess[$entityId] ?? null) !== '*') $locationAccess[$entityId][(string)$membership['location_id']] = true;
        }
    }
    if (!$access) fail_response(403, 'No accessible legal entity');
    $saved = is_array($_SESSION['tenant_context'] ?? null) ? $_SESSION['tenant_context'] : [];
    $requestedCompany = $requested['companyId'] ?? $saved['companyId'] ?? null;
    $companyId = tenant_is_uuid($requestedCompany) && isset($access[$requestedCompany]) ? $requestedCompany : array_key_first($access);
    $company = $entities[$companyId]; $tenantId = (string)$company['tenant_id'];
    $requestedLocation = $requested['locationId'] ?? $saved['locationId'] ?? null;
    $locationId = tenant_is_uuid($requestedLocation) ? $requestedLocation : null;
    if ($locationId && (!isset($locations[$locationId]) || $locations[$locationId]['legal_entity_id'] !== $companyId || (($locationAccess[$companyId] ?? null) !== '*' && !isset($locationAccess[$companyId][$locationId])))) $locationId = null;
    $companyLocations = [];
    foreach ($locations as $location) {
        $entityId = (string)$location['legal_entity_id'];
        if (!isset($access[$entityId])) continue;
        if (($locationAccess[$entityId] ?? null) !== '*' && !isset($locationAccess[$entityId][$location['id']])) continue;
        $companyLocations[$entityId][] = ['id'=>(string)$location['id'], 'kind'=>(string)$location['kind'], 'code'=>(string)$location['code'], 'name'=>(string)$location['name']];
    }
    $companies = [];
    foreach ($entities as $entityId => $entity) if (isset($access[$entityId])) $companies[] = ['id'=>$entityId, 'legalName'=>(string)$entity['legal_name'], 'rfc'=>(string)($entity['rfc'] ?? ''), 'taxIdentifier'=>(string)($entity['tax_identifier'] ?? $entity['rfc'] ?? ''), 'taxRegime'=>(string)($entity['tax_regime'] ?? ''), 'countryCode'=>(string)($entity['country_code'] ?? 'MX'), 'kind'=>(string)($tenants[(string)$entity['tenant_id']]['account_kind'] ?? 'business'), 'locations'=>$companyLocations[$entityId] ?? []];
    $roleSet = $roles[$tenantId] ?? [];
    $manageTenant = false; $manageCompany = false;
    foreach ($roleSet as $role) {
        $privileged = in_array($role['role'], ['owner','admin'], true);
        if ($privileged && $role['scope'] === 'tenant') $manageTenant = true;
        if ($privileged && ($role['scope'] === 'tenant' || ($role['scope'] === 'legal_entity' && $role['entity'] === $companyId) || ($role['scope'] === 'location' && $role['entity'] === $companyId))) $manageCompany = true;
    }
    $marketplaceModes = [];
    foreach ($roleSet as $role) {
        $appliesToCompany = $role['scope'] === 'tenant' || $role['entity'] === $companyId;
        if ($appliesToCompany && in_array($role['role'], ['buyer','supplier'], true)) $marketplaceModes[$role['role']] = true;
    }
    // Pre-onboarding workspaces only had owner/admin memberships. Keep their
    // established access functional while all new social accounts explicitly
    // choose buyer and/or supplier during enrolment.
    if (!$marketplaceModes && ($manageTenant || $manageCompany)) { $marketplaceModes['buyer'] = true; $marketplaceModes['supplier'] = true; }
    if ($manageTenant || $manageCompany) $marketplaceModes['admin'] = true;
    $context = [
        'principalId'=>$principal['id'], 'principal'=>['provider'=>$principal['provider'],'displayName'=>$principal['displayName']],
        'tenant'=>['id'=>$tenantId,'name'=>(string)$tenants[$tenantId]['display_name'],'kind'=>(string)($tenants[$tenantId]['account_kind'] ?? 'business')],
        'company'=>['id'=>$companyId,'legalName'=>(string)$company['legal_name'],'rfc'=>(string)($company['rfc'] ?? ''),'taxIdentifier'=>(string)($company['tax_identifier'] ?? $company['rfc'] ?? ''),'taxRegime'=>(string)($company['tax_regime'] ?? ''),'countryCode'=>(string)($company['country_code'] ?? 'MX'),'kind'=>(string)($tenants[$tenantId]['account_kind'] ?? 'business')],
        'location'=>$locationId ? ['id'=>$locationId,'kind'=>(string)$locations[$locationId]['kind'],'code'=>(string)$locations[$locationId]['code'],'name'=>(string)$locations[$locationId]['name']] : null,
        'companies'=>$companies, 'permissions'=>['manageTenant'=>$manageTenant,'manageCompany'=>$manageCompany], 'marketplaceModes'=>array_keys($marketplaceModes),
    ];
    $context['contextHash'] = hash_hmac('sha256', implode('|', [$principal['id'], $tenantId, $companyId, $locationId ?? 'all']), $key);
    $_SESSION['tenant_context'] = ['companyId'=>$companyId,'locationId'=>$locationId];
    return $context;
}
function tenant_company_is_accessible(PDO $pdo, array $context, string $companyId): bool {
    foreach ($context['companies'] as $company) if (hash_equals((string)$company['id'], $companyId)) return true;
    return false;
}
function tenant_require_permission(array $context, string $permission): void {
    if (empty($context['permissions'][$permission])) fail_response(403, 'Insufficient company permission');
}
function tenant_can_manage_company(PDO $pdo, array $context, string $companyId): bool {
    $statement = $pdo->prepare('SELECT 1 FROM tenant_memberships WHERE tenant_id = ? AND principal_id = ? AND status = "active" AND role_key IN ("owner", "admin") AND (scope_kind = "tenant" OR (scope_kind = "legal_entity" AND legal_entity_id = ?)) LIMIT 1');
    $statement->execute([$context['tenant']['id'], $context['principalId'], $companyId]);
    return (bool) $statement->fetchColumn();
}
function tenant_onboarding_principal(PDO $pdo, array $config, array $session, string $key): array {
    $principal = tenant_principal($pdo, $config, $session, $key);
    if (!in_array($principal['provider'], ['google_oidc','facebook_oauth'], true)) fail_response(403, 'A configured social identity is required');
    return $principal;
}
function tenant_operational_scope_is_valid($scope, array $context): bool {
    if (!is_array($scope)) return false;
    $tenantId = $scope['tenantId'] ?? null;
    $companyId = $scope['companyId'] ?? null;
    $locationId = $scope['locationId'] ?? null;
    if (!tenant_is_uuid($tenantId) || !tenant_is_uuid($companyId)) return false;
    if (!hash_equals((string)$context['tenant']['id'], $tenantId) || !hash_equals((string)$context['company']['id'], $companyId)) return false;
    if ($locationId !== null && !tenant_is_uuid($locationId)) return false;
    $expectedLocation = $context['location']['id'] ?? null;
    if ($expectedLocation === null) return $locationId === null;
    return is_string($locationId) && hash_equals((string)$expectedLocation, $locationId);
}
function tenant_workspace_scopes_are_valid(array $state, array $context): bool {
    $collections = ['jobs','contracts','invoices','paymentReceipts','expenses','estimates','purchaseRequests','sourcingEvents','auctions','purchaseOrders','serviceRequests','talentEngagements'];
    foreach ($collections as $collection) {
        if (!array_key_exists($collection, $state)) continue;
        if (!is_array($state[$collection])) return false;
        foreach ($state[$collection] as $record) {
            if (!is_array($record) || !tenant_operational_scope_is_valid($record['operationalScope'] ?? null, $context)) return false;
        }
    }
    return true;
}

// ---------------------------------------------------------------------------

function handle_tenant_admin(string $uri, array $config, array $session, PDO $pdo, string $key): void {
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if (!in_array($method, ['GET','PUT','POST'], true)) fail_response(405, 'Method not allowed');
    try {
        if ($uri === '/api/v1/tenant-context' || $uri === '/api/v1/tenant-context/') {
            if ($method === 'GET') { $context = tenant_context($pdo, $config, $session, $key); workspace_json(['context'=>$context, 'csrf'=>$session['csrf'], 'mode'=>workspace_mode($config)]); }
            if ($method !== 'PUT') fail_response(405, 'Method not allowed');
            tenant_require_write($session); $input = tenant_request_body();
            $current = tenant_context($pdo, $config, $session, $key);
            $target = ['companyId'=>$input['companyId'] ?? null, 'locationId'=>$input['locationId'] ?? null];
            $next = tenant_context($pdo, $config, $session, $key, $target);
            if ($next['company']['id'] !== $target['companyId'] || (($target['locationId'] ?? null) !== null && ($next['location']['id'] ?? null) !== $target['locationId'])) fail_response(403, 'Company context is not permitted');
            $pdo->beginTransaction(); tenant_audit($pdo, $next, 'tenant.context_switched', 'tenant_context', $next['company']['id'], ['from'=>$current['company']['id'],'to'=>$next['company']['id'],'location'=>$next['location']['id'] ?? null], $key); $pdo->commit();
            workspace_json(['context'=>$next, 'csrf'=>$session['csrf'], 'mode'=>workspace_mode($config)]);
        }
        if ($method !== 'POST') fail_response(405, 'Method not allowed');
        tenant_require_write($session); $context = tenant_context($pdo, $config, $session, $key); $input = tenant_request_body();
        if ($uri === '/api/v1/tenant-companies' || $uri === '/api/v1/tenant-companies/') {
            tenant_require_permission($context, 'manageTenant');
            $name = tenant_text($input['legalName'] ?? '', 220); $rfc = tenant_rfc($input['rfc'] ?? ''); $regime = tenant_text($input['taxRegime'] ?? '', 12);
            if ($name === '' || $rfc === '') fail_response(400, 'Legal name and RFC are required');
            $id = tenant_uuid(); $pdo->beginTransaction();
            try {
                $pdo->prepare('INSERT INTO tenant_legal_entities (id, tenant_id, legal_name, rfc, rfc_hash, tax_regime) VALUES (?, ?, ?, ?, ?, ?)')->execute([$id, $context['tenant']['id'], $name, $rfc, hash_hmac('sha256', $rfc, $key), $regime ?: null]);
                tenant_audit($pdo, $context, 'tenant.company_created', 'legal_entity', $id, ['rfc'=>substr($rfc,0,4) . '***','nameDigest'=>hash('sha256',$name)], $key); $pdo->commit();
            } catch (PDOException $error) { if ($pdo->inTransaction()) $pdo->rollBack(); fail_response(409, 'This RFC already exists in the tenant'); }
            // Creating a company must not silently switch the session context:
            // that could direct an in-flight workspace save into the new entity.
            $next = tenant_context($pdo, $config, $session, $key); workspace_json(['companyId'=>$id,'context'=>$next,'csrf'=>$session['csrf']]);
        }
        if (!preg_match('#^/api/v1/tenant-companies/([a-f0-9-]{36})/(locations|invitations)/?$#i', $uri, $match)) fail_response(404, 'Not found');
        $companyId = strtolower($match[1]); $resource = strtolower($match[2]);
        if (!tenant_company_is_accessible($pdo, $context, $companyId)) fail_response(404, 'Company not found');
        if (!tenant_can_manage_company($pdo, $context, $companyId)) fail_response(403, 'Insufficient company permission');
        if ($resource === 'locations') {
            $kind = $input['kind'] ?? ''; $code = strtoupper(tenant_text($input['code'] ?? '', 40)); $name = tenant_text($input['name'] ?? '', 160);
            if (!in_array($kind, ['branch','warehouse'], true) || !preg_match('/^[A-Z0-9_-]{2,40}$/', $code) || $name === '') fail_response(400, 'Valid location type, code and name are required');
            $id = tenant_uuid(); $pdo->beginTransaction();
            try {
                $pdo->prepare('INSERT INTO tenant_locations (id, tenant_id, legal_entity_id, kind, code, name) VALUES (?, ?, ?, ?, ?, ?)')->execute([$id, $context['tenant']['id'], $companyId, $kind, $code, $name]);
                tenant_audit($pdo, $context, 'tenant.location_created', 'location', $id, ['companyId'=>$companyId,'kind'=>$kind,'code'=>$code], $key); $pdo->commit();
            } catch (PDOException $error) { if ($pdo->inTransaction()) $pdo->rollBack(); fail_response(409, 'This location code already exists'); }
            workspace_json(['locationId'=>$id,'context'=>tenant_context($pdo, $config, $session, $key),'csrf'=>$session['csrf']]);
        }
        $email = strtolower(trim((string)($input['email'] ?? ''))); $role = (string)($input['role'] ?? 'viewer'); $scope = (string)($input['scope'] ?? 'legal_entity'); $locationId = $input['locationId'] ?? null;
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !in_array($role, ['admin','buyer','approver','warehouse','auditor','viewer','supplier'], true) || !in_array($scope, ['tenant','legal_entity','location'], true)) fail_response(400, 'Valid invitation details are required');
        if ($scope === 'tenant') tenant_require_permission($context, 'manageTenant');
        $allowedLocation = null;
        foreach ($context['companies'] as $company) if ($company['id'] === $companyId) foreach ($company['locations'] as $location) if (($location['id'] ?? '') === $locationId) $allowedLocation = $locationId;
        if ($scope === 'location' && !$allowedLocation) fail_response(400, 'Location is not accessible');
        $id = tenant_uuid(); $emailCipher = workspace_encrypt($email, $key, 'buyniverse-tenant-invite|' . $id);
        $pdo->beginTransaction();
        try {
            tenant_audit($pdo, $context, 'tenant.invitation_created', 'invitation', $id, ['companyId'=>$companyId,'role'=>$role,'scope'=>$scope,'emailHash'=>hash_hmac('sha256',$email,$key)], $key);
            $pdo->prepare('INSERT INTO tenant_invitations (id, tenant_id, legal_entity_id, location_id, email_hash, email_ciphertext, email_iv, email_tag, role_key, scope_kind, expires_at, created_by_principal_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 DAY), ?)')->execute([$id, $context['tenant']['id'], $scope === 'tenant' ? null : $companyId, $scope === 'location' ? $allowedLocation : null, hash_hmac('sha256',$email,$key), $emailCipher[0], $emailCipher[1], $emailCipher[2], $role, $scope, $context['principalId']]);
            $roleNames = ['admin'=>'administrador','buyer'=>'comprador','approver'=>'aprobador','warehouse'=>'almacén','auditor'=>'auditor','viewer'=>'consulta','supplier'=>'proveedor'];
            $scopeNames = ['tenant'=>'todas las empresas','legal_entity'=>'la empresa seleccionada','location'=>'la sucursal o bodega seleccionada'];
            $queued = mail_enqueue($pdo, $config, $key, $context, 'tenant.invitation', $email, [
                'recipient_name'=>'there',
                'inviter_name'=>$context['principal']['displayName'] ?? 'Workspace owner',
                'company_name'=>$context['company']['legalName'] ?? 'Buyniverse',
                'role_name'=>$roleNames[$role] ?? $role,
                'scope_name'=>$scopeNames[$scope] ?? $scope,
                'expires_at'=>gmdate('c', time() + 7 * 86400),
                'action_url'=>mail_public_url($config, '/#/dashboard'),
            ], 'tenant-invitation:' . $id, gmdate('Y-m-d H:i:s', time() + 7 * 86400), 'es');
            tenant_audit($pdo, $context, 'email.queued', 'email_outbox', $queued['id'], ['template'=>'tenant.invitation','reused'=>!$queued['queued']], $key);
            $pdo->commit(); workspace_json(['invitationId'=>$id,'delivery'=>'queued','csrf'=>$session['csrf']]);
        } catch (Throwable $error) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $error; }
    } catch (Throwable $error) { if ($pdo->inTransaction()) $pdo->rollBack(); fail_response(503, 'Tenant service is unavailable'); }
}
