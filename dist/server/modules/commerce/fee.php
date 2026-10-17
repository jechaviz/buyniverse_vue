<?php
declare(strict_types=1);

// Buyniverse's fee, as one pure function. No database, no clock, no browser input:
// the server feeds it the locked baseline, the awarded price and the company's terms.
//
//   fee = min(cap, max(floor, ratio fee))
//   ratio fee = rate on the verified saving, with a lower rate on the part of the
//               trailing-12-month saving above the bracket threshold
//   floor = max(floor_min, floor_bps of the awarded amount)   (a low baseline cannot dodge the fee)
//   cap   = cap_bps of the awarded amount                     (never more than a share of what is bought)
//
// All money is integer cents and all rates are basis points, so the result is exact.

const COMMERCE_DEFAULT_TERMS = [
    'currency' => 'MXN', 'rate_bps' => 2500, 'bracket_threshold_cents' => 500000000, 'bracket_rate_bps' => 2000,
    'floor_bps' => 40, 'floor_min_cents' => 300000, 'cap_bps' => 800, 'mode' => 'informative',
];

/** Floor of a*bps/10000 without overflowing on large cents. */
function commerce_bps(int $cents, int $bps): int {
    return intdiv($cents, 10000) * $bps + intdiv(($cents % 10000) * $bps, 10000);
}

/** Terms as stored, clamped to what the schema allows. Unknown or bad values fall back to the defaults. */
function commerce_normalize_terms(array $row): array {
    $terms = COMMERCE_DEFAULT_TERMS;
    foreach (['rate_bps', 'bracket_rate_bps', 'floor_bps', 'cap_bps'] as $field) {
        if (isset($row[$field]) && is_numeric($row[$field])) $terms[$field] = max(0, min(10000, (int) $row[$field]));
    }
    foreach (['bracket_threshold_cents', 'floor_min_cents'] as $field) {
        if (isset($row[$field]) && is_numeric($row[$field])) $terms[$field] = max(0, (int) $row[$field]);
    }
    if (isset($row['currency']) && preg_match('/^[A-Z]{3}$/', (string) $row['currency']) === 1) $terms['currency'] = (string) $row['currency'];
    if (isset($row['mode']) && in_array($row['mode'], ['informative', 'charging'], true)) $terms['mode'] = (string) $row['mode'];
    if ($terms['floor_bps'] > $terms['cap_bps']) $terms['floor_bps'] = $terms['cap_bps'];
    return $terms;
}

/**
 * @param int   $baselineCents       price locked when the room was created
 * @param int   $awardedCents        winning price
 * @param int   $trailingSavingCents verified saving of the company in the last 12 months, before this award
 * @param array $terms               commerce_normalize_terms() output
 * @param string $currency           currency of the room; amounts in another currency than the terms use percentage rules only
 */
function commerce_compute_fee(int $baselineCents, int $awardedCents, int $trailingSavingCents, array $terms, string $currency): array {
    $baselineCents = max(0, $baselineCents); $awardedCents = max(0, $awardedCents); $trailingSavingCents = max(0, $trailingSavingCents);
    $saving = max(0, $baselineCents - $awardedCents);
    $absolute = $currency === $terms['currency'];   // fixed amounts only mean something in the terms' currency

    // Saving up to the threshold pays the standard rate; the excess pays the bracket rate.
    $room = $absolute ? max(0, $terms['bracket_threshold_cents'] - $trailingSavingCents) : PHP_INT_MAX;
    $standardPart = min($saving, $room);
    $excessPart = $saving - $standardPart;
    $ratioFee = commerce_bps($standardPart, $terms['rate_bps']) + commerce_bps($excessPart, $terms['bracket_rate_bps']);

    $floor = max($absolute ? $terms['floor_min_cents'] : 0, commerce_bps($awardedCents, $terms['floor_bps']));
    $cap = commerce_bps($awardedCents, $terms['cap_bps']);
    $fee = $awardedCents === 0 ? 0 : min($cap, max($floor, $ratioFee));

    return [
        'savingCents' => $saving, 'ratioFeeCents' => $ratioFee, 'floorCents' => $floor, 'capCents' => $cap, 'feeCents' => $fee,
        'standardPartCents' => $standardPart, 'excessPartCents' => $excessPart,
        // What decided the fee, so a buyer can read it: 'none', 'cap', 'floor' or 'saving'.
        'basis' => $fee === 0 ? 'none' : ($cap < max($floor, $ratioFee) ? 'cap' : ($floor > $ratioFee ? 'floor' : 'saving')),
    ];
}

/** Hash that pins the exact terms a settlement was computed with. */
function commerce_terms_hash(array $terms, string $currency): string {
    ksort($terms);
    return hash('sha256', json_encode(['terms' => $terms, 'roomCurrency' => $currency], JSON_UNESCAPED_SLASHES));
}
