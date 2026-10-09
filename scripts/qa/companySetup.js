// Company setup wizard: runs the real PHP boundary against a disposable
// MariaDB/MySQL with every migration applied. Opt-in, because it needs a database:
//   BUYNIVERSE_TEST_RUNTIME_CONFIG=/path/runtime-test.php node scripts/qa/companySetup.js
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { spawn, execFileSync } = require("child_process");

const config = process.env.BUYNIVERSE_TEST_RUNTIME_CONFIG;
if (!config) { console.log(JSON.stringify({ companySetup: "skipped (set BUYNIVERSE_TEST_RUNTIME_CONFIG)" }, null, 2)); process.exit(0); }

const ROOT = path.resolve(__dirname, "../..");
const work = fs.mkdtempSync(path.join(os.tmpdir(), "bnv-setup-"));
const sessions = path.join(work, "sessions"); fs.mkdirSync(sessions);
const port = 8960 + Math.floor(Math.random() * 30);
const base = `http://127.0.0.1:${port}`;
const php = (args) => execFileSync("php", ["-d", "display_startup_errors=0", ...args], { encoding: "utf8", env: { ...process.env, BUYNIVERSE_RUNTIME_CONFIG: config }, stdio: ["ignore", "pipe", "ignore"] });
const failures = [];
const check = (label, ok, detail = "") => { if (!ok) failures.push(`${label}${detail ? ": " + detail : ""}`); };
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// A tenant with one Mexican company whose RFC is the SAT's public test RFC, so the
// SAT's published test CSD belongs to it. Each person has a verified e-mail.
const fixtureScript = path.join(work, "fixture.php");
fs.writeFileSync(fixtureScript, `<?php
$c = require getenv('BUYNIVERSE_RUNTIME_CONFIG'); $key = base64_decode($c['state_encryption_key'], true);
$pdo = new PDO($c['db_dsn'], $c['db_user'], $c['db_password'], [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$uuid = static function () { $b = random_bytes(16); $b[6] = chr((ord($b[6]) & 0x0f) | 0x40); $b[8] = chr((ord($b[8]) & 0x3f) | 0x80); return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4)); };
$people = json_decode($argv[1], true); $tenant = $uuid(); $entity = $uuid(); $out = ['tenant'=>$tenant, 'entity'=>$entity];
$rfc = $argv[2];
$pdo->prepare('INSERT INTO tenant_accounts (id, display_name, account_kind) VALUES (?, ?, "business")')->execute([$tenant, 'Setup test']);
$pdo->prepare('INSERT INTO tenant_legal_entities (id, tenant_id, legal_name, rfc, rfc_hash, country_code) VALUES (?, ?, ?, ?, ?, "MX")')->execute([$entity, $tenant, 'ESCUELA KEMPER URGATE', $rfc, hash_hmac('sha256', $rfc, $key)]);
foreach ($people as $p) {
  $id = $uuid(); $out[$p['name']] = $id;
  $pdo->prepare('INSERT INTO tenant_principals (id, provider, subject_hash, display_name) VALUES (?, "google_oidc", ?, ?)')->execute([$id, hash_hmac('sha256', $p['subject'], $key), $p['name']]);
  if ($p['role'] !== 'none') $pdo->prepare('INSERT INTO tenant_memberships (id, tenant_id, principal_id, role_key, scope_kind) VALUES (?, ?, ?, ?, "tenant")')->execute([$uuid(), $tenant, $id, $p['role']]);
}
echo json_encode($out);`);
const sqlScript = path.join(work, "sql.php");
fs.writeFileSync(sqlScript, `<?php
$c = require getenv('BUYNIVERSE_RUNTIME_CONFIG'); $pdo = new PDO($c['db_dsn'], $c['db_user'], $c['db_password'], [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$s = $pdo->prepare($argv[1]); $s->execute(array_slice($argv, 2)); echo json_encode($s->fetchAll(PDO::FETCH_ASSOC) ?: []);`);
const sessionScript = path.join(work, "session.php");
fs.writeFileSync(sessionScript, `<?php
session_save_path($argv[1]); session_name('buyniverse_workspace'); session_id($argv[2]);
session_start(); $_SESSION['workspace_csrf'] = $argv[3];
$_SESSION['buyniverse_identity'] = ['provider'=>'google_oidc', 'subject'=>$argv[4], 'displayName'=>$argv[5], 'email'=>$argv[6] ?: null, 'emailVerified'=>($argv[7] ?? '') === '1'];
session_write_close();`);

const rnd = () => crypto.randomBytes(5).toString("hex");
const people = [
  { name: "Owner", subject: "it-" + rnd(), role: "owner", email: `owner-${rnd()}@example.com`, verified: "1" },
  { name: "Supplier", subject: "it-" + rnd(), role: "supplier", email: "", verified: "" },
  { name: "Invitee", subject: "it-" + rnd(), role: "none", email: `new.${rnd()}@example.com`, verified: "1" },
  { name: "Unverified", subject: "it-" + rnd(), role: "none", email: "", verified: "" },
  { name: "Stranger", subject: "it-" + rnd(), role: "none", email: `other-${rnd()}@example.com`, verified: "1" },
];
const sessionOf = {};
for (const p of people) {
  const id = crypto.randomBytes(16).toString("hex"), csrf = crypto.randomBytes(32).toString("hex");
  php([sessionScript, sessions, id, csrf, p.subject, p.name, p.email, p.verified]);
  sessionOf[p.name] = { cookie: `buyniverse_workspace=${id}`, csrf };
}
const ids = JSON.parse(php([fixtureScript, JSON.stringify(people), "EKU9003173C9"]));
const sql = (query, ...args) => JSON.parse(php([sqlScript, query, ...args]));

async function call(who, method, uri, body, kind = "setup-v1") {
  await pause(kind === "fiscal-credential-v1" ? 1800 : 450); // credential uploads are rate-limited harder
  const s = sessionOf[who];
  const headers = { Accept: "application/json", Cookie: s.cookie, Origin: base };
  let payload;
  if (body instanceof FormData) { payload = body; headers["X-Buyniverse-CSRF"] = s.csrf; headers["X-Buyniverse-Request"] = kind; }
  else if (body) { payload = JSON.stringify(body); headers["Content-Type"] = "application/json"; }
  if (method !== "GET" && !(body instanceof FormData)) { headers["X-Buyniverse-CSRF"] = s.csrf; headers["X-Buyniverse-Request"] = kind; }
  const response = await fetch(base + uri, { method, headers, body: payload });
  const text = await response.text(); let json = null; try { json = JSON.parse(text); } catch (_) {}
  const set = response.headers.get("set-cookie"); if (set && /buyniverse_workspace=([^;]+)/.test(set)) s.cookie = `buyniverse_workspace=${RegExp.$1}`;
  if (json && typeof json.csrf === "string") s.csrf = json.csrf;
  return { status: response.status, json, text };
}
const clabeFor = (prefix17) => { const w = [3, 7, 1]; let sum = 0; for (let i = 0; i < 17; i++) sum += (Number(prefix17[i]) * w[i % 3]) % 10; return prefix17 + String((10 - (sum % 10)) % 10); };

async function main() {
  const server = spawn("php", ["-d", "display_startup_errors=0", "-d", `session.save_path=${sessions}`, "-S", `127.0.0.1:${port}`, "index.php"], { cwd: ROOT, env: { ...process.env, BUYNIVERSE_RUNTIME_CONFIG: config }, stdio: "ignore" });
  try {
    for (let i = 0; i < 40; i++) { try { await fetch(base + "/api/v1/runtime"); break; } catch (_) { await pause(150); } }

    let r = await call("Owner", "GET", "/api/v1/setup/status");
    check("the owner reads the checklist", r.status === 200 && r.json.canManage === true && r.json.steps.company.done === false && r.json.ready === false, r.text);
    check("a company that invoices elsewhere has no CSD/series/stamps steps", r.json.steps.csd.na && r.json.steps.series.na && r.json.steps.stamps.na, r.text);
    r = await call("Supplier", "GET", "/api/v1/setup/status");
    check("a supplier member reads but cannot manage", r.status === 200 && r.json.canManage === false, r.text);
    r = await call("Supplier", "POST", "/api/v1/setup/company", { legalName: "X" });
    check("a non-admin cannot write", r.status === 403, r.text);
    r = await call("Unverified", "GET", "/api/v1/setup/status");
    check("someone with no company has no checklist", r.status === 403, r.text);

    // 1. Company ------------------------------------------------------------
    const company = { legalName: "Escuela Kemper Urgate, S.A. de C.V.", rfc: "EKU9003173C9", taxRegime: "601", postalCode: "06300", street: "Av. Reforma 100", neighborhood: "Guerrero", phone: "5555551234", billingEmail: "facturas@example.com", tradeName: "Kemper", website: "https://example.com" };
    r = await call("Owner", "POST", "/api/v1/setup/company", { ...company, rfc: "AAA010101AAA" });
    check("the RFC cannot be rewritten", r.status === 422, r.text);
    r = await call("Owner", "POST", "/api/v1/setup/company", { ...company, taxRegime: "612" });
    check("a regime that does not fit the taxpayer is refused", r.status === 422, r.text);
    r = await call("Owner", "POST", "/api/v1/setup/company", { ...company, postalCode: "00000" });
    check("an unknown postal code is refused", r.status === 422, r.text);
    r = await call("Owner", "POST", "/api/v1/setup/company", { ...company, neighborhood: "Colonia Inventada" });
    check("a colonia outside the postal code is refused", r.status === 422, r.text);
    r = await call("Owner", "POST", "/api/v1/setup/company", { ...company, billingEmail: "nope" });
    check("a bad billing email is refused", r.status === 422, r.text);
    r = await call("Owner", "POST", "/api/v1/setup/company", company);
    check("valid fiscal data is saved and the legal name loses its corporate suffix", r.status === 200 && r.json.company.legalName === "ESCUELA KEMPER URGATE" && r.json.company.subdivision === "CMX" && r.json.company.city && r.json.steps.company.done === true, r.text);
    check("the billing email round-trips encrypted", r.json && r.json.company.billingEmail === "facturas@example.com");
    const rawEmail = sql("SELECT HEX(billing_email_ciphertext) AS c FROM tenant_fiscal_profiles WHERE legal_entity_id = ?", ids.entity);
    check("the billing email is not stored in clear", rawEmail.length === 1 && !Buffer.from(rawEmail[0].c, "hex").toString("utf8").includes("facturas@"));

    // 2. Locations ------------------------------------------------------------
    r = await call("Owner", "POST", "/api/v1/setup/locations", { kind: "warehouse", code: "BOD-01", name: "Bodega Centro", street: "Calle 1", postalCode: "06300", neighborhood: "Inventada" });
    check("a colonia outside the postal code is refused for a place", r.status === 422, r.text);
    r = await call("Owner", "POST", "/api/v1/setup/locations", { kind: "warehouse", code: "BOD-01", name: "Bodega Centro", street: "Calle 1", postalCode: "06300", neighborhood: "Guerrero" });
    check("a place is created with its expedition postal code", r.status === 200 && r.json.locations.length === 1 && r.json.locations[0].postalCode === "06300" && r.json.locations[0].stateCode === "CMX" && r.json.steps.locations.done === true, r.text);
    const placeId = r.json && r.json.locations[0] && r.json.locations[0].id;
    r = await call("Owner", "POST", "/api/v1/setup/locations", { kind: "branch", code: "BOD-01", name: "Otra", street: "Calle 2", postalCode: "06300" });
    check("a duplicate place code is refused", r.status === 409, r.text);
    r = await call("Owner", "POST", "/api/v1/setup/locations", { id: placeId, name: "Bodega Centro 2", street: "Calle 9", postalCode: "06300", code: "HACK-99", kind: "branch" });
    check("a place can be edited but its code and type are fixed", r.status === 200 && r.json.locations[0].name === "Bodega Centro 2" && r.json.locations[0].code === "BOD-01" && r.json.locations[0].kind === "warehouse", r.text);
    r = await call("Owner", "POST", "/api/v1/setup/locations", { kind: "branch", code: "SUC-01", name: "Sucursal Norte", street: "Av. Norte 5", postalCode: "06300" });
    r = await call("Owner", "POST", "/api/v1/setup/locations", { id: r.json.locations.find((l) => l.code === "SUC-01").id, name: "Sucursal Norte", street: "Av. Norte 5", postalCode: "06300", active: false });
    check("a place can be deactivated", r.status === 200 && r.json.locations.find((l) => l.code === "SUC-01").active === false && r.json.steps.locations.params.count === 1, r.text);

    // 3. Invoicing readiness: switch the company to Buyniverse invoicing --------
    sql("UPDATE tenant_fiscal_profiles SET issuance_mode = 'buyniverse', connector_key = 'sw', status = 'credentials_required' WHERE legal_entity_id = ?", ids.entity);
    r = await call("Owner", "GET", "/api/v1/setup/status");
    check("invoicing steps appear when Buyniverse stamps", r.json.steps.csd.na === false && r.json.steps.series.done === false && r.json.steps.series.params.missing.length === 3 && r.json.steps.stamps.done === false, r.text);
    const fixtureDir = path.join(__dirname, "fixtures/sat-test-csd/EKU9003173C9");
    const pem = fs.readFileSync(fixtureDir + ".cer.pem", "utf8").replace(/-----[^-]+-----|\s/g, "");
    const form = (cer, key, password) => { const f = new FormData(); f.append("companyId", ids.entity); f.append("privateKeyPassword", password); f.append("certificate", new Blob([cer]), "csd.cer"); f.append("privateKey", new Blob([key]), "csd.key"); return f; };
    r = await call("Owner", "POST", "/api/v1/onboarding/fiscal-credentials/verify", form(Buffer.from(pem, "base64"), fs.readFileSync(fixtureDir + ".key"), "wrong-password"), "fiscal-credential-v1");
    check("a wrong key password is reported, nothing stored", r.status === 200 && r.json.ok === false, r.text);
    r = await call("Owner", "POST", "/api/v1/onboarding/fiscal-credentials/verify", form(Buffer.from("not a certificate at all"), Buffer.from("not a key either!!"), "x"), "fiscal-credential-v1");
    check("garbage is reported, not stored", r.status === 200 && r.json.ok === false, r.text);
    r = await call("Owner", "POST", "/api/v1/onboarding/fiscal-credentials/verify", form(Buffer.from(pem, "base64"), fs.readFileSync(fixtureDir + ".key"), "12345678a"), "fiscal-credential-v1");
    check("the SAT test CSD verifies for its own RFC", r.status === 200 && r.json.ok === true && r.json.rfc === "EKU9003173C9" && /^\d{20}$/.test(r.json.number), r.text);
    check("verifying stores nothing", Number(sql("SELECT COUNT(*) AS n FROM tenant_fiscal_credentials WHERE legal_entity_id = ?", ids.entity)[0].n) === 0);
    sql("UPDATE tenant_legal_entities SET rfc = 'AAA010101AAA' WHERE id = ?", ids.entity);
    r = await call("Owner", "POST", "/api/v1/onboarding/fiscal-credentials/verify", form(Buffer.from(pem, "base64"), fs.readFileSync(fixtureDir + ".key"), "12345678a"), "fiscal-credential-v1");
    check("a CSD of another RFC does not verify", r.status === 200 && r.json.ok === false && /RFC/.test(r.json.error), r.text);
    sql("UPDATE tenant_legal_entities SET rfc = 'EKU9003173C9' WHERE id = ?", ids.entity);

    // 4. Payout account ------------------------------------------------------
    r = await call("Owner", "POST", "/api/v1/setup/payout", { holder: "Kemper", clabe: "012180015500000001" });
    check("a CLABE with a wrong check digit is refused", r.status === 422, r.text);
    const good = clabeFor("012180" + String(Math.floor(Math.random() * 1e11)).padStart(11, "0"));
    r = await call("Owner", "POST", "/api/v1/setup/payout", { holder: "Escuela Kemper Urgate", clabe: good });
    check("a valid CLABE is saved and only its last four digits are exposed", r.status === 200 && r.json.payout.last4 === good.slice(-4) && r.json.payout.bank === "BBVA México" && !r.text.includes(good), r.text);
    const rawClabe = sql("SELECT HEX(clabe_ciphertext) AS c FROM tenant_payout_accounts WHERE legal_entity_id = ?", ids.entity);
    check("the CLABE is encrypted at rest", rawClabe.length === 1 && !Buffer.from(rawClabe[0].c, "hex").toString("utf8").includes(good));

    // 5. Team and invitations ------------------------------------------------
    const inviteeEmail = people.find((p) => p.name === "Invitee").email;
    r = await call("Owner", "POST", `/api/v1/tenant-companies/${ids.entity}/invitations`, { email: inviteeEmail, role: "buyer", scope: "legal_entity" }, "tenant-context-v1");
    check("the owner invites a colleague", r.status === 200 && r.json.invitationId, r.text);
    const invitationId = r.json && r.json.invitationId;
    r = await call("Owner", "GET", "/api/v1/setup/status");
    check("the pending invitation is listed with a masked email", r.json.team.invitations.length === 1 && !r.text.includes(inviteeEmail) && /\*\*\*@/.test(r.json.team.invitations[0].email), r.text);
    r = await call("Stranger", "GET", "/api/v1/setup/invitations");
    check("another verified email sees nothing", r.status === 200 && r.json.invitations.length === 0, r.text);
    r = await call("Stranger", "POST", "/api/v1/setup/invitations/accept", { invitationId });
    check("another person cannot accept it", r.status === 404, r.text);
    r = await call("Unverified", "GET", "/api/v1/setup/invitations");
    check("an identity without a verified email sees nothing", r.status === 200 && r.json.invitations.length === 0, r.text);
    r = await call("Invitee", "GET", "/api/v1/setup/invitations");
    check("the invited person sees it", r.status === 200 && r.json.invitations.length === 1 && r.json.invitations[0].role === "buyer", r.text);
    r = await call("Invitee", "POST", "/api/v1/setup/invitations/accept", { invitationId });
    check("the invited person accepts", r.status === 200 && r.json.accepted === true, r.text);
    r = await call("Invitee", "POST", "/api/v1/setup/invitations/accept", { invitationId });
    check("an invitation cannot be used twice", r.status === 404 || r.status === 409, r.text);
    check("the membership exists with the invited role and scope", sql("SELECT role_key, scope_kind, HEX(legal_entity_id) IS NOT NULL AS scoped FROM tenant_memberships WHERE principal_id = ? AND tenant_id = ?", ids.Invitee, ids.tenant).some((m) => m.role_key === "buyer" && m.scope_kind === "legal_entity"));
    r = await call("Invitee", "GET", "/api/v1/setup/status");
    check("the new member reads the checklist but cannot manage", r.status === 200 && r.json.canManage === false, r.text);
    r = await call("Owner", "POST", `/api/v1/tenant-companies/${ids.entity}/invitations`, { email: "someone.else@example.com", role: "viewer", scope: "legal_entity" }, "tenant-context-v1");
    const second = r.json && r.json.invitationId;
    r = await call("Owner", "POST", "/api/v1/setup/invitations/revoke", { id: second });
    check("an invitation can be revoked", r.status === 200 && r.json.team.invitations.length === 0, r.text);

    // 6. Final audit ----------------------------------------------------------
    r = await call("Owner", "GET", "/api/v1/setup/status");
    const areas = Object.fromEntries(r.json.audit.map((a) => [a.area, a.items]));
    check("the audit is grouped by area", ["fiscal", "invoicing", "team", "payments"].every((area) => areas[area]), JSON.stringify(Object.keys(areas)));
    check("the audit marks what is missing for invoicing", areas.invoicing.some((i) => i.id === "csd" && i.state === "todo") && areas.invoicing.some((i) => i.id === "pac" && i.level === "platform"), r.text);
    check("the checklist is not ready while the CSD, series and stamps are missing", r.json.ready === false, r.text);
  } finally { server.kill(); }
  if (failures.length) { console.error(JSON.stringify({ companySetup: "FAILED", failures }, null, 2)); process.exit(1); }
  console.log(JSON.stringify({ companySetup: "verified" }, null, 2));
}
main().catch((error) => { console.error(error); process.exit(1); });
