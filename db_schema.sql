-- ==============================================================================
-- Buyniverse Enterprise B2B & Freelance Platform - MySQL Relational Schema
-- Target Host: Spaceship MySQL (agingriouh_buyniverse)
-- Charset: utf8mb4 / Collation: utf8mb4_unicode_ci
-- ==============================================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `proposal_extras`;
DROP TABLE IF EXISTS `milestones`;
DROP TABLE IF EXISTS `proposals`;
DROP TABLE IF EXISTS `contracts`;
DROP TABLE IF EXISTS `jobs`;
DROP TABLE IF EXISTS `invoices`;
DROP TABLE IF EXISTS `security_audit`;
DROP TABLE IF EXISTS `quotes`;
DROP TABLE IF EXISTS `purchase_orders`;
DROP TABLE IF EXISTS `rfqs`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `suppliers`;
DROP TABLE IF EXISTS `users`;

-- 1. Users & Enterprise Profiles
CREATE TABLE `users` (
    `id` VARCHAR(64) NOT NULL PRIMARY KEY,
    `name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(190) NOT NULL UNIQUE,
    `user_type` ENUM('Client', 'Freelancer', 'Admin') NOT NULL DEFAULT 'Freelancer',
    `company_name` VARCHAR(150) NULL,
    `headline` VARCHAR(255) NULL,
    `skills` JSON NULL,
    `availability` VARCHAR(50) DEFAULT 'Available',
    `total_earned` DECIMAL(12,2) DEFAULT 0.00,
    `avatar` VARCHAR(10) DEFAULT 'JD',
    `marketplace_modes` JSON NULL,
    `supplier_profile_id` VARCHAR(64) NULL,
    `jss` INT DEFAULT 95,
    `tier` VARCHAR(30) DEFAULT 'Platinum',
    `cert_level` INT DEFAULT 4,
    `connects` INT DEFAULT 50,
    `rfc` VARCHAR(20) NULL,
    `folio_balance` INT DEFAULT 10,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Marketplace Jobs & Projects
CREATE TABLE `jobs` (
    `id` VARCHAR(64) NOT NULL PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `client_id` VARCHAR(64) NOT NULL,
    `status` ENUM('DRAFT', 'PENDING_APPROVAL', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED') NOT NULL DEFAULT 'OPEN',
    `category` VARCHAR(100) NOT NULL,
    `budget` DECIMAL(12,2) NOT NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'USD',
    `budget_type` VARCHAR(50) DEFAULT 'Fixed price',
    `experience_level` VARCHAR(50) DEFAULT 'Intermediate',
    `auction_type` ENUM('OPEN', 'SEALED') NOT NULL DEFAULT 'OPEN',
    `skills` JSON NULL,
    `contract_id` VARCHAR(64) NULL,
    `requires_nda` TINYINT(1) DEFAULT 0,
    `description` TEXT NULL,
    `due_date` DATETIME NULL,
    `posted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_job_client` FOREIGN KEY (`client_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Competitive Proposals & Live Counter-Bids
CREATE TABLE `proposals` (
    `id` VARCHAR(64) NOT NULL PRIMARY KEY,
    `job_id` VARCHAR(64) NOT NULL,
    `freelancer_id` VARCHAR(64) NOT NULL,
    `bid` DECIMAL(12,2) NOT NULL,
    `completion_time` VARCHAR(80) NOT NULL,
    `cover_letter` TEXT NULL,
    `boosted` TINYINT(1) DEFAULT 0,
    `status` ENUM('Pending', 'Accepted', 'Rejected') DEFAULT 'Pending',
    `stage` VARCHAR(50) DEFAULT 'applied',
    `qualification` VARCHAR(50) DEFAULT 'Qualified',
    `nda_accepted` TINYINT(1) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_prop_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_prop_freelancer` FOREIGN KEY (`freelancer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Contracts & Escrow Deposits
CREATE TABLE `contracts` (
    `id` VARCHAR(64) NOT NULL PRIMARY KEY,
    `source_id` VARCHAR(64) NOT NULL,
    `client_id` VARCHAR(64) NOT NULL,
    `provider_id` VARCHAR(64) NOT NULL,
    `amount` DECIMAL(12,2) NOT NULL,
    `status` ENUM('Draft', 'In progress', 'Completed', 'Disputed') DEFAULT 'In progress',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_contract_client` FOREIGN KEY (`client_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_contract_provider` FOREIGN KEY (`provider_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Escrow Milestones
CREATE TABLE `milestones` (
    `id` VARCHAR(64) NOT NULL PRIMARY KEY,
    `proposal_id` VARCHAR(64) NULL,
    `contract_id` VARCHAR(64) NULL,
    `title` VARCHAR(255) NOT NULL,
    `amount` DECIMAL(12,2) NOT NULL,
    `status` ENUM('Pending', 'Funded', 'Released') DEFAULT 'Pending',
    `due_date` DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Value-Add Proposal Extras (Fiverr Style)
CREATE TABLE `proposal_extras` (
    `id` VARCHAR(64) NOT NULL PRIMARY KEY,
    `proposal_id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `price` DECIMAL(12,2) NOT NULL,
    CONSTRAINT `fk_extra_proposal` FOREIGN KEY (`proposal_id`) REFERENCES `proposals` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Fiscal Invoices (SAT CFDI 4.0 Compliant)
CREATE TABLE `invoices` (
    `id` VARCHAR(64) NOT NULL PRIMARY KEY,
    `serie` VARCHAR(10) NOT NULL,
    `folio` VARCHAR(30) NOT NULL,
    `uuid` VARCHAR(64) NOT NULL UNIQUE,
    `client_id` VARCHAR(64) NOT NULL,
    `provider_id` VARCHAR(64) NOT NULL,
    `contract_id` VARCHAR(64) NULL,
    `project_title` VARCHAR(255) NOT NULL,
    `status` VARCHAR(30) DEFAULT 'Vigente',
    `payment_status` ENUM('Paid', 'Unpaid', 'Cancelled') DEFAULT 'Unpaid',
    `currency` VARCHAR(10) DEFAULT 'USD',
    `total` DECIMAL(12,2) NOT NULL,
    `issued_date` DATETIME NOT NULL,
    `due_date` DATETIME NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Immutable Security Audit Trail (OWASP ASVS Level 3)
CREATE TABLE `security_audit` (
    `id` VARCHAR(64) NOT NULL PRIMARY KEY,
    `action` VARCHAR(120) NOT NULL,
    `detail` TEXT NULL,
    `level` ENUM('info', 'warning', 'danger') DEFAULT 'info',
    `user_id` VARCHAR(64) NULL,
    `tx_hash` VARCHAR(64) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Enterprise Sourcing: Suppliers
CREATE TABLE `suppliers` (
    `id` VARCHAR(64) NOT NULL PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `contact` VARCHAR(120) NOT NULL,
    `email` VARCHAR(190) NOT NULL,
    `total_spend` DECIMAL(14,2) DEFAULT 0.00,
    `status` VARCHAR(50) DEFAULT 'Qualified',
    `rating` DECIMAL(3,2) DEFAULT 4.50,
    `score` INT DEFAULT 90,
    `risk` INT DEFAULT 15,
    `esg` INT DEFAULT 85,
    `on_time` INT DEFAULT 95,
    `response_rate` INT DEFAULT 95,
    `certifications` JSON NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Procurement RFQs
CREATE TABLE `rfqs` (
    `id` VARCHAR(64) NOT NULL PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `budget` DECIMAL(14,2) NOT NULL,
    `currency` VARCHAR(10) DEFAULT 'USD',
    `status` VARCHAR(50) DEFAULT 'Sourcing',
    `due_date` DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Supplier Quotes & Bids
CREATE TABLE `quotes` (
    `id` VARCHAR(64) NOT NULL PRIMARY KEY,
    `rfq_id` VARCHAR(64) NOT NULL,
    `supplier_id` VARCHAR(64) NOT NULL,
    `total` DECIMAL(14,2) NOT NULL,
    `lead_time_days` INT DEFAULT 7,
    `warranty_months` INT DEFAULT 12,
    `status` VARCHAR(50) DEFAULT 'Compliant',
    `score` DECIMAL(5,2) DEFAULT 90.00,
    `rank_position` INT DEFAULT 1,
    CONSTRAINT `fk_quote_rfq` FOREIGN KEY (`rfq_id`) REFERENCES `rfqs` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_quote_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Purchase Orders (3-Way Matching)
CREATE TABLE `purchase_orders` (
    `id` VARCHAR(64) NOT NULL PRIMARY KEY,
    `rfq_id` VARCHAR(64) NOT NULL,
    `supplier_id` VARCHAR(64) NOT NULL,
    `total` DECIMAL(14,2) NOT NULL,
    `currency` VARCHAR(10) DEFAULT 'USD',
    `status` VARCHAR(50) DEFAULT 'Approved',
    `three_way_match` VARCHAR(50) DEFAULT 'Matched',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
