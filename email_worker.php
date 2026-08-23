<?php
declare(strict_types=1);

// CLI-only outbox dispatcher. Configure it with cPanel Cron; HTTP access is
// denied in .htaccess even though the script ships beside the runtime.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/email_service.php';

$configPath = getenv('BUYNIVERSE_RUNTIME_CONFIG') ?: dirname(__DIR__) . '/buyniverse-runtime.php';
$config = is_file($configPath) ? require $configPath : [];
if (!is_array($config)) { fwrite(STDERR, "Runtime configuration unavailable\n"); exit(78); }
$key = base64_decode((string) ($config['state_encryption_key'] ?? ''), true);
if ($key === false || strlen($key) !== 32) { fwrite(STDERR, "Mail encryption key unavailable\n"); exit(78); }
try {
    $pdo = new PDO((string) ($config['db_dsn'] ?? ''), (string) ($config['db_user'] ?? ''), (string) ($config['db_password'] ?? ''), [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES=>false]);
    $limit = isset($argv[1]) && ctype_digit((string) $argv[1]) ? (int) $argv[1] : 25;
    $result = mail_dispatch_pending($pdo, $config, $key, $limit);
    echo json_encode($result, JSON_UNESCAPED_SLASHES) . PHP_EOL;
    exit(0);
} catch (Throwable $error) {
    fwrite(STDERR, "Mail dispatcher unavailable\n"); exit(75);
}
