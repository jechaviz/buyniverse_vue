<?php
declare(strict_types=1);

// Platform administration (the SaaS owner's panel), loaded by index.php.
// Who may use it is decided here, on the server, from platform_operators; the
// browser only shows what the server returns. Every action checks the operator,
// the request origin and the CSRF token, and leaves a record: company-scoped
// changes in tenant_audit_events (hash chained), platform decisions in
// platform_audit_events (append-only). Secrets never leave the server: emails
// of demo requests are shown masked, codes only once, at approval.

function platform_is_operator(PDO $pdo, string $principalId): bool {
    $row = $pdo->prepare('SELECT 1 FROM platform_operators WHERE principal_id = ? AND revoked_at IS NULL LIMIT 1');
    $row->execute([$principalId]);
    return $row->fetchColumn() !== false;
}
function platform_require_write(array $session): void {
    if (!tenant_header_origin_is_safe() || !hash_equals($session['csrf'], workspace_header('X-Buyniverse-CSRF')) || workspace_header('X-Buyniverse-Request') !== 'platform-v1')
        fail_response(403, 'Request verification failed');
    $last = (float) ($_SESSION['platform_last_write'] ?? 0);
    if (microtime(true) - $last < 0.4) fail_response(429, 'Please wait before saving again');
    $_SESSION['platform_last_write'] = microtime(true);
}
function platform_record(PDO $pdo, string $principalId, string $action, string $subject, array $payload): void {
    $digest = hash('sha256', (string) json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
    $pdo->prepare('INSERT INTO platform_audit_events (principal_id, action, subject, payload_digest) VALUES (?, ?, ?, ?)')->execute([$principalId, $action, mb_substr($subject, 0, 120), $digest]);
}

/** Every company with its workspace, fiscal state, stamp balance and team size. No secrets. */
function platform_companies(PDO $pdo): array {
    $rows = $pdo->query('SELECT e.id, e.tenant_id, e.legal_name, e.rfc, e.country_code, e.status, t.display_name AS workspace, t.account_kind,
            p.issuance_mode, p.status AS profile_status, p.stamps_balance, p.certificate_valid_to,
            (SELECT COUNT(*) FROM tenant_memberships m WHERE m.tenant_id = e.tenant_id AND m.status = "active" AND (m.scope_kind = "tenant" OR m.legal_entity_id = e.id)) AS members,
            (SELECT COUNT(*) FROM tenant_invitations i WHERE i.tenant_id = e.tenant_id AND i.status = "pending" AND i.expires_at > UTC_TIMESTAMP() AND (i.legal_entity_id = e.id OR i.legal_entity_id IS NULL)) AS pending_invitations
        FROM tenant_legal_entities e INNER JOIN tenant_accounts t ON t.id = e.tenant_id LEFT JOIN tenant_fiscal_profiles p ON p.legal_entity_id = e.id
        ORDER BY e.created_at DESC LIMIT 200')->fetchAll();
    return array_map(static fn($r) => [
        'id' => (string) $r['id'], 'workspace' => (string) $r['workspace'], 'accountKind' => (string) $r['account_kind'], 'legalName' => (string) $r['legal_name'],
        'rfc' => (string) ($r['rfc'] ?? ''), 'country' => (string) $r['country_code'], 'status' => (string) $r['status'],
        'issuance' => (string) ($r['issuance_mode'] ?? 'external'), 'profileStatus' => (string) ($r['profile_status'] ?? 'external'),
        'stampsBalance' => (int) ($r['stamps_balance'] ?? 0), 'certificateValidTo' => $r['certificate_valid_to'] ? (string) $r['certificate_valid_to'] : null,
        'members' => (int) $r['members'], 'pendingInvitations' => (int) $r['pending_invitations'],
    ], $rows);
}

/** Demo requests, masked: enough to decide, never the full address. */
function platform_demo_requests(PDO $pdo, string $key): array {
    $rows = $pdo->query('SELECT id, name, company, note, status, created_at, email_ciphertext, email_iv, email_tag FROM demo_access_requests ORDER BY created_at DESC LIMIT 100')->fetchAll();
    return array_map(static function ($r) use ($key) {
        $plain = openssl_decrypt((string) $r['email_ciphertext'], 'aes-256-gcm', $key, OPENSSL_RAW_DATA, (string) $r['email_iv'], (string) $r['email_tag'], 'buyniverse-demo-request|' . $r['id']);
        return ['id' => (string) $r['id'], 'name' => (string) $r['name'], 'company' => (string) ($r['company'] ?? ''), 'note' => (string) ($r['note'] ?? ''),
            'status' => (string) $r['status'], 'createdAt' => (string) $r['created_at'], 'email' => setup_mask_email(is_string($plain) ? $plain : '')];
    }, $rows);
}
function platform_demo_codes(PDO $pdo): array {
    return array_map(static fn($c) => [
        'id' => (string) $c['id'], 'label' => (string) $c['label'], 'expiresAt' => (string) $c['expires_at'], 'useCount' => (int) $c['use_count'], 'lastUsedAt' => $c['last_used_at'] ? (string) $c['last_used_at'] : null,
        'state' => $c['revoked_at'] ? 'revoked' : (strtotime((string) $c['expires_at'] . ' UTC') < time() ? 'expired' : 'active'),
    ], $pdo->query('SELECT id, label, expires_at, revoked_at, use_count, last_used_at FROM demo_access_codes ORDER BY created_at DESC LIMIT 100')->fetchAll());
}
function platform_audit(PDO $pdo): array {
    $company = array_map(static fn($r) => ['at' => (string) $r['created_at'], 'action' => (string) $r['action'], 'resource' => (string) $r['resource_type'], 'workspace' => (string) ($r['workspace'] ?? '')],
        $pdo->query('SELECT a.created_at, a.action, a.resource_type, t.display_name AS workspace FROM tenant_audit_events a LEFT JOIN tenant_accounts t ON t.id = a.tenant_id ORDER BY a.id DESC LIMIT 150')->fetchAll());
    $platform = array_map(static fn($r) => ['at' => (string) $r['created_at'], 'action' => (string) $r['action'], 'subject' => (string) $r['subject']],
        $pdo->query('SELECT created_at, action, subject FROM platform_audit_events ORDER BY id DESC LIMIT 100')->fetchAll());
    return ['company' => $company, 'platform' => $platform];
}

function handle_platform(string $uri): void {
    $config = workspace_config(); $session = workspace_session();
    $route = rtrim(substr($uri, strlen('/api/v1/platform')), '/');
    if (!tenant_has_authenticated_principal($config)) {
        if ($route === '/me') workspace_json(['operator' => false, 'csrf' => $session['csrf']]);
        fail_response(401, 'Sign in to continue');
    }
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if (!in_array($method, ['GET', 'POST'], true)) fail_response(405, 'Method not allowed');
    if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 16384) fail_response(413, 'Request body too large');
    $pdo = workspace_pdo($config); $key = workspace_key($config);
    try {
        $principal = tenant_principal($pdo, $config, $session, $key);
        $operator = platform_is_operator($pdo, $principal['id']);
        if ($route === '/me') workspace_json(['operator' => $operator, 'name' => $principal['displayName'], 'csrf' => $session['csrf']]);
        if (!$operator) fail_response(403, 'Platform operators only');

        if ($route === '/overview' && $method === 'GET') {
            workspace_json(['companies' => platform_companies($pdo), 'demoRequests' => platform_demo_requests($pdo, $key), 'demoCodes' => platform_demo_codes($pdo),
                'audit' => platform_audit($pdo), 'csrf' => $session['csrf']]);
        }
        if ($method !== 'POST') fail_response(405, 'Method not allowed');
        platform_require_write($session);
        $input = tenant_request_body();

        if ($route === '/stamps') {
            $entity = strtolower((string) ($input['companyId'] ?? ''));
            $delta = filter_var($input['delta'] ?? null, FILTER_VALIDATE_INT);
            $note = tenant_text($input['note'] ?? '', 200);
            if (!tenant_is_uuid($entity) || $delta === false || $delta === 0 || abs((int) $delta) > 1000000) fail_response(400, 'Invalid stamp change');
            if ($note === '') fail_response(400, 'A note explaining the change is required');
            $pdo->beginTransaction();
            $lock = $pdo->prepare('SELECT tenant_id, stamps_balance FROM tenant_fiscal_profiles WHERE legal_entity_id = ? FOR UPDATE');
            $lock->execute([$entity]); $profile = $lock->fetch();
            if (!is_array($profile)) { $pdo->rollBack(); fail_response(409, 'This company has no fiscal profile yet'); }
            $after = (int) $profile['stamps_balance'] + (int) $delta;
            if ($after < 0) { $pdo->rollBack(); fail_response(409, 'The balance cannot go below zero'); }
            $pdo->prepare('UPDATE tenant_fiscal_profiles SET stamps_balance = ? WHERE legal_entity_id = ?')->execute([$after, $entity]);
            $pdo->prepare('INSERT INTO cfdi_stamp_ledger (tenant_id, legal_entity_id, delta, balance_after, reason, created_by_principal_id) VALUES (?, ?, ?, ?, ?, ?)')
                ->execute([$profile['tenant_id'], $entity, (int) $delta, $after, 'platform_adjustment', $principal['id']]);
            tenant_audit($pdo, ['principalId' => $principal['id'], 'tenant' => ['id' => $profile['tenant_id']], 'company' => ['id' => $entity], 'location' => ['id' => null]],
                'platform.stamps_adjusted', 'legal_entity', $entity, ['delta' => (int) $delta, 'balanceAfter' => $after, 'note' => $note], $key);
            $pdo->commit();
            workspace_json(['balance' => $after, 'csrf' => $session['csrf']]);
        }

        if (preg_match('#^/demo-requests/([0-9a-f-]{36})$#', $route, $m) === 1) {
            $action = (string) ($input['action'] ?? '');
            if (!in_array($action, ['approve', 'decline'], true)) fail_response(400, 'Choose approve or decline');
            $days = max(1, min(90, (int) ($input['days'] ?? 7)));
            $pdo->beginTransaction();
            $lock = $pdo->prepare('SELECT id, name FROM demo_access_requests WHERE id = ? AND status = "pending" FOR UPDATE');
            $lock->execute([strtolower($m[1])]); $request = $lock->fetch();
            if (!is_array($request)) { $pdo->rollBack(); fail_response(409, 'This request is no longer pending'); }
            if ($action === 'decline') {
                $pdo->prepare('UPDATE demo_access_requests SET status = "declined" WHERE id = ?')->execute([$request['id']]);
                platform_record($pdo, $principal['id'], 'demo.request_declined', 'demo_request ' . $request['id'], []);
                $pdo->commit();
                workspace_json(['status' => 'declined', 'csrf' => $session['csrf']]);
            }
            $issued = demo_issue_code($pdo, 'Request: ' . $request['name'], $days);
            $pdo->prepare('UPDATE demo_access_requests SET status = "approved", code_id = ? WHERE id = ?')->execute([$issued['id'], $request['id']]);
            platform_record($pdo, $principal['id'], 'demo.request_approved', 'demo_request ' . $request['id'], ['codeId' => $issued['id'], 'days' => $days]);
            $pdo->commit();
            // The code is returned exactly once, to the operator who approved it; only its hash is stored.
            workspace_json(['status' => 'approved', 'code' => $issued['code'], 'days' => $issued['days'], 'csrf' => $session['csrf']]);
        }
        if (preg_match('#^/demo-codes/([0-9a-f-]{36})/revoke$#', $route, $m) === 1) {
            $pdo->beginTransaction();
            $done = $pdo->prepare('UPDATE demo_access_codes SET revoked_at = UTC_TIMESTAMP() WHERE id = ? AND revoked_at IS NULL');
            $done->execute([strtolower($m[1])]);
            if ($done->rowCount() !== 1) { $pdo->rollBack(); fail_response(404, 'No active code with that id'); }
            platform_record($pdo, $principal['id'], 'demo.code_revoked', 'demo_code ' . strtolower($m[1]), []);
            $pdo->commit();
            workspace_json(['revoked' => true, 'csrf' => $session['csrf']]);
        }
        fail_response(404, 'Not found');
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        fail_response(503, 'Platform administration is temporarily unavailable');
    }
}
