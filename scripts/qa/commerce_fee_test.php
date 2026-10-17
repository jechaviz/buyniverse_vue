<?php
declare(strict_types=1);
// The fee function: exact integer arithmetic, floor, cap, brackets and currency rules.
require __DIR__ . '/../../server/modules/commerce/fee.php';

$fails = 0; $n = 0;
function check($cond, string $msg): void { global $fails, $n; $n++; if (!$cond) { $fails++; echo "FAIL: $msg\n"; } }
function eq($got, $want, string $msg): void { check($got === $want, "$msg (got " . json_encode($got) . ", want " . json_encode($want) . ")"); }

$t = commerce_normalize_terms([]);               // 25%, 20% above MXN 5,000,000, floor 0.4% (min MXN 3,000), cap 8%
$mxn = static fn(int $pesos): int => $pesos * 100;

// A plain award: baseline 1,000,000, awarded 800,000 -> saving 200,000, 25% = 50,000 (floor 3,200, cap 64,000).
$r = commerce_compute_fee($mxn(1000000), $mxn(800000), 0, $t, 'MXN');
eq($r['savingCents'], $mxn(200000), 'saving');
eq($r['feeCents'], $mxn(50000), '25% of the saving');
eq($r['basis'], 'saving', 'the saving decided it');

// No saving: the floor protects against a low baseline (0.4% of 900,000 = 3,600 > min 3,000).
$r = commerce_compute_fee($mxn(800000), $mxn(900000), 0, $t, 'MXN');
eq([$r['savingCents'], $r['feeCents'], $r['basis']], [0, $mxn(3600), 'floor'], 'no saving still pays the floor');

// Small award: the absolute minimum applies (0.4% of 100,000 = 400 < 3,000) and the cap (8% = 8,000) does not bite.
$r = commerce_compute_fee($mxn(100000), $mxn(100000), 0, $t, 'MXN');
eq($r['feeCents'], $mxn(3000), 'the minimum floor');

// Tiny award: the cap wins over the floor (8% of 1,000 = 80).
$r = commerce_compute_fee($mxn(1000), $mxn(1000), 0, $t, 'MXN');
eq([$r['feeCents'], $r['basis']], [$mxn(80), 'cap'], 'never more than the cap');

// The cap also limits a large ratio fee: baseline 1,000,000 awarded 100,000 -> 25% of 900,000 = 225,000, cap 8,000.
$r = commerce_compute_fee($mxn(1000000), $mxn(100000), 0, $t, 'MXN');
eq([$r['feeCents'], $r['basis']], [$mxn(8000), 'cap'], 'cap limits a huge saving');

// Brackets: 4,900,000 already saved this year; a new 400,000 saving pays 100,000 at 25% and 300,000 at 20%.
$r = commerce_compute_fee($mxn(2000000), $mxn(1600000), $mxn(4900000), $t, 'MXN');
eq([$r['standardPartCents'], $r['excessPartCents']], [$mxn(100000), $mxn(300000)], 'bracket split');
eq($r['ratioFeeCents'], $mxn(25000) + $mxn(60000), 'ratio fee across the bracket');
eq($r['feeCents'], $mxn(85000), 'fee across the bracket (cap 128,000 does not bite)');

// A threshold already passed: everything at the bracket rate.
$r = commerce_compute_fee($mxn(1000000), $mxn(800000), $mxn(9000000), $t, 'MXN');
eq($r['feeCents'], $mxn(40000), 'above the threshold the whole saving pays 20%');

// Another currency: only percentages apply (no minimum, no bracket).
$r = commerce_compute_fee(1000000, 1000000, 0, $t, 'USD');
eq($r['feeCents'], 4000, 'USD: 0.4% floor without the MXN minimum');
$r = commerce_compute_fee(1000000, 800000, 99999999999, $t, 'USD');
eq($r['feeCents'], 50000, 'USD: the standard rate, brackets do not apply');

// Exactness on large amounts (no float drift).
$r = commerce_compute_fee(900000000000000, 700000000000000, 0, commerce_normalize_terms(['cap_bps' => 10000]), 'MXN');
eq($r['ratioFeeCents'], 40000025000000, 'exact on 9e14 cents: 5e8 at 25% then the rest at 20%');
eq(commerce_bps(999999999999999, 1), 99999999999, 'floor division, no rounding up');

// Edge cases.
eq(commerce_compute_fee(1000, 0, 0, $t, 'MXN')['feeCents'], 0, 'a zero award owes nothing');
eq(commerce_compute_fee(0, 0, 0, $t, 'MXN')['feeCents'], 0, 'nothing owes nothing');

// Terms are clamped and normalised.
$bad = commerce_normalize_terms(['rate_bps' => 99999, 'floor_bps' => 900, 'cap_bps' => 100, 'mode' => 'weird', 'currency' => 'xx']);
eq([$bad['rate_bps'], $bad['floor_bps'], $bad['mode'], $bad['currency']], [10000, 100, 'informative', 'MXN'], 'bad terms fall back and the floor never exceeds the cap');

// The terms hash pins the terms: changing one changes it, key order does not.
check(commerce_terms_hash($t, 'MXN') === commerce_terms_hash(array_reverse($t, true), 'MXN'), 'hash ignores key order');
check(commerce_terms_hash($t, 'MXN') !== commerce_terms_hash(array_merge($t, ['rate_bps' => 2400]), 'MXN'), 'hash changes with the terms');

echo ($fails === 0 ? 'OK' : 'FAILED') . " commerce fee: $n checks" . ($fails ? ", $fails failed" : '') . "\n";
exit($fails === 0 ? 0 : 1);
