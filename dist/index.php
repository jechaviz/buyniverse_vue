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

// ---------------------------------------------------------------------------
// Federated social identity (server-side Authorization Code flow)
// ---------------------------------------------------------------------------
// Provider client secrets are read only from the runtime configuration outside
// the document root. Tokens are used once to obtain a profile and are never
// returned to, stored in, or trusted from the browser.
function social_base_path(): string {
    $script = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? '/index.php'));
    if (!str_ends_with($script, '/index.php')) return '';
    $base = substr($script, 0, -10);
    return $base === '/' ? '' : rtrim($base, '/');
}
function social_b64url(string $bytes): string { return rtrim(strtr(base64_encode($bytes), '+/', '-_'), '='); }
function social_redirect(string $path): void {
    // Every terminal redirect is local and deliberately drops provider query
    // parameters, especially the short-lived authorization code.
    if (!str_starts_with($path, '/')) $path = '/';
    security_headers(); http_response_code(303); header('Location: ' . $path); exit;
}
function social_callback_path(string $provider): string { return social_base_path() . '/api/v1/auth/' . $provider . '/callback'; }
function social_provider_config(array $config, string $provider): ?array {
    $map = ['google'=>'google_oidc', 'facebook'=>'facebook_oauth'];
    if (!isset($map[$provider])) return null;
    $raw = $config['identity'][$map[$provider]] ?? null;
    if (!is_array($raw) || ($raw['enabled'] ?? false) !== true) return null;
    $clientId = tenant_text($raw['client_id'] ?? '', 360);
    // client_secret_ref is documentation for the platform's secret manager,
    // never a usable secret. The runtime loader must hydrate client_secret.
    $clientSecret = tenant_text($raw['client_secret'] ?? '', 2048);
    $redirectUri = tenant_text($raw['redirect_uri'] ?? '', 500);
    $parts = parse_url($redirectUri);
    $host = strtolower((string) ($parts['host'] ?? ''));
    $scheme = strtolower((string) ($parts['scheme'] ?? ''));
    $path = (string) ($parts['path'] ?? '');
    $loopback = in_array($host, ['localhost','127.0.0.1','::1'], true);
    if ($clientId === '' || $clientSecret === '' || !in_array($scheme, ['https','http'], true) ||
        ($scheme !== 'https' && !$loopback) || $host === '' || $path !== social_callback_path($provider) ||
        isset($parts['user']) || isset($parts['pass']) || isset($parts['query']) || isset($parts['fragment'])) return null;
    if ($provider === 'google') return [
        'id'=>'google', 'name'=>'Google', 'provider'=>'google_oidc', 'client_id'=>$clientId, 'client_secret'=>$clientSecret, 'redirect_uri'=>$redirectUri,
        'authorization_endpoint'=>'https://accounts.google.com/o/oauth2/v2/auth', 'token_endpoint'=>'https://oauth2.googleapis.com/token',
        'profile_endpoint'=>'https://openidconnect.googleapis.com/v1/userinfo', 'scope'=>'openid email profile', 'pkce'=>true,
    ];
    $version = tenant_text($raw['graph_version'] ?? 'v22.0', 16);
    if (preg_match('/^v[0-9]{1,3}\.[0-9]{1,3}$/', $version) !== 1) return null;
    return [
        'id'=>'facebook', 'name'=>'Facebook', 'provider'=>'facebook_oauth', 'client_id'=>$clientId, 'client_secret'=>$clientSecret, 'redirect_uri'=>$redirectUri,
        'authorization_endpoint'=>'https://www.facebook.com/' . $version . '/dialog/oauth', 'token_endpoint'=>'https://graph.facebook.com/' . $version . '/oauth/access_token',
        'profile_endpoint'=>'https://graph.facebook.com/' . $version . '/me?fields=id,name,email', 'scope'=>'email,public_profile', 'pkce'=>false,
    ];
}
function social_rate_limit(string $bucket, int $limit, int $windowSeconds): void {
    $now = time(); $entry = $_SESSION['social_rate_limits'][$bucket] ?? ['startedAt'=>0, 'count'=>0];
    if (!is_array($entry) || $now - (int) ($entry['startedAt'] ?? 0) >= $windowSeconds) $entry = ['startedAt'=>$now, 'count'=>0];
    if ((int) $entry['count'] >= $limit) fail_response(429, 'Please wait before trying again');
    $entry['count'] = (int) $entry['count'] + 1; $_SESSION['social_rate_limits'][$bucket] = $entry;
}
function social_http_json(string $url, string $method, array $headers = [], ?array $form = null): array {
    if (!function_exists('curl_init') || !str_starts_with($url, 'https://')) throw new RuntimeException('Federated identity transport unavailable');
    $curl = curl_init($url); if ($curl === false) throw new RuntimeException('Federated identity transport unavailable');
    $requestHeaders = array_merge(['Accept: application/json', 'User-Agent: Buyniverse-Identity/1.0'], $headers);
    $options = [CURLOPT_CUSTOMREQUEST=>$method, CURLOPT_HTTPHEADER=>$requestHeaders, CURLOPT_RETURNTRANSFER=>true, CURLOPT_HEADER=>false,
        CURLOPT_TIMEOUT=>12, CURLOPT_CONNECTTIMEOUT=>4, CURLOPT_FOLLOWLOCATION=>false, CURLOPT_MAXREDIRS=>0,
        CURLOPT_SSL_VERIFYPEER=>true, CURLOPT_SSL_VERIFYHOST=>2, CURLOPT_FAILONERROR=>false];
    if ($form !== null) { $options[CURLOPT_POSTFIELDS] = http_build_query($form, '', '&', PHP_QUERY_RFC3986); $requestHeaders[] = 'Content-Type: application/x-www-form-urlencoded'; $options[CURLOPT_HTTPHEADER] = $requestHeaders; }
    curl_setopt_array($curl, $options); $raw = curl_exec($curl); $status = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE); curl_close($curl);
    if (!is_string($raw) || strlen($raw) > 262144 || $status < 200 || $status >= 300) throw new RuntimeException('Federated identity provider rejected the request');
    $body = json_decode($raw, true); if (!is_array($body) || !workspace_safe_value($body)) throw new RuntimeException('Federated identity response was invalid');
    return $body;
}
function social_profile(array $provider, string $code, string $verifier): array {
    $form = ['client_id'=>$provider['client_id'], 'client_secret'=>$provider['client_secret'], 'code'=>$code, 'grant_type'=>'authorization_code', 'redirect_uri'=>$provider['redirect_uri']];
    if (!empty($provider['pkce'])) $form['code_verifier'] = $verifier;
    $tokens = social_http_json($provider['token_endpoint'], 'POST', [], $form);
    $accessToken = $tokens['access_token'] ?? null;
    if (!is_string($accessToken) || strlen($accessToken) < 16 || strlen($accessToken) > 8192) throw new RuntimeException('Federated identity token was invalid');
    $profile = social_http_json($provider['profile_endpoint'], 'GET', ['Authorization: Bearer ' . $accessToken]);
    $subject = $provider['id'] === 'google' ? ($profile['sub'] ?? null) : ($profile['id'] ?? null);
    if (!is_string($subject) || strlen($subject) < 6 || strlen($subject) > 320 || preg_match('/^[A-Za-z0-9._:@-]+$/', $subject) !== 1) throw new RuntimeException('Federated identity subject was invalid');
    if ($provider['id'] === 'google' && !in_array($profile['email_verified'] ?? false, [true, 'true', 1, '1'], true)) throw new RuntimeException('Google account email is not verified');
    $displayName = tenant_text($profile['name'] ?? '', 180) ?: 'Personal workspace owner';
    $email = isset($profile['email']) && is_string($profile['email']) && filter_var($profile['email'], FILTER_VALIDATE_EMAIL) ? strtolower(trim($profile['email'])) : null;
    return ['provider'=>$provider['provider'], 'subject'=>$subject, 'displayName'=>$displayName, 'email'=>$email, 'emailVerified'=>$provider['id'] === 'google'];
}
function social_start(array $config, string $provider): void {
    $definition = social_provider_config($config, $provider); if ($definition === null) fail_response(404, 'Identity provider is not enabled');
    social_rate_limit('start_' . $provider, 12, 600);
    $state = social_b64url(random_bytes(32)); $verifier = social_b64url(random_bytes(48));
    $_SESSION['social_oauth'] = ['provider'=>$provider, 'state'=>$state, 'verifier'=>$verifier, 'expiresAt'=>time() + 600];
    $query = ['client_id'=>$definition['client_id'], 'redirect_uri'=>$definition['redirect_uri'], 'response_type'=>'code', 'scope'=>$definition['scope'], 'state'=>$state];
    if (!empty($definition['pkce'])) { $query['code_challenge'] = social_b64url(hash('sha256', $verifier, true)); $query['code_challenge_method'] = 'S256'; }
    security_headers(); header('Location: ' . $definition['authorization_endpoint'] . '?' . http_build_query($query, '', '&', PHP_QUERY_RFC3986), true, 303); exit;
}
function social_callback(PDO $pdo, array $config, array $session, string $key, string $provider): void {
    $definition = social_provider_config($config, $provider); $pending = $_SESSION['social_oauth'] ?? null;
    $state = $_GET['state'] ?? ''; $code = $_GET['code'] ?? ''; $error = $_GET['error'] ?? '';
    if ($definition === null || !is_array($pending) || ($pending['provider'] ?? '') !== $provider || !is_string($state) || !is_string($pending['state'] ?? null) ||
        !hash_equals((string) $pending['state'], $state) || time() > (int) ($pending['expiresAt'] ?? 0) || !is_string($code) || strlen($code) < 6 || strlen($code) > 4096 || $error !== '') {
        unset($_SESSION['social_oauth']); social_redirect(social_base_path() . '/#/?login_error=cancelled');
    }
    social_rate_limit('callback_' . $provider, 8, 600);
    try { $identity = social_profile($definition, $code, (string) ($pending['verifier'] ?? '')); }
    catch (Throwable $error) { unset($_SESSION['social_oauth']); social_redirect(social_base_path() . '/#/?login_error=identity'); }
    unset($_SESSION['social_oauth'], $_SESSION['tenant_context'], $_SESSION['tenant_demo_subject']);
    session_regenerate_id(true); $_SESSION['workspace_csrf'] = bin2hex(random_bytes(32)); $_SESSION['buyniverse_identity'] = $identity;
    $context = tenant_context($pdo, $config, $session, $key);
    $pdo->beginTransaction();
    try {
        // Google only reaches this point after its verified-email check. A
        // Facebook profile email has no equivalent assertion in this flow and
        // therefore must never receive a security-relevant mail automatically.
        if (($identity['emailVerified'] ?? false) === true && is_string($identity['email'] ?? null)) {
            $welcome = mail_enqueue($pdo, $config, $key, $context, 'auth.welcome', $identity['email'], [
                'recipient_name'=>$identity['displayName'] ?? 'there',
                'workspace_name'=>$context['tenant']['name'] ?? 'Buyniverse',
                'action_url'=>mail_public_url($config, '/#/dashboard'),
            ], 'auth-welcome:' . $context['principalId'], null, 'es');
            tenant_audit($pdo, $context, 'email.queued', 'email_outbox', $welcome['id'], ['template'=>'auth.welcome','reused'=>!$welcome['queued']], $key);
        }
        tenant_audit($pdo, $context, 'identity.social_authenticated', 'principal', $context['principalId'], ['provider'=>$identity['provider']], $key);
        $pdo->commit();
    } catch (Throwable $error) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $error; }
    social_redirect(social_base_path() . '/#/dashboard?login=' . rawurlencode($provider));
}

// ---------------------------------------------------------------------------
// SaaS tenant boundary
// ---------------------------------------------------------------------------
// Context is derived from the server session and memberships. Client-provided
// company, branch and warehouse ids are selectors only; they can never grant
// a permission by themselves.
function tenant_uuid(): string {
    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
    $hex = bin2hex($bytes);
    return substr($hex, 0, 8) . '-' . substr($hex, 8, 4) . '-' . substr($hex, 12, 4) . '-' . substr($hex, 16, 4) . '-' . substr($hex, 20);
}
function tenant_is_uuid($value): bool {
    return is_string($value) && preg_match('/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i', $value) === 1;
}
function tenant_text($value, int $limit): string {
    if (!is_string($value)) return '';
    $value = trim(preg_replace('/[\x00-\x1f\x7f]/u', '', $value) ?? '');
    return function_exists('mb_substr') ? mb_substr($value, 0, $limit, 'UTF-8') : substr($value, 0, $limit);
}
function tenant_rfc($value): string {
    $rfc = strtoupper(tenant_text($value, 13));
    return preg_match('/^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/u', $rfc) === 1 ? $rfc : '';
}
function tenant_header_origin_is_safe(): bool {
    $origin = workspace_header('Origin');
    if ($origin === '') return true; // SameSite + CSRF protects older clients without Origin.
    $parts = parse_url($origin);
    $host = strtolower((string) ($parts['host'] ?? ''));
    $requestHost = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
    $requestHost = preg_replace('/:\d+$/', '', $requestHost) ?? '';
    $secure = (($_SERVER['HTTPS'] ?? '') === 'on') || strtolower(workspace_header('X-Forwarded-Proto')) === 'https';
    $scheme = strtolower((string) ($parts['scheme'] ?? ''));
    return $host !== '' && hash_equals($requestHost, $host) && ($secure ? $scheme === 'https' : in_array($scheme, ['http','https'], true));
}
function tenant_require_write(array $session): void {
    if (!tenant_header_origin_is_safe() || !hash_equals($session['csrf'], workspace_header('X-Buyniverse-CSRF')) || workspace_header('X-Buyniverse-Request') !== 'tenant-context-v1')
        fail_response(403, 'Request verification failed');
    $lastWrite = (float) ($_SESSION['tenant_last_write'] ?? 0);
    if (microtime(true) - $lastWrite < 0.35) fail_response(429, 'Please wait before saving again');
    $_SESSION['tenant_last_write'] = microtime(true);
}
function tenant_request_body(): array {
    if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 32768) fail_response(413, 'Request body too large');
    $body = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($body) || !workspace_safe_value($body)) fail_response(400, 'Invalid request payload');
    return $body;
}
function tenant_audit(PDO $pdo, array $context, string $action, string $resourceType, string $resourceId, array $payload, string $key): void {
    $payloadJson = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if (!is_string($payloadJson)) throw new RuntimeException('Unable to encode audit payload');
    // The tenant/id index and FOR UPDATE serialize concurrent events per tenant.
    $last = $pdo->prepare('SELECT chain_hash FROM tenant_audit_events WHERE tenant_id = ? ORDER BY id DESC LIMIT 1 FOR UPDATE');
    $last->execute([$context['tenant']['id']]);
    $previous = (string) (($last->fetch()['chain_hash'] ?? str_repeat('0', 64)));
    $digest = hash('sha256', $payloadJson);
    $chain = hash('sha256', implode('|', [$previous, $context['tenant']['id'], $context['company']['id'], $context['location']['id'] ?? '', $context['principalId'], $action, $resourceType, $resourceId, $digest]));
    $mac = hash_hmac('sha256', $chain, $key);
    $write = $pdo->prepare('INSERT INTO tenant_audit_events (tenant_id, legal_entity_id, location_id, actor_principal_id, action, resource_type, resource_id, payload_digest, previous_hash, chain_hash, event_mac) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $write->execute([$context['tenant']['id'], $context['company']['id'], $context['location']['id'] ?? null, $context['principalId'], $action, $resourceType, $resourceId, $digest, $previous, $chain, $mac]);
}
function tenant_seed_demo(PDO $pdo, array $principal, string $key): void {
    $membership = $pdo->prepare('SELECT id FROM tenant_memberships WHERE principal_id = ? AND status = "active" LIMIT 1');
    $membership->execute([$principal['id']]);
    if ($membership->fetch()) return;
    $tenantId = tenant_uuid(); $companyOne = tenant_uuid(); $companyTwo = tenant_uuid();
    $branch = tenant_uuid(); $warehouse = tenant_uuid(); $secondBranch = tenant_uuid();
    $pdo->beginTransaction();
    try {
        $pdo->prepare('INSERT INTO tenant_accounts (id, display_name) VALUES (?, ?)')->execute([$tenantId, 'Demo multi-company workspace']);
        $company = $pdo->prepare('INSERT INTO tenant_legal_entities (id, tenant_id, legal_name, rfc, rfc_hash, tax_regime) VALUES (?, ?, ?, ?, ?, ?)');
        $company->execute([$companyOne, $tenantId, 'Grupo Nébula Servicios, S.A. de C.V.', 'XAXX010101000', hash_hmac('sha256', 'XAXX010101000', $key), '601']);
        $company->execute([$companyTwo, $tenantId, 'Nébula Operaciones, S.A. de C.V.', 'XEXX010101000', hash_hmac('sha256', 'XEXX010101000', $key), '601']);
        $location = $pdo->prepare('INSERT INTO tenant_locations (id, tenant_id, legal_entity_id, kind, code, name) VALUES (?, ?, ?, ?, ?, ?)');
        $location->execute([$branch, $tenantId, $companyOne, 'branch', 'CDMX-MAT', 'Matriz CDMX']);
        $location->execute([$warehouse, $tenantId, $companyOne, 'warehouse', 'CDMX-CEDIS', 'CEDIS Ciudad de México']);
        $location->execute([$secondBranch, $tenantId, $companyTwo, 'branch', 'MTY-OP', 'Operaciones Monterrey']);
        $pdo->prepare('INSERT INTO tenant_memberships (id, tenant_id, principal_id, role_key, scope_kind) VALUES (?, ?, ?, "owner", "tenant")')->execute([tenant_uuid(), $tenantId, $principal['id']]);
        $context = ['principalId'=>$principal['id'], 'tenant'=>['id'=>$tenantId], 'company'=>['id'=>$companyOne], 'location'=>['id'=>null]];
        tenant_audit($pdo, $context, 'tenant.demo_seeded', 'tenant_account', $tenantId, ['companies'=>2,'locations'=>3], $key);
        $pdo->commit();
    } catch (Throwable $error) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $error; }
}
function tenant_seed_personal_workspace(PDO $pdo, array $principal, string $key): void {
    $membership = $pdo->prepare('SELECT id FROM tenant_memberships WHERE principal_id = ? AND status = "active" LIMIT 1');
    $membership->execute([$principal['id']]);
    if ($membership->fetch()) return;
    $tenantId = tenant_uuid(); $workspaceId = tenant_uuid();
    $displayName = tenant_text($principal['display_name'] ?? 'Personal', 160) ?: 'Personal';
    $pdo->beginTransaction();
    try {
        // A personal workspace is a tenant boundary, not an RFC-bearing fiscal
        // entity. The row keeps the existing authorization model uniform while
        // fiscal modules can require a verified business entity before issuing.
        $pdo->prepare('INSERT INTO tenant_accounts (id, display_name, account_kind) VALUES (?, ?, "individual")')->execute([$tenantId, $displayName . ' · Personal']);
        $pdo->prepare('INSERT INTO tenant_legal_entities (id, tenant_id, legal_name, rfc, rfc_hash, tax_regime) VALUES (?, ?, ?, NULL, NULL, NULL)')->execute([$workspaceId, $tenantId, $displayName . ' · Personal workspace']);
        $pdo->prepare('INSERT INTO tenant_memberships (id, tenant_id, principal_id, role_key, scope_kind) VALUES (?, ?, ?, "owner", "tenant")')->execute([tenant_uuid(), $tenantId, $principal['id']]);
        $context = ['principalId'=>$principal['id'], 'tenant'=>['id'=>$tenantId], 'company'=>['id'=>$workspaceId], 'location'=>['id'=>null]];
        tenant_audit($pdo, $context, 'tenant.personal_workspace_created', 'tenant_account', $tenantId, ['identityProvider'=>$principal['provider']], $key);
        $pdo->commit();
    } catch (Throwable $error) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $error; }
}
function tenant_principal(PDO $pdo, array $config, array $session, string $key): array {
    $identity = $_SESSION['buyniverse_identity'] ?? null;
    if (is_array($identity) && in_array($identity['provider'] ?? '', ['entra_oidc','aws_ldaps','google_oidc','facebook_oauth'], true) && is_string($identity['subject'] ?? null) && strlen($identity['subject']) >= 6) {
        $provider = (string) $identity['provider'];
        $subject = (string) $identity['subject'];
        $displayName = tenant_text($identity['displayName'] ?? 'Enterprise user', 180) ?: 'Enterprise user';
        $emailHash = isset($identity['email']) && is_string($identity['email']) ? hash_hmac('sha256', strtolower(trim($identity['email'])), $key) : null;
    } elseif (workspace_mode($config) === 'demo' && ($config['allow_demo_workspace_state'] ?? false) === true) {
        if (empty($_SESSION['tenant_demo_subject'])) $_SESSION['tenant_demo_subject'] = bin2hex(random_bytes(32));
        $provider = 'demo'; $subject = (string) $_SESSION['tenant_demo_subject']; $displayName = 'Demo workspace owner'; $emailHash = null;
    } else {
        fail_response(401, 'Enterprise identity is required');
    }
    $subjectHash = hash_hmac('sha256', $subject, $key);
    $find = $pdo->prepare('SELECT id, provider, display_name, status FROM tenant_principals WHERE provider = ? AND subject_hash = ? LIMIT 1');
    $find->execute([$provider, $subjectHash]); $principal = $find->fetch();
    if (!$principal) {
        $id = tenant_uuid();
        $pdo->prepare('INSERT INTO tenant_principals (id, provider, subject_hash, display_name, email_hash) VALUES (?, ?, ?, ?, ?)')->execute([$id, $provider, $subjectHash, $displayName, $emailHash]);
        $principal = ['id'=>$id, 'provider'=>$provider, 'display_name'=>$displayName, 'status'=>'active'];
    }
    if (($principal['status'] ?? '') !== 'active') fail_response(403, 'Identity is disabled');
    if ($provider === 'demo') tenant_seed_demo($pdo, $principal, $key);
    if (in_array($provider, ['google_oidc','facebook_oauth'], true)) tenant_seed_personal_workspace($pdo, $principal, $key);
    return ['id'=>(string) $principal['id'], 'provider'=>(string) $principal['provider'], 'displayName'=>(string) $principal['display_name']];
}
function tenant_context(PDO $pdo, array $config, array $session, string $key, ?array $requested = null): array {
    $principal = tenant_principal($pdo, $config, $session, $key);
    $rows = $pdo->prepare('SELECT id, tenant_id, role_key, scope_kind, legal_entity_id, location_id FROM tenant_memberships WHERE principal_id = ? AND status = "active" ORDER BY created_at ASC');
    $rows->execute([$principal['id']]); $memberships = $rows->fetchAll();
    if (!$memberships) fail_response(403, 'No active company membership');
    $tenantIds = array_values(array_unique(array_map(static fn($row) => (string) $row['tenant_id'], $memberships)));
    $tenantQuery = $pdo->prepare('SELECT id, display_name, account_kind FROM tenant_accounts WHERE id IN (' . implode(',', array_fill(0, count($tenantIds), '?')) . ') AND status = "active"');
    $tenantQuery->execute($tenantIds); $tenants = [];
    foreach ($tenantQuery->fetchAll() as $tenant) $tenants[(string) $tenant['id']] = $tenant;
    if (!$tenants) fail_response(403, 'No active tenant');
    $entityQuery = $pdo->prepare('SELECT id, tenant_id, legal_name, rfc, tax_regime FROM tenant_legal_entities WHERE tenant_id IN (' . implode(',', array_fill(0, count($tenantIds), '?')) . ') AND status = "active" ORDER BY legal_name ASC');
    $entityQuery->execute($tenantIds); $entities = [];
    foreach ($entityQuery->fetchAll() as $entity) $entities[(string) $entity['id']] = $entity;
    $locationQuery = $pdo->prepare('SELECT id, tenant_id, legal_entity_id, kind, code, name FROM tenant_locations WHERE tenant_id IN (' . implode(',', array_fill(0, count($tenantIds), '?')) . ') AND status = "active" ORDER BY name ASC');
    $locationQuery->execute($tenantIds); $locations = [];
    foreach ($locationQuery->fetchAll() as $location) $locations[(string) $location['id']] = $location;
    $access = []; $roles = []; $locationAccess = [];
    foreach ($memberships as $membership) {
        $tenantId = (string) $membership['tenant_id']; if (!isset($tenants[$tenantId])) continue;
        $roles[$tenantId][] = ['role'=>(string)$membership['role_key'], 'scope'=>(string)$membership['scope_kind'], 'entity'=>(string)($membership['legal_entity_id'] ?? ''), 'location'=>(string)($membership['location_id'] ?? '')];
        if ($membership['scope_kind'] === 'tenant') {
            foreach ($entities as $entityId => $entity) if ($entity['tenant_id'] === $tenantId) { $access[$entityId] = true; $locationAccess[$entityId] = '*'; }
        } elseif ($membership['scope_kind'] === 'legal_entity' && isset($entities[$membership['legal_entity_id']])) {
            $access[(string)$membership['legal_entity_id']] = true; $locationAccess[(string)$membership['legal_entity_id']] = '*';
        } elseif ($membership['scope_kind'] === 'location' && isset($locations[$membership['location_id']])) {
            $entityId = (string)$membership['legal_entity_id']; $access[$entityId] = true;
            if (($locationAccess[$entityId] ?? null) !== '*') $locationAccess[$entityId][(string)$membership['location_id']] = true;
        }
    }
    if (!$access) fail_response(403, 'No accessible legal entity');
    $saved = is_array($_SESSION['tenant_context'] ?? null) ? $_SESSION['tenant_context'] : [];
    $requestedCompany = $requested['companyId'] ?? $saved['companyId'] ?? null;
    $companyId = tenant_is_uuid($requestedCompany) && isset($access[$requestedCompany]) ? $requestedCompany : array_key_first($access);
    $company = $entities[$companyId]; $tenantId = (string)$company['tenant_id'];
    $requestedLocation = $requested['locationId'] ?? $saved['locationId'] ?? null;
    $locationId = tenant_is_uuid($requestedLocation) ? $requestedLocation : null;
    if ($locationId && (!isset($locations[$locationId]) || $locations[$locationId]['legal_entity_id'] !== $companyId || (($locationAccess[$companyId] ?? null) !== '*' && !isset($locationAccess[$companyId][$locationId])))) $locationId = null;
    $companyLocations = [];
    foreach ($locations as $location) {
        $entityId = (string)$location['legal_entity_id'];
        if (!isset($access[$entityId])) continue;
        if (($locationAccess[$entityId] ?? null) !== '*' && !isset($locationAccess[$entityId][$location['id']])) continue;
        $companyLocations[$entityId][] = ['id'=>(string)$location['id'], 'kind'=>(string)$location['kind'], 'code'=>(string)$location['code'], 'name'=>(string)$location['name']];
    }
    $companies = [];
    foreach ($entities as $entityId => $entity) if (isset($access[$entityId])) $companies[] = ['id'=>$entityId, 'legalName'=>(string)$entity['legal_name'], 'rfc'=>(string)($entity['rfc'] ?? ''), 'taxRegime'=>(string)($entity['tax_regime'] ?? ''), 'kind'=>(string)($tenants[(string)$entity['tenant_id']]['account_kind'] ?? 'business'), 'locations'=>$companyLocations[$entityId] ?? []];
    $roleSet = $roles[$tenantId] ?? [];
    $manageTenant = false; $manageCompany = false;
    foreach ($roleSet as $role) {
        $privileged = in_array($role['role'], ['owner','admin'], true);
        if ($privileged && $role['scope'] === 'tenant') $manageTenant = true;
        if ($privileged && ($role['scope'] === 'tenant' || ($role['scope'] === 'legal_entity' && $role['entity'] === $companyId) || ($role['scope'] === 'location' && $role['entity'] === $companyId))) $manageCompany = true;
    }
    $context = [
        'principalId'=>$principal['id'], 'principal'=>['provider'=>$principal['provider'],'displayName'=>$principal['displayName']],
        'tenant'=>['id'=>$tenantId,'name'=>(string)$tenants[$tenantId]['display_name'],'kind'=>(string)($tenants[$tenantId]['account_kind'] ?? 'business')],
        'company'=>['id'=>$companyId,'legalName'=>(string)$company['legal_name'],'rfc'=>(string)($company['rfc'] ?? ''),'taxRegime'=>(string)($company['tax_regime'] ?? ''),'kind'=>(string)($tenants[$tenantId]['account_kind'] ?? 'business')],
        'location'=>$locationId ? ['id'=>$locationId,'kind'=>(string)$locations[$locationId]['kind'],'code'=>(string)$locations[$locationId]['code'],'name'=>(string)$locations[$locationId]['name']] : null,
        'companies'=>$companies, 'permissions'=>['manageTenant'=>$manageTenant,'manageCompany'=>$manageCompany],
    ];
    $context['contextHash'] = hash_hmac('sha256', implode('|', [$principal['id'], $tenantId, $companyId, $locationId ?? 'all']), $key);
    $_SESSION['tenant_context'] = ['companyId'=>$companyId,'locationId'=>$locationId];
    return $context;
}
function tenant_company_is_accessible(PDO $pdo, array $context, string $companyId): bool {
    foreach ($context['companies'] as $company) if (hash_equals((string)$company['id'], $companyId)) return true;
    return false;
}
function tenant_require_permission(array $context, string $permission): void {
    if (empty($context['permissions'][$permission])) fail_response(403, 'Insufficient company permission');
}
function tenant_can_manage_company(PDO $pdo, array $context, string $companyId): bool {
    $statement = $pdo->prepare('SELECT 1 FROM tenant_memberships WHERE tenant_id = ? AND principal_id = ? AND status = "active" AND role_key IN ("owner", "admin") AND (scope_kind = "tenant" OR (scope_kind = "legal_entity" AND legal_entity_id = ?)) LIMIT 1');
    $statement->execute([$context['tenant']['id'], $context['principalId'], $companyId]);
    return (bool) $statement->fetchColumn();
}
// Workspace state is encrypted as one document, so every durable operational
// record still carries a context binding. This validation makes company and
// branch/warehouse scope an authorization invariant rather than a UI hint.
function tenant_operational_scope_is_valid($scope, array $context): bool {
    if (!is_array($scope)) return false;
    $tenantId = $scope['tenantId'] ?? null;
    $companyId = $scope['companyId'] ?? null;
    $locationId = $scope['locationId'] ?? null;
    if (!tenant_is_uuid($tenantId) || !tenant_is_uuid($companyId)) return false;
    if (!hash_equals((string)$context['tenant']['id'], $tenantId) || !hash_equals((string)$context['company']['id'], $companyId)) return false;
    if ($locationId !== null && !tenant_is_uuid($locationId)) return false;
    $expectedLocation = $context['location']['id'] ?? null;
    if ($expectedLocation === null) return $locationId === null;
    return is_string($locationId) && hash_equals((string)$expectedLocation, $locationId);
}
function tenant_workspace_scopes_are_valid(array $state, array $context): bool {
    $collections = ['jobs','contracts','invoices','paymentReceipts','expenses','estimates','purchaseRequests','sourcingEvents','auctions','purchaseOrders','serviceRequests','talentEngagements'];
    foreach ($collections as $collection) {
        if (!array_key_exists($collection, $state)) continue;
        if (!is_array($state[$collection])) return false;
        foreach ($state[$collection] as $record) {
            if (!is_array($record) || !tenant_operational_scope_is_valid($record['operationalScope'] ?? null, $context)) return false;
        }
    }
    return true;
}

if ($uri === '/api/v1/auth/providers' || $uri === '/api/v1/auth/providers/') {
    if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'GET') fail_response(405, 'Method not allowed');
    $config = workspace_config(); workspace_session(); $providers = [];
    foreach (['google','facebook'] as $provider) {
        $definition = social_provider_config($config, $provider);
        if ($definition !== null) $providers[] = ['id'=>$definition['id'], 'name'=>$definition['name'], 'audience'=>'individual'];
    }
    workspace_json(['providers'=>$providers]);
}
if ($uri === '/api/v1/runtime' || $uri === '/api/v1/runtime/') {
    if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'GET') fail_response(405, 'Method not allowed');
    $config = workspace_config();
    workspace_json(['mode'=>workspace_mode($config), 'serverAuth'=>true]);
}
if (preg_match('#^/api/v1/auth/(google|facebook)/(start|callback)/?$#', $uri, $socialMatch)) {
    if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'GET') fail_response(405, 'Method not allowed');
    $config = workspace_config(); $session = workspace_session();
    if ($socialMatch[2] === 'start') social_start($config, $socialMatch[1]);
    try { $pdo = workspace_pdo($config); $key = workspace_key($config); social_callback($pdo, $config, $session, $key, $socialMatch[1]); }
    catch (Throwable $error) { if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack(); social_redirect(social_base_path() . '/#/?login_error=identity'); }
}

if (preg_match('#^/api/v1/(tenant-context|tenant-companies)(?:/|$)#', $uri)) {
    $config = workspace_config(); $session = workspace_session(); $pdo = workspace_pdo($config); $key = workspace_key($config);
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if (!in_array($method, ['GET','PUT','POST'], true)) fail_response(405, 'Method not allowed');
    try {
        if ($uri === '/api/v1/tenant-context' || $uri === '/api/v1/tenant-context/') {
            if ($method === 'GET') { $context = tenant_context($pdo, $config, $session, $key); workspace_json(['context'=>$context, 'csrf'=>$session['csrf'], 'mode'=>workspace_mode($config)]); }
            if ($method !== 'PUT') fail_response(405, 'Method not allowed');
            tenant_require_write($session); $input = tenant_request_body();
            $current = tenant_context($pdo, $config, $session, $key);
            $target = ['companyId'=>$input['companyId'] ?? null, 'locationId'=>$input['locationId'] ?? null];
            $next = tenant_context($pdo, $config, $session, $key, $target);
            if ($next['company']['id'] !== $target['companyId'] || (($target['locationId'] ?? null) !== null && ($next['location']['id'] ?? null) !== $target['locationId'])) fail_response(403, 'Company context is not permitted');
            $pdo->beginTransaction(); tenant_audit($pdo, $next, 'tenant.context_switched', 'tenant_context', $next['company']['id'], ['from'=>$current['company']['id'],'to'=>$next['company']['id'],'location'=>$next['location']['id'] ?? null], $key); $pdo->commit();
            workspace_json(['context'=>$next, 'csrf'=>$session['csrf'], 'mode'=>workspace_mode($config)]);
        }
        if ($method !== 'POST') fail_response(405, 'Method not allowed');
        tenant_require_write($session); $context = tenant_context($pdo, $config, $session, $key); $input = tenant_request_body();
        if ($uri === '/api/v1/tenant-companies' || $uri === '/api/v1/tenant-companies/') {
            tenant_require_permission($context, 'manageTenant');
            $name = tenant_text($input['legalName'] ?? '', 220); $rfc = tenant_rfc($input['rfc'] ?? ''); $regime = tenant_text($input['taxRegime'] ?? '', 12);
            if ($name === '' || $rfc === '') fail_response(400, 'Legal name and RFC are required');
            $id = tenant_uuid(); $pdo->beginTransaction();
            try {
                $pdo->prepare('INSERT INTO tenant_legal_entities (id, tenant_id, legal_name, rfc, rfc_hash, tax_regime) VALUES (?, ?, ?, ?, ?, ?)')->execute([$id, $context['tenant']['id'], $name, $rfc, hash_hmac('sha256', $rfc, $key), $regime ?: null]);
                tenant_audit($pdo, $context, 'tenant.company_created', 'legal_entity', $id, ['rfc'=>substr($rfc,0,4) . '***','nameDigest'=>hash('sha256',$name)], $key); $pdo->commit();
            } catch (PDOException $error) { if ($pdo->inTransaction()) $pdo->rollBack(); fail_response(409, 'This RFC already exists in the tenant'); }
            // Creating a company must not silently switch the session context:
            // that could direct an in-flight workspace save into the new entity.
            $next = tenant_context($pdo, $config, $session, $key); workspace_json(['companyId'=>$id,'context'=>$next,'csrf'=>$session['csrf']]);
        }
        if (!preg_match('#^/api/v1/tenant-companies/([a-f0-9-]{36})/(locations|invitations)/?$#i', $uri, $match)) fail_response(404, 'Not found');
        $companyId = strtolower($match[1]); $resource = strtolower($match[2]);
        if (!tenant_company_is_accessible($pdo, $context, $companyId)) fail_response(404, 'Company not found');
        if (!tenant_can_manage_company($pdo, $context, $companyId)) fail_response(403, 'Insufficient company permission');
        if ($resource === 'locations') {
            $kind = $input['kind'] ?? ''; $code = strtoupper(tenant_text($input['code'] ?? '', 40)); $name = tenant_text($input['name'] ?? '', 160);
            if (!in_array($kind, ['branch','warehouse'], true) || !preg_match('/^[A-Z0-9_-]{2,40}$/', $code) || $name === '') fail_response(400, 'Valid location type, code and name are required');
            $id = tenant_uuid(); $pdo->beginTransaction();
            try {
                $pdo->prepare('INSERT INTO tenant_locations (id, tenant_id, legal_entity_id, kind, code, name) VALUES (?, ?, ?, ?, ?, ?)')->execute([$id, $context['tenant']['id'], $companyId, $kind, $code, $name]);
                tenant_audit($pdo, $context, 'tenant.location_created', 'location', $id, ['companyId'=>$companyId,'kind'=>$kind,'code'=>$code], $key); $pdo->commit();
            } catch (PDOException $error) { if ($pdo->inTransaction()) $pdo->rollBack(); fail_response(409, 'This location code already exists'); }
            workspace_json(['locationId'=>$id,'context'=>tenant_context($pdo, $config, $session, $key),'csrf'=>$session['csrf']]);
        }
        $email = strtolower(trim((string)($input['email'] ?? ''))); $role = (string)($input['role'] ?? 'viewer'); $scope = (string)($input['scope'] ?? 'legal_entity'); $locationId = $input['locationId'] ?? null;
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !in_array($role, ['admin','buyer','approver','warehouse','auditor','viewer','supplier'], true) || !in_array($scope, ['tenant','legal_entity','location'], true)) fail_response(400, 'Valid invitation details are required');
        if ($scope === 'tenant') tenant_require_permission($context, 'manageTenant');
        $allowedLocation = null;
        foreach ($context['companies'] as $company) if ($company['id'] === $companyId) foreach ($company['locations'] as $location) if (($location['id'] ?? '') === $locationId) $allowedLocation = $locationId;
        if ($scope === 'location' && !$allowedLocation) fail_response(400, 'Location is not accessible');
        $id = tenant_uuid(); $emailCipher = workspace_encrypt($email, $key, 'buyniverse-tenant-invite|' . $id);
        $pdo->beginTransaction();
        try {
            tenant_audit($pdo, $context, 'tenant.invitation_created', 'invitation', $id, ['companyId'=>$companyId,'role'=>$role,'scope'=>$scope,'emailHash'=>hash_hmac('sha256',$email,$key)], $key);
            $pdo->prepare('INSERT INTO tenant_invitations (id, tenant_id, legal_entity_id, location_id, email_hash, email_ciphertext, email_iv, email_tag, role_key, scope_kind, expires_at, created_by_principal_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 DAY), ?)')->execute([$id, $context['tenant']['id'], $scope === 'tenant' ? null : $companyId, $scope === 'location' ? $allowedLocation : null, hash_hmac('sha256',$email,$key), $emailCipher[0], $emailCipher[1], $emailCipher[2], $role, $scope, $context['principalId']]);
            $roleNames = ['admin'=>'administrador','buyer'=>'comprador','approver'=>'aprobador','warehouse'=>'almacén','auditor'=>'auditor','viewer'=>'consulta','supplier'=>'proveedor'];
            $scopeNames = ['tenant'=>'todas las empresas','legal_entity'=>'la empresa seleccionada','location'=>'la sucursal o bodega seleccionada'];
            $queued = mail_enqueue($pdo, $config, $key, $context, 'tenant.invitation', $email, [
                'recipient_name'=>'there',
                'inviter_name'=>$context['principal']['displayName'] ?? 'Workspace owner',
                'company_name'=>$context['company']['legalName'] ?? 'Buyniverse',
                'role_name'=>$roleNames[$role] ?? $role,
                'scope_name'=>$scopeNames[$scope] ?? $scope,
                'expires_at'=>gmdate('c', time() + 7 * 86400),
                'action_url'=>mail_public_url($config, '/#/dashboard'),
            ], 'tenant-invitation:' . $id, gmdate('Y-m-d H:i:s', time() + 7 * 86400), 'es');
            tenant_audit($pdo, $context, 'email.queued', 'email_outbox', $queued['id'], ['template'=>'tenant.invitation','reused'=>!$queued['queued']], $key);
            $pdo->commit(); workspace_json(['invitationId'=>$id,'delivery'=>'queued','csrf'=>$session['csrf']]);
        } catch (Throwable $error) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $error; }
    } catch (Throwable $error) { if ($pdo->inTransaction()) $pdo->rollBack(); fail_response(503, 'Tenant service is unavailable'); }
}

if ($uri === '/api/v1/workspace-state' || $uri === '/api/v1/workspace-state/') {
    $config = workspace_config(); $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if (!in_array($method, ['GET','PUT','DELETE'], true)) fail_response(405, 'Method not allowed');
    if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 786432) fail_response(413, 'Request body too large');
    $session = workspace_session(); $pdo = workspace_pdo($config); $key = workspace_key($config);
    try {
        $context = tenant_context($pdo, $config, $session, $key);
        $scopeHash = (string) $context['contextHash']; $aad = 'buyniverse-workspace-v2|' . $scopeHash;
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
