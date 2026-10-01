<?php
declare(strict_types=1);
// CFDI core tests: XML against the official SAT XSDs, CSD inspection with
// generated certificates, and (with --live) a real stamp in SW's TEST
// environment. The SW token is read at runtime from the environment variable
// BUYNIVERSE_SW_TEST_ENV_FILE (a .env file) and is never printed or stored.
require __DIR__ . '/../../cfdi/SatCatalog.php';
require __DIR__ . '/../../cfdi/CfdiXml.php';
require __DIR__ . '/../../cfdi/Csd.php';
require __DIR__ . '/../../cfdi/PacProviders.php';

use Buyniverse\Cfdi\{CfdiXml, Csd, SatCatalog, SwPacProvider};

$failures = []; $results = [];
$check = function (string $label, bool $ok, string $detail = '') use (&$failures) { if (!$ok) $failures[] = $label . ($detail !== '' ? ': ' . $detail : ''); };
$now = (new DateTime('now', new DateTimeZone('America/Mexico_City')))->format('Y-m-d\TH:i:s');
$issuer = ['rfc'=>'EKU9003173C9', 'name'=>'ESCUELA KEMPER URGATE', 'regime'=>'601'];
$receiver = SatCatalog::validateReceiver(['rfc'=>'URE180429TM6', 'name'=>'UNIVERSIDAD ROBOTICA ESPAÑOLA S.A. DE C.V.', 'zip'=>'86991', 'regime'=>'601', 'use'=>'G03']);
$check('receiver name normalized', $receiver['name'] === 'UNIVERSIDAD ROBOTICA ESPAÑOLA', $receiver['name']);

$invoice = ['type'=>'I', 'series'=>'BNV', 'folio'=>'1', 'date'=>$now, 'zip'=>'42501', 'payment_form'=>'99', 'payment_method'=>'PPD', 'issuer'=>$issuer, 'receiver'=>$receiver,
    'items'=>[['prod'=>'43211503', 'sku'=>'LAP-14', 'qty'=>3, 'unit'=>'H87', 'unit_name'=>'Pieza', 'desc'=>'Laptop 14" | uso corporativo', 'value'=>18450.5, 'objeto'=>'02', 'rate'=>0.16],
              ['prod'=>'81112501', 'qty'=>1, 'unit'=>'E48', 'unit_name'=>'Unidad de servicio', 'desc'=>'Configuración e inventario', 'value'=>2500, 'objeto'=>'02', 'rate'=>0.16]]];
$built = CfdiXml::build($invoice);
$errors = CfdiXml::validate($built['xml']);
$check('ingreso validates against cfdv40.xsd', $errors === [], implode(' | ', array_slice($errors, 0, 3)));
$check('ingreso totals', abs($built['total'] - 67107.74) < 0.005, (string) $built['total']);
$check('pipe removed from free text', !str_contains($built['xml'], '| uso'), 'pipe leaked');

$complement = ['type'=>'P', 'series'=>'CP', 'folio'=>'1', 'date'=>$now, 'zip'=>'42501', 'issuer'=>$issuer, 'receiver'=>['use'=>'CP01'] + $receiver,
    'payments'=>[['date'=>$now, 'form'=>'03', 'amount'=>30000, 'docs'=>[['uuid'=>'5FB2822E-396D-4725-8521-CDC4BDD20CCF', 'series'=>'BNV', 'folio'=>'1', 'parcialidad'=>1,
        'saldo_ant'=>67106.74, 'pagado'=>30000, 'base'=>25862.07, 'rate'=>0.16, 'tax'=>4137.93]]]]];
$errors = CfdiXml::validate(CfdiXml::build($complement)['xml']);
$check('pagos 2.0 validates against Pagos20.xsd', $errors === [], implode(' | ', array_slice($errors, 0, 3)));

// Catalogue rules.
$check('uses for 626 fisica exclude CP01', !isset(SatCatalog::usesFor('626', 'fisica')['CP01']));
$check('postal info 06300 is CDMX', (SatCatalog::postalInfo('06300')['state'] ?? '') === 'CMX');
try { SatCatalog::validateReceiver(['rfc'=>'XAXX010101000', 'name'=>'PUBLICO', 'zip'=>'06300', 'regime'=>'616', 'use'=>'S01']); $check('generic receiver rejected', false); } catch (RuntimeException) {}

// CSD inspection with generated certificates. OpenSSL on Windows needs an
// explicit config file, so the test ships a minimal one.
$cnf = tempnam(sys_get_temp_dir(), 'bnv'); file_put_contents($cnf, "[ req ]
distinguished_name = req_dn
[ req_dn ]
");
$GLOBALS['cnf'] = ['config'=>$cnf];
function make_cert(string $rfc, bool $withOu, int $days, string $password, ?OpenSSLAsymmetricKey &$key = null, bool $satSerial = true): array {
    $key = openssl_pkey_new(['private_key_bits'=>2048, 'private_key_type'=>OPENSSL_KEYTYPE_RSA] + $GLOBALS['cnf']);
    $dn = ['commonName'=>'ESCUELA KEMPER URGATE', 'x500UniqueIdentifier'=>$rfc . ' / VADA800927HSRSRL05', 'organizationName'=>'ESCUELA KEMPER URGATE'];
    if ($withOu) $dn['organizationalUnitName'] = 'Sucursal 1';
    $csr = openssl_csr_new($dn, $key, ['digest_alg'=>'sha256'] + $GLOBALS['cnf']);
    // SAT certificate numbers are 20 digits carried as the ASCII bytes of the serial.
    $serialHex = bin2hex('30001000000' . str_pad((string) random_int(0, 999999999), 9, '0', STR_PAD_LEFT));
    $cert = $satSerial ? openssl_csr_sign($csr, null, $key, $days, ['digest_alg'=>'sha256'] + $GLOBALS['cnf'], 0, $serialHex)
        : openssl_csr_sign($csr, null, $key, $days, ['digest_alg'=>'sha256'] + $GLOBALS['cnf'], random_int(1000, 999999));
    openssl_x509_export($cert, $certPem);
    openssl_pkey_export($key, $keyPem, $password, ['encrypt_key_cipher'=>OPENSSL_CIPHER_AES_256_CBC] + $GLOBALS['cnf']);
    $der = base64_decode(preg_replace('/-----[^-]+-----|\s/', '', $certPem));
    $keyDer = base64_decode(preg_replace('/-----[^-]+-----|\s/', '', $keyPem));
    return [$der, $keyDer];
}
$expectFail = function (string $label, callable $fn, string $needle) use ($check) {
    try { $fn(); $check($label, false, 'accepted'); } catch (RuntimeException $e) { $check($label, str_contains($e->getMessage(), $needle), $e->getMessage()); }
};
// The SAT's public test CSD is accepted where the test CA is trusted, and
// refused in production; generated certificates are never SAT-signed.
$fixture = __DIR__ . '/fixtures/sat-test-csd/EKU9003173C9';
$satCer = base64_decode((string) preg_replace('/-----[^-]+-----|\s/', '', (string) file_get_contents($fixture . '.cer.pem')));
$satKey = (string) file_get_contents($fixture . '.key');
$info = Csd::inspect($satCer, $satKey, '12345678a', 'EKU9003173C9', null, true);
$check('SAT test CSD accepted', $info['rfc'] === 'EKU9003173C9' && $info['branch'] === 'Sucursal 1' && $info['number'] === '30001000000500003416' && strlen($info['fingerprint']) === 64, json_encode($info['number']));
$expectFail('SAT test CA refused in production', fn() => Csd::inspect($satCer, $satKey, '12345678a', 'EKU9003173C9'), 'firmado por el SAT');
[$cer, $keyDer] = make_cert('EKU9003173C9', true, 365, 's3cret');
$expectFail('self-signed certificate refused', fn() => Csd::inspect($cer, $keyDer, 's3cret', 'EKU9003173C9', null, true), 'firmado por el SAT');
$expectFail('wrong password rejected', fn() => Csd::inspect($cer, $keyDer, 'nope', 'EKU9003173C9'), 'contraseña');
$expectFail('other company rejected', fn() => Csd::inspect($cer, $keyDer, 's3cret', 'URE180429TM6'), 'pertenece');
[, $otherKey] = make_cert('EKU9003173C9', true, 365, 's3cret');
$expectFail('mismatched key rejected', fn() => Csd::inspect($cer, $otherKey, 's3cret', 'EKU9003173C9'), 'no corresponde');
[$fiel, $fielKey] = make_cert('EKU9003173C9', false, 365, 's3cret');
$expectFail('e.firma rejected', fn() => Csd::inspect($fiel, $fielKey, 's3cret', 'EKU9003173C9'), 'e.firma');
$expectFail('expired rejected', fn() => Csd::inspect($cer, $keyDer, 's3cret', 'EKU9003173C9', time() + 400 * 86400), 'venció');
[$foreign, $foreignKey] = make_cert('EKU9003173C9', true, 365, 's3cret', $unused, false);
$expectFail('non-SAT certificate rejected', fn() => Csd::inspect($foreign, $foreignKey, 's3cret', 'EKU9003173C9'), 'SAT');
$check('certificate number from serial', Csd::number('3330303031303030303030353030303033343136') === '30001000000500003416');

// Live stamp in SW's test environment (opt-in).
if (in_array('--live', $argv, true)) {
    $envFile = getenv('BUYNIVERSE_SW_TEST_ENV_FILE') ?: '';
    $env = [];
    foreach (is_file($envFile) ? file($envFile, FILE_IGNORE_NEW_LINES) : [] as $line) {
        if (preg_match('/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/', $line, $m) === 1) $env[$m[1]] = trim($m[2], " \t\"'");
    }
    if (($env['SW_ENV'] ?? '') !== 'test' || empty($env['SW_TOKEN'])) { $failures[] = 'live: SW test token unavailable or not a test environment'; }
    else {
        $sw = new SwPacProvider(['environment'=>'test', 'token'=>$env['SW_TOKEN']]);
        try {
            $invoice['folio'] = (string) random_int(100000, 999999);
            $stamp = $sw->issueXml(CfdiXml::build($invoice)['xml']);
            $check('live stamp uuid', preg_match('/^[0-9A-F-]{36}$/', $stamp['uuid']) === 1, $stamp['uuid']);
            $check('live stamp has TFD', str_contains($stamp['xml'], 'TimbreFiscalDigital'));
            $results['liveUuid'] = $stamp['uuid'];
            $cancel = $sw->cancel('EKU9003173C9', $stamp['uuid'], '02');
            $results['liveCancel'] = $cancel['code'] . ' ' . $cancel['status'];
        } catch (Throwable $e) { $failures[] = 'live: ' . $e->getMessage(); }
    }
}

echo json_encode(['failures'=>$failures, 'results'=>$results], JSON_UNESCAPED_UNICODE), PHP_EOL;
exit($failures ? 1 : 0);
