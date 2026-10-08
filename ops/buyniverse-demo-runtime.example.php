<?php
// The demo host (e.g. demo.buyniverse.com) is a separate deployment from
// production. Its docroot is a sibling of the production one, and this file
// sits next to that docroot as <docroot-name>.runtime.php, e.g.
//   ~/demo.buyniverse.com/        <- the published demo
//   ~/demo.buyniverse.com.runtime.php   <- this file (mode 0600)
// index.php picks it by location, so the demo can never read the production
// configuration. It holds no database, no encryption key and no provider
// secrets: the demo runs entirely on the sanitized client fixture.
return [
    'app_mode' => 'demo',
    'demo_hosts' => ['demo.buyniverse.com'],
    'allow_demo_workspace_state' => false,
];
