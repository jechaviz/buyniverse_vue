<?php
/** Static-first, fail-closed deployment shim. */
declare(strict_types=1);
error_reporting(E_ALL & ~E_NOTICE & ~E_DEPRECATED);
ini_set('display_errors', '0');
ini_set('expose_php', '0');
if (function_exists('header_remove')) header_remove('X-Powered-By');

if (!function_exists('str_starts_with')) { function str_starts_with(string $haystack, string $needle): bool { return 0 === strncmp($haystack, $needle, strlen($needle)); } }
if (!function_exists('getallheaders')) {
    function getallheaders(): array {
        $out = []; foreach ($_SERVER as $key => $value) {
            if (substr($key, 0, 5) === 'HTTP_') $out[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($key, 5)))))] = $value;
            elseif ($key === 'CONTENT_TYPE') $out['Content-Type'] = $value;
        }
        return $out;
    }
}

function security_headers(): void {
    // Keep this byte-for-byte aligned with .htaccess and index.html. The hash
    // authorizes only the dynamic <base> bootstrap; no broad inline-script
    // exception is allowed.
    header("Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; frame-ancestors 'none'; frame-src https://accounts.google.com/gsi/; child-src 'none'; manifest-src 'self'; script-src 'self' 'sha256-ys9gXXSuRGbv8Nx0g2R3L756m+Os3ZdHz1Od15DWfYE=' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net https://accounts.google.com/gsi/client; script-src-attr 'none'; style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: blob:; connect-src 'self' https://accounts.google.com/gsi/ https://cdn.jsdelivr.net https://unpkg.com https://fonts.googleapis.com https://fonts.gstatic.com; media-src 'self'; worker-src 'none'");
    // The demo is never an indexable site.
    if (!empty($GLOBALS['bn_demo'])) header('X-Robots-Tag: noindex, nofollow, noarchive');
    foreach ([
        'Strict-Transport-Security: max-age=63072000; includeSubDomains; preload',
        'X-Content-Type-Options: nosniff', 'X-Frame-Options: DENY', 'Referrer-Policy: no-referrer',
        'Cross-Origin-Opener-Policy: same-origin', 'Cross-Origin-Resource-Policy: same-origin',
        'Origin-Agent-Cluster: ?1', 'X-DNS-Prefetch-Control: off', 'X-Download-Options: noopen',
        'X-Permitted-Cross-Domain-Policies: none',
        'Permissions-Policy: accelerometer=(), autoplay=(), camera=(), display-capture=(), encrypted-media=(), fullscreen=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), sync-xhr=(), usb=(), web-share=(), xr-spatial-tracking=()',
        'Cache-Control: no-store, no-cache, must-revalidate, private, max-age=0', 'Pragma: no-cache',
    ] as $header) header($header);
}
function fail_response(int $status, string $message): void {
    security_headers(); http_response_code($status); header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => $message], JSON_UNESCAPED_SLASHES); exit;
}
function static_file(string $root, string $uri): ?string {
    $base = realpath($root);
    if ($base === false) return null;
    $file = realpath($base . DIRECTORY_SEPARATOR . ltrim($uri, '/'));
    if ($file === false || !is_file($file) || !str_starts_with($file, $base . DIRECTORY_SEPARATOR)) return null;
    return in_array(strtolower(pathinfo($file, PATHINFO_EXTENSION)), ['css','js','json','svg','png','jpg','jpeg','gif','ico','woff','woff2','ttf','vue','txt','xml'], true) ? $file : null;
}
function serve_spa(): void {
    foreach ([__DIR__ . '/dist/index.html', __DIR__ . '/index.html'] as $file) {
        if (is_file($file)) { security_headers(); header('Content-Type: text/html; charset=utf-8'); readfile($file); exit; }
    }
    fail_response(503, 'Application bundle unavailable');
}

$rawUri = (string) ($_SERVER['REQUEST_URI'] ?? '/');
$uri = parse_url($rawUri, PHP_URL_PATH);
if (!is_string($uri) || strlen($rawUri) > 4096) fail_response(400, 'Invalid request');
$path = rawurldecode($uri);
if (preg_match('/[\\x00\\r\\n\\\\]/', $path) || in_array('..', explode('/', $path), true)) fail_response(400, 'Invalid request');
// A deployment under a sub-folder (e.g. /buyniverse_vue/) routes exactly like a root one.
$installBase = workspace_base_path();
if ($installBase !== '' && ($uri === $installBase || str_starts_with($uri, $installBase . '/'))) {
    $uri = substr($uri, strlen($installBase)) ?: '/';
    $path = substr($path, strlen($installBase)) ?: '/';
}

// Deployment, database and seed/reset operations never belong to a public endpoint.
$action = (string) ($_GET['action'] ?? '');
if (preg_match('#^/api/v1/(?:deploy|sync|admin/db)(?:/|$)#', $uri) || in_array($action, ['sync','deploy','seed','reset','status'], true))
    fail_response(404, 'Not found');

// The demo is the /demo/ path of this host. It is a read-only, client-side
// experience over sanitized sample data: no API, no session, no database. The
// operator can switch it off with 'demo_enabled' => false.
function workspace_demo_enabled(array $config): bool { return ($config['demo_enabled'] ?? true) !== false; }
$GLOBALS['bn_demo'] = false;
if ($uri === '/demo') { security_headers(); http_response_code(301); header('Location: ' . $installBase . '/demo/'); exit; }
$GLOBALS['bn_install_base'] = $installBase;
if (str_starts_with($uri, '/demo/')) {
    $demoConfig = workspace_config();
    if (!workspace_demo_enabled($demoConfig)) fail_response(404, 'Not found');
    $uri = substr($uri, 5); $path = substr($path, 5);
    $GLOBALS['bn_demo'] = true;
    if ($uri === '/api' || str_starts_with($uri, '/api/')) fail_response(404, 'The demo has no server');
    // The demo is private: nothing under /demo/ is served without its own session (see demo_service.php).
    require_once __DIR__ . '/demo_service.php';
    demo_guard($uri, $demoConfig);
}
// Sample data is served only inside the demo (or on a host the operator set to demo mode).
if (preg_match('#(?:^|/)app/data/demo\.js$#', $path) === 1 && !$GLOBALS['bn_demo'] && workspace_mode(workspace_config()) !== 'demo') fail_response(404, 'Not found');
foreach ([__DIR__ . '/dist', __DIR__] as $root) {
    $file = static_file($root, $path);
    if ($file === null) continue;
    security_headers();
    $mimes = ['css'=>'text/css; charset=utf-8','js'=>'application/javascript; charset=utf-8','json'=>'application/json; charset=utf-8','svg'=>'image/svg+xml','png'=>'image/png','jpg'=>'image/jpeg','jpeg'=>'image/jpeg','gif'=>'image/gif','ico'=>'image/x-icon','woff'=>'font/woff','woff2'=>'font/woff2','ttf'=>'font/ttf','vue'=>'text/plain; charset=utf-8','txt'=>'text/plain; charset=utf-8','xml'=>'application/xml; charset=utf-8'];
    header('Content-Type: ' . $mimes[strtolower(pathinfo($file, PATHINFO_EXTENSION))]); readfile($file); exit;
}
function workspace_base_path(): string {
    $script = str_replace(chr(92), '/', (string) ($_SERVER['SCRIPT_NAME'] ?? '/index.php'));
    if (!str_ends_with($script, '/index.php')) return '';
    $base = substr($script, 0, -10);
    return $base === '/' ? '' : rtrim($base, '/');
}
if (!str_starts_with($uri, '/api/') && $uri !== '/api') serve_spa();

// Server-local configuration lives outside the public document root (or at
// BUYNIVERSE_RUNTIME_CONFIG). It supplies the PDO DSN and a 32-byte encryption
// key; this published artifact intentionally contains neither credentials nor
// a fallback key.
function workspace_config(): array {
    $path = getenv('BUYNIVERSE_RUNTIME_CONFIG') ?: dirname(__DIR__) . '/buyniverse-runtime.php';
    if (!is_file($path) || !is_readable($path)) return [];
    $config = require $path;
    return is_array($config) ? $config : [];
}
function workspace_request_host(): string {
    $host = strtolower(trim((string) ($_SERVER['HTTP_HOST'] ?? '')));
    return preg_replace('/:\\d+$/', '', $host) ?? '';
}
function workspace_mode(array $config): string {
    // Production is the fail-closed default. Demo data can only be enabled by
    // an explicit runtime setting on a host that was allowlisted by operators.
    if (strtolower((string) ($config['app_mode'] ?? 'production')) !== 'demo') return 'production';
    $host = workspace_request_host();
    $localHosts = ['localhost', '127.0.0.1', '::1', '[::1]'];
    if (in_array($host, $localHosts, true)) return 'demo';
    $configured = $config['demo_hosts'] ?? [];
    if (!is_array($configured)) return 'production';
    foreach ($configured as $candidate) {
        if (is_string($candidate) && hash_equals(strtolower(trim($candidate)), $host)) return 'demo';
    }
    return 'production';
}
function workspace_header(string $name): string {
    foreach (getallheaders() as $key => $value)
        if (strcasecmp((string) $key, $name) === 0) return trim((string) $value);
    return '';
}
function workspace_session(): array {
    if (session_status() !== PHP_SESSION_ACTIVE) {
        $secure = (($_SERVER['HTTPS'] ?? '') === 'on') || strtolower(workspace_header('X-Forwarded-Proto')) === 'https';
        session_name('buyniverse_workspace');
        // Lax preserves the session only for the top-level GET callback from a
        // configured OAuth provider. Every state-changing endpoint additionally
        // requires Origin + per-session CSRF verification, so it remains closed
        // to cross-site writes while supporting the standard code flow.
        session_set_cookie_params(['lifetime'=>0, 'path'=>'/', 'secure'=>$secure, 'httponly'=>true, 'samesite'=>'Lax']);
        ini_set('session.use_strict_mode', '1');
        ini_set('session.cookie_httponly', '1');
        ini_set('session.cookie_samesite', 'Lax');
        if (!session_start()) fail_response(503, 'Secure workspace session unavailable');
    }
    if (empty($_SESSION['workspace_csrf'])) $_SESSION['workspace_csrf'] = bin2hex(random_bytes(32));
    return ['hash'=>hash('sha256', session_id()), 'csrf'=>(string) $_SESSION['workspace_csrf']];
}
function workspace_pdo(array $config): PDO {
    $dsn = (string) ($config['db_dsn'] ?? '');
    $user = (string) ($config['db_user'] ?? '');
    $password = (string) ($config['db_password'] ?? '');
    if (!$dsn || !$user || !$password || !extension_loaded('pdo_mysql')) fail_response(503, 'Secure storage is not configured');
    try {
        return new PDO($dsn, $user, $password, [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES=>false]);
    } catch (Throwable $error) { fail_response(503, 'Secure storage is unavailable'); }
}
function workspace_key(array $config): string {
    $key = base64_decode((string) ($config['state_encryption_key'] ?? ''), true);
    if ($key === false || strlen($key) !== 32 || !function_exists('openssl_encrypt')) fail_response(503, 'Secure storage is not configured');
    return $key;
}
function workspace_safe_value($value, int $depth = 0): bool {
    if ($depth > 18) return false;
    if ($value === null || is_bool($value) || is_int($value) || is_float($value)) return true;
    if (is_string($value)) return strlen($value) <= 500000 && !preg_match('/[\x00]/', $value);
    if (!is_array($value) || count($value) > 10000) return false;
    foreach ($value as $key => $item) {
        if (is_string($key) && in_array($key, ['__proto__','prototype','constructor'], true)) return false;
        if (!workspace_safe_value($item, $depth + 1)) return false;
    }
    return true;
}
function workspace_json(array $payload, int $status = 200): void {
    security_headers(); http_response_code($status); header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); exit;
}
function workspace_encrypt(string $plain, string $key, string $aad = 'buyniverse-workspace-v1'): array {
    $iv = random_bytes(12); $tag = '';
    $ciphertext = openssl_encrypt($plain, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag, $aad);
    if ($ciphertext === false || strlen($tag) !== 16) fail_response(503, 'Secure storage encryption unavailable');
    return [$ciphertext, $iv, $tag];
}
function workspace_decrypt(array $row, string $key, string $aad = 'buyniverse-workspace-v1'): ?array {
    $plain = openssl_decrypt((string) $row['ciphertext'], 'aes-256-gcm', $key, OPENSSL_RAW_DATA, (string) $row['iv'], (string) $row['auth_tag'], $aad);
    if ($plain === false || strlen($plain) > 786432) return null;
    $state = json_decode($plain, true);
    return is_array($state) && workspace_safe_value($state) ? $state : null;
}
function workspace_audit(PDO $pdo, string $sessionHash, int $version, string $action, string $digest, string $key): void {
    $mac = hash_hmac('sha256', implode('|', [$sessionHash, $version, $action, $digest]), $key);
    $statement = $pdo->prepare('INSERT INTO workspace_state_audit (session_hash, version, action, payload_digest, event_mac) VALUES (?, ?, ?, ?, ?)');
    $statement->execute([$sessionHash, $version, $action, $digest, $mac]);
}

// Transactional mail is intentionally server and CLI only. The module keeps
// recipient addresses and rendered bodies encrypted at rest in the outbox.
require_once __DIR__ . '/email_service.php';

require_once __DIR__ . '/identity_service.php';

// ---------------------------------------------------------------------------
require_once __DIR__ . '/tenant_service.php';
require_once __DIR__ . '/auction_service.php';

require_once __DIR__ . '/fiscal_rules.php';
require_once __DIR__ . '/cfdi/Csd.php';
require_once __DIR__ . '/cfdi/CfdiConfig.php';
require_once __DIR__ . '/supplier_compliance.php';
require_once __DIR__ . '/onboarding_service.php';
require_once __DIR__ . '/setup_service.php';
require_once __DIR__ . '/support_service.php';
require_once __DIR__ . '/cfdi_service.php';
if ($uri === '/api/v1/auth/providers' || $uri === '/api/v1/auth/providers/') {
    if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'GET') fail_response(405, 'Method not allowed');
    $config = workspace_config(); workspace_session(); $providers = [];
    foreach (array_keys(social_providers()) as $provider) {
        $definition = social_provider_config($config, $provider);
        if ($definition !== null) $providers[] = ['id'=>$definition['id'], 'name'=>$definition['name'], 'audience'=>'individual'];
    }
    // Google through Identity Services needs only the public client id; it is offered instead of the code flow when configured.
    $gis = social_google_config($config);
    if ($gis !== null) {
        $providers = array_values(array_filter($providers, static fn($p) => $p['id'] !== 'google'));
        array_unshift($providers, ['id'=>'google', 'name'=>'Google', 'audience'=>'individual', 'flow'=>'gis', 'clientId'=>$gis['client_id'], 'nonce'=>social_google_nonce()]);
    }
    workspace_json(['providers'=>$providers, 'csrf'=>workspace_session()['csrf']]);
}
if ($uri === '/api/v1/auth/google/token') {
    if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') fail_response(405, 'Method not allowed');
    $config = workspace_config(); $session = workspace_session(); $pdo = workspace_pdo($config); $key = workspace_key($config);
    social_google_login($pdo, $config, $session, $key);
}
if ($uri === '/api/v1/runtime' || $uri === '/api/v1/runtime/') {
    if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'GET') fail_response(405, 'Method not allowed');
    $config = workspace_config();
    workspace_json(['mode'=>workspace_mode($config), 'serverAuth'=>true, 'demoAvailable'=>workspace_mode($config) !== 'demo' && workspace_demo_enabled($config)]);
}
if (preg_match('#^/api/v1/auth/(google|microsoft|linkedin|facebook)/(start|callback)/?$#', $uri, $socialMatch)) {
    if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'GET') fail_response(405, 'Method not allowed');
    $config = workspace_config(); $session = workspace_session();
    if ($socialMatch[2] === 'start') social_start($config, $socialMatch[1]);
    try { $pdo = workspace_pdo($config); $key = workspace_key($config); social_callback($pdo, $config, $session, $key, $socialMatch[1]); }
    catch (Throwable $error) { if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack(); social_redirect(social_base_path() . '/#/?login_error=identity'); }
}

if ($uri === '/api/v1/setup' || str_starts_with($uri, '/api/v1/setup/')) handle_setup($uri);
if (preg_match('#^/api/v1/onboarding(?:/(?:fiscal-credentials(?:/verify)?|compliance|compliance-documents))?/?$#', $uri) === 1) handle_onboarding($uri);
if (preg_match('#^/api/v1/support/(?:status|assistant|tickets)$#', $uri) === 1) handle_support($uri);
if (str_starts_with($uri, '/api/v1/cfdi/')) handle_cfdi($uri);

if ($uri === '/api/v1/tenant-context' || $uri === '/api/v1/tenant-context/' || str_starts_with($uri, '/api/v1/tenant-companies')) {
    // Server tenant boundary: tenant_context, tenant_workspace_state, tenant_header_origin_is_safe,
    // tenant_can_manage_company, tenant_audit_events, tenant-context, tenant-companies, tenant.invitation,
    // allow_demo_workspace_state, workspace_state_audit:
    // workspace_mode($config) === 'demo' && ($config['allow_demo_workspace_state'] ?? false) === true
    $config = workspace_config(); $session = workspace_session(); $pdo = workspace_pdo($config); $key = workspace_key($config);
    handle_tenant_admin($uri, $config, $session, $pdo, $key);
}

if (str_starts_with($uri, '/api/v1/auction-realtime')) {
    $config = workspace_config(); $session = workspace_session(); $pdo = workspace_pdo($config); $key = workspace_key($config);
    handle_auction_realtime($uri, $config, $session, $pdo, $key);
}

if ($uri === '/api/v1/workspace-state' || $uri === '/api/v1/workspace-state/') {
    $config = workspace_config(); $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if (!in_array($method, ['GET','PUT','DELETE'], true)) fail_response(405, 'Method not allowed');
    if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 786432) fail_response(413, 'Request body too large');
    $session = workspace_session();
    if ($method === 'GET' && !tenant_has_authenticated_principal($config))
        workspace_json(['authenticated'=>false, 'state'=>null, 'version'=>0, 'csrf'=>$session['csrf'], 'mode'=>workspace_mode($config), 'context'=>null]);
    $pdo = workspace_pdo($config); $key = workspace_key($config);
    try {
        $context = tenant_context($pdo, $config, $session, $key); $scopeHash = (string) $context['contextHash']; $aad = 'buyniverse-workspace-v2|' . $scopeHash;
        if ($method !== 'GET') {
            if (!tenant_header_origin_is_safe() || !hash_equals($session['csrf'], workspace_header('X-Buyniverse-CSRF')) || workspace_header('X-Buyniverse-Request') !== 'workspace-state-v1') fail_response(403, 'Request verification failed');
            $lastWrite = (float) ($_SESSION['workspace_last_write'] ?? 0);
            if (microtime(true) - $lastWrite < 0.35) fail_response(429, 'Please wait before saving again');
            $_SESSION['workspace_last_write'] = microtime(true);
        }
        if ($method === 'GET') {
            $statement = $pdo->prepare('SELECT version, ciphertext, iv, auth_tag FROM tenant_workspace_state WHERE context_hash = ? LIMIT 1');
            $statement->execute([$scopeHash]); $row = $statement->fetch();
            if (!$row) workspace_json(['state'=>null, 'version'=>0, 'csrf'=>$session['csrf'], 'mode'=>workspace_mode($config), 'context'=>$context]);
            $state = workspace_decrypt($row, $key, $aad);
            if ($state === null) fail_response(409, 'Stored workspace integrity check failed');
            workspace_json(['state'=>$state, 'version'=>(int) $row['version'], 'csrf'=>$session['csrf'], 'mode'=>workspace_mode($config), 'context'=>$context]);
        }
        if ($method === 'DELETE') {
            $pdo->beginTransaction();
            $statement = $pdo->prepare('SELECT version FROM tenant_workspace_state WHERE context_hash = ? FOR UPDATE'); $statement->execute([$scopeHash]); $row = $statement->fetch();
            if ($row) $pdo->prepare('DELETE FROM tenant_workspace_state WHERE context_hash = ?')->execute([$scopeHash]);
            tenant_audit($pdo, $context, 'tenant.workspace_deleted', 'workspace_state', $scopeHash, ['version'=>(int)($row['version'] ?? 0)], $key);
            $pdo->commit(); workspace_json(['deleted'=>true, 'csrf'=>$session['csrf'], 'context'=>$context]);
        }
        $body = (string) file_get_contents('php://input'); $payload = json_decode($body, true);
        if (!is_array($payload) || !isset($payload['state']) || !is_array($payload['state']) || !workspace_safe_value($payload['state'])) fail_response(400, 'Invalid workspace payload');
        if (!tenant_workspace_scopes_are_valid($payload['state'], $context)) fail_response(403, 'Operational record scope is not permitted');
        $expectedVersion = filter_var($payload['version'] ?? null, FILTER_VALIDATE_INT, ['options'=>['min_range'=>0]]);
        if ($expectedVersion === false) fail_response(400, 'Invalid workspace version');
        $plain = json_encode($payload['state'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if (!is_string($plain) || strlen($plain) > 786432) fail_response(413, 'Workspace payload is too large');
        $digest = hash('sha256', $plain); [$ciphertext, $iv, $tag] = workspace_encrypt($plain, $key, $aad);
        $pdo->beginTransaction();
        $statement = $pdo->prepare('SELECT version FROM tenant_workspace_state WHERE context_hash = ? FOR UPDATE'); $statement->execute([$scopeHash]); $row = $statement->fetch();
        $currentVersion = $row ? (int) $row['version'] : 0;
        if ($currentVersion !== (int) $expectedVersion) { $pdo->rollBack(); workspace_json(['error'=>'Workspace changed in another session', 'version'=>$currentVersion, 'csrf'=>$session['csrf']], 409); }
        $nextVersion = $currentVersion + 1;
        if ($row) {
            $write = $pdo->prepare('UPDATE tenant_workspace_state SET version = ?, ciphertext = ?, iv = ?, auth_tag = ?, payload_digest = ? WHERE context_hash = ?');
            $write->execute([$nextVersion, $ciphertext, $iv, $tag, $digest, $scopeHash]);
        } else {
            $write = $pdo->prepare('INSERT INTO tenant_workspace_state (context_hash, tenant_id, principal_id, legal_entity_id, location_id, version, ciphertext, iv, auth_tag, payload_digest) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $write->execute([$scopeHash, $context['tenant']['id'], $context['principalId'], $context['company']['id'], $context['location']['id'] ?? null, $nextVersion, $ciphertext, $iv, $tag, $digest]);
        }
        $pdo->commit(); workspace_json(['version'=>$nextVersion, 'savedAt'=>gmdate('c'), 'csrf'=>$session['csrf'], 'context'=>$context]);
    } catch (Throwable $error) { if ($pdo->inTransaction()) $pdo->rollBack(); fail_response(503, 'Secure storage is unavailable'); }
}

// The demo does not call an API. A host must opt in to the local-only proxy.
if (getenv('BUYNIVERSE_ENABLE_BACKEND_PROXY') !== '1') fail_response(404, 'Not found');
$host = getenv('BUYNIVERSE_BACKEND_HOST') ?: '127.0.0.1';
$port = (int) (getenv('BUYNIVERSE_BACKEND_PORT') ?: '8080');
if (!in_array($host, ['127.0.0.1','::1'], true) || $port < 1 || $port > 65535) fail_response(503, 'Backend configuration unavailable');
$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
if (!in_array($method, ['GET','POST','PUT','PATCH','DELETE'], true)) fail_response(405, 'Method not allowed');
if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 1048576) fail_response(413, 'Request body too large');

$headers = [];
foreach (getallheaders() as $key => $value) {
    $name = strtolower((string) $key); $safe = trim((string) $value);
    if (in_array($name, ['content-type','accept','authorization','x-request-id'], true) && !preg_match('/[\\r\\n]/', $safe) && strlen($safe) <= 8192)
        $headers[] = $key . ': ' . $safe;
}
$headers[] = 'X-Forwarded-For: ' . ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');
$headers[] = 'X-Forwarded-Proto: ' . ((($_SERVER['HTTPS'] ?? '') === 'on') ? 'https' : 'http');
$curl = curl_init('http://' . $host . ':' . $port . $rawUri);
if ($curl === false) fail_response(503, 'Backend unavailable');
curl_setopt_array($curl, [CURLOPT_CUSTOMREQUEST=>$method, CURLOPT_HTTPHEADER=>$headers, CURLOPT_RETURNTRANSFER=>true, CURLOPT_HEADER=>true, CURLOPT_TIMEOUT=>15, CURLOPT_CONNECTTIMEOUT=>2, CURLOPT_FOLLOWLOCATION=>false]);
if (in_array($method, ['POST','PUT','PATCH','DELETE'], true)) {
    $body = (string) file_get_contents('php://input'); if (strlen($body) > 1048576) fail_response(413, 'Request body too large');
    curl_setopt($curl, CURLOPT_POSTFIELDS, $body);
}
$response = curl_exec($curl);
if ($response === false) { curl_close($curl); fail_response(503, 'Backend unavailable'); }
$size = (int) curl_getinfo($curl, CURLINFO_HEADER_SIZE); $status = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
$responseHeaders = substr($response, 0, $size); $responseBody = substr($response, $size); curl_close($curl);
security_headers(); http_response_code($status >= 100 && $status <= 599 ? $status : 502);
foreach (explode("\r\n", $responseHeaders) as $header)
    if (preg_match('/^Content-Type:\s*([^\\r\\n]+)$/i', $header, $match)) header('Content-Type: ' . $match[1]);
echo $responseBody;
