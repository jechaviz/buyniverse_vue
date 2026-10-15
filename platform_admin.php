<?php
declare(strict_types=1);

// CLI-only management of platform operators (the people who run the SaaS).
// Run on the server, in the release directory:
//   php platform_admin.php principals [search]     people who have signed in
//   php platform_admin.php operators               current operators
//   php platform_admin.php grant <principal_id>    give platform access
//   php platform_admin.php revoke <principal_id>   take it back
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

$configPath = getenv('BUYNIVERSE_RUNTIME_CONFIG') ?: dirname(__DIR__) . '/buyniverse-runtime.php';
$config = is_file($configPath) ? require $configPath : [];
if (!is_array($config) || empty($config['db_dsn'])) { fwrite(STDERR, "Runtime configuration unavailable\n"); exit(78); }
$command = $argv[1] ?? '';
try {
    $pdo = new PDO((string) $config['db_dsn'], (string) $config['db_user'], (string) $config['db_password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
    if ($command === 'principals') {
        $like = '%' . str_replace(['%', '_'], ['\\%', '\\_'], (string) ($argv[2] ?? '')) . '%';
        $rows = $pdo->prepare('SELECT id, provider, display_name, status, created_at FROM tenant_principals WHERE display_name LIKE ? ORDER BY created_at DESC LIMIT 100');
        $rows->execute([$like]);
        foreach ($rows->fetchAll() as $r) echo implode(' | ', [$r['id'], $r['provider'], $r['display_name'], $r['status'], $r['created_at']]) . PHP_EOL;
    } elseif ($command === 'operators') {
        foreach ($pdo->query('SELECT o.principal_id, p.display_name, o.granted_at, o.revoked_at FROM platform_operators o LEFT JOIN tenant_principals p ON p.id = o.principal_id ORDER BY o.granted_at')->fetchAll() as $r)
            echo implode(' | ', [$r['principal_id'], (string) $r['display_name'], $r['revoked_at'] ? 'revoked ' . $r['revoked_at'] : 'active', $r['granted_at']]) . PHP_EOL;
    } elseif ($command === 'grant' || $command === 'revoke') {
        $id = strtolower((string) ($argv[2] ?? ''));
        if (preg_match('/^[0-9a-f-]{36}$/', $id) !== 1) { fwrite(STDERR, "A principal id (uuid) is required.\n"); exit(64); }
        $exists = $pdo->prepare('SELECT 1 FROM tenant_principals WHERE id = ?'); $exists->execute([$id]);
        if ($exists->fetchColumn() === false) { fwrite(STDERR, "No such person has signed in.\n"); exit(1); }
        if ($command === 'grant') {
            $pdo->prepare('INSERT INTO platform_operators (principal_id, granted_by_principal_id) VALUES (?, NULL) ON DUPLICATE KEY UPDATE revoked_at = NULL')->execute([$id]);
            $pdo->prepare('INSERT INTO platform_audit_events (principal_id, action, subject, payload_digest) VALUES (?, "operator.granted", ?, ?)')->execute([$id, 'principal ' . $id, hash('sha256', 'grant')]);
            echo "Granted platform access.\n";
        } else {
            $pdo->prepare('UPDATE platform_operators SET revoked_at = CURRENT_TIMESTAMP WHERE principal_id = ? AND revoked_at IS NULL')->execute([$id]);
            $pdo->prepare('INSERT INTO platform_audit_events (principal_id, action, subject, payload_digest) VALUES (?, "operator.revoked", ?, ?)')->execute([$id, 'principal ' . $id, hash('sha256', 'revoke')]);
            echo "Revoked platform access.\n";
        }
    } else {
        fwrite(STDERR, "Commands: principals [search] | operators | grant <principal_id> | revoke <principal_id>\n"); exit(64);
    }
} catch (Throwable $error) { fwrite(STDERR, "Platform administration unavailable\n"); exit(75); }
