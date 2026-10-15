<?php
declare(strict_types=1);

// Loads the server modules of the release. Each module lives in
// server/modules/<name>/ and is only reached through this file (index.php) or
// through its own CLI (admin.php). Nothing here is served to the web: the
// server/ folder is denied by .htaccess and by the PHP-file rule.
require_once __DIR__ . '/modules/setup/service.php';
require_once __DIR__ . '/modules/demo/service.php';
require_once __DIR__ . '/modules/platform/service.php';
