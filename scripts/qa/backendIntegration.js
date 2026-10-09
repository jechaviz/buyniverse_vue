// Backend integration: runs the real PHP boundary (index.php as the router of
// `php -S`) against a disposable MariaDB with every migration applied, and
// drives supplier onboarding end to end. Opt-in, because it needs a database:
//   BUYNIVERSE_TEST_RUNTIME_CONFIG=/path/runtime-test.php node scripts/qa/backendIntegration.js
// The runtime file must point at a throwaway database (see ops/migrations).
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { spawn, execFileSync } = require("child_process");

const config = process.env.BUYNIVERSE_TEST_RUNTIME_CONFIG;
if (!config) { console.log(JSON.stringify({ backendIntegration: "skipped (set BUYNIVERSE_TEST_RUNTIME_CONFIG)" }, null, 2)); process.exit(0); }

const ROOT = path.resolve(__dirname, "../..");
const work = fs.mkdtempSync(path.join(os.tmpdir(), "bnv-it-"));
const sessions = path.join(work, "sessions"); fs.mkdirSync(sessions);
const port = 8820 + Math.floor(Math.random() * 60);
const base = `http://127.0.0.1:${port}`;
const php = (args, opts = {}) => execFileSync("php", ["-d", "display_startup_errors=0", ...args], { encoding: "utf8", env: { ...process.env, BUYNIVERSE_RUNTIME_CONFIG: config }, ...opts });
const failures = [];
let swToken = "";
const swEnvFile = process.env.BUYNIVERSE_SW_TEST_ENV_FILE;
if (swEnvFile && fs.existsSync(swEnvFile)) {
  const env = Object.fromEntries(fs.readFileSync(swEnvFile, "utf8").split(/\r?\n/).map((line) => /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]));
  if (env.SW_ENV === "test" && env.SW_TOKEN) swToken = env.SW_TOKEN;
}
const serverEnv = { ...process.env, BUYNIVERSE_RUNTIME_CONFIG: config, ...(swToken ? { BUYNIVERSE_TEST_SW_TOKEN: swToken } : {}) };
const check = (label, ok, detail = "") => { if (!ok) failures.push(`${label}${detail ? ": " + detail : ""}`); };

// A federated identity already in the session, exactly as identity_service
// leaves it after the provider callback.
const sessionScript = path.join(work, "session.php");
fs.writeFileSync(sessionScript, `<?php
session_save_path($argv[1]); session_name('buyniverse_workspace'); session_id($argv[2]);
session_start(); $_SESSION['workspace_csrf'] = $argv[3];
$_SESSION['buyniverse_identity'] = ['provider'=>'google_oidc', 'subject'=>$argv[4], 'displayName'=>$argv[5], 'email'=>null, 'emailVerified'=>false];
session_write_close();`);
function identity(name) {
  const id = crypto.randomBytes(16).toString("hex"), csrf = crypto.randomBytes(32).toString("hex");
  php([sessionScript, sessions, id, csrf, "it-" + crypto.randomBytes(6).toString("hex"), name]);
  return { cookie: `buyniverse_workspace=${id}`, csrf };
}
async function call(who, method, uri, body, kind = "onboarding-v1") {
  const headers = { Accept: "application/json", Cookie: who.cookie, Origin: base };
  let payload;
  if (body instanceof FormData) { payload = body; headers["X-Buyniverse-CSRF"] = who.csrf; headers["X-Buyniverse-Request"] = kind; }
  else if (body) { payload = JSON.stringify(body); headers["Content-Type"] = "application/json"; headers["X-Buyniverse-CSRF"] = who.csrf; headers["X-Buyniverse-Request"] = kind; }
  const response = await fetch(base + uri, { method, headers, body: payload });
  const text = await response.text();
  let json = null; try { json = JSON.parse(text); } catch (_) {}
  const set = response.headers.get("set-cookie"); if (set && /buyniverse_workspace=([^;]+)/.test(set)) who.cookie = `buyniverse_workspace=${RegExp.$1}`;
  if (json && typeof json.csrf === "string") who.csrf = json.csrf;
  return { status: response.status, json, text };
}
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const mxSupplier = (extra = {}) => ({
  accountKind: "business", marketplaceRoles: ["supplier"], workspaceName: "Kemper Suministros", countryCode: "MX", invoiceMode: "buyniverse",
  legalName: "ESCUELA KEMPER URGATE", taxIdentifier: "EKU9003173C9", taxRegime: "601", billingEmail: "facturas@example.com",
  subdivision: "CMX", address: { street: "Av. Reforma 100", city: "Ciudad de México", region: "Ciudad de México", postalCode: "06300" },
  locations: [], answers: {}, declarations: {}, ...extra,
});

async function main() {
  const server = spawn("php", ["-d", "display_startup_errors=0", "-d", `session.save_path=${sessions}`, "-S", `127.0.0.1:${port}`, "index.php"], { cwd: ROOT, env: serverEnv, stdio: "ignore" });
  try {
    for (let i = 0; i < 40; i++) { try { await fetch(base + "/api/v1/runtime"); break; } catch (_) { await pause(150); } }

    // 0. Production and demo stay apart: no URL hint, no /demo door, no demo flag.
    let r = await fetch(base + "/api/v1/runtime?demo=1", { headers: { Accept: "application/json" } }).then((x) => x.json());
    check("runtime ignores a client demo hint", r.mode === "production" && r.demoAvailable === true, JSON.stringify(r));
    check("/demo redirects to /demo/", (await fetch(base + "/demo", { redirect: "manual" })).status === 301);
    check("/demo/ serves the app", (await fetch(base + "/demo/")).status === 200);
    check("the demo has no API", (await fetch(base + "/demo/api/v1/runtime")).status === 404);
    check("the demo cannot write", (await fetch(base + "/demo/", { method: "POST" })).status === 405);
    check("the demo fixture is served inside /demo/", (await fetch(base + "/demo/app/data/demo.js")).status === 200);
    check("the demo fixture is refused outside /demo/", (await fetch(base + "/app/data/demo.js")).status === 404);
    check("the demo is not indexable", /noindex/.test((await fetch(base + "/demo/")).headers.get("x-robots-tag") || ""));
    check("production is not marked noindex", !(await fetch(base + "/")).headers.get("x-robots-tag"));

    // 1. A Mexican supplier: exact SAT postal code, REPSE when applicable, rules on the server.
    const mx = identity("Kemper");
    r = await call(mx, "GET", "/api/v1/onboarding");
    check("new identity is not enrolled", r.status === 200 && r.json.complete === false, r.text);
    await pause(900);
    r = await call(mx, "POST", "/api/v1/onboarding", mxSupplier({ address: { street: "Calle 60", city: "Mérida", region: "Yucatán", postalCode: "97000" } }));
    check("postal code outside the state is rejected", r.status === 422 && r.json.requirements[0].code === "postal_state_mismatch", r.text);
    await pause(900);
    r = await call(mx, "POST", "/api/v1/onboarding", mxSupplier({ answers: { specializedServices: true } }));
    check("specialized services without REPSE are rejected", r.status === 422 && r.json.requirements.some((item) => item.id === "mx.repse"), r.text);
    await pause(900);
    r = await call(mx, "POST", "/api/v1/onboarding", mxSupplier({ taxRegime: "605" }));
    check("non-invoicing regime is rejected", r.status === 422 && r.json.requirements.some((item) => item.code === "regime_not_supplier"), r.text);
    await pause(900);
    r = await call(mx, "POST", "/api/v1/onboarding", mxSupplier());
    check("valid Mexican supplier enrolls", r.status === 201 && r.json.needsFiscalCredentials === true && r.json.supplierStatus === "enrolled", r.text);
    const companyId = r.json && r.json.companyId;

    r = await call(mx, "GET", "/api/v1/onboarding/compliance");
    const pending = (r.json && r.json.evaluation && r.json.evaluation.requirements || []).filter((item) => item.status === "pending").map((item) => item.id);
    check("documents are pending after enrollment", r.status === 200 && pending.includes("mx.csf") && pending.includes("mx.opinion32d"), r.text);

    const today = new Date().toISOString().slice(0, 10);
    const pdf = new Blob([Buffer.from("%PDF-1.4\n" + "%".repeat(80) + "\n%%EOF\n")], { type: "application/pdf" });
    for (const requirementId of ["mx.csf", "mx.opinion32d"]) {
      await pause(1600);
      const form = new FormData(); form.append("companyId", companyId); form.append("requirementId", requirementId); form.append("issuedOn", today); form.append("document", pdf, requirementId + ".pdf");
      r = await call(mx, "POST", "/api/v1/onboarding/compliance-documents", form, "compliance-document-v1");
      check(`upload ${requirementId}`, r.status === 200, r.text);
    }
    check("supplier becomes formal with its documents", r.json && r.json.status === "formal", r.text);
    await pause(1600);
    const fake = new FormData(); fake.append("companyId", companyId); fake.append("requirementId", "mx.csf"); fake.append("issuedOn", today); fake.append("document", new Blob([Buffer.from("not a pdf".repeat(20))]), "x.pdf");
    r = await call(mx, "POST", "/api/v1/onboarding/compliance-documents", fake, "compliance-document-v1");
    check("non-PDF documents are rejected", r.status === 400, r.text);

    // CSD: a certificate for another RFC is refused; the right one is stored and waits for the PAC.
    const csdScript = path.join(work, "csd.php");
    fs.writeFileSync(csdScript, `<?php
$cnf = tempnam(sys_get_temp_dir(), 'bnv'); file_put_contents($cnf, "[ req ]\\ndistinguished_name = req_dn\\n[ req_dn ]\\n"); $o = ['config'=>$cnf];
$key = openssl_pkey_new(['private_key_bits'=>2048, 'private_key_type'=>OPENSSL_KEYTYPE_RSA] + $o);
$csr = openssl_csr_new(['commonName'=>'X', 'x500UniqueIdentifier'=>$argv[1] . ' / X', 'organizationalUnitName'=>'Matriz'], $key, ['digest_alg'=>'sha256'] + $o);
$cert = openssl_csr_sign($csr, null, $key, 365, ['digest_alg'=>'sha256'] + $o, 0, bin2hex('30001000000500003416'));
openssl_x509_export($cert, $pem); openssl_pkey_export($key, $keyPem, 'Pa55', $o);
file_put_contents($argv[2] . '.cer', base64_decode(preg_replace('/-----[^-]+-----|\\s/', '', $pem)));
file_put_contents($argv[2] . '.key', base64_decode(preg_replace('/-----[^-]+-----|\\s/', '', $keyPem)));`);
    const upload = async (rfc) => {
      const prefix = path.join(work, rfc); php([csdScript, rfc, prefix]);
      const form = new FormData(); form.append("companyId", companyId); form.append("privateKeyPassword", "Pa55");
      form.append("certificate", new Blob([fs.readFileSync(prefix + ".cer")]), "csd.cer"); form.append("privateKey", new Blob([fs.readFileSync(prefix + ".key")]), "csd.key");
      await pause(1700);
      return call(mx, "POST", "/api/v1/onboarding/fiscal-credentials", form, "fiscal-credential-v1");
    };
    r = await upload("URE180429TM6");
    check("CSD of another company is refused", r.status === 400 && /pertenece/.test(r.json && r.json.error || ""), r.text);
    // The attack the SAT chain check closes: a self-signed certificate "for"
    // this RFC would otherwise replace the real company's CSD in the shared
    // PAC account. It is refused before anything reaches the PAC.
    r = await upload("EKU9003173C9");
    check("self-signed CSD for the company RFC is refused", r.status === 400 && /firmado por el SAT/.test(r.json && r.json.error || ""), r.text);
    if (!swToken) {
      // Without a PAC, the SAT's public test CSD is stored and waits for it.
      // With a live PAC nothing is uploaded: the shared test account keeps its CSDs.
      const fixture = path.join(__dirname, "fixtures/sat-test-csd/EKU9003173C9");
      const pem = fs.readFileSync(fixture + ".cer.pem", "utf8").replace(/-----[^-]+-----|\s/g, "");
      const form = new FormData(); form.append("companyId", companyId); form.append("privateKeyPassword", "12345678a");
      form.append("certificate", new Blob([Buffer.from(pem, "base64")]), "csd.cer"); form.append("privateKey", new Blob([fs.readFileSync(fixture + ".key")]), "csd.key");
      await pause(1700);
      r = await call(mx, "POST", "/api/v1/onboarding/fiscal-credentials", form, "fiscal-credential-v1");
      check("SAT-signed CSD is secured and waits for the PAC", r.status === 200 && r.json.secured === true && r.json.pacPending === true && r.json.certificate.number === "30001000000500003416", r.text);
    }

    // CFDI issuance. The SW test account already holds the SAT test CSD of
    // EKU9003173C9, so the profile is marked as synced the way a real upload
    // would leave it, and every stamp below is a real stamp in SW's TEST
    // environment (no fiscal validity).
    const sql = path.join(work, "sql.php");
    fs.writeFileSync(sql, `<?php $c = require getenv('BUYNIVERSE_RUNTIME_CONFIG'); $p = new PDO($c['db_dsn'], $c['db_user'], $c['db_password']); $s = $p->prepare($argv[1]); $s->execute(array_slice($argv, 2)); echo json_encode($s->fetchAll(PDO::FETCH_ASSOC));`);
    const cfdi = (method, uri, body) => call(mx, method, "/api/v1/cfdi/" + uri, body, "cfdi-v1");
    r = await cfdi("GET", "status");
    check("CFDI status before the CSD is active", r.status === 200 && r.json.profileReady === false && r.json.permissions.manage === true, r.text);
    php([sql, "UPDATE tenant_fiscal_profiles SET status = 'ready', connector_key = 'sw', certificate_number = '30001000000500003416' WHERE legal_entity_id = ?", companyId]);
    if (swToken) {
      r = await cfdi("GET", "status");
      check("CFDI ready with SW", r.status === 200 && r.json.ready === true && r.json.pac === "sw", r.text);
      await pause(900);
      r = await cfdi("POST", "series", { docKind: "I", series: "BNV", ownFolio: true, startFolio: 100 });
      check("manager defines a series with its own folio", r.status === 200 && r.json.series.preview.I.series === "BNV" && r.json.series.preview.I.folio === "100", r.text);
      const receiver = { rfc: "URE180429TM6", name: "UNIVERSIDAD ROBOTICA ESPAÑOLA S.A. DE C.V.", zip: "86991", regime: "601", use: "G03" };
      const items = [{ prod: "43211503", unit: "H87", unitName: "Pieza", desc: "Laptop 14 pulgadas", qty: 2, value: 18450.5, objeto: "02", rate: "0.16" }];
      await pause(900);
      r = await cfdi("POST", "documents", { receiver: { ...receiver, rfc: "XAXX010101000" }, items, paymentMethod: "PPD" });
      check("generic receiver is refused", r.status === 400, r.text);
      await pause(900);
      r = await cfdi("POST", "documents", { receiver, items: [{ ...items[0], prod: "99999999" }], paymentMethod: "PPD" });
      check("unknown SAT product key is refused", r.status === 400 && /clave de producto/.test(r.json.error), r.text);
      await pause(900);
      r = await cfdi("POST", "documents", { receiver, items, paymentMethod: "PUE", paymentForm: "99" });
      check("PUE with form 99 is refused", r.status === 400, r.text);
      await pause(900);
      r = await cfdi("POST", "documents", { receiver, items, paymentMethod: "PPD" });
      check("income CFDI stamped by SW with series BNV-100", r.status === 201 && r.json.document.series === "BNV" && r.json.document.folio === "100" && /^[0-9A-F-]{36}$/.test(r.json.document.uuid), r.text);
      const invoice = r.json && r.json.document;
      await pause(900);
      r = await cfdi("POST", "documents", { receiver, items: [{ ...items[0], qty: 1 }], paymentMethod: "PUE", paymentForm: "03" });
      check("next folio is 101", r.status === 201 && r.json.document.folio === "101", r.text);
      const second = r.json && r.json.document;
      await pause(900);
      r = await cfdi("POST", "documents", { receiver, items, paymentMethod: "PUE", paymentForm: "03", folio: "100" });
      check("a taken manual folio is refused", r.status === 409, r.text);
      await pause(900);
      r = await cfdi("POST", `documents/${invoice.uuid}/payments`, { amount: 10000, paymentForm: "03", paidAt: new Date().toISOString().slice(0, 10) });
      check("payment complement with first instalment and balance", r.status === 201 && r.json.document.type === "P" && r.json.document.instalment === 1 && Math.abs(r.json.document.balance - (invoice.total - 10000)) < 0.01, r.text);
      await pause(900);
      r = await cfdi("POST", `documents/${invoice.uuid}/credit-notes`, { amount: 1160, reason: "Descuento por volumen" });
      check("credit note related to the invoice", r.status === 201 && r.json.document.type === "E", r.text);
      r = await cfdi("GET", "documents");
      check("documents list: 2 income, 1 payment, 1 credit note", r.status === 200 && r.json.documents.filter((d) => d.type === "I").length === 2 && r.json.documents.some((d) => d.type === "P") && r.json.documents.some((d) => d.type === "E"), r.text);
      const download = await fetch(base + `/api/v1/cfdi/documents/${invoice.uuid}/xml`, { headers: { Cookie: mx.cookie } });
      const xml = await download.text();
      check("stamped XML downloads with its timbre", download.status === 200 && xml.includes("TimbreFiscalDigital") && xml.includes(invoice.uuid), xml.slice(0, 200));
      await pause(900);
      r = await cfdi("POST", `documents/${second.uuid}/cancel`, { motive: "02" });
      check("cancellation requested at SW", r.status === 200 && ["cancel_requested", "cancelled"].includes(r.json.document.status), r.text);
      const ledger = JSON.parse(php([sql, "SELECT COUNT(*) n FROM cfdi_stamp_ledger WHERE legal_entity_id = ?", companyId]));
      check("every stamp is in the ledger", Number(ledger[0].n) === 4, JSON.stringify(ledger));
    } else {
      r = await cfdi("POST", "documents", { receiver: {}, items: [] });
      check("issuance without a PAC answers 503", r.status === 503, r.text);
    }

    // 2. United States: county required where local taxes exist.
    const us = identity("Acme");
    await call(us, "GET", "/api/v1/onboarding");
    const usSupplier = (extra = {}) => ({ accountKind: "business", marketplaceRoles: ["supplier"], workspaceName: "Acme", countryCode: "US", invoiceMode: "external",
      legalName: "Acme Supply LLC", taxIdentifier: "12-3456789", billingEmail: "ap@example.com", subdivision: "CA",
      address: { street: "1 Market St", city: "San Francisco", region: "California", postalCode: "94105" }, locations: [], answers: { sellsTaxable: true }, declarations: { "us.salesTaxPermit": "SR KH 12-345678" }, ...extra });
    await pause(900);
    r = await call(us, "POST", "/api/v1/onboarding", usSupplier());
    check("California supplier without county is rejected", r.status === 422 && r.json.requirements.some((item) => item.id === "us.county"), r.text);
    await pause(900);
    r = await call(us, "POST", "/api/v1/onboarding", usSupplier({ county: "075", invoiceMode: "buyniverse" }));
    check("Buyniverse invoicing is refused outside Mexico", r.status === 400, r.text);
    await pause(900);
    r = await call(us, "POST", "/api/v1/onboarding", usSupplier({ county: "075" }));
    check("California supplier with county enrolls", r.status === 201 && r.json.supplierStatus === "enrolled", r.text);

    // 3. A person who only buys needs no tax identity.
    const buyer = identity("Lucía");
    await call(buyer, "GET", "/api/v1/onboarding");
    await pause(900);
    r = await call(buyer, "POST", "/api/v1/onboarding", { accountKind: "individual", marketplaceRoles: ["buyer"], workspaceName: "Lucía", countryCode: "MX", invoiceMode: "external", locations: [] });
    check("individual buyer enrolls without tax data", r.status === 201 && r.json.supplierStatus === null, r.text);

    // 4. Support centre: grounded guided answers and encrypted tickets.
    const guest = { cookie: "", csrf: "" };
    r = await call(guest, "GET", "/api/v1/support/status");
    check("support status without AI configured", r.status === 200 && r.json.ai === false, r.text);
    r = await call(guest, "POST", "/api/v1/support/assistant", { message: "mi certificado dice que es e.firma", locale: "es" }, "support-v1");
    check("assistant answers in guided mode from the right guide", r.status === 200 && r.json.mode === "guided" && r.json.articles[0] === "invoicing-csd", r.text);
    r = await call(guest, "POST", "/api/v1/support/tickets", { area: "invoicing", subject: "Mi CSD falla", message: "Al subir el CSD aparece un error." }, "support-v1");
    check("guest ticket without email is refused", r.status === 400, r.text);
    r = await call(guest, "POST", "/api/v1/support/tickets", { area: "invoicing", subject: "Mi CSD falla", message: "Al subir el CSD aparece un error.", email: "cliente@example.com", consent: true }, "support-v1");
    check("guest ticket is created with a reference", r.status === 201 && /^BNV-[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(r.json.reference || ""), r.text);
    r = await call(guest, "POST", "/api/v1/support/tickets", { area: "access", subject: "spam", message: "buy cheap things now", email: "x@example.com", consent: true, website: "http://spam" }, "support-v1");
    check("honeypot submissions get a decoy", r.status === 201, r.text);
    r = await call(guest, "POST", "/api/v1/support/assistant", { message: "hola" }, "tenant-context-v1");
    check("assistant requires its request header", r.status === 403, r.text);
    r = await call(mx, "POST", "/api/v1/support/tickets", { area: "suppliers", subject: "Documento 32-D", message: "No sé qué fecha poner en la 32-D.", severity: "low" }, "support-v1");
    check("signed-in ticket needs no email", r.status === 201, r.text);
    r = await call(mx, "GET", "/api/v1/support/tickets");
    check("signed-in user lists own tickets, decrypted", r.status === 200 && r.json.tickets.some((item) => item.subject === "Documento 32-D" && item.status === "open"), r.text);
    // The team answers from the CLI desk; the requester reads it in My tickets.
    const reference = r.json.tickets.find((item) => item.subject === "Documento 32-D").reference;
    php([path.join(ROOT, "support_admin.php"), "reply", reference, "Usa la fecha de emisión que aparece en la opinión."]);
    r = await call(mx, "GET", "/api/v1/support/tickets");
    const answered = r.json.tickets.find((item) => item.reference === reference);
    check("agent reply reaches the requester", answered && answered.status === "waiting_customer" && answered.lastReply && /fecha de emisión/.test(answered.lastReply.text), r.text);
  } finally {
    server.kill();
  }
}

main().then(() => {
  fs.rmSync(work, { recursive: true, force: true });
  if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
  console.log(JSON.stringify({ backendIntegration: "verified" }, null, 2));
}).catch((error) => { console.error(failures.join("\n")); console.error(error); process.exit(1); });
