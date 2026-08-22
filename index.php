<?php
/** Static-first, fail-closed deployment shim. */
declare(strict_types=1);
error_reporting(E_ALL & ~E_NOTICE & ~E_DEPRECATED);
ini_set('display_errors', '0');

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
    header("Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; frame-ancestors 'none'; frame-src 'none'; child-src 'none'; manifest-src 'self'; script-src 'self' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net; script-src-attr 'none'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: blob:; connect-src 'self' https://cdn.jsdelivr.net https://unpkg.com https://fonts.googleapis.com https://fonts.gstatic.com; media-src 'self'; worker-src 'none'");
    foreach ([
        'Strict-Transport-Security: max-age=63072000; includeSubDomains; preload',
        'X-Content-Type-Options: nosniff', 'X-Frame-Options: DENY', 'Referrer-Policy: no-referrer',
        'Cross-Origin-Opener-Policy: same-origin', 'Cross-Origin-Resource-Policy: same-origin',
        'Origin-Agent-Cluster: ?1', 'X-DNS-Prefetch-Control: off',
        'Permissions-Policy: accelerometer=(), autoplay=(), camera=(), display-capture=(), document-domain=(), encrypted-media=(), fullscreen=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), sync-xhr=(), usb=(), web-share=(), xr-spatial-tracking=()',
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
    return in_array(strtolower(pathinfo($file, PATHINFO_EXTENSION)), ['css','js','json','svg','png','jpg','jpeg','gif','ico','woff','woff2','ttf','vue'], true) ? $file : null;
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
    $mimes = ['css'=>'text/css; charset=utf-8','js'=>'application/javascript; charset=utf-8','json'=>'application/json; charset=utf-8','svg'=>'image/svg+xml','png'=>'image/png','jpg'=>'image/jpeg','jpeg'=>'image/jpeg','gif'=>'image/gif','ico'=>'image/x-icon','woff'=>'font/woff','woff2'=>'font/woff2','ttf'=>'font/ttf','vue'=>'text/plain; charset=utf-8'];
    header('Content-Type: ' . $mimes[strtolower(pathinfo($file, PATHINFO_EXTENSION))]); readfile($file); exit;
}
if (!str_starts_with($uri, '/api/') && $uri !== '/api') serve_spa();

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
