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
    $principal = tenant_principal($pdo, $config, $session, $key);
    // A social identity proves who the person is; it must not silently create
    // a fiscal/legal workspace or assign marketplace capabilities. New people
    // complete the explicit, server-validated onboarding flow first.
    if (!tenant_principal_has_membership($pdo, $principal['id'])) {
        social_redirect(social_base_path() . '/#/onboarding?login=' . rawurlencode($provider));
    }
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
require_once __DIR__ . '/tenant_service.php';
require_once __DIR__ . '/auction_service.php';

function tenant_fiscal_uploaded_file(string $name, string $extension, int $maxBytes): string {
    $file = $_FILES[$name] ?? null;
    if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_string($file['tmp_name'] ?? null) || !is_uploaded_file($file['tmp_name']))
        fail_response(400, 'Both fiscal credential files are required');
    $original = strtolower((string)($file['name'] ?? ''));
    if (substr($original, -strlen($extension)) !== $extension || (int)($file['size'] ?? 0) < 16 || (int)($file['size'] ?? 0) > $maxBytes)
        fail_response(400, 'Fiscal credential file format is invalid');
    $content = file_get_contents($file['tmp_name']);
    if (!is_string($content) || strlen($content) < 16 || strlen($content) > $maxBytes)
        fail_response(400, 'Fiscal credential file is invalid');
    return $content;
}
function tenant_fiscal_certificate_fingerprint(string $certificate): string {
    if (!function_exists('openssl_x509_read') || !function_exists('openssl_x509_fingerprint')) fail_response(503, 'Certificate verification is unavailable');
    $pem = str_contains($certificate, '-----BEGIN CERTIFICATE-----')
        ? $certificate
        : "-----BEGIN CERTIFICATE-----\n" . chunk_split(base64_encode($certificate), 64, "\n") . "-----END CERTIFICATE-----\n";
    $parsed = @openssl_x509_read($pem);
    if ($parsed === false) fail_response(400, 'The .cer file is not a valid certificate');
    $fingerprint = openssl_x509_fingerprint($parsed, 'sha256');
    if (is_resource($parsed) && function_exists('openssl_x509_free')) openssl_x509_free($parsed);
    if (!is_string($fingerprint) || !preg_match('/^[a-f0-9]{64}$/i', $fingerprint)) fail_response(400, 'The .cer certificate fingerprint is invalid');
    return strtolower($fingerprint);
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

if ($uri === '/api/v1/onboarding' || $uri === '/api/v1/onboarding/' || $uri === '/api/v1/onboarding/fiscal-credentials' || $uri === '/api/v1/onboarding/fiscal-credentials/') {
    $config = workspace_config(); $session = workspace_session(); $pdo = workspace_pdo($config); $key = workspace_key($config);
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    try {
        $isCredentialUpload = str_starts_with($uri, '/api/v1/onboarding/fiscal-credentials');
        if ($isCredentialUpload) {
            if ($method !== 'POST') fail_response(405, 'Method not allowed');
            tenant_fiscal_credential_require_write($session);
            $principal = tenant_onboarding_principal($pdo, $config, $session, $key);
            if (!tenant_principal_has_membership($pdo, $principal['id'])) fail_response(403, 'Complete workspace setup first');
            $context = tenant_context($pdo, $config, $session, $key);
            $companyId = strtolower((string)($_POST['companyId'] ?? ''));
            if (!tenant_is_uuid($companyId) || !hash_equals((string)$context['company']['id'], $companyId) || !tenant_can_manage_company($pdo, $context, $companyId))
                fail_response(403, 'Company administration permission is required');
            $company = $pdo->prepare('SELECT country_code FROM tenant_legal_entities WHERE id = ? AND tenant_id = ? AND status = "active" LIMIT 1');
            $company->execute([$companyId, $context['tenant']['id']]); $country = $company->fetch();
            if (!is_array($country) || (string)$country['country_code'] !== 'MX') fail_response(400, 'CSD credentials are available only for a Mexican fiscal profile');
            $profile = $pdo->prepare('SELECT id, issuance_mode, connector_key, status FROM tenant_fiscal_profiles WHERE tenant_id = ? AND legal_entity_id = ? LIMIT 1');
            $profile->execute([$context['tenant']['id'], $companyId]); $fiscalProfile = $profile->fetch();
            if (!is_array($fiscalProfile) || $fiscalProfile['issuance_mode'] !== 'buyniverse' || $fiscalProfile['connector_key'] !== 'odoo_fiax') fail_response(409, 'Buyniverse invoicing is not enabled for this company');
            $certificate = tenant_fiscal_uploaded_file('certificate', '.cer', 262144); $privateKey = tenant_fiscal_uploaded_file('privateKey', '.key', 262144);
            $password = (string)($_POST['privateKeyPassword'] ?? '');
            if (strlen($password) < 1 || strlen($password) > 512 || preg_match('/[\x00]/', $password)) fail_response(400, 'Private-key password is invalid');
            $certificateFingerprint = tenant_fiscal_certificate_fingerprint($certificate);
            $certificateSha = hash('sha256', $certificate); $privateKeySha = hash('sha256', $privateKey);
            $aadPrefix = 'buyniverse-fiscal-v1|' . $context['tenant']['id'] . '|' . $companyId . '|';
            $certificateBox = workspace_encrypt($certificate, $key, $aadPrefix . 'certificate'); $privateKeyBox = workspace_encrypt($privateKey, $key, $aadPrefix . 'private-key'); $passwordBox = workspace_encrypt($password, $key, $aadPrefix . 'private-key-password');
            $pdo->beginTransaction();
            try {
                $existing = $pdo->prepare('SELECT id FROM tenant_fiscal_credentials WHERE tenant_id = ? AND legal_entity_id = ? FOR UPDATE');
                $existing->execute([$context['tenant']['id'], $companyId]); $credentialId = $existing->fetchColumn();
                $rotated = (bool)$credentialId;
                if ($credentialId) {
                    $update = $pdo->prepare('UPDATE tenant_fiscal_credentials SET certificate_ciphertext = ?, certificate_iv = ?, certificate_tag = ?, private_key_ciphertext = ?, private_key_iv = ?, private_key_tag = ?, password_ciphertext = ?, password_iv = ?, password_tag = ?, certificate_sha256 = ?, private_key_sha256 = ?, certificate_fingerprint = ?, active = 1, created_by_principal_id = ?, rotated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?');
                    $update->execute([$certificateBox[0],$certificateBox[1],$certificateBox[2],$privateKeyBox[0],$privateKeyBox[1],$privateKeyBox[2],$passwordBox[0],$passwordBox[1],$passwordBox[2],$certificateSha,$privateKeySha,$certificateFingerprint,$principal['id'],$credentialId,$context['tenant']['id']]);
                } else {
                    $credentialId = tenant_uuid();
                    $insert = $pdo->prepare('INSERT INTO tenant_fiscal_credentials (id, tenant_id, legal_entity_id, certificate_ciphertext, certificate_iv, certificate_tag, private_key_ciphertext, private_key_iv, private_key_tag, password_ciphertext, password_iv, password_tag, certificate_sha256, private_key_sha256, certificate_fingerprint, created_by_principal_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                    $insert->execute([$credentialId,$context['tenant']['id'],$companyId,$certificateBox[0],$certificateBox[1],$certificateBox[2],$privateKeyBox[0],$privateKeyBox[1],$privateKeyBox[2],$passwordBox[0],$passwordBox[1],$passwordBox[2],$certificateSha,$privateKeySha,$certificateFingerprint,$principal['id']]);
                }
                $pdo->prepare('UPDATE tenant_fiscal_profiles SET status = "ready" WHERE id = ? AND tenant_id = ?')->execute([$fiscalProfile['id'], $context['tenant']['id']]);
                tenant_audit($pdo, $context, 'fiscal.csd_secured', 'tenant_fiscal_credentials', (string)$credentialId, ['companyId'=>$companyId,'certificateFingerprint'=>substr($certificateFingerprint,0,16),'rotated'=>$rotated], $key);
                $pdo->commit();
            } catch (Throwable $error) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $error; }
            workspace_json(['companyId'=>$companyId,'secured'=>true,'csrf'=>$session['csrf']]);
        }

        if (!in_array($method, ['GET','POST'], true)) fail_response(405, 'Method not allowed');
        $principal = tenant_onboarding_principal($pdo, $config, $session, $key);
        $hasMembership = tenant_principal_has_membership($pdo, $principal['id']);
        if ($method === 'GET') {
            if (!$hasMembership) workspace_json(['complete'=>false,'identity'=>['displayName'=>$principal['displayName'],'provider'=>$principal['provider']],'csrf'=>$session['csrf']]);
            $context = tenant_context($pdo, $config, $session, $key);
            $fiscal = $pdo->prepare('SELECT issuance_mode, connector_key, status FROM tenant_fiscal_profiles WHERE tenant_id = ? AND legal_entity_id = ? LIMIT 1');
            $fiscal->execute([$context['tenant']['id'], $context['company']['id']]); $profile = $fiscal->fetch();
            $needsFiscalCredentials = is_array($profile) && $profile['issuance_mode'] === 'buyniverse' && $profile['connector_key'] === 'odoo_fiax' && $profile['status'] === 'credentials_required' && ($context['company']['countryCode'] ?? '') === 'MX';
            workspace_json(['complete'=>true,'companyId'=>$context['company']['id'],'needsFiscalCredentials'=>$needsFiscalCredentials,'identity'=>['displayName'=>$principal['displayName'],'provider'=>$principal['provider']],'csrf'=>$session['csrf']]);
        }

        tenant_onboarding_require_write($session);
        if ($hasMembership) fail_response(409, 'This identity already has a workspace');
        $input = tenant_request_body();
        $accountKind = (string)($input['accountKind'] ?? '');
        $roles = tenant_marketplace_roles($input['marketplaceRoles'] ?? null);
        $workspaceName = tenant_text($input['workspaceName'] ?? '', 180);
        $countryCode = tenant_country_code($input['countryCode'] ?? '');
        $invoiceMode = (string)($input['invoiceMode'] ?? '');
        if (!in_array($accountKind, ['individual','business'], true) || !$roles || $workspaceName === '' || $countryCode === '' || !in_array($invoiceMode, ['external','buyniverse'], true))
            fail_response(400, 'A valid profile, workspace, country and invoicing choice are required');
        $legalName = $accountKind === 'business' ? tenant_text($input['legalName'] ?? '', 220) : $workspaceName;
        $taxIdentifier = ''; $taxRegime = ''; $billingEmail = ''; $address = ['street'=>'','city'=>'','region'=>'','postalCode'=>'']; $locations = [];
        if ($accountKind === 'business') {
            $taxIdentifier = tenant_tax_identifier($input['taxIdentifier'] ?? '', $countryCode);
            $taxRegime = tenant_text($input['taxRegime'] ?? '', 12);
            $billingEmail = strtolower(trim((string)($input['billingEmail'] ?? '')));
            $rawAddress = is_array($input['address'] ?? null) ? $input['address'] : [];
            $address = ['street'=>tenant_text($rawAddress['street'] ?? '',240),'city'=>tenant_text($rawAddress['city'] ?? '',120),'region'=>tenant_text($rawAddress['region'] ?? '',120),'postalCode'=>tenant_text($rawAddress['postalCode'] ?? '',24)];
            if ($legalName === '' || $taxIdentifier === '' || !filter_var($billingEmail, FILTER_VALIDATE_EMAIL) || in_array('', $address, true) || ($countryCode === 'MX' && $taxRegime === ''))
                fail_response(400, 'Complete the required legal and fiscal company fields');
            $rawLocations = $input['locations'] ?? [];
            if (!is_array($rawLocations) || count($rawLocations) > 50) fail_response(400, 'Company locations are invalid');
            $seenLocationCodes = [];
            foreach ($rawLocations as $rawLocation) {
                if (!is_array($rawLocation)) fail_response(400, 'Company location is invalid');
                $kind = (string)($rawLocation['kind'] ?? ''); $code = strtoupper(tenant_text($rawLocation['code'] ?? '',40)); $name = tenant_text($rawLocation['name'] ?? '',160);
                if (!in_array($kind, ['branch','warehouse'], true) || !preg_match('/^[A-Z0-9_-]{2,40}$/', $code) || $name === '' || isset($seenLocationCodes[$code])) fail_response(400, 'Each branch or warehouse needs a unique valid code and name');
                $seenLocationCodes[$code] = true; $locations[] = ['kind'=>$kind,'code'=>$code,'name'=>$name];
            }
        } elseif ($invoiceMode !== 'external') {
            fail_response(400, 'An individual account must use external invoicing');
        }
        $tenantId = tenant_uuid(); $companyId = tenant_uuid();
        $rfc = $countryCode === 'MX' && $accountKind === 'business' ? $taxIdentifier : null;
        $rfcHash = $rfc === null ? null : hash_hmac('sha256', $rfc, $key);
        $taxHash = $accountKind === 'business' ? hash_hmac('sha256', $taxIdentifier, $key) : null;
        $billingBox = $billingEmail !== '' ? workspace_encrypt($billingEmail, $key, 'buyniverse-fiscal-v1|' . $tenantId . '|' . $companyId . '|billing-email') : [null,null,null];
        $profileStatus = $invoiceMode === 'buyniverse' ? 'credentials_required' : 'external';
        $connectorKey = $invoiceMode === 'buyniverse' ? 'odoo_fiax' : 'external';
        $pdo->beginTransaction();
        try {
            $pdo->prepare('INSERT INTO tenant_accounts (id, display_name, account_kind) VALUES (?, ?, ?)')->execute([$tenantId, $workspaceName, $accountKind]);
            $entity = $pdo->prepare('INSERT INTO tenant_legal_entities (id, tenant_id, legal_name, rfc, rfc_hash, tax_identifier, tax_identifier_hash, tax_regime, country_code, fiscal_street, fiscal_city, fiscal_region, fiscal_postal_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $entity->execute([$companyId,$tenantId,$legalName,$rfc,$rfcHash,$taxIdentifier ?: null,$taxHash,$taxRegime ?: null,$countryCode,$address['street'] ?: null,$address['city'] ?: null,$address['region'] ?: null,$address['postalCode'] ?: null]);
            $pdo->prepare('INSERT INTO tenant_memberships (id, tenant_id, principal_id, role_key, scope_kind) VALUES (?, ?, ?, "owner", "tenant")')->execute([tenant_uuid(),$tenantId,$principal['id']]);
            $membership = $pdo->prepare('INSERT INTO tenant_memberships (id, tenant_id, principal_id, role_key, scope_kind, legal_entity_id) VALUES (?, ?, ?, ?, "legal_entity", ?)');
            foreach ($roles as $role) $membership->execute([tenant_uuid(),$tenantId,$principal['id'],$role,$companyId]);
            $locationInsert = $pdo->prepare('INSERT INTO tenant_locations (id, tenant_id, legal_entity_id, kind, code, name) VALUES (?, ?, ?, ?, ?, ?)');
            foreach ($locations as $location) $locationInsert->execute([tenant_uuid(),$tenantId,$companyId,$location['kind'],$location['code'],$location['name']]);
            $pdo->prepare('INSERT INTO tenant_onboarding_profiles (principal_id, account_kind, marketplace_roles) VALUES (?, ?, ?)')->execute([$principal['id'],$accountKind,json_encode($roles, JSON_UNESCAPED_SLASHES)]);
            $fiscal = $pdo->prepare('INSERT INTO tenant_fiscal_profiles (id, tenant_id, legal_entity_id, issuance_mode, connector_key, status, billing_email_ciphertext, billing_email_iv, billing_email_tag) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $fiscal->execute([tenant_uuid(),$tenantId,$companyId,$invoiceMode,$connectorKey,$profileStatus,$billingBox[0],$billingBox[1],$billingBox[2]]);
            $auditContext = ['principalId'=>$principal['id'],'tenant'=>['id'=>$tenantId],'company'=>['id'=>$companyId],'location'=>['id'=>null]];
            tenant_audit($pdo, $auditContext, 'tenant.social_onboarding_completed', 'tenant_account', $tenantId, ['accountKind'=>$accountKind,'roles'=>$roles,'country'=>$countryCode,'locations'=>count($locations),'invoicing'=>$invoiceMode], $key);
            $pdo->commit();
        } catch (PDOException $error) { if ($pdo->inTransaction()) $pdo->rollBack(); fail_response(409, 'This legal tax identifier is already registered in the workspace'); }
        catch (Throwable $error) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $error; }
        $_SESSION['tenant_context'] = ['companyId'=>$companyId,'locationId'=>null];
        $context = tenant_context($pdo, $config, $session, $key);
        $identity = $_SESSION['buyniverse_identity'] ?? null;
        // Welcome mail is best-effort and idempotent. A mail-provider outage
        // must never roll back the tenant boundary that was already committed.
        if (is_array($identity) && ($identity['emailVerified'] ?? false) === true && is_string($identity['email'] ?? null) && filter_var($identity['email'], FILTER_VALIDATE_EMAIL)) {
            try {
                $pdo->beginTransaction();
                $welcome = mail_enqueue($pdo, $config, $key, $context, 'auth.welcome', strtolower($identity['email']), [
                    'recipient_name'=>$principal['displayName'],
                    'workspace_name'=>$context['tenant']['name'],
                    'action_url'=>mail_public_url($config, '/#/dashboard'),
                ], 'auth-welcome:' . $principal['id'], null, 'es');
                tenant_audit($pdo, $context, 'email.queued', 'email_outbox', $welcome['id'], ['template'=>'auth.welcome','reused'=>!$welcome['queued']], $key);
                $pdo->commit();
            } catch (Throwable $error) { if ($pdo->inTransaction()) $pdo->rollBack(); }
        }
        $needsFiscalCredentials = $accountKind === 'business' && $invoiceMode === 'buyniverse' && $countryCode === 'MX';
        workspace_json(['companyId'=>$companyId,'context'=>$context,'needsFiscalCredentials'=>$needsFiscalCredentials,'csrf'=>$session['csrf']], 201);
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        fail_response(503, 'Secure onboarding is temporarily unavailable');
    }
}

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
