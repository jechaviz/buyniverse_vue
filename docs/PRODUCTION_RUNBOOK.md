# Buyniverse Production Runbook & Operations Manual

## 1. Overview
Buyniverse is an enterprise B2B procurement marketplace, reverse-auction platform, and freelance talents workbench designed with high-security multi-tenancy, Mexican CFDI 4.0 tax compliance, and automated RFX lifecycle management.

## 2. System Architecture
- **Frontend Client**: Vue 3 Single File Component (SFC) architecture loaded synchronously via zero-FOUC anti-flicker bootstrap, Ahead-of-Time (AOT) UnoCSS stylesheet compilation (dist/app/uno.css), and strict Content Security Policy.
- **SaaS API Backend**: Fail-closed PHP kernel (index.php, tenant_service.php, auction_service.php, email_service.php) running under LiteSpeed/Apache on Spaceship hosting (buyniverse.com).
- **Data Persistence**: MySQL via PDO with AES-256-GCM column encryption, SHA-256 HMAC identity blinding, and scoped tenant context.
- **Native Subsystem**: High-performance V-language kernel (backend/v-service/) for standalone microservice execution and edge processing.

## 3. Environment Configuration
In production, configuration is loaded from outside document root or via buyniverse-runtime.php.
Refer to ops/buyniverse-runtime.example.php for the authoritative template with MySQL PDO, cryptographic keys, and OAuth settings.

## 4. Production Deployment
Deployments are executed from ops/Deploy-Buyniverse.ps1:

1. Build and verify locally:
   node scripts/build_dist.js
   bun scripts/qa.js

2. Deploy zero-downtime release to Spaceship:
   powershell -ExecutionPolicy Bypass -File ops/Deploy-Buyniverse.ps1

The deployment script atomically stages dist/ outside document root, tests index and asset validity, swaps the active files without dropping .git, and runs automated HTTP health verification.

### 4.1 Production and demo
- Production has no workspace without a federated identity and no `?demo=1`.
- The demo is the `/demo/` path of the same host (no subdomain). The server serves it without any API (`/demo/api/...` is 404), session or database; it runs only from the sanitized client fixture (`app/data/demo.js`, which is refused outside `/demo/`), is `noindex` and is disallowed in `robots.txt`.
- The client refuses every same-origin `/api/` call while under `/demo/`, so the shared cookies of the real product can never reach the real API from the demo.
- `'demo_enabled' => false` in `buyniverse-runtime.php` turns it off: `/demo/` answers 404 and the "Explore demo" buttons disappear (`/api/v1/runtime` reports `demoAvailable`).

### 4.2 Live-auction bid ledger
`ops/migrations/20261008_auction_bid_ledger.sql` adds `auction_live_terms` and the immutable `auction_live_bids`. The release gate refuses to publish until both tables exist, so apply it first:

   powershell -ExecutionPolicy Bypass -File ops/Deploy-Migration.ps1 -Migration 20261008_auction_bid_ledger.sql

The server validates every bid (minimum step, floor, window, anti-sniping) in integer cents and records it append-only; the browser only mirrors the verdict. Verify with `npm run qa:backend` against a disposable database (`BUYNIVERSE_TEST_RUNTIME_CONFIG`).

### 4.3 Company setup wizard (`/setup`)
Adapted from besttorni's first-run wizard. After enrolment a company administrator completes: fiscal data (with the Constancia read in the browser by the self-hosted `assets/vendor/pdfjs`), branches and warehouses with their expedition postal code, series and folios, CSD (verify, then protect), stamps, team (invitations that the invited, verified-email person can accept) and payout account (CLABE, encrypted), then a final audit by area. The server is the only judge of progress (`GET /api/v1/setup/status`). Apply `ops/migrations/20261009_company_setup.sql` before publishing. Verify with `npm run qa:backend`.

CFDI stamping uses one SW token per environment: `cfdi.sw.tokens.test` / `cfdi.sw.tokens.production` in `buyniverse-runtime.php`, selected by `cfdi.sw.environment` (see `ops/buyniverse-runtime.example.php`).

## 5. Automated Background Jobs & Cron
To dispatch pending notification emails from the outbox table, configure a server cron job:
* * * * * php ~/buyniverse.com/email_worker.php >/dev/null 2>&1

## 6. Verification & Health Check Endpoints
- GET /api/v1/runtime: Returns mode: production, serverAuth: true.
- GET /api/v1/auth/providers: Returns active federated identity options.
- GET /: Returns HTTP 200 with LiteSpeed accelerated headers.

## 7. QA Verification Suite
- bun scripts/qa.js: Component audit, routes, security headers, multitenancy, and translations.
- bun scripts/qa/deepReview.js: Codebase deep review (0 errors, 0 warnings).
- bun scripts/qa/fullProcurementLifecycle.js: Complete RFX/Auction/Purchase Order lifecycle audit.
- bun scripts/qa/e2eSimulation.js: Multi-user simulation and state integrity audit.
