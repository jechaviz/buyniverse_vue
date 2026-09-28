<?php
declare(strict_types=1);
namespace Buyniverse\Cfdi;

use RuntimeException;

/**
 * PAC adapters, ported from garlo (Rey\Pac\SwPacProvider / MockPacProvider).
 * Buyniverse is multi-issuer: every supplier company uploads its own CSD to
 * the platform's SW account, and SW seals each XML with the CSD that matches
 * the Emisor RFC. Credentials come from the 0600 runtime configuration:
 *   'cfdi' => ['provider'=>'sw', 'sw'=>['environment'=>'test|production', 'token'=>..., 'user'=>..., 'password'=>...]]
 */
interface PacProvider {
    public function name(): string;
    public function issueXml(string $xml): array;
    public function cancel(string $issuerRfc, string $uuid, string $motive, ?string $substitution = null): array;
    public function saveCertificate(string $b64Cer, string $b64Key, string $password): array;
    public function pdf(string $xml, array $extras = []): string;
}

function pac_tls(): array {
    $ini = (string) ini_get('curl.cainfo');
    if ($ini !== '' && is_file($ini)) return [];
    foreach (['/etc/ssl/certs/ca-certificates.crt', '/etc/pki/tls/certs/ca-bundle.crt', '/etc/ssl/cert.pem'] as $f) if (is_file($f)) return [CURLOPT_CAINFO=>$f];
    return defined('CURLSSLOPT_NATIVE_CA') ? [CURLOPT_SSL_OPTIONS=>CURLSSLOPT_NATIVE_CA] : [];
}

final class SwPacProvider implements PacProvider {
    private string $base; private string $api; private ?string $token = null;

    public function __construct(private array $config) {
        $prod = in_array(strtolower((string) ($config['environment'] ?? 'test')), ['prod', 'production', 'live'], true);
        $this->base = rtrim((string) ($config['base_url'] ?? ($prod ? 'https://services.sw.com.mx' : 'https://services.test.sw.com.mx')), '/');
        $this->api = rtrim((string) ($config['api_url'] ?? ($prod ? 'https://api.sw.com.mx' : 'https://api.test.sw.com.mx')), '/');
        $token = trim((string) ($config['token'] ?? '')); if ($token !== '') $this->token = $token;
    }

    public function name(): string { return 'sw'; }
    public function environment(): string { return (string) ($this->config['environment'] ?? 'test'); }
    public function configured(): bool { return $this->token !== null || (trim((string) ($this->config['user'] ?? '')) !== '' && (string) ($this->config['password'] ?? '') !== ''); }

    /** Seal + stamp an unsealed CFDI 4.0 XML. */
    public function issueXml(string $xml): array {
        $res = $this->decode($this->multipart($this->base . '/cfdi33/issue/v4', 'xml', $xml), 'SW devolvió una respuesta inválida al timbrar.');
        if (strtolower((string) ($res['status'] ?? '')) !== 'success') {
            $msg = trim((string) ($res['message'] ?? '') . ' ' . (string) ($res['messageDetail'] ?? ''));
            // 307: already stamped (idempotent retry); SW returns the original stamp.
            if (!(str_contains($msg, '307') && !empty($res['data']['cfdi']))) throw new RuntimeException('SW: ' . ($msg ?: 'no fue posible timbrar el CFDI.'));
        }
        $d = (array) ($res['data'] ?? []); $uuid = strtoupper((string) ($d['uuid'] ?? ''));
        if ($uuid === '' || empty($d['cfdi'])) throw new RuntimeException('SW no devolvió UUID ni XML timbrado.');
        return ['uuid'=>$uuid, 'xml'=>(string) $d['cfdi'], 'stamped_at'=>$d['fechaTimbrado'] ?? null, 'sat_certificate'=>$d['noCertificadoSAT'] ?? null,
            'cfd_certificate'=>$d['noCertificadoCFDI'] ?? null, 'provider'=>'sw', 'simulated'=>false];
    }

    public function cancel(string $issuerRfc, string $uuid, string $motive, ?string $substitution = null): array {
        $uuid = strtoupper(trim($uuid)); $rfc = strtoupper(trim($issuerRfc));
        if ($uuid === '' || $rfc === '') throw new RuntimeException('RFC emisor y UUID son requeridos para cancelar.');
        if (!in_array($motive, ['01', '02', '03', '04'], true)) throw new RuntimeException('Motivo de cancelación inválido.');
        $path = '/cfdi33/cancel/' . rawurlencode($rfc) . '/' . rawurlencode($uuid) . '/' . $motive;
        if ($motive === '01') { if (!$substitution) throw new RuntimeException('El motivo 01 requiere el UUID que lo sustituye.'); $path .= '/' . rawurlencode(strtoupper($substitution)); }
        $res = $this->decode($this->request('POST', $this->base . $path, null), 'Respuesta inválida de cancelación SW.');
        $this->assertSuccess($res, 'SW rechazó la cancelación.');
        $codes = (array) ($res['data']['uuid'] ?? []); $code = (string) ($codes[$uuid] ?? $codes[strtolower($uuid)] ?? (reset($codes) ?: ''));
        return ['uuid'=>$uuid, 'code'=>$code, 'status'=>in_array($code, ['201', '202'], true) ? 'cancel_requested' : 'cancel_error', 'provider'=>'sw'];
    }

    public function saveCertificate(string $b64Cer, string $b64Key, string $password): array {
        if ($b64Cer === '' || $b64Key === '' || $password === '') throw new RuntimeException('Certificado, llave y contraseña son requeridos.');
        $res = $this->decode($this->request('POST', $this->base . '/certificates/save', ['type'=>'stamp', 'b64Cer'=>$b64Cer, 'b64Key'=>$b64Key, 'password'=>$password]), 'Respuesta inválida al cargar el CSD.');
        $this->assertSuccess($res, 'No fue posible cargar el CSD en SW.');
        return ['saved'=>true];
    }

    public function certificates(): array {
        $res = $this->decode($this->request('GET', $this->base . '/certificates', null), 'Respuesta inválida al consultar los CSD.');
        $this->assertSuccess($res, 'No fue posible consultar los CSD en SW.');
        return (array) ($res['data'] ?? []);
    }

    /** SW PDF API (cfdi40 template). */
    public function pdf(string $xml, array $extras = []): string {
        $body = ['xmlContent'=>$xml, 'templateId'=>'cfdi40', 'extras'=>(object) $extras];
        $logo = dirname(__DIR__) . '/assets/brand/buyniverse-mark-512.png';
        if (is_file($logo)) $body['logo'] = base64_encode((string) file_get_contents($logo));
        $res = $this->decode($this->request('POST', $this->api . '/pdf/v1/api/GeneratePdf', $body), 'Respuesta inválida del servicio PDF de SW.');
        $this->assertSuccess($res, 'SW no generó el PDF.');
        $pdf = base64_decode((string) ($res['data']['contentB64'] ?? ''), true);
        if (!$pdf) throw new RuntimeException('SW no devolvió contenido PDF.');
        return $pdf;
    }

    private function bearer(): string {
        if ($this->token) return $this->token;
        $user = trim((string) ($this->config['user'] ?? '')); $password = (string) ($this->config['password'] ?? '');
        if ($user === '' || $password === '') throw new RuntimeException('La facturación SW no está configurada.');
        $res = $this->decode($this->request('POST', $this->base . '/v2/security/authenticate', ['user'=>$user, 'password'=>$password], false), 'Respuesta inválida de autenticación SW.');
        $this->assertSuccess($res, 'No fue posible autenticar con SW.');
        $token = (string) ($res['data']['token'] ?? '');
        if ($token === '') throw new RuntimeException('SW no devolvió token.');
        return $this->token = $token;
    }
    private function curl(string $url, array $opts): string {
        if (!function_exists('curl_init')) throw new RuntimeException('PHP cURL es requerido para SW.');
        $ch = curl_init($url);
        curl_setopt_array($ch, $opts + [CURLOPT_RETURNTRANSFER=>true, CURLOPT_CONNECTTIMEOUT=>15, CURLOPT_TIMEOUT=>90, CURLOPT_SSL_VERIFYPEER=>true, CURLOPT_SSL_VERIFYHOST=>2, CURLOPT_FOLLOWLOCATION=>false] + pac_tls());
        $raw = curl_exec($ch); $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch);
        if ($raw === false) throw new RuntimeException('SW no respondió: ' . $err);
        if ($code >= 500) throw new RuntimeException('SW HTTP ' . $code . '.');
        return (string) $raw; // 4xx bodies carry SW's JSON error (status/message/messageDetail)
    }
    private function request(string $method, string $url, ?array $body, bool $auth = true): string {
        $headers = ['Accept: application/json', 'Content-Type: application/json', 'User-Agent: Buyniverse-CFDI/1'];
        if ($auth) $headers[] = 'Authorization: Bearer ' . $this->bearer();
        $opts = [CURLOPT_CUSTOMREQUEST=>$method, CURLOPT_HTTPHEADER=>$headers];
        if ($body !== null) $opts[CURLOPT_POSTFIELDS] = json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        elseif ($method !== 'GET') { $opts[CURLOPT_POSTFIELDS] = ''; $headers[] = 'Content-Length: 0'; $opts[CURLOPT_HTTPHEADER] = $headers; }
        return $this->curl($url, $opts);
    }
    private function multipart(string $url, string $field, string $content): string {
        $boundary = '----buyniverse' . bin2hex(random_bytes(8));
        $body = "--$boundary\r\nContent-Disposition: form-data; name=\"$field\"; filename=\"cfdi.xml\"\r\nContent-Type: text/xml\r\n\r\n" . $content . "\r\n--$boundary--\r\n";
        return $this->curl($url, [CURLOPT_POST=>true, CURLOPT_POSTFIELDS=>$body, CURLOPT_HTTPHEADER=>['Accept: application/json', 'Authorization: Bearer ' . $this->bearer(), 'Content-Type: multipart/form-data; boundary=' . $boundary]]);
    }
    private function decode(string $raw, string $message): array { $json = json_decode($raw, true); if (!is_array($json)) throw new RuntimeException($message); return $json; }
    private function assertSuccess(array $res, string $message): void {
        if (strtolower((string) ($res['status'] ?? 'success')) === 'success') return;
        $detail = trim((string) ($res['message'] ?? '') . ' ' . (string) ($res['messageDetail'] ?? ''));
        throw new RuntimeException('SW: ' . ($detail !== '' ? $detail : $message));
    }
}

/**
 * Local PAC simulator for demo and tests. Produces a structurally complete
 * CFDI with a TimbreFiscalDigital 1.1; the documents have NO fiscal validity
 * and are always stored with simulated = 1.
 */
final class MockPacProvider implements PacProvider {
    public function name(): string { return 'mock'; }
    public function issueXml(string $xml): array {
        $uuid = strtoupper(sprintf('%08x-%04x-4%03x-%04x-%012x', random_int(0, 0xffffffff), random_int(0, 0xffff), random_int(0, 0xfff), random_int(0x8000, 0xbfff), random_int(0, 0xffffffffffff)));
        $d = new \DOMDocument(); $d->loadXML($xml); $root = $d->documentElement;
        $root->setAttribute('NoCertificado', '30001000000500003416');
        $root->setAttribute('Sello', base64_encode(random_bytes(256)));
        $root->setAttribute('Certificado', 'SIMULADO');
        $ns = 'http://www.sat.gob.mx/TimbreFiscalDigital';
        $comp = null; foreach ($root->childNodes as $n) if ($n instanceof \DOMElement && $n->localName === 'Complemento') $comp = $n;
        if (!$comp) { $comp = $d->createElementNS(CfdiXml::NS, 'cfdi:Complemento'); $root->appendChild($comp); }
        $t = $d->createElementNS($ns, 'tfd:TimbreFiscalDigital');
        $now = (new \DateTime('now', new \DateTimeZone('America/Mexico_City')))->format('Y-m-d\TH:i:s');
        foreach (['Version'=>'1.1', 'UUID'=>$uuid, 'FechaTimbrado'=>$now, 'RfcProvCertif'=>'SPR190613I52', 'SelloCFD'=>substr($root->getAttribute('Sello'), -8), 'NoCertificadoSAT'=>'30001000000500003456', 'SelloSAT'=>base64_encode(random_bytes(256))] as $k => $v) $t->setAttribute($k, $v);
        $comp->appendChild($t);
        return ['uuid'=>$uuid, 'xml'=>(string) $d->saveXML(), 'stamped_at'=>$now, 'sat_certificate'=>'30001000000500003456', 'cfd_certificate'=>'30001000000500003416', 'provider'=>'mock', 'simulated'=>true];
    }
    public function cancel(string $issuerRfc, string $uuid, string $motive, ?string $substitution = null): array { return ['uuid'=>$uuid, 'code'=>'201', 'status'=>'cancelled', 'provider'=>'mock']; }
    public function saveCertificate(string $b64Cer, string $b64Key, string $password): array { return ['saved'=>true, 'simulated'=>true]; }
    public function pdf(string $xml, array $extras = []): string { throw new RuntimeException('El simulador no genera PDF.'); }
}

/**
 * SAT public CFDI status service (ConsultaCFDIService). No credentials.
 * Follows asynchronous cancellations (receiver acceptance) to completion.
 */
final class SatStatus {
    private const URL = 'https://consultaqr.facturaelectronica.sat.gob.mx/ConsultaCFDIService.svc';

    /** "tt" is the total padded to 10 integer + 6 decimal digits. */
    public static function expression(string $issuer, string $receiver, float $total, string $uuid): string {
        return '?re=' . htmlspecialchars($issuer, ENT_XML1) . '&rr=' . htmlspecialchars($receiver, ENT_XML1) . '&tt=' . str_pad(number_format($total, 6, '.', ''), 17, '0', STR_PAD_LEFT) . '&id=' . strtoupper($uuid);
    }

    public static function query(string $issuer, string $receiver, float $total, string $uuid): array {
        $soap = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/"><soapenv:Header/><soapenv:Body><tem:Consulta><tem:expresionImpresa><![CDATA['
            . self::expression($issuer, $receiver, $total, $uuid) . ']]></tem:expresionImpresa></tem:Consulta></soapenv:Body></soapenv:Envelope>';
        $ch = curl_init(self::URL);
        curl_setopt_array($ch, [CURLOPT_POST=>true, CURLOPT_POSTFIELDS=>$soap, CURLOPT_RETURNTRANSFER=>true, CURLOPT_CONNECTTIMEOUT=>10, CURLOPT_TIMEOUT=>30,
            CURLOPT_SSL_VERIFYPEER=>true, CURLOPT_SSL_VERIFYHOST=>2,
            CURLOPT_HTTPHEADER=>['Content-Type: text/xml; charset=utf-8', 'SOAPAction: "http://tempuri.org/IConsultaCFDIService/Consulta"']] + pac_tls());
        $raw = curl_exec($ch); $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch);
        if ($raw === false || $code >= 400) throw new RuntimeException('El servicio de consulta del SAT no respondió (' . ($err ?: 'HTTP ' . $code) . ').');
        $get = fn(string $tag) => preg_match('#<(?:\w+:)?' . $tag . '>([^<]*)</(?:\w+:)?' . $tag . '>#', (string) $raw, $m) ? html_entity_decode($m[1]) : null;
        return ['code'=>$get('CodigoEstatus'), 'state'=>$get('Estado'), 'cancelable'=>$get('EsCancelable'), 'cancel_status'=>$get('EstatusCancelacion'), 'efos'=>$get('ValidacionEFOS')];
    }
}
