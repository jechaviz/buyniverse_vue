const fs = require("fs");
const path = require("path");

function runSecurityAudit(root, read, vueFiles) {
  const index = read("index.html");
  for (const dep of ["vue.global.prod.js", "vue-router.global.prod.js", "vue3-sfc-loader", "unocss"]) {
    if (!index.toLowerCase().includes(dep)) throw new Error(`Missing CDN dependency: ${dep}`);
  }
  if (!index.includes("app/lib/procurement-common.js")) throw new Error("Missing shared procurement browser library");
  if (!index.includes("app/lib/overlayGuard.js") || !fs.existsSync(path.join(root, "app", "lib", "overlayGuard.js")))
    throw new Error("Reusable overlay focus guard is missing");
  const overlaySource = read("app/lib/overlayGuard.js");
  for (const token of ["BuyniverseOverlay", "activate", "release", "trap", "focusableSelector"]) {
    if (!overlaySource.includes(token)) throw new Error(`Overlay focus guard is missing ${token}`);
  }
  for (const component of ["app/components/SideDrawer.vue", "app/components/TextInputDialog.vue", "app/components/CommandPalette.vue", "app/components/layout/AppModals.vue"]) {
    if (!read(component).includes("BuyniverseOverlay"))
      throw new Error(`Focusable overlay is not protected in ${component}`);
  }
  if (/node_modules|\/dist\/assets\//i.test(index)) throw new Error("Production HTML depends on a Node build artifact");
  if (!index.includes("Content-Security-Policy") || !index.includes('integrity="sha384-')) throw new Error("CSP or subresource integrity is missing");
  if (/vue@3\/|vue-router@4\/|npm\/@unocss\/runtime["']|npm\/vue3-sfc-loader\/dist/.test(index)) throw new Error("A security-sensitive CDN dependency is not pinned");

  const server = read("serve.py");
  const requiredServerHeaders = [
    "X-Content-Type-Options", "frame-ancestors", "def _allowed", "def list_directory",
    "do_TRACE", "X-Permitted-Cross-Domain-Policies", "Strict-Transport-Security",
    "Cross-Origin-Opener-Policy", "X-Download-Options", "X-DNS-Prefetch-Control", "Cache-Control", "Referrer-Policy"
  ];
  for (const h of requiredServerHeaders) {
    if (!server.includes(h)) throw new Error(`Banking grade server header or guard missing: ${h}`);
  }
  if (server.includes("document-domain")) throw new Error("Permissions-Policy contains an unsupported document-domain directive");
  if (server.includes('raw_path.startswith("/buyniverse_vue/"):\n            return True')) throw new Error("Static server exposes the full project directory");

  const phpShim = read("index.php");
  const buildScript = read("scripts/build_dist.js");
  const htaccess = read(".htaccess");
  for (const token of ["BUYNIVERSE_ENABLE_BACKEND_PROXY", "static_file", "fail_response", "127.0.0.1"]) {
    if (!phpShim.includes(token)) throw new Error(`Fail-closed PHP deployment shim is missing ${token}`);
  }
  for (const token of ["/api/v1/workspace-state", "aes-256-gcm", "X-Buyniverse-CSRF", "workspace_safe_value", "allow_demo_workspace_state", "workspace_state_audit"]) {
    if (!phpShim.includes(token)) throw new Error(`Encrypted workspace persistence is missing ${token}`);
  }
  const tenancyMigration = read("ops/migrations/20260823_multitenancy.sql");
  for (const token of ["tenant_context", "tenant_workspace_state", "tenant_header_origin_is_safe", "tenant_can_manage_company", "tenant_audit_events", "tenant-context", "tenant-companies"]) {
    if (!phpShim.includes(token)) throw new Error(`Server tenant boundary is missing ${token}`);
  }
  for (const token of ["tenant_accounts", "tenant_legal_entities", "tenant_locations", "tenant_memberships", "tenant_invitations", "tenant_workspace_state", "tenant_audit_events", "tenant_audit_events_no_update", "tenant_audit_events_no_delete"]) {
    if (!tenancyMigration.includes(token)) throw new Error(`Tenant migration is missing ${token}`);
  }
  if (!htaccess.includes("tenant-context|tenant-companies")) throw new Error("Apache does not route the tenant API to the authorization boundary");
  if (/dbPass|dbUser|shell_exec|ZipArchive|deploy_sync/.test(phpShim))
    throw new Error("Deployment shim retains privileged database or deploy surface");
  if (phpShim.includes("document-domain")) throw new Error("PHP Permissions-Policy contains an unsupported document-domain directive");
  for (const token of ["'sha256-Gq7EzIVYpfwoSm3b31s7d9byqHy/d58ikcNNLBXcyxA='", "X-Permitted-Cross-Domain-Policies", "X-Download-Options", "Strict-Transport-Security"]) {
    if (!phpShim.includes(token)) throw new Error(`PHP response hardening is missing ${token}`);
  }
  if (/db_schema\.sql|db_seed\.sql|buyniverse\.c|buyniverse\.v/.test(buildScript))
    throw new Error("Published dist artifact includes internal database or backend source files");
  for (const token of [
    "Options -Indexes", "Require all denied", "Content-Security-Policy", "Strict-Transport-Security",
    "Permissions-Policy", "X-Permitted-Cross-Domain-Policies", "X-Download-Options",
    "RewriteCond %{REQUEST_METHOD} !^(?:GET|HEAD)$", "RewriteRule ^(?:\\.git|node_modules|dist|scripts|tests?|docs)",
    "RewriteRule \\.(?:env|ini|sql|c|v|zip|md|py|log|lock|map|ps1|sh|bat|cmd|ya?ml|toml)$", "package(?:-lock)?\\.json",
  ]) {
    if (!htaccess.includes(token)) throw new Error(`Apache static hardening is missing ${token}`);
  }
  if (htaccess.includes("document-domain")) throw new Error("Apache Permissions-Policy contains an unsupported document-domain directive");
  for (const runtimeFile of ["index.php", ".htaccess", "manifest.json", "robots.txt", "sitemap.xml"]) {
    if (!buildScript.includes(`"${runtimeFile}"`)) throw new Error(`Published runtime artifact omits ${runtimeFile}`);
  }
  const authModal = read("app/components/AuthModal.vue");
  for (const token of ["isDemoRuntime", "no ingreses credenciales reales", "Disponible únicamente con identidad federada de producción."]) {
    if (!authModal.includes(token)) throw new Error(`Public demo identity safeguard is missing ${token}`);
  }
  const demoAdminSource = read("app/pages/dashboard/AdminDatabaseCard.vue");
  if (/\/index\.php\?action=|MySQL Database|server2\.shared\.spaceship\.host/.test(demoAdminSource))
    throw new Error("Demo administration still presents or calls a production database surface");
  if (/Spaceship MySQL Database Management|MySQL Database status refreshed/.test(read("app/i18n/marketplace.js")))
    throw new Error("Unused production-database copy remains in the demo runtime");

  const unsafeSink = /v-html|\.innerHTML\s*=|\.outerHTML\s*=|document\.write\s*\(|javascript:/i;
  for (const file of [...vueFiles, "app/main.js"]) {
    if (unsafeSink.test(read(file))) throw new Error(`Unsafe DOM sink in ${file}`);
  }

  const uploadFiles = vueFiles.filter((file) => /type=["']file["']/.test(read(file)));
  for (const file of uploadFiles) {
    if (!/type=["']file["'][^>]*accept=/.test(read(file))) throw new Error(`File input lacks an allowlist in ${file}`);
  }

  const visualManifest = JSON.parse(read("assets/procurement/manifest.json"));
  const visualFiles = visualManifest.assets.map((asset) => asset.file);
  if (new Set(visualFiles).size !== visualFiles.length) throw new Error("Duplicate canonical procurement assets");
  for (const file of visualFiles) {
    if (!fs.existsSync(path.join(root, "assets", "procurement", file))) throw new Error(`Missing procurement asset: ${file}`);
  }

  const procurementScope = {};
  new Function("window", fs.readFileSync(path.resolve(root, "../lib/procurement-common/browser.js"), "utf8"))(procurementScope);
  if (!procurementScope.ProcurementCommon || typeof procurementScope.ProcurementCommon.rankQuotes !== "function")
    throw new Error("Missing shared ProcurementCommon browser API");

  const csvProbe = procurementScope.ProcurementCommon.csv([{ value: '=HYPERLINK("https://example.invalid")' }]);
  if (!csvProbe.includes("\t=HYPERLINK")) throw new Error("CSV formula injection protection failed");

  // Banking Security Service verification (OWASP ASVS Level 3)
  const securityScope = {};
  new Function("window", "global", fs.readFileSync(path.resolve(root, "app/services/security.js"), "utf8"))(securityScope, securityScope);
  const sec = securityScope.BuyniverseSecurity;
  if (!sec || typeof sec.maskSensitiveText !== "function" || typeof sec.sanitizeCsvValue !== "function")
    throw new Error("BuyniverseSecurity engine missing required banking methods");

  if (sec.maskSensitiveText("Card 4532 1234 5678 9012") !== "Card ****-****-****-9012")
    throw new Error("PCI-DSS credit card masking failed");
  if (!sec.maskSensitiveText("CLABE 123456789012345678").includes("1234**********5678"))
    throw new Error("Financial CLABE account masking failed");
  if (sec.sanitizeCsvValue("=cmd|' /C calc'!A0") !== "'=cmd|' /C calc'!A0")
    throw new Error("OWASP CSV Formula / DDE injection defense failed");
  if (!sec.generateTransactionHash({ amount: 15000, id: "TXN-999" }))
    throw new Error("Cryptographic transaction hash generation failed");
  if (typeof sec.validateFileUpload !== "function" || typeof sec.sanitizeFilename !== "function" || typeof sec.sha256Hex !== "function")
    throw new Error("Secure attachment or SHA-256 API is missing");
  if (!sec.validateFileUpload({ name: "brief.pdf", type: "application/pdf", size: 1024 }).ok)
    throw new Error("Allowed attachment was rejected");
  if (sec.validateFileUpload({ name: "payload.html", type: "text/html", size: 1024 }).ok)
    throw new Error("Executable attachment type was accepted");
  if (sec.validateFileUpload({ name: "brief.pdf", type: "text/html", size: 1024 }).ok)
    throw new Error("Mismatched attachment media type was accepted");
  if (sec.validateFileUpload({ name: "large.pdf", type: "application/pdf", size: 2 * 1024 * 1024 + 1 }).ok)
    throw new Error("Oversized attachment was accepted");
  if (sec.sanitizeFilename("../private/brief.pdf") !== "brief.pdf")
    throw new Error("Attachment filename traversal was not removed");

  const storageValues = {};
  const webScope = {
    localStorage: {
      getItem: (key) => storageValues[key] || null,
      setItem: (key, value) => { storageValues[key] = value; },
      removeItem: (key) => { delete storageValues[key]; },
    },
  };
  new Function("window", fs.readFileSync(path.resolve(root, "../lib/web-common/browser.js"), "utf8"))(webScope);
  const secureStorage = webScope.WebCommon.createVersionedStorage("qa", 1);
  secureStorage.write({ safe: "kept", password: "remove-me", nested: { apiKey: "remove-me-too", myAccessToken: "remove-me-three" } });
  if (/remove-me|password|apiKey|myAccessToken/.test(storageValues.qa) || secureStorage.read().value.safe !== "kept")
    throw new Error("Sensitive storage redaction failed");
  if (webScope.WebCommon.sanitizeText("safe\u202Etxt", 40) !== "safetxt") throw new Error("Bidi control sanitization failed");
  if (!webScope.WebCommon.isSafeAmount(1, 0) || webScope.WebCommon.isSafeAmount(1000000001, 0) || webScope.WebCommon.isSafeAmount("NaN", 0))
    throw new Error("Financial range validation failed");

  storageValues.poisoned = '{"version":1,"data":{"safe":true,"__proto__":{"polluted":true}}}';
  const poisoned = webScope.WebCommon.createVersionedStorage("poisoned", 1).read().value;
  if (!poisoned.safe || Object.prototype.polluted) throw new Error("Prototype pollution storage guard failed");

  const draftValues = {};
  webScope.sessionStorage = {
    getItem: (key) => draftValues[key] || null,
    setItem: (key, value) => { draftValues[key] = value; },
    removeItem: (key) => { delete draftValues[key]; },
  };
  new Function("window", fs.readFileSync(path.resolve(root, "../lib/web-common/browser.js"), "utf8"))(webScope);
  const secureDraft = webScope.WebCommon.createSessionDraft("draft-qa", { ttlMs: 60000 });
  secureDraft.write({ title: "kept", apiKey: "remove-me" });
  if (draftValues["draft-qa"].includes("remove-me") || secureDraft.read().title !== "kept") throw new Error("Ephemeral draft redaction failed");

  const forms = vueFiles.flatMap((file) => [...read(file).matchAll(/<form\b[\s\S]*?<\/form>/g)].map((match) => ({ file, source: match[0] })));
  if (!forms.length || !forms.some((form) => /\brequired\b/.test(form.source))) throw new Error("No interactive required form coverage found");
  if (!fs.readFileSync(path.resolve(root, "../lib/web-common/browser.js"), "utf8").includes("installFormValidation"))
    throw new Error("Shared accessible form validation is missing");

  for (const form of forms) {
    if (!/<(?:input|select|textarea)\b/.test(form.source)) throw new Error(`Form without an interactive control: ${form.file}`);
    if (!/@submit(?:\.prevent)?=/.test(form.source)) throw new Error(`Form without an explicit submit flow: ${form.file}`);
  }

  const validationRuntime = fs.readFileSync(path.resolve(root, "../lib/web-common/browser.js"), "utf8");
  for (const token of ["aria-required", "aria-invalid", "aria-describedby", "role", "MutationObserver", "scrollIntoView"]) {
    if (!validationRuntime.includes(token)) throw new Error(`Accessible validation is missing ${token}`);
  }

  return { formCount: forms.length, assetCount: visualFiles.length };
}

module.exports = { runSecurityAudit };
