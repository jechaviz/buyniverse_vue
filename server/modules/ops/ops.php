<?php
declare(strict_types=1);

// CLI-only operations. Run on the server (cron):
//   php server/modules/ops/ops.php backup     dump the database, verify it, rotate old ones (daily)
//   php server/modules/ops/ops.php check      run the health checks and email an alarm for new problems (every 5 minutes)
//   php server/modules/ops/ops.php status     print the checks and the backups present
// Needs BUYNIVERSE_RUNTIME_CONFIG or ~/buyniverse-runtime.php. Optional config: backup_dir, email.alert_to, public_url.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/lib.php';

$configPath = getenv('BUYNIVERSE_RUNTIME_CONFIG') ?: dirname(__DIR__, 4) . '/buyniverse-runtime.php';
$config = is_file($configPath) ? require $configPath : [];
if (!is_array($config) || empty($config['db_dsn'])) { fwrite(STDERR, "Runtime configuration unavailable\n"); exit(78); }
$command = $argv[1] ?? '';
$dir = ops_backup_dir($config);
$log = static function (string $line) use ($dir): void {
    $file = $dir . '/ops.log';
    if (is_file($file) && filesize($file) > 1048576) @rename($file, $file . '.1');
    file_put_contents($file, gmdate('c') . ' ' . $line . "\n", FILE_APPEND); @chmod($file, 0600);
};
$connect = static function () use ($config): ?PDO {
    try { return new PDO((string) $config['db_dsn'], (string) $config['db_user'], (string) $config['db_password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 5]); }
    catch (Throwable $e) { return null; }
};
$publicUrl = (string) ($config['public_url'] ?? 'https://buyniverse.com/api/v1/runtime');

if ($command === 'backup') {
    $result = ops_backup($config);
    if ($result['ok']) { $log('backup ok ' . basename($result['file']) . ' ' . $result['bytes'] . ' bytes'); echo 'ok ' . basename($result['file']) . ' (' . $result['bytes'] . " bytes)\n"; exit(0); }
    $log('backup FAILED: ' . $result['error']);
    ops_send_alert($config, '[Buyniverse] The database backup failed', "The nightly backup did not complete.\n\nReason: " . $result['error'] . "\n\nCheck the server and run: php server/modules/ops/ops.php backup\n");
    fwrite(STDERR, 'FAILED ' . $result['error'] . "\n"); exit(1);
}

if ($command === 'check' || $command === 'status') {
    $checks = ops_checks($config, $connect(), $dir, $publicUrl, time());
    foreach ($checks as $c) echo ($c['ok'] ? 'ok    ' : 'FAIL  ') . str_pad($c['key'], 16) . $c['detail'] . "\n";
    if ($command === 'status') {
        foreach (array_slice(ops_backups($dir), 0, 5) as $b) echo 'backup ' . gmdate('Y-m-d H:i', $b['time']) . ' UTC  ' . round($b['bytes'] / 1024) . ' KB  ' . basename($b['file']) . "\n";
        exit(0);
    }
    $stateFile = $dir . '/.alarms.json';
    $state = is_file($stateFile) ? (json_decode((string) file_get_contents($stateFile), true) ?: []) : [];
    $plan = ops_alarms($checks, $state, time());
    $byKey = []; foreach ($checks as $c) $byKey[$c['key']] = $c;
    if ($plan['send']) {
        $lines = array_map(static fn($k) => '- ' . $k . ': ' . $byKey[$k]['detail'], $plan['send']);
        $sent = ops_send_alert($config, '[Buyniverse] ' . count($plan['send']) . ' problem(s) need attention', "Detected at " . gmdate('c') . ":\n\n" . implode("\n", $lines) . "\n\nRun: php server/modules/ops/ops.php status\n");
        $log('alarm ' . implode(',', $plan['send']) . ($sent ? ' sent' : ' NOT SENT (mail unavailable)'));
        if (!$sent) $plan['state'] = $state;   // try again next time
    }
    if ($plan['recovered']) {
        ops_send_alert($config, '[Buyniverse] Recovered: ' . implode(', ', $plan['recovered']), "These checks are healthy again at " . gmdate('c') . ": " . implode(', ', $plan['recovered']) . "\n");
        $log('recovered ' . implode(',', $plan['recovered']));
    }
    file_put_contents($stateFile, json_encode($plan['state'])); @chmod($stateFile, 0600);
    exit(array_filter($checks, static fn($c) => !$c['ok']) ? 2 : 0);
}

fwrite(STDERR, "Usage: ops.php backup | check | status\n");
exit(64);
