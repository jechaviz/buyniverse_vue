<?php
declare(strict_types=1);
// Backup rotation and alarm decisions: pure logic, no database.
require __DIR__ . '/../../server/modules/ops/lib.php';
$fails = 0; $n = 0;
function check($cond, string $msg): void { global $fails, $n; $n++; if (!$cond) { $fails++; echo "FAIL: $msg\n"; } }

// ---- DSN
$d = ops_parse_dsn('mysql:host=db.example;port=3307;dbname=bnv;charset=utf8mb4');
check($d['host'] === 'db.example' && $d['port'] === '3307' && $d['dbname'] === 'bnv', 'the DSN is parsed');
check(ops_parse_dsn('mysql:dbname=x')['port'] === '3306', 'the default port applies');

// ---- rotation: 40 daily backups from 2026-09-01 (one per day at 03:00 UTC)
$base = gmmktime(3, 0, 0, 9, 1, 2026);
$all = []; for ($i = 0; $i < 60; $i++) $all[] = ['file' => 'db-' . $i, 'time' => $base + $i * 86400];
$keep = ops_backups_to_keep($all, 14, 6);
$newest14 = array_map(fn($i) => 'db-' . $i, range(46, 59));
check(count(array_diff($newest14, $keep)) === 0, 'the newest 14 are kept');
check(in_array('db-0', $keep, true), 'the first backup of September is kept as a monthly one');       // 2026-09-01
check(in_array('db-30', $keep, true), 'the first backup of October is kept as a monthly one');        // 2026-10-01
check(in_array('db-61', $keep, true) === false && count($keep) === count(array_unique($keep)), 'no duplicates');
check(count($keep) <= 14 + 6, 'at most 14 daily plus 6 monthly');
check(count(ops_backups_to_keep([['file' => 'a', 'time' => 1]], 14, 6)) === 1, 'a single backup is kept');
check(ops_backups_to_keep([], 14, 6) === [], 'nothing to keep when there is nothing');
// a deletion must never leave fewer than the daily window
$sparse = []; for ($i = 0; $i < 5; $i++) $sparse[] = ['file' => 's' . $i, 'time' => 1000000 + $i];
check(count(ops_backups_to_keep($sparse, 14, 6)) === 5, 'with fewer than 14 nothing is deleted');

// ---- alarms
$ok = static fn(string $k) => ['key' => $k, 'ok' => true, 'detail' => 'fine'];
$bad = static fn(string $k) => ['key' => $k, 'ok' => false, 'detail' => 'broken'];
$a = ops_alarms([$ok('database'), $bad('backup')], [], 1000);
check($a['send'] === ['backup'] && $a['recovered'] === [] && $a['state'] === ['backup' => 1000], 'a new problem raises one alarm');
$b = ops_alarms([$ok('database'), $bad('backup')], $a['state'], 1000 + 3600);
check($b['send'] === [] && $b['state'] === ['backup' => 1000], 'the same problem is not repeated within 6 hours');
$c = ops_alarms([$bad('backup')], $a['state'], 1000 + 6 * 3600);
check($c['send'] === ['backup'] && $c['state']['backup'] === 1000 + 6 * 3600, 'an open problem is repeated after 6 hours');
$d2 = ops_alarms([$ok('backup')], $a['state'], 5000);
check($d2['send'] === [] && $d2['recovered'] === ['backup'] && $d2['state'] === [], 'a problem that clears is announced once');
$e = ops_alarms([$ok('backup')], [], 5000);
check($e['send'] === [] && $e['recovered'] === [], 'a healthy system sends nothing');
$f = ops_alarms([$bad('database'), $bad('site')], [], 7);
check($f['send'] === ['database', 'site'], 'several problems at once are all reported');

echo ($fails === 0 ? 'OK' : 'FAILED') . " ops: $n checks" . ($fails ? ", $fails failed" : '') . "\n";
exit($fails === 0 ? 0 : 1);
