<?php
declare(strict_types=1);

// Live-auction channel and bid ledger
// ---------------------------------------------------------------------------
// This channel is intentionally separate from the encrypted per-user workspace
// document: a workspace is a private copy, never a shared bid ledger. Two
// things live here. (1) Activity signals, which carry no prices. (2) The bid
// ledger, the single authoritative record of an auction: the server validates
// every bid against the room's terms (step, floor, window, anti-sniping) and
// appends it to an immutable table. Rivals never receive another bidder's
// identity; they learn only the current best price they must beat.
function auction_room_ref($value): string {
    $room = tenant_text($value, 120);
    return preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/', $room) === 1 ? $room : '';
}
function auction_event_key($value): string {
    $key = tenant_text($value, 80);
    return preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]{7,79}$/', $key) === 1 ? $key : '';
}
const AUCTION_MAX_CENTS = 999999999999; // 9,999,999,999.99
/** Money arrives as a decimal string or number and is held as integer cents. */
function auction_amount_cents($value, bool $allowZero = false): ?int {
    if (is_float($value)) {
        if (!is_finite($value) || $value < 0) return null;
        $cents = (int) round($value * 100);
        if (abs($value * 100 - $cents) > 0.0001) return null;
    } elseif (is_int($value) || is_string($value)) {
        $text = trim((string) $value);
        if (preg_match('/^(\d{1,10})(?:\.(\d{1,2}))?$/', $text, $m) !== 1) return null;
        $cents = (int) $m[1] * 100 + (int) str_pad($m[2] ?? '', 2, '0');
    } else return null;
    if ($cents > AUCTION_MAX_CENTS || ($cents === 0 && !$allowZero)) return null;
    return $cents;
}
function auction_money(int $cents): string { return sprintf('%d.%02d', intdiv($cents, 100), $cents % 100); }
function auction_iso(string $utc): string { $t = strtotime($utc . ' UTC'); return gmdate('c', $t === false ? time() : $t); }
function auction_realtime_terms(PDO $pdo, string $roomId, bool $lock = false): ?array {
    $statement = $pdo->prepare('SELECT * FROM auction_live_terms WHERE room_id = ? LIMIT 1' . ($lock ? ' FOR UPDATE' : ''));
    $statement->execute([$roomId]);
    $row = $statement->fetch();
    return is_array($row) ? $row : null;
}
/** Fans an activity signal out to every active participant (never a price). */
function auction_dispatch_activity(PDO $pdo, array $room, string $actorId, string $type, string $eventKey, bool $extended): array {
    $recipients = $pdo->prepare('SELECT principal_id, role_key FROM auction_live_participants WHERE room_id = ? AND status = "active"');
    $recipients->execute([$room['id']]); $rows = $recipients->fetchAll();
    $insert = $pdo->prepare('INSERT IGNORE INTO auction_live_events (room_id, recipient_principal_id, actor_principal_id, event_type, event_key) VALUES (?, ?, ?, ?, ?)');
    $affected = 0;
    foreach ($rows as $recipient) {
        $recipientId = (string) $recipient['principal_id'];
        if ($type === 'bid_activity') {
            $deliveryType = hash_equals($recipientId, $actorId) ? 'offer_recorded' : ((string) $recipient['role_key'] === 'organizer' ? 'bid_received' : 'competitive_offer');
        } else $deliveryType = $type;
        auction_realtime_event($insert, (string) $room['id'], $recipientId, $actorId, $deliveryType, $eventKey);
        $affected += $insert->rowCount();
    }
    if ($type === 'bid_activity' && $extended) foreach ($rows as $recipient) {
        auction_realtime_event($insert, (string) $room['id'], (string) $recipient['principal_id'], $actorId, 'auction_extended', $eventKey . '.extend');
        $affected += $insert->rowCount();
    }
    return ['affected'=>$affected, 'recipients'=>count($rows)];
}
function auction_realtime_require_write(array $session): void {
    if (!tenant_header_origin_is_safe() || !hash_equals($session['csrf'], workspace_header('X-Buyniverse-CSRF')) || workspace_header('X-Buyniverse-Request') !== 'auction-realtime-v1')
        fail_response(403, 'Request verification failed');
    $lastWrite = (float) ($_SESSION['auction_realtime_last_write'] ?? 0);
    if (microtime(true) - $lastWrite < 0.30) fail_response(429, 'Please wait before sending another live signal');
    $_SESSION['auction_realtime_last_write'] = microtime(true);
}
function auction_realtime_room(PDO $pdo, array $context, string $auctionRef, bool $lock = false): ?array {
    $sql = 'SELECT r.id, r.tenant_id, r.legal_entity_id, r.location_id, r.auction_ref, r.owner_principal_id, r.status, r.closes_at, p.role_key '
        . 'FROM auction_live_rooms r INNER JOIN auction_live_participants p ON p.room_id = r.id '
        . 'WHERE r.tenant_id = ? AND r.auction_ref = ? AND p.principal_id = ? AND p.status = "active" LIMIT 1';
    if ($lock) $sql .= ' FOR UPDATE';
    $statement = $pdo->prepare($sql);
    $statement->execute([$context['tenant']['id'], $auctionRef, $context['principalId']]);
    $row = $statement->fetch();
    return is_array($row) ? $row : null;
}
function auction_realtime_event(PDOStatement $write, string $roomId, string $recipientId, ?string $actorId, string $type, string $eventKey): void {
    $write->execute([$roomId, $recipientId, $actorId, $type, $eventKey]);
}


function auction_state_payload(PDO $pdo, array $room, array $terms, string $principalId, string $csrf): array {
    $role = (string) $room['role_key']; $organizer = $role === 'organizer';
    $payload = [
        'auctionRef'=>(string) $room['auction_ref'], 'role'=>$role, 'status'=>(string) $room['status'],
        'closesAt'=>auction_iso((string) $room['closes_at']), 'currency'=>(string) $terms['currency'],
        'bestAmount'=>auction_money((int) $terms['best_cents']), 'minStep'=>auction_money((int) $terms['min_step_cents']),
        'bidCount'=>(int) $terms['bid_count'], 'extensionCount'=>(int) $terms['extension_count'], 'maxExtensions'=>(int) $terms['max_extensions'],
        'leading'=>$terms['leader_principal_id'] !== null && hash_equals((string) $terms['leader_principal_id'], $principalId), 'csrf'=>$csrf,
    ];
    // The reserve price is the organizer's alone.
    if ($organizer) { $payload['floor'] = auction_money((int) $terms['floor_cents']); $payload['startAmount'] = auction_money((int) $terms['start_cents']); }
    return $payload;
}

function handle_auction_realtime(string $uri, array $config, array $session, PDO $pdo, string $key): void {
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 16384) fail_response(413, 'Request body too large');
    try {
        $context = tenant_context($pdo, $config, $session, $key);
        if ($uri === '/api/v1/auction-realtime/session' || $uri === '/api/v1/auction-realtime/session/') {
            if ($method !== 'GET') fail_response(405, 'Method not allowed');
            workspace_json(['csrf'=>$session['csrf'], 'transport'=>'polling']);
        }

        if ($uri === '/api/v1/auction-realtime/rooms' || $uri === '/api/v1/auction-realtime/rooms/') {
            if ($method !== 'POST') fail_response(405, 'Method not allowed');
            auction_realtime_require_write($session); tenant_require_permission($context, 'manageCompany');
            $input = tenant_request_body(); $auctionRef = auction_room_ref($input['auctionRef'] ?? '');
            $principalIds = [];
            foreach (is_array($input['participantPrincipalIds'] ?? null) ? $input['participantPrincipalIds'] : [] as $principalId) {
                if (tenant_is_uuid($principalId)) $principalIds[strtolower($principalId)] = true;
            }
            $principalIds = array_keys($principalIds);
            if ($auctionRef === '' || count($principalIds) < 2 || count($principalIds) > 50) fail_response(400, 'A valid auction and two to fifty invited suppliers are required');
            // The terms are what makes the ledger authoritative: they are fixed
            // here by the organizer and enforced on every bid.
            $start = auction_amount_cents($input['startAmount'] ?? null);
            $floor = isset($input['floor']) && $input['floor'] !== '' && $input['floor'] !== 0 ? auction_amount_cents($input['floor']) : 0;
            $step = auction_amount_cents($input['minStep'] ?? 1);
            if ($start === null || $floor === null || $step === null || $floor > $start) fail_response(400, 'A valid start price, floor and minimum step are required');
            $step = max(100, $step);
            $currency = strtoupper(tenant_text($input['currency'] ?? 'MXN', 3)); if (preg_match('/^[A-Z]{3}$/', $currency) !== 1) $currency = 'MXN';
            $autoExtend = ($input['autoExtend'] ?? true) !== false ? 1 : 0;
            $antiSniping = max(5, min(600, (int) ($input['antiSnipingSeconds'] ?? 60)));
            $maxExtensions = max(0, min(20, (int) ($input['maxExtensions'] ?? 5)));
            $requestedClose = strtotime((string) ($input['closesAt'] ?? ''));
            $minClose = time() + 60; $maxClose = time() + 45 * 86400;
            $closeAt = gmdate('Y-m-d H:i:s', min($maxClose, max($minClose, $requestedClose === false ? time() + 7200 : $requestedClose)));
            $pdo->beginTransaction();
            $existing = $pdo->prepare('SELECT id, owner_principal_id, closes_at FROM auction_live_rooms WHERE tenant_id = ? AND legal_entity_id = ? AND auction_ref = ? LIMIT 1 FOR UPDATE');
            $existing->execute([$context['tenant']['id'], $context['company']['id'], $auctionRef]); $room = $existing->fetch();
            $termsWrite = $pdo->prepare('INSERT IGNORE INTO auction_live_terms (room_id, currency, start_cents, min_step_cents, floor_cents, best_cents, auto_extend, anti_sniping_seconds, extension_seconds, max_extensions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 60, ?)');
            if ($room) {
                if (!hash_equals((string) $room['owner_principal_id'], (string) $context['principalId'])) { $pdo->rollBack(); fail_response(409, 'Live room is owned by another organizer'); }
                // A room opened before the ledger existed gains its terms once; they never change afterwards.
                $termsWrite->execute([$room['id'], $currency, $start, $step, $floor, $start, $autoExtend, $antiSniping, $maxExtensions]);
                $pdo->commit(); workspace_json(['roomId'=>(string)$room['id'], 'auctionRef'=>$auctionRef, 'closesAt'=>auction_iso((string)$room['closes_at']), 'created'=>false, 'csrf'=>$session['csrf']]);
            }
            $placeholders = implode(',', array_fill(0, count($principalIds), '?'));
            $memberships = $pdo->prepare('SELECT DISTINCT principal_id FROM tenant_memberships WHERE tenant_id = ? AND principal_id IN (' . $placeholders . ') AND role_key = "supplier" AND status = "active"');
            $memberships->execute(array_merge([$context['tenant']['id']], $principalIds));
            $allowed = array_fill_keys(array_map(static fn($row) => strtolower((string)$row['principal_id']), $memberships->fetchAll()), true);
            if (count($allowed) !== count($principalIds)) { $pdo->rollBack(); fail_response(403, 'Each invited supplier must be an active supplier in this tenant'); }
            $roomId = tenant_uuid();
            $pdo->prepare('INSERT INTO auction_live_rooms (id, tenant_id, legal_entity_id, location_id, auction_ref, owner_principal_id, closes_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
                ->execute([$roomId, $context['tenant']['id'], $context['company']['id'], $context['location']['id'] ?? null, $auctionRef, $context['principalId'], $closeAt]);
            $termsWrite->execute([$roomId, $currency, $start, $step, $floor, $start, $autoExtend, $antiSniping, $maxExtensions]);
            $participantWrite = $pdo->prepare('INSERT INTO auction_live_participants (room_id, principal_id, role_key) VALUES (?, ?, ?)');
            $participantWrite->execute([$roomId, $context['principalId'], 'organizer']);
            foreach ($principalIds as $principalId) $participantWrite->execute([$roomId, $principalId, 'bidder']);
            tenant_audit($pdo, $context, 'auction.live_room_created', 'auction_live_room', $roomId, ['auctionRef'=>$auctionRef,'participantCount'=>count($principalIds),'closesAt'=>$closeAt,'startCents'=>$start,'floorCents'=>$floor,'minStepCents'=>$step], $key);
            $pdo->commit(); workspace_json(['roomId'=>$roomId, 'auctionRef'=>$auctionRef, 'closesAt'=>auction_iso($closeAt), 'created'=>true, 'csrf'=>$session['csrf']]);
        }

        if (!preg_match('#^/api/v1/auction-realtime/rooms/([A-Za-z0-9][A-Za-z0-9._-]{0,119})/(events|bids|state)/?$#', $uri, $match)) fail_response(404, 'Not found');
        $auctionRef = auction_room_ref($match[1]); $resource = $match[2]; if ($auctionRef === '') fail_response(404, 'Not found');

        if ($resource === 'state') {
            if ($method !== 'GET') fail_response(405, 'Method not allowed');
            $room = auction_realtime_room($pdo, $context, $auctionRef);
            $terms = $room ? auction_realtime_terms($pdo, (string) $room['id']) : null;
            if (!$room || !$terms) fail_response(404, 'Live room not found');
            workspace_json(auction_state_payload($pdo, $room, $terms, (string) $context['principalId'], $session['csrf']));
        }

        if ($resource === 'bids') {
            if ($method === 'GET') {
                $room = auction_realtime_room($pdo, $context, $auctionRef);
                if (!$room) fail_response(404, 'Live room not found');
                $organizer = (string) $room['role_key'] === 'organizer';
                // The organizer reads the whole ledger; a bidder only ever reads their own bids.
                $sql = 'SELECT b.id, b.bidder_principal_id, b.amount_cents, b.created_at, p.display_name FROM auction_live_bids b LEFT JOIN tenant_principals p ON p.id = b.bidder_principal_id WHERE b.room_id = ?' . ($organizer ? '' : ' AND b.bidder_principal_id = ?') . ' ORDER BY b.id ASC LIMIT 1000';
                $bids = $pdo->prepare($sql); $bids->execute($organizer ? [$room['id']] : [$room['id'], $context['principalId']]);
                $list = [];
                foreach ($bids->fetchAll() as $bid) $list[] = ['id'=>(int) $bid['id'], 'bidderId'=>(string) $bid['bidder_principal_id'], 'bidderName'=>$organizer ? (string) $bid['display_name'] : '', 'amount'=>auction_money((int) $bid['amount_cents']), 'at'=>auction_iso((string) $bid['created_at'])];
                workspace_json(['bids'=>$list, 'csrf'=>$session['csrf']]);
            }
            if ($method !== 'POST') fail_response(405, 'Method not allowed');
            auction_realtime_require_write($session);
            $input = tenant_request_body(); $cents = auction_amount_cents($input['amount'] ?? null); $bidKey = auction_event_key($input['bidKey'] ?? '');
            if ($cents === null || $bidKey === '') fail_response(400, 'A valid amount and bid key are required');
            $pdo->beginTransaction();
            $room = auction_realtime_room($pdo, $context, $auctionRef, true);
            if (!$room) { $pdo->rollBack(); fail_response(404, 'Live room not found'); }
            $terms = auction_realtime_terms($pdo, (string) $room['id'], true);
            if (!$terms) { $pdo->rollBack(); fail_response(409, 'This live room does not accept ledger bids'); }
            if ((string) $room['role_key'] !== 'bidder') { $pdo->rollBack(); fail_response(403, 'Only invited bidders may place a bid'); }
            if ((string) $room['status'] !== 'running') { $pdo->rollBack(); fail_response(409, 'Live room is not accepting offers'); }
            $closesAt = strtotime((string) $room['closes_at'] . ' UTC');
            if ($closesAt === false || $closesAt <= time()) { $pdo->rollBack(); fail_response(409, 'Live room is closed'); }
            $seen = $pdo->prepare('SELECT amount_cents FROM auction_live_bids WHERE room_id = ? AND bidder_principal_id = ? AND bid_key = ? LIMIT 1');
            $seen->execute([$room['id'], $context['principalId'], $bidKey]);
            if ($seen->fetchColumn() !== false) { $pdo->commit(); workspace_json(['accepted'=>true, 'duplicate'=>true] + auction_state_payload($pdo, $room, $terms, (string) $context['principalId'], $session['csrf'])); }
            $maximum = (int) $terms['best_cents'] - (int) $terms['min_step_cents'];
            if ($maximum < (int) $terms['floor_cents'] || $cents > $maximum) {
                $pdo->rollBack();
                workspace_json(['error'=>$maximum < (int) $terms['floor_cents'] ? 'No further improvement is possible' : 'Bid must be ' . auction_money($maximum) . ' or lower', 'maximum'=>$maximum < (int) $terms['floor_cents'] ? null : auction_money($maximum), 'csrf'=>$session['csrf']], 422);
            }
            if ($cents < (int) $terms['floor_cents']) { $pdo->rollBack(); workspace_json(['error'=>'Bid is below the permitted range', 'csrf'=>$session['csrf']], 422); }
            $pdo->prepare('INSERT INTO auction_live_bids (room_id, bidder_principal_id, amount_cents, bid_key) VALUES (?, ?, ?, ?)')->execute([$room['id'], $context['principalId'], $cents, $bidKey]);
            $bidId = (int) $pdo->lastInsertId();
            $extended = false; $extensionCount = (int) $terms['extension_count'];
            if ((int) $terms['auto_extend'] === 1 && $closesAt - time() <= (int) $terms['anti_sniping_seconds'] && $extensionCount < (int) $terms['max_extensions']) {
                $closesAt += (int) $terms['extension_seconds']; $extensionCount++; $extended = true;
                $pdo->prepare('UPDATE auction_live_rooms SET closes_at = ? WHERE id = ?')->execute([gmdate('Y-m-d H:i:s', $closesAt), $room['id']]);
            }
            $pdo->prepare('UPDATE auction_live_terms SET best_cents = ?, leader_principal_id = ?, bid_count = bid_count + 1, extension_count = ? WHERE room_id = ?')->execute([$cents, $context['principalId'], $extensionCount, $room['id']]);
            $dispatch = auction_dispatch_activity($pdo, $room, (string) $context['principalId'], 'bid_activity', $bidKey, $extended);
            tenant_audit($pdo, $context, 'auction.bid_accepted', 'auction_live_room', (string) $room['id'], ['auctionRef'=>$auctionRef,'bidId'=>$bidId,'amountCents'=>$cents,'extended'=>$extended,'recipientCount'=>$dispatch['recipients']], $key);
            $pdo->commit();
            $room['closes_at'] = gmdate('Y-m-d H:i:s', $closesAt);
            $terms['best_cents'] = $cents; $terms['leader_principal_id'] = $context['principalId']; $terms['bid_count'] = (int) $terms['bid_count'] + 1; $terms['extension_count'] = $extensionCount;
            workspace_json(['accepted'=>true, 'duplicate'=>false, 'extended'=>$extended, 'bidId'=>$bidId, 'amount'=>auction_money($cents)] + auction_state_payload($pdo, $room, $terms, (string) $context['principalId'], $session['csrf']));
        }

        if ($method === 'GET') {
            $room = auction_realtime_room($pdo, $context, $auctionRef);
            if (!$room) fail_response(404, 'Live room not found');
            $afterRaw = (string) ($_GET['after'] ?? '0');
            $after = preg_match('/^[0-9]{1,18}$/', $afterRaw) === 1 ? (int)$afterRaw : 0;
            $events = $pdo->prepare('SELECT e.id, e.event_type, e.created_at, CASE WHEN ? = "organizer" AND e.event_type = "bid_received" THEN p.display_name ELSE NULL END AS actor_name FROM auction_live_events e LEFT JOIN tenant_principals p ON p.id = e.actor_principal_id WHERE e.room_id = ? AND e.recipient_principal_id = ? AND e.id > ? ORDER BY e.id ASC LIMIT 50');
            $events->execute([(string)$room['role_key'], $room['id'], $context['principalId'], $after]);
            $payload = [];
            foreach ($events->fetchAll() as $event) {
                $timestamp = strtotime((string)$event['created_at'] . ' UTC');
                $payload[] = ['id'=>(int)$event['id'], 'type'=>(string)$event['event_type'], 'at'=>$timestamp === false ? gmdate('c') : gmdate('c', $timestamp), 'actor'=>(string)($event['actor_name'] ?? '')];
            }
            workspace_json(['events'=>$payload, 'csrf'=>$session['csrf']]);
        }

        auction_realtime_require_write($session); $input = tenant_request_body();
        $type = (string)($input['type'] ?? ''); $eventKey = auction_event_key($input['eventKey'] ?? '');
        if (!in_array($type, ['bid_activity','auction_extended','auction_paused','auction_resumed','auction_closed'], true) || $eventKey === '') fail_response(400, 'Invalid live activity signal');
        $pdo->beginTransaction(); $room = auction_realtime_room($pdo, $context, $auctionRef, true);
        if (!$room) { $pdo->rollBack(); fail_response(404, 'Live room not found'); }
        if ((string)$room['status'] === 'closed' || strtotime((string)$room['closes_at'] . ' UTC') < time()) { $pdo->rollBack(); fail_response(409, 'Live room is closed'); }
        $role = (string)$room['role_key'];
        $terms = auction_realtime_terms($pdo, (string) $room['id'], true);
        // With a ledger, an offer exists only if the bid endpoint accepted it; a bare signal could fake activity.
        if ($type === 'bid_activity' && $terms) { $pdo->rollBack(); fail_response(409, 'Offers are placed through the bid endpoint'); }
        if ($type === 'bid_activity' && $role !== 'bidder') { $pdo->rollBack(); fail_response(403, 'Only invited bidders may signal an offer'); }
        if ($type !== 'bid_activity' && $role !== 'organizer') { $pdo->rollBack(); fail_response(403, 'Only the organizer may signal room controls'); }
        if ($type === 'bid_activity' && (string)$room['status'] !== 'running') { $pdo->rollBack(); fail_response(409, 'Live room is not accepting offers'); }
        if ($type === 'auction_paused') $pdo->prepare('UPDATE auction_live_rooms SET status = "paused" WHERE id = ?')->execute([$room['id']]);
        if ($type === 'auction_resumed') $pdo->prepare('UPDATE auction_live_rooms SET status = "running" WHERE id = ?')->execute([$room['id']]);
        if ($type === 'auction_closed') $pdo->prepare('UPDATE auction_live_rooms SET status = "closed" WHERE id = ?')->execute([$room['id']]);
        if ($type === 'auction_extended' && $terms) {
            // A manual extension moves the real closing time, within the same cap as anti-sniping.
            if ((int) $terms['extension_count'] >= (int) $terms['max_extensions']) { $pdo->rollBack(); fail_response(409, 'The extension limit was reached'); }
            $base = max(time(), (int) strtotime((string) $room['closes_at'] . ' UTC'));
            $pdo->prepare('UPDATE auction_live_rooms SET closes_at = ? WHERE id = ?')->execute([gmdate('Y-m-d H:i:s', $base + (int) $terms['extension_seconds']), $room['id']]);
            $pdo->prepare('UPDATE auction_live_terms SET extension_count = extension_count + 1 WHERE room_id = ?')->execute([$room['id']]);
        }
        $dispatch = auction_dispatch_activity($pdo, $room, (string) $context['principalId'], $type, $eventKey, ($input['extended'] ?? false) === true);
        if ($dispatch['affected'] > 0) tenant_audit($pdo, $context, 'auction.live_activity_dispatched', 'auction_live_room', (string)$room['id'], ['auctionRef'=>$auctionRef,'type'=>$type,'recipientCount'=>$dispatch['recipients'],'eventDigest'=>hash('sha256',$eventKey)], $key);
        $pdo->commit(); workspace_json(['accepted'=>true, 'duplicate'=>$dispatch['affected'] === 0, 'csrf'=>$session['csrf']]);
    } catch (Throwable $error) { if ($pdo->inTransaction()) $pdo->rollBack(); fail_response(503, 'Live auction channel is unavailable'); }
}
