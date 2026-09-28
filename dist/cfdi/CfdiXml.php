<?php
declare(strict_types=1);
namespace Buyniverse\Cfdi;

use DOMDocument;
use DOMElement;
use RuntimeException;

/**
 * CFDI 4.0 builder (Anexo 20) for Ingreso (I), Egreso (E) and Pagos 2.0 (P),
 * including InformacionGlobal for a factura global. Ported from garlo's
 * Rey\Pac\CfdiXml. Output is unsealed XML: SW seals it with the issuer's CSD
 * stored in the PAC account and stamps it.
 *
 * Document model: type, series, folio, date, currency, export, zip (LugarExpedicion),
 * payment_form, payment_method, issuer{rfc,name,regime}, receiver{rfc,name,zip,regime,use},
 * global{periodicity,months,year}?, related{type,uuids[]}?,
 * items[{prod,sku,qty,unit,unit_name,desc,value,objeto,rate}], payments[]? (P)
 */
final class CfdiXml {
    public const NS = 'http://www.sat.gob.mx/cfd/4';
    public const NS_PAGO = 'http://www.sat.gob.mx/Pagos20';
    public const XSI = 'http://www.w3.org/2001/XMLSchema-instance';
    /** The SAT forbids "|" (it separates original-chain fields) and repeated spaces in free text. */
    private const TEXT = ['Nombre', 'Descripcion', 'Unidad', 'NoIdentificacion'];

    private static function n(float $v, int $dec = 2): string { return number_format(round($v, $dec), $dec, '.', ''); }
    private static function q(float $v): string { $s = rtrim(rtrim(number_format($v, 6, '.', ''), '0'), '.'); return $s === '' ? '0' : $s; }
    public static function text(string $v): string { return trim((string) preg_replace('/\s{2,}/u', ' ', str_replace('|', ' · ', $v))); }
    private static function set(DOMElement $e, array $attrs): void {
        foreach ($attrs as $k => $v) if ($v !== null && $v !== '') $e->setAttribute($k, in_array($k, self::TEXT, true) ? self::text((string) $v) : (string) $v);
    }

    /** Concept amounts and taxes exactly as they will appear in the XML. */
    public static function compute(array $items): array {
        $concepts = []; $sub = 0.0; $byRate = [];
        foreach ($items as $it) {
            $qty = (float) $it['qty']; $value = (float) $it['value'];
            if ($qty <= 0 || $value < 0) throw new RuntimeException('Cantidad o valor unitario inválido en el concepto ' . ($it['sku'] ?? $it['desc'] ?? ''));
            $amount = round($qty * $value, 2); $obj = (string) ($it['objeto'] ?? '02'); $rate = (float) ($it['rate'] ?? 0.16);
            $tax = $obj === '02' ? round($amount * $rate, 2) : 0.0;
            if ($obj === '02') { $k = number_format($rate, 6, '.', ''); $byRate[$k]['base'] = ($byRate[$k]['base'] ?? 0) + $amount; $byRate[$k]['tax'] = ($byRate[$k]['tax'] ?? 0) + $tax; }
            $sub += $amount; $concepts[] = $it + ['amount'=>$amount, 'tax'=>$tax, 'objeto'=>$obj, 'rate'=>$rate];
        }
        $taxTotal = array_sum(array_map(fn($r) => round($r['tax'], 2), $byRate));
        return ['concepts'=>$concepts, 'subtotal'=>round($sub, 2), 'tax'=>round($taxTotal, 2), 'total'=>round($sub + $taxTotal, 2), 'by_rate'=>$byRate];
    }

    public static function build(array $d): array {
        $type = $d['type'] ?? 'I'; $isP = $type === 'P';
        $doc = new DOMDocument('1.0', 'UTF-8'); $doc->formatOutput = false;
        $root = $doc->createElementNS(self::NS, 'cfdi:Comprobante'); $doc->appendChild($root);
        $root->setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:xsi', self::XSI);
        $location = 'http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd';
        if ($isP) { $root->setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:pago20', self::NS_PAGO); $location .= ' http://www.sat.gob.mx/Pagos20 http://www.sat.gob.mx/sitio_internet/cfd/Pagos/Pagos20.xsd'; }
        $root->setAttributeNS(self::XSI, 'xsi:schemaLocation', $location);

        $items = $isP ? [['prod'=>'84111506', 'qty'=>1, 'unit'=>'ACT', 'desc'=>'Pago', 'value'=>0, 'objeto'=>'01']] : $d['items'];
        $c = self::compute($items);
        self::set($root, [
            'Version'=>'4.0', 'Serie'=>$d['series'] ?? null, 'Folio'=>$d['folio'] ?? null, 'Fecha'=>$d['date'],
            'FormaPago'=>$isP ? null : ($d['payment_form'] ?? '99'),
            'SubTotal'=>$isP ? '0' : self::n($c['subtotal']), 'Moneda'=>$isP ? 'XXX' : ($d['currency'] ?? 'MXN'),
            'TipoCambio'=>!$isP && ($d['currency'] ?? 'MXN') !== 'MXN' ? self::q((float) ($d['exchange_rate'] ?? 0)) : null,
            'Total'=>$isP ? '0' : self::n($c['total']), 'TipoDeComprobante'=>$type, 'Exportacion'=>$d['export'] ?? '01',
            'MetodoPago'=>$isP ? null : ($d['payment_method'] ?? 'PUE'), 'LugarExpedicion'=>$d['zip'],
        ]);
        // The SAT requires these attributes to exist; SW fills them when sealing.
        foreach (['Sello', 'NoCertificado', 'Certificado'] as $a) $root->setAttribute($a, '');

        if (!empty($d['global'])) {
            $g = $doc->createElementNS(self::NS, 'cfdi:InformacionGlobal'); $root->appendChild($g);
            self::set($g, ['Periodicidad'=>$d['global']['periodicity'], 'Meses'=>$d['global']['months'], 'Año'=>$d['global']['year']]);
        }
        if (!empty($d['related']['uuids'])) {
            $r = $doc->createElementNS(self::NS, 'cfdi:CfdiRelacionados'); $r->setAttribute('TipoRelacion', $d['related']['type']); $root->appendChild($r);
            foreach ($d['related']['uuids'] as $u) { $x = $doc->createElementNS(self::NS, 'cfdi:CfdiRelacionado'); $x->setAttribute('UUID', strtoupper($u)); $r->appendChild($x); }
        }
        $em = $doc->createElementNS(self::NS, 'cfdi:Emisor'); $root->appendChild($em);
        self::set($em, ['Rfc'=>strtoupper($d['issuer']['rfc']), 'Nombre'=>$d['issuer']['name'], 'RegimenFiscal'=>$d['issuer']['regime']]);
        $re = $doc->createElementNS(self::NS, 'cfdi:Receptor'); $root->appendChild($re);
        self::set($re, ['Rfc'=>strtoupper($d['receiver']['rfc']), 'Nombre'=>$d['receiver']['name'], 'DomicilioFiscalReceptor'=>$d['receiver']['zip'],
            'RegimenFiscalReceptor'=>$d['receiver']['regime'], 'UsoCFDI'=>$isP ? 'CP01' : $d['receiver']['use']]);

        $cs = $doc->createElementNS(self::NS, 'cfdi:Conceptos'); $root->appendChild($cs);
        foreach ($c['concepts'] as $it) {
            $e = $doc->createElementNS(self::NS, 'cfdi:Concepto'); $cs->appendChild($e);
            self::set($e, ['ClaveProdServ'=>$it['prod'], 'NoIdentificacion'=>$it['sku'] ?? null, 'Cantidad'=>self::q((float) $it['qty']), 'ClaveUnidad'=>$it['unit'],
                'Unidad'=>$it['unit_name'] ?? null, 'Descripcion'=>mb_substr((string) $it['desc'], 0, 1000), 'ValorUnitario'=>$isP ? '0' : self::q((float) $it['value']),
                'Importe'=>$isP ? '0' : self::n($it['amount']), 'ObjetoImp'=>$it['objeto']]);
            if ($it['objeto'] === '02') {
                $im = $doc->createElementNS(self::NS, 'cfdi:Impuestos'); $e->appendChild($im);
                $ts = $doc->createElementNS(self::NS, 'cfdi:Traslados'); $im->appendChild($ts);
                $t = $doc->createElementNS(self::NS, 'cfdi:Traslado'); $ts->appendChild($t);
                self::set($t, ['Base'=>self::n($it['amount']), 'Impuesto'=>'002', 'TipoFactor'=>'Tasa', 'TasaOCuota'=>number_format($it['rate'], 6, '.', ''), 'Importe'=>self::n($it['tax'])]);
            }
        }
        if (!$isP && $c['by_rate']) {
            $im = $doc->createElementNS(self::NS, 'cfdi:Impuestos'); $im->setAttribute('TotalImpuestosTrasladados', self::n($c['tax'])); $root->appendChild($im);
            $ts = $doc->createElementNS(self::NS, 'cfdi:Traslados'); $im->appendChild($ts);
            foreach ($c['by_rate'] as $rate => $r) {
                $t = $doc->createElementNS(self::NS, 'cfdi:Traslado'); $ts->appendChild($t);
                self::set($t, ['Base'=>self::n($r['base']), 'Impuesto'=>'002', 'TipoFactor'=>'Tasa', 'TasaOCuota'=>$rate, 'Importe'=>self::n($r['tax'])]);
            }
        }
        if ($isP) self::pagos($doc, $root, $d['payments']);
        return ['xml'=>$doc->saveXML(), 'subtotal'=>$isP ? 0.0 : $c['subtotal'], 'tax'=>$isP ? 0.0 : $c['tax'], 'total'=>$isP ? 0.0 : $c['total']];
    }

    /** Pagos 2.0. payments[]: {date, form, amount, docs[{uuid,series,folio,parcialidad,saldo_ant,pagado,base,rate,tax}]} */
    private static function pagos(DOMDocument $doc, DOMElement $root, array $payments): void {
        $comp = $doc->createElementNS(self::NS, 'cfdi:Complemento'); $root->appendChild($comp);
        $pg = $doc->createElementNS(self::NS_PAGO, 'pago20:Pagos'); $pg->setAttribute('Version', '2.0'); $comp->appendChild($pg);
        $tot = $doc->createElementNS(self::NS_PAGO, 'pago20:Totales'); $pg->appendChild($tot);
        $sumBase16 = 0.0; $sumTax16 = 0.0; $sumPaid = 0.0;
        foreach ($payments as $p) {
            $e = $doc->createElementNS(self::NS_PAGO, 'pago20:Pago'); $pg->appendChild($e);
            self::set($e, ['FechaPago'=>$p['date'], 'FormaDePagoP'=>$p['form'], 'MonedaP'=>'MXN', 'TipoCambioP'=>'1', 'Monto'=>self::n((float) $p['amount'])]);
            $baseP = []; $taxP = [];
            foreach ($p['docs'] as $dr) {
                $x = $doc->createElementNS(self::NS_PAGO, 'pago20:DoctoRelacionado'); $e->appendChild($x);
                self::set($x, ['IdDocumento'=>strtoupper($dr['uuid']), 'Serie'=>$dr['series'] ?? null, 'Folio'=>$dr['folio'] ?? null, 'MonedaDR'=>'MXN', 'EquivalenciaDR'=>'1',
                    'NumParcialidad'=>(string) $dr['parcialidad'], 'ImpSaldoAnt'=>self::n((float) $dr['saldo_ant']), 'ImpPagado'=>self::n((float) $dr['pagado']),
                    'ImpSaldoInsoluto'=>self::n((float) $dr['saldo_ant'] - (float) $dr['pagado']), 'ObjetoImpDR'=>'02']);
                $idr = $doc->createElementNS(self::NS_PAGO, 'pago20:ImpuestosDR'); $x->appendChild($idr);
                $tdr = $doc->createElementNS(self::NS_PAGO, 'pago20:TrasladosDR'); $idr->appendChild($tdr);
                $t = $doc->createElementNS(self::NS_PAGO, 'pago20:TrasladoDR'); $tdr->appendChild($t);
                $rate = number_format((float) $dr['rate'], 6, '.', '');
                self::set($t, ['BaseDR'=>self::n((float) $dr['base']), 'ImpuestoDR'=>'002', 'TipoFactorDR'=>'Tasa', 'TasaOCuotaDR'=>$rate, 'ImporteDR'=>self::n((float) $dr['tax'])]);
                $baseP[$rate] = ($baseP[$rate] ?? 0) + (float) $dr['base']; $taxP[$rate] = ($taxP[$rate] ?? 0) + (float) $dr['tax'];
            }
            $ip = $doc->createElementNS(self::NS_PAGO, 'pago20:ImpuestosP'); $e->appendChild($ip);
            $tp = $doc->createElementNS(self::NS_PAGO, 'pago20:TrasladosP'); $ip->appendChild($tp);
            foreach ($baseP as $rate => $b) {
                $t = $doc->createElementNS(self::NS_PAGO, 'pago20:TrasladoP'); $tp->appendChild($t);
                self::set($t, ['BaseP'=>self::n($b), 'ImpuestoP'=>'002', 'TipoFactorP'=>'Tasa', 'TasaOCuotaP'=>$rate, 'ImporteP'=>self::n($taxP[$rate])]);
                if ($rate === '0.160000') { $sumBase16 += $b; $sumTax16 += $taxP[$rate]; }
            }
            $sumPaid += (float) $p['amount'];
        }
        self::set($tot, ['TotalTrasladosBaseIVA16'=>$sumBase16 ? self::n($sumBase16) : null, 'TotalTrasladosImpuestoIVA16'=>$sumBase16 ? self::n($sumTax16) : null, 'MontoTotalPagos'=>self::n($sumPaid)]);
    }

    /** Validates against the official XSDs (cfdi/sat/xsd). Returns [] when valid, or the errors. */
    public static function validate(string $xml): array {
        $d = new DOMDocument(); $d->loadXML($xml);
        // SW fills NoCertificado when sealing; validate the pre-seal document with a placeholder.
        $root = $d->documentElement;
        if ($root->getAttribute('NoCertificado') === '') $root->setAttribute('NoCertificado', '00000000000000000000');
        $previous = libxml_use_internal_errors(true); libxml_clear_errors();
        $ok = $d->schemaValidate(__DIR__ . '/sat/xsd/cfdi_all.xsd');
        $errors = array_map(fn($e) => trim($e->message) . ' (línea ' . $e->line . ')', libxml_get_errors());
        libxml_clear_errors(); libxml_use_internal_errors($previous);
        return $ok ? [] : $errors;
    }
}
