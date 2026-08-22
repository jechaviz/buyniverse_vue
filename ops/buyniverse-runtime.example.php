<?php
// Copy outside the document root as ~/buyniverse-runtime.php with mode 0600.
// Never commit the populated file. Generate state_encryption_key with:
// php -r "echo base64_encode(random_bytes(32)), PHP_EOL;"
return [
    'db_dsn' => 'mysql:host=localhost;dbname=REPLACE_ME;charset=utf8mb4',
    'db_user' => 'REPLACE_ME',
    'db_password' => 'REPLACE_ME',
    'state_encryption_key' => 'REPLACE_WITH_BASE64_32_BYTE_KEY',
    // Only for the publicly seeded demo. Set false after OIDC/MFA session
    // issuance is connected, so state is bound to a verified subject.
    'allow_demo_workspace_state' => true,
];
