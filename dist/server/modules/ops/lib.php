<?php
declare(strict_types=1);

// Operations: database backups and the health check that raises an alarm by email.
// Functions only; the CLI is ops.php. Nothing here is reachable over HTTP (server/ is denied).

/** Quotes a value for a POSIX shell (single quotes, forward slashes), so the same command works on Linux and under Git Bash on Windows. */
function ops_q(string $value): string { return "'" . str_replace("'", "'\\''", str_replace('\\', '/', $value)) . "'"; }

/** Parts of a PDO MySQL DSN: host, port, dbname. */
function ops_parse_dsn(string $dsn): array {
    $out = ['host' => '127.0.0.1', 'port' => '3306', 'dbname' => ''];
    foreach (explode(';', preg_replace('/^mysql:/', '', $dsn) ?? '') as $part) {
        [$k, $v] = array_pad(explode('=', $part, 2), 2, '');
        if (in_array($k, ['host', 'port', 'dbname'], true)) $out[$k] = $v;
    }
    return $out;
}

function ops_backup_dir(array $config): string {
    $dir = getenv('BUYNIVERSE_BACKUP_DIR') ?: (string) ($config['backup_dir'] ?? '');
    if ($dir === '') $dir = (getenv('HOME') ?: sys_get_temp_dir()) . '/backups/buyniverse';
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    @chmod($dir, 0700);
    return $dir;
}

/** Backups present, newest first: [['file', 'time', 'bytes']]. */
function ops_backups(string $dir): array {
    $list = [];
    foreach (glob($dir . '/db-*.sql.gz') ?: [] as $file) $list[] = ['file' => $file, 'time' => (int) filemtime($file), 'bytes' => (int) filesize($file)];
    usort($list, static fn($a, $b) => $b['time'] <=> $a['time']);
    return $list;
}

/**
 * Which backups to keep: the newest $daily, and the first one of each of the last $monthly months.
 * Pure, so it can be tested. Input and output are lists of ['file', 'time'].
 */
function ops_backups_to_keep(array $backups, int $daily = 14, int $monthly = 6): array {
    usort($backups, static fn($a, $b) => $b['time'] <=> $a['time']);
    $keep = [];
    foreach (array_slice($backups, 0, $daily) as $b) $keep[$b['file']] = true;
    $firsts = [];
    foreach (array_reverse($backups) as $b) { $month = gmdate('Y-m', $b['time']); if (!isset($firsts[$month])) $firsts[$month] = $b['file']; }
    krsort($firsts);
    foreach (array_slice($firsts, 0, $monthly, true) as $file) $keep[$file] = true;
    return array_keys($keep);
}

/** Dumps the database to a gzip file, verifies it, rotates old ones. Returns ['ok', 'file', 'bytes', 'error']. */
function ops_backup(array $config, ?string $dumpBinary = null): array {
    $dsn = ops_parse_dsn((string) ($config['db_dsn'] ?? ''));
    if ($dsn['dbname'] === '') return ['ok' => false, 'error' => 'no database in the configuration'];
    $dir = ops_backup_dir($config);
    $lock = fopen($dir . '/.lock', 'c');
    if ($lock === false || !flock($lock, LOCK_EX | LOCK_NB)) return ['ok' => false, 'error' => 'another backup is running'];

    $binary = $dumpBinary ?? (trim((string) @shell_exec('bash -c ' . escapeshellarg('command -v mariadb-dump 2>/dev/null || command -v mysqldump 2>/dev/null'))) ?: 'mysqldump');
    // The password never appears on a command line: it goes in a private options file that is removed afterwards.
    $defaults = tempnam($dir, 'cnf'); chmod($defaults, 0600);
    file_put_contents($defaults, "[client]\nuser=" . ($config['db_user'] ?? '') . "\npassword=\"" . addcslashes((string) ($config['db_password'] ?? ''), "\"\\") . "\"\nhost=" . $dsn['host'] . "\nport=" . $dsn['port'] . "\n");
    $name = 'db-' . gmdate('Ymd-His') . '.sql.gz';
    $part = $dir . '/' . $name . '.part';
    $command = sprintf('set -o pipefail; %s --defaults-extra-file=%s --single-transaction --quick --routines --triggers --events --no-tablespaces --default-character-set=utf8mb4 %s | gzip -9 > %s',
        ops_q($binary), ops_q($defaults), ops_q($dsn['dbname']), ops_q($part));
    $output = []; $code = 0;
    exec('bash -c ' . escapeshellarg($command) . ' 2>&1', $output, $code);
    @unlink($defaults);
    $fail = static function (string $why) use ($part, $lock): array { @unlink($part); flock($lock, LOCK_UN); return ['ok' => false, 'error' => $why]; };
    if ($code !== 0) return $fail('dump failed (' . $code . '): ' . substr(trim(implode(' ', $output)), 0, 200));

    // A backup that cannot be read back is not a backup: check the archive and that it contains the dump's own footer.
    exec('bash -c ' . escapeshellarg('gzip -t ' . ops_q($part)) . ' 2>&1', $o, $gz);
    if ($gz !== 0) return $fail('the archive is corrupt');
    $tail = (string) @shell_exec('bash -c ' . escapeshellarg('gzip -dc ' . ops_q($part) . ' | tail -n 3'));
    if (!str_contains($tail, 'Dump completed')) return $fail('the dump is incomplete');
    if ((int) filesize($part) < 512) return $fail('the dump is suspiciously small');

    $final = $dir . '/' . $name;
    rename($part, $final); chmod($final, 0600);
    file_put_contents($final . '.sha256', hash_file('sha256', $final) . '  ' . $name . "\n"); chmod($final . '.sha256', 0600);

    $keep = array_flip(ops_backups_to_keep(array_map(static fn($b) => ['file' => $b['file'], 'time' => $b['time']], ops_backups($dir))));
    foreach (ops_backups($dir) as $b) if (!isset($keep[$b['file']])) { @unlink($b['file']); @unlink($b['file'] . '.sha256'); }
    flock($lock, LOCK_UN);
    return ['ok' => true, 'file' => $final, 'bytes' => (int) filesize($final)];
}

/** Restores a backup into another database (for the restore test). Returns true on success. */
function ops_restore(string $file, array $config, string $targetDatabase, ?string $clientBinary = null): bool {
    $dsn = ops_parse_dsn((string) ($config['db_dsn'] ?? ''));
    $binary = $clientBinary ?? (trim((string) @shell_exec('bash -c ' . escapeshellarg('command -v mariadb 2>/dev/null || command -v mysql 2>/dev/null'))) ?: 'mysql');
    $defaults = tempnam(sys_get_temp_dir(), 'cnf'); chmod($defaults, 0600);
    file_put_contents($defaults, "[client]\nuser=" . ($config['db_user'] ?? '') . "\npassword=\"" . addcslashes((string) ($config['db_password'] ?? ''), "\"\\") . "\"\nhost=" . $dsn['host'] . "\nport=" . $dsn['port'] . "\n");
    $command = sprintf('set -o pipefail; gzip -dc %s | %s --defaults-extra-file=%s %s', ops_q($file), ops_q($binary), ops_q($defaults), ops_q($targetDatabase));
    exec('bash -c ' . escapeshellarg($command) . ' 2>&1', $out, $code);
    @unlink($defaults);
    return $code === 0;
}

/**
 * The health checks. Returns a list of ['key', 'ok', 'detail'].
 * $pdo may be null when the database cannot be reached.
 */
function ops_checks(array $config, ?PDO $pdo, string $backupDir, ?string $publicUrl, int $now): array {
    $checks = [];
    $checks[] = ['key' => 'database', 'ok' => $pdo !== null, 'detail' => $pdo !== null ? 'reachable' : 'the database cannot be reached'];
    if ($pdo !== null) {
        $stuck = (int) $pdo->query('SELECT COUNT(*) FROM tenant_email_outbox WHERE status IN ("queued","retry") AND available_at < (UTC_TIMESTAMP() - INTERVAL 30 MINUTE)')->fetchColumn();
        $checks[] = ['key' => 'email_backlog', 'ok' => $stuck === 0, 'detail' => $stuck === 0 ? 'no stuck email' : $stuck . ' email(s) waiting for more than 30 minutes'];
        $failed = (int) $pdo->query('SELECT COUNT(*) FROM tenant_email_outbox WHERE status = "failed" AND updated_at > (UTC_TIMESTAMP() - INTERVAL 24 HOUR)')->fetchColumn();
        $checks[] = ['key' => 'email_failures', 'ok' => $failed < 5, 'detail' => $failed . ' failed email(s) in the last 24 hours'];
    }
    $backups = ops_backups($backupDir);
    $age = $backups ? $now - $backups[0]['time'] : null;
    $checks[] = ['key' => 'backup', 'ok' => $age !== null && $age < 26 * 3600, 'detail' => $age === null ? 'there is no backup' : 'the latest backup is ' . round($age / 3600, 1) . ' hours old'];
    $free = @disk_free_space($backupDir);
    $checks[] = ['key' => 'disk', 'ok' => $free === false || $free > 2 * 1024 ** 3, 'detail' => $free === false ? 'unknown' : round($free / 1024 ** 3, 1) . ' GB free'];
    if ($publicUrl !== null && function_exists('curl_init')) {
        $curl = curl_init($publicUrl);
        curl_setopt_array($curl, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15, CURLOPT_CONNECTTIMEOUT => 8, CURLOPT_FOLLOWLOCATION => false]);
        $body = curl_exec($curl); $status = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE); curl_close($curl);
        $up = $status === 200 && is_string($body) && str_contains($body, '"serverAuth"');
        $checks[] = ['key' => 'site', 'ok' => $up, 'detail' => $up ? 'answers' : 'the public site does not answer correctly (HTTP ' . $status . ')'];
    }
    return $checks;
}

/**
 * Decides which alarms to send, given the checks and what was already sent. Pure.
 * $state maps a check key to the time of the last alarm. Returns ['send' => [keys], 'recovered' => [keys], 'state' => new state].
 * An open problem is repeated at most every $repeat seconds; a closed one is announced once.
 */
function ops_alarms(array $checks, array $state, int $now, int $repeat = 6 * 3600): array {
    $send = []; $recovered = []; $next = $state;
    foreach ($checks as $c) {
        $last = isset($state[$c['key']]) ? (int) $state[$c['key']] : null;
        if (!$c['ok']) {
            if ($last === null || $now - $last >= $repeat) { $send[] = $c['key']; $next[$c['key']] = $now; }
        } elseif ($last !== null) {
            $recovered[] = $c['key']; unset($next[$c['key']]);
        }
    }
    return ['send' => $send, 'recovered' => $recovered, 'state' => $next];
}

/** Sends a plain alert through the configured mail provider. Returns true when it was accepted. */
function ops_send_alert(array $config, string $subject, string $text): bool {
    if (!function_exists('mail_delivery_config')) require_once dirname(__DIR__, 3) . '/email_service.php';
    $delivery = mail_delivery_config($config);
    if ($delivery === null) return false;
    $to = (string) (($config['email']['alert_to'] ?? '') ?: $delivery['from_email']);
    $payload = ['to' => $to, 'subject' => $subject, 'text' => $text, 'html' => '<pre style="font:14px/1.5 monospace">' . htmlspecialchars($text, ENT_QUOTES) . '</pre>'];
    $id = sprintf('%08x-%04x-4%03x-8%03x-%012x', random_int(0, 0xffffffff), random_int(0, 0xffff), random_int(0, 0xfff), random_int(0, 0xfff), random_int(0, 0xffffffffffff));
    $result = $delivery['provider'] === 'resend' ? mail_send_resend($delivery, $payload, $id) : mail_send_smtp($delivery, $payload, $id);
    return ($result['ok'] ?? false) === true;
}
