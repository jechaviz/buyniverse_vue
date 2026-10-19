<?php
declare(strict_types=1);

// Sealed-bid RFQ. The server keeps the budget (fixed when the RFQ opens), the quotes (append-only, sealed from
// the organiser until the RFQ closes) and the award, and settles Buyniverse's fee with the same rule as a live auction.
// The baseline of an RFQ is the higher of the budget and the market: the median of the suppliers' latest quotes, so
// declaring a low budget cannot hide a saving that the quotes themselves show.
// Loaded by server/bootstrap.php; routed by index.php.

function rfq_require_write(array $session): void {
    if (!tenant_header_origin_is_safe() || !hash_equals($session['csrf'], workspace_header('X-Buyniverse-CSRF')) || workspace_header('X-Buyniverse-Request') !== 'rfq-v1')
        fail_response(403, 'Request verification failed');
    $lastWrite = (float) ($_SESSION['rfq_last_write'] ?? 0);
    if (microtime(true) - $lastWrite < 0.30) fail_response(429, 'Please wait before sending another request');
    $_SESSION['rfq_last_write'] = microtime(true);
}

/** The RFQ a person takes part in, with their role. */
function rfq_event_for(PDO $pdo, array $context, string $ref, bool $lock = false): ?array {
    $sql = 'SELECT e.*, p.role_key FROM rfq_events e INNER JOIN rfq_participants p ON p.event_id = e.id WHERE e.tenant_id = ? AND e.event_ref = ? AND p.principal_id = ? LIMIT 1' . ($lock ? ' FOR UPDATE' : '');
    $statement = $pdo->prepare($sql); $statement->execute([$context['tenant']['id'], $ref, $context['principalId']]);
    $row = $statement->fetch();
    return is_array($row) ? $row : null;
}

function rfq_is_closed(array $event): bool {
    return (string) $event['status'] !== 'open' || strtotime((string) $event['closes_at'] . ' UTC') < time();
}

/** Latest quote of each supplier: [principalId => row]. */
function rfq_latest_quotes(PDO $pdo, string $eventId): array {
    $statement = $pdo->prepare('SELECT q.* FROM rfq_quotes q INNER JOIN (SELECT supplier_principal_id, MAX(id) AS last_id FROM rfq_quotes WHERE event_id = ? GROUP BY supplier_principal_id) l ON l.last_id = q.id');
    $statement->execute([$eventId]);
    $out = [];
    foreach ($statement->fetchAll() as $row) $out[strtolower((string) $row['supplier_principal_id'])] = $row;
    return $out;
}

/** Median of integer amounts (the mean of the two middle ones, rounded down, for an even count). */
function rfq_median(array $amounts): ?int {
    $n = count($amounts);
    if ($n === 0) return null;
    sort($amounts);
    return $n % 2 === 1 ? (int) $amounts[intdiv($n, 2)] : intdiv((int) $amounts[$n / 2 - 1] + (int) $amounts[$n / 2], 2);
}

function rfq_quote_payload(array $row, bool $withSupplier = false, string $name = ''): array {
    $out = ['amountCents' => (int) $row['amount_cents'], 'leadDays' => (int) $row['lead_days'], 'terms' => (string) $row['terms'], 'at' => (string) $row['created_at']];
    if ($withSupplier) { $out['supplierId'] = (string) $row['supplier_principal_id']; $out['supplierName'] = $name; }
    return $out;
}

function handle_rfq(string $uri): void {
    $config = workspace_config(); $session = workspace_session();
    $route = rtrim(substr($uri, strlen('/api/v1/rfq')), '/');
    if (!tenant_has_authenticated_principal($config)) fail_response(401, 'Sign in to continue');
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if (!in_array($method, ['GET', 'POST'], true)) fail_response(405, 'Method not allowed');
    if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 8192) fail_response(413, 'Request body too large');
    $pdo = workspace_pdo($config); $key = workspace_key($config);
    try {
        $context = tenant_context($pdo, $config, $session, $key);

        if ($route === '/events' && $method === 'POST') {
            rfq_require_write($session); tenant_require_permission($context, 'manageCompany');
            $input = tenant_request_body(); $ref = auction_room_ref($input['eventRef'] ?? '');
            $ids = [];
            foreach (is_array($input['participantPrincipalIds'] ?? null) ? $input['participantPrincipalIds'] : [] as $id) if (tenant_is_uuid($id)) $ids[strtolower($id)] = true;
            $ids = array_keys($ids);
            $budget = auction_amount_cents($input['budget'] ?? null);
            if ($ref === '' || count($ids) < 2 || count($ids) > 50 || $budget === null) fail_response(400, 'A valid RFQ, a budget and two to fifty invited suppliers are required');
            $currency = strtoupper(tenant_text($input['currency'] ?? 'MXN', 3)); if (preg_match('/^[A-Z]{3}$/', $currency) !== 1) $currency = 'MXN';
            $requested = strtotime((string) ($input['closesAt'] ?? ''));
            $closeAt = gmdate('Y-m-d H:i:s', min(time() + 90 * 86400, max(time() + 60, $requested === false ? time() + 7 * 86400 : $requested)));
            $pdo->beginTransaction();
            $existing = $pdo->prepare('SELECT id, owner_principal_id, closes_at FROM rfq_events WHERE tenant_id = ? AND legal_entity_id = ? AND event_ref = ? LIMIT 1 FOR UPDATE');
            $existing->execute([$context['tenant']['id'], $context['company']['id'], $ref]); $found = $existing->fetch();
            if (is_array($found)) {
                if (!hash_equals((string) $found['owner_principal_id'], (string) $context['principalId'])) { $pdo->rollBack(); fail_response(409, 'This RFQ belongs to another organiser'); }
                $pdo->commit(); workspace_json(['eventId' => (string) $found['id'], 'eventRef' => $ref, 'created' => false, 'csrf' => $session['csrf']]);
            }
            $marks = implode(',', array_fill(0, count($ids), '?'));
            $members = $pdo->prepare('SELECT DISTINCT principal_id FROM tenant_memberships WHERE tenant_id = ? AND principal_id IN (' . $marks . ') AND role_key = "supplier" AND status = "active"');
            $members->execute(array_merge([$context['tenant']['id']], $ids));
            if (count($members->fetchAll()) !== count($ids)) { $pdo->rollBack(); fail_response(403, 'Each invited supplier must be an active supplier in this tenant'); }
            $eventId = tenant_uuid();
            $pdo->prepare('INSERT INTO rfq_events (id, tenant_id, legal_entity_id, event_ref, owner_principal_id, currency, budget_cents, closes_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
                ->execute([$eventId, $context['tenant']['id'], $context['company']['id'], $ref, $context['principalId'], $currency, $budget, $closeAt]);
            $part = $pdo->prepare('INSERT INTO rfq_participants (event_id, principal_id, role_key) VALUES (?, ?, ?)');
            $part->execute([$eventId, $context['principalId'], 'organizer']);
            foreach ($ids as $id) $part->execute([$eventId, $id, 'supplier']);
            tenant_audit($pdo, $context, 'rfq.opened', 'rfq_event', $eventId, ['eventRef' => $ref, 'budgetCents' => $budget, 'currency' => $currency, 'suppliers' => count($ids), 'closesAt' => $closeAt], $key);
            $pdo->commit();
            workspace_json(['eventId' => $eventId, 'eventRef' => $ref, 'created' => true, 'closesAt' => gmdate('c', strtotime($closeAt . ' UTC')), 'csrf' => $session['csrf']]);
        }

        if (preg_match('#^/events/([A-Za-z0-9][A-Za-z0-9._-]{0,119})/(state|quotes|close|award)$#', $route, $m) !== 1) fail_response(404, 'Not found');
        [$ref, $action] = [$m[1], $m[2]];

        if ($action === 'state' && $method === 'GET') {
            $event = rfq_event_for($pdo, $context, $ref);
            if ($event === null) fail_response(404, 'RFQ not found');
            $organizer = (string) $event['role_key'] === 'organizer';
            $payload = ['eventRef' => $ref, 'role' => (string) $event['role_key'], 'status' => (string) $event['status'], 'closed' => rfq_is_closed($event),
                'closesAt' => gmdate('c', strtotime((string) $event['closes_at'] . ' UTC')), 'currency' => (string) $event['currency'], 'csrf' => $session['csrf']];
            $latest = rfq_latest_quotes($pdo, (string) $event['id']);
            if ($organizer) { $payload['budgetCents'] = (int) $event['budget_cents']; $payload['quoteCount'] = count($latest); }   // how many, never what, until it closes
            else { $mine = $latest[strtolower((string) $context['principalId'])] ?? null; $payload['myQuote'] = $mine ? rfq_quote_payload($mine) : null; }
            workspace_json($payload);
        }

        if ($action === 'quotes' && $method === 'POST') {
            rfq_require_write($session);
            $input = tenant_request_body();
            $amount = auction_amount_cents($input['amount'] ?? null);
            $lead = (int) ($input['leadDays'] ?? 0); $terms = tenant_text($input['terms'] ?? '', 80); $quoteKey = tenant_text($input['quoteKey'] ?? '', 96);
            if ($amount === null || $lead < 1 || $lead > 3650 || $terms === '' || preg_match('/^[A-Za-z0-9._-]{8,96}$/', $quoteKey) !== 1) fail_response(400, 'An amount, lead days, terms and a quote key are required');
            $pdo->beginTransaction();
            $event = rfq_event_for($pdo, $context, $ref, true);
            if ($event === null) { $pdo->rollBack(); fail_response(404, 'RFQ not found'); }
            if ((string) $event['role_key'] !== 'supplier') { $pdo->rollBack(); fail_response(403, 'Only an invited supplier can quote'); }
            if (rfq_is_closed($event)) { $pdo->rollBack(); fail_response(409, 'The RFQ is closed'); }
            $write = $pdo->prepare('INSERT IGNORE INTO rfq_quotes (event_id, supplier_principal_id, amount_cents, lead_days, terms, quote_key) VALUES (?, ?, ?, ?, ?, ?)');
            $write->execute([$event['id'], $context['principalId'], $amount, $lead, $terms, $quoteKey]);
            $duplicate = $write->rowCount() === 0;
            if (!$duplicate) tenant_audit($pdo, $context, 'rfq.quote_submitted', 'rfq_event', (string) $event['id'], ['eventRef' => $ref], $key);   // the amount stays out of the shared audit chain
            $latest = rfq_latest_quotes($pdo, (string) $event['id']); $mine = $latest[strtolower((string) $context['principalId'])];
            $pdo->commit();
            workspace_json(['accepted' => true, 'duplicate' => $duplicate, 'myQuote' => rfq_quote_payload($mine), 'csrf' => $session['csrf']]);
        }

        if ($action === 'quotes' && $method === 'GET') {
            $event = rfq_event_for($pdo, $context, $ref);
            if ($event === null) fail_response(404, 'RFQ not found');
            $latest = rfq_latest_quotes($pdo, (string) $event['id']);
            if ((string) $event['role_key'] !== 'organizer') {
                $mine = $latest[strtolower((string) $context['principalId'])] ?? null;
                workspace_json(['quotes' => $mine ? [rfq_quote_payload($mine)] : [], 'csrf' => $session['csrf']]);
            }
            if (!rfq_is_closed($event)) fail_response(409, 'Quotes are sealed until the RFQ closes');
            $names = $pdo->prepare('SELECT id, display_name FROM tenant_principals WHERE id IN (' . implode(',', array_fill(0, max(1, count($latest)), '?')) . ')');
            $names->execute($latest ? array_keys($latest) : ['none']);
            $byId = []; foreach ($names->fetchAll() as $n) $byId[strtolower((string) $n['id'])] = (string) $n['display_name'];
            $list = []; foreach ($latest as $id => $row) $list[] = rfq_quote_payload($row, true, $byId[$id] ?? '');
            usort($list, static fn($a, $b) => $a['amountCents'] <=> $b['amountCents']);
            workspace_json(['quotes' => $list, 'csrf' => $session['csrf']]);
        }

        if ($action === 'close' && $method === 'POST') {
            rfq_require_write($session); tenant_require_permission($context, 'manageCompany');
            $pdo->beginTransaction();
            $event = rfq_event_for($pdo, $context, $ref, true);
            if ($event === null) { $pdo->rollBack(); fail_response(404, 'RFQ not found'); }
            if ((string) $event['role_key'] !== 'organizer') { $pdo->rollBack(); fail_response(403, 'Only the organiser can close the RFQ'); }
            if ((string) $event['status'] === 'open') {
                $pdo->prepare('UPDATE rfq_events SET status = "closed" WHERE id = ?')->execute([$event['id']]);
                tenant_audit($pdo, $context, 'rfq.closed', 'rfq_event', (string) $event['id'], ['eventRef' => $ref], $key);
            }
            $pdo->commit();
            workspace_json(['status' => (string) $event['status'] === 'open' ? 'closed' : (string) $event['status'], 'csrf' => $session['csrf']]);
        }

        if ($action === 'award' && $method === 'POST') {
            rfq_require_write($session); tenant_require_permission($context, 'manageCompany');
            $input = tenant_request_body(); $winner = strtolower((string) ($input['supplierPrincipalId'] ?? ''));
            if (!tenant_is_uuid($winner)) fail_response(400, 'Choose the supplier to award');
            $pdo->beginTransaction();
            $event = rfq_event_for($pdo, $context, $ref, true);
            if ($event === null) { $pdo->rollBack(); fail_response(404, 'RFQ not found'); }
            if ((string) $event['role_key'] !== 'organizer') { $pdo->rollBack(); fail_response(403, 'Only the organiser can award'); }
            $stored = commerce_stored_settlement($pdo, (string) $event['id']);
            if ($stored !== null) {
                $same = hash_equals(strtolower((string) $event['awarded_principal_id']), $winner);
                $pdo->commit();
                if (!$same) fail_response(409, 'This RFQ was already awarded to another supplier');
                workspace_json(['created' => false, 'settlement' => $stored, 'csrf' => $session['csrf']]);
            }
            if (!rfq_is_closed($event)) { $pdo->rollBack(); fail_response(409, 'Close the RFQ before awarding it'); }
            $latest = rfq_latest_quotes($pdo, (string) $event['id']);
            if (!isset($latest[$winner])) { $pdo->rollBack(); fail_response(409, 'That supplier has no quote to award'); }
            $amounts = array_map(static fn($r) => (int) $r['amount_cents'], array_values($latest));
            $market = count($amounts) >= 2 ? rfq_median($amounts) : null;
            $budget = (int) $event['budget_cents'];
            $useMarket = $market !== null && $market > $budget;
            $payload = commerce_insert_settlement($pdo, $context, $key, [
                'tenantId' => (string) $context['tenant']['id'], 'entityId' => $event['legal_entity_id'], 'sourceId' => $event['id'], 'ref' => $ref,
                'winnerPrincipalId' => $winner, 'currency' => (string) $event['currency'], 'baselineCents' => $useMarket ? $market : $budget,
                'awardedCents' => (int) $latest[$winner]['amount_cents'], 'kind' => 'rfq', 'baselineSource' => $useMarket ? 'market' : 'budget',
                'quotesCounted' => count($amounts), 'marketCents' => $market,
            ]);
            $pdo->prepare('UPDATE rfq_events SET status = "awarded", awarded_principal_id = ? WHERE id = ?')->execute([$winner, $event['id']]);
            $pdo->commit();
            workspace_json(['created' => true, 'settlement' => $payload, 'csrf' => $session['csrf']]);
        }
        fail_response(404, 'Not found');
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        fail_response(503, 'RFQ is temporarily unavailable');
    }
}
