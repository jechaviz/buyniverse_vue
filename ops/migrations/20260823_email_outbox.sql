-- Encrypted, idempotent transactional mail outbox.
-- Apply with the controlled cPanel migration account, never through HTTP.

CREATE TABLE IF NOT EXISTS `tenant_email_outbox` (
    `id` CHAR(36) NOT NULL PRIMARY KEY,
    `tenant_id` CHAR(36) NOT NULL,
    `legal_entity_id` CHAR(36) NULL,
    `actor_principal_id` CHAR(36) NULL,
    `template_key` VARCHAR(96) NOT NULL,
    `template_version` SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    `locale` ENUM('en','es') NOT NULL DEFAULT 'es',
    `recipient_hash` CHAR(64) NOT NULL,
    `subject_digest` CHAR(64) NOT NULL,
    `payload_digest` CHAR(64) NOT NULL,
    `idempotency_hash` CHAR(64) NOT NULL,
    `payload_ciphertext` MEDIUMBLOB NOT NULL,
    `payload_iv` BINARY(12) NOT NULL,
    `payload_tag` BINARY(16) NOT NULL,
    `status` ENUM('queued','processing','retry','sent','failed','expired','suppressed') NOT NULL DEFAULT 'queued',
    `attempts` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `available_at` DATETIME NOT NULL,
    `locked_at` DATETIME NULL,
    `lock_token` CHAR(36) NULL,
    `expires_at` DATETIME NOT NULL,
    `sent_at` DATETIME NULL,
    `provider_message_id` VARCHAR(120) NULL,
    `last_error_code` VARCHAR(80) NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_tenant_email_idempotency` (`tenant_id`, `idempotency_hash`),
    KEY `idx_tenant_email_dispatch` (`status`, `available_at`, `expires_at`),
    KEY `idx_tenant_email_tenant` (`tenant_id`, `created_at`),
    KEY `idx_tenant_email_recipient` (`recipient_hash`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
