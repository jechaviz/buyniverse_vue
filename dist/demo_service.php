<?php
declare(strict_types=1);

// Private demo gate, loaded by index.php before it serves anything under /demo/.
// The demo is a separate world from the real product: it has its own signed,
// HttpOnly session cookie (scoped to /demo, never sent to the API), and nothing
// under /demo/ is served without it. Two kinds of access:
//   owner  the universal password of the owners (hash in the runtime config),
//          to test and refine the product;
//   guest  a personal code that an owner approves, with an expiry, revocable.
// This file is self-contained on purpose: it runs before the other services load.

const DEMO_COOKIE = 'buyniverse_demo';
const DEMO_GATE_COOKIE = 'buyniverse_demo_gate';
const DEMO_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function demo_key(array $config): ?string {
    $base = base64_decode((string) ($config['state_encryption_key'] ?? ''), true);
    return $base !== false && strlen($base) === 32 ? hash_hmac('sha256', 'buyniverse-demo-session-v1', $base, true) : null;
}
function demo_is_https(): bool { return (($_SERVER['HTTPS'] ?? '') === 'on') || strtolower(workspace_header('X-Forwarded-Proto')) === 'https'; }
function demo_origin_ok(): bool {
    $origin = workspace_header('Origin'); if ($origin === '') return true;
    $host = strtolower((string) (parse_url($origin, PHP_URL_HOST) ?? ''));
    return $host !== '' && hash_equals(workspace_request_host(), $host);
}
function demo_ip_hash(string $key): string { return hash_hmac('sha256', (string) ($_SERVER['REMOTE_ADDR'] ?? '0'), $key); }
function demo_cookie_set(string $name, string $value, int $expires, string $path): void {
    setcookie($name, $value, ['expires'=>$expires, 'path'=>$path, 'secure'=>demo_is_https(), 'httponly'=>true, 'samesite'=>'Strict']);
}
function demo_cookie_sign(array $payload, string $key): string {
    $body = rtrim(strtr(base64_encode((string) json_encode($payload)), '+/', '-_'), '=');
    return $body . '.' . hash_hmac('sha256', $body, $key);
}
function demo_cookie_read(string $key): ?array {
    $raw = (string) ($_COOKIE[DEMO_COOKIE] ?? ''); $parts = explode('.', $raw);
    if (count($parts) !== 2 || !hash_equals(hash_hmac('sha256', $parts[0], $key), $parts[1])) return null;
    $payload = json_decode((string) base64_decode(strtr($parts[0], '-_', '+/')), true);
    return is_array($payload) && (int) ($payload['e'] ?? 0) > time() && in_array($payload['k'] ?? '', ['owner', 'guest'], true) ? $payload : null;
}
/** A valid session; a guest's code is re-checked against the database on page loads, so a revocation bites quickly. */
function demo_session(array $config, string $key, bool $strict): ?array {
    $payload = demo_cookie_read($key);
    if ($payload === null) return null;
    if ($payload['k'] === 'owner') return is_string($config['demo_owner_password_hash'] ?? null) && $config['demo_owner_password_hash'] !== '' ? $payload : null;
    if (!$strict) return $payload;
    try {
        $row = workspace_pdo($config)->prepare('SELECT 1 FROM demo_access_codes WHERE id = ? AND revoked_at IS NULL AND expires_at > UTC_TIMESTAMP() LIMIT 1');
        $row->execute([(string) ($payload['c'] ?? '')]);
        return $row->fetchColumn() !== false ? $payload : null;
    } catch (Throwable $error) { return null; }
}

function demo_text(string $key): string {
    $es = str_starts_with(strtolower((string) ($_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '')), 'es');
    $t = [
        'title'=>['Demo privada', 'Private demo'], 'lead'=>['La demo de Buyniverse es privada. Entra con tu código de acceso.', 'The Buyniverse demo is private. Sign in with your access code.'],
        'code'=>['Código de acceso', 'Access code'], 'enter'=>['Entrar', 'Enter'], 'request'=>['Solicitar acceso', 'Request access'], 'name'=>['Nombre', 'Name'],
        'email'=>['Correo', 'Email'], 'company'=>['Empresa (opcional)', 'Company (optional)'], 'note'=>['¿Para qué quieres verla?', 'What would you like to see it for?'], 'send'=>['Enviar solicitud', 'Send request'],
        'bad'=>['Ese código no es válido o ya venció.', 'That code is not valid or has expired.'], 'wait'=>['Demasiados intentos. Espera unos minutos.', 'Too many attempts. Wait a few minutes.'],
        'sent'=>['Recibimos tu solicitud. Si la aprobamos, te enviaremos un código.', 'We received your request. If we approve it, we will send you a code.'], 'invalid'=>['Revisa los datos de la solicitud.', 'Check the details of your request.'],
        'toomany'=>['Ya recibimos varias solicitudes. Intenta más tarde.', 'We already received several requests. Try again later.'], 'off'=>['La demo no está disponible por ahora.', 'The demo is not available right now.'], 'back'=>['Volver a Buyniverse', 'Back to Buyniverse'],
    ];
    return $t[$key][$es ? 0 : 1] ?? $key;
}
function demo_gate_page(string $noticeKey = '', int $status = 200, bool $bad = false): void {
    $csrf = bin2hex(random_bytes(24)); $base = $GLOBALS['bn_install_base'] ?? '';
    demo_cookie_set(DEMO_GATE_COOKIE, $csrf, time() + 1800, $base . '/demo');
    security_headers(); http_response_code($status); header('Content-Type: text/html; charset=utf-8');
    $e = static fn(string $s) => htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); $t = 'demo_text';
    $action = $e($base . '/demo/__demo/');
    echo '<!doctype html><html lang="' . (str_starts_with(strtolower((string) ($_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '')), 'es') ? 'es' : 'en') . '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Buyniverse · ' . $e($t('title')) . '</title>'
        . '<style>:root{color-scheme:dark light}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#05070d;color:#e8ecf7;font:16px/1.5 system-ui,sans-serif;padding:16px}main{width:min(420px,100%)}h1{font-size:1.5rem;margin:0 0 4px}p{color:#9aa4bd;margin:0 0 16px}form{display:grid;gap:10px;background:#0d1220;border:1px solid #1d2640;border-radius:16px;padding:18px;margin-bottom:14px}label{display:grid;gap:4px;font-size:.85rem;font-weight:600}input,textarea{font:inherit;padding:10px 12px;border-radius:10px;border:1px solid #2a3556;background:#070b16;color:inherit}button{font:inherit;font-weight:700;padding:11px;border:0;border-radius:10px;background:#3f6af2;color:#fff;cursor:pointer}details summary{cursor:pointer;font-weight:600;margin-bottom:10px}.n{padding:10px 12px;border-radius:10px;background:#1b2a4a;margin-bottom:14px;font-size:.9rem}.n.bad{background:#4a1b26}a{color:#8fb0ff}@media(prefers-color-scheme:light){body{background:#f4f6fb;color:#111827}form{background:#fff;border-color:#d7dcea}input,textarea{background:#fff;border-color:#c5ccdf}p{color:#4b5563}.n{background:#e5ecff}.n.bad{background:#ffe3e8}}</style></head><body><main>'
        . '<h1>' . $e($t('title')) . '</h1><p>' . $e($t('lead')) . '</p>'
        . ($noticeKey !== '' ? '<div class="n' . ($bad ? ' bad' : '') . '" role="alert">' . $e($t($noticeKey)) . '</div>' : '')
        . '<form method="post" action="' . $action . 'access"><input type="hidden" name="t" value="' . $e($csrf) . '"><label>' . $e($t('code')) . '<input name="code" type="password" autocomplete="off" required maxlength="64" autofocus></label><button>' . $e($t('enter')) . '</button></form>'
        . '<details><summary>' . $e($t('request')) . '</summary><form method="post" action="' . $action . 'request"><input type="hidden" name="t" value="' . $e($csrf) . '">'
        . '<label>' . $e($t('name')) . '<input name="name" required maxlength="120"></label><label>' . $e($t('email')) . '<input name="email" type="email" required maxlength="190"></label>'
        . '<label>' . $e($t('company')) . '<input name="company" maxlength="160"></label><label>' . $e($t('note')) . '<textarea name="note" rows="3" maxlength="500"></textarea></label><button>' . $e($t('send')) . '</button></form></details>'
        . '<p><a href="' . $e($base . '/') . '">' . $e($t('back')) . '</a></p></main></body></html>';
    exit;
}

function demo_attempts_blocked(PDO $pdo, string $ip): bool {
    $count = $pdo->prepare('SELECT COUNT(*) FROM demo_access_attempts WHERE ip_hash = ? AND created_at > (NOW() - INTERVAL 10 MINUTE)'); $count->execute([$ip]);
    return (int) $count->fetchColumn() >= 8;
}
function demo_normalize_code(string $code): string { return preg_replace('/[^A-Z0-9]/', '', strtoupper($code)) ?? ''; }
function demo_new_code(): array {
    $chars = ''; for ($i = 0; $i < 12; $i++) $chars .= DEMO_ALPHABET[random_int(0, strlen(DEMO_ALPHABET) - 1)];
    return [implode('-', str_split($chars, 4)), $chars];
}

function demo_submit_access(array $config, string $key): void {
    if (!demo_origin_ok() || !hash_equals((string) ($_COOKIE[DEMO_GATE_COOKIE] ?? ''), (string) ($_POST['t'] ?? '-'))) demo_gate_page('invalid', 403, true);
    $input = (string) ($_POST['code'] ?? ''); $ip = demo_ip_hash($key); $pdo = null;
    try { $pdo = workspace_pdo($config); if (demo_attempts_blocked($pdo, $ip)) demo_gate_page('wait', 429, true); } catch (Throwable $error) { $pdo = null; }
    $base = $GLOBALS['bn_install_base'] ?? ''; $grant = null;
    $hash = (string) ($config['demo_owner_password_hash'] ?? '');
    if ($hash !== '' && strlen($input) <= 128 && password_verify($input, $hash)) $grant = ['k'=>'owner', 'c'=>'', 'e'=>time() + 8 * 3600];
    elseif ($pdo !== null) {
        $code = demo_normalize_code($input);
        if (strlen($code) === 12) {
            $rows = $pdo->prepare('SELECT id, code_hash, expires_at FROM demo_access_codes WHERE code_prefix = ? AND revoked_at IS NULL AND expires_at > UTC_TIMESTAMP()'); $rows->execute([substr($code, 0, 4)]);
            foreach ($rows->fetchAll() as $row) if (password_verify($code, (string) $row['code_hash'])) {
                $grant = ['k'=>'guest', 'c'=>(string) $row['id'], 'e'=>min(time() + 4 * 3600, (int) strtotime((string) $row['expires_at'] . ' UTC'))];
                $pdo->prepare('UPDATE demo_access_codes SET use_count = use_count + 1, last_used_at = UTC_TIMESTAMP() WHERE id = ?')->execute([$row['id']]);
                break;
            }
        }
    }
    if ($grant === null) {
        usleep(300000);
        if ($pdo !== null) { try { $pdo->prepare('INSERT INTO demo_access_attempts (ip_hash) VALUES (?)')->execute([$ip]); $pdo->exec('DELETE FROM demo_access_attempts WHERE created_at < (NOW() - INTERVAL 1 DAY)'); } catch (Throwable $error) {} }
        demo_gate_page('bad', 401, true);
    }
    demo_cookie_set(DEMO_COOKIE, demo_cookie_sign($grant, $key), (int) $grant['e'], $base . '/demo');
    demo_cookie_set(DEMO_GATE_COOKIE, '', time() - 3600, $base . '/demo');
    security_headers(); http_response_code(303); header('Location: ' . $base . '/demo/'); exit;
}

function demo_submit_request(array $config, string $key): void {
    if (!demo_origin_ok() || !hash_equals((string) ($_COOKIE[DEMO_GATE_COOKIE] ?? ''), (string) ($_POST['t'] ?? '-'))) demo_gate_page('invalid', 403, true);
    $clean = static fn(string $field, int $max): string => trim(mb_substr(preg_replace('/[\x00-\x1f\x7f]/u', ' ', (string) ($_POST[$field] ?? '')) ?? '', 0, $max));
    $name = $clean('name', 120); $email = strtolower($clean('email', 190)); $company = $clean('company', 160); $note = $clean('note', 500);
    if (mb_strlen($name) < 2 || !filter_var($email, FILTER_VALIDATE_EMAIL)) demo_gate_page('invalid', 422, true);
    try {
        $pdo = workspace_pdo($config); $emailHash = hash_hmac('sha256', $email, $key); $ip = demo_ip_hash($key);
        $recent = $pdo->prepare('SELECT SUM(email_hash = ?) AS by_email, COUNT(*) AS by_ip FROM demo_access_requests WHERE ip_hash = ? AND created_at > (NOW() - INTERVAL 1 DAY) OR (email_hash = ? AND created_at > (NOW() - INTERVAL 1 DAY))');
        $recent->execute([$emailHash, $ip, $emailHash]); $counts = $recent->fetch();
        if ((int) ($counts['by_email'] ?? 0) >= 2 || (int) ($counts['by_ip'] ?? 0) >= 6) demo_gate_page('toomany', 429, true);
        $stateKey = (string) base64_decode((string) $config['state_encryption_key'], true); $id = bin2hex(random_bytes(16));
        $id = substr($id, 0, 8) . '-' . substr($id, 8, 4) . '-4' . substr($id, 13, 3) . '-a' . substr($id, 17, 3) . '-' . substr($id, 20, 12);
        $box = workspace_encrypt($email, $stateKey, 'buyniverse-demo-request|' . $id);
        $pdo->prepare('INSERT INTO demo_access_requests (id, name, company, note, email_hash, email_ciphertext, email_iv, email_tag, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
            ->execute([$id, $name, $company ?: null, $note ?: null, $emailHash, $box[0], $box[1], $box[2], $ip]);
    } catch (Throwable $error) { demo_gate_page('off', 503, true); }
    demo_gate_page('sent');
}

/** Everything under /demo/ passes through here. Returns only for an authorized request. */
function demo_guard(string $route, array $config): void {
    $key = demo_key($config); $base = $GLOBALS['bn_install_base'] ?? '';
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if ($key === null) fail_response(503, 'The demo is not available');
    if ($route === '/__demo/exit') { demo_cookie_set(DEMO_COOKIE, '', time() - 3600, $base . '/demo'); security_headers(); http_response_code(303); header('Location: ' . $base . '/'); exit; }
    if ($route === '/__demo/access' || $route === '/__demo/request') {
        if ($method !== 'POST') fail_response(405, 'Method not allowed');
        if ($route === '/__demo/access') demo_submit_access($config, $key);
        demo_submit_request($config, $key);
    }
    if (!in_array($method, ['GET', 'HEAD'], true)) fail_response(405, 'Method not allowed');
    $isPage = preg_match('/\.[A-Za-z0-9]{1,6}$/', $route) !== 1;   // app routes have no extension
    if (demo_session($config, $key, $isPage) !== null) return;
    if ($isPage) demo_gate_page();
    fail_response(401, 'Demo access required');
}
