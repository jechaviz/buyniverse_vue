-- Support centre: tickets from visitors and signed-in users, and their
-- history. Subjects, messages and e-mail addresses are encrypted by the
-- application (AES-256-GCM); only hashes are queryable. Idempotent.

CREATE TABLE IF NOT EXISTS `support_tickets` (
    `id` CHAR(36) NOT NULL PRIMARY KEY,
    `reference` VARCHAR(20) NOT NULL,
    `tenant_id` CHAR(36) NULL,
    `legal_entity_id` CHAR(36) NULL,
    `principal_id` CHAR(36) NULL,
    `requester_hash` CHAR(64) NOT NULL,
    `area` VARCHAR(20) NOT NULL,
    `severity` ENUM('low','normal','high') NOT NULL DEFAULT 'normal',
    `status` ENUM('open','in_progress','waiting_customer','resolved','closed') NOT NULL DEFAULT 'open',
    `locale` CHAR(2) NOT NULL DEFAULT 'es',
    `subject_ciphertext` VARBINARY(1024) NOT NULL,
    `subject_iv` BINARY(12) NOT NULL,
    `subject_tag` BINARY(16) NOT NULL,
    `email_ciphertext` VARBINARY(1024) NULL,
    `email_iv` BINARY(12) NULL,
    `email_tag` BINARY(16) NULL,
    `email_hash` CHAR(64) NULL,
    `context_json` JSON NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_support_reference` (`reference`),
    KEY `idx_support_principal` (`principal_id`, `created_at`),
    KEY `idx_support_status` (`status`, `severity`, `created_at`),
    KEY `idx_support_requester` (`requester_hash`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `support_ticket_events` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `ticket_id` CHAR(36) NOT NULL,
    `kind` ENUM('message','status') NOT NULL,
    `actor` ENUM('customer','agent','system') NOT NULL,
    `status` VARCHAR(20) NULL,
    `body_ciphertext` MEDIUMBLOB NULL,
    `body_iv` BINARY(12) NULL,
    `body_tag` BINARY(16) NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_support_events_ticket` (`ticket_id`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
