<?php
declare(strict_types=1);
namespace Buyniverse\Cfdi;

use RuntimeException;

/**
 * Inspects a SAT Certificado de Sello Digital (.cer + .key + password) before
 * it is stored or sent to the PAC: the key must decrypt and match the
 * certificate, the certificate must belong to the company RFC, be current,
 * and be a CSD rather than an e.firma (which the SAT forbids for stamping).
 */
final class Csd {
    public static function pem(string $der, string $label): string {
        return "-----BEGIN {$label}-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END {$label}-----\n";
    }

    /** SAT NoCertificado: the X.509 serial number is the certificate number in ASCII. */
    public static function number(string $serialHex): string {
        $serialHex = strlen($serialHex) % 2 ? '0' . $serialHex : $serialHex;
        $out = '';
        foreach (str_split($serialHex, 2) as $pair) $out .= chr((int) hexdec($pair));
        return $out;
    }

    public static function inspect(string $certificate, string $privateKey, string $password, ?string $expectedRfc = null, ?int $now = null): array {
        if (!function_exists('openssl_x509_read')) throw new RuntimeException('La verificación de certificados no está disponible.');
        $certPem = str_contains($certificate, '-----BEGIN CERTIFICATE-----') ? $certificate : self::pem($certificate, 'CERTIFICATE');
        $cert = @openssl_x509_read($certPem);
        if ($cert === false) throw new RuntimeException('El archivo .cer no es un certificado válido.');
        $info = openssl_x509_parse($cert);
        if (!is_array($info)) throw new RuntimeException('No fue posible leer el certificado.');

        $subject = $info['subject'] ?? [];
        $unique = (string) ($subject['x500UniqueIdentifier'] ?? '');
        $rfc = mb_strtoupper(trim(explode('/', $unique)[0] ?? ''), 'UTF-8');
        if ($rfc === '') throw new RuntimeException('El certificado no contiene un RFC.');
        if ($expectedRfc !== null && !hash_equals(mb_strtoupper($expectedRfc, 'UTF-8'), $rfc)) throw new RuntimeException('El certificado pertenece al RFC ' . $rfc . ', no al de esta empresa.');

        $branch = $subject['OU'] ?? null;
        if ($branch === null) throw new RuntimeException('Este certificado es una e.firma (FIEL). Para facturar se requiere el Certificado de Sello Digital (CSD).');

        $now = $now ?? time();
        $from = (int) ($info['validFrom_time_t'] ?? 0); $to = (int) ($info['validTo_time_t'] ?? 0);
        if ($now < $from) throw new RuntimeException('El certificado aún no entra en vigor.');
        if ($now > $to) throw new RuntimeException('El certificado venció el ' . gmdate('Y-m-d', $to) . '.');

        $keyPem = str_contains($privateKey, '-----BEGIN') ? $privateKey : self::pem($privateKey, 'ENCRYPTED PRIVATE KEY');
        $key = @openssl_pkey_get_private($keyPem, $password);
        if ($key === false) throw new RuntimeException('La contraseña no abre la llave privada, o el archivo .key no es válido.');
        if (!openssl_x509_check_private_key($cert, $key)) throw new RuntimeException('La llave privada no corresponde al certificado.');

        $fingerprint = openssl_x509_fingerprint($cert, 'sha256');
        return [
            'rfc'=>$rfc,
            'name'=>(string) ($subject['name'] ?? $subject['CN'] ?? ''),
            'branch'=>is_array($branch) ? implode(', ', $branch) : (string) $branch,
            'number'=>self::number((string) ($info['serialNumberHex'] ?? '')),
            'validFrom'=>gmdate('c', $from),
            'validTo'=>gmdate('c', $to),
            'fingerprint'=>strtolower((string) $fingerprint),
            'certificateBase64'=>base64_encode(str_contains($certificate, '-----BEGIN') ? (string) base64_decode(preg_replace('/-----[^-]+-----|\s/', '', $certificate)) : $certificate),
            'keyBase64'=>base64_encode(str_contains($privateKey, '-----BEGIN') ? (string) base64_decode(preg_replace('/-----[^-]+-----|\s/', '', $privateKey)) : $privateKey),
        ];
    }
}
