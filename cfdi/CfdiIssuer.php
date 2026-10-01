<?php
declare(strict_types=1);
namespace Buyniverse\Cfdi;

use PDO;
use RuntimeException;

/**
 * Stamping operations on top of CfdiService: income invoice (I), payment
 * complement (P, Pagos 2.0), credit note (E) and cancellation. For payment
 * complements the stored `total` holds the amount paid (the CFDI's own Total
 * is always 0), which is what balances and instalments are computed from.
 */
final class CfdiIssuer {
    public function __construct(private PDO $pdo, private array $config, private string $key, private array $context, private PacProvider $pac) {}

    private function now(?string $requested, array $permissions): string {
        $zone = new \DateTimeZone((string) (($this->config['cfdi']['timezone'] ?? null) ?: 'America/Mexico_City'));
        if ($requested === null || $requested === '') return (new \DateTime('now', $zone))->format('Y-m-d\TH:i:s');
        CfdiService::require($permissions, 'manage');
        $date = \DateTime::createFromFormat('Y-m-d\TH:i:s', $requested, $zone);
        $age = $date ? time() - $date->getTimestamp() : -1;
        if (!$date || $age < 0 || $age > 71 * 3600) throw new RuntimeException('La fecha de emisión puede retroceder hasta 71 horas.', 400);
        return $date->format('Y-m-d\TH:i:s');
    }

    private function location(?string $locationId): ?string {
        if ($locationId === null || $locationId === '') return null;
        foreach ($this->context['companies'] as $company) if ($company['id'] === $this->context['company']['id'])
            foreach ($company['locations'] as $place) if ($place['id'] === $locationId) return $locationId;
        throw new RuntimeException('El lugar de emisión no pertenece a la empresa.', 400);
    }

    private function stamp(array $doc, array $row): array {
        $built = CfdiXml::build($doc);
        $errors = CfdiXml::validate($built['xml']);
        if ($errors) throw new RuntimeException('El CFDI no cumple el esquema del SAT: ' . $errors[0], 422);
        $stamp = $this->pac->issueXml($built['xml']);
        $id = CfdiService::uuid(); $tenant = $this->context['tenant']['id']; $entity = $this->context['company']['id'];
        $box = workspace_encrypt($stamp['xml'], $this->key, 'buyniverse-cfdi-v1|' . $tenant . '|' . $stamp['uuid']);
        $this->pdo->prepare('INSERT INTO cfdi_documents (id, tenant_id, legal_entity_id, location_id, cfdi_type, doc_kind, series, folio, uuid, provider, simulated, issuer_rfc, receiver_rfc, receiver_name, currency, subtotal, tax, total,
            payment_method, payment_form, cfdi_use, relation_type, related_uuid, parent_document_id, reference_kind, reference_id, xml_ciphertext, xml_iv, xml_tag, issued_at, created_by_principal_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')->execute([
            $id, $tenant, $entity, $doc['location_id'] ?? null, $doc['type'], $doc['kind'], $doc['series'], $doc['folio'], $stamp['uuid'], $stamp['provider'], empty($stamp['simulated']) ? 0 : 1,
            $doc['issuer']['rfc'], $doc['receiver']['rfc'], $doc['receiver']['name'], $doc['currency'] ?? 'MXN', $row['subtotal'] ?? $built['subtotal'], $row['tax'] ?? $built['tax'], $row['total'] ?? $built['total'],
            $doc['payment_method'] ?? null, $doc['payment_form'] ?? null, $doc['type'] === 'P' ? 'CP01' : ($doc['receiver']['use'] ?? null), $doc['related']['type'] ?? null, $doc['related']['uuids'][0] ?? ($row['related_uuid'] ?? null),
            $row['parent'] ?? null, $row['reference_kind'] ?? null, $row['reference_id'] ?? null, $box[0], $box[1], $box[2], str_replace('T', ' ', $doc['date']), $this->context['principalId']]);
        $balance = $this->pdo->prepare('SELECT stamps_balance FROM tenant_fiscal_profiles WHERE tenant_id = ? AND legal_entity_id = ? FOR UPDATE');
        $balance->execute([$tenant, $entity]); $after = (int) $balance->fetchColumn() - 1;
        $this->pdo->prepare('UPDATE tenant_fiscal_profiles SET stamps_balance = ? WHERE tenant_id = ? AND legal_entity_id = ?')->execute([$after, $tenant, $entity]);
        $this->pdo->prepare('INSERT INTO cfdi_stamp_ledger (tenant_id, legal_entity_id, delta, balance_after, reason, document_id, created_by_principal_id) VALUES (?, ?, -1, ?, ?, ?, ?)')
            ->execute([$tenant, $entity, $after, 'stamp_' . strtolower($doc['type']), $id, $this->context['principalId']]);
        tenant_audit($this->pdo, $this->context, 'cfdi.issued', 'cfdi_documents', $id, ['uuid'=>$stamp['uuid'], 'type'=>$doc['type'], 'series'=>$doc['series'], 'folio'=>$doc['folio'], 'total'=>$row['total'] ?? $built['total'], 'provider'=>$stamp['provider']], $this->key);
        return ['id'=>$id, 'uuid'=>$stamp['uuid'], 'series'=>$doc['series'], 'folio'=>$doc['folio'], 'type'=>$doc['type'], 'total'=>(float) ($row['total'] ?? $built['total']), 'simulated'=>!empty($stamp['simulated'])];
    }

    /** Income invoice. PUE with a real payment form, or PPD with form 99 for credit. */
    public function invoice(array $input, array $permissions): array {
        $location = $this->location($input['locationId'] ?? null);
        CfdiService::require($permissions, 'issue', $location);
        $issuer = CfdiService::issuer($this->pdo, $this->context);
        if (!$issuer['ready']) throw new RuntimeException('El CSD de la empresa aún no está activo en el PAC.', 409);
        $receiver = SatCatalog::validateReceiver(is_array($input['receiver'] ?? null) ? $input['receiver'] : []);
        $items = CfdiService::items(is_array($input['items'] ?? null) ? $input['items'] : []);
        $method = ($input['paymentMethod'] ?? 'PUE') === 'PPD' ? 'PPD' : 'PUE';
        $form = (string) ($input['paymentForm'] ?? ($method === 'PPD' ? '99' : ''));
        if (!isset(SatCatalog::catalogs()['forma_pago'][$form])) throw new RuntimeException('Forma de pago inválida.', 400);
        if ($method === 'PPD' && $form !== '99') throw new RuntimeException('En pago diferido (PPD) la forma de pago es 99 «Por definir».', 400);
        if ($method === 'PUE' && $form === '99') throw new RuntimeException('En pago en una exhibición (PUE) indica la forma de pago real.', 400);
        $date = $this->now($input['issuedAt'] ?? null, $permissions);
        // A manual folio is an administrator's decision, as in garlo.
        $manual = null;
        if (isset($input['folio']) && $input['folio'] !== '') { CfdiService::require($permissions, 'manage'); $manual = (string) $input['folio']; }
        $this->pdo->beginTransaction();
        try {
            $number = CfdiService::number($this->pdo, $this->context, 'I', $location, false, $manual);
            $result = $this->stamp(['type'=>'I', 'kind'=>'I', 'location_id'=>$location, 'series'=>$number['series'], 'folio'=>$number['folio'], 'date'=>$date, 'zip'=>$issuer['zip'],
                'payment_form'=>$form, 'payment_method'=>$method, 'issuer'=>$issuer, 'receiver'=>$receiver, 'items'=>$items, 'currency'=>'MXN',
                'related'=>!empty($input['replaces']) ? ['type'=>'04', 'uuids'=>[strtoupper((string) $input['replaces'])]] : null],
                ['reference_kind'=>preg_match('/^[a-z_]{2,30}$/', (string) ($input['referenceKind'] ?? '')) ? $input['referenceKind'] : null, 'reference_id'=>mb_substr((string) ($input['referenceId'] ?? ''), 0, 120) ?: null]);
            $this->pdo->commit();
            return $result;
        } catch (\Throwable $error) { if ($this->pdo->inTransaction()) $this->pdo->rollBack(); throw $error; }
    }

    private function document(string $uuid): array {
        $row = $this->pdo->prepare('SELECT * FROM cfdi_documents WHERE uuid = ? AND tenant_id = ? AND legal_entity_id = ? LIMIT 1');
        $row->execute([strtoupper($uuid), $this->context['tenant']['id'], $this->context['company']['id']]); $doc = $row->fetch();
        if (!is_array($doc)) throw new RuntimeException('CFDI no encontrado.', 404);
        return $doc;
    }

    private function receiverOf(array $doc): array {
        $xml = $this->xml($doc['uuid']);
        if (preg_match('/<cfdi:Receptor\b([^>]*)\/?>/', $xml, $m) !== 1) throw new RuntimeException('El CFDI no conserva datos del receptor.', 409);
        $attr = fn(string $name) => preg_match('/\b' . $name . '="([^"]*)"/', $m[1], $v) === 1 ? html_entity_decode($v[1], ENT_QUOTES | ENT_XML1, 'UTF-8') : '';
        return ['rfc'=>$attr('Rfc'), 'name'=>$attr('Nombre'), 'zip'=>$attr('DomicilioFiscalReceptor'), 'regime'=>$attr('RegimenFiscalReceptor'), 'use'=>$attr('UsoCFDI')];
    }

    /** Pagos 2.0 for a PPD invoice: instalment number and balances from earlier complements. */
    public function payment(string $uuid, array $input, array $permissions): array {
        $invoice = $this->document($uuid);
        CfdiService::require($permissions, 'issue', $invoice['location_id']);
        if ($invoice['cfdi_type'] !== 'I' || $invoice['payment_method'] !== 'PPD' || $invoice['status'] !== 'valid') throw new RuntimeException('El complemento de pago aplica a facturas PPD vigentes.', 409);
        $issuer = CfdiService::issuer($this->pdo, $this->context);
        $prev = $this->pdo->prepare('SELECT COUNT(*) n, COALESCE(SUM(total), 0) paid FROM cfdi_documents WHERE cfdi_type = "P" AND related_uuid = ? AND tenant_id = ? AND status <> "cancelled"');
        $prev->execute([$invoice['uuid'], $this->context['tenant']['id']]); $before = $prev->fetch();
        $balance = round((float) $invoice['total'] - (float) $before['paid'], 2);
        $amount = round(min((float) ($input['amount'] ?? 0), $balance), 2);
        if ($amount <= 0) throw new RuntimeException('La factura ya está liquidada o el monto es inválido.', 400);
        $form = (string) ($input['paymentForm'] ?? '');
        if ($form === '99' || !isset(SatCatalog::catalogs()['forma_pago'][$form])) throw new RuntimeException('Indica la forma de pago recibida.', 400);
        $paidAt = (string) ($input['paidAt'] ?? '');
        if (preg_match('/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/', $paidAt) !== 1) throw new RuntimeException('Indica la fecha del pago.', 400);
        $paidAt = strlen($paidAt) === 10 ? $paidAt . 'T12:00:00' : (strlen($paidAt) === 16 ? $paidAt . ':00' : $paidAt);
        $share = $amount / (float) $invoice['total']; $tax = round((float) $invoice['tax'] * $share, 2); $base = round($amount - $tax, 2);
        $receiver = ['use'=>'CP01'] + $this->receiverOf($invoice);
        $this->pdo->beginTransaction();
        try {
            $number = CfdiService::number($this->pdo, $this->context, 'P', $invoice['location_id']);
            $result = $this->stamp(['type'=>'P', 'kind'=>'P', 'location_id'=>$invoice['location_id'], 'series'=>$number['series'], 'folio'=>$number['folio'], 'date'=>$this->now(null, $permissions),
                'zip'=>$issuer['zip'], 'issuer'=>$issuer, 'receiver'=>$receiver, 'payments'=>[['date'=>$paidAt, 'form'=>$form, 'amount'=>$amount, 'docs'=>[['uuid'=>$invoice['uuid'], 'series'=>$invoice['series'],
                'folio'=>$invoice['folio'], 'parcialidad'=>(int) $before['n'] + 1, 'saldo_ant'=>$balance, 'pagado'=>$amount, 'base'=>$base, 'rate'=>0.16, 'tax'=>$tax]]]]],
                ['subtotal'=>0, 'tax'=>0, 'total'=>$amount, 'related_uuid'=>$invoice['uuid'], 'parent'=>$invoice['id']]);
            $this->pdo->commit();
            return $result + ['balance'=>round($balance - $amount, 2), 'instalment'=>(int) $before['n'] + 1];
        } catch (\Throwable $error) { if ($this->pdo->inTransaction()) $this->pdo->rollBack(); throw $error; }
    }

    /** Credit note related 01 to a valid income invoice; amount includes VAT. */
    public function creditNote(string $uuid, array $input, array $permissions): array {
        $invoice = $this->document($uuid);
        CfdiService::require($permissions, 'issue', $invoice['location_id']);
        if ($invoice['cfdi_type'] !== 'I' || $invoice['status'] !== 'valid') throw new RuntimeException('Solo se acreditan facturas de ingreso vigentes.', 409);
        $prev = $this->pdo->prepare('SELECT COALESCE(SUM(total), 0) FROM cfdi_documents WHERE cfdi_type = "E" AND related_uuid = ? AND tenant_id = ? AND status <> "cancelled"');
        $prev->execute([$invoice['uuid'], $this->context['tenant']['id']]); $available = round((float) $invoice['total'] - (float) $prev->fetchColumn(), 2);
        $amount = round((float) ($input['amount'] ?? 0), 2);
        if ($amount <= 0 || $amount > $available + 0.001) throw new RuntimeException('El monto excede lo disponible para acreditar (' . number_format($available, 2) . ').', 400);
        $reason = mb_substr(trim((string) ($input['reason'] ?? '')), 0, 200) ?: 'Devolución o descuento';
        $issuer = CfdiService::issuer($this->pdo, $this->context);
        $form = $invoice['payment_form'] && $invoice['payment_form'] !== '99' ? $invoice['payment_form'] : '15';
        $base = round($amount / 1.16, 2);
        $this->pdo->beginTransaction();
        try {
            $number = CfdiService::number($this->pdo, $this->context, 'E', $invoice['location_id']);
            $result = $this->stamp(['type'=>'E', 'kind'=>'E', 'location_id'=>$invoice['location_id'], 'series'=>$number['series'], 'folio'=>$number['folio'], 'date'=>$this->now(null, $permissions),
                'zip'=>$issuer['zip'], 'payment_form'=>$form, 'payment_method'=>'PUE', 'issuer'=>$issuer, 'receiver'=>['use'=>'G02'] + $this->receiverOf($invoice),
                'related'=>['type'=>'01', 'uuids'=>[$invoice['uuid']]], 'items'=>[['prod'=>'84111506', 'qty'=>1, 'unit'=>'ACT', 'unit_name'=>'Actividad', 'desc'=>$reason, 'value'=>$base, 'objeto'=>'02', 'rate'=>0.16]]],
                ['parent'=>$invoice['id']]);
            $this->pdo->commit();
            return $result;
        } catch (\Throwable $error) { if ($this->pdo->inTransaction()) $this->pdo->rollBack(); throw $error; }
    }

    /** Cancellation (managers only). Motive 01 requires the substituting UUID. */
    public function cancel(string $uuid, array $input, array $permissions): array {
        CfdiService::require($permissions, 'manage');
        $doc = $this->document($uuid);
        if (!in_array($doc['status'], ['valid', 'cancel_error'], true)) throw new RuntimeException('Este CFDI ya está cancelado o en proceso.', 409);
        $motive = (string) ($input['motive'] ?? '');
        $substitution = isset($input['substitution']) ? strtoupper((string) $input['substitution']) : null;
        if ($motive === '01' && preg_match('/^[0-9A-F-]{36}$/', (string) $substitution) !== 1) throw new RuntimeException('El motivo 01 requiere el UUID que sustituye al cancelado.', 400);
        $result = $this->pac->cancel($doc['issuer_rfc'], $doc['uuid'], $motive, $substitution);
        $this->pdo->prepare('UPDATE cfdi_documents SET status = ?, cancel_motive = ?, cancel_code = ? WHERE id = ?')->execute([$result['status'], $motive, $result['code'], $doc['id']]);
        tenant_audit($this->pdo, $this->context, 'cfdi.cancel_requested', 'cfdi_documents', $doc['id'], ['uuid'=>$doc['uuid'], 'motive'=>$motive, 'code'=>$result['code'], 'status'=>$result['status']], $this->key);
        return ['uuid'=>$doc['uuid'], 'status'=>$result['status'], 'code'=>$result['code']];
    }

    public function xml(string $uuid): string {
        $doc = $this->document($uuid);
        $xml = openssl_decrypt((string) $doc['xml_ciphertext'], 'aes-256-gcm', $this->key, OPENSSL_RAW_DATA, (string) $doc['xml_iv'], (string) $doc['xml_tag'], 'buyniverse-cfdi-v1|' . $this->context['tenant']['id'] . '|' . $doc['uuid']);
        if (!is_string($xml)) throw new RuntimeException('No fue posible leer el XML.', 500);
        return $xml;
    }

    public static function list(PDO $pdo, array $context, array $filters = []): array {
        $sql = 'SELECT uuid, cfdi_type, series, folio, status, simulated, receiver_rfc, receiver_name, currency, subtotal, tax, total, payment_method, payment_form, related_uuid, issued_at FROM cfdi_documents WHERE tenant_id = ? AND legal_entity_id = ?';
        $args = [$context['tenant']['id'], $context['company']['id']];
        if (in_array($filters['type'] ?? '', ['I', 'E', 'P'], true)) { $sql .= ' AND cfdi_type = ?'; $args[] = $filters['type']; }
        $rows = $pdo->prepare($sql . ' ORDER BY issued_at DESC LIMIT 200'); $rows->execute($args);
        return array_map(fn($r) => ['uuid'=>$r['uuid'], 'type'=>$r['cfdi_type'], 'series'=>$r['series'], 'folio'=>$r['folio'], 'status'=>$r['status'], 'simulated'=>(bool) $r['simulated'],
            'receiverRfc'=>$r['receiver_rfc'], 'receiverName'=>$r['receiver_name'], 'currency'=>$r['currency'], 'subtotal'=>(float) $r['subtotal'], 'tax'=>(float) $r['tax'], 'total'=>(float) $r['total'],
            'paymentMethod'=>$r['payment_method'], 'paymentForm'=>$r['payment_form'], 'relatedUuid'=>$r['related_uuid'], 'issuedAt'=>$r['issued_at']], $rows->fetchAll());
    }
}
