<?php
declare(strict_types=1);

// CFDI API: readiness, SAT catalogues, series, issuance, payment complements,
// credit notes, cancellations and XML downloads for the current company.
// Loaded by index.php; the libraries live in cfdi/ (denied to the web).

require_once __DIR__ . '/cfdi/CfdiXml.php';
require_once __DIR__ . '/cfdi/CfdiService.php';
require_once __DIR__ . '/cfdi/CfdiIssuer.php';

use Buyniverse\Cfdi\{CfdiIssuer, CfdiService, SatCatalog};

function cfdi_require_write(array $session): void {
    if (!tenant_header_origin_is_safe() || !hash_equals($session['csrf'], workspace_header('X-Buyniverse-CSRF')) || workspace_header('X-Buyniverse-Request') !== 'cfdi-v1')
        fail_response(403, 'Request verification failed');
    $last = (float) ($_SESSION['cfdi_last_write'] ?? 0);
    if (microtime(true) - $last < 0.8) fail_response(429, 'Please wait before sending again');
    $_SESSION['cfdi_last_write'] = microtime(true);
}

function handle_cfdi(string $uri): void {
    $config = workspace_config(); $session = workspace_session();
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if ($uri === '/api/v1/cfdi/catalogs') workspace_json(['catalogs'=>SatCatalog::publicCatalogs(), 'csrf'=>$session['csrf']]);
    if ($uri === '/api/v1/cfdi/products') workspace_json(['results'=>SatCatalog::searchProducts(tenant_text($_GET['q'] ?? '', 60))]);
    if (!tenant_has_authenticated_principal($config)) fail_response(401, 'Sign in to use invoicing');
    $pdo = workspace_pdo($config); $key = workspace_key($config);
    try {
        $context = tenant_context($pdo, $config, $session, $key);
        $permissions = CfdiService::permissions($pdo, $context);
        CfdiService::require($permissions, 'view');
        if ($uri === '/api/v1/cfdi/status') {
            $issuer = CfdiService::issuer($pdo, $context);
            $pac = \Buyniverse\Cfdi\cfdi_pac($config, workspace_mode($config));
            workspace_json(['issuer'=>['rfc'=>$issuer['rfc'], 'name'=>$issuer['name'], 'regime'=>$issuer['regime'], 'zip'=>$issuer['zip'], 'certificate'=>$issuer['certificate'], 'certificateValidTo'=>$issuer['certificateValidTo']],
                'ready'=>$issuer['ready'] && $pac !== null, 'profileReady'=>$issuer['ready'], 'pac'=>$pac ? $pac->name() : null, 'permissions'=>$permissions,
                'series'=>CfdiService::seriesList($pdo, $context), 'locations'=>array_values(array_filter($context['companies'], fn($c) => $c['id'] === $context['company']['id']))[0]['locations'] ?? [], 'csrf'=>$session['csrf']]);
        }
        if ($uri === '/api/v1/cfdi/series') {
            if ($method === 'GET') workspace_json(['series'=>CfdiService::seriesList($pdo, $context), 'csrf'=>$session['csrf']]);
            cfdi_require_write($session); CfdiService::require($permissions, 'manage');
            $pdo->beginTransaction();
            try { $result = CfdiService::seriesSave($pdo, $context, tenant_request_body()); tenant_audit($pdo, $context, 'cfdi.series_saved', 'cfdi_series', $context['company']['id'], [], $key); $pdo->commit(); }
            catch (Throwable $error) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $error; }
            workspace_json(['series'=>$result, 'csrf'=>$session['csrf']]);
        }
        if ($uri === '/api/v1/cfdi/documents' && $method === 'GET') workspace_json(['documents'=>CfdiIssuer::list($pdo, $context, ['type'=>$_GET['type'] ?? '']), 'csrf'=>$session['csrf']]);
        $pac = \Buyniverse\Cfdi\cfdi_pac($config, workspace_mode($config));
        if (preg_match('#^/api/v1/cfdi/documents/([0-9A-Fa-f-]{36})/xml$#', $uri, $m) === 1 && $method === 'GET') {
            $xml = (new CfdiIssuer($pdo, $config, $key, $context, $pac ?? new \Buyniverse\Cfdi\MockPacProvider()))->xml($m[1]);
            security_headers(); header('Content-Type: application/xml; charset=utf-8'); header('Content-Disposition: attachment; filename="' . strtoupper($m[1]) . '.xml"'); echo $xml; exit;
        }
        if ($method !== 'POST') fail_response(405, 'Method not allowed');
        cfdi_require_write($session);
        if (!$pac) fail_response(503, 'Electronic invoicing is not configured yet');
        $issuer = new CfdiIssuer($pdo, $config, $key, $context, $pac); $input = tenant_request_body();
        if ($uri === '/api/v1/cfdi/documents') workspace_json(['document'=>$issuer->invoice($input, $permissions), 'csrf'=>$session['csrf']], 201);
        if (preg_match('#^/api/v1/cfdi/documents/([0-9A-Fa-f-]{36})/(payments|credit-notes|cancel)$#', $uri, $m) === 1) {
            $result = match ($m[2]) { 'payments'=>$issuer->payment($m[1], $input, $permissions), 'credit-notes'=>$issuer->creditNote($m[1], $input, $permissions), default=>$issuer->cancel($m[1], $input, $permissions) };
            workspace_json(['document'=>$result, 'csrf'=>$session['csrf']], $m[2] === 'cancel' ? 200 : 201);
        }
        fail_response(404, 'Not found');
    } catch (RuntimeException $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        $code = (int) $error->getCode();
        // PAC and SAT messages are shown as they are: they tell the issuer what to fix.
        fail_response(in_array($code, [400, 403, 404, 409, 422], true) ? $code : 502, $error->getMessage());
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        fail_response(503, 'Invoicing is temporarily unavailable');
    }
}
