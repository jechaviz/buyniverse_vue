<?php
declare(strict_types=1);
// Backup and restore against a real database: the dump is verified, restores into a clean database with the same
// tables, rows and triggers, a broken dump is refused, and rotation removes old files.
//   BUYNIVERSE_TEST_RUNTIME_CONFIG=/path/runtime-test.php php scripts/qa/ops_backup_test.php
$path = getenv('BUYNIVERSE_TEST_RUNTIME_CONFIG');
if (!$path) { echo json_encode(['opsBackup' => 'skipped (set BUYNIVERSE_TEST_RUNTIME_CONFIG)']) . "\n"; exit(0); }
require __DIR__ . '/../../server/modules/ops/lib.php';
$config = require $path;
$fails = []; $n = 0;
function check($cond, string $msg, string $detail = ''): void { global $fails, $n; $n++; if (!$cond) $fails[] = $msg . ($detail !== '' ? ': ' . $detail : ''); }

$dir = sys_get_temp_dir() . '/bnv-backup-' . bin2hex(random_bytes(4));
putenv('BUYNIVERSE_BACKUP_DIR=' . $dir);
$pdo = new PDO($config['db_dsn'], $config['db_user'], $config['db_password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

$r = ops_backup($config);
check($r['ok'] === true && is_file($r['file'] ?? ''), 'a backup is written', json_encode($r));
if (!($r['ok'] ?? false)) { echo json_encode(['opsBackup' => 'FAILED', 'failures' => $fails]) . "\n"; exit(1); }
check(str_ends_with($r['file'], '.sql.gz') && $r['bytes'] > 2048, 'it is a compressed dump of real size', (string) $r['bytes']);
check(trim((string) @file_get_contents($r['file'] . '.sha256')) === hash_file('sha256', $r['file']) . '  ' . basename($r['file']), 'its checksum is stored');
check(glob($dir . '/*.part') === [], 'no partial file is left behind');
check(glob($dir . '/cnf*') === [], 'the private options file is removed');
check(ops_backups($dir)[0]['file'] === $r['file'], 'the backup is listed');

// ---- restore into a clean database and compare
$target = 'bnv_restore_' . bin2hex(random_bytes(3));
$root = ['db_dsn' => preg_replace('/dbname=[^;]*/', 'dbname=mysql', $config['db_dsn']), 'db_user' => 'root', 'db_password' => ''];
$admin = new PDO($root['db_dsn'], 'root', '', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$admin->exec("CREATE DATABASE `$target` CHARACTER SET utf8mb4");
try {
    check(ops_restore($r['file'], $root, $target) === true, 'the backup restores into a clean database');
    $restored = new PDO(preg_replace('/dbname=[^;]*/', 'dbname=' . $target, $config['db_dsn']), 'root', '', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $tables = static fn(PDO $p) => $p->query('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = "BASE TABLE"')->fetchColumn();
    check((int) $tables($restored) === (int) $tables($pdo) && (int) $tables($pdo) > 20, 'the same number of tables', $tables($restored) . ' vs ' . $tables($pdo));
    foreach (['tenant_accounts', 'tenant_principals', 'commerce_terms', 'award_settlements', 'auction_live_bids'] as $t) {
        check((int) $restored->query("SELECT COUNT(*) FROM `$t`")->fetchColumn() === (int) $pdo->query("SELECT COUNT(*) FROM `$t`")->fetchColumn(), "the same rows in $t");
    }
    $triggers = static fn(PDO $p) => array_column($p->query('SHOW TRIGGERS')->fetchAll(PDO::FETCH_ASSOC), 'Trigger');
    check(in_array('award_settlements_frozen', $triggers($restored), true) && in_array('auction_live_bids_no_update', $triggers($restored), true), 'the immutability triggers come back with the data');
    $checksum = static fn(PDO $p) => $p->query('SELECT MD5(GROUP_CONCAT(CONCAT(scope, rate_bps, mode) ORDER BY scope)) FROM commerce_terms')->fetchColumn();
    check($checksum($restored) === $checksum($pdo), 'the content of a table matches exactly');
} finally { $admin->exec("DROP DATABASE IF EXISTS `$target`"); }

// ---- a broken dump is never kept
$before = count(ops_backups($dir));
$bad = ops_backup($config, 'false');
check($bad['ok'] === false && count(ops_backups($dir)) === $before && glob($dir . '/*.part') === [], 'a failing dump keeps nothing', json_encode($bad));
$incomplete = ops_backup($config, 'echo');
check($incomplete['ok'] === false && str_contains((string) $incomplete['error'], 'incomplete') && count(ops_backups($dir)) === $before, 'a dump without its footer is refused', json_encode($incomplete));
$noDb = ops_backup(['db_dsn' => 'mysql:host=x']);
check($noDb['ok'] === false, 'no database in the configuration is an error');

// ---- rotation removes old ones and keeps the window
$old = gmmktime(3, 0, 0, 1, 1, 2026);
for ($i = 0; $i < 30; $i++) { $f = $dir . '/db-' . gmdate('Ymd-His', $old + $i * 86400) . '.sql.gz'; file_put_contents($f, str_repeat('x', 600)); touch($f, $old + $i * 86400); }
$again = ops_backup($config);
$left = ops_backups($dir);
check($again['ok'] === true && count($left) <= 14 + 6 && count($left) >= 14, 'rotation leaves the daily window and the monthly ones', (string) count($left));
check(is_file($again['file']), 'the new backup survives rotation');
check(!is_file($dir . '/db-' . gmdate('Ymd-His', $old + 5 * 86400) . '.sql.gz'), 'an old mid-month backup is removed');

// ---- the health checks see this
$checks = ops_checks($config, $pdo, $dir, null, time());
$by = array_column($checks, null, 'key');
check($by['database']['ok'] && $by['backup']['ok'] && $by['disk']['ok'], 'database, backup and disk are healthy');
$stale = ops_checks($config, $pdo, sys_get_temp_dir() . '/bnv-empty-' . bin2hex(random_bytes(3)), null, time());
check(array_column($stale, null, 'key')['backup']['ok'] === false, 'a missing backup is a problem');
$down = ops_checks($config, null, $dir, null, time());
check(array_column($down, null, 'key')['database']['ok'] === false, 'an unreachable database is a problem');
$late = ops_checks($config, $pdo, $dir, null, time() + 30 * 3600);
check(array_column($late, null, 'key')['backup']['ok'] === false, 'a backup older than 26 hours is a problem');

foreach (glob($dir . '/*') ?: [] as $f) @unlink($f); @unlink($dir . '/.lock'); @rmdir($dir);
echo json_encode($fails ? ['opsBackup' => 'FAILED', 'failures' => $fails] : ['opsBackup' => 'verified', 'checks' => $n]) . "\n";
exit($fails ? 1 : 0);
