<?php
declare(strict_types=1);

// Live-auction activity channel
// ---------------------------------------------------------------------------
// This small channel is intentionally separate from the encrypted per-user
// workspace document. A workspace is not a shared bid ledger, so it cannot be
// used to fan out notifications to participants. These helpers distribute only
// activity signals; they never accept prices, bid documents, or winner data.
function auction_room_ref($value): string {
    $room = tenant_text($value, 120);
    return preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/', $room) === 1 ? $room : '';
}
function auction_event_key($value): string {
    $key = tenant_text($value, 80);
    return preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]{7,79}$/', $key) === 1 ? $key : '';
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
            $requestedClose = strtotime((string) ($input['closesAt'] ?? ''));
            $minClose = time() + 60; $maxClose = time() + 45 * 86400;
            $closeAt = gmdate('Y-m-d H:i:s', min($maxClose, max($minClose, $requestedClose === false ? time() + 7200 : $requestedClose)));
            $pdo->beginTransaction();
            $existing = $pdo->prepare('SELECT id, owner_principal_id, closes_at FROM auction_live_rooms WHERE tenant_id = ? AND legal_entity_id = ? AND auction_ref = ? LIMIT 1 FOR UPDATE');
            $existing->execute([$context['tenant']['id'], $context['company']['id'], $auctionRef]); $room = $existing->fetch();
            if ($room) {
                if (!hash_equals((string) $room['owner_principal_id'], (string) $context['principalId'])) { $pdo->rollBack(); fail_response(409, 'Live room is owned by another organizer'); }
                $pdo->commit(); workspace_json(['roomId'=>(string)$room['id'], 'auctionRef'=>$auctionRef, 'closesAt'=>gmdate('c', strtotime((string)$room['closes_at'] . ' UTC')), 'created'=>false, 'csrf'=>$session['csrf']]);
            }
            $placeholders = implode(',', array_fill(0, count($principalIds), '?'));
            $memberships = $pdo->prepare('SELECT DISTINCT principal_id FROM tenant_memberships WHERE tenant_id = ? AND principal_id IN (' . $placeholders . ') AND role_key = "supplier" AND status = "active"');
            $memberships->execute(array_merge([$context['tenant']['id']], $principalIds));
            $allowed = array_fill_keys(array_map(static fn($row) => strtolower((string)$row['principal_id']), $memberships->fetchAll()), true);
            if (count($allowed) !== count($principalIds)) { $pdo->rollBack(); fail_response(403, 'Each invited supplier must be an active supplier in this tenant'); }
            $roomId = tenant_uuid();
            $pdo->prepare('INSERT INTO auction_live_rooms (id, tenant_id, legal_entity_id, location_id, auction_ref, owner_principal_id, closes_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
                ->execute([$roomId, $context['tenant']['id'], $context['company']['id'], $context['location']['id'] ?? null, $auctionRef, $context['principalId'], $closeAt]);
            $participantWrite = $pdo->prepare('INSERT INTO auction_live_participants (room_id, principal_id, role_key) VALUES (?, ?, ?)');
            $participantWrite->execute([$roomId, $context['principalId'], 'organizer']);
            foreach ($principalIds as $principalId) $participantWrite->execute([$roomId, $principalId, 'bidder']);
            tenant_audit($pdo, $context, 'auction.live_room_created', 'auction_live_room', $roomId, ['auctionRef'=>$auctionRef,'participantCount'=>count($principalIds),'closesAt'=>$closeAt], $key);
            $pdo->commit(); workspace_json(['roomId'=>$roomId, 'auctionRef'=>$auctionRef, 'closesAt'=>gmdate('c', strtotime($closeAt . ' UTC')), 'created'=>true, 'csrf'=>$session['csrf']]);
        }

        if (!preg_match('#^/api/v1/auction-realtime/rooms/([A-Za-z0-9][A-Za-z0-9._-]{0,119})/events/?$#', $uri, $match)) fail_response(404, 'Not found');
        $auctionRef = auction_room_ref($match[1]); if ($auctionRef === '') fail_response(404, 'Not found');
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
        if ($type === 'bid_activity' && $role !== 'bidder') { $pdo->rollBack(); fail_response(403, 'Only invited bidders may signal an offer'); }
        if ($type !== 'bid_activity' && $role !== 'organizer') { $pdo->rollBack(); fail_response(403, 'Only the organizer may signal room controls'); }
        if ($type === 'bid_activity' && (string)$room['status'] !== 'running') { $pdo->rollBack(); fail_response(409, 'Live room is not accepting offers'); }
        if ($type === 'auction_paused') $pdo->prepare('UPDATE auction_live_rooms SET status = "paused" WHERE id = ?')->execute([$room['id']]);
        if ($type === 'auction_resumed') $pdo->prepare('UPDATE auction_live_rooms SET status = "running" WHERE id = ?')->execute([$room['id']]);
        if ($type === 'auction_closed') $pdo->prepare('UPDATE auction_live_rooms SET status = "closed" WHERE id = ?')->execute([$room['id']]);
        $recipients = $pdo->prepare('SELECT principal_id, role_key FROM auction_live_participants WHERE room_id = ? AND status = "active"');
        $recipients->execute([$room['id']]); $recipientRows = $recipients->fetchAll();
        $insert = $pdo->prepare('INSERT IGNORE INTO auction_live_events (room_id, recipient_principal_id, actor_principal_id, event_type, event_key) VALUES (?, ?, ?, ?, ?)');
        $affected = 0;
        foreach ($recipientRows as $recipient) {
            $recipientId = (string)$recipient['principal_id'];
            if ($type === 'bid_activity') {
                $deliveryType = hash_equals($recipientId, (string)$context['principalId']) ? 'offer_recorded' : ((string)$recipient['role_key'] === 'organizer' ? 'bid_received' : 'competitive_offer');
            } else {
                $deliveryType = $type;
            }
            auction_realtime_event($insert, (string)$room['id'], $recipientId, (string)$context['principalId'], $deliveryType, $eventKey);
            $affected += $insert->rowCount();
        }
        if ($type === 'bid_activity' && ($input['extended'] ?? false) === true) {
            $extensionKey = $eventKey . '.extend';
            foreach ($recipientRows as $recipient) {
                auction_realtime_event($insert, (string)$room['id'], (string)$recipient['principal_id'], (string)$context['principalId'], 'auction_extended', $extensionKey);
                $affected += $insert->rowCount();
            }
        }
        if ($affected > 0) tenant_audit($pdo, $context, 'auction.live_activity_dispatched', 'auction_live_room', (string)$room['id'], ['auctionRef'=>$auctionRef,'type'=>$type,'recipientCount'=>count($recipientRows),'eventDigest'=>hash('sha256',$eventKey)], $key);
        $pdo->commit(); workspace_json(['accepted'=>true, 'duplicate'=>$affected === 0, 'csrf'=>$session['csrf']]);
    } catch (Throwable $error) { if ($pdo->inTransaction()) $pdo->rollBack(); fail_response(503, 'Live auction channel is unavailable'); }
}
}
