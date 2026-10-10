<?php
// Verifies the rules that decide whether a Google ID token may sign someone in.
// The network call to Google is not made here: only the checks applied to the verified claims.
declare(strict_types=1);
function tenant_text($v, int $n): string { return substr((string) $v, 0, $n); }
function social_b64url(string $b): string { return rtrim(strtr(base64_encode($b), '+/', '-_'), '='); }
$source = file_get_contents(__DIR__ . '/../../identity_service.php');
preg_match('/function social_google_config.*?\n}\n.*?function social_google_claims_error.*?\n}\n/s', $source, $m) or exit("function not found\n");
eval($m[0]);
$now = 1_800_000_000; $cid = '418216844279-6hq71905dqsfoasmipk8eoa4vms7qbqm.apps.googleusercontent.com';
$ok = ['aud'=>$cid, 'iss'=>'https://accounts.google.com', 'exp'=>$now + 300, 'email_verified'=>'true', 'sub'=>'110248495921238986420', 'nonce'=>'abc'];
$pending = ['value'=>'abc', 'expiresAt'=>$now + 60];
$cases = [
  'valid token' => [$ok, $pending, null],
  'accounts.google.com issuer' => [['iss'=>'accounts.google.com'] + $ok, $pending, null],
  'token for another app' => [['aud'=>'999999-zzzzzz.apps.googleusercontent.com'] + $ok, $pending, 'audience'],
  'foreign issuer' => [['iss'=>'https://evil.example'] + $ok, $pending, 'issuer'],
  'expired token' => [['exp'=>$now - 1] + $ok, $pending, 'expired'],
  'unverified email' => [['email_verified'=>'false'] + $ok, $pending, 'email_unverified'],
  'missing email_verified' => [array_diff_key($ok, ['email_verified'=>1]), $pending, 'email_unverified'],
  'non numeric subject' => [['sub'=>'../x'] + $ok, $pending, 'subject'],
  'wrong nonce (replay of an old token)' => [['nonce'=>'zzz'] + $ok, $pending, 'nonce'],
  'no nonce in token' => [array_diff_key($ok, ['nonce'=>1]), $pending, 'nonce'],
  'no nonce issued' => [$ok, null, 'nonce_expired'],
  'nonce expired' => [$ok, ['value'=>'abc', 'expiresAt'=>$now - 1], 'nonce_expired'],
];
$fail = 0;
foreach ($cases as $label => [$claims, $p, $want]) {
  $got = social_google_claims_error($claims, $cid, $p, $now);
  if ($got !== $want) { $fail++; echo "[FAIL] $label: expected " . var_export($want, true) . ", got " . var_export($got, true) . "\n"; } else echo "[PASS] $label\n";
}
$cfg = social_google_config(['identity'=>['google_gis'=>['enabled'=>true, 'client_id'=>$cid]]]);
foreach ([['enabled'=>true, 'client_id'=>'not-a-client-id'], ['enabled'=>false, 'client_id'=>$cid], []] as $bad) { if (social_google_config(['identity'=>['google_gis'=>$bad]]) !== null) { $fail++; echo "[FAIL] a bad config was accepted\n"; } }
echo $cfg === ['client_id'=>$cid] && !$fail ? "=== GOOGLE SIGN-IN RULES PASSED ===\n" : "FAILED\n"; exit($fail ? 1 : 0);
