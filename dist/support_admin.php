<?php
declare(strict_types=1);

// Support desk for the team, CLI only (Apache denies every PHP file except
// index.php). Reads the runtime configuration outside the document root.
//   php support_admin.php list [open|in_progress|waiting_customer|resolved|closed]
//   php support_admin.php show BNV-XXXX-XXXX
//   php support_admin.php reply BNV-XXXX-XXXX "Message for the customer"
//   php support_admin.php status BNV-XXXX-XXXX resolved
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

$configPath = getenv('BUYNIVERSE_RUNTIME_CONFIG') ?: dirname(__DIR__) . '/buyniverse-runtime.php';
$config = is_file($configPath) ? require $configPath : [];
if (!is_array($config) || empty($config['db_dsn'])) { fwrite(STDERR, "Runtime configuration unavailable\n"); exit(2); }
$pdo = new PDO($config['db_dsn'], $config['db_user'], $config['db_password'], [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES=>false]);
$key = base64_decode((string) ($config['state_encryption_key'] ?? ''), true);
if (!is_string($key) || strlen($key) !== 32) { fwrite(STDERR, "Encryption key unavailable\n"); exit(2); }

$open = fn(?string $cipher, ?string $iv, ?string $tag, string $aad): string => $cipher === null ? '' : (string) openssl_decrypt($cipher, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, (string) $iv, (string) $tag, $aad);
$seal = function (string $plain, string $aad) use ($key): array {
    $iv = random_bytes(12); $tag = '';
    $cipher = openssl_encrypt($plain, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag, $aad);
    return [$cipher, $iv, $tag];
};
$ticket = function (string $reference) use ($pdo): array {
    $row = $pdo->prepare('SELECT * FROM support_tickets WHERE reference = ? LIMIT 1');
    $row->execute([strtoupper($reference)]); $found = $row->fetch();
    if (!$found) { fwrite(STDERR, "Ticket not found\n"); exit(1); }
    return $found;
};
$statuses = ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'];
[$command, $reference, $argument] = [$argv[1] ?? 'list', $argv[2] ?? '', $argv[3] ?? ''];

if ($command === 'list') {
    $filter = in_array($reference, $statuses, true) ? $reference : null;
    $rows = $pdo->prepare('SELECT id, reference, area, severity, status, subject_ciphertext, subject_iv, subject_tag, created_at FROM support_tickets'
        . ($filter ? ' WHERE status = ?' : " WHERE status NOT IN ('resolved','closed')") . ' ORDER BY FIELD(severity, "high", "normal", "low"), created_at LIMIT 200');
    $rows->execute($filter ? [$filter] : []);
    foreach ($rows->fetchAll() as $row) {
        printf("%-14s %-7s %-11s %-17s %s  %s\n", $row['reference'], $row['severity'], $row['area'], $row['status'], $row['created_at'],
            $open($row['subject_ciphertext'], $row['subject_iv'], $row['subject_tag'], 'buyniverse-support-v1|' . $row['id'] . '|subject'));
    }
    exit(0);
}
if ($command === 'show') {
    $row = $ticket($reference);
    echo $row['reference'], ' · ', $row['area'], ' · ', $row['severity'], ' · ', $row['status'], ' · ', $row['created_at'], PHP_EOL;
    echo 'Subject: ', $open($row['subject_ciphertext'], $row['subject_iv'], $row['subject_tag'], 'buyniverse-support-v1|' . $row['id'] . '|subject'), PHP_EOL;
    $email = $open($row['email_ciphertext'], $row['email_iv'], $row['email_tag'], 'buyniverse-support-v1|' . $row['id'] . '|email');
    echo 'Reply to: ', $email !== '' ? $email : ($row['principal_id'] ? 'signed-in user (My tickets)' : '-'), PHP_EOL, 'Context: ', (string) $row['context_json'], PHP_EOL, PHP_EOL;
    $events = $pdo->prepare('SELECT kind, actor, status, body_ciphertext, body_iv, body_tag, created_at FROM support_ticket_events WHERE ticket_id = ? ORDER BY id');
    $events->execute([$row['id']]);
    foreach ($events->fetchAll() as $event) {
        $body = $event['kind'] === 'message' ? $open($event['body_ciphertext'], $event['body_iv'], $event['body_tag'], 'buyniverse-support-v1|' . $row['id'] . '|event') : 'status → ' . $event['status'];
        echo '[', $event['created_at'], '] ', $event['actor'], ': ', $body, PHP_EOL;
    }
    exit(0);
}
if ($command === 'reply' || $command === 'status') {
    $row = $ticket($reference);
    if ($command === 'reply') {
        if (trim($argument) === '') { fwrite(STDERR, "Message required\n"); exit(1); }
        [$cipher, $iv, $tag] = $seal(mb_substr(trim($argument), 0, 4000), 'buyniverse-support-v1|' . $row['id'] . '|event');
        $pdo->prepare('INSERT INTO support_ticket_events (ticket_id, kind, actor, body_ciphertext, body_iv, body_tag) VALUES (?, "message", "agent", ?, ?, ?)')->execute([$row['id'], $cipher, $iv, $tag]);
        $pdo->prepare('UPDATE support_tickets SET status = "waiting_customer" WHERE id = ?')->execute([$row['id']]);
    } else {
        if (!in_array($argument, $statuses, true)) { fwrite(STDERR, 'Status must be one of: ' . implode(', ', $statuses) . PHP_EOL); exit(1); }
        $pdo->prepare('INSERT INTO support_ticket_events (ticket_id, kind, actor, status) VALUES (?, "status", "agent", ?)')->execute([$row['id'], $argument]);
        $pdo->prepare('UPDATE support_tickets SET status = ? WHERE id = ?')->execute([$argument, $row['id']]);
    }
    echo "OK ", $row['reference'], PHP_EOL;
    exit(0);
}
fwrite(STDERR, "Commands: list [status] | show REF | reply REF \"message\" | status REF STATUS\n");
exit(1);
