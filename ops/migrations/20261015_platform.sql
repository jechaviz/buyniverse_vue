-- Platform (SaaS) administration: who may operate the platform, and an
-- append-only record of the platform's own decisions (demo approvals, operator
-- grants). Company-scoped changes keep using tenant_audit_events. Apply with the
-- controlled MySQL migration account; never invoked from public HTTP.

CREATE TABLE IF NOT EXISTS `platform_operators` (
    `principal_id` CHAR(36) NOT NULL PRIMARY KEY,
    `granted_by_principal_id` CHAR(36) NULL,
    `granted_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `revoked_at` TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `platform_audit_events` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `principal_id` CHAR(36) NOT NULL,
    `action` VARCHAR(60) NOT NULL,
    `subject` VARCHAR(120) NOT NULL,
    `payload_digest` CHAR(64) NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_platform_audit_created` (`created_at`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TRIGGER IF EXISTS `platform_audit_events_no_update`;
CREATE TRIGGER `platform_audit_events_no_update`
BEFORE UPDATE ON `platform_audit_events`
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'platform audit events are immutable';

DROP TRIGGER IF EXISTS `platform_audit_events_no_delete`;
CREATE TRIGGER `platform_audit_events_no_delete`
BEFORE DELETE ON `platform_audit_events`
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'platform audit events are immutable';
