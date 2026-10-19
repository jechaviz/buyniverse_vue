-- Commerce: terms per currency. A scope is "default", a workspace id, or either followed by ":<CUR>"
-- for a currency other than MXN. A room settles with the terms of its own currency when they exist; otherwise
-- only the percentage rules apply (fixed amounts mean nothing across currencies).
-- USD defaults mirror the MXN ones at about 20 pesos per dollar (floor minimum USD 150, yearly threshold USD 250,000).
INSERT IGNORE INTO `commerce_terms` (`scope`, `tenant_id`, `currency`, `rate_bps`, `bracket_threshold_cents`, `bracket_rate_bps`, `floor_bps`, `floor_min_cents`, `cap_bps`, `mode`)
VALUES ('default:USD', NULL, 'USD', 2500, 25000000, 2000, 40, 15000, 800, 'informative');
