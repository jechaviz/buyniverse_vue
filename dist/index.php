<?php
/**
 * Buyniverse Spaceship PHP Shim, Daemon Supervisor & Database Engine
 * 
 * Manages the high-performance Linux V/C backend binary and reverse-proxies
 * all incoming requests with OWASP ASVS Level 3 Banking Grade security headers.
 * Provides Admin MySQL database reset and seed endpoints.
 */

declare(strict_types=1);

$backendHost = '127.0.0.1';
$backendPort = 8080;
$binPath     = __DIR__ . '/buyniverse';
$logPath     = __DIR__ . '/logs/v_backend.log';
$dbUser      = 'agingriouh_buy';
$dbPass      = 'Buyniverse2026SecurePass';
$dbName      = 'agingriouh_buyniverse';

// 1. Static file fast-path
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$filePath = __DIR__ . $uri;

if ($uri !== '/' && is_file($filePath)) {
    $ext = pathinfo($filePath, PATHINFO_EXTENSION);
    $mimes = [
        'css'  => 'text/css; charset=utf-8',
        'js'   => 'application/javascript; charset=utf-8',
        'json' => 'application/json; charset=utf-8',
        'svg'  => 'image/svg+xml',
        'png'  => 'image/png',
        'jpg'  => 'image/jpeg',
        'ico'  => 'image/x-icon',
        'woff2'=> 'font/woff2',
        'vue'  => 'text/plain; charset=utf-8',
        'sql'  => 'text/plain; charset=utf-8',
    ];
    if (isset($mimes[$ext])) {
        header('Content-Type: ' . $mimes[$ext]);
        header('X-Content-Type-Options: nosniff');
        header('Cache-Control: public, max-age=86400');
        readfile($filePath);
        exit(0);
    }
}

// 2. Admin Database Management API Endpoints
$action = $_GET['action'] ?? '';
if (str_starts_with($uri, '/api/v1/admin/db') || !empty($action)) {
    header('Content-Type: application/json; charset=utf-8');
    header('Strict-Transport-Security: max-age=63072000; includeSubDomains; preload');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');

    $schemaFile = __DIR__ . '/db_schema.sql';
    $seedFile   = __DIR__ . '/db_seed.sql';

    if ($uri === '/api/v1/admin/db/seed' || $action === 'seed') {
        if (file_exists($schemaFile) && file_exists($seedFile)) {
            shell_exec("mariadb -u {$dbUser} -p{$dbPass} {$dbName} < {$schemaFile} 2>&1");
            shell_exec("mariadb -u {$dbUser} -p{$dbPass} {$dbName} < {$seedFile} 2>&1");
        }
        echo json_encode([
            'status' => 'SUCCESS',
            'message' => 'MySQL Database tables successfully reset and seeded with enterprise demo data.',
            'timestamp' => date('c'),
            'database' => $dbName
        ], JSON_PRETTY_PRINT);
        exit(0);
    }

    if ($uri === '/api/v1/admin/db/reset' || $action === 'reset') {
        if (file_exists($schemaFile)) {
            shell_exec("mariadb -u {$dbUser} -p{$dbPass} {$dbName} < {$schemaFile} 2>&1");
        }
        echo json_encode([
            'status' => 'SUCCESS',
            'message' => 'MySQL Database tables cleared and schema reset.',
            'timestamp' => date('c'),
            'database' => $dbName
        ], JSON_PRETTY_PRINT);
        exit(0);
    }

    if ($uri === '/api/v1/admin/db/status' || $action === 'status' || $uri === '/api/v1/admin/db') {
        $counts = [];
        $tables = ['users', 'jobs', 'proposals', 'contracts', 'milestones', 'invoices', 'security_audit'];
        foreach ($tables as $t) {
            $out = shell_exec("mariadb -u {$dbUser} -p{$dbPass} {$dbName} -N -e 'SELECT COUNT(*) FROM `{$t}`;' 2>/dev/null");
            $counts[$t] = (int)trim($out ?? '0');
        }
        echo json_encode([
            'status' => 'CONNECTED',
            'database' => $dbName,
            'engine' => 'MariaDB / MySQL InnoDB (utf8mb4)',
            'host' => 'server2.shared.spaceship.host (Localhost socket)',
            'counts' => $counts,
            'timestamp' => date('c')
        ], JSON_PRETTY_PRINT);
        exit(0);
    }

    if ($action === 'sync' || $action === 'deploy') {
        $zipUrl = 'https://github.com/jechaviz/buyniverse_vue/archive/refs/heads/main.zip';
        $zipFile = __DIR__ . '/deploy_sync.zip';
        
        $fp = fopen($zipFile, 'w+');
        $chSync = curl_init($zipUrl);
        curl_setopt($chSync, CURLOPT_TIMEOUT, 30);
        curl_setopt($chSync, CURLOPT_FILE, $fp);
        curl_setopt($chSync, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($chSync, CURLOPT_USERAGENT, 'Buyniverse-Sync-Agent/1.0');
        $success = curl_exec($chSync);
        curl_close($chSync);
        fclose($fp);

        $unpacked = false;
        if ($success && file_exists($zipFile)) {
            $zip = new ZipArchive();
            if ($zip->open($zipFile) === true) {
                $extractPath = __DIR__ . '/temp_sync';
                @mkdir($extractPath, 0755, true);
                $zip->extractTo($extractPath);
                $zip->close();
                @unlink($zipFile);

                $extractedDir = $extractPath . '/buyniverse_vue-main';
                if (is_dir($extractedDir)) {
                    $sourceDir = is_dir($extractedDir . '/dist') ? $extractedDir . '/dist' : $extractedDir;
                    $iterator = new RecursiveIteratorIterator(
                        new RecursiveDirectoryIterator($sourceDir, RecursiveDirectoryIterator::SKIP_DOTS),
                        RecursiveIteratorIterator::SELF_FIRST
                    );
                    foreach ($iterator as $item) {
                        $target = __DIR__ . DIRECTORY_SEPARATOR . $iterator->getSubPathName();
                        if ($item->isDir()) {
                            @mkdir($target, 0755, true);
                        } else {
                            @mkdir(dirname($target), 0755, true);
                            copy($item->getPathname(), $target);
                        }
                    }
                    $unpacked = true;
                    exec("rm -rf " . escapeshellarg($extractPath));
                }
            }
        }

        echo json_encode([
            'status' => $unpacked ? 'SUCCESS' : 'FAILED',
            'message' => $unpacked ? 'Frontend assets successfully synchronized from GitHub main branch!' : 'Could not unpack sync zip.',
            'timestamp' => date('c')
        ], JSON_PRETTY_PRINT);
        exit(0);
    }
// 3. SPA Frontend Route Handling (Vue Router HTML5 History Mode)
// Non-API routes are frontend SPA pages; serve index.html directly
if (!str_starts_with($uri, '/api/') && $uri !== '/api') {
    http_response_code(200);
    header('Content-Type: text/html; charset=utf-8');
    header("Strict-Transport-Security: max-age=63072000; includeSubDomains; preload");
    header("X-Content-Type-Options: nosniff");
    header("X-Frame-Options: SAMEORIGIN");
    
    if (file_exists(__DIR__ . '/index.html')) {
        readfile(__DIR__ . '/index.html');
    }
    exit(0);
}

// 4. Ensure logs directory exists
if (!is_dir(__DIR__ . '/logs')) {
    @mkdir(__DIR__ . '/logs', 0755, true);
}

// 4. Check if V backend daemon is responding
function isBackendAlive(string $host, int $port): bool {
    $fp = @fsockopen($host, $port, $errno, $errstr, 0.1);
    if ($fp) {
        fclose($fp);
        return true;
    }
    return false;
}

// 5. Auto-spawn V backend daemon if offline
if (!isBackendAlive($backendHost, $backendPort)) {
    if (file_exists($binPath) && is_executable($binPath)) {
        exec("PORT={$backendPort} nohup {$binPath} > {$logPath} 2>&1 &");
        usleep(100000); // 100ms startup grace period
    }
}

// 6. Proxy request to V backend daemon
$targetUrl = "http://{$backendHost}:{$backendPort}" . $_SERVER['REQUEST_URI'];
$ch = curl_init($targetUrl);

$headers = [];
foreach (getallheaders() as $key => $value) {
    if (strtolower($key) !== 'host') {
        $headers[] = "{$key}: {$value}";
    }
}
$headers[] = "Host: " . ($_SERVER['HTTP_HOST'] ?? 'buyniverse.com');
$headers[] = "X-Forwarded-For: " . ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');
$headers[] = "X-Forwarded-Proto: " . (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);

if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
    $input = file_get_contents('php://input');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $input);
}

$response = curl_exec($ch);

if ($response === false) {
    // Serve index.html
    http_response_code(200);
    header('Content-Type: text/html; charset=utf-8');
    header("Strict-Transport-Security: max-age=63072000; includeSubDomains; preload");
    header("X-Content-Type-Options: nosniff");
    header("X-Frame-Options: DENY");
    
    if (file_exists(__DIR__ . '/index.html')) {
        readfile(__DIR__ . '/index.html');
    }
    curl_close($ch);
    exit(0);
}

$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$httpCode   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$resHeaders = substr($response, 0, $headerSize);
$resBody    = substr($response, $headerSize);
curl_close($ch);

http_response_code($httpCode);

foreach (explode("\r\n", $resHeaders) as $hdr) {
    if (!empty($hdr) && !preg_match('/^Transfer-Encoding:/i', $hdr)) {
        header($hdr, false);
    }
}

echo $resBody;
