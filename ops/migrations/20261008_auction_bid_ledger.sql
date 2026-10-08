-- Authoritative live-auction bid ledger. Apply with the controlled MySQL
-- migration account; this schema is never invoked from public HTTP.
--
-- Until now the browser of whoever bid decided whether a bid was valid, and
-- every user kept a private copy of the auction inside an encrypted workspace.
-- These tables make the server the single shared truth: the room's terms, the
-- current best price and an append-only record of every accepted bid.
--
-- Money is stored as integer minor units (cents) so no float ever decides a
-- comparison. The ledger is immutable: bids can be neither updated nor deleted.

CREATE TABLE IF NOT EXISTS `auction_live_terms` (
    `room_id` CHAR(36) NOT NULL PRIMARY KEY,
    `currency` CHAR(3) NOT NULL DEFAULT 'MXN',
    `start_cents` BIGINT UNSIGNED NOT NULL,
    `min_step_cents` BIGINT UNSIGNED NOT NULL DEFAULT 100,
    `floor_cents` BIGINT UNSIGNED NOT NULL DEFAULT 0,
    `best_cents` BIGINT UNSIGNED NOT NULL,
    `leader_principal_id` CHAR(36) NULL,
    `bid_count` INT UNSIGNED NOT NULL DEFAULT 0,
    `auto_extend` TINYINT(1) NOT NULL DEFAULT 1,
    `anti_sniping_seconds` SMALLINT UNSIGNED NOT NULL DEFAULT 60,
    `extension_seconds` SMALLINT UNSIGNED NOT NULL DEFAULT 60,
    `max_extensions` SMALLINT UNSIGNED NOT NULL DEFAULT 5,
    `extension_count` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `chk_auction_terms_floor` CHECK (`floor_cents` <= `start_cents`),
    CONSTRAINT `chk_auction_terms_best` CHECK (`best_cents` <= `start_cents`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `auction_live_bids` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `room_id` CHAR(36) NOT NULL,
    `bidder_principal_id` CHAR(36) NOT NULL,
    `amount_cents` BIGINT UNSIGNED NOT NULL,
    `bid_key` VARCHAR(96) NOT NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY `uq_auction_live_bid_key` (`room_id`, `bidder_principal_id`, `bid_key`),
    KEY `idx_auction_live_bid_room` (`room_id`, `id`),
    KEY `idx_auction_live_bid_amount` (`room_id`, `amount_cents`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TRIGGER IF EXISTS `auction_live_bids_no_update`;
CREATE TRIGGER `auction_live_bids_no_update`
BEFORE UPDATE ON `auction_live_bids`
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'live auction bids are immutable';

DROP TRIGGER IF EXISTS `auction_live_bids_no_delete`;
CREATE TRIGGER `auction_live_bids_no_delete`
BEFORE DELETE ON `auction_live_bids`
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'live auction bids are immutable';
