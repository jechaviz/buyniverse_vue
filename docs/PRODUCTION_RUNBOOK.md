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
