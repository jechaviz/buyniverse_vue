-- Server-side encrypted state for the public demo/workspace runtime.
-- Apply through a privileged deployment operation; never publish this file.
CREATE TABLE IF NOT EXISTS `workspace_state` (
    `session_hash` CHAR(64) NOT NULL PRIMARY KEY,
    `version` BIGINT UNSIGNED NOT NULL DEFAULT 0,
    `ciphertext` MEDIUMBLOB NOT NULL,
    `iv` BINARY(12) NOT NULL,
    `auth_tag` BINARY(16) NOT NULL,
    `payload_digest` CHAR(64) NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `workspace_state_audit` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `session_hash` CHAR(64) NOT NULL,
    `version` BIGINT UNSIGNED NOT NULL,
    `action` ENUM('created','updated','deleted') NOT NULL,
    `payload_digest` CHAR(64) NOT NULL,
    `event_mac` CHAR(64) NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_workspace_state_audit_session_created` (`session_hash`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
