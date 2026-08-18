-- ==============================================================================
-- Buyniverse Enterprise Demo Data Seed
-- Target Database: agingriouh_buyniverse
-- ==============================================================================

USE `agingriouh_buyniverse`;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Users
INSERT INTO `users` (`id`, `name`, `email`, `user_type`, `company_name`, `headline`, `skills`, `availability`, `total_earned`, `avatar`, `jss`, `tier`, `cert_level`, `connects`, `rfc`)
VALUES
('user-client-brenda', 'Brenda Smith', 'brenda@innovate.example', 'Client', 'Innovate Inc.', 'VP of Digital Procurement', '["Procurement", "Escrow", "SaaS"]', 'Available', 0.00, 'BS', 100, 'Hero', 5, 100, 'XAXX010101000'),
('user-freelancer-john', 'John Doe', 'john@techsolutions.example', 'Freelancer', 'Tech Solutions LLC', 'Senior Fullstack & Vue 3 Architect', '["Vue 3", "TypeScript", "Node.js", "Vlang"]', 'Available', 125000.00, 'JD', 99, 'Hero', 5, 60, 'XAXX010101001'),
('user-freelancer-jane', 'Jane Smith', 'jane@pixelnorth.example', 'Freelancer', 'Pixel North Studio', 'Design Systems & UI/UX Director', '["Figma", "UI/UX", "Design Systems", "WCAG"]', 'Available', 89000.00, 'JS', 96, 'Platinum', 4, 45, 'XAXX010101002'),
('user-freelancer-charlie', 'Charlie Brown', 'charlie@pixelnorth.example', 'Freelancer', 'Pixel North Studio', 'Frontend Engineer', '["Vue 3", "UnoCSS", "Tailwind", "REST"]', 'Available', 42000.00, 'CB', 92, 'Gold', 3, 30, 'XAXX010101003'),
('user-admin-admin', 'Admin Operator', 'admin@buyniverse.com', 'Admin', 'Buyniverse Platform Ops', 'Enterprise SuperAdmin & Escrow Officer', '["Security", "Compliance", "Audit", "CFDI"]', 'Available', 0.00, 'AU', 100, 'Hero', 5, 500, 'XAXX010101004')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 2. Marketplace Jobs
INSERT INTO `jobs` (`id`, `title`, `client_id`, `status`, `category`, `budget`, `currency`, `budget_type`, `experience_level`, `auction_type`, `skills`, `description`, `due_date`)
VALUES
('job-1', 'E-commerce Platform Development', 'user-client-brenda', 'IN_PROGRESS', 'Development', 25000.00, 'USD', 'Fixed price', 'Expert', 'OPEN', '["React", "Node.js", "TypeScript", "Escrow"]', 'Enterprise e-commerce portal with micro-frontend architecture, SAT CFDI 4.0 fiscal module and Escrow payment release.', '2026-09-15 18:00:00'),
('job-2', 'Mobile App UI/UX Design System', 'user-client-brenda', 'OPEN', 'Design', 8000.00, 'USD', 'Fixed price', 'Intermediate', 'OPEN', '["Figma", "Design Systems", "Mobile Design", "iOS"]', 'Comprehensive multi-brand design tokens, UI components and interactive mobile Figma prototypes.', '2026-09-01 18:00:00'),
('job-4', 'Social Media Campaign & Branding Graphics', 'user-client-brenda', 'OPEN', 'Design', 1200.00, 'USD', 'Fixed price', 'Intermediate', 'SEALED', '["Graphic Design", "Brand Strategy", "Figma"]', 'High-conversion campaign assets for launch across LinkedIn, Twitter and Instagram.', '2026-08-30 18:00:00')
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

-- 3. Proposals & Bids
INSERT INTO `proposals` (`id`, `job_id`, `freelancer_id`, `bid`, `completion_time`, `cover_letter`, `boosted`, `status`, `stage`, `qualification`)
VALUES
('prop-1', 'job-1', 'user-freelancer-john', 24000.00, '4 weeks', 'Senior developer with 99% JSS and Top Rated Plus badge. Ready to structure milestone deliverables.', 1, 'Accepted', 'bafo', 'Qualified'),
('prop-2', 'job-1', 'user-freelancer-jane', 23500.00, '3.5 weeks', 'Studio team with full UX documentation and clean component handoff.', 0, 'Rejected', 'shortlisted', 'Qualified'),
('prop-4a', 'job-4', 'user-freelancer-jane', 1100.00, '10 days', 'High-converting visual design with 3 revisions included.', 1, 'Pending', 'shortlisted', 'Qualified'),
('prop-4b', 'job-4', 'user-freelancer-charlie', 1050.00, '7 days', 'Fast turnaround with source vector files and social presets.', 0, 'Pending', 'applied', 'Qualified')
ON DUPLICATE KEY UPDATE `bid` = VALUES(`bid`);

-- 4. Contracts
INSERT INTO `contracts` (`id`, `source_id`, `client_id`, `provider_id`, `amount`, `status`)
VALUES
('contract-1', 'job-1', 'user-client-brenda', 'user-freelancer-john', 24000.00, 'In progress')
ON DUPLICATE KEY UPDATE `amount` = VALUES(`amount`);

-- 5. Milestones
INSERT INTO `milestones` (`id`, `contract_id`, `title`, `amount`, `status`, `due_date`)
VALUES
('m1', 'contract-1', 'Project setup, schema and core UI', 6000.00, 'Released', '2026-06-15 00:00:00'),
('m2', 'contract-1', 'Backend API, reverse auction and CFDI engine', 10000.00, 'Funded', '2026-07-30 00:00:00'),
('m3', 'contract-1', 'QA acceptance, security audit & deployment', 8000.00, 'Pending', '2026-09-10 00:00:00')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

-- 6. Invoices (CFDI 4.0)
INSERT INTO `invoices` (`id`, `serie`, `folio`, `uuid`, `client_id`, `provider_id`, `contract_id`, `project_title`, `status`, `payment_status`, `currency`, `total`, `issued_date`, `due_date`)
VALUES
('inv-101', 'A', '101', 'E2B5A41C-5373-4109-8663-B624EDC9B071', 'user-client-brenda', 'user-freelancer-john', 'contract-1', 'E-commerce Platform Development', 'Vigente', 'Paid', 'USD', 6000.00, '2026-06-15 12:00:00', '2026-07-15 12:00:00')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

-- 7. Security Audit Trail
INSERT INTO `security_audit` (`id`, `action`, `detail`, `level`, `user_id`, `tx_hash`)
VALUES
('audit-init-01', 'Database initialized', 'Relational MySQL schema deployed with OWASP banking security seed.', 'info', 'user-admin-admin', '8F4E2A1B')
ON DUPLICATE KEY UPDATE `detail` = VALUES(`detail`);

SET FOREIGN_KEY_CHECKS = 1;
