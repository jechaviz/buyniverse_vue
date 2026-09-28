<?php
declare(strict_types=1);

// Server-side port of app/lib/fiscal-rules.js. The browser uses the same
// registry for guidance; this file is what actually decides whether a
// supplier profile may be created. scripts/qa/fiscalRules.js runs the shared
// vectors through both implementations.

function fiscal_registry(): array {
    static $registry = null;
    if ($registry === null) {
        $raw = @file_get_contents(__DIR__ . '/app/data/fiscal/jurisdictions.json');
        $decoded = is_string($raw) ? json_decode($raw, true) : null;
        if (!is_array($decoded) || !isset($decoded['countries'])) throw new RuntimeException('Fiscal registry unavailable');
        $registry = $decoded;
    }
    return $registry;
}

function fiscal_us_counties(): array {
    static $counties = null;
    if ($counties === null) {
        $raw = @file_get_contents(__DIR__ . '/app/data/fiscal/us-counties.json');
        $decoded = is_string($raw) ? json_decode($raw, true) : null;
        $counties = is_array($decoded['counties'] ?? null) ? $decoded['counties'] : [];
    }
    return $counties;
}

function fiscal_digits(string $value): array { return array_map('intval', str_split($value)); }
function fiscal_ok(string $normalized, array $extra = []): array { return array_merge(['valid'=>true, 'normalized'=>$normalized, 'warnings'=>[]], $extra); }
function fiscal_fail(string $code, string $normalized = ''): array { return ['valid'=>false, 'code'=>$code, 'normalized'=>$normalized, 'warnings'=>[]]; }
function fiscal_clean($value): string { return (string) preg_replace('/[\s.\-\/]/u', '', mb_strtoupper((string) ($value ?? ''), 'UTF-8')); }
function fiscal_weighted(array $values, array $weights): int { $sum = 0; foreach ($weights as $i => $w) $sum += $w * $values[$i]; return $sum; }
function fiscal_luhn(string $number): bool {
    $sum = 0;
    foreach (array_reverse(fiscal_digits($number)) as $i => $d) { if ($i % 2 === 1) { $d *= 2; if ($d > 9) $d -= 9; } $sum += $d; }
    return $sum % 10 === 0;
}

function fiscal_validate(string $validator, $raw): array {
    switch ($validator) {
        case 'mx_rfc':
            $value = (string) preg_replace('/[\s\-]/u', '', mb_strtoupper((string) ($raw ?? ''), 'UTF-8'));
            if (preg_match('/^([A-ZÑ&]{3,4})(\d{2})(\d{2})(\d{2})([A-Z\d]{2})([A\d])$/u', $value, $m) !== 1) return fiscal_fail('format', $value);
            if ($value === 'XAXX010101000' || $value === 'XEXX010101000') return fiscal_fail('generic', $value);
            $yy = (int) $m[2]; $mm = (int) $m[3]; $dd = (int) $m[4];
            if (!checkdate($mm, $dd, 1900 + $yy) && !checkdate($mm, $dd, 2000 + $yy)) return fiscal_fail('date', $value);
            $alphabet = mb_str_split('0123456789ABCDEFGHIJKLMN&OPQRSTUVWXYZ Ñ', 1, 'UTF-8');
            $chars = mb_str_split($value, 1, 'UTF-8');
            $base = array_slice(array_merge([' ', ' ', ' '], array_slice($chars, 0, -1)), -12);
            $sum = 0;
            foreach ($base as $i => $char) $sum += (int) array_search($char, $alphabet, true) * (13 - $i);
            $result = fiscal_ok($value, ['person'=>mb_strlen($m[1], 'UTF-8') === 3 ? 'moral' : 'fisica']);
            if ($alphabet[(11 - ($sum % 11)) % 11] !== end($chars)) $result['warnings'][] = 'checksum';
            return $result;
        case 'us_ein':
            $value = fiscal_clean($raw);
            if (preg_match('/^\d{9}$/', $value) !== 1) return fiscal_fail('format', $value);
            $prefixes = explode(' ', '01 02 03 04 05 06 10 11 12 13 14 15 16 20 21 22 23 24 25 26 27 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 50 51 52 53 54 55 56 57 58 59 60 61 62 63 64 65 66 67 68 71 72 73 74 75 76 77 80 81 82 83 84 85 86 87 88 90 91 92 93 94 95 98 99');
            if (!in_array(substr($value, 0, 2), $prefixes, true)) return fiscal_fail('prefix', $value);
            return fiscal_ok(substr($value, 0, 2) . '-' . substr($value, 2));
        case 'ca_bn':
            $value = (string) preg_replace('/RT\d{4}$/', '', fiscal_clean($raw));
            if (preg_match('/^\d{9}$/', $value) !== 1) return fiscal_fail('format', $value);
            return fiscal_luhn($value) ? fiscal_ok($value) : fiscal_fail('checksum', $value);
        case 'es_nif':
            $value = (string) preg_replace('/^ES/', '', fiscal_clean($raw)); $letters = 'TRWAGMYFPDXBNJZSQVHLCKE';
            if (preg_match('/^\d{8}[A-Z]$/', $value) === 1) return $letters[((int) substr($value, 0, 8)) % 23] === $value[8] ? fiscal_ok($value) : fiscal_fail('checksum', $value);
            if (preg_match('/^[XYZ]\d{7}[A-Z]$/', $value) === 1) {
                $number = (int) (strpos('XYZ', $value[0]) . substr($value, 1, 7));
                return $letters[$number % 23] === $value[8] ? fiscal_ok($value) : fiscal_fail('checksum', $value);
            }
            if (preg_match('/^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/', $value) === 1) {
                $total = 0;
                foreach (fiscal_digits(substr($value, 1, 7)) as $i => $n) { if ($i % 2 === 1) $total += $n; else { $twice = $n * 2; $total += intdiv($twice, 10) + $twice % 10; } }
                $c = (10 - $total % 10) % 10; $control = $value[8];
                $letterType = str_contains('PQRSNW', $value[0]); $digitType = str_contains('ABEH', $value[0]);
                $asLetter = 'JABCDEFGHI'[$c] === $control; $asDigit = (string) $c === $control;
                if (($letterType && $asLetter) || ($digitType && $asDigit) || (!$letterType && !$digitType && ($asLetter || $asDigit))) return fiscal_ok($value);
                return fiscal_fail('checksum', $value);
            }
            return fiscal_fail('format', $value);
        case 'pt_nif':
            $value = (string) preg_replace('/^PT/', '', fiscal_clean($raw));
            if (preg_match('/^[1-35-9]\d{8}$/', $value) !== 1) return fiscal_fail('format', $value);
            $r = fiscal_weighted(fiscal_digits($value), [9, 8, 7, 6, 5, 4, 3, 2]) % 11;
            return ($r < 2 ? 0 : 11 - $r) === (int) $value[8] ? fiscal_ok($value) : fiscal_fail('checksum', $value);
        case 'fr_siren':
            $value = fiscal_clean($raw);
            if (preg_match('/^FR[0-9A-Z]{2}\d{9}$/', $value) === 1) $value = substr($value, 4);
            if (preg_match('/^\d{14}$/', $value) === 1) $value = substr($value, 0, 9);
            if (preg_match('/^\d{9}$/', $value) !== 1) return fiscal_fail('format', $value);
            return fiscal_luhn($value) ? fiscal_ok($value) : fiscal_fail('checksum', $value);
        case 'de_vat':
            $value = fiscal_clean($raw);
            if (preg_match('/^DE\d{9}$/', $value) !== 1) return fiscal_fail('format', $value);
            $product = 10; $d = fiscal_digits(substr($value, 2));
            for ($i = 0; $i < 8; $i++) { $sum = ($d[$i] + $product) % 10; if ($sum === 0) $sum = 10; $product = (2 * $sum) % 11; }
            return (11 - $product) % 10 === $d[8] ? fiscal_ok($value) : fiscal_fail('checksum', $value);
        case 'it_piva':
            $value = (string) preg_replace('/^IT/', '', fiscal_clean($raw));
            if (preg_match('/^\d{11}$/', $value) !== 1) return fiscal_fail('format', $value);
            $d = fiscal_digits($value); $sum = 0;
            for ($i = 0; $i < 10; $i++) { $n = $d[$i]; if ($i % 2 === 1) { $n *= 2; if ($n > 9) $n -= 9; } $sum += $n; }
            return (10 - $sum % 10) % 10 === $d[10] ? fiscal_ok($value) : fiscal_fail('checksum', $value);
        case 'be_enterprise':
            $value = (string) preg_replace('/^BE/', '', fiscal_clean($raw));
            if (preg_match('/^\d{9}$/', $value) === 1) $value = '0' . $value;
            if (preg_match('/^[01]\d{9}$/', $value) !== 1) return fiscal_fail('format', $value);
            return 97 - ((int) substr($value, 0, 8) % 97) === (int) substr($value, 8) ? fiscal_ok($value) : fiscal_fail('checksum', $value);
        case 'pl_nip':
            $value = (string) preg_replace('/^PL/', '', fiscal_clean($raw));
            if (preg_match('/^\d{10}$/', $value) !== 1) return fiscal_fail('format', $value);
            $r = fiscal_weighted(fiscal_digits($value), [6, 5, 7, 2, 3, 4, 5, 6, 7]) % 11;
            return $r !== 10 && $r === (int) $value[9] ? fiscal_ok($value) : fiscal_fail('checksum', $value);
        case 'gb_vat':
            $value = (string) preg_replace('/^GB/', '', fiscal_clean($raw));
            if (preg_match('/^\d{12}$/', $value) === 1) $value = substr($value, 0, 9);
            if (preg_match('/^\d{9}$/', $value) !== 1) return fiscal_fail('format', $value);
            $total = fiscal_weighted(fiscal_digits($value), [8, 7, 6, 5, 4, 3, 2]) + (int) substr($value, 7);
            return $total % 97 === 0 || ($total + 55) % 97 === 0 ? fiscal_ok('GB' . $value) : fiscal_fail('checksum', $value);
        case 'co_nit':
            $value = fiscal_clean($raw);
            if (preg_match('/^\d{6,15}$/', $value) !== 1) return fiscal_fail('format', $value);
            $body = substr($value, 0, -1); $weights = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71]; $sum = 0;
            foreach (array_reverse(fiscal_digits($body)) as $i => $d) $sum += $d * $weights[$i];
            $r = $sum % 11; $dv = $r > 1 ? 11 - $r : $r;
            return $dv === (int) substr($value, -1) ? fiscal_ok($body . '-' . $dv) : fiscal_fail('checksum', $value);
        case 'cl_rut':
            $value = fiscal_clean($raw);
            if (preg_match('/^\d{6,8}[0-9K]$/', $value) !== 1) return fiscal_fail('format', $value);
            $body = substr($value, 0, -1); $sum = 0;
            foreach (array_reverse(fiscal_digits($body)) as $i => $d) $sum += $d * (2 + $i % 6);
            $r = 11 - $sum % 11; $dv = $r === 11 ? '0' : ($r === 10 ? 'K' : (string) $r);
            return $dv === substr($value, -1) ? fiscal_ok($body . '-' . $dv) : fiscal_fail('checksum', $value);
        case 'pe_ruc':
            $value = fiscal_clean($raw);
            if (preg_match('/^(10|15|16|17|20)\d{9}$/', $value) !== 1) return fiscal_fail('format', $value);
            $r = 11 - fiscal_weighted(fiscal_digits($value), [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]) % 11;
            $dv = $r === 10 ? 0 : ($r === 11 ? 1 : $r);
            return $dv === (int) $value[10] ? fiscal_ok($value) : fiscal_fail('checksum', $value);
        case 'ar_cuit':
            $value = fiscal_clean($raw);
            if (preg_match('/^(20|23|24|25|26|27|30|33|34)\d{9}$/', $value) !== 1) return fiscal_fail('format', $value);
            $check = '012345678990'[11 - fiscal_weighted(fiscal_digits($value), [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]) % 11];
            return $check === $value[10] ? fiscal_ok(substr($value, 0, 2) . '-' . substr($value, 2, 8) . '-' . $value[10]) : fiscal_fail('checksum', $value);
        case 'br_cnpj':
            $value = fiscal_clean($raw);
            if (preg_match('/^[0-9A-Z]{12}\d{2}$/', $value) !== 1 || preg_match('/^(.)\1{13}$/', $value) === 1) return fiscal_fail('format', $value);
            $values = array_map(fn($c) => ord($c) - 48, str_split($value));
            $dv = function (int $length) use ($values): int {
                $weights = $length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
                $r = fiscal_weighted($values, $weights) % 11; return $r < 2 ? 0 : 11 - $r;
            };
            return $dv(12) === $values[12] && $dv(13) === $values[13] ? fiscal_ok($value) : fiscal_fail('checksum', $value);
        case 'ec_ruc':
            $value = fiscal_clean($raw);
            if (preg_match('/^\d{13}$/', $value) !== 1) return fiscal_fail('format', $value);
            $province = (int) substr($value, 0, 2);
            if (!(($province >= 1 && $province <= 24) || $province === 30)) return fiscal_fail('prefix', $value);
            $d = fiscal_digits($value); $third = $d[2];
            if ($third < 6) { $sum = 0; for ($i = 0; $i < 9; $i++) { $n = $d[$i] * ($i % 2 === 0 ? 2 : 1); $sum += $n > 9 ? $n - 9 : $n; } $valid = (10 - $sum % 10) % 10 === $d[9]; }
            elseif ($third === 6) { $r = fiscal_weighted($d, [3, 2, 7, 6, 5, 4, 3, 2]) % 11; $valid = ($r === 0 ? 0 : 11 - $r) === $d[8]; }
            elseif ($third === 9) { $r = fiscal_weighted($d, [4, 3, 2, 7, 6, 5, 4, 3, 2]) % 11; $valid = ($r === 0 ? 0 : 11 - $r) === $d[9]; }
            else return fiscal_fail('format', $value);
            $result = fiscal_ok($value); if (!$valid) $result['warnings'][] = 'checksum';
            return $result;
        case 'gt_nit':
            $value = fiscal_clean($raw);
            if (preg_match('/^\d{2,12}[0-9K]$/', $value) !== 1) return fiscal_fail('format', $value);
            $body = substr($value, 0, -1); $sum = 0;
            foreach (array_reverse(fiscal_digits($body)) as $i => $d) $sum += $d * ($i + 2);
            $r = (11 - $sum % 11) % 11; $dv = $r === 10 ? 'K' : (string) $r;
            return $dv === substr($value, -1) ? fiscal_ok($body . '-' . $dv) : fiscal_fail('checksum', $value);
        case 'cr_id':
            $value = fiscal_clean($raw);
            return preg_match('/^[1-9]\d{8}$/', $value) === 1 || preg_match('/^3\d{9}$/', $value) === 1 || preg_match('/^1\d{10,11}$/', $value) === 1 ? fiscal_ok($value) : fiscal_fail('format', $value);
        case 'pa_ruc':
            $value = (string) preg_replace('/\s+/u', '', mb_strtoupper((string) ($raw ?? ''), 'UTF-8'));
            return preg_match('/^[0-9A-Z]{1,10}-[0-9A-Z]{1,8}-[0-9]{1,8}(-?DV-?[0-9]{1,2})?$/', $value) === 1 ? fiscal_ok($value) : fiscal_fail('format', $value);
        case 'do_rnc':
            $value = fiscal_clean($raw);
            if (preg_match('/^\d{9}$/', $value) === 1) {
                $r = fiscal_weighted(fiscal_digits($value), [7, 9, 8, 6, 5, 4, 3, 2]) % 11;
                $check = $r === 0 ? 2 : ($r === 1 ? 1 : 11 - $r);
                return $check === (int) $value[8] ? fiscal_ok($value) : fiscal_fail('checksum', $value);
            }
            if (preg_match('/^\d{11}$/', $value) === 1) return fiscal_luhn($value) ? fiscal_ok($value) : fiscal_fail('checksum', $value);
            return fiscal_fail('format', $value);
        case 'uy_rut':
            $value = fiscal_clean($raw);
            if (preg_match('/^\d{12}$/', $value) !== 1) return fiscal_fail('format', $value);
            $r = 11 - fiscal_weighted(fiscal_digits($value), [4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) % 11;
            $check = $r === 11 ? 0 : $r;
            return $r !== 10 && $check === (int) $value[11] ? fiscal_ok($value) : fiscal_fail('checksum', $value);
        case 'in_gstin':
            $value = fiscal_clean($raw);
            if (preg_match('/^(\d{2})[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/', $value, $m) !== 1) return fiscal_fail('format', $value);
            $chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'; $sum = 0;
            for ($i = 0; $i < 14; $i++) { $product = strpos($chars, $value[$i]) * ($i % 2 === 0 ? 1 : 2); $sum += intdiv($product, 36) + $product % 36; }
            return $chars[(36 - $sum % 36) % 36] === $value[14] ? fiscal_ok($value, ['stateCode'=>$m[1]]) : fiscal_fail('checksum', $value);
        default:
            $value = (string) preg_replace('/\s+/u', ' ', trim(mb_strtoupper((string) ($raw ?? ''), 'UTF-8')));
            return preg_match('/^[A-Z0-9][A-Z0-9 .\/-]{2,39}$/', $value) === 1 ? fiscal_ok($value) : fiscal_fail('format', $value);
    }
}

function fiscal_find_country(array $registry, string $code): ?array {
    foreach ($registry['countries'] as $country) if ($country['code'] === $code) return $country;
    return null;
}

function fiscal_subdivision(array $country, $code): ?array {
    foreach ($country['subdivisions']['items'] ?? [] as $item) if ($item['code'] === $code) return $item;
    return null;
}

function fiscal_mx_name_without_suffix(string $name): string {
    $pattern = '/(,|\s)\s*(S\.?\s?A\.?\s?P\.?\s?I\.?|S\.?\s?A\.?\s?B\.?|S\.?\s?A\.?|S\.?\s?DE\s?R\.?\s?L\.?|S\.?\s?C\.?|A\.?\s?C\.?|S\.?\s?EN\s?C\.?)(\s?DE\s?C\.?\s?V\.?)?\s*$/iu';
    return trim((string) preg_replace($pattern, '', $name));
}

function fiscal_requirement_applies(array $requirement, array $profile, array $flags): bool {
    if (!in_array($profile['accountKind'] ?? 'business', $requirement['accountKinds'] ?? [], true)) return false;
    $when = $requirement['when'] ?? null; $answers = is_array($profile['answers'] ?? null) ? $profile['answers'] : [];
    if (!$when) return true;
    if (isset($when['flag']) && !in_array($when['flag'], $flags, true)) return false;
    if (isset($when['anyFlag']) && !array_intersect($when['anyFlag'], $flags)) return false;
    if (isset($when['answer']) && ($answers[$when['answer']] ?? null) !== true) return false;
    if (isset($when['answerNot']) && ($answers[$when['answerNot']] ?? null) === true) return false;
    return true;
}

function fiscal_field_status(array $requirement, array $country, array $profile, ?array $tax, ?array $subdivision): array {
    $field = $requirement['field'];
    $value = str_starts_with($field, 'answers.') ? (($profile['answers'] ?? [])[substr($field, 8)] ?? null) : ($profile[$field] ?? null);
    if ($value === null || (is_string($value) && trim($value) === '')) return ['status'=>'missing'];
    $text = trim((string) $value);
    if ($field === 'subdivision' && !$subdivision) return ['status'=>'invalid', 'code'=>'subdivision'];
    if ($field === 'county' && $country['code'] === 'US') {
        $known = false;
        foreach (fiscal_us_counties()[$profile['subdivision'] ?? ''] ?? [] as $county) if ($county[0] === $text) $known = true;
        if (!$known) return ['status'=>'invalid', 'code'=>'county'];
    }
    if ($field === 'residenceCountry' && preg_match('/^[A-Z]{2}$/', strtoupper($text)) !== 1) return ['status'=>'invalid', 'code'=>'format'];
    if ($country['code'] === 'MX' && $field === 'legalName' && fiscal_mx_name_without_suffix($text) !== $text) return ['status'=>'met', 'warnings'=>['mx_corporate_suffix'], 'suggestion'=>fiscal_mx_name_without_suffix($text)];
    if ($country['code'] === 'MX' && $field === 'taxRegime') {
        $regime = null; foreach ($country['regimes'] ?? [] as $item) if ($item['code'] === $text) $regime = $item;
        if (!$regime) return ['status'=>'invalid', 'code'=>'regime_unknown'];
        if (!$regime['supplier']) return ['status'=>'invalid', 'code'=>'regime_not_supplier'];
        if ($tax && isset($tax['person']) && $regime['person'] !== 'both' && $regime['person'] !== $tax['person']) return ['status'=>'invalid', 'code'=>'regime_person_mismatch'];
    }
    if ($country['code'] === 'MX' && $field === 'postalCode') {
        if (preg_match('/^\d{5}$/', $text) !== 1) return ['status'=>'invalid', 'code'=>'postal_format'];
        if ($subdivision && isset($subdivision['postalPrefixes']) && !in_array(substr($text, 0, 2), $subdivision['postalPrefixes'], true)) return ['status'=>'met', 'warnings'=>['postal_state_mismatch']];
    }
    return ['status'=>'met'];
}

/** Evaluate a supplier profile; mirrors evaluate() in app/lib/fiscal-rules.js. */
function fiscal_evaluate(array $registry, string $countryCode, array $profile, ?int $now = null): array {
    $country = fiscal_find_country($registry, $countryCode);
    if (!$country) return ['country'=>null, 'requirements'=>[], 'summary'=>['enrollmentReady'=>false, 'formal'=>false, 'blocking'=>1, 'enrollmentBlocking'=>1]];
    $now = $now ?? time();
    $subdivision = fiscal_subdivision($country, $profile['subdivision'] ?? null);
    $flags = $subdivision['flags'] ?? [];
    $tax = fiscal_validate($country['taxId']['validator'], $profile['taxId'] ?? '');
    $declarations = is_array($profile['declarations'] ?? null) ? $profile['declarations'] : [];
    $documents = is_array($profile['documents'] ?? null) ? $profile['documents'] : [];
    $results = [];
    foreach ($country['requirements'] as $requirement) {
        if (!fiscal_requirement_applies($requirement, $profile, $flags)) continue;
        $kind = $requirement['kind'];
        if ($kind === 'info') $outcome = ['status'=>'info'];
        elseif ($kind === 'taxId') {
            if (($profile['taxId'] ?? '') === '') $outcome = ['status'=>'missing'];
            elseif (!$tax['valid']) $outcome = ['status'=>'invalid', 'code'=>$tax['code']];
            elseif ($country['code'] === 'IN' && isset($tax['stateCode']) && ($profile['subdivision'] ?? '') !== '' && $tax['stateCode'] !== $profile['subdivision']) $outcome = ['status'=>'invalid', 'code'=>'gstin_state_mismatch'];
            else $outcome = ['status'=>'met', 'warnings'=>$tax['warnings'], 'normalized'=>$tax['normalized']];
        } elseif ($kind === 'field') $outcome = fiscal_field_status($requirement, $country, $profile, $tax['valid'] ? $tax : null, $subdivision);
        elseif ($kind === 'declaration') {
            $value = $declarations[$requirement['id']] ?? null; $input = $requirement['input'] ?? ['type'=>'boolean'];
            if ($input['type'] === 'boolean') $outcome = ['status'=>$value === true ? 'met' : 'missing'];
            elseif (!is_scalar($value) || trim((string) $value) === '') $outcome = ['status'=>'missing'];
            else $outcome = preg_match('~' . str_replace('~', '\~', $input['pattern']) . '~u', trim((string) $value)) === 1 ? ['status'=>'met'] : ['status'=>'invalid', 'code'=>'pattern'];
        } else {
            $document = $documents[$requirement['id']] ?? null;
            if (!is_array($document)) $outcome = ['status'=>'pending'];
            else {
                $issued = strtotime(((string) ($document['issuedOn'] ?? '')) . ' UTC');
                $age = $issued === false ? PHP_INT_MAX : intdiv($now - $issued, 86400);
                $outcome = isset($requirement['maxAgeDays']) && $age > $requirement['maxAgeDays'] ? ['status'=>'expired'] : ['status'=>'met'];
            }
        }
        $results[] = array_merge(['id'=>$requirement['id'], 'kind'=>$kind, 'phase'=>$requirement['phase'], 'blocking'=>$requirement['blocking']], $outcome);
    }
    $unmet = fn(array $item): bool => $item['blocking'] && $item['status'] !== 'met';
    $blocking = array_values(array_filter($results, $unmet));
    $enrollmentBlocking = array_values(array_filter($blocking, fn(array $item): bool => $item['phase'] === 'enrollment'));
    return ['country'=>$country['code'], 'flags'=>$flags, 'requirements'=>$results,
        'summary'=>['enrollmentReady'=>!$enrollmentBlocking, 'formal'=>!$blocking, 'blocking'=>count($blocking), 'enrollmentBlocking'=>count($enrollmentBlocking)]];
}
