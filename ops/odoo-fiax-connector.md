# Odoo FIAx fiscal connector

Buyniverse stores each fiscal profile under one legal entity and never treats an uploaded CSD as permission to issue automatically. The onboarding endpoint only creates a `tenant_fiscal_profiles` record; Mexican CSD material is accepted separately, encrypted with AES-256-GCM and is write-only.

## Controlled activation

1. Apply `ops/migrations/20260825_social_onboarding_fiscal.sql` with the controlled MySQL migration account. On the shared host, keep that account in the private `/home/agingriouh/buyniverse-migration.php` (mode `0600`) and keep the web-runtime account DML-only. `ops/Deploy-SocialOnboarding.ps1` requires this separate configuration and will refuse to release without it.
2. In the private `~/buyniverse-runtime.php`, configure `fiscal_connectors.odoo_fiax` with a staging base URL, service identity and secret reference.
3. Map each Buyniverse legal-entity UUID to its explicit Odoo `res.company` ID. Do not use a default company or an unscoped Odoo session.
4. Validate the legal name, tax identifier, regime, address and CSD ownership with Finance. Enable live issuance only after the FIAx bridge/PAC has passed its controlled tests.

The integration must execute every Odoo call with an allowed-company context for that mapped `res.company`. It must use idempotency keys for invoices and payment complements, preserve FIAx ownership markers for addenda, and record only non-sensitive digests in the Buyniverse audit chain. PAC credentials and the connector service secret belong to the server secret manager, never to browser code, MySQL plaintext, logs or Git.

Until those controls are configured, a `buyniverse` fiscal profile remains operationally pending even if CSD credentials have been secured.
