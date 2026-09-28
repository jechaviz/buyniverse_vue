<?php
declare(strict_types=1);
namespace Buyniverse\Cfdi;

use RuntimeException;

/**
 * SAT CFDI 4.0 catalogues (cfdi/sat/*.json, extracted from the official
 * catCFDI) and the receiver rules. Ported from garlo's Rey\Sat.
 */
final class SatCatalog {
    public const PUBLIC_RFC = 'XAXX010101000';
    public const FOREIGN_RFC = 'XEXX010101000';
    /** CP01 exists only in payment complements; G02 only in credit notes. */
    public const NOT_FOR_SALES = ['CP01', 'G02'];
    private static array $cache = [];

    private static function load(string $name): array {
        if (!isset(self::$cache[$name])) {
            $raw = @file_get_contents(__DIR__ . '/sat/' . $name . '.json');
            $data = is_string($raw) ? json_decode($raw, true) : null;
            if (!is_array($data)) throw new RuntimeException('SAT catalogue unavailable: ' . $name);
            self::$cache[$name] = $data;
        }
        return self::$cache[$name];
    }

    public static function catalogs(): array { return self::load('catalogos'); }
    public static function prodServ(string $code): ?string { return self::load('clave_prod_serv')[$code] ?? null; }
    public static function unit(string $code): ?string { return self::load('clave_unidad')[$code] ?? null; }

    public static function zipExists(string $zip): bool {
        static $set = null;
        $set ??= array_flip(self::load('codigo_postal'));
        return isset($set[$zip]);
    }

    /** State, municipality, city and neighbourhoods for a postal code (app/data/sat/cp/NN.json). */
    public static function postalInfo(string $zip): ?array {
        if (preg_match('/^\d{5}$/', $zip) !== 1) return null;
        static $files = [];
        $prefix = substr($zip, 0, 2);
        if (!array_key_exists($prefix, $files)) {
            $raw = @file_get_contents(dirname(__DIR__) . '/app/data/sat/cp/' . $prefix . '.json');
            $files[$prefix] = is_string($raw) ? (json_decode($raw, true) ?: []) : [];
        }
        $row = $files[$prefix][$zip] ?? null;
        return is_array($row) ? ['state'=>$row[0], 'stateName'=>$row[1], 'municipality'=>$row[2], 'city'=>$row[3], 'neighborhoods'=>$row[4] ?? []] : null;
    }

    public static function personType(string $rfc): ?string {
        $rfc = mb_strtoupper(trim($rfc), 'UTF-8');
        if (preg_match('/^[A-Z&Ñ]{4}\d{6}[A-Z0-9]{3}$/u', $rfc) === 1) return 'fisica';
        if (preg_match('/^[A-Z&Ñ]{3}\d{6}[A-Z0-9]{3}$/u', $rfc) === 1) return 'moral';
        return null;
    }

    /** CFDI 4.0: the name must match the tax certificate, without the corporate suffix. */
    public static function normalizeName(string $name): string {
        $n = mb_strtoupper(trim((string) preg_replace('/\s+/u', ' ', $name)), 'UTF-8');
        $n = (string) preg_replace('/[,\s]+(S\.?\s?A\.?\s?P\.?\s?I\.?|S\.?\s?A\.?\s?B\.?|S\.?\s?A\.?|S\.?\s?DE\s?R\.?\s?L\.?|S\.?\s?C\.?|A\.?\s?C\.?|S\.?\s?A\.?\s?S\.?)(\s+DE\s+C\.?\s?V\.?)?\.?$/u', '', $n);
        return trim($n, ' ,.');
    }

    /** Validates a receiver against the catalogues; returns normalized data or throws. */
    public static function validateReceiver(array $receiver, ?string $use = null, bool $sale = true): array {
        $rfc = mb_strtoupper(trim((string) ($receiver['rfc'] ?? '')), 'UTF-8');
        $type = self::personType($rfc);
        if (!$type) throw new RuntimeException('RFC del receptor con formato inválido.');
        if (in_array($rfc, [self::PUBLIC_RFC, self::FOREIGN_RFC], true)) throw new RuntimeException('Para público en general se emite una factura global.');
        $name = self::normalizeName((string) ($receiver['name'] ?? ''));
        if (mb_strlen($name) < 2) throw new RuntimeException('Escribe la razón social del receptor tal como aparece en su Constancia de Situación Fiscal.');
        $zip = trim((string) ($receiver['zip'] ?? ''));
        if (preg_match('/^\d{5}$/', $zip) !== 1 || !self::zipExists($zip)) throw new RuntimeException('El código postal fiscal del receptor no existe en el catálogo del SAT.');
        $regimes = self::catalogs()['regimen_fiscal'] ?? [];
        $regime = (string) ($receiver['regime'] ?? '');
        if (!isset($regimes[$regime])) throw new RuntimeException('Régimen fiscal del receptor inválido.');
        if (empty($regimes[$regime][$type])) throw new RuntimeException('El régimen ' . $regime . ' no aplica para persona ' . $type . '.');
        $use = (string) ($use ?: ($receiver['use'] ?? ''));
        $uses = self::catalogs()['uso_cfdi'] ?? [];
        if (!isset($uses[$use])) throw new RuntimeException('Uso de CFDI inválido.');
        if ($sale && in_array($use, self::NOT_FOR_SALES, true)) throw new RuntimeException('El uso ' . $use . ' no se permite en una factura de venta.');
        if (empty($uses[$use][$type])) throw new RuntimeException('El uso ' . $use . ' no aplica para persona ' . $type . '.');
        if (!empty($uses[$use]['regimenes']) && !in_array($regime, $uses[$use]['regimenes'], true)) throw new RuntimeException('El uso ' . $use . ' no es compatible con el régimen ' . $regime . '.');
        return ['rfc'=>$rfc, 'name'=>$name, 'zip'=>$zip, 'regime'=>$regime, 'use'=>$use, 'type'=>$type];
    }

    /** CFDI uses allowed for a regime and person type (dependent selects). */
    public static function usesFor(string $regime, string $type): array {
        $out = [];
        foreach (self::catalogs()['uso_cfdi'] ?? [] as $code => $use) {
            if (in_array($code, self::NOT_FOR_SALES, true) || empty($use[$type])) continue;
            if (!empty($use['regimenes']) && !in_array($regime, $use['regimenes'], true)) continue;
            $out[$code] = $use['name'];
        }
        return $out;
    }

    /** Public catalogues for forms. */
    public static function publicCatalogs(): array {
        $c = self::catalogs();
        return ['regimen_fiscal'=>$c['regimen_fiscal'] ?? [], 'uso_cfdi'=>$c['uso_cfdi'] ?? [], 'forma_pago'=>$c['forma_pago'] ?? [],
            'metodo_pago'=>$c['metodo_pago'] ?? [], 'objeto_imp'=>$c['objeto_imp'] ?? [], 'tipo_relacion'=>$c['tipo_relacion'] ?? []];
    }

    /** Search product/service keys for the concept picker. */
    public static function searchProducts(string $query, int $limit = 20): array {
        $query = mb_strtolower(trim($query), 'UTF-8'); $out = [];
        if (mb_strlen($query) < 3) return [];
        foreach (self::load('clave_prod_serv') as $code => $name) {
            if (str_starts_with((string) $code, $query) || str_contains(mb_strtolower((string) $name, 'UTF-8'), $query)) {
                $out[] = ['code'=>(string) $code, 'name'=>$name];
                if (count($out) >= $limit) break;
            }
        }
        return $out;
    }
}
