-- Buyniverse SaaS tenancy boundary. Apply through the controlled server
-- migration operation, never through a public HTTP endpoint.
--
-- Design notes:
-- * A tenant account is the subscription boundary.
-- * A legal entity is a Mexican razón social / RFC managed by that account.
-- * Memberships and their scopes are evaluated server-side for every context.
-- * The application user cannot alter or erase the audit chain.

CREATE TABLE IF NOT EXISTS `tenant_accounts` (
    `id` CHAR(36) NOT NULL PRIMARY KEY,
    `display_name` VARCHAR(180) NOT NULL,
    `status` ENUM('active','suspended','closed') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_tenant_accounts_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tenant_principals` (
    `id` CHAR(36) NOT NULL PRIMARY KEY,
    `provider` VARCHAR(40) NOT NULL,
    `subject_hash` CHAR(64) NOT NULL,
    `display_name` VARCHAR(180) NOT NULL,
    `email_hash` CHAR(64) NULL,
    `status` ENUM('active','disabled') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_tenant_principal_subject` (`provider`, `subject_hash`),
    KEY `idx_tenant_principal_email` (`email_hash`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tenant_legal_entities` (
    `id` CHAR(36) NOT NULL PRIMARY KEY,
    `tenant_id` CHAR(36) NOT NULL,
    `legal_name` VARCHAR(220) NOT NULL,
    `rfc` VARCHAR(13) NOT NULL,
    `rfc_hash` CHAR(64) NOT NULL,
    `tax_regime` VARCHAR(12) NULL,
    `country_code` CHAR(2) NOT NULL DEFAULT 'MX',
    `status` ENUM('active','suspended','archived') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_tenant_legal_rfc` (`tenant_id`, `rfc_hash`),
    KEY `idx_tenant_legal_tenant_status` (`tenant_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tenant_locations` (
    `id` CHAR(36) NOT NULL PRIMARY KEY,
    `tenant_id` CHAR(36) NOT NULL,
    `legal_entity_id` CHAR(36) NOT NULL,
    `kind` ENUM('branch','warehouse') NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `status` ENUM('active','inactive') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_tenant_location_code` (`legal_entity_id`, `code`),
    KEY `idx_tenant_locations_context` (`tenant_id`, `legal_entity_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tenant_memberships` (
    `id` CHAR(36) NOT NULL PRIMARY KEY,
    `tenant_id` CHAR(36) NOT NULL,
    `principal_id` CHAR(36) NOT NULL,
    `role_key` ENUM('owner','admin','buyer','approver','warehouse','auditor','viewer','supplier') NOT NULL,
    `scope_kind` ENUM('tenant','legal_entity','location') NOT NULL,
    `legal_entity_id` CHAR(36) NULL,
    `location_id` CHAR(36) NULL,
    `status` ENUM('active','revoked') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `chk_tenant_membership_scope` CHECK (
      (`scope_kind` = 'tenant' AND `legal_entity_id` IS NULL AND `location_id` IS NULL) OR
      (`scope_kind` = 'legal_entity' AND `legal_entity_id` IS NOT NULL AND `location_id` IS NULL) OR
      (`scope_kind` = 'location' AND `legal_entity_id` IS NOT NULL AND `location_id` IS NOT NULL)
    ),
    UNIQUE KEY `uq_tenant_membership_scope` (`tenant_id`, `principal_id`, `role_key`, `scope_kind`, `legal_entity_id`, `location_id`),
    KEY `idx_tenant_membership_principal` (`principal_id`, `tenant_id`, `status`),
    KEY `idx_tenant_membership_context` (`tenant_id`, `legal_entity_id`, `location_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tenant_invitations` (
    `id` CHAR(36) NOT NULL PRIMARY KEY,
    `tenant_id` CHAR(36) NOT NULL,
    `legal_entity_id` CHAR(36) NULL,
    `location_id` CHAR(36) NULL,
    `email_hash` CHAR(64) NOT NULL,
    `email_ciphertext` VARBINARY(1024) NOT NULL,
    `email_iv` BINARY(12) NOT NULL,
    `email_tag` BINARY(16) NOT NULL,
    `role_key` ENUM('admin','buyer','approver','warehouse','auditor','viewer','supplier') NOT NULL,
    `scope_kind` ENUM('tenant','legal_entity','location') NOT NULL,
    `status` ENUM('pending','accepted','expired','revoked') NOT NULL DEFAULT 'pending',
    `expires_at` DATETIME NOT NULL,
    `created_by_principal_id` CHAR(36) NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_tenant_invitation_lookup` (`tenant_id`, `email_hash`, `status`, `expires_at`),
    KEY `idx_tenant_invitation_scope` (`tenant_id`, `legal_entity_id`, `location_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tenant_identity_provider_configs` (
    `id` CHAR(36) NOT NULL PRIMARY KEY,
    `tenant_id` CHAR(36) NULL,
    `provider_key` ENUM('entra_oidc','aws_ldaps') NOT NULL,
    `enabled` TINYINT(1) NOT NULL DEFAULT 0,
    `issuer_or_uri` VARCHAR(500) NOT NULL,
    `client_or_bind_identity` VARCHAR(320) NULL,
    `group_claim_or_attribute` VARCHAR(120) NULL,
    `configuration_fingerprint` CHAR(64) NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_tenant_identity_provider` (`tenant_id`, `provider_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tenant_workspace_state` (
    `context_hash` CHAR(64) NOT NULL PRIMARY KEY,
    `tenant_id` CHAR(36) NOT NULL,
    `principal_id` CHAR(36) NOT NULL,
    `legal_entity_id` CHAR(36) NOT NULL,
    `location_id` CHAR(36) NULL,
    `version` BIGINT UNSIGNED NOT NULL DEFAULT 0,
    `ciphertext` MEDIUMBLOB NOT NULL,
    `iv` BINARY(12) NOT NULL,
    `auth_tag` BINARY(16) NOT NULL,
    `payload_digest` CHAR(64) NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_tenant_workspace_owner` (`tenant_id`, `principal_id`, `legal_entity_id`, `location_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tenant_audit_events` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` CHAR(36) NOT NULL,
    `legal_entity_id` CHAR(36) NULL,
    `location_id` CHAR(36) NULL,
    `actor_principal_id` CHAR(36) NULL,
    `action` VARCHAR(100) NOT NULL,
    `resource_type` VARCHAR(80) NOT NULL,
    `resource_id` VARCHAR(120) NOT NULL,
    `payload_digest` CHAR(64) NOT NULL,
    `previous_hash` CHAR(64) NOT NULL,
    `chain_hash` CHAR(64) NOT NULL,
    `event_mac` CHAR(64) NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_tenant_audit_chain` (`tenant_id`, `id`),
    KEY `idx_tenant_audit_actor` (`actor_principal_id`, `created_at`),
    KEY `idx_tenant_audit_resource` (`tenant_id`, `resource_type`, `resource_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TRIGGER IF EXISTS `tenant_audit_events_no_update`;
CREATE TRIGGER `tenant_audit_events_no_update`
BEFORE UPDATE ON `tenant_audit_events`
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'tenant audit records are immutable';

DROP TRIGGER IF EXISTS `tenant_audit_events_no_delete`;
CREATE TRIGGER `tenant_audit_events_no_delete`
BEFORE DELETE ON `tenant_audit_events`
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'tenant audit records are immutable';
