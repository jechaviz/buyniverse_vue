<?php
declare(strict_types=1);
namespace Buyniverse\Cfdi;

use PDO;
use RuntimeException;

/**
 * CFDI issuance for Buyniverse's multi-issuer marketplace, adapted from
 * garlo's Rey\CfdiService: series and folios per company x document kind x
 * issuing place, role-based permissions, income invoices, payment
 * complements (Pagos 2.0), credit notes and cancellations. Totals are
 * computed on the server, XML is validated against the SAT XSDs before
 * stamping, and the stamped XML is stored encrypted.
 */
final class CfdiService {
    public const KINDS = ['I'=>'Ingreso', 'E'=>'Egreso', 'P'=>'Pago', 'G'=>'Global'];
    private const DEFAULT_SERIES = ['I'=>'F', 'E'=>'NC', 'P'=>'CP', 'G'=>'FG'];

    /**
     * Permissions of the signed-in principal on the current company.
     * manage: owner/admin (series, cancellations, manual folio, back-dating);
     * issue: managers and the supplier role; a location-scoped membership
     * issues only from its own location; view: any member of the company.
     */
    public static function permissions(PDO $pdo, array $context): array {
        $rows = $pdo->prepare('SELECT role_key, scope_kind, legal_entity_id, location_id FROM tenant_memberships WHERE tenant_id = ? AND principal_id = ? AND status = "active"');
        $rows->execute([$context['tenant']['id'], $context['principalId']]);
        $companyId = (string) $context['company']['id'];
        $out = ['view'=>false, 'issue'=>false, 'manage'=>false, 'locations'=>null];
        foreach ($rows->fetchAll() as $role) {
            $applies = $role['scope_kind'] === 'tenant' || (string) $role['legal_entity_id'] === $companyId;
            if (!$applies) continue;
            $out['view'] = true;
            $issuer = in_array($role['role_key'], ['owner', 'admin', 'supplier'], true);
            if ($role['scope_kind'] === 'location') {
                if ($issuer) { $out['issue'] = true; $out['locations'] = array_merge($out['locations'] ?? [], [(string) $role['location_id']]); }
                continue;
            }
            if ($issuer) { $out['issue'] = true; $out['locations'] = null; }
            if (in_array($role['role_key'], ['owner', 'admin'], true)) $out['manage'] = true;
        }
        if ($out['manage']) $out['locations'] = null;
        return $out;
    }

    public static function require(array $permissions, string $permission, ?string $locationId = null): void {
        if (empty($permissions[$permission])) throw new RuntimeException('Tu rol no permite esta acción en la facturación de esta empresa.', 403);
        if ($permission === 'issue' && is_array($permissions['locations']) && !in_array((string) $locationId, $permissions['locations'], true))
            throw new RuntimeException('Tu rol emite solo desde tu sucursal asignada.', 403);
    }

    /** Issuer data and readiness for the current company. */
    public static function issuer(PDO $pdo, array $context): array {
        $row = $pdo->prepare('SELECT e.legal_name, e.rfc, e.tax_regime, e.fiscal_postal_code, e.country_code, p.issuance_mode, p.connector_key, p.status, p.certificate_number, p.certificate_valid_to
            FROM tenant_legal_entities e LEFT JOIN tenant_fiscal_profiles p ON p.tenant_id = e.tenant_id AND p.legal_entity_id = e.id WHERE e.id = ? AND e.tenant_id = ? LIMIT 1');
        $row->execute([$context['company']['id'], $context['tenant']['id']]); $e = $row->fetch();
        if (!is_array($e) || $e['country_code'] !== 'MX') throw new RuntimeException('La emisión de CFDI aplica a empresas mexicanas.', 409);
        $ready = $e['issuance_mode'] === 'buyniverse' && $e['status'] === 'ready' && in_array($e['connector_key'], ['sw', 'odoo_fiax'], true);
        return ['rfc'=>(string) $e['rfc'], 'name'=>SatCatalog::normalizeName((string) $e['legal_name']), 'regime'=>(string) $e['tax_regime'], 'zip'=>(string) $e['fiscal_postal_code'],
            'ready'=>$ready, 'certificate'=>$e['certificate_number'], 'certificateValidTo'=>$e['certificate_valid_to'], 'mode'=>(string) ($e['issuance_mode'] ?? 'external')];
    }

    /** Most specific active rule: place, then company; without rules, the default letters. */
    public static function rule(PDO $pdo, array $context, string $kind, ?string $locationId): ?array {
        $rows = $pdo->prepare('SELECT * FROM cfdi_series WHERE tenant_id = ? AND legal_entity_id = ? AND doc_kind = ? AND active = 1 AND (location_id = ? OR location_id IS NULL) ORDER BY location_id IS NULL, created_at LIMIT 1');
        $rows->execute([$context['tenant']['id'], $context['company']['id'], $kind, $locationId]);
        $row = $rows->fetch();
        return is_array($row) ? $row : null;
    }

    /** Series and next folio. A rule with its own folio counts on its own key. */
    public static function number(PDO $pdo, array $context, string $kind, ?string $locationId, bool $peek = false, ?string $manualFolio = null): array {
        $rule = self::rule($pdo, $context, $kind, $locationId);
        $series = $rule ? (string) $rule['series'] : self::DEFAULT_SERIES[$kind];
        $key = $rule && (int) $rule['own_folio'] ? 'S#' . $rule['id'] : $series;
        $start = $rule && (int) $rule['own_folio'] ? max(1, (int) $rule['start_folio']) : 1;
        $tenant = $context['tenant']['id']; $entity = $context['company']['id'];
        $taken = $pdo->prepare('SELECT 1 FROM cfdi_documents WHERE tenant_id = ? AND legal_entity_id = ? AND series = ? AND folio = ? LIMIT 1');
        if ($manualFolio !== null) {
            if (preg_match('/^\d{1,20}$/', $manualFolio) !== 1) throw new RuntimeException('El folio debe ser numérico.', 400);
            $manualFolio = ltrim($manualFolio, '0') ?: '0';
            $taken->execute([$tenant, $entity, $series, $manualFolio]);
            if ($taken->fetchColumn()) throw new RuntimeException('El folio ' . $series . $manualFolio . ' ya está ocupado; elige uno libre.', 409);
            return ['series'=>$series, 'folio'=>$manualFolio, 'ruleId'=>$rule['id'] ?? null];
        }
        $current = $pdo->prepare('SELECT last_folio FROM cfdi_folios WHERE tenant_id = ? AND legal_entity_id = ? AND series_key = ?' . ($peek ? '' : ' FOR UPDATE'));
        $current->execute([$tenant, $entity, $key]); $last = $current->fetchColumn();
        $next = $last === false ? $start : (int) $last + 1;
        for ($guard = 0; $guard < 1000; $guard++, $next++) { $taken->execute([$tenant, $entity, $series, (string) $next]); if (!$taken->fetchColumn()) break; }
        if (!$peek) {
            $pdo->prepare($last === false ? 'INSERT INTO cfdi_folios (last_folio, tenant_id, legal_entity_id, series_key) VALUES (?, ?, ?, ?)' : 'UPDATE cfdi_folios SET last_folio = ? WHERE tenant_id = ? AND legal_entity_id = ? AND series_key = ?')
                ->execute([$next, $tenant, $entity, $key]);
        }
        return ['series'=>$series, 'folio'=>(string) $next, 'ruleId'=>$rule['id'] ?? null];
    }

    public static function seriesList(PDO $pdo, array $context): array {
        $rows = $pdo->prepare('SELECT id, location_id, doc_kind, series, own_folio, start_folio, active, notes FROM cfdi_series WHERE tenant_id = ? AND legal_entity_id = ? ORDER BY doc_kind, location_id IS NULL, created_at');
        $rows->execute([$context['tenant']['id'], $context['company']['id']]);
        $rules = $rows->fetchAll();
        $preview = [];
        foreach (array_keys(self::KINDS) as $kind) $preview[$kind] = self::number($pdo, $context, $kind, null, true);
        return ['rules'=>$rules, 'preview'=>$preview, 'defaults'=>self::DEFAULT_SERIES];
    }

    public static function seriesSave(PDO $pdo, array $context, array $input): array {
        $kind = (string) ($input['docKind'] ?? '');
        if (!isset(self::KINDS[$kind])) throw new RuntimeException('Tipo de documento inválido.', 400);
        $series = strtoupper(trim((string) ($input['series'] ?? '')));
        if (preg_match('/^[A-Z0-9]{1,25}$/', $series) !== 1) throw new RuntimeException('La serie admite de 1 a 25 letras o números, sin espacios.', 400);
        $location = $input['locationId'] ?? null;
        if ($location !== null) {
            $valid = false;
            foreach ($context['companies'] as $company) if ($company['id'] === $context['company']['id']) foreach ($company['locations'] as $place) if ($place['id'] === $location) $valid = true;
            if (!$valid) throw new RuntimeException('El lugar de emisión no pertenece a la empresa.', 400);
        }
        $own = !empty($input['ownFolio']) ? 1 : 0; $start = max(1, (int) ($input['startFolio'] ?? 1)); $active = !isset($input['active']) || !empty($input['active']) ? 1 : 0;
        $id = isset($input['id']) && preg_match('/^[a-f0-9-]{36}$/', (string) $input['id']) === 1 ? (string) $input['id'] : null;
        $dup = $pdo->prepare('SELECT id FROM cfdi_series WHERE tenant_id = ? AND legal_entity_id = ? AND doc_kind = ? AND COALESCE(location_id, "") = ? AND active = 1 AND id <> ? LIMIT 1');
        $dup->execute([$context['tenant']['id'], $context['company']['id'], $kind, (string) ($location ?? ''), (string) ($id ?? '')]);
        if ($active && $dup->fetchColumn()) throw new RuntimeException('Ya hay una serie activa para ese tipo y lugar de emisión.', 409);
        if ($id) {
            $old = $pdo->prepare('SELECT start_folio FROM cfdi_series WHERE id = ? AND tenant_id = ? AND legal_entity_id = ?');
            $old->execute([$id, $context['tenant']['id'], $context['company']['id']]); $previous = $old->fetchColumn();
            if ($previous === false) throw new RuntimeException('Serie no encontrada.', 404);
            $used = $pdo->prepare('SELECT 1 FROM cfdi_folios WHERE tenant_id = ? AND legal_entity_id = ? AND series_key = ?');
            $used->execute([$context['tenant']['id'], $context['company']['id'], 'S#' . $id]);
            if ($own && (int) $previous !== $start && $used->fetchColumn()) throw new RuntimeException('Esta serie ya emitió folios; su folio inicial no se puede cambiar.', 409);
            $pdo->prepare('UPDATE cfdi_series SET location_id = ?, doc_kind = ?, series = ?, own_folio = ?, start_folio = ?, active = ?, notes = ? WHERE id = ? AND tenant_id = ? AND legal_entity_id = ?')
                ->execute([$location, $kind, $series, $own, $start, $active, mb_substr(trim((string) ($input['notes'] ?? '')), 0, 240) ?: null, $id, $context['tenant']['id'], $context['company']['id']]);
        } else {
            $id = self::uuid();
            $pdo->prepare('INSERT INTO cfdi_series (id, tenant_id, legal_entity_id, location_id, doc_kind, series, own_folio, start_folio, active, notes, created_by_principal_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                ->execute([$id, $context['tenant']['id'], $context['company']['id'], $location, $kind, $series, $own, $start, $active, mb_substr(trim((string) ($input['notes'] ?? '')), 0, 240) ?: null, $context['principalId']]);
        }
        return self::seriesList($pdo, $context);
    }

    /** Concepts validated against the SAT catalogues. */
    public static function items(array $raw): array {
        if (!$raw || count($raw) > 200) throw new RuntimeException('Agrega entre 1 y 200 conceptos.', 400);
        $items = [];
        foreach ($raw as $i => $item) {
            $prod = (string) ($item['prod'] ?? ''); $unit = strtoupper((string) ($item['unit'] ?? ''));
            if (!SatCatalog::prodServ($prod)) throw new RuntimeException('Concepto ' . ($i + 1) . ': clave de producto o servicio inexistente en el SAT.', 400);
            if (!SatCatalog::unit($unit)) throw new RuntimeException('Concepto ' . ($i + 1) . ': clave de unidad inexistente en el SAT.', 400);
            $qty = (float) ($item['qty'] ?? 0); $value = (float) ($item['value'] ?? -1);
            if ($qty <= 0 || $value < 0 || $qty > 1e9 || $value > 1e12) throw new RuntimeException('Concepto ' . ($i + 1) . ': cantidad o precio inválido.', 400);
            $objeto = in_array($item['objeto'] ?? '02', ['01', '02', '03', '04'], true) ? (string) ($item['objeto'] ?? '02') : '02';
            $rate = in_array((string) ($item['rate'] ?? '0.16'), ['0.16', '0.08', '0', '0.0'], true) ? (float) $item['rate'] : 0.16;
            $desc = trim((string) ($item['desc'] ?? ''));
            if ($desc === '') throw new RuntimeException('Concepto ' . ($i + 1) . ': escribe la descripción.', 400);
            $items[] = ['prod'=>$prod, 'unit'=>$unit, 'unit_name'=>mb_substr((string) ($item['unitName'] ?? ''), 0, 20) ?: null, 'sku'=>mb_substr((string) ($item['sku'] ?? ''), 0, 100) ?: null,
                'desc'=>mb_substr($desc, 0, 1000), 'qty'=>$qty, 'value'=>$value, 'objeto'=>$objeto, 'rate'=>$rate];
        }
        return $items;
    }

    public static function uuid(): string {
        $b = random_bytes(16); $b[6] = chr((ord($b[6]) & 0x0f) | 0x40); $b[8] = chr((ord($b[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));
    }
}
