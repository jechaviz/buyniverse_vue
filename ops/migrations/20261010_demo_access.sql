-- Private demo: access codes approved by the owners, access requests, and a
-- failed-attempt counter against guessing. Apply with the controlled MySQL
-- migration account; never invoked from public HTTP. Only new tables.

-- One code per approved guest. Only the password hash is stored; the code is
-- shown once, to whoever approves the request.
CREATE TABLE IF NOT EXISTS `demo_access_codes` (
    `id` CHAR(36) NOT NULL PRIMARY KEY,
    `label` VARCHAR(160) NOT NULL,
    `code_hash` VARCHAR(255) NOT NULL,
    `code_prefix` CHAR(4) NOT NULL,
    `expires_at` DATETIME NOT NULL,
    `revoked_at` DATETIME NULL,
    `use_count` INT UNSIGNED NOT NULL DEFAULT 0,
    `last_used_at` DATETIME NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_demo_code_prefix` (`code_prefix`, `revoked_at`, `expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Someone asks for access; an owner approves it from the command line.
CREATE TABLE IF NOT EXISTS `demo_access_requests` (
    `id` CHAR(36) NOT NULL PRIMARY KEY,
    `name` VARCHAR(120) NOT NULL,
    `company` VARCHAR(160) NULL,
    `note` VARCHAR(500) NULL,
    `email_hash` CHAR(64) NOT NULL,
    `email_ciphertext` VARBINARY(512) NOT NULL,
    `email_iv` BINARY(12) NOT NULL,
    `email_tag` BINARY(16) NOT NULL,
    `ip_hash` CHAR(64) NOT NULL,
    `status` ENUM('pending','approved','declined') NOT NULL DEFAULT 'pending',
    `code_id` CHAR(36) NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_demo_request_status` (`status`, `created_at`),
    KEY `idx_demo_request_email` (`email_hash`, `created_at`),
    KEY `idx_demo_request_ip` (`ip_hash`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Failed code attempts per network address (hashed), to stop guessing.
CREATE TABLE IF NOT EXISTS `demo_access_attempts` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `ip_hash` CHAR(64) NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_demo_attempt_ip` (`ip_hash`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
