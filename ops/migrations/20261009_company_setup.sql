-- Company setup wizard: the data a company needs beyond what enrolment
-- collects. Apply with the controlled MySQL migration account; this schema is
-- never invoked from public HTTP. Only new tables, so it is portable between
-- MySQL and MariaDB and safe to re-run.

-- Trade name, contact data and the colonia of the fiscal address.
CREATE TABLE IF NOT EXISTS `tenant_company_profiles` (
    `legal_entity_id` CHAR(36) NOT NULL PRIMARY KEY,
    `tenant_id` CHAR(36) NOT NULL,
    `trade_name` VARCHAR(160) NULL,
    `phone` VARCHAR(40) NULL,
    `website` VARCHAR(200) NULL,
    `neighborhood` VARCHAR(120) NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_tenant_company_profile_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Address and contact of each branch or warehouse. The postal code of a place
-- is the "lugar de expedición" of the invoices issued from it.
CREATE TABLE IF NOT EXISTS `tenant_location_details` (
    `location_id` CHAR(36) NOT NULL PRIMARY KEY,
    `tenant_id` CHAR(36) NOT NULL,
    `legal_entity_id` CHAR(36) NOT NULL,
    `street` VARCHAR(240) NULL,
    `neighborhood` VARCHAR(120) NULL,
    `city` VARCHAR(120) NULL,
    `state_code` VARCHAR(8) NULL,
    `postal_code` CHAR(5) NULL,
    `phone` VARCHAR(40) NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_tenant_location_detail_entity` (`tenant_id`, `legal_entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Account where the company receives payouts. The CLABE is encrypted; only its
-- last four digits and a keyed hash (to detect reuse) are readable.
CREATE TABLE IF NOT EXISTS `tenant_payout_accounts` (
    `id` CHAR(36) NOT NULL PRIMARY KEY,
    `tenant_id` CHAR(36) NOT NULL,
    `legal_entity_id` CHAR(36) NOT NULL,
    `holder` VARCHAR(220) NOT NULL,
    `bank_code` CHAR(3) NOT NULL,
    `bank_name` VARCHAR(80) NOT NULL,
    `clabe_last4` CHAR(4) NOT NULL,
    `clabe_hash` CHAR(64) NOT NULL,
    `clabe_ciphertext` VARBINARY(256) NOT NULL,
    `clabe_iv` BINARY(12) NOT NULL,
    `clabe_tag` BINARY(16) NOT NULL,
    `created_by_principal_id` CHAR(36) NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_tenant_payout_entity` (`tenant_id`, `legal_entity_id`),
    KEY `idx_tenant_payout_hash` (`clabe_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
