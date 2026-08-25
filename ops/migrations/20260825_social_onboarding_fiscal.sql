-- Social onboarding and company-scoped fiscal profiles.
--
-- Apply with the controlled MySQL migration account before publishing the PHP
-- handler that uses these tables. This file is deliberately not web-served.
-- CSD/private keys are encrypted by the application with AES-256-GCM; no raw
-- credential, OAuth client secret or Odoo token belongs in this migration.

ALTER TABLE `tenant_legal_entities`
    ADD COLUMN IF NOT EXISTS `tax_identifier` VARCHAR(40) NULL AFTER `rfc`,
    ADD COLUMN IF NOT EXISTS `tax_identifier_hash` CHAR(64) NULL AFTER `rfc_hash`,
    ADD COLUMN IF NOT EXISTS `fiscal_street` VARCHAR(240) NULL AFTER `country_code`,
    ADD COLUMN IF NOT EXISTS `fiscal_city` VARCHAR(120) NULL AFTER `fiscal_street`,
    ADD COLUMN IF NOT EXISTS `fiscal_region` VARCHAR(120) NULL AFTER `fiscal_city`,
    ADD COLUMN IF NOT EXISTS `fiscal_postal_code` VARCHAR(24) NULL AFTER `fiscal_region`;

CREATE UNIQUE INDEX IF NOT EXISTS `uq_tenant_legal_tax_identifier`
    ON `tenant_legal_entities` (`tenant_id`, `tax_identifier_hash`);

CREATE TABLE IF NOT EXISTS `tenant_fiscal_profiles` (
    `id` CHAR(36) NOT NULL PRIMARY KEY,
    `tenant_id` CHAR(36) NOT NULL,
    `legal_entity_id` CHAR(36) NOT NULL,
    `issuance_mode` ENUM('external','buyniverse') NOT NULL DEFAULT 'external',
    `connector_key` VARCHAR(40) NOT NULL DEFAULT 'external',
    `status` ENUM('external','credentials_required','ready','disabled') NOT NULL DEFAULT 'external',
    `billing_email_ciphertext` VARBINARY(1024) NULL,
    `billing_email_iv` BINARY(12) NULL,
    `billing_email_tag` BINARY(16) NULL,
    `connector_reference` VARCHAR(180) NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_tenant_fiscal_profile_entity` (`tenant_id`, `legal_entity_id`),
    KEY `idx_tenant_fiscal_profile_state` (`tenant_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tenant_fiscal_credentials` (
    `id` CHAR(36) NOT NULL PRIMARY KEY,
    `tenant_id` CHAR(36) NOT NULL,
    `legal_entity_id` CHAR(36) NOT NULL,
    `certificate_ciphertext` MEDIUMBLOB NOT NULL,
    `certificate_iv` BINARY(12) NOT NULL,
    `certificate_tag` BINARY(16) NOT NULL,
    `private_key_ciphertext` MEDIUMBLOB NOT NULL,
    `private_key_iv` BINARY(12) NOT NULL,
    `private_key_tag` BINARY(16) NOT NULL,
    `password_ciphertext` VARBINARY(4096) NOT NULL,
    `password_iv` BINARY(12) NOT NULL,
    `password_tag` BINARY(16) NOT NULL,
    `certificate_sha256` CHAR(64) NOT NULL,
    `private_key_sha256` CHAR(64) NOT NULL,
    `certificate_fingerprint` CHAR(95) NULL,
    `active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_by_principal_id` CHAR(36) NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `rotated_at` TIMESTAMP NULL,
    UNIQUE KEY `uq_tenant_fiscal_credentials_entity` (`tenant_id`, `legal_entity_id`),
    KEY `idx_tenant_fiscal_credentials_actor` (`created_by_principal_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tenant_onboarding_profiles` (
    `principal_id` CHAR(36) NOT NULL PRIMARY KEY,
    `account_kind` ENUM('individual','business') NOT NULL,
    `marketplace_roles` JSON NOT NULL,
    `completed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `chk_tenant_onboarding_roles` CHECK (JSON_VALID(`marketplace_roles`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
