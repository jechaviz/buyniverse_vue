<?php
declare(strict_types=1);

// CLI-only management of the private demo's access codes. Run it on the server:
//   php demo_admin.php requests                  pending access requests
//   php demo_admin.php approve <id> [days=7]     approve a request and print its code (shown once)
//   php demo_admin.php decline <id>
//   php demo_admin.php create "<label>" [days]   a code without a request
//   php demo_admin.php codes                     active and past codes
//   php demo_admin.php revoke <id>
//   php demo_admin.php owner-hash                reads a password from stdin and prints the hash for demo_owner_password_hash
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

const DEMO_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
$command = $argv[1] ?? '';
if ($command === 'owner-hash') {
    $password = rtrim((string) stream_get_contents(STDIN), "\r\n");
    if (strlen($password) < 16) { fwrite(STDERR, "Use at least 16 characters.\n"); exit(2); }
    echo password_hash($password, PASSWORD_DEFAULT) . PHP_EOL; exit(0);
}
$configPath = getenv('BUYNIVERSE_RUNTIME_CONFIG') ?: dirname(__DIR__) . '/buyniverse-runtime.php';
$config = is_file($configPath) ? require $configPath : [];
$key = base64_decode((string) ($config['state_encryption_key'] ?? ''), true);
if (!is_array($config) || $key === false || strlen($key) !== 32) { fwrite(STDERR, "Runtime configuration unavailable\n"); exit(78); }
$pdo = new PDO((string) $config['db_dsn'], (string) $config['db_user'], (string) $config['db_password'], [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES=>false]);

function demo_uuid(): string { $b = random_bytes(16); $b[6] = chr((ord($b[6]) & 0x0f) | 0x40); $b[8] = chr((ord($b[8]) & 0x3f) | 0x80); return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4)); }
function demo_issue(PDO $pdo, string $label, int $days): array {
    $chars = ''; for ($i = 0; $i < 12; $i++) $chars .= DEMO_ALPHABET[random_int(0, strlen(DEMO_ALPHABET) - 1)];
    $id = demo_uuid(); $days = max(1, min(90, $days));
    $pdo->prepare('INSERT INTO demo_access_codes (id, label, code_hash, code_prefix, expires_at) VALUES (?, ?, ?, ?, ?)')
        ->execute([$id, mb_substr($label, 0, 160), password_hash($chars, PASSWORD_DEFAULT), substr($chars, 0, 4), gmdate('Y-m-d H:i:s', time() + $days * 86400)]);
    return ['id'=>$id, 'code'=>implode('-', str_split($chars, 4)), 'days'=>$days];
}

try {
    if ($command === 'requests') {
        foreach ($pdo->query('SELECT id, name, company, note, status, created_at, email_ciphertext, email_iv, email_tag FROM demo_access_requests ORDER BY created_at DESC LIMIT 50')->fetchAll() as $r) {
            $email = openssl_decrypt((string) $r['email_ciphertext'], 'aes-256-gcm', $key, OPENSSL_RAW_DATA, (string) $r['email_iv'], (string) $r['email_tag'], 'buyniverse-demo-request|' . $r['id']);
            echo implode(' | ', [$r['id'], $r['status'], $r['created_at'], $r['name'], (string) $email, (string) $r['company'], (string) $r['note']]) . PHP_EOL;
        }
    } elseif ($command === 'approve' || $command === 'decline') {
        $id = (string) ($argv[2] ?? '');
        $row = $pdo->prepare('SELECT id, name, status FROM demo_access_requests WHERE id = ? AND status = "pending"'); $row->execute([$id]); $request = $row->fetch();
        if (!$request) { fwrite(STDERR, "No pending request with that id.\n"); exit(1); }
        if ($command === 'decline') { $pdo->prepare('UPDATE demo_access_requests SET status = "declined" WHERE id = ?')->execute([$id]); echo "Declined.\n"; exit(0); }
        $issued = demo_issue($pdo, 'Request: ' . $request['name'], (int) ($argv[3] ?? 7));
        $pdo->prepare('UPDATE demo_access_requests SET status = "approved", code_id = ? WHERE id = ?')->execute([$issued['id'], $id]);
        echo "Approved {$request['name']}. Send this code (it is not stored and will not be shown again), valid {$issued['days']} days:\n{$issued['code']}\n";
    } elseif ($command === 'create') {
        $issued = demo_issue($pdo, (string) ($argv[2] ?? 'Guest'), (int) ($argv[3] ?? 7));
        echo "Code for '{$argv[2]}' (id {$issued['id']}), valid {$issued['days']} days; shown once:\n{$issued['code']}\n";
    } elseif ($command === 'codes') {
        foreach ($pdo->query('SELECT id, label, expires_at, revoked_at, use_count, last_used_at FROM demo_access_codes ORDER BY created_at DESC LIMIT 100')->fetchAll() as $c)
            echo implode(' | ', [$c['id'], $c['label'], 'expires ' . $c['expires_at'], $c['revoked_at'] ? 'REVOKED' : (strtotime($c['expires_at'] . ' UTC') < time() ? 'expired' : 'active'), 'uses ' . $c['use_count'], (string) $c['last_used_at']]) . PHP_EOL;
    } elseif ($command === 'revoke') {
        $done = $pdo->prepare('UPDATE demo_access_codes SET revoked_at = UTC_TIMESTAMP() WHERE id = ? AND revoked_at IS NULL'); $done->execute([(string) ($argv[2] ?? '')]);
        echo $done->rowCount() === 1 ? "Revoked.\n" : "No active code with that id.\n";
    } else { fwrite(STDERR, "Commands: requests | approve <id> [days] | decline <id> | create \"<label>\" [days] | codes | revoke <id> | owner-hash\n"); exit(64); }
} catch (Throwable $error) { fwrite(STDERR, "Demo administration unavailable\n"); exit(75); }
