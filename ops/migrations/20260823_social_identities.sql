-- Social identities and personal workspaces.
--
-- Apply through the controlled deployment account before publishing the PHP
-- handler that references account_kind. A personal workspace is deliberately
-- not a fiscal legal entity: it has no RFC and cannot be presented as a CFDI
-- issuer until its owner adds and verifies a real legal entity.

ALTER TABLE `tenant_accounts`
    ADD COLUMN IF NOT EXISTS `account_kind` ENUM('business','individual') NOT NULL DEFAULT 'business' AFTER `display_name`;

ALTER TABLE `tenant_legal_entities`
    MODIFY COLUMN `rfc` VARCHAR(13) NULL,
    MODIFY COLUMN `rfc_hash` CHAR(64) NULL;

-- Existing business tenants remain business; this is explicit so that the
-- migration is safe for installations that had an experimental nullable value.
UPDATE `tenant_accounts`
SET `account_kind` = 'business'
WHERE `account_kind` IS NULL OR `account_kind` NOT IN ('business', 'individual');
