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
        'id' => (string) $r['id'], 'tenantId' => (string) $r['tenant_id'], 'workspace' => (string) $r['workspace'], 'accountKind' => (string) $r['account_kind'], 'legalName' => (string) $r['legal_name'],
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

function platform_packs(PDO $pdo): array {
    return array_map(static fn($p) => ['id' => (string) $p['id'], 'name' => (string) $p['name'], 'stamps' => (int) $p['stamps'], 'priceCents' => (int) $p['price_cents'],
        'validMonths' => (int) $p['valid_months'], 'active' => (int) $p['active'] === 1], $pdo->query('SELECT * FROM platform_stamp_packs ORDER BY stamps, name')->fetchAll());
}
function platform_charges(PDO $pdo): array {
    return array_map(static fn($c) => ['id' => (string) $c['id'], 'legalName' => (string) $c['legal_name'], 'workspace' => (string) $c['workspace'], 'pack' => (string) $c['pack_name'],
        'stamps' => (int) $c['stamps'], 'amountCents' => (int) $c['amount_cents'], 'status' => (string) $c['status'], 'reference' => (string) ($c['payment_reference'] ?? ''),
        'createdAt' => (string) $c['created_at'], 'paidAt' => $c['paid_at'] ? (string) $c['paid_at'] : null],
        $pdo->query('SELECT c.*, e.legal_name, t.display_name AS workspace, p.name AS pack_name FROM platform_charges c INNER JOIN tenant_legal_entities e ON e.id = c.legal_entity_id
            INNER JOIN tenant_accounts t ON t.id = c.tenant_id INNER JOIN platform_stamp_packs p ON p.id = c.pack_id ORDER BY c.created_at DESC LIMIT 200')->fetchAll());
}
function platform_settlements(PDO $pdo): array {
    return array_map(static fn($r) => ['id' => (string) $r['id'], 'workspace' => (string) $r['workspace'], 'legalName' => (string) $r['legal_name'], 'auctionRef' => (string) $r['auction_ref'],
        'currency' => (string) $r['currency'], 'baselineCents' => (int) $r['baseline_cents'], 'awardedCents' => (int) $r['awarded_cents'], 'savingCents' => (int) $r['saving_cents'],
        'feeCents' => (int) $r['fee_cents'], 'status' => (string) $r['status'], 'reference' => (string) ($r['payment_reference'] ?? ''), 'createdAt' => (string) $r['created_at']],
        $pdo->query('SELECT s.*, t.display_name AS workspace, e.legal_name FROM award_settlements s INNER JOIN tenant_accounts t ON t.id = s.tenant_id
            INNER JOIN tenant_legal_entities e ON e.id = s.legal_entity_id ORDER BY s.created_at DESC LIMIT 200')->fetchAll());
}
function platform_commerce_terms(PDO $pdo): array {
    return array_map(static fn($r) => ['scope' => (string) $r['scope']] + commerce_public_terms(commerce_normalize_terms($r)),
        $pdo->query('SELECT * FROM commerce_terms ORDER BY scope = "default" DESC, scope')->fetchAll());
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
                'audit' => platform_audit($pdo), 'packs' => platform_packs($pdo), 'charges' => platform_charges($pdo),
                'settlements' => platform_settlements($pdo), 'commerceTerms' => platform_commerce_terms($pdo), 'csrf' => $session['csrf']]);
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
        if ($route === '/packs') {
            $name = tenant_text($input['name'] ?? '', 120);
            $stamps = filter_var($input['stamps'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 1000000]]);
            $price = auction_amount_cents($input['priceCents'] ?? null);
            $months = filter_var($input['validMonths'] ?? 12, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 120]]);
            $id = isset($input['id']) && tenant_is_uuid($input['id']) ? strtolower((string) $input['id']) : tenant_uuid();
            if ($name === '' || $stamps === false || $price === null || $months === false) fail_response(400, 'A name, stamps, a price and validity are required');
            $pdo->prepare('INSERT INTO platform_stamp_packs (id, name, stamps, price_cents, valid_months, active) VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE name = VALUES(name), stamps = VALUES(stamps), price_cents = VALUES(price_cents), valid_months = VALUES(valid_months), active = VALUES(active)')
                ->execute([$id, $name, $stamps, $price, $months, ($input['active'] ?? true) !== false ? 1 : 0]);
            platform_record($pdo, $principal['id'], 'billing.pack_saved', 'pack ' . $id, ['stamps' => $stamps, 'priceCents' => $price]);
            workspace_json(['id' => $id, 'csrf' => $session['csrf']]);
        }
        if ($route === '/charges') {
            $entity = strtolower((string) ($input['companyId'] ?? '')); $packId = strtolower((string) ($input['packId'] ?? ''));
            if (!tenant_is_uuid($entity) || !tenant_is_uuid($packId)) fail_response(400, 'A company and a pack are required');
            $pack = $pdo->prepare('SELECT * FROM platform_stamp_packs WHERE id = ? AND active = 1'); $pack->execute([$packId]); $pk = $pack->fetch();
            if (!is_array($pk)) fail_response(404, 'That pack is not on sale');
            $tenant = $pdo->prepare('SELECT tenant_id FROM tenant_legal_entities WHERE id = ?'); $tenant->execute([$entity]); $tenantId = $tenant->fetchColumn();
            if ($tenantId === false) fail_response(404, 'Company not found');
            $id = tenant_uuid();
            $pdo->prepare('INSERT INTO platform_charges (id, tenant_id, legal_entity_id, pack_id, stamps, amount_cents, created_by_principal_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
                ->execute([$id, $tenantId, $entity, $packId, (int) $pk['stamps'], (int) $pk['price_cents'], $principal['id']]);
            platform_record($pdo, $principal['id'], 'billing.charge_created', 'charge ' . $id, ['companyId' => $entity, 'stamps' => (int) $pk['stamps']]);
            workspace_json(['id' => $id, 'csrf' => $session['csrf']]);
        }
        if (preg_match('#^/charges/([0-9a-f-]{36})/(paid|cancel)$#', $route, $m) === 1) {
            $chargeId = strtolower($m[1]);
            $pdo->beginTransaction();
            $lock = $pdo->prepare('SELECT * FROM platform_charges WHERE id = ? FOR UPDATE'); $lock->execute([$chargeId]); $charge = $lock->fetch();
            if (!is_array($charge)) { $pdo->rollBack(); fail_response(404, 'Charge not found'); }
            if ($charge['status'] !== 'pending') { $pdo->rollBack(); fail_response(409, 'Only a pending charge can change'); }
            if ($m[2] === 'cancel') {
                $pdo->prepare('UPDATE platform_charges SET status = "cancelled" WHERE id = ?')->execute([$chargeId]);
                platform_record($pdo, $principal['id'], 'billing.charge_cancelled', 'charge ' . $chargeId, []);
                $pdo->commit();
                workspace_json(['status' => 'cancelled', 'csrf' => $session['csrf']]);
            }
            $reference = tenant_text($input['reference'] ?? '', 120);
            if (mb_strlen($reference) < 4) { $pdo->rollBack(); fail_response(400, 'The payment reference (for example the SPEI tracking key) is required'); }
            $lockProfile = $pdo->prepare('SELECT stamps_balance FROM tenant_fiscal_profiles WHERE legal_entity_id = ? FOR UPDATE'); $lockProfile->execute([$charge['legal_entity_id']]);
            $balance = (int) $lockProfile->fetchColumn() + (int) $charge['stamps'];
            $pdo->prepare('UPDATE tenant_fiscal_profiles SET stamps_balance = ? WHERE legal_entity_id = ?')->execute([$balance, $charge['legal_entity_id']]);
            $pdo->prepare('INSERT INTO cfdi_stamp_ledger (tenant_id, legal_entity_id, delta, balance_after, reason, created_by_principal_id) VALUES (?, ?, ?, ?, ?, ?)')
                ->execute([$charge['tenant_id'], $charge['legal_entity_id'], (int) $charge['stamps'], $balance, 'pack_paid', $principal['id']]);
            $pdo->prepare('UPDATE platform_charges SET status = "paid", payment_reference = ?, paid_by_principal_id = ?, paid_at = CURRENT_TIMESTAMP WHERE id = ?')->execute([$reference, $principal['id'], $chargeId]);
            tenant_audit($pdo, ['principalId' => $principal['id'], 'tenant' => ['id' => $charge['tenant_id']], 'company' => ['id' => $charge['legal_entity_id']], 'location' => ['id' => null]],
                'billing.charge_paid', 'charge', $chargeId, ['stamps' => (int) $charge['stamps'], 'balanceAfter' => $balance, 'reference' => $reference], $key);
            platform_record($pdo, $principal['id'], 'billing.charge_paid', 'charge ' . $chargeId, ['stamps' => (int) $charge['stamps']]);
            $pdo->commit();
            workspace_json(['status' => 'paid', 'balance' => $balance, 'csrf' => $session['csrf']]);
        }
        if ($route === '/commerce-terms') {
            $scope = strtolower(trim((string) ($input['scope'] ?? 'default')));
            if ($scope !== 'default' && !tenant_is_uuid($scope)) fail_response(400, 'The scope is "default" or a workspace id');
            $percent = static function ($value): int {
                if (!is_numeric($value) || (float) $value < 0 || (float) $value > 100) fail_response(400, 'A percentage is out of range');
                return (int) round((float) $value * 100);
            };
            $money = static function ($value): int {
                if (!is_numeric($value) || (float) $value < 0 || (float) $value > 1000000000) fail_response(400, 'An amount is out of range');
                return (int) round((float) $value * 100);
            };
            $mode = (string) ($input['mode'] ?? 'informative');
            if (!in_array($mode, ['informative', 'charging'], true)) fail_response(400, 'The mode is informative or charging');
            $currency = strtoupper((string) ($input['currency'] ?? 'MXN'));
            if (preg_match('/^[A-Z]{3}$/', $currency) !== 1) fail_response(400, 'The currency is a three-letter code');
            $row = ['rate_bps' => $percent($input['ratePercent'] ?? null), 'bracket_rate_bps' => $percent($input['bracketRatePercent'] ?? null),
                'floor_bps' => $percent($input['floorPercent'] ?? null), 'cap_bps' => $percent($input['capPercent'] ?? null),
                'bracket_threshold_cents' => $money($input['bracketThreshold'] ?? null), 'floor_min_cents' => $money($input['floorMin'] ?? null)];
            if ($row['floor_bps'] > $row['cap_bps']) fail_response(400, 'The floor cannot exceed the cap');
            $tenant = $scope === 'default' ? null : $scope;
            if ($tenant !== null) { $exists = $pdo->prepare('SELECT 1 FROM tenant_accounts WHERE id = ?'); $exists->execute([$tenant]); if ($exists->fetchColumn() === false) fail_response(404, 'Workspace not found'); }
            $pdo->prepare('INSERT INTO commerce_terms (scope, tenant_id, currency, rate_bps, bracket_threshold_cents, bracket_rate_bps, floor_bps, floor_min_cents, cap_bps, mode, updated_by_principal_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE currency = VALUES(currency), rate_bps = VALUES(rate_bps), bracket_threshold_cents = VALUES(bracket_threshold_cents),
                bracket_rate_bps = VALUES(bracket_rate_bps), floor_bps = VALUES(floor_bps), floor_min_cents = VALUES(floor_min_cents), cap_bps = VALUES(cap_bps), mode = VALUES(mode), updated_by_principal_id = VALUES(updated_by_principal_id)')
                ->execute([$scope, $tenant, $currency, $row['rate_bps'], $row['bracket_threshold_cents'], $row['bracket_rate_bps'], $row['floor_bps'], $row['floor_min_cents'], $row['cap_bps'], $mode, $principal['id']]);
            platform_record($pdo, $principal['id'], 'commerce.terms_saved', 'terms ' . $scope, ['mode' => $mode, 'rateBps' => $row['rate_bps']]);
            workspace_json(['scope' => $scope, 'csrf' => $session['csrf']]);
        }
        if (preg_match('#^/settlements/([0-9a-f-]{36})/(paid|waive)$#', $route, $m) === 1) {
            $settlementId = strtolower($m[1]);
            $pdo->beginTransaction();
            $lock = $pdo->prepare('SELECT * FROM award_settlements WHERE id = ? FOR UPDATE'); $lock->execute([$settlementId]); $settlement = $lock->fetch();
            if (!is_array($settlement)) { $pdo->rollBack(); fail_response(404, 'Settlement not found'); }
            if ($settlement['status'] !== 'pending') { $pdo->rollBack(); fail_response(409, 'Only a pending settlement can change'); }
            $reference = tenant_text($input['reference'] ?? '', 120);
            if (mb_strlen($reference) < 4) { $pdo->rollBack(); fail_response(400, $m[2] === 'paid' ? 'The payment reference (for example the SPEI tracking key) is required' : 'A reason is required to waive a fee'); }
            $next = $m[2] === 'paid' ? 'paid' : 'waived';
            $pdo->prepare('UPDATE award_settlements SET status = ?, payment_reference = ?, resolved_by_principal_id = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?')->execute([$next, $reference, $principal['id'], $settlementId]);
            platform_record($pdo, $principal['id'], 'commerce.settlement_' . $next, 'settlement ' . $settlementId, ['feeCents' => (int) $settlement['fee_cents']]);
            $pdo->commit();
            workspace_json(['status' => $next, 'csrf' => $session['csrf']]);
        }
        fail_response(404, 'Not found');
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        fail_response(503, 'Platform administration is temporarily unavailable');
    }
}
