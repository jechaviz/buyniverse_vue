-- Commerce: server-side commercial terms and immutable award settlements.
-- The fee is decided here, never in the browser. Apply with the controlled
-- MySQL migration account; never invoked from public HTTP.

-- One row per scope: 'default' for every company, or a company's own terms (scope = tenant id).
-- Amounts are in cents of `currency`; rates are basis points (2500 = 25%).
CREATE TABLE IF NOT EXISTS `commerce_terms` (
    `scope` VARCHAR(40) NOT NULL PRIMARY KEY,
    `tenant_id` CHAR(36) NULL,
    `currency` CHAR(3) NOT NULL DEFAULT 'MXN',
    `rate_bps` SMALLINT UNSIGNED NOT NULL DEFAULT 2500,
    `bracket_threshold_cents` BIGINT UNSIGNED NOT NULL DEFAULT 500000000,
    `bracket_rate_bps` SMALLINT UNSIGNED NOT NULL DEFAULT 2000,
    `floor_bps` SMALLINT UNSIGNED NOT NULL DEFAULT 40,
    `floor_min_cents` BIGINT UNSIGNED NOT NULL DEFAULT 300000,
    `cap_bps` SMALLINT UNSIGNED NOT NULL DEFAULT 800,
    `mode` ENUM('informative','charging') NOT NULL DEFAULT 'informative',
    `updated_by_principal_id` CHAR(36) NULL,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `chk_commerce_rates` CHECK (`rate_bps` <= 10000 AND `bracket_rate_bps` <= 10000 AND `floor_bps` <= `cap_bps` AND `cap_bps` <= 10000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `commerce_terms` (`scope`) VALUES ('default');

-- One settlement per live room, written once by the server when the organiser closes the award.
-- The money columns can never change; only the collection status can move.
CREATE TABLE IF NOT EXISTS `award_settlements` (
    `id` CHAR(36) NOT NULL PRIMARY KEY,
    `tenant_id` CHAR(36) NOT NULL,
    `legal_entity_id` CHAR(36) NOT NULL,
    `room_id` CHAR(36) NOT NULL,
    `auction_ref` VARCHAR(120) NOT NULL,
    `winner_principal_id` CHAR(36) NULL,
    `currency` CHAR(3) NOT NULL,
    `baseline_cents` BIGINT UNSIGNED NOT NULL,
    `awarded_cents` BIGINT UNSIGNED NOT NULL,
    `saving_cents` BIGINT UNSIGNED NOT NULL,
    `trailing_saving_cents` BIGINT UNSIGNED NOT NULL DEFAULT 0,
    `ratio_fee_cents` BIGINT UNSIGNED NOT NULL,
    `floor_cents` BIGINT UNSIGNED NOT NULL,
    `cap_cents` BIGINT UNSIGNED NOT NULL,
    `fee_cents` BIGINT UNSIGNED NOT NULL,
    `terms_json` TEXT NOT NULL,
    `terms_hash` CHAR(64) NOT NULL,
    `status` ENUM('informative','pending','paid','waived') NOT NULL,
    `payment_reference` VARCHAR(120) NULL,
    `settled_by_principal_id` CHAR(36) NOT NULL,
    `resolved_by_principal_id` CHAR(36) NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `resolved_at` TIMESTAMP NULL,
    UNIQUE KEY `uq_award_settlement_room` (`room_id`),
    KEY `idx_award_settlement_tenant` (`tenant_id`, `created_at`),
    KEY `idx_award_settlement_status` (`status`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TRIGGER IF EXISTS `award_settlements_frozen`;
CREATE TRIGGER `award_settlements_frozen`
BEFORE UPDATE ON `award_settlements`
FOR EACH ROW SET
    NEW.room_id = OLD.room_id, NEW.tenant_id = OLD.tenant_id, NEW.legal_entity_id = OLD.legal_entity_id, NEW.currency = OLD.currency,
    NEW.baseline_cents = OLD.baseline_cents, NEW.awarded_cents = OLD.awarded_cents, NEW.saving_cents = OLD.saving_cents,
    NEW.trailing_saving_cents = OLD.trailing_saving_cents, NEW.ratio_fee_cents = OLD.ratio_fee_cents, NEW.floor_cents = OLD.floor_cents,
    NEW.cap_cents = OLD.cap_cents, NEW.fee_cents = OLD.fee_cents, NEW.terms_json = OLD.terms_json, NEW.terms_hash = OLD.terms_hash,
    NEW.created_at = OLD.created_at;

DROP TRIGGER IF EXISTS `award_settlements_no_delete`;
CREATE TRIGGER `award_settlements_no_delete`
BEFORE DELETE ON `award_settlements`
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'award settlements cannot be deleted';
