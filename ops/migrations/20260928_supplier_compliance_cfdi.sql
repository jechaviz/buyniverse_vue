-- Supplier compliance by jurisdiction and CFDI 4.0 issuance through SW.
--
-- Apply with ops/Deploy-Migration.ps1 (controlled migration account) before
-- publishing the PHP that uses these tables. Idempotent: safe to re-run.
-- Fiscal documents, declarations and stamped XML are encrypted by the
-- application (AES-256-GCM); no raw credential or PAC token belongs here.

ALTER TABLE `tenant_legal_entities`
    ADD COLUMN IF NOT EXISTS `fiscal_subdivision` VARCHAR(8) NULL AFTER `fiscal_region`,
    ADD COLUMN IF NOT EXISTS `fiscal_county` VARCHAR(8) NULL AFTER `fiscal_subdivision`,
    ADD COLUMN IF NOT EXISTS `residence_country` CHAR(2) NULL AFTER `country_code`;

ALTER TABLE `tenant_fiscal_profiles`
    ADD COLUMN IF NOT EXISTS `certificate_number` VARCHAR(20) NULL AFTER `connector_reference`,
    ADD COLUMN IF NOT EXISTS `certificate_valid_to` DATETIME NULL AFTER `certificate_number`,
    ADD COLUMN IF NOT EXISTS `pac_synced_at` TIMESTAMP NULL AFTER `certificate_valid_to`,
    ADD COLUMN IF NOT EXISTS `stamps_balance` INT NOT NULL DEFAULT 0 AFTER `pac_synced_at`;

-- One evaluation per supplier legal entity, recomputed server-side by
-- fiscal_rules.php whenever its inputs or documents change.
CREATE TABLE IF NOT EXISTS `tenant_supplier_compliance` (
    `tenant_id` CHAR(36) NOT NULL,
    `legal_entity_id` CHAR(36) NOT NULL,
    `country_code` CHAR(2) NOT NULL,
    `rules_version` VARCHAR(40) NOT NULL,
    `status` ENUM('incomplete','enrolled','formal') NOT NULL DEFAULT 'incomplete',
    `answers_json` JSON NULL,
    `declarations_ciphertext` VARBINARY(8192) NULL,
    `declarations_iv` BINARY(12) NULL,
    `declarations_tag` BINARY(16) NULL,
    `evaluation_json` JSON NOT NULL,
    `evaluated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`tenant_id`, `legal_entity_id`),
    KEY `idx_supplier_compliance_status` (`status`, `country_code`),
    CONSTRAINT `chk_supplier_compliance_json` CHECK (JSON_VALID(`evaluation_json`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tenant_compliance_documents` (
    `id` CHAR(36) NOT NULL PRIMARY KEY,
    `tenant_id` CHAR(36) NOT NULL,
    `legal_entity_id` CHAR(36) NOT NULL,
    `requirement_id` VARCHAR(40) NOT NULL,
    `issued_on` DATE NOT NULL,
    `content_ciphertext` MEDIUMBLOB NOT NULL,
    `content_iv` BINARY(12) NOT NULL,
    `content_tag` BINARY(16) NOT NULL,
    `content_sha256` CHAR(64) NOT NULL,
    `byte_size` INT NOT NULL,
    `uploaded_by_principal_id` CHAR(36) NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_compliance_document` (`tenant_id`, `legal_entity_id`, `requirement_id`),
    KEY `idx_compliance_document_entity` (`tenant_id`, `legal_entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- CFDI series per legal entity x document kind x issuing place (branch or
-- warehouse), as in garlo: the most specific active rule wins; a rule with
-- its own folio counts independently of others sharing the same letters.
CREATE TABLE IF NOT EXISTS `cfdi_series` (
    `id` CHAR(36) NOT NULL PRIMARY KEY,
    `tenant_id` CHAR(36) NOT NULL,
    `legal_entity_id` CHAR(36) NOT NULL,
    `location_id` CHAR(36) NULL,
    `doc_kind` ENUM('I','E','P','G') NOT NULL,
    `series` VARCHAR(25) NOT NULL,
    `own_folio` TINYINT(1) NOT NULL DEFAULT 1,
    `start_folio` INT NOT NULL DEFAULT 1,
    `active` TINYINT(1) NOT NULL DEFAULT 1,
    `notes` VARCHAR(240) NULL,
    `created_by_principal_id` CHAR(36) NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_cfdi_series_pick` (`tenant_id`, `legal_entity_id`, `doc_kind`, `location_id`, `active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cfdi_folios` (
    `tenant_id` CHAR(36) NOT NULL,
    `legal_entity_id` CHAR(36) NOT NULL,
    `series_key` VARCHAR(64) NOT NULL,
    `last_folio` BIGINT UNSIGNED NOT NULL DEFAULT 0,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`tenant_id`, `legal_entity_id`, `series_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cfdi_documents` (
    `id` CHAR(36) NOT NULL PRIMARY KEY,
    `tenant_id` CHAR(36) NOT NULL,
    `legal_entity_id` CHAR(36) NOT NULL,
    `location_id` CHAR(36) NULL,
    `cfdi_type` ENUM('I','E','P') NOT NULL,
    `doc_kind` ENUM('I','E','P','G') NOT NULL,
    `series` VARCHAR(25) NULL,
    `folio` VARCHAR(40) NULL,
    `uuid` CHAR(36) NOT NULL,
    `status` ENUM('valid','cancel_requested','cancelled','cancel_error') NOT NULL DEFAULT 'valid',
    `provider` VARCHAR(20) NOT NULL,
    `simulated` TINYINT(1) NOT NULL DEFAULT 0,
    `issuer_rfc` VARCHAR(13) NOT NULL,
    `receiver_rfc` VARCHAR(13) NOT NULL,
    `receiver_name` VARCHAR(300) NOT NULL,
    `currency` CHAR(3) NOT NULL DEFAULT 'MXN',
    `subtotal` DECIMAL(18,2) NOT NULL DEFAULT 0,
    `tax` DECIMAL(18,2) NOT NULL DEFAULT 0,
    `total` DECIMAL(18,2) NOT NULL DEFAULT 0,
    `payment_method` VARCHAR(3) NULL,
    `payment_form` VARCHAR(2) NULL,
    `cfdi_use` VARCHAR(4) NULL,
    `relation_type` VARCHAR(2) NULL,
    `related_uuid` CHAR(36) NULL,
    `parent_document_id` CHAR(36) NULL,
    `reference_kind` VARCHAR(30) NULL,
    `reference_id` VARCHAR(120) NULL,
    `xml_ciphertext` MEDIUMBLOB NOT NULL,
    `xml_iv` BINARY(12) NOT NULL,
    `xml_tag` BINARY(16) NOT NULL,
    `sat_status` VARCHAR(40) NULL,
    `sat_cancel_status` VARCHAR(60) NULL,
    `sat_checked_at` TIMESTAMP NULL,
    `cancel_motive` CHAR(2) NULL,
    `cancel_code` VARCHAR(10) NULL,
    `issued_at` DATETIME NOT NULL,
    `created_by_principal_id` CHAR(36) NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_cfdi_uuid` (`uuid`),
    UNIQUE KEY `uq_cfdi_series_folio` (`tenant_id`, `legal_entity_id`, `series`, `folio`),
    KEY `idx_cfdi_entity_type` (`tenant_id`, `legal_entity_id`, `cfdi_type`, `issued_at`),
    KEY `idx_cfdi_related` (`related_uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cfdi_stamp_ledger` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` CHAR(36) NOT NULL,
    `legal_entity_id` CHAR(36) NOT NULL,
    `delta` INT NOT NULL,
    `balance_after` INT NOT NULL,
    `reason` VARCHAR(40) NOT NULL,
    `document_id` CHAR(36) NULL,
    `created_by_principal_id` CHAR(36) NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_cfdi_ledger_entity` (`tenant_id`, `legal_entity_id`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
