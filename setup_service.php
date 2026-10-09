<?php
declare(strict_types=1);

// Company setup wizard API, loaded only by index.php. It takes a company from
// enrolment to operation: fiscal data, branches and warehouses, invoicing
// readiness (series, CSD, stamps), team, payout account, and a final audit.
// Adapted from besttorni's first-run wizard (garlo SetupService) to the
// multi-tenant model: everything is scoped to the signed-in company, every
// write needs company-admin rights, Origin + CSRF, and leaves an audit event.
// The server returns codes and numbers, never prose: the client translates.

const SETUP_BANKS = ['002'=>'Banamex','006'=>'Bancomext','009'=>'Banobras','012'=>'BBVA México','014'=>'Santander','019'=>'Banjército','021'=>'HSBC','030'=>'BanBajío','032'=>'IXE','036'=>'Inbursa','037'=>'Interacciones','042'=>'Mifel','044'=>'Scotiabank','058'=>'Banregio','059'=>'Invex','060'=>'Bansí','062'=>'Afirme','072'=>'Banorte','103'=>'American Express','106'=>'Bank of America','108'=>'MUFG','110'=>'JP Morgan','112'=>'Bmonex','113'=>'Ve por Más','127'=>'Azteca','128'=>'Autofin','130'=>'Compartamos','131'=>'Banco Famsa','132'=>'Multiva','133'=>'Actinver','136'=>'Intercam','137'=>'BanCoppel','138'=>'ABC Capital','140'=>'Consubanco','143'=>'CIBanco','145'=>'BBase','147'=>'Bankaool','148'=>'PagaTodo','150'=>'Inmobiliario','155'=>'ICBC','156'=>'Sabadell','166'=>'Bansefi','168'=>'Hipotecaria Federal','600'=>'Monex Casa de Bolsa','646'=>'STP','659'=>'ASP Integra','684'=>'Transfer','722'=>'Mercado Pago W','723'=>'Cuenca','728'=>'Spin by OXXO','638'=>'Nu México','901'=>'CLS','902'=>'Indeval'];

function setup_require_write(array $session): void {
    if (!tenant_header_origin_is_safe() || !hash_equals($session['csrf'], workspace_header('X-Buyniverse-CSRF')) || workspace_header('X-Buyniverse-Request') !== 'setup-v1')
        fail_response(403, 'Request verification failed');
    $last = (float) ($_SESSION['setup_last_write'] ?? 0);
    if (microtime(true) - $last < 0.4) fail_response(429, 'Please wait before saving again');
    $_SESSION['setup_last_write'] = microtime(true);
}
function setup_clean_text($value, int $limit): string { return tenant_text($value, $limit); }
function setup_clabe_valid(string $clabe): bool {
    if (preg_match('/^\d{18}$/', $clabe) !== 1) return false;
    $weights = [3, 7, 1]; $sum = 0;
    for ($i = 0; $i < 17; $i++) $sum += ((int) $clabe[$i] * $weights[$i % 3]) % 10;
    return (10 - $sum % 10) % 10 === (int) $clabe[17];
}
function setup_mask_email(string $email): string {
    [$user, $domain] = array_pad(explode('@', $email, 2), 2, '');
    return ($user !== '' ? substr($user, 0, 1) : '') . '***@' . ($domain !== '' ? substr($domain, 0, 1) . '***' . (str_contains($domain, '.') ? substr($domain, (int) strrpos($domain, '.')) : '') : '');
}
function setup_postal(string $zip, string $country): ?array {
    // Mexican postal codes resolve state, city and colonias from the SAT catalogue.
    if ($country !== 'MX') return null;
    return \Buyniverse\Cfdi\SatCatalog::postalInfo($zip);
}

function setup_company(PDO $pdo, array $context, string $key): array {
    $row = $pdo->prepare('SELECT e.legal_name, e.rfc, e.tax_identifier, e.tax_regime, e.country_code, e.fiscal_street, e.fiscal_city, e.fiscal_region, e.fiscal_subdivision, e.fiscal_postal_code,
        c.trade_name, c.phone, c.website, c.neighborhood, p.id AS profile_id, p.issuance_mode, p.connector_key, p.status AS profile_status, p.certificate_number, p.certificate_valid_to, p.stamps_balance,
        p.billing_email_ciphertext, p.billing_email_iv, p.billing_email_tag
        FROM tenant_legal_entities e LEFT JOIN tenant_company_profiles c ON c.legal_entity_id = e.id LEFT JOIN tenant_fiscal_profiles p ON p.tenant_id = e.tenant_id AND p.legal_entity_id = e.id
        WHERE e.id = ? AND e.tenant_id = ? LIMIT 1');
    $row->execute([$context['company']['id'], $context['tenant']['id']]); $r = $row->fetch();
    if (!is_array($r)) fail_response(404, 'Company not found');
    $email = '';
    if ($r['billing_email_ciphertext'] !== null) {
        $plain = openssl_decrypt((string) $r['billing_email_ciphertext'], 'aes-256-gcm', $key, OPENSSL_RAW_DATA, (string) $r['billing_email_iv'], (string) $r['billing_email_tag'], 'buyniverse-fiscal-v1|' . $context['tenant']['id'] . '|' . $context['company']['id'] . '|billing-email');
        $email = is_string($plain) ? $plain : '';
    }
    return [
        'id'=>(string) $context['company']['id'], 'countryCode'=>(string) $r['country_code'], 'legalName'=>(string) $r['legal_name'], 'rfc'=>(string) ($r['rfc'] ?? ''), 'taxIdentifier'=>(string) ($r['tax_identifier'] ?? ''),
        'taxRegime'=>(string) ($r['tax_regime'] ?? ''), 'postalCode'=>(string) ($r['fiscal_postal_code'] ?? ''), 'street'=>(string) ($r['fiscal_street'] ?? ''), 'neighborhood'=>(string) ($r['neighborhood'] ?? ''),
        'city'=>(string) ($r['fiscal_city'] ?? ''), 'region'=>(string) ($r['fiscal_region'] ?? ''), 'subdivision'=>(string) ($r['fiscal_subdivision'] ?? ''), 'tradeName'=>(string) ($r['trade_name'] ?? ''),
        'phone'=>(string) ($r['phone'] ?? ''), 'website'=>(string) ($r['website'] ?? ''), 'billingEmail'=>$email,
        'issuance'=>['mode'=>(string) ($r['issuance_mode'] ?? 'external'), 'connector'=>(string) ($r['connector_key'] ?? 'external'), 'status'=>(string) ($r['profile_status'] ?? 'external'),
            'certificateNumber'=>(string) ($r['certificate_number'] ?? ''), 'certificateValidTo'=>$r['certificate_valid_to'] ? gmdate('c', (int) strtotime((string) $r['certificate_valid_to'] . ' UTC')) : null, 'stampsBalance'=>(int) ($r['stamps_balance'] ?? 0)],
    ];
}

function setup_locations(PDO $pdo, array $context): array {
    $rows = $pdo->prepare('SELECT l.id, l.kind, l.code, l.name, l.status, d.street, d.neighborhood, d.city, d.state_code, d.postal_code, d.phone
        FROM tenant_locations l LEFT JOIN tenant_location_details d ON d.location_id = l.id WHERE l.tenant_id = ? AND l.legal_entity_id = ? ORDER BY l.name');
    $rows->execute([$context['tenant']['id'], $context['company']['id']]);
    $out = [];
    foreach ($rows->fetchAll() as $r) $out[] = ['id'=>(string) $r['id'], 'kind'=>(string) $r['kind'], 'code'=>(string) $r['code'], 'name'=>(string) $r['name'], 'active'=>$r['status'] === 'active',
        'street'=>(string) ($r['street'] ?? ''), 'neighborhood'=>(string) ($r['neighborhood'] ?? ''), 'city'=>(string) ($r['city'] ?? ''), 'stateCode'=>(string) ($r['state_code'] ?? ''), 'postalCode'=>(string) ($r['postal_code'] ?? ''), 'phone'=>(string) ($r['phone'] ?? '')];
    return $out;
}

function setup_team(PDO $pdo, array $context, string $key): array {
    $members = $pdo->prepare('SELECT m.id, m.role_key, m.scope_kind, m.location_id, p.display_name FROM tenant_memberships m INNER JOIN tenant_principals p ON p.id = m.principal_id
        WHERE m.tenant_id = ? AND m.status = "active" AND (m.scope_kind = "tenant" OR m.legal_entity_id = ?) ORDER BY m.created_at');
    $members->execute([$context['tenant']['id'], $context['company']['id']]);
    $invites = $pdo->prepare('SELECT id, role_key, scope_kind, location_id, expires_at, email_ciphertext, email_iv, email_tag FROM tenant_invitations
        WHERE tenant_id = ? AND status = "pending" AND expires_at > UTC_TIMESTAMP() AND (legal_entity_id = ? OR legal_entity_id IS NULL) ORDER BY created_at DESC LIMIT 100');
    $invites->execute([$context['tenant']['id'], $context['company']['id']]);
    $pending = [];
    foreach ($invites->fetchAll() as $i) {
        $plain = openssl_decrypt((string) $i['email_ciphertext'], 'aes-256-gcm', $key, OPENSSL_RAW_DATA, (string) $i['email_iv'], (string) $i['email_tag'], 'buyniverse-tenant-invite|' . $i['id']);
        $pending[] = ['id'=>(string) $i['id'], 'role'=>(string) $i['role_key'], 'scope'=>(string) $i['scope_kind'], 'locationId'=>$i['location_id'] ? (string) $i['location_id'] : null, 'email'=>setup_mask_email(is_string($plain) ? $plain : ''), 'expiresAt'=>auction_iso((string) $i['expires_at'])];
    }
    $list = [];
    foreach ($members->fetchAll() as $m) $list[] = ['name'=>(string) $m['display_name'], 'role'=>(string) $m['role_key'], 'scope'=>(string) $m['scope_kind'], 'locationId'=>$m['location_id'] ? (string) $m['location_id'] : null];
    return ['members'=>$list, 'invitations'=>$pending];
}

function setup_payout(PDO $pdo, array $context): ?array {
    $row = $pdo->prepare('SELECT holder, bank_code, bank_name, clabe_last4 FROM tenant_payout_accounts WHERE tenant_id = ? AND legal_entity_id = ? LIMIT 1');
    $row->execute([$context['tenant']['id'], $context['company']['id']]); $r = $row->fetch();
    return is_array($r) ? ['holder'=>(string) $r['holder'], 'bankCode'=>(string) $r['bank_code'], 'bank'=>(string) $r['bank_name'], 'last4'=>(string) $r['clabe_last4']] : null;
}

/** Everything the wizard shows: the step checklist and the final audit, by area. */
function setup_status(PDO $pdo, array $config, array $context, string $key): array {
    $company = setup_company($pdo, $context, $key); $locations = setup_locations($pdo, $context); $team = setup_team($pdo, $context, $key); $payout = setup_payout($pdo, $context);
    $mx = $company['countryCode'] === 'MX'; $issuesHere = $company['issuance']['mode'] === 'buyniverse' && $mx;
    $roles = $pdo->prepare('SELECT DISTINCT role_key FROM tenant_memberships WHERE tenant_id = ? AND status = "active" AND (scope_kind = "tenant" OR legal_entity_id = ?)');
    $roles->execute([$context['tenant']['id'], $context['company']['id']]); $roleSet = array_column($roles->fetchAll(), 'role_key');
    $sells = in_array('supplier', $roleSet, true);

    $missing = [];
    foreach (['legalName'=>'legalName', 'rfc'=>$mx ? 'rfc' : null, 'taxRegime'=>$mx ? 'taxRegime' : null, 'postalCode'=>'postalCode', 'street'=>'street', 'city'=>'city', 'phone'=>'phone', 'billingEmail'=>'billingEmail'] as $field => $label)
        if ($label !== null && $company[$field] === '') $missing[] = $label;
    $activePlaces = array_values(array_filter($locations, fn($l) => $l['active']));
    $noZip = array_values(array_filter($activePlaces, fn($l) => preg_match('/^\d{5}$/', $l['postalCode']) !== 1));

    $series = ['I'=>0, 'E'=>0, 'P'=>0, 'G'=>0];
    if ($issuesHere) {
        $rows = $pdo->prepare('SELECT doc_kind, COUNT(*) AS n FROM cfdi_series WHERE tenant_id = ? AND legal_entity_id = ? AND active = 1 GROUP BY doc_kind');
        $rows->execute([$context['tenant']['id'], $context['company']['id']]);
        foreach ($rows->fetchAll() as $r) $series[(string) $r['doc_kind']] = (int) $r['n'];
    }
    $seriesMissing = array_keys(array_filter(['I'=>$series['I'], 'E'=>$series['E'], 'P'=>$series['P']], fn($n) => $n === 0));
    $stored = $pdo->prepare('SELECT 1 FROM tenant_fiscal_credentials WHERE tenant_id = ? AND legal_entity_id = ? AND active = 1 LIMIT 1');
    $stored->execute([$context['tenant']['id'], $context['company']['id']]); $hasCsd = (bool) $stored->fetchColumn();
    $validTo = $company['issuance']['certificateValidTo'] ? strtotime($company['issuance']['certificateValidTo']) : 0;
    $csdOk = $issuesHere && $hasCsd && $validTo > time() && $company['issuance']['status'] === 'ready';
    $pac = $issuesHere ? \Buyniverse\Cfdi\cfdi_pac($config, workspace_mode($config)) : null;
    $pacEnv = $pac && method_exists($pac, 'environment') ? strtolower((string) $pac->environment()) : null;
    $pacLive = $pac !== null && in_array($pacEnv, ['prod', 'production', 'live'], true);
    $balance = (int) $company['issuance']['stampsBalance'];
    $others = count($team['members']) > 1 || count($team['invitations']) > 0;

    $step = static fn(bool $done, bool $required, string $code, array $params = [], bool $na = false) => ['done'=>$done || $na, 'required'=>$required && !$na, 'na'=>$na, 'code'=>$code, 'params'=>$params];
    $steps = [
        'company'=>$step(!$missing, true, $missing ? 'missing' : 'ok', ['missing'=>$missing]),
        'locations'=>$step($activePlaces && !$noZip, true, !$activePlaces ? 'none' : ($noZip ? 'no_postal' : 'ok'), ['count'=>count($activePlaces), 'withoutPostal'=>count($noZip)]),
        'series'=>$step(!$seriesMissing, true, $seriesMissing ? 'missing' : 'ok', ['missing'=>$seriesMissing], !$issuesHere),
        'csd'=>$step($csdOk, true, $csdOk ? 'ok' : ($hasCsd ? ($validTo && $validTo <= time() ? 'expired' : 'pending_pac') : 'none'), ['validTo'=>$company['issuance']['certificateValidTo'], 'number'=>$company['issuance']['certificateNumber']], !$issuesHere),
        'stamps'=>$step($balance > 0, true, $balance > 0 ? 'ok' : 'none', ['balance'=>$balance], !$issuesHere),
        'team'=>$step($others, false, $others ? 'ok' : 'alone', ['members'=>count($team['members']), 'pending'=>count($team['invitations'])]),
        'payments'=>$step($payout !== null, $sells, $payout ? 'ok' : 'none', $payout ? ['bank'=>$payout['bank'], 'last4'=>$payout['last4']] : []),
    ];

    $audit = []; $add = static function (string $area, string $id, string $state, string $level, array $params = [], ?string $step = null) use (&$audit) { $audit[$area][] = ['id'=>$id, 'state'=>$state, 'level'=>$level, 'params'=>$params, 'step'=>$step]; };
    $add('fiscal', 'company', $missing ? 'todo' : 'ok', 'company', ['missing'=>$missing], 'company');
    $add('fiscal', 'places', $activePlaces && !$noZip ? 'ok' : 'todo', 'company', ['count'=>count($activePlaces), 'withoutPostal'=>count($noZip)], 'locations');
    if ($issuesHere) {
        foreach (['I', 'E', 'P', 'G'] as $kind) $add('invoicing', 'series_' . $kind, $series[$kind] > 0 ? 'ok' : ($kind === 'G' ? 'optional' : 'todo'), 'company', ['count'=>$series[$kind]], 'series');
        $add('invoicing', 'csd', $csdOk ? 'ok' : 'todo', 'company', ['validTo'=>$company['issuance']['certificateValidTo']], 'csd');
        $add('invoicing', 'stamps', $balance > 0 ? 'ok' : 'todo', 'company', ['balance'=>$balance], 'stamps');
        $add('invoicing', 'pac', $pac === null ? 'todo' : ($pacLive ? 'ok' : 'todo'), 'platform', ['environment'=>$pacEnv, 'connected'=>$pac !== null]);
    } else {
        $add('invoicing', 'external', 'na', 'company', ['country'=>$company['countryCode']]);
    }
    $admins = count(array_filter($team['members'], fn($m) => in_array($m['role'], ['owner', 'admin'], true)));
    $add('team', 'admins', $admins >= 1 ? 'ok' : 'todo', 'company', ['count'=>$admins], 'team');
    $add('team', 'colleagues', $others ? 'ok' : 'optional', 'company', ['members'=>count($team['members']), 'pending'=>count($team['invitations'])], 'team');
    $add('payments', 'payout', $payout ? 'ok' : ($sells ? 'todo' : 'optional'), 'company', $payout ? ['bank'=>$payout['bank'], 'last4'=>$payout['last4']] : [], 'payments');
    if ($sells) {
        $compliance = $pdo->prepare('SELECT status FROM tenant_supplier_compliance WHERE tenant_id = ? AND legal_entity_id = ? LIMIT 1');
        $compliance->execute([$context['tenant']['id'], $context['company']['id']]); $formal = $compliance->fetchColumn();
        $add('compliance', 'supplier', $formal === 'formal' ? 'ok' : 'optional', 'company', ['status'=>$formal === false ? null : (string) $formal]);
    }
    $areas = []; foreach ($audit as $area => $items) $areas[] = ['area'=>$area, 'items'=>$items];
    $ready = true; foreach ($steps as $s) if ($s['required'] && !$s['done']) $ready = false;
    return ['company'=>$company, 'locations'=>$locations, 'team'=>$team, 'payout'=>$payout, 'steps'=>$steps, 'audit'=>$areas, 'ready'=>$ready, 'pac'=>['connected'=>$pac !== null, 'environment'=>$pacEnv, 'live'=>$pacLive]];
}

function setup_save_company(PDO $pdo, array $context, array $input, string $key): void {
    $company = setup_company($pdo, $context, $key); $mx = $company['countryCode'] === 'MX';
    $legalName = setup_clean_text($input['legalName'] ?? '', 220);
    $street = setup_clean_text($input['street'] ?? '', 240); $neighborhood = setup_clean_text($input['neighborhood'] ?? '', 120);
    $zip = setup_clean_text($input['postalCode'] ?? '', 24); $phone = setup_clean_text($input['phone'] ?? '', 40);
    $tradeName = setup_clean_text($input['tradeName'] ?? '', 160); $website = setup_clean_text($input['website'] ?? '', 200);
    $email = strtolower(trim((string) ($input['billingEmail'] ?? '')));
    if ($legalName === '' || $street === '' || $phone === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) fail_response(422, 'Complete the company name, address, phone and billing email');
    if ($website !== '' && preg_match('#^https?://[^\s]+$#i', $website) !== 1) fail_response(422, 'The website must start with http:// or https://');
    $city = setup_clean_text($input['city'] ?? '', 120); $region = setup_clean_text($input['region'] ?? '', 120); $subdivision = $company['subdivision'];
    $rfc = $company['rfc']; $regime = $company['taxRegime'];
    if ($mx) {
        // The RFC is the company's identity: it can be set once, never rewritten from the wizard.
        $submittedRfc = tenant_rfc($input['rfc'] ?? '');
        if ($rfc === '' && $submittedRfc !== '') $rfc = $submittedRfc;
        elseif ($rfc !== '' && $submittedRfc !== '' && !hash_equals($rfc, $submittedRfc)) fail_response(422, 'The RFC cannot be changed here');
        $type = \Buyniverse\Cfdi\SatCatalog::personType($rfc);
        if ($type === null) fail_response(422, 'The RFC is not valid');
        $regime = setup_clean_text($input['taxRegime'] ?? '', 12);
        $catalog = \Buyniverse\Cfdi\SatCatalog::publicCatalogs()['regimen_fiscal'];
        if (!isset($catalog[$regime]) || empty($catalog[$regime][$type])) fail_response(422, 'The tax regime does not apply to this kind of taxpayer');
        $info = \Buyniverse\Cfdi\SatCatalog::postalInfo($zip);
        if (!$info) fail_response(422, 'The postal code does not exist in the SAT catalogue');
        $legalName = \Buyniverse\Cfdi\SatCatalog::normalizeName($legalName);
        $subdivision = $info['state']; $region = $info['stateName']; $city = $info['city'] ?: $info['municipality'];
        if ($neighborhood !== '' && $info['neighborhoods'] && !in_array($neighborhood, $info['neighborhoods'], true)) fail_response(422, 'That colonia does not belong to the postal code');
    } elseif ($city === '' || $zip === '') fail_response(422, 'Complete the city and postal code');
    $pdo->beginTransaction();
    try {
        $pdo->prepare('UPDATE tenant_legal_entities SET legal_name = ?, rfc = ?, rfc_hash = ?, tax_regime = ?, fiscal_street = ?, fiscal_city = ?, fiscal_region = ?, fiscal_subdivision = ?, fiscal_postal_code = ? WHERE id = ? AND tenant_id = ?')
            ->execute([$legalName, $rfc ?: null, $rfc ? hash_hmac('sha256', $rfc, $key) : null, $regime ?: null, $street, $city, $region, $subdivision ?: null, $zip, $context['company']['id'], $context['tenant']['id']]);
        $pdo->prepare('INSERT INTO tenant_company_profiles (legal_entity_id, tenant_id, trade_name, phone, website, neighborhood) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE trade_name = VALUES(trade_name), phone = VALUES(phone), website = VALUES(website), neighborhood = VALUES(neighborhood)')
            ->execute([$context['company']['id'], $context['tenant']['id'], $tradeName ?: null, $phone, $website ?: null, $neighborhood ?: null]);
        $box = workspace_encrypt($email, $key, 'buyniverse-fiscal-v1|' . $context['tenant']['id'] . '|' . $context['company']['id'] . '|billing-email');
        $has = $pdo->prepare('SELECT id FROM tenant_fiscal_profiles WHERE tenant_id = ? AND legal_entity_id = ? FOR UPDATE'); $has->execute([$context['tenant']['id'], $context['company']['id']]);
        if ($has->fetchColumn() !== false) $pdo->prepare('UPDATE tenant_fiscal_profiles SET billing_email_ciphertext = ?, billing_email_iv = ?, billing_email_tag = ? WHERE tenant_id = ? AND legal_entity_id = ?')->execute([$box[0], $box[1], $box[2], $context['tenant']['id'], $context['company']['id']]);
        else $pdo->prepare('INSERT INTO tenant_fiscal_profiles (id, tenant_id, legal_entity_id, issuance_mode, connector_key, status, billing_email_ciphertext, billing_email_iv, billing_email_tag) VALUES (?, ?, ?, "external", "external", "external", ?, ?, ?)')
            ->execute([tenant_uuid(), $context['tenant']['id'], $context['company']['id'], $box[0], $box[1], $box[2]]);
        tenant_audit($pdo, $context, 'setup.company_saved', 'legal_entity', (string) $context['company']['id'], ['rfcPrefix'=>$rfc !== '' ? substr($rfc, 0, 4) . '***' : null, 'regime'=>$regime, 'postalCode'=>$zip], $key);
        $pdo->commit();
    } catch (PDOException $error) { if ($pdo->inTransaction()) $pdo->rollBack(); fail_response(409, 'This RFC already exists in the workspace'); }
    catch (Throwable $error) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $error; }
}

function setup_save_location(PDO $pdo, array $context, array $input, string $key): string {
    $id = isset($input['id']) && tenant_is_uuid($input['id']) ? strtolower((string) $input['id']) : null;
    $kind = (string) ($input['kind'] ?? ''); $code = strtoupper(setup_clean_text($input['code'] ?? '', 40)); $name = setup_clean_text($input['name'] ?? '', 160);
    $street = setup_clean_text($input['street'] ?? '', 240); $neighborhood = setup_clean_text($input['neighborhood'] ?? '', 120);
    $city = setup_clean_text($input['city'] ?? '', 120); $zip = setup_clean_text($input['postalCode'] ?? '', 24); $phone = setup_clean_text($input['phone'] ?? '', 40);
    $active = ($input['active'] ?? true) !== false;
    if ($name === '' || $street === '') fail_response(422, 'A name and a street address are required');
    $country = (string) ($context['company']['countryCode'] ?? 'MX');
    $state = null;
    if ($country === 'MX') {
        $info = \Buyniverse\Cfdi\SatCatalog::postalInfo($zip);
        if (!$info) fail_response(422, 'The postal code does not exist in the SAT catalogue');
        $state = $info['state']; $city = $city !== '' ? $city : ($info['city'] ?: $info['municipality']);
        if ($neighborhood !== '' && $info['neighborhoods'] && !in_array($neighborhood, $info['neighborhoods'], true)) fail_response(422, 'That colonia does not belong to the postal code');
    } elseif ($zip === '' || $city === '') fail_response(422, 'Complete the city and postal code');
    $pdo->beginTransaction();
    try {
        if ($id) {
            $own = $pdo->prepare('SELECT id FROM tenant_locations WHERE id = ? AND tenant_id = ? AND legal_entity_id = ? FOR UPDATE'); $own->execute([$id, $context['tenant']['id'], $context['company']['id']]);
            if ($own->fetchColumn() === false) { $pdo->rollBack(); fail_response(404, 'Location not found'); }
            // The code is the place's identity in documents; only name, address and state may change.
            $pdo->prepare('UPDATE tenant_locations SET name = ?, status = ? WHERE id = ?')->execute([$name, $active ? 'active' : 'inactive', $id]);
        } else {
            if (!in_array($kind, ['branch', 'warehouse'], true) || preg_match('/^[A-Z0-9_-]{2,40}$/', $code) !== 1) fail_response(422, 'A valid type and code are required');
            $count = $pdo->prepare('SELECT COUNT(*) FROM tenant_locations WHERE tenant_id = ? AND legal_entity_id = ?'); $count->execute([$context['tenant']['id'], $context['company']['id']]);
            if ((int) $count->fetchColumn() >= 50) { $pdo->rollBack(); fail_response(409, 'A company can have up to 50 locations'); }
            $id = tenant_uuid();
            $pdo->prepare('INSERT INTO tenant_locations (id, tenant_id, legal_entity_id, kind, code, name) VALUES (?, ?, ?, ?, ?, ?)')->execute([$id, $context['tenant']['id'], $context['company']['id'], $kind, $code, $name]);
        }
        $pdo->prepare('INSERT INTO tenant_location_details (location_id, tenant_id, legal_entity_id, street, neighborhood, city, state_code, postal_code, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE street = VALUES(street), neighborhood = VALUES(neighborhood), city = VALUES(city), state_code = VALUES(state_code), postal_code = VALUES(postal_code), phone = VALUES(phone)')
            ->execute([$id, $context['tenant']['id'], $context['company']['id'], $street, $neighborhood ?: null, $city, $state, $zip, $phone ?: null]);
        tenant_audit($pdo, $context, 'setup.location_saved', 'location', $id, ['code'=>$code ?: null, 'active'=>$active, 'postalCode'=>$zip], $key);
        $pdo->commit();
    } catch (PDOException $error) { if ($pdo->inTransaction()) $pdo->rollBack(); fail_response(409, 'This location code already exists'); }
    catch (Throwable $error) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $error; }
    return $id;
}

function setup_save_payout(PDO $pdo, array $context, array $input, string $key): void {
    $holder = setup_clean_text($input['holder'] ?? '', 220); $clabe = preg_replace('/\s+/', '', (string) ($input['clabe'] ?? ''));
    if ($holder === '') fail_response(422, 'The account holder is required');
    if (!setup_clabe_valid((string) $clabe)) fail_response(422, 'The CLABE is not valid');
    $bankCode = substr((string) $clabe, 0, 3); $bank = SETUP_BANKS[$bankCode] ?? ('Banco ' . $bankCode);
    $hash = hash_hmac('sha256', (string) $clabe, $key);
    $box = workspace_encrypt((string) $clabe, $key, 'buyniverse-payout-v1|' . $context['tenant']['id'] . '|' . $context['company']['id']);
    $reuse = $pdo->prepare('SELECT 1 FROM tenant_payout_accounts WHERE clabe_hash = ? AND NOT (tenant_id = ? AND legal_entity_id = ?) LIMIT 1');
    $reuse->execute([$hash, $context['tenant']['id'], $context['company']['id']]);
    if ($reuse->fetchColumn() !== false) fail_response(409, 'This account is already registered by another company');
    $pdo->beginTransaction();
    try {
        $pdo->prepare('INSERT INTO tenant_payout_accounts (id, tenant_id, legal_entity_id, holder, bank_code, bank_name, clabe_last4, clabe_hash, clabe_ciphertext, clabe_iv, clabe_tag, created_by_principal_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE holder = VALUES(holder), bank_code = VALUES(bank_code), bank_name = VALUES(bank_name), clabe_last4 = VALUES(clabe_last4), clabe_hash = VALUES(clabe_hash), clabe_ciphertext = VALUES(clabe_ciphertext), clabe_iv = VALUES(clabe_iv), clabe_tag = VALUES(clabe_tag)')
            ->execute([tenant_uuid(), $context['tenant']['id'], $context['company']['id'], $holder, $bankCode, $bank, substr((string) $clabe, -4), $hash, $box[0], $box[1], $box[2], $context['principalId']]);
        tenant_audit($pdo, $context, 'setup.payout_saved', 'legal_entity', (string) $context['company']['id'], ['bank'=>$bank, 'last4'=>substr((string) $clabe, -4)], $key);
        $pdo->commit();
    } catch (Throwable $error) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $error; }
}

/** Pending invitations addressed to the verified email of the signed-in identity. */
function setup_invitations_for_identity(PDO $pdo, string $key): array {
    $identity = $_SESSION['buyniverse_identity'] ?? null;
    if (!is_array($identity) || ($identity['emailVerified'] ?? false) !== true || !is_string($identity['email'] ?? null)) return [];
    $rows = $pdo->prepare('SELECT i.id, i.role_key, i.scope_kind, i.legal_entity_id, i.location_id, i.tenant_id, i.expires_at, t.display_name AS tenant_name, e.legal_name
        FROM tenant_invitations i INNER JOIN tenant_accounts t ON t.id = i.tenant_id AND t.status = "active" LEFT JOIN tenant_legal_entities e ON e.id = i.legal_entity_id
        WHERE i.email_hash = ? AND i.status = "pending" AND i.expires_at > UTC_TIMESTAMP() ORDER BY i.created_at DESC LIMIT 20');
    $rows->execute([hash_hmac('sha256', strtolower(trim($identity['email'])), $key)]);
    return $rows->fetchAll();
}

function handle_setup(string $uri): void {
    $config = workspace_config(); $session = workspace_session();
    if (!tenant_has_authenticated_principal($config)) fail_response(401, 'Sign in to continue');
    $pdo = workspace_pdo($config); $key = workspace_key($config);
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if (!in_array($method, ['GET', 'POST'], true)) fail_response(405, 'Method not allowed');
    if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 32768) fail_response(413, 'Request body too large');
    $route = rtrim(substr($uri, strlen('/api/v1/setup')), '/');
    try {
        // Invitations are the one flow that works before the person belongs to any company.
        if ($route === '/invitations' || $route === '/invitations/accept') {
            $principal = tenant_principal($pdo, $config, $session, $key);
            if ($route === '/invitations') {
                if ($method !== 'GET') fail_response(405, 'Method not allowed');
                workspace_json(['invitations'=>array_map(static fn($i) => ['id'=>(string) $i['id'], 'role'=>(string) $i['role_key'], 'scope'=>(string) $i['scope_kind'], 'company'=>(string) ($i['legal_name'] ?? ''), 'workspace'=>(string) $i['tenant_name'], 'expiresAt'=>auction_iso((string) $i['expires_at'])], setup_invitations_for_identity($pdo, $key)), 'csrf'=>$session['csrf']]);
            }
            if ($method !== 'POST') fail_response(405, 'Method not allowed');
            setup_require_write($session); $input = tenant_request_body();
            $wanted = isset($input['invitationId']) && tenant_is_uuid($input['invitationId']) ? strtolower((string) $input['invitationId']) : '';
            $match = null; foreach (setup_invitations_for_identity($pdo, $key) as $i) if ($wanted !== '' && hash_equals(strtolower((string) $i['id']), $wanted)) $match = $i;
            if (!$match) fail_response(404, 'Invitation not found or expired');
            $pdo->beginTransaction();
            try {
                $lock = $pdo->prepare('SELECT status FROM tenant_invitations WHERE id = ? FOR UPDATE'); $lock->execute([$match['id']]);
                if ($lock->fetchColumn() !== 'pending') { $pdo->rollBack(); fail_response(409, 'This invitation was already used'); }
                $pdo->prepare('INSERT IGNORE INTO tenant_memberships (id, tenant_id, principal_id, role_key, scope_kind, legal_entity_id, location_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
                    ->execute([tenant_uuid(), $match['tenant_id'], $principal['id'], $match['role_key'], $match['scope_kind'], $match['scope_kind'] === 'tenant' ? null : $match['legal_entity_id'], $match['scope_kind'] === 'location' ? $match['location_id'] : null]);
                $pdo->prepare('UPDATE tenant_invitations SET status = "accepted" WHERE id = ?')->execute([$match['id']]);
                tenant_audit($pdo, ['principalId'=>$principal['id'], 'tenant'=>['id'=>$match['tenant_id']], 'company'=>['id'=>$match['legal_entity_id']], 'location'=>['id'=>$match['location_id']]], 'tenant.invitation_accepted', 'invitation', (string) $match['id'], ['role'=>$match['role_key'], 'scope'=>$match['scope_kind']], $key);
                $pdo->commit();
            } catch (Throwable $error) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $error; }
            unset($_SESSION['tenant_context']);
            workspace_json(['accepted'=>true, 'csrf'=>$session['csrf']]);
        }

        $context = tenant_context($pdo, $config, $session, $key);
        $canManage = tenant_can_manage_company($pdo, $context, (string) $context['company']['id']);
        if ($route === '/status' && $method === 'GET') workspace_json(['canManage'=>$canManage, 'csrf'=>$session['csrf']] + setup_status($pdo, $config, $context, $key) + ['banks'=>SETUP_BANKS]);
        if ($method !== 'POST') fail_response(405, 'Method not allowed');
        if (!$canManage) fail_response(403, 'Company administration permission is required');
        setup_require_write($session); $input = tenant_request_body();
        if ($route === '/company') { setup_save_company($pdo, $context, $input, $key); }
        elseif ($route === '/locations') { setup_save_location($pdo, $context, $input, $key); }
        elseif ($route === '/payout') { setup_save_payout($pdo, $context, $input, $key); }
        elseif ($route === '/invitations/revoke') {
            $id = isset($input['id']) && tenant_is_uuid($input['id']) ? strtolower((string) $input['id']) : '';
            $pdo->beginTransaction();
            $done = $pdo->prepare('UPDATE tenant_invitations SET status = "revoked" WHERE id = ? AND tenant_id = ? AND status = "pending" AND (legal_entity_id = ? OR legal_entity_id IS NULL)');
            $done->execute([$id, $context['tenant']['id'], $context['company']['id']]);
            if ($done->rowCount() === 1) tenant_audit($pdo, $context, 'setup.invitation_revoked', 'invitation', $id, [], $key);
            $pdo->commit();
        } else fail_response(404, 'Not found');
        // Every write answers with the fresh checklist so the wizard never shows stale progress.
        workspace_json(['saved'=>true, 'csrf'=>$session['csrf']] + setup_status($pdo, $config, tenant_context($pdo, $config, $session, $key), $key) + ['canManage'=>true, 'banks'=>SETUP_BANKS]);
    } catch (Throwable $error) { if ($pdo->inTransaction()) $pdo->rollBack(); fail_response(503, 'Setup is temporarily unavailable'); }
}
