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

/**
 * Writes one settlement, once. $p: tenantId, entityId, sourceId (the room or RFQ id, unique), ref, winnerPrincipalId, currency,
 * baselineCents, awardedCents, kind ('auction'|'rfq'), baselineSource, quotesCounted, marketCents. Must run inside the caller's transaction.
 */
function commerce_insert_settlement(PDO $pdo, array $context, string $key, array $p): array {
    $effective = commerce_terms_for($pdo, $p['tenantId'], $p['currency']);
    $trailing = $pdo->prepare('SELECT COALESCE(SUM(saving_cents), 0) FROM award_settlements WHERE tenant_id = ? AND currency = ? AND created_at >= (CURRENT_TIMESTAMP - INTERVAL 12 MONTH)');
    $trailing->execute([$p['tenantId'], $p['currency']]); $trailingSaving = (int) $trailing->fetchColumn();
    $fee = commerce_compute_fee($p['baselineCents'], $p['awardedCents'], $trailingSaving, $effective, $p['currency']);
    $id = tenant_uuid();
    $status = $effective['mode'] === 'charging' ? 'pending' : 'informative';
    $snapshot = json_encode(['terms' => $effective, 'roomCurrency' => $p['currency'], 'basis' => $fee['basis'], 'kind' => $p['kind'], 'baselineSource' => $p['baselineSource']], JSON_UNESCAPED_SLASHES);
    $pdo->prepare('INSERT INTO award_settlements (id, tenant_id, legal_entity_id, room_id, auction_ref, winner_principal_id, currency, baseline_cents, awarded_cents, saving_cents,
        trailing_saving_cents, ratio_fee_cents, floor_cents, cap_cents, fee_cents, terms_json, terms_hash, status, settled_by_principal_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        ->execute([$id, $p['tenantId'], $p['entityId'], $p['sourceId'], $p['ref'], $p['winnerPrincipalId'], $p['currency'], $p['baselineCents'], $p['awardedCents'], $fee['savingCents'],
            $trailingSaving, $fee['ratioFeeCents'], $fee['floorCents'], $fee['capCents'], $fee['feeCents'], $snapshot, commerce_terms_hash($effective, $p['currency']), $status, $context['principalId']]);
    $pdo->prepare('INSERT INTO award_settlement_meta (settlement_id, kind, baseline_source, quotes_counted, market_cents) VALUES (?, ?, ?, ?, ?)')
        ->execute([$id, $p['kind'], $p['baselineSource'], (int) ($p['quotesCounted'] ?? 0), $p['marketCents'] ?? null]);
    tenant_audit($pdo, $context, 'commerce.award_settled', 'award_settlement', $id,
        ['ref' => $p['ref'], 'kind' => $p['kind'], 'baselineSource' => $p['baselineSource'], 'savingCents' => $fee['savingCents'], 'feeCents' => $fee['feeCents'], 'basis' => $fee['basis'], 'status' => $status], $key);
    $row = $pdo->prepare('SELECT * FROM award_settlements WHERE id = ?'); $row->execute([$id]);
    $payload = commerce_settlement_payload($row->fetch());
    $payload['basis'] = $fee['basis']; $payload['kind'] = $p['kind']; $payload['baselineSource'] = $p['baselineSource'];
    return $payload;
}

/** The stored settlement for a room or RFQ, if one was already written. */
function commerce_stored_settlement(PDO $pdo, string $sourceId): ?array {
    $existing = $pdo->prepare('SELECT s.*, m.kind, m.baseline_source FROM award_settlements s LEFT JOIN award_settlement_meta m ON m.settlement_id = s.id WHERE s.room_id = ? LIMIT 1');
    $existing->execute([$sourceId]); $row = $existing->fetch();
    if (!is_array($row)) return null;
    $payload = commerce_settlement_payload($row);
    $payload['kind'] = (string) ($row['kind'] ?? 'auction'); $payload['baselineSource'] = (string) ($row['baseline_source'] ?? 'start_price');
    return $payload;
}

/** Settles a closed live room for its organiser. Idempotent: a second call returns the stored settlement. */
function commerce_settle_room(PDO $pdo, array $context, string $auctionRef, string $key): array {
    $pdo->beginTransaction();
    $room = auction_realtime_room($pdo, $context, $auctionRef, true);
    if ($room === null) { $pdo->rollBack(); fail_response(404, 'Live room not found'); }
    if ((string) $room['role_key'] !== 'organizer') { $pdo->rollBack(); fail_response(403, 'Only the organiser can settle the award'); }
    $stored = commerce_stored_settlement($pdo, (string) $room['id']);
    if ($stored !== null) { $pdo->commit(); return ['created' => false, 'settlement' => $stored]; }
    $closed = (string) $room['status'] === 'closed' || strtotime((string) $room['closes_at'] . ' UTC') < time();
    if (!$closed) { $pdo->rollBack(); fail_response(409, 'The room is still open'); }
    $terms = auction_realtime_terms($pdo, (string) $room['id'], true);
    if ($terms === null || (int) $terms['bid_count'] < 1) { $pdo->rollBack(); fail_response(409, 'There is no winning bid to settle'); }

    // The baseline is the higher of the locked start price and the budget the organiser declared when opening the room.
    $declared = $pdo->prepare('SELECT budget_cents FROM auction_live_budget WHERE room_id = ?'); $declared->execute([$room['id']]); $budget = $declared->fetchColumn();
    $start = (int) $terms['start_cents'];
    // A bidding round that follows an RFQ also has the market of that RFQ: the median of every supplier's proposal.
    $link = $pdo->prepare('SELECT event_id, market_cents, proposals_counted FROM auction_live_rfq WHERE room_id = ?'); $link->execute([$room['id']]); $contest = $link->fetch();
    $market = is_array($contest) && $contest['market_cents'] !== null ? (int) $contest['market_cents'] : null;
    $baseline = $start; $source = 'start_price';
    if ($budget !== false && (int) $budget > $baseline) { $baseline = (int) $budget; $source = 'budget'; }
    if ($market !== null && $market > $baseline) { $baseline = $market; $source = 'market'; }
    $payload = commerce_insert_settlement($pdo, $context, $key, [
        'tenantId' => (string) $context['tenant']['id'], 'entityId' => $room['legal_entity_id'], 'sourceId' => $room['id'], 'ref' => $auctionRef,
        'winnerPrincipalId' => $terms['leader_principal_id'], 'currency' => (string) $terms['currency'],
        'baselineCents' => $baseline, 'awardedCents' => (int) $terms['best_cents'],
        'kind' => 'auction', 'baselineSource' => $source,
        'quotesCounted' => is_array($contest) ? (int) $contest['proposals_counted'] : 0, 'marketCents' => $market,
    ]);
    if (is_array($contest)) $pdo->prepare('UPDATE rfq_events SET status = "awarded", awarded_principal_id = ? WHERE id = ?')->execute([$terms['leader_principal_id'], $contest['event_id']]);
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
            $list = $pdo->prepare('SELECT s.*, m.kind, m.baseline_source FROM award_settlements s LEFT JOIN award_settlement_meta m ON m.settlement_id = s.id WHERE s.tenant_id = ? ORDER BY s.created_at DESC LIMIT 100'); $list->execute([$context['tenant']['id']]);
            workspace_json(['settlements' => array_map(static fn($r) => commerce_settlement_payload($r) + ['kind' => (string) ($r['kind'] ?? 'auction'), 'baselineSource' => (string) ($r['baseline_source'] ?? 'start_price')], $list->fetchAll()), 'csrf' => $session['csrf']]);
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
