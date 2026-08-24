-- Permission-scoped live-auction activity signals. Apply with the controlled
-- MySQL migration account; this schema is never invoked from public HTTP.
--
-- The tables intentionally do NOT store offers, amounts, or bid documents.
-- Financial bid validation remains an authoritative procurement concern. This
-- channel only distributes private, rate-limited activity notices so an owner
-- and invited bidders can react without exposing rival bid details.

CREATE TABLE IF NOT EXISTS `auction_live_rooms` (
    `id` CHAR(36) NOT NULL PRIMARY KEY,
    `tenant_id` CHAR(36) NOT NULL,
    `legal_entity_id` CHAR(36) NOT NULL,
    `location_id` CHAR(36) NULL,
    `auction_ref` VARCHAR(120) NOT NULL,
    `owner_principal_id` CHAR(36) NOT NULL,
    `status` ENUM('running','paused','closed') NOT NULL DEFAULT 'running',
    `closes_at` DATETIME NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_auction_live_room` (`tenant_id`, `legal_entity_id`, `auction_ref`),
    KEY `idx_auction_live_room_owner` (`owner_principal_id`, `status`, `closes_at`),
    KEY `idx_auction_live_room_scope` (`tenant_id`, `legal_entity_id`, `location_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `auction_live_participants` (
    `room_id` CHAR(36) NOT NULL,
    `principal_id` CHAR(36) NOT NULL,
    `role_key` ENUM('organizer','bidder') NOT NULL,
    `status` ENUM('active','revoked') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`room_id`, `principal_id`),
    KEY `idx_auction_live_participant_lookup` (`principal_id`, `status`, `room_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `auction_live_events` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `room_id` CHAR(36) NOT NULL,
    `recipient_principal_id` CHAR(36) NOT NULL,
    `actor_principal_id` CHAR(36) NULL,
    `event_type` ENUM('bid_received','offer_recorded','competitive_offer','auction_extended','auction_paused','auction_resumed','auction_closed') NOT NULL,
    `event_key` VARCHAR(96) NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_auction_live_event_recipient` (`room_id`, `recipient_principal_id`, `event_key`),
    KEY `idx_auction_live_event_cursor` (`room_id`, `recipient_principal_id`, `id`),
    KEY `idx_auction_live_event_actor` (`room_id`, `actor_principal_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TRIGGER IF EXISTS `auction_live_events_no_update`;
CREATE TRIGGER `auction_live_events_no_update`
BEFORE UPDATE ON `auction_live_events`
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'live auction signals are immutable';

DROP TRIGGER IF EXISTS `auction_live_events_no_delete`;
CREATE TRIGGER `auction_live_events_no_delete`
BEFORE DELETE ON `auction_live_events`
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'live auction signals are immutable';
