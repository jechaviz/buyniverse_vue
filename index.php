<?php
/** Static-first, fail-closed deployment shim. */
declare(strict_types=1);
error_reporting(E_ALL & ~E_NOTICE & ~E_DEPRECATED);
ini_set('display_errors', '0');
ini_set('expose_php', '0');
if (function_exists('header_remove')) header_remove('X-Powered-By');

if (!function_exists('str_starts_with')) {
    function str_starts_with(string $haystack, string $needle): bool {
        return 0 === strncmp($haystack, $needle, strlen($needle));
    }
}
if (!function_exists('getallheaders')) {
    function getallheaders(): array {
        $out = [];
        foreach ($_SERVER as $key => $value) {
            if (substr($key, 0, 5) === 'HTTP_')
                $out[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($key, 5)))))] = $value;
            elseif ($key === 'CONTENT_TYPE') $out['Content-Type'] = $value;
        }
        return $out;
    }
}

function security_headers(): void {
    // Keep this byte-for-byte aligned with .htaccess and index.html. The hash
    // authorizes only the dynamic <base> bootstrap; no broad inline-script
    // exception is allowed.
    header("Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; frame-ancestors 'none'; frame-src 'none'; child-src 'none'; manifest-src 'self'; script-src 'self' 'sha256-Gq7EzIVYpfwoSm3b31s7d9byqHy/d58ikcNNLBXcyxA=' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net; script-src-attr 'none'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: blob:; connect-src 'self' https://cdn.jsdelivr.net https://unpkg.com https://fonts.googleapis.com https://fonts.gstatic.com; media-src 'self'; worker-src 'none'");
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

// Deployment, database and seed/reset operations never belong to a public endpoint.
$action = (string) ($_GET['action'] ?? '');
if (preg_match('#^/api/v1/(?:deploy|sync|admin/db)(?:/|$)#', $uri) || in_array($action, ['sync','deploy','seed','reset','status'], true))
    fail_response(404, 'Not found');

foreach ([__DIR__ . '/dist', __DIR__] as $root) {
    $file = static_file($root, $path);
    if ($file === null) continue;
    security_headers();
    $mimes = ['css'=>'text/css; charset=utf-8','js'=>'application/javascript; charset=utf-8','json'=>'application/json; charset=utf-8','svg'=>'image/svg+xml','png'=>'image/png','jpg'=>'image/jpeg','jpeg'=>'image/jpeg','gif'=>'image/gif','ico'=>'image/x-icon','woff'=>'font/woff','woff2'=>'font/woff2','ttf'=>'font/ttf','vue'=>'text/plain; charset=utf-8','txt'=>'text/plain; charset=utf-8','xml'=>'application/xml; charset=utf-8'];
    header('Content-Type: ' . $mimes[strtolower(pathinfo($file, PATHINFO_EXTENSION))]); readfile($file); exit;
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
function workspace_header(string $name): string {
    foreach (getallheaders() as $key => $value)
        if (strcasecmp((string) $key, $name) === 0) return trim((string) $value);
    return '';
}
function workspace_session(): array {
    if (session_status() !== PHP_SESSION_ACTIVE) {
        $secure = (($_SERVER['HTTPS'] ?? '') === 'on') || strtolower(workspace_header('X-Forwarded-Proto')) === 'https';
        session_name('buyniverse_workspace');
        session_set_cookie_params(['lifetime'=>0, 'path'=>'/', 'secure'=>$secure, 'httponly'=>true, 'samesite'=>'Strict']);
        ini_set('session.use_strict_mode', '1');
        ini_set('session.cookie_httponly', '1');
        ini_set('session.cookie_samesite', 'Strict');
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
function workspace_encrypt(string $plain, string $key): array {
    $iv = random_bytes(12); $tag = '';
    $ciphertext = openssl_encrypt($plain, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag, 'buyniverse-workspace-v1');
    if ($ciphertext === false || strlen($tag) !== 16) fail_response(503, 'Secure storage encryption unavailable');
    return [$ciphertext, $iv, $tag];
}
function workspace_decrypt(array $row, string $key): ?array {
    $plain = openssl_decrypt((string) $row['ciphertext'], 'aes-256-gcm', $key, OPENSSL_RAW_DATA, (string) $row['iv'], (string) $row['auth_tag'], 'buyniverse-workspace-v1');
    if ($plain === false || strlen($plain) > 786432) return null;
    $state = json_decode($plain, true);
    return is_array($state) && workspace_safe_value($state) ? $state : null;
}
function workspace_audit(PDO $pdo, string $sessionHash, int $version, string $action, string $digest, string $key): void {
    $mac = hash_hmac('sha256', implode('|', [$sessionHash, $version, $action, $digest]), $key);
    $statement = $pdo->prepare('INSERT INTO workspace_state_audit (session_hash, version, action, payload_digest, event_mac) VALUES (?, ?, ?, ?, ?)');
    $statement->execute([$sessionHash, $version, $action, $digest, $mac]);
}

if ($uri === '/api/v1/workspace-state' || $uri === '/api/v1/workspace-state/') {
    $config = workspace_config();
    // This capability-bound store is only for the public demo. Production must
    // turn this flag off and issue the session from a verified OIDC/MFA flow.
    if (($config['allow_demo_workspace_state'] ?? false) !== true) fail_response(503, 'Secure workspace storage is not enabled');
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if (!in_array($method, ['GET','PUT','DELETE'], true)) fail_response(405, 'Method not allowed');
    if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 786432) fail_response(413, 'Request body too large');
    $session = workspace_session(); $pdo = workspace_pdo($config); $key = workspace_key($config);
    if ($method !== 'GET') {
        if (!hash_equals($session['csrf'], workspace_header('X-Buyniverse-CSRF')) || workspace_header('X-Buyniverse-Request') !== 'workspace-state-v1') fail_response(403, 'Request verification failed');
        $lastWrite = (float) ($_SESSION['workspace_last_write'] ?? 0);
        if (microtime(true) - $lastWrite < 0.35) fail_response(429, 'Please wait before saving again');
        $_SESSION['workspace_last_write'] = microtime(true);
    }
    if ($method === 'GET') {
        $statement = $pdo->prepare('SELECT version, ciphertext, iv, auth_tag FROM workspace_state WHERE session_hash = ? LIMIT 1');
        $statement->execute([$session['hash']]); $row = $statement->fetch();
        if (!$row) workspace_json(['state'=>null, 'version'=>0, 'csrf'=>$session['csrf'], 'mode'=>'server']);
        $state = workspace_decrypt($row, $key);
        if ($state === null) fail_response(409, 'Stored workspace integrity check failed');
        workspace_json(['state'=>$state, 'version'=>(int) $row['version'], 'csrf'=>$session['csrf'], 'mode'=>'server']);
    }
    if ($method === 'DELETE') {
        $pdo->beginTransaction();
        try {
            $statement = $pdo->prepare('SELECT version, payload_digest FROM workspace_state WHERE session_hash = ? FOR UPDATE');
            $statement->execute([$session['hash']]); $row = $statement->fetch();
            if ($row) {
                $delete = $pdo->prepare('DELETE FROM workspace_state WHERE session_hash = ?'); $delete->execute([$session['hash']]);
                workspace_audit($pdo, $session['hash'], (int) $row['version'], 'deleted', (string) $row['payload_digest'], $key);
            }
            $pdo->commit(); workspace_json(['deleted'=>true, 'csrf'=>$session['csrf']]);
        } catch (Throwable $error) { if ($pdo->inTransaction()) $pdo->rollBack(); fail_response(503, 'Secure storage is unavailable'); }
    }
    $body = (string) file_get_contents('php://input'); $payload = json_decode($body, true);
    if (!is_array($payload) || !isset($payload['state']) || !is_array($payload['state']) || !workspace_safe_value($payload['state'])) fail_response(400, 'Invalid workspace payload');
    $expectedVersion = filter_var($payload['version'] ?? null, FILTER_VALIDATE_INT, ['options'=>['min_range'=>0]]);
    if ($expectedVersion === false) fail_response(400, 'Invalid workspace version');
    $plain = json_encode($payload['state'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if (!is_string($plain) || strlen($plain) > 786432) fail_response(413, 'Workspace payload is too large');
    $digest = hash('sha256', $plain); [$ciphertext, $iv, $tag] = workspace_encrypt($plain, $key);
    $pdo->beginTransaction();
    try {
        $statement = $pdo->prepare('SELECT version FROM workspace_state WHERE session_hash = ? FOR UPDATE'); $statement->execute([$session['hash']]); $row = $statement->fetch();
        $currentVersion = $row ? (int) $row['version'] : 0;
        if ($currentVersion !== (int) $expectedVersion) { $pdo->rollBack(); workspace_json(['error'=>'Workspace changed in another session', 'version'=>$currentVersion, 'csrf'=>$session['csrf']], 409); }
        $nextVersion = $currentVersion + 1;
        if ($row) {
            $write = $pdo->prepare('UPDATE workspace_state SET version = ?, ciphertext = ?, iv = ?, auth_tag = ?, payload_digest = ? WHERE session_hash = ?');
            $write->execute([$nextVersion, $ciphertext, $iv, $tag, $digest, $session['hash']]); workspace_audit($pdo, $session['hash'], $nextVersion, 'updated', $digest, $key);
        } else {
            $write = $pdo->prepare('INSERT INTO workspace_state (session_hash, version, ciphertext, iv, auth_tag, payload_digest) VALUES (?, ?, ?, ?, ?, ?)');
            $write->execute([$session['hash'], $nextVersion, $ciphertext, $iv, $tag, $digest]); workspace_audit($pdo, $session['hash'], $nextVersion, 'created', $digest, $key);
        }
        $pdo->commit(); workspace_json(['version'=>$nextVersion, 'savedAt'=>gmdate('c'), 'csrf'=>$session['csrf']]);
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
