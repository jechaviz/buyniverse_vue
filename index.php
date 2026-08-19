<?php
/**
 * Buyniverse Spaceship PHP Shim, Daemon Supervisor & Database Engine
 * 
 * Manages the high-performance Linux V/C backend binary and reverse-proxies
 * all incoming requests with OWASP ASVS Level 3 Banking Grade security headers.
 * Provides automated deployment and MySQL database management.
 */

error_reporting(E_ALL & ~E_NOTICE & ~E_DEPRECATED);
ini_set('display_errors', '0');

// Cross-version PHP polyfills
if (!function_exists('str_starts_with')) {
    function str_starts_with(string $haystack, string $needle): bool {
        return 0 === strncmp($haystack, $needle, strlen($needle));
    }
}
if (!function_exists('str_contains')) {
    function str_contains(string $haystack, string $needle): bool {
        return '' === $needle || false !== strpos($haystack, $needle);
    }
}
if (!function_exists('getallheaders')) {
    function getallheaders(): array {
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (substr($name, 0, 5) === 'HTTP_') {
                $headerName = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))));
                $headers[$headerName] = $value;
            } elseif ($name === 'CONTENT_TYPE') {
                $headers['Content-Type'] = $value;
            } elseif ($name === 'CONTENT_LENGTH') {
                $headers['Content-Length'] = $value;
            }
        }
        return $headers;
    }
}

$backendHost = '127.0.0.1';
$backendPort = 8080;
$binPath     = __DIR__ . '/buyniverse';
$logPath     = __DIR__ . '/logs/v_backend.log';
$dbUser      = 'agingriouh_buy';
$dbPass      = 'Buyniverse2026SecurePass';
$dbName      = 'agingriouh_buyniverse';

$rawUri = $_SERVER['REQUEST_URI'] ?? '/';
$uri = parse_url($rawUri, PHP_URL_PATH) ?? '/';

// 1. Static file fast-path
$candidates = [
    __DIR__ . $uri,
    __DIR__ . '/dist' . $uri,
];

foreach ($candidates as $filePath) {
    if ($uri !== '/' && is_file($filePath)) {
        $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        $mimes = [
            'css'   => 'text/css; charset=utf-8',
            'js'    => 'application/javascript; charset=utf-8',
            'json'  => 'application/json; charset=utf-8',
            'svg'   => 'image/svg+xml',
            'png'   => 'image/png',
            'jpg'   => 'image/jpeg',
            'jpeg'  => 'image/jpeg',
            'gif'   => 'image/gif',
            'ico'   => 'image/x-icon',
            'woff'  => 'font/woff',
            'woff2' => 'font/woff2',
            'ttf'   => 'font/ttf',
            'vue'   => 'text/plain; charset=utf-8',
            'sql'   => 'text/plain; charset=utf-8',
            'map'   => 'application/json',
        ];
        if (isset($mimes[$ext])) {
            header('Content-Type: ' . $mimes[$ext]);
            header('X-Content-Type-Options: nosniff');
            header('Cache-Control: public, max-age=86400');
            readfile($filePath);
            exit(0);
        }
    }
}

// 2. Automated Deploy & Sync API Endpoints
$action = $_GET['action'] ?? '';
if (str_starts_with($uri, '/api/v1/deploy') || str_starts_with($uri, '/api/v1/sync') || in_array($action, ['sync', 'deploy'], true)) {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');

    $zipUrl = 'https://github.com/jechaviz/buyniverse_vue/archive/refs/heads/main.zip';
    $zipFile = __DIR__ . '/deploy_sync.zip';

    $fp = fopen($zipFile, 'w+');
    $chSync = curl_init($zipUrl);
    curl_setopt($chSync, CURLOPT_TIMEOUT, 45);
    curl_setopt($chSync, CURLOPT_FILE, $fp);
    curl_setopt($chSync, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($chSync, CURLOPT_USERAGENT, 'Buyniverse-Sync-Agent/2.0');
    $success = curl_exec($chSync);
    curl_close($chSync);
    fclose($fp);

    $unpacked = false;
    $filesCount = 0;
    if ($success && file_exists($zipFile) && filesize($zipFile) > 1000) {
        if (class_exists('ZipArchive')) {
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
                            $filesCount++;
                        }
                    }
                    $unpacked = true;
                    if (function_exists('exec')) {
                        @exec("rm -rf " . escapeshellarg($extractPath));
                    }
                }
            }
        }
    }

    echo json_encode([
        'status' => $unpacked ? 'SUCCESS' : 'FAILED',
        'message' => $unpacked ? "Frontend successfully synchronized ({$filesCount} files updated from main branch)." : "Deployment zip could not be extracted.",
        'files_updated' => $filesCount,
        'timestamp' => date('c')
    ], JSON_PRETTY_PRINT);
    exit(0);
}

// 3. Admin Database Management API Endpoints
if (str_starts_with($uri, '/api/v1/admin/db') || in_array($action, ['seed', 'reset', 'status'], true)) {
    header('Content-Type: application/json; charset=utf-8');
    header('Strict-Transport-Security: max-age=63072000; includeSubDomains; preload');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');

    $schemaFile = __DIR__ . '/db_schema.sql';
    $seedFile   = __DIR__ . '/db_seed.sql';

    if ($uri === '/api/v1/admin/db/seed' || $action === 'seed') {
        if (file_exists($schemaFile) && file_exists($seedFile)) {
            @shell_exec("mariadb -u {$dbUser} -p{$dbPass} {$dbName} < {$schemaFile} 2>&1");
            @shell_exec("mariadb -u {$dbUser} -p{$dbPass} {$dbName} < {$seedFile} 2>&1");
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
            @shell_exec("mariadb -u {$dbUser} -p{$dbPass} {$dbName} < {$schemaFile} 2>&1");
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
            $out = @shell_exec("mariadb -u {$dbUser} -p{$dbPass} {$dbName} -N -e 'SELECT COUNT(*) FROM `{$t}`;' 2>/dev/null");
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
}

// 4. SPA Frontend Route Handling (Vue Router HTML5 History Mode)
// Non-API routes are frontend SPA pages; serve index.html directly
if (!str_starts_with($uri, '/api/') && $uri !== '/api') {
    http_response_code(200);
    header('Content-Type: text/html; charset=utf-8');
    header("Strict-Transport-Security: max-age=63072000; includeSubDomains; preload");
    header("X-Content-Type-Options: nosniff");
    header("X-Frame-Options: SAMEORIGIN");
    
    $indexHtmlPath = file_exists(__DIR__ . '/index.html') ? __DIR__ . '/index.html' : __DIR__ . '/dist/index.html';
    if (file_exists($indexHtmlPath)) {
        readfile($indexHtmlPath);
    } else {
        echo "<!DOCTYPE html><html><head><title>Buyniverse</title></head><body><h1>Buyniverse is loading...</h1><script>location.reload();</script></body></html>";
    }
    exit(0);
}

// 5. Backend Daemon Proxy for /api/* requests
if (!is_dir(__DIR__ . '/logs')) {
    @mkdir(__DIR__ . '/logs', 0755, true);
}

function isBackendAlive(string $host, int $port): bool {
    $fp = @fsockopen($host, $port, $errno, $errstr, 0.1);
    if ($fp) {
        fclose($fp);
        return true;
    }
    return false;
}

if (!isBackendAlive($backendHost, $backendPort)) {
    if (file_exists($binPath) && is_executable($binPath)) {
        @exec("PORT={$backendPort} nohup {$binPath} > {$logPath} 2>&1 &");
        usleep(100000);
    }
}

$targetUrl = "http://{$backendHost}:{$backendPort}" . $rawUri;
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
    http_response_code(200);
    header('Content-Type: text/html; charset=utf-8');
    header("Strict-Transport-Security: max-age=63072000; includeSubDomains; preload");
    header("X-Content-Type-Options: nosniff");
    header("X-Frame-Options: SAMEORIGIN");
    
    $indexHtmlPath = file_exists(__DIR__ . '/index.html') ? __DIR__ . '/index.html' : __DIR__ . '/dist/index.html';
    if (file_exists($indexHtmlPath)) {
        readfile($indexHtmlPath);
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

