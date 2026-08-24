<?php
/**
 * Server-side transactional mail service.
 *
 * This file is intentionally denied over HTTP. It supplies a small, dependency
 * free renderer and encrypted outbox for the PHP shim and the CLI worker.
 */
declare(strict_types=1);

function mail_text($value, int $limit = 1000): string {
    if (!is_scalar($value) && $value !== null) return '';
    $text = trim(preg_replace('/[\x00-\x1f\x7f]/u', ' ', (string) $value) ?? '');
    return function_exists('mb_substr') ? mb_substr($text, 0, $limit, 'UTF-8') : substr($text, 0, $limit);
}
function mail_uuid(): string {
    $bytes = random_bytes(16); $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40); $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
    $hex = bin2hex($bytes); return substr($hex, 0, 8) . '-' . substr($hex, 8, 4) . '-' . substr($hex, 12, 4) . '-' . substr($hex, 16, 4) . '-' . substr($hex, 20);
}
function mail_catalog(): array {
    static $catalog = null;
    if (is_array($catalog)) return $catalog;
    $raw = @file_get_contents(__DIR__ . '/email_templates.json');
    $decoded = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($decoded) || !is_array($decoded['templates'] ?? null) || count($decoded['templates']) > 100) throw new RuntimeException('Mail template catalog is unavailable');
    $catalog = [];
    foreach ($decoded['templates'] as $template) {
        $id = mail_text($template['id'] ?? '', 96);
        if (!preg_match('/^[a-z][a-z0-9_.-]{2,95}$/', $id) || isset($catalog[$id])) continue;
        $catalog[$id] = $template;
    }
    if (!$catalog) throw new RuntimeException('Mail template catalog is unavailable');
    return $catalog;
}
function mail_template(string $templateId): array {
    $template = mail_catalog()[$templateId] ?? null;
    if (!is_array($template)) throw new InvalidArgumentException('Unknown mail template');
    return $template;
}
function mail_locale($locale): string { return is_string($locale) && strtolower($locale) === 'es' ? 'es' : 'en'; }
function mail_safe_url($value): string {
    $url = mail_text($value, 1000); $parts = parse_url($url); $scheme = strtolower((string) ($parts['scheme'] ?? '')); $host = strtolower((string) ($parts['host'] ?? ''));
    $loopback = in_array($host, ['localhost','127.0.0.1','::1'], true);
    if (($scheme !== 'https' && !($scheme === 'http' && $loopback)) || $host === '' || isset($parts['user']) || isset($parts['pass'])) return '';
    return $url;
}
function mail_interpolate($value, array $variables, int $limit = 10000): string {
    $value = mail_text($value, $limit);
    return preg_replace_callback('/\{\{([a-z_][a-z0-9_]{0,63})\}\}/i', static function (array $match) use ($variables): string {
        return mail_text($variables[strtolower($match[1])] ?? '—', 1000);
    }, $value) ?? '';
}
function mail_render(string $templateId, string $locale, array $variables): array {
    $template = mail_template($templateId); $locale = mail_locale($locale); $suffix = $locale === 'es' ? '_es' : '';
    $subject = mail_interpolate($template['subject' . $suffix] ?? $template['subject'] ?? '', $variables, 180);
    $headline = mail_interpolate($template['headline' . $suffix] ?? $template['headline'] ?? '', $variables, 180);
    $body = $template['body' . $suffix] ?? $template['body'] ?? [];
    if (!is_array($body)) $body = [];
    $paragraphs = array_values(array_filter(array_map(static fn($line) => mail_interpolate($line, $variables, 3000), $body), static fn($line) => $line !== ''));
    if ($subject === '' || $headline === '' || !$paragraphs) throw new RuntimeException('Mail template is invalid');
    $cta = mail_interpolate($template['cta' . $suffix] ?? $template['cta'] ?? '', $variables, 100);
    $actionUrl = mail_safe_url($variables['action_url'] ?? '');
    $escape = static fn(string $value): string => htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $paragraphHtml = implode('', array_map(static fn($line) => '<p style="margin:0 0 16px;color:#334155;font:15px/1.65 Arial,sans-serif;">' . $escape($line) . '</p>', $paragraphs));
    $ctaHtml = $cta !== '' && $actionUrl !== '' ? '<p style="margin:24px 0;"><a href="' . $escape($actionUrl) . '" style="display:inline-block;border-radius:9px;background:#e5484d;color:#ffffff;padding:12px 18px;font:700 14px Arial,sans-serif;text-decoration:none;">' . $escape($cta) . '</a></p>' : '';
    $security = !empty($template['security']);
    $notice = $security ? ($locale === 'es' ? 'Por seguridad, Buyniverse nunca te pedirá tu contraseña, códigos o datos bancarios por correo.' : 'For your security, Buyniverse will never ask for your password, codes or banking data by email.') : '';
    $html = '<!doctype html><html lang="' . $locale . '"><body style="margin:0;background:#f1f5f9;padding:28px 12px;"><main style="max-width:620px;margin:auto;border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;overflow:hidden;"><header style="padding:22px 28px;background:#0f172a;color:#ffffff;font:800 20px Arial,sans-serif;">Buyniverse</header><section style="padding:30px 28px;"><h1 style="margin:0 0 18px;color:#0f172a;font:800 24px/1.2 Arial,sans-serif;">' . $escape($headline) . '</h1>' . $paragraphHtml . $ctaHtml . ($notice !== '' ? '<p style="margin:22px 0 0;padding:12px;border-radius:9px;background:#fff7ed;color:#9a3412;font:12px/1.55 Arial,sans-serif;">' . $escape($notice) . '</p>' : '') . '</section><footer style="padding:18px 28px;border-top:1px solid #e2e8f0;color:#64748b;font:11px/1.5 Arial,sans-serif;">' . ($locale === 'es' ? 'Correo transaccional de Buyniverse. Conserva este mensaje para tu registro de actividad.' : 'Transactional message from Buyniverse. Keep this message for your activity record.') . '</footer></main></body></html>';
    $text = $headline . "\n\n" . implode("\n\n", $paragraphs) . ($cta !== '' && $actionUrl !== '' ? "\n\n" . $cta . ': ' . $actionUrl : '') . ($notice !== '' ? "\n\n" . $notice : '');
    return ['template'=>$templateId, 'locale'=>$locale, 'subject'=>$subject, 'html'=>$html, 'text'=>$text, 'security'=>$security];
}
function mail_encrypt_payload(string $plain, string $key, string $aad): array {
    if (strlen($key) !== 32 || !function_exists('openssl_encrypt')) throw new RuntimeException('Mail encryption unavailable');
    $iv = random_bytes(12); $tag = ''; $ciphertext = openssl_encrypt($plain, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag, $aad);
    if (!is_string($ciphertext) || strlen($tag) !== 16) throw new RuntimeException('Mail encryption unavailable');
    return [$ciphertext, $iv, $tag];
}
function mail_decrypt_payload(array $row, string $key): ?array {
    $id = mail_text($row['id'] ?? '', 36); if (!preg_match('/^[a-f0-9-]{36}$/i', $id) || strlen($key) !== 32) return null;
    $plain = openssl_decrypt((string) ($row['payload_ciphertext'] ?? ''), 'aes-256-gcm', $key, OPENSSL_RAW_DATA, (string) ($row['payload_iv'] ?? ''), (string) ($row['payload_tag'] ?? ''), 'buyniverse-email-v1|' . $id);
    if (!is_string($plain) || strlen($plain) > 1048576) return null;
    $payload = json_decode($plain, true); return is_array($payload) ? $payload : null;
}
function mail_public_url(array $config, string $path = '/'): string {
    $configured = $config['email']['public_base_url'] ?? 'https://buyniverse.com';
    $base = rtrim(mail_safe_url($configured), '/'); if ($base === '') $base = 'https://buyniverse.com';
    return $base . '/' . ltrim($path, '/');
}
function mail_enqueue(PDO $pdo, array $config, string $key, array $context, string $templateId, string $recipient, array $variables, string $idempotency, ?string $expiresAt = null, string $locale = 'es'): array {
    $recipient = strtolower(trim($recipient));
    if (!filter_var($recipient, FILTER_VALIDATE_EMAIL) || strlen($recipient) > 320) throw new InvalidArgumentException('Invalid mail recipient');
    $tenantId = mail_text($context['tenant']['id'] ?? '', 36); $companyId = mail_text($context['company']['id'] ?? '', 36); $principalId = mail_text($context['principalId'] ?? '', 36);
    if (!preg_match('/^[a-f0-9-]{36}$/i', $tenantId) || !preg_match('/^[a-f0-9-]{36}$/i', $companyId)) throw new InvalidArgumentException('Invalid mail context');
    $safeVariables = [];
    foreach ($variables as $name => $value) if (is_string($name) && preg_match('/^[a-z_][a-z0-9_]{0,63}$/', $name)) $safeVariables[strtolower($name)] = mail_text($value, 3000);
    $safeVariables['action_url'] = mail_safe_url($safeVariables['action_url'] ?? mail_public_url($config));
    $rendered = mail_render($templateId, $locale, $safeVariables); $id = mail_uuid();
    $expiresAt = $expiresAt && strtotime($expiresAt) !== false ? gmdate('Y-m-d H:i:s', strtotime($expiresAt)) : gmdate('Y-m-d H:i:s', time() + 7 * 86400);
    $payload = json_encode(['to'=>$recipient, 'subject'=>$rendered['subject'], 'html'=>$rendered['html'], 'text'=>$rendered['text'], 'template'=>$templateId, 'locale'=>$rendered['locale']], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if (!is_string($payload)) throw new RuntimeException('Mail payload could not be encoded');
    [$ciphertext, $iv, $tag] = mail_encrypt_payload($payload, $key, 'buyniverse-email-v1|' . $id);
    $idempotency = mail_text($idempotency, 180); if ($idempotency === '') throw new InvalidArgumentException('Mail idempotency key is required');
    $recipientHash = hash_hmac('sha256', $recipient, $key); $idempotencyHash = hash_hmac('sha256', $idempotency, $key);
    try {
        $write = $pdo->prepare('INSERT INTO tenant_email_outbox (id, tenant_id, legal_entity_id, actor_principal_id, template_key, template_version, locale, recipient_hash, subject_digest, payload_digest, idempotency_hash, payload_ciphertext, payload_iv, payload_tag, status, available_at, expires_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, "queued", UTC_TIMESTAMP(), ?)');
        $write->execute([$id, $tenantId, $companyId, $principalId ?: null, $templateId, $rendered['locale'], $recipientHash, hash('sha256', $rendered['subject']), hash('sha256', $payload), $idempotencyHash, $ciphertext, $iv, $tag, $expiresAt]);
        return ['id'=>$id, 'queued'=>true, 'template'=>$templateId];
    } catch (PDOException $error) {
        $existing = $pdo->prepare('SELECT id FROM tenant_email_outbox WHERE tenant_id = ? AND idempotency_hash = ? LIMIT 1'); $existing->execute([$tenantId, $idempotencyHash]); $row = $existing->fetch();
        if ($row) return ['id'=>(string) $row['id'], 'queued'=>false, 'template'=>$templateId];
        throw $error;
    }
}
function mail_delivery_config(array $config): ?array {
    $mail = $config['email'] ?? null;
    if (!is_array($mail) || ($mail['enabled'] ?? false) !== true) return null;
    $provider = mail_text($mail['provider'] ?? '', 32); $fromEmail = strtolower(trim(mail_text($mail['from_email'] ?? '', 320))); $fromName = mail_text($mail['from_name'] ?? 'Buyniverse', 100);
    if (!filter_var($fromEmail, FILTER_VALIDATE_EMAIL) || $fromName === '') return null;
    $replyTo = strtolower(trim(mail_text($mail['reply_to'] ?? '', 320))); if ($replyTo !== '' && !filter_var($replyTo, FILTER_VALIDATE_EMAIL)) return null;
    if ($provider === 'resend') {
        $apiKey = mail_text($mail['api_key'] ?? '', 512);
        if ($apiKey === '' || !str_starts_with($apiKey, 're_')) return null;
        return ['provider'=>'resend', 'api_key'=>$apiKey, 'from'=>$fromName . ' <' . $fromEmail . '>', 'from_email'=>$fromEmail, 'reply_to'=>$replyTo];
    }
    if ($provider !== 'smtp_ssl' || !is_array($mail['smtp'] ?? null)) return null;
    $host = strtolower(mail_text($mail['smtp']['host'] ?? '', 253)); $port = (int) ($mail['smtp']['port'] ?? 0);
    $username = strtolower(trim(mail_text($mail['smtp']['username'] ?? '', 320))); $password = mail_text($mail['smtp']['password'] ?? '', 512);
    if (!preg_match('/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/', $host) || $port !== 465 || !filter_var($username, FILTER_VALIDATE_EMAIL) || $password === '') return null;
    return ['provider'=>'smtp_ssl', 'host'=>$host, 'port'=>$port, 'username'=>$username, 'password'=>$password, 'from'=>$fromName . ' <' . $fromEmail . '>', 'from_email'=>$fromEmail, 'reply_to'=>$replyTo];
}
function mail_send_resend(array $delivery, array $payload, string $outboxId): array {
    if (!function_exists('curl_init')) return ['ok'=>false, 'code'=>'transport_unavailable'];
    $to = $payload['to'] ?? ''; $subject = mail_text($payload['subject'] ?? '', 180); $html = $payload['html'] ?? ''; $text = $payload['text'] ?? '';
    if (!filter_var($to, FILTER_VALIDATE_EMAIL) || $subject === '' || !is_string($html) || !is_string($text) || strlen($html) > 200000 || strlen($text) > 50000) return ['ok'=>false, 'code'=>'payload_invalid'];
    $body = ['from'=>$delivery['from'], 'to'=>[$to], 'subject'=>$subject, 'html'=>$html, 'text'=>$text, 'tags'=>[['name'=>'application','value'=>'buyniverse'], ['name'=>'outbox','value'=>str_replace('-', '', $outboxId)]]];
    if ($delivery['reply_to'] !== '') $body['reply_to'] = $delivery['reply_to'];
    $json = json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); if (!is_string($json)) return ['ok'=>false, 'code'=>'payload_invalid'];
    $curl = curl_init('https://api.resend.com/emails'); if ($curl === false) return ['ok'=>false, 'code'=>'transport_unavailable'];
    curl_setopt_array($curl, [CURLOPT_POST=>true, CURLOPT_POSTFIELDS=>$json, CURLOPT_RETURNTRANSFER=>true, CURLOPT_FOLLOWLOCATION=>false, CURLOPT_MAXREDIRS=>0, CURLOPT_TIMEOUT=>15, CURLOPT_CONNECTTIMEOUT=>4, CURLOPT_SSL_VERIFYPEER=>true, CURLOPT_SSL_VERIFYHOST=>2, CURLOPT_HTTPHEADER=>['Authorization: Bearer ' . $delivery['api_key'], 'Content-Type: application/json', 'Accept: application/json', 'User-Agent: Buyniverse-Mailer/1.0', 'Idempotency-Key: outbox/' . $outboxId]]);
    $raw = curl_exec($curl); $status = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE); curl_close($curl);
    $response = is_string($raw) && strlen($raw) <= 131072 ? json_decode($raw, true) : null;
    if ($status >= 200 && $status < 300 && is_array($response) && is_string($response['id'] ?? null)) return ['ok'=>true, 'message_id'=>mail_text($response['id'], 120)];
    return ['ok'=>false, 'code'=>$status === 429 ? 'provider_rate_limited' : ($status >= 500 ? 'provider_unavailable' : 'provider_rejected')];
}
function mail_header_encode(string $value): string { return '=?UTF-8?B?' . base64_encode(mail_text($value, 240)) . '?='; }
function mail_smtp_message(array $delivery, array $payload, string $outboxId): ?array {
    $to = strtolower(trim(mail_text($payload['to'] ?? '', 320))); $subject = mail_text($payload['subject'] ?? '', 180); $html = $payload['html'] ?? ''; $text = $payload['text'] ?? '';
    if (!filter_var($to, FILTER_VALIDATE_EMAIL) || $subject === '' || !is_string($html) || !is_string($text) || strlen($html) > 200000 || strlen($text) > 50000) return null;
    $domain = strtolower((string) substr(strrchr((string) $delivery['from_email'], '@') ?: '', 1));
    if (!preg_match('/^[a-z0-9.-]{3,253}$/', $domain)) return null;
    $boundary = '=_bn_' . substr(hash('sha256', $outboxId), 0, 32); $messageId = '<' . str_replace('-', '', $outboxId) . '@' . $domain . '>';
    $headers = [
        'From: ' . mail_header_encode((string) preg_replace('/\s*<.*$/', '', (string) $delivery['from'])) . ' <' . $delivery['from_email'] . '>',
        'To: <' . $to . '>', 'Subject: ' . mail_header_encode($subject), 'Date: ' . gmdate('D, d M Y H:i:s') . ' +0000',
        'Message-ID: ' . $messageId, 'MIME-Version: 1.0', 'Auto-Submitted: auto-generated', 'X-Auto-Response-Suppress: All',
        'Content-Type: multipart/alternative; boundary="' . $boundary . '"',
    ];
    if (($delivery['reply_to'] ?? '') !== '') $headers[] = 'Reply-To: <' . $delivery['reply_to'] . '>';
    $body = implode("\r\n", $headers) . "\r\n\r\n--" . $boundary . "\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($text), 76, "\r\n") . "--" . $boundary . "\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($html), 76, "\r\n") . "--" . $boundary . "--\r\n";
    return ['message'=>$body, 'to'=>$to, 'message_id'=>trim($messageId, '<>')];
}
function mail_send_smtp(array $delivery, array $payload, string $outboxId): array {
    if (!function_exists('curl_init')) return ['ok'=>false, 'code'=>'transport_unavailable'];
    $encoded = mail_smtp_message($delivery, $payload, $outboxId); if ($encoded === null) return ['ok'=>false, 'code'=>'payload_invalid'];
    $offset = 0; $message = $encoded['message']; $curl = curl_init('smtps://' . $delivery['host'] . ':' . $delivery['port']);
    if ($curl === false) return ['ok'=>false, 'code'=>'transport_unavailable'];
    $options = [
        CURLOPT_UPLOAD=>true, CURLOPT_RETURNTRANSFER=>true, CURLOPT_FOLLOWLOCATION=>false, CURLOPT_MAXREDIRS=>0,
        CURLOPT_TIMEOUT=>20, CURLOPT_CONNECTTIMEOUT=>5, CURLOPT_SSL_VERIFYPEER=>true, CURLOPT_SSL_VERIFYHOST=>2,
        CURLOPT_USERNAME=>$delivery['username'], CURLOPT_PASSWORD=>$delivery['password'], CURLOPT_MAIL_FROM=>$delivery['from_email'],
        CURLOPT_MAIL_RCPT=>[$encoded['to']], CURLOPT_INFILESIZE=>strlen($message),
        CURLOPT_READFUNCTION=>static function ($handle, $stream, int $length) use (&$offset, $message): string { $chunk = substr($message, $offset, $length); $offset += strlen($chunk); return $chunk; },
    ];
    if (defined('CURLOPT_PROTOCOLS') && defined('CURLPROTO_SMTPS')) $options[constant('CURLOPT_PROTOCOLS')] = constant('CURLPROTO_SMTPS');
    curl_setopt_array($curl, $options); $ok = curl_exec($curl) !== false; $errno = curl_errno($curl); curl_close($curl);
    if ($ok) return ['ok'=>true, 'message_id'=>$encoded['message_id']];
    return ['ok'=>false, 'code'=>defined('CURLE_LOGIN_DENIED') && $errno === constant('CURLE_LOGIN_DENIED') ? 'smtp_auth_failed' : 'smtp_unavailable'];
}
function mail_dispatch_pending(PDO $pdo, array $config, string $key, int $limit = 25): array {
    $delivery = mail_delivery_config($config); if ($delivery === null) return ['processed'=>0, 'sent'=>0, 'disabled'=>true];
    $limit = max(1, min($limit, 100)); $result = ['processed'=>0, 'sent'=>0, 'failed'=>0, 'disabled'=>false];
    for ($count = 0; $count < $limit; $count++) {
        $pdo->beginTransaction();
        $find = $pdo->query('SELECT * FROM tenant_email_outbox WHERE ((status IN ("queued", "retry") AND available_at <= UTC_TIMESTAMP()) OR (status = "processing" AND locked_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 15 MINUTE))) ORDER BY available_at ASC, created_at ASC LIMIT 1 FOR UPDATE');
        $row = $find->fetch();
        if (!$row) { $pdo->commit(); break; }
        if (strtotime((string) $row['expires_at']) <= time()) { $pdo->prepare('UPDATE tenant_email_outbox SET status = "expired", locked_at = NULL, lock_token = NULL WHERE id = ?')->execute([$row['id']]); $pdo->commit(); $result['processed']++; continue; }
        $lock = mail_uuid(); $pdo->prepare('UPDATE tenant_email_outbox SET status = "processing", locked_at = UTC_TIMESTAMP(), lock_token = ?, attempts = attempts + 1 WHERE id = ?')->execute([$lock, $row['id']]); $pdo->commit();
        $payload = mail_decrypt_payload($row, $key); $sent = $payload ? ($delivery['provider'] === 'smtp_ssl' ? mail_send_smtp($delivery, $payload, (string) $row['id']) : mail_send_resend($delivery, $payload, (string) $row['id'])) : ['ok'=>false, 'code'=>'payload_integrity'];
        $pdo->beginTransaction();
        if (!empty($sent['ok'])) { $pdo->prepare('UPDATE tenant_email_outbox SET status = "sent", sent_at = UTC_TIMESTAMP(), locked_at = NULL, lock_token = NULL, provider_message_id = ?, last_error_code = NULL WHERE id = ? AND lock_token = ?')->execute([$sent['message_id'] ?? null, $row['id'], $lock]); $result['sent']++; }
        else { $attempts = (int) $row['attempts'] + 1; $terminal = $attempts >= 8 || ($sent['code'] ?? '') === 'payload_integrity'; $delay = min(3600, 60 * (2 ** min(6, $attempts - 1))); $pdo->prepare('UPDATE tenant_email_outbox SET status = ?, available_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND), locked_at = NULL, lock_token = NULL, last_error_code = ? WHERE id = ? AND lock_token = ?')->execute([$terminal ? 'failed' : 'retry', $delay, mail_text($sent['code'] ?? 'delivery_failed', 80), $row['id'], $lock]); $result['failed']++; }
        $pdo->commit(); $result['processed']++;
    }
    return $result;
}
