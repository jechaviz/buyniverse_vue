<?php
declare(strict_types=1);

// Commerce: the company's effective commercial terms, and the award settlement.
// The settlement is the only place Buyniverse's fee is decided. It is written once, by the
// server, from the room's locked start price and the winning bid in the ledger; the browser
// sends nothing but the room reference. Loaded by server/bootstrap.php; routed by index.php.

require_once __DIR__ . '/fee.php';

/**
 * The terms for a company and a currency. Candidates, most specific first: "<tenant>:<CUR>", "<tenant>", "default:<CUR>", "default".
 * A row of the room's own currency wins; if there is none, the first existing row applies by percentages only.
 */
function commerce_terms_for(PDO $pdo, string $tenantId, string $currency = 'MXN'): array {
    $suffix = $currency === 'MXN' ? '' : ':' . $currency;
    $candidates = array_values(array_unique([$tenantId . $suffix, $tenantId, 'default' . $suffix, 'default']));
    $marks = implode(',', array_fill(0, count($candidates), '?'));
    $statement = $pdo->prepare("SELECT * FROM commerce_terms WHERE scope IN ($marks)");
    $statement->execute($candidates);
    $rows = [];
    foreach ($statement->fetchAll() as $row) $rows[(string) $row['scope']] = $row;
    foreach ($candidates as $scope) if (isset($rows[$scope]) && (string) $rows[$scope]['currency'] === $currency) return commerce_normalize_terms($rows[$scope]);
    foreach ($candidates as $scope) if (isset($rows[$scope])) return commerce_normalize_terms($rows[$scope]);
    return commerce_normalize_terms([]);
}

/** The terms in the shape a buyer or the public calculator may see. */
function commerce_public_terms(array $terms): array {
    return [
        'currency' => $terms['currency'], 'ratePercent' => $terms['rate_bps'] / 100, 'bracketRatePercent' => $terms['bracket_rate_bps'] / 100,
        'bracketThresholdCents' => $terms['bracket_threshold_cents'], 'floorPercent' => $terms['floor_bps'] / 100,
        'floorMinCents' => $terms['floor_min_cents'], 'capPercent' => $terms['cap_bps'] / 100, 'mode' => $terms['mode'],
    ];
}

function commerce_settlement_payload(array $row): array {
    return [
        'id' => (string) $row['id'], 'auctionRef' => (string) $row['auction_ref'], 'currency' => (string) $row['currency'],
        'baselineCents' => (int) $row['baseline_cents'], 'awardedCents' => (int) $row['awarded_cents'], 'savingCents' => (int) $row['saving_cents'],
        'feeCents' => (int) $row['fee_cents'], 'floorCents' => (int) $row['floor_cents'], 'capCents' => (int) $row['cap_cents'],
        'status' => (string) $row['status'], 'createdAt' => (string) $row['created_at'],
    ];
}

/** Settles a closed live room for its organiser. Idempotent: a second call returns the stored settlement. */
function commerce_settle_room(PDO $pdo, array $context, string $auctionRef, string $key): array {
    $pdo->beginTransaction();
    $room = auction_realtime_room($pdo, $context, $auctionRef, true);
    if ($room === null) { $pdo->rollBack(); fail_response(404, 'Live room not found'); }
    if ((string) $room['role_key'] !== 'organizer') { $pdo->rollBack(); fail_response(403, 'Only the organiser can settle the award'); }
    $existing = $pdo->prepare('SELECT * FROM award_settlements WHERE room_id = ? LIMIT 1'); $existing->execute([$room['id']]); $stored = $existing->fetch();
    if (is_array($stored)) { $pdo->commit(); return ['created' => false, 'settlement' => commerce_settlement_payload($stored)]; }
    $closed = (string) $room['status'] === 'closed' || strtotime((string) $room['closes_at'] . ' UTC') < time();
    if (!$closed) { $pdo->rollBack(); fail_response(409, 'The room is still open'); }
    $terms = auction_realtime_terms($pdo, (string) $room['id'], true);
    if ($terms === null || (int) $terms['bid_count'] < 1) { $pdo->rollBack(); fail_response(409, 'There is no winning bid to settle'); }

    $tenantId = (string) $context['tenant']['id'];
    $effective = commerce_terms_for($pdo, $tenantId, (string) $terms['currency']);
    $currency = (string) $terms['currency'];
    $trailing = $pdo->prepare('SELECT COALESCE(SUM(saving_cents), 0) FROM award_settlements WHERE tenant_id = ? AND currency = ? AND created_at >= (CURRENT_TIMESTAMP - INTERVAL 12 MONTH)');
    $trailing->execute([$tenantId, $currency]); $trailingSaving = (int) $trailing->fetchColumn();

    $baseline = (int) $terms['start_cents']; $awarded = (int) $terms['best_cents'];
    $fee = commerce_compute_fee($baseline, $awarded, $trailingSaving, $effective, $currency);
    $id = tenant_uuid();
    $status = $effective['mode'] === 'charging' ? 'pending' : 'informative';
    $snapshot = json_encode(['terms' => $effective, 'roomCurrency' => $currency, 'basis' => $fee['basis']], JSON_UNESCAPED_SLASHES);
    $pdo->prepare('INSERT INTO award_settlements (id, tenant_id, legal_entity_id, room_id, auction_ref, winner_principal_id, currency, baseline_cents, awarded_cents, saving_cents,
        trailing_saving_cents, ratio_fee_cents, floor_cents, cap_cents, fee_cents, terms_json, terms_hash, status, settled_by_principal_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        ->execute([$id, $tenantId, $room['legal_entity_id'], $room['id'], $auctionRef, $terms['leader_principal_id'], $currency, $baseline, $awarded, $fee['savingCents'],
            $trailingSaving, $fee['ratioFeeCents'], $fee['floorCents'], $fee['capCents'], $fee['feeCents'], $snapshot, commerce_terms_hash($effective, $currency), $status, $context['principalId']]);
    tenant_audit($pdo, $context, 'commerce.award_settled', 'award_settlement', $id,
        ['auctionRef' => $auctionRef, 'savingCents' => $fee['savingCents'], 'feeCents' => $fee['feeCents'], 'basis' => $fee['basis'], 'status' => $status], $key);
    $row = $pdo->prepare('SELECT * FROM award_settlements WHERE id = ?'); $row->execute([$id]);
    $payload = commerce_settlement_payload($row->fetch()); $payload['basis'] = $fee['basis'];
    $pdo->commit();
    return ['created' => true, 'settlement' => $payload];
}

function handle_commerce(string $uri): void {
    $config = workspace_config(); $session = workspace_session();
    $route = rtrim(substr($uri, strlen('/api/v1/commerce')), '/');
    if (!tenant_has_authenticated_principal($config)) fail_response(401, 'Sign in to continue');
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if (!in_array($method, ['GET', 'POST'], true)) fail_response(405, 'Method not allowed');
    if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 4096) fail_response(413, 'Request body too large');
    $pdo = workspace_pdo($config); $key = workspace_key($config);
    try {
        $context = tenant_context($pdo, $config, $session, $key);
        if ($route === '/terms' && $method === 'GET') {
            workspace_json(['terms' => commerce_public_terms(commerce_terms_for($pdo, (string) $context['tenant']['id'])), 'csrf' => $session['csrf']]);
        }
        if ($route === '/settlements' && $method === 'GET') {
            tenant_require_permission($context, 'manageCompany');
            $list = $pdo->prepare('SELECT * FROM award_settlements WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 100'); $list->execute([$context['tenant']['id']]);
            workspace_json(['settlements' => array_map('commerce_settlement_payload', $list->fetchAll()), 'csrf' => $session['csrf']]);
        }
        if ($route === '/settle' && $method === 'POST') {
            auction_realtime_require_write($session); tenant_require_permission($context, 'manageCompany');
            $input = tenant_request_body(); $auctionRef = auction_room_ref($input['auctionRef'] ?? '');
            $result = commerce_settle_room($pdo, $context, $auctionRef, $key);
            workspace_json($result + ['csrf' => $session['csrf']]);
        }
        fail_response(404, 'Not found');
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        fail_response(503, 'Commerce is temporarily unavailable');
    }
}
