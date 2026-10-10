<?php
declare(strict_types=1);

// Federated social identity, split from index.php. Loaded only by index.php;
// Apache denies direct requests to every PHP file except the entry point.

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
/** Supported social providers: route id => principal provider key. */
function social_providers(): array { return ['google'=>'google_oidc', 'microsoft'=>'microsoft_oidc', 'linkedin'=>'linkedin_oidc', 'facebook'=>'facebook_oauth']; }
function social_principal_providers(): array { return array_values(social_providers()); }
function social_provider_config(array $config, string $provider): ?array {
    $map = social_providers();
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
    if ($provider === 'microsoft') {
        // "common" accepts personal and work or school accounts; a single
        // organization can pin its directory tenant instead.
        $tenant = tenant_text($raw['tenant'] ?? 'common', 64);
        if (preg_match('/^[A-Za-z0-9.-]{3,64}$/', $tenant) !== 1) return null;
        return [
            'id'=>'microsoft', 'name'=>'Microsoft', 'provider'=>'microsoft_oidc', 'client_id'=>$clientId, 'client_secret'=>$clientSecret, 'redirect_uri'=>$redirectUri,
            'authorization_endpoint'=>'https://login.microsoftonline.com/' . $tenant . '/oauth2/v2.0/authorize', 'token_endpoint'=>'https://login.microsoftonline.com/' . $tenant . '/oauth2/v2.0/token',
            'profile_endpoint'=>'https://graph.microsoft.com/oidc/userinfo', 'scope'=>'openid email profile', 'pkce'=>true,
        ];
    }
    if ($provider === 'linkedin') return [
        'id'=>'linkedin', 'name'=>'LinkedIn', 'provider'=>'linkedin_oidc', 'client_id'=>$clientId, 'client_secret'=>$clientSecret, 'redirect_uri'=>$redirectUri,
        'authorization_endpoint'=>'https://www.linkedin.com/oauth/v2/authorization', 'token_endpoint'=>'https://www.linkedin.com/oauth/v2/accessToken',
        'profile_endpoint'=>'https://api.linkedin.com/v2/userinfo', 'scope'=>'openid profile email', 'pkce'=>false,
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
    // OpenID Connect providers identify people by "sub"; Facebook's Graph API by "id".
    $subject = $provider['id'] === 'facebook' ? ($profile['id'] ?? null) : ($profile['sub'] ?? null);
    if (!is_string($subject) || strlen($subject) < 6 || strlen($subject) > 320 || preg_match('/^[A-Za-z0-9._:@-]+$/', $subject) !== 1) throw new RuntimeException('Federated identity subject was invalid');
    if ($provider['id'] === 'google' && !in_array($profile['email_verified'] ?? false, [true, 'true', 1, '1'], true)) throw new RuntimeException('Google account email is not verified');
    $displayName = tenant_text($profile['name'] ?? '', 180) ?: 'Personal workspace owner';
    $email = isset($profile['email']) && is_string($profile['email']) && filter_var($profile['email'], FILTER_VALIDATE_EMAIL) ? strtolower(trim($profile['email'])) : null;
    // An email counts as verified only when the provider asserts it (Google
    // always, enforced above; LinkedIn per profile). Microsoft's userinfo
    // carries no such claim, so its address is never trusted for mail.
    $verified = $provider['id'] === 'google' || ($provider['id'] === 'linkedin' && in_array($profile['email_verified'] ?? false, [true, 'true', 1, '1'], true));
    return ['provider'=>$provider['provider'], 'subject'=>$subject, 'displayName'=>$displayName, 'email'=>$email, 'emailVerified'=>$verified];
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
// Google Identity Services (ID-token flow)
// ---------------------------------------------------------------------------
// Needs only the public OAuth client id (no secret, no redirect). The browser
// obtains a signed ID token from Google; this server never trusts it by
// itself: Google's tokeninfo endpoint verifies the signature, and we then check
// audience, issuer, expiry, verified email and a one-time nonce bound to this
// session, so a token for another app or an old one cannot sign anyone in.
function social_google_config(array $config): ?array {
    $raw = $config['identity']['google_gis'] ?? null;
    if (!is_array($raw) || ($raw['enabled'] ?? false) !== true) return null;
    $clientId = tenant_text($raw['client_id'] ?? '', 200);
    return preg_match('/^[0-9]{6,}-[a-z0-9]{6,}\.apps\.googleusercontent\.com$/', $clientId) === 1 ? ['client_id'=>$clientId] : null;
}
function social_google_nonce(): string {
    $nonce = social_b64url(random_bytes(24));
    $_SESSION['gis_nonce'] = ['value'=>$nonce, 'expiresAt'=>time() + 600];
    return $nonce;
}
/** Returns null when the verified claims may sign in, otherwise a reason code. */
function social_google_claims_error(array $claims, string $clientId, ?array $pending, int $now): ?string {
    if (!is_array($pending) || $now > (int) ($pending['expiresAt'] ?? 0)) return 'nonce_expired';
    if (!hash_equals($clientId, (string) ($claims['aud'] ?? ''))) return 'audience';
    if (!in_array((string) ($claims['iss'] ?? ''), ['accounts.google.com', 'https://accounts.google.com'], true)) return 'issuer';
    if ((int) ($claims['exp'] ?? 0) <= $now) return 'expired';
    if (!in_array($claims['email_verified'] ?? false, [true, 'true', 1, '1'], true)) return 'email_unverified';
    $subject = (string) ($claims['sub'] ?? '');
    if (preg_match('/^[0-9]{6,64}$/', $subject) !== 1) return 'subject';
    if (!hash_equals((string) ($pending['value'] ?? ''), (string) ($claims['nonce'] ?? ''))) return 'nonce';
    return null;
}
function social_google_login(PDO $pdo, array $config, array $session, string $key): void {
    $gis = social_google_config($config); if ($gis === null) fail_response(404, 'Identity provider is not enabled');
    if (!tenant_header_origin_is_safe() || !hash_equals($session['csrf'], workspace_header('X-Buyniverse-CSRF')) || workspace_header('X-Buyniverse-Request') !== 'auth-google-v1')
        fail_response(403, 'Request verification failed');
    social_rate_limit('gis', 10, 600);
    $input = tenant_request_body(); $credential = (string) ($input['credential'] ?? '');
    if (preg_match('/^[A-Za-z0-9_-]{20,3000}\.[A-Za-z0-9_-]{20,3000}\.[A-Za-z0-9_-]{10,1000}$/', $credential) !== 1) fail_response(400, 'Invalid sign-in credential');
    $pending = $_SESSION['gis_nonce'] ?? null; unset($_SESSION['gis_nonce']);   // single use, even when the attempt fails
    try { $claims = social_http_json('https://oauth2.googleapis.com/tokeninfo?id_token=' . rawurlencode($credential), 'GET'); }
    catch (Throwable $error) { fail_response(401, 'Google could not verify this sign-in'); }
    // tokeninfo omits the nonce in some responses; the signed payload it vouched for carries it.
    if (!isset($claims['nonce'])) { $parts = explode('.', $credential); $payload = json_decode((string) base64_decode(strtr($parts[1], '-_', '+/')), true); if (is_array($payload) && ($payload['sub'] ?? null) === ($claims['sub'] ?? 0)) $claims['nonce'] = $payload['nonce'] ?? ''; }
    if (social_google_claims_error($claims, $gis['client_id'], is_array($pending) ? $pending : null, time()) !== null) fail_response(401, 'Google could not verify this sign-in');
    $displayName = tenant_text($claims['name'] ?? '', 180) ?: 'Personal workspace owner';
    $email = isset($claims['email']) && is_string($claims['email']) && filter_var($claims['email'], FILTER_VALIDATE_EMAIL) ? strtolower(trim($claims['email'])) : null;
    unset($_SESSION['tenant_context'], $_SESSION['tenant_demo_subject']);
    session_regenerate_id(true); $_SESSION['workspace_csrf'] = bin2hex(random_bytes(32));
    $_SESSION['buyniverse_identity'] = ['provider'=>'google_oidc', 'subject'=>(string) $claims['sub'], 'displayName'=>$displayName, 'email'=>$email, 'emailVerified'=>true];
    $session = workspace_session();
    $principal = tenant_principal($pdo, $config, $session, $key);
    $member = tenant_principal_has_membership($pdo, $principal['id']);
    if ($member) {
        $context = tenant_context($pdo, $config, $session, $key);
        $pdo->beginTransaction();
        try { tenant_audit($pdo, $context, 'identity.social_authenticated', 'principal', $context['principalId'], ['provider'=>'google_oidc', 'flow'=>'gis'], $key); $pdo->commit(); }
        catch (Throwable $error) { if ($pdo->inTransaction()) $pdo->rollBack(); }
    }
    workspace_json(['ok'=>true, 'next'=>$member ? 'dashboard' : 'onboarding', 'csrf'=>$session['csrf']]);
}
