-- Sealed-bid RFQ on the server, the budget of a live room, and the basis of each award settlement.
-- Apply with the controlled MySQL migration account; never invoked from public HTTP.

-- An RFQ: the budget is fixed when it is opened and never changes. Quotes are sealed until it closes.
CREATE TABLE IF NOT EXISTS `rfq_events` (
    `id` CHAR(36) NOT NULL PRIMARY KEY,
    `tenant_id` CHAR(36) NOT NULL,
    `legal_entity_id` CHAR(36) NOT NULL,
    `event_ref` VARCHAR(120) NOT NULL,
    `owner_principal_id` CHAR(36) NOT NULL,
    `currency` CHAR(3) NOT NULL DEFAULT 'MXN',
    `budget_cents` BIGINT UNSIGNED NOT NULL,
    `closes_at` DATETIME NOT NULL,
    `status` ENUM('open','closed','awarded','cancelled') NOT NULL DEFAULT 'open',
    `awarded_principal_id` CHAR(36) NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_rfq_event_ref` (`tenant_id`, `legal_entity_id`, `event_ref`),
    KEY `idx_rfq_event_status` (`status`, `closes_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `rfq_participants` (
    `event_id` CHAR(36) NOT NULL,
    `principal_id` CHAR(36) NOT NULL,
    `role_key` ENUM('organizer','supplier') NOT NULL,
    PRIMARY KEY (`event_id`, `principal_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Append-only: a supplier may revise its quote while the RFQ is open (a new row); the latest one counts.
CREATE TABLE IF NOT EXISTS `rfq_quotes` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `event_id` CHAR(36) NOT NULL,
    `supplier_principal_id` CHAR(36) NOT NULL,
    `amount_cents` BIGINT UNSIGNED NOT NULL,
    `lead_days` SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    `terms` VARCHAR(80) NOT NULL DEFAULT '',
    `quote_key` VARCHAR(96) NOT NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY `uq_rfq_quote_key` (`event_id`, `supplier_principal_id`, `quote_key`),
    KEY `idx_rfq_quote_event` (`event_id`, `supplier_principal_id`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TRIGGER IF EXISTS `rfq_quotes_no_update`;
CREATE TRIGGER `rfq_quotes_no_update`
BEFORE UPDATE ON `rfq_quotes`
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'rfq quotes are immutable';

DROP TRIGGER IF EXISTS `rfq_quotes_no_delete`;
CREATE TRIGGER `rfq_quotes_no_delete`
BEFORE DELETE ON `rfq_quotes`
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'rfq quotes are immutable';

-- What an RFQ is opened with never changes; only its status and winner can move.
DROP TRIGGER IF EXISTS `rfq_events_frozen`;
CREATE TRIGGER `rfq_events_frozen`
BEFORE UPDATE ON `rfq_events`
FOR EACH ROW SET
    NEW.tenant_id = OLD.tenant_id, NEW.legal_entity_id = OLD.legal_entity_id, NEW.event_ref = OLD.event_ref, NEW.owner_principal_id = OLD.owner_principal_id,
    NEW.currency = OLD.currency, NEW.budget_cents = OLD.budget_cents, NEW.closes_at = OLD.closes_at, NEW.created_at = OLD.created_at;

-- The budget the organiser declared for a live room, written once. A settlement uses the higher of it and the start price.
CREATE TABLE IF NOT EXISTS `auction_live_budget` (
    `room_id` CHAR(36) NOT NULL PRIMARY KEY,
    `budget_cents` BIGINT UNSIGNED NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- How each settlement's baseline was found, apart from its frozen amounts.
CREATE TABLE IF NOT EXISTS `award_settlement_meta` (
    `settlement_id` CHAR(36) NOT NULL PRIMARY KEY,
    `kind` ENUM('auction','rfq') NOT NULL,
    `baseline_source` ENUM('start_price','budget','market') NOT NULL,
    `quotes_counted` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    `market_cents` BIGINT UNSIGNED NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TRIGGER IF EXISTS `award_settlement_meta_frozen`;
CREATE TRIGGER `award_settlement_meta_frozen`
BEFORE UPDATE ON `award_settlement_meta`
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'settlement basis is immutable';
