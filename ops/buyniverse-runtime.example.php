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

    // Enterprise identity adapters are server-side only. Keep both disabled
    // until Security supplies the approved issuer/CA, redirects, group map and
    // secret references. Values ending in _secret_ref are names/paths in the
    // host secret manager; they are not secret values.
    'identity' => [
        // Personal accounts use server-side Authorization Code OAuth. Set the
        // actual client_secret only in this 0600 runtime file (or obtain it
        // from the host secret manager here); client_secret_ref is descriptive
        // metadata and is never treated as the secret by the application.
        'google_oidc' => [
            'enabled' => false,
            'client_id' => 'REPLACE_GOOGLE_WEB_CLIENT_ID',
            'client_secret' => '', // e.g. getenv('BUYNIVERSE_GOOGLE_CLIENT_SECRET') ?: ''
            'client_secret_ref' => 'secret-manager://buyniverse/google/client-secret',
            'redirect_uri' => 'https://buyniverse.com/api/v1/auth/google/callback',
        ],
        'facebook_oauth' => [
            'enabled' => false,
            'client_id' => 'REPLACE_FACEBOOK_APP_ID',
            'client_secret' => '', // e.g. getenv('BUYNIVERSE_FACEBOOK_APP_SECRET') ?: ''
            'client_secret_ref' => 'secret-manager://buyniverse/facebook/app-secret',
            'redirect_uri' => 'https://buyniverse.com/api/v1/auth/facebook/callback',
            'graph_version' => 'v22.0',
        ],
        'entra_oidc' => [
            'enabled' => false,
            'issuer' => 'https://login.microsoftonline.com/REPLACE_TENANT_ID/v2.0',
            'client_id' => 'REPLACE_CLIENT_ID',
            'client_secret_ref' => 'secret-manager://buyniverse/entra/client-secret',
            'redirect_uri' => 'https://buyniverse.com/api/v1/auth/entra/callback',
            'group_claim' => 'groups',
            'group_role_map' => [],
        ],
        'aws_ldaps' => [
            'enabled' => false,
            'uri' => 'ldaps://directory.example.internal:636',
            'base_dn' => 'DC=example,DC=internal',
            'ca_bundle_ref' => 'secret-manager://buyniverse/aws-directory/ca-bundle',
            'bind_identity_ref' => 'secret-manager://buyniverse/aws-directory/bind-dn',
            'bind_secret_ref' => 'secret-manager://buyniverse/aws-directory/bind-password',
            'group_attribute' => 'memberOf',
            'group_role_map' => [],
        ],
    ],
];
