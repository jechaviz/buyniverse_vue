// Platform administration: runs the real PHP boundary against a disposable database.
// Checks who may operate the platform (server-side, from platform_operators), the
// stamp adjustment (balance never below zero, audited), and the demo request
// decisions (a code is shown once, works at the demo gate, and can be revoked).
// Opt-in, because it needs a database:
//   BUYNIVERSE_TEST_RUNTIME_CONFIG=/path/runtime-test.php node scripts/qa/platformAdmin.js
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { spawn, execFileSync } = require("child_process");

const config = process.env.BUYNIVERSE_TEST_RUNTIME_CONFIG;
if (!config) { console.log(JSON.stringify({ platformAdmin: "skipped (set BUYNIVERSE_TEST_RUNTIME_CONFIG)" }, null, 2)); process.exit(0); }

const ROOT = path.resolve(__dirname, "../..");
const work = fs.mkdtempSync(path.join(os.tmpdir(), "bnv-platform-"));
const sessions = path.join(work, "sessions"); fs.mkdirSync(sessions);
const port = 9100 + Math.floor(Math.random() * 40);
const base = `http://127.0.0.1:${port}`;
const quiet = { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] };
const php = (args) => execFileSync("php", ["-d", "display_startup_errors=0", ...args], { ...quiet, env: { ...process.env, BUYNIVERSE_RUNTIME_CONFIG: config } });
const cli = (...args) => php([path.join(ROOT, "server/modules/platform/admin.php"), ...args]);
const failures = [];
const check = (label, ok, detail = "") => { if (!ok) failures.push(`${label}${detail ? ": " + detail : ""}`); };
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sessionScript = path.join(work, "session.php");
fs.writeFileSync(sessionScript, `<?php
session_save_path($argv[1]); session_name('buyniverse_workspace'); session_id($argv[2]);
session_start(); $_SESSION['workspace_csrf'] = $argv[3];
$_SESSION['buyniverse_identity'] = ['provider'=>'google_oidc', 'subject'=>$argv[4], 'displayName'=>$argv[5], 'email'=>null, 'emailVerified'=>false];
session_write_close();`);

// A company with a fiscal profile and stamps, a supplier-free owner, an operator to
// be granted later, and two pending demo requests (emails encrypted like the real gate does).
const fixture = path.join(work, "fixture.php");
fs.writeFileSync(fixture, `<?php
$c = require getenv('BUYNIVERSE_RUNTIME_CONFIG'); $key = base64_decode($c['state_encryption_key'], true);
$pdo = new PDO($c['db_dsn'], $c['db_user'], $c['db_password'], [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$uuid = static function () { $b = random_bytes(16); $b[6] = chr((ord($b[6]) & 0x0f) | 0x40); $b[8] = chr((ord($b[8]) & 0x3f) | 0x80); return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4)); };
$tenant = $uuid(); $entity = $uuid(); $owner = $uuid(); $people = json_decode($argv[1], true);
$pdo->prepare('INSERT INTO tenant_accounts (id, display_name, account_kind) VALUES (?, ?, "business")')->execute([$tenant, 'Panel test workspace']);
$pdo->prepare('INSERT INTO tenant_legal_entities (id, tenant_id, legal_name, rfc, rfc_hash, country_code) VALUES (?, ?, ?, ?, ?, "MX")')->execute([$entity, $tenant, 'PANEL TEST SA DE CV', 'PTE010101AB1', hash_hmac('sha256', 'PTE010101AB1', $key)]);
$pdo->prepare('INSERT INTO tenant_fiscal_profiles (id, tenant_id, legal_entity_id, issuance_mode, connector_key, status, stamps_balance) VALUES (?, ?, ?, "buyniverse", "sw", "ready", 10)')->execute([$uuid(), $tenant, $entity]);
$out = ['tenant'=>$tenant, 'entity'=>$entity];
foreach ($people as $p) {
  $id = $uuid(); $out[$p] = $id;
  $pdo->prepare('INSERT INTO tenant_principals (id, provider, subject_hash, display_name) VALUES (?, "google_oidc", ?, ?)')->execute([$id, hash_hmac('sha256', 'panel-' . strtolower($p) . '-' . $argv[2], $key), $p]);
}
$pdo->prepare('INSERT INTO tenant_memberships (id, tenant_id, principal_id, role_key, scope_kind) VALUES (?, ?, ?, "owner", "tenant")')->execute([$uuid(), $tenant, $out['Owner']]);
foreach (['Maria Pendiente' => 'maria.panel@example.com', 'Juan Rechazado' => 'juan.panel@example.com', 'Ana Revocada' => 'ana.panel@example.com'] as $name => $email) {
  $id = $uuid(); $aad = 'buyniverse-demo-request|' . $id; $iv = random_bytes(12); $tag = '';
  $cipher = openssl_encrypt($email, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag, $aad);
  $pdo->prepare('INSERT INTO demo_access_requests (id, name, company, note, email_hash, email_ciphertext, email_iv, email_tag, ip_hash) VALUES (?, ?, "ACME", "quiero ver subastas", ?, ?, ?, ?, ?)')
    ->execute([$id, $name, hash_hmac('sha256', $email, $key), $cipher, $iv, $tag, hash('sha256', 'test')]);
  $out['request:' . $name] = $id;
}
echo json_encode($out);`);

const sqlScript = path.join(work, "sql.php");
fs.writeFileSync(sqlScript, `<?php
$c = require getenv('BUYNIVERSE_RUNTIME_CONFIG'); $pdo = new PDO($c['db_dsn'], $c['db_user'], $c['db_password'], [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$s = $pdo->prepare($argv[1]); $s->execute(array_slice($argv, 2)); echo json_encode($s->fetchAll(PDO::FETCH_ASSOC) ?: []);`);
const sql = (query, ...args) => JSON.parse(php([sqlScript, query, ...args]));

const people = ["Owner", "Operator", "Customer"];
// the same subject is used for the session and for the stored principal, so they are one person
const runId = crypto.randomBytes(4).toString("hex"); // the database keeps earlier runs, so every run is its own people
const subjectOf = (name) => "panel-" + name.toLowerCase() + "-" + runId;
const sessionOf = {};
for (const name of people) {
  const id = crypto.randomBytes(16).toString("hex"), csrf = crypto.randomBytes(32).toString("hex");
  php([sessionScript, sessions, id, csrf, subjectOf(name), name]);
  sessionOf[name] = { cookie: `buyniverse_workspace=${id}`, csrf };
}
const ids = JSON.parse(php([fixture, JSON.stringify(["Owner", "Operator", "Customer"]), runId]));

async function call(who, method, uri, body, kind = "platform-v1") {
  await pause(450);
  const s = sessionOf[who];
  const headers = { Accept: "application/json", Cookie: s.cookie, Origin: base };
  let payload;
  if (body) { payload = JSON.stringify(body); headers["Content-Type"] = "application/json"; }
  if (method !== "GET") { headers["X-Buyniverse-CSRF"] = s.csrf; headers["X-Buyniverse-Request"] = kind; }
  const response = await fetch(base + uri, { method, headers, body: payload });
  const text = await response.text(); let json = null; try { json = JSON.parse(text); } catch (_) {}
  const set = response.headers.get("set-cookie"); if (set && /buyniverse_workspace=([^;]+)/.test(set)) s.cookie = `buyniverse_workspace=${RegExp.$1}`;
  if (json && typeof json.csrf === "string") s.csrf = json.csrf;
  return { status: response.status, json, text };
}

async function main() {
  // Earlier runs (the demo test, for one) share this address; clear its failed-attempt counter first.
  php([path.join(work, "sql.php"), "DELETE FROM demo_access_attempts"]);
  const server = spawn("php", ["-d", "display_startup_errors=0", "-d", `session.save_path=${sessions}`, "-S", `127.0.0.1:${port}`, "index.php"], { cwd: ROOT, env: { ...process.env, BUYNIVERSE_RUNTIME_CONFIG: config }, stdio: "ignore" });
  try {
    for (let i = 0; i < 40; i++) { try { await fetch(base + "/api/v1/runtime"); break; } catch (_) { await pause(150); } }

    // Before anyone is an operator.
    let r = await call("Customer", "GET", "/api/v1/platform/me");
    check("a signed-in customer is not an operator", r.status === 200 && r.json.operator === false, r.text);
    r = await call("Customer", "GET", "/api/v1/platform/overview");
    check("the overview refuses a non-operator", r.status === 403, r.text);
    r = await call("Customer", "POST", "/api/v1/platform/stamps", { companyId: ids.entity, delta: 5, note: "intento" });
    check("a non-operator cannot change stamps", r.status === 403, r.text);
    check("the balance is untouched", Number(sql("SELECT stamps_balance AS b FROM tenant_fiscal_profiles WHERE legal_entity_id = ?", ids.entity)[0].b) === 10);

    // Granting is a server-side decision, made on the command line.
    cli("grant", ids.Operator);
    r = await call("Operator", "GET", "/api/v1/platform/me");
    check("a granted person is an operator", r.status === 200 && r.json.operator === true && r.json.csrf, r.text);
    r = await call("Operator", "GET", "/api/v1/platform/overview");
    const company = (r.json && r.json.companies || []).find((c) => c.id === ids.entity);
    check("the overview lists the company with stamps and team", r.status === 200 && company && company.stampsBalance === 10 && company.members >= 1 && company.issuance === "buyniverse", r.text.slice(0, 200));
    check("the overview never returns a full requester email", !/juan\.panel@|maria\.panel@|ana\.panel@/.test(r.text) && /\*\*\*@/.test(r.text));
    check("the overview shows the pending requests", (r.json.demoRequests || []).filter((d) => d.status === "pending").length >= 3);
    check("the overview has the audit trail", Array.isArray(r.json.audit.company) && Array.isArray(r.json.audit.platform));

    // Stamps: positive, negative, never below zero, and always a note.
    r = await call("Operator", "POST", "/api/v1/platform/stamps", { companyId: ids.entity, delta: 5, note: "" });
    check("a stamp change needs a note", r.status === 400, r.text);
    r = await call("Operator", "POST", "/api/v1/platform/stamps", { companyId: ids.entity, delta: 0, note: "nada" });
    check("a zero change is refused", r.status === 400, r.text);
    r = await call("Operator", "POST", "/api/v1/platform/stamps", { companyId: ids.entity, delta: 5, note: "Compra acreditada por transferencia" });
    check("a positive change is recorded", r.status === 200 && r.json.balance === 15, r.text);
    r = await call("Operator", "POST", "/api/v1/platform/stamps", { companyId: ids.entity, delta: -20, note: "demasiado" });
    check("the balance cannot go below zero", r.status === 409 && /below zero/.test(r.text), r.text);
    check("the ledger records the change", sql("SELECT delta, balance_after, reason FROM cfdi_stamp_ledger WHERE legal_entity_id = ? ORDER BY id DESC LIMIT 1", ids.entity)[0]?.reason === "platform_adjustment");
    check("the change is in the company audit chain", sql("SELECT action FROM tenant_audit_events WHERE resource_id = ? AND action = 'platform.stamps_adjusted'", ids.entity).length === 1);

    // Requests: approve shows the code once; it opens the demo; a second decision is refused.
    r = await call("Operator", "POST", `/api/v1/platform/demo-requests/${ids["request:Maria Pendiente"]}`, { action: "approve", days: 3 });
    const code = r.json && r.json.code;
    check("approving returns a code, once", r.status === 200 && r.json.status === "approved" && /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code || ""), r.text);
    r = await call("Operator", "POST", `/api/v1/platform/demo-requests/${ids["request:Maria Pendiente"]}`, { action: "approve", days: 3 });
    check("a request cannot be decided twice", r.status === 409, r.text);
    r = await call("Operator", "GET", "/api/v1/platform/overview");
    check("the code is listed without its value", (r.json.demoCodes || []).some((c) => c.state === "active") && !r.text.includes(code), r.text.slice(0, 120));
    const gateJar = await (async () => {
      const page = await fetch(base + "/demo/");
      const token = ((await page.text()).match(/name="t" value="([a-f0-9]+)"/) || [])[1];
      const cookie = (page.headers.getSetCookie().find((l) => l.startsWith("buyniverse_demo_gate=")) || "").split(";")[0];
      return { token, cookie };
    })();
    const opened = await fetch(base + "/demo/__demo/access", { method: "POST", redirect: "manual", headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: gateJar.cookie }, body: new URLSearchParams({ t: gateJar.token, code }) });
    check("the approved code opens the demo", opened.status === 303, String(opened.status));

    r = await call("Operator", "POST", `/api/v1/platform/demo-requests/${ids["request:Juan Rechazado"]}`, { action: "decline" });
    check("a request can be declined", r.status === 200 && r.json.status === "declined", r.text);

    // Revoking a code closes it at once.
    const codeId = sql("SELECT id FROM demo_access_codes WHERE code_prefix = ? ORDER BY created_at DESC LIMIT 1", code.replace(/-/g, "").slice(0, 4))[0].id;
    r = await call("Operator", "POST", `/api/v1/platform/demo-codes/${codeId}/revoke`, {});
    check("a code can be revoked", r.status === 200 && r.json.revoked === true, r.text);
    const afterRevoke = await fetch(base + "/demo/__demo/access", { method: "POST", redirect: "manual", headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: gateJar.cookie }, body: new URLSearchParams({ t: gateJar.token, code }) });
    check("a revoked code no longer opens the demo", afterRevoke.status === 401 || afterRevoke.status === 429, String(afterRevoke.status));

    // Platform decisions are recorded append-only.
    const platformEvents = sql("SELECT action FROM platform_audit_events WHERE principal_id = ? ORDER BY id", ids.Operator).map((e) => e.action);
    check("platform decisions are recorded", ["demo.request_approved", "demo.request_declined", "demo.code_revoked"].every((a) => platformEvents.includes(a)), platformEvents.join(","));
    let blocked = false; try { sql("UPDATE platform_audit_events SET action = 'x' WHERE principal_id = ?", ids.Operator); } catch (_) { blocked = true; }
    check("platform decisions cannot be edited", blocked || sql("SELECT action FROM platform_audit_events WHERE action = 'x'").length === 0);

    // Billing: a pack for sale, a charge to a company, a payment that credits stamps, and the rules around it.
    r = await call("Customer", "POST", "/api/v1/platform/packs", { name: "X", stamps: 10, priceCents: "100.00" });
    check("a non-operator cannot publish a pack", r.status === 403, r.text);
    r = await call("Operator", "POST", "/api/v1/platform/packs", { name: "Paquete prueba", stamps: 100, priceCents: "4500.00", validMonths: 12 });
    const packId = r.json && r.json.id;
    check("an operator publishes a pack", r.status === 200 && !!packId, r.text);
    r = await call("Operator", "POST", "/api/v1/platform/packs", { name: "Paquete prueba", stamps: 0, priceCents: "1.00" });
    check("a pack needs positive stamps", r.status === 400, r.text);
    const before = Number(sql("SELECT stamps_balance AS b FROM tenant_fiscal_profiles WHERE legal_entity_id = ?", ids.entity)[0].b);
    r = await call("Operator", "POST", "/api/v1/platform/charges", { companyId: ids.entity, packId });
    const chargeId = r.json && r.json.id;
    check("a charge is created pending, with the pack's price", r.status === 200 && !!chargeId, r.text);
    r = await call("Operator", "GET", "/api/v1/platform/overview");
    const charge = (r.json.charges || []).find((c) => c.id === chargeId);
    check("the charge is listed as pending at the pack price", charge && charge.status === "pending" && charge.amountCents === 450000 && charge.stamps === 100, JSON.stringify(charge));
    r = await call("Operator", "POST", `/api/v1/platform/charges/${chargeId}/paid`, { reference: "ab" });
    check("a payment needs its reference (tracking key)", r.status === 400, r.text);
    check("nothing is credited before the payment is confirmed", Number(sql("SELECT stamps_balance AS b FROM tenant_fiscal_profiles WHERE legal_entity_id = ?", ids.entity)[0].b) === before);
    r = await call("Operator", "POST", `/api/v1/platform/charges/${chargeId}/paid`, { reference: "SPEI-0001234567" });
    check("a confirmed payment credits the stamps", r.status === 200 && r.json.balance === before + 100, r.text);
    check("the credit is in the stamp ledger as a pack payment", sql("SELECT reason FROM cfdi_stamp_ledger WHERE legal_entity_id = ? AND reason = 'pack_paid'", ids.entity).length >= 1);
    check("the payment is in the company audit chain", sql("SELECT action FROM tenant_audit_events WHERE resource_id = ? AND action = 'billing.charge_paid'", chargeId).length === 1);
    r = await call("Operator", "POST", `/api/v1/platform/charges/${chargeId}/paid`, { reference: "SPEI-0001234567" });
    check("a charge cannot be paid twice", r.status === 409, r.text);
    r = await call("Operator", "POST", "/api/v1/platform/charges", { companyId: ids.entity, packId });
    const cancelled = r.json && r.json.id;
    r = await call("Operator", "POST", `/api/v1/platform/charges/${cancelled}/cancel`, {});
    check("a pending charge can be cancelled", r.status === 200 && r.json.status === "cancelled", r.text);
    r = await call("Operator", "POST", `/api/v1/platform/charges/${cancelled}/paid`, { reference: "SPEI-9999999" });
    check("a cancelled charge cannot be paid", r.status === 409, r.text);

    // Regression: an empty collection saved by the app came back as a JSON array and locked the person out
    // (the client wants objects). An empty record must survive the round trip as an object.
    const current = await call("Owner", "GET", "/api/v1/workspace-state");
    const saved = await call("Owner", "PUT", "/api/v1/workspace-state", { version: current.json.version || 0, state: { currentUserId: null, users: [], jobs: [], tablePreferences: {}, documentLibrary: { documents: {}, drafts: {} }, procurementAnalytics: {} } }, "workspace-state-v1");
    check("an empty workspace can be saved", saved.status === 200, saved.text.slice(0, 160));
    const back = await call("Owner", "GET", "/api/v1/workspace-state");
    const kept = back.json && back.json.state;
    check("an empty record comes back as an object, not an array", kept && !Array.isArray(kept.tablePreferences) && !Array.isArray(kept.documentLibrary.documents) && !Array.isArray(kept.documentLibrary.drafts), JSON.stringify(kept && kept.documentLibrary));

    // Revoking the grant takes effect at once.
    cli("revoke", ids.Operator);
    r = await call("Operator", "GET", "/api/v1/platform/overview");
    check("a revoked operator is refused", r.status === 403, r.text);
  } finally { server.kill(); }
  if (failures.length) { console.error(JSON.stringify({ platformAdmin: "FAILED", failures }, null, 2)); process.exit(1); }
  console.log(JSON.stringify({ platformAdmin: "verified" }, null, 2));
}
main().catch((error) => { console.error(JSON.stringify(failures, null, 1)); console.error(error); process.exit(1); });
