-- Platform billing: stamp packs for sale, charges to companies, and payments
-- confirmed by an operator (a payment credits the company's stamps). Apply with
-- the controlled MySQL migration account; never invoked from public HTTP.

CREATE TABLE IF NOT EXISTS `platform_stamp_packs` (
    `id` CHAR(36) NOT NULL PRIMARY KEY,
    `name` VARCHAR(120) NOT NULL,
    `stamps` INT UNSIGNED NOT NULL,
    `price_cents` BIGINT UNSIGNED NOT NULL,
    `valid_months` SMALLINT UNSIGNED NOT NULL DEFAULT 12,
    `active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `platform_charges` (
    `id` CHAR(36) NOT NULL PRIMARY KEY,
    `tenant_id` CHAR(36) NOT NULL,
    `legal_entity_id` CHAR(36) NOT NULL,
    `pack_id` CHAR(36) NOT NULL,
    `stamps` INT UNSIGNED NOT NULL,
    `amount_cents` BIGINT UNSIGNED NOT NULL,
    `status` ENUM('pending','paid','cancelled') NOT NULL DEFAULT 'pending',
    `payment_reference` VARCHAR(120) NULL,
    `created_by_principal_id` CHAR(36) NOT NULL,
    `paid_by_principal_id` CHAR(36) NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `paid_at` TIMESTAMP NULL,
    KEY `idx_platform_charge_entity` (`legal_entity_id`, `status`),
    KEY `idx_platform_charge_status` (`status`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
