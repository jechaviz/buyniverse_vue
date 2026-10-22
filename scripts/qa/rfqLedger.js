// Sealed-bid RFQ ledger: runs the real PHP boundary (index.php under `php -S`)
// against a disposable MariaDB/MySQL with every migration applied and checks
// that the server, not the browser, decides whether a bid is valid. Opt-in,
// because it needs a database:
//   BUYNIVERSE_TEST_RUNTIME_CONFIG=/path/runtime-test.php node scripts/qa/rfqLedger.js
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { spawn, execFileSync } = require("child_process");

const config = process.env.BUYNIVERSE_TEST_RUNTIME_CONFIG;
if (!config) { console.log(JSON.stringify({ rfqLedger: "skipped (set BUYNIVERSE_TEST_RUNTIME_CONFIG)" }, null, 2)); process.exit(0); }

const ROOT = path.resolve(__dirname, "../..");
const work = fs.mkdtempSync(path.join(os.tmpdir(), "bnv-rfq-"));
const sessions = path.join(work, "sessions"); fs.mkdirSync(sessions);
const port = 8960 + Math.floor(Math.random() * 30);
const base = `http://127.0.0.1:${port}`;
const php = (args) => execFileSync("php", ["-d", "display_startup_errors=0", ...args], { encoding: "utf8", env: { ...process.env, BUYNIVERSE_RUNTIME_CONFIG: config }, stdio: ["ignore", "pipe", "ignore"] });
const failures = [];
const check = (label, ok, detail = "") => { if (!ok) failures.push(`${label}${detail ? ": " + detail : ""}`); };
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// One tenant with an organizer and three suppliers, plus an outsider in no
// tenant at all. Principals are keyed by the same HMAC the server uses.
const fixtureScript = path.join(work, "fixture.php");
fs.writeFileSync(fixtureScript, `<?php
$c = require getenv('BUYNIVERSE_RUNTIME_CONFIG'); $key = base64_decode($c['state_encryption_key'], true);
$pdo = new PDO($c['db_dsn'], $c['db_user'], $c['db_password'], [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$uuid = static function () { $b = random_bytes(16); $b[6] = chr((ord($b[6]) & 0x0f) | 0x40); $b[8] = chr((ord($b[8]) & 0x3f) | 0x80); return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4)); };
$people = json_decode($argv[1], true); $tenant = $uuid(); $entity = $uuid(); $out = [];
$pdo->prepare('INSERT INTO tenant_accounts (id, display_name, account_kind) VALUES (?, ?, "business")')->execute([$tenant, 'Ledger test']);
$pdo->prepare('INSERT INTO tenant_legal_entities (id, tenant_id, legal_name, rfc, rfc_hash, country_code) VALUES (?, ?, ?, ?, ?, "MX")')->execute([$entity, $tenant, 'LEDGER SA', 'XAXX010101000', hash('sha256', $tenant)]);
foreach ($people as $p) {
  $id = $uuid(); $out[$p['name']] = $id;
  $pdo->prepare('INSERT INTO tenant_principals (id, provider, subject_hash, display_name) VALUES (?, "google_oidc", ?, ?)')->execute([$id, hash_hmac('sha256', $p['subject'], $key), $p['name']]);
  if ($p['role'] !== 'none') $pdo->prepare('INSERT INTO tenant_memberships (id, tenant_id, principal_id, role_key, scope_kind) VALUES (?, ?, ?, ?, "tenant")')->execute([$uuid(), $tenant, $id, $p['role']]);
}
echo json_encode($out);`);
const sessionScript = path.join(work, "session.php");
fs.writeFileSync(sessionScript, `<?php
session_save_path($argv[1]); session_name('buyniverse_workspace'); session_id($argv[2]);
session_start(); $_SESSION['workspace_csrf'] = $argv[3];
$_SESSION['buyniverse_identity'] = ['provider'=>'google_oidc', 'subject'=>$argv[4], 'displayName'=>$argv[5], 'email'=>null, 'emailVerified'=>false];
session_write_close();`);

const people = ["Organizer", "Alfa", "Beta", "Gamma", "Outsider"].map((name) => ({ name, subject: "it-" + crypto.randomBytes(6).toString("hex"), role: name === "Organizer" ? "owner" : name === "Outsider" ? "none" : "supplier" }));
const sessionOf = {};
for (const person of people) {
  const id = crypto.randomBytes(16).toString("hex"), csrf = crypto.randomBytes(32).toString("hex");
  php([sessionScript, sessions, id, csrf, person.subject, person.name]);
  sessionOf[person.name] = { cookie: `buyniverse_workspace=${id}`, csrf };
}
const ids = JSON.parse(php([fixtureScript, JSON.stringify(people)]));

const sqlScript = path.join(work, "sql.php");
fs.writeFileSync(sqlScript, `<?php
$c = require getenv('BUYNIVERSE_RUNTIME_CONFIG'); $pdo = new PDO($c['db_dsn'], $c['db_user'], $c['db_password'], [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$s = $pdo->prepare($argv[1]); try { $s->execute(array_slice($argv, 2)); echo json_encode($s->columnCount() ? $s->fetchAll(PDO::FETCH_ASSOC) : ['ok' => true]); } catch (Throwable $e) { echo json_encode(['error' => $e->getMessage()]); }`);
const sql = (query, ...args) => JSON.parse(php([sqlScript, query, ...args]));
const commerce = (who, method, uri, body) => call(who, method, uri, body, "/api/v1/commerce");
const closeRoom = (auctionRef) => sql("UPDATE auction_live_rooms SET closes_at = (CURRENT_TIMESTAMP - INTERVAL 1 MINUTE) WHERE auction_ref = ?", auctionRef);

async function call(who, method, uri, body, prefix = "/api/v1/rfq") {
  await pause(340); // the channel rate-limits a session to one write per 300 ms
  const s = sessionOf[who];
  const headers = { Accept: "application/json", Cookie: s.cookie, Origin: base };
  let payload;
  if (body) { payload = JSON.stringify(body); headers["Content-Type"] = "application/json"; }
  if (method !== "GET") { headers["X-Buyniverse-CSRF"] = s.csrf; headers["X-Buyniverse-Request"] = prefix.endsWith("/rfq") ? "rfq-v1" : "auction-realtime-v1"; }
  const response = await fetch(base + prefix + uri, { method, headers, body: payload });
  const text = await response.text(); let json = null; try { json = JSON.parse(text); } catch (_) {}
  const set = response.headers.get("set-cookie"); if (set && /buyniverse_workspace=([^;]+)/.test(set)) s.cookie = `buyniverse_workspace=${RegExp.$1}`;
  if (json && typeof json.csrf === "string") s.csrf = json.csrf;
  return { status: response.status, json, text };
}
const settlementOf = (r) => ((r.json || {}).settlement || {});
const key = () => "q-" + crypto.randomBytes(8).toString("hex");
const closeEarly = (who, ref) => call(who, "POST", `/events/${ref}/close`, {});

async function main() {
  const server = spawn("php", ["-d", "display_startup_errors=0", "-d", `session.save_path=${sessions}`, "-S", `127.0.0.1:${port}`, "index.php"], { cwd: ROOT, env: { ...process.env, BUYNIVERSE_RUNTIME_CONFIG: config }, stdio: "ignore" });
  try {
    for (let i = 0; i < 40; i++) { try { await fetch(base + "/api/v1/runtime"); break; } catch (_) { await pause(150); } }
    sql("UPDATE commerce_terms SET mode = 'informative' WHERE scope = 'default'");
    const suppliers = [ids.Alfa, ids.Beta, ids.Gamma];
    const ref = "rfq-" + crypto.randomBytes(4).toString("hex");
    const soon = new Date(Date.now() + 5 * 86400e3).toISOString();

    // ---- opening
    let r = await call("Organizer", "POST", "/events", { eventRef: ref, participantPrincipalIds: suppliers, closesAt: soon, budget: "100000", currency: "MXN" });
    check("the organiser opens an RFQ with a budget", r.status === 200 && r.json.created === true, r.text);
    r = await call("Organizer", "POST", "/events", { eventRef: ref, participantPrincipalIds: suppliers, closesAt: soon, budget: "1" });
    check("opening it again returns the same RFQ and keeps the first budget", r.status === 200 && r.json.created === false, r.text);
    r = await call("Organizer", "POST", "/events", { eventRef: "x-" + ref, participantPrincipalIds: [ids.Alfa], budget: "10" });
    check("an RFQ needs at least two suppliers", r.status === 400, r.text);
    r = await call("Organizer", "POST", "/events", { eventRef: "y-" + ref, participantPrincipalIds: suppliers });
    check("an RFQ needs a budget", r.status === 400, r.text);
    r = await call("Alfa", "POST", "/events", { eventRef: "z-" + ref, participantPrincipalIds: suppliers, budget: "10" });
    check("a supplier cannot open an RFQ", r.status === 403, r.text);
    check("the budget is frozen once written", (() => { sql("UPDATE rfq_events SET budget_cents = 1 WHERE event_ref = ?", ref); return Number(sql("SELECT budget_cents AS b FROM rfq_events WHERE event_ref = ?", ref)[0].b) === 10000000; })());

    // ---- quotes: sealed, append-only, one latest per supplier
    r = await call("Alfa", "POST", `/events/${ref}/quotes`, { amount: "95000", leadDays: 10, terms: "Net 30", quoteKey: key() });
    check("a supplier submits a quote", r.status === 200 && r.json.accepted === true && r.json.myQuote.amountCents === 9500000, r.text);
    const dup = key();
    r = await call("Beta", "POST", `/events/${ref}/quotes`, { amount: "120000", leadDays: 7, terms: "Net 30", quoteKey: dup });
    check("a quote above the budget is allowed (that is what shows the market)", r.status === 200 && r.json.myQuote.amountCents === 12000000, r.text);
    r = await call("Beta", "POST", `/events/${ref}/quotes`, { amount: "120000", leadDays: 7, terms: "Net 30", quoteKey: dup });
    check("a retried quote key is idempotent", r.status === 200 && r.json.duplicate === true, r.text);
    r = await call("Gamma", "POST", `/events/${ref}/quotes`, { amount: "130000", leadDays: 5, terms: "Net 15", quoteKey: key() });
    check("a third supplier quotes", r.status === 200, r.text);
    r = await call("Gamma", "POST", `/events/${ref}/quotes`, { amount: "125000", leadDays: 5, terms: "Net 15", quoteKey: key() });
    check("a supplier may revise its quote while the RFQ is open", r.status === 200 && r.json.myQuote.amountCents === 12500000, r.text);
    r = await call("Alfa", "POST", `/events/${ref}/quotes`, { amount: "0", leadDays: 10, terms: "Net 30", quoteKey: key() });
    check("a zero quote is refused", r.status === 400, r.text);
    r = await call("Alfa", "POST", `/events/${ref}/quotes`, { amount: "90000", leadDays: 0, terms: "Net 30", quoteKey: key() });
    check("lead days are required", r.status === 400, r.text);
    r = await call("Organizer", "POST", `/events/${ref}/quotes`, { amount: "90000", leadDays: 3, terms: "x", quoteKey: key() });
    check("the organiser cannot quote", r.status === 403, r.text);
    r = await call("Outsider", "POST", `/events/${ref}/quotes`, { amount: "90000", leadDays: 3, terms: "x", quoteKey: key() });
    check("someone outside the RFQ cannot quote", [403, 404].includes(r.status), r.text);

    r = await call("Organizer", "GET", `/events/${ref}/quotes`);
    check("the organiser cannot read quotes before the RFQ closes", r.status === 409, r.text);
    r = await call("Organizer", "GET", `/events/${ref}/state`);
    check("the organiser sees how many quotes, and the budget", r.status === 200 && r.json.quoteCount === 3 && r.json.budgetCents === 10000000 && !("quotes" in r.json), r.text);
    r = await call("Alfa", "GET", `/events/${ref}/state`);
    check("a supplier sees only its own quote and never the budget", r.status === 200 && r.json.myQuote.amountCents === 9500000 && !("budgetCents" in r.json) && !("quoteCount" in r.json), r.text);
    r = await call("Beta", "GET", `/events/${ref}/quotes`);
    check("a supplier reads only its own quote", r.status === 200 && r.json.quotes.length === 1 && r.json.quotes[0].amountCents === 12000000, r.text);
    check("quotes cannot be updated or deleted", sql("UPDATE rfq_quotes SET amount_cents = 1").error !== undefined && sql("DELETE FROM rfq_quotes").error !== undefined);

    // ---- close and read
    r = await call("Alfa", "POST", `/events/${ref}/close`, {});
    check("a supplier cannot close the RFQ", r.status === 403, r.text);
    r = await call("Organizer", "POST", `/events/${ref}/award`, { supplierPrincipalId: ids.Alfa });
    check("an open RFQ cannot be awarded", r.status === 409, r.text);
    r = await closeEarly("Organizer", ref);
    check("the organiser closes the RFQ", r.status === 200 && r.json.status === "closed", r.text);
    r = await call("Alfa", "POST", `/events/${ref}/quotes`, { amount: "50000", leadDays: 3, terms: "x", quoteKey: key() });
    check("a closed RFQ takes no more quotes", r.status === 409, r.text);
    r = await call("Organizer", "GET", `/events/${ref}/quotes`);
    check("once closed the organiser reads every latest quote, cheapest first, with names", r.status === 200 && r.json.quotes.length === 3 && r.json.quotes[0].amountCents === 9500000 && r.json.quotes[2].amountCents === 12500000 && r.json.quotes[0].supplierName === "Alfa", r.text);

    // ---- award: the baseline is the higher of the budget (100,000) and the market median (120,000)
    r = await call("Alfa", "POST", `/events/${ref}/award`, { supplierPrincipalId: ids.Alfa });
    check("a supplier cannot award", r.status === 403, r.text);
    r = await call("Organizer", "POST", `/events/${ref}/award`, { supplierPrincipalId: ids.Outsider });
    check("only a supplier with a quote can win", r.status === 409, r.text);
    r = await call("Organizer", "POST", `/events/${ref}/award`, { supplierPrincipalId: ids.Alfa });
    const s1 = settlementOf(r);
    // saving 120,000 - 95,000 = 25,000; 25% = 6,250; floor 0.4% of 95,000 = 380 (min 3,000); cap 8% = 7,600 -> the saving decides
    check("the award settles against the market baseline, not the lower budget", r.status === 200 && r.json.created === true && s1.baselineCents === 12000000 && s1.awardedCents === 9500000 && s1.savingCents === 2500000 && s1.feeCents === 625000 && s1.basis === "saving" && s1.kind === "rfq" && s1.baselineSource === "market", r.text);
    r = await call("Organizer", "POST", `/events/${ref}/award`, { supplierPrincipalId: ids.Alfa });
    check("awarding twice returns the same settlement", r.status === 200 && r.json.created === false && settlementOf(r).id === s1.id, r.text);
    r = await call("Organizer", "POST", `/events/${ref}/award`, { supplierPrincipalId: ids.Beta });
    check("an awarded RFQ cannot go to someone else", r.status === 409, r.text);
    const meta = sql("SELECT kind, baseline_source, quotes_counted, market_cents FROM award_settlement_meta WHERE settlement_id = ?", s1.id)[0] || {};
    check("the basis is recorded apart from the amounts", meta.kind === "rfq" && meta.baseline_source === "market" && Number(meta.quotes_counted) === 3 && Number(meta.market_cents) === 12000000, JSON.stringify(meta));
    check("the amounts of the settlement cannot be rewritten", (() => { sql("UPDATE award_settlements SET fee_cents = 1, baseline_cents = 1 WHERE id = ?", s1.id); const row = sql("SELECT fee_cents, baseline_cents FROM award_settlements WHERE id = ?", s1.id)[0]; return Number(row.fee_cents) === 625000 && Number(row.baseline_cents) === 12000000; })());
    r = await commerce("Organizer", "GET", "/settlements");
    check("the company lists the RFQ settlement with its kind", r.status === 200 && r.json.settlements.some((x) => x.id === s1.id && x.kind === "rfq" && x.baselineSource === "market"), r.text);

    // ---- a low declared budget cannot hide the saving; a high one does not inflate the market
    const low = "low-" + crypto.randomBytes(4).toString("hex");
    await call("Organizer", "POST", "/events", { eventRef: low, participantPrincipalIds: suppliers, closesAt: soon, budget: "50000" });
    await call("Alfa", "POST", `/events/${low}/quotes`, { amount: "90000", leadDays: 3, terms: "x", quoteKey: key() });
    await call("Beta", "POST", `/events/${low}/quotes`, { amount: "110000", leadDays: 3, terms: "x", quoteKey: key() });
    await closeEarly("Organizer", low);
    r = await call("Organizer", "POST", `/events/${low}/award`, { supplierPrincipalId: ids.Alfa });
    // budget 50,000 would show no saving; the market median of 90,000 and 110,000 is 100,000 -> saving 10,000
    check("a budget below every quote does not hide the saving", r.status === 200 && settlementOf(r).baselineCents === 10000000 && settlementOf(r).savingCents === 1000000 && settlementOf(r).baselineSource === "market", r.text);

    const high = "high-" + crypto.randomBytes(4).toString("hex");
    await call("Organizer", "POST", "/events", { eventRef: high, participantPrincipalIds: suppliers, closesAt: soon, budget: "200000" });
    await call("Alfa", "POST", `/events/${high}/quotes`, { amount: "150000", leadDays: 3, terms: "x", quoteKey: key() });
    await call("Beta", "POST", `/events/${high}/quotes`, { amount: "170000", leadDays: 3, terms: "x", quoteKey: key() });
    await closeEarly("Organizer", high);
    r = await call("Organizer", "POST", `/events/${high}/award`, { supplierPrincipalId: ids.Alfa });
    check("a budget above the market is the baseline (the buyer's own figure)", r.status === 200 && settlementOf(r).baselineCents === 20000000 && settlementOf(r).baselineSource === "budget", r.text);

    // ---- a single quote has no market: only the budget counts
    const one = "one-" + crypto.randomBytes(4).toString("hex");
    await call("Organizer", "POST", "/events", { eventRef: one, participantPrincipalIds: suppliers, closesAt: soon, budget: "80000" });
    await call("Alfa", "POST", `/events/${one}/quotes`, { amount: "70000", leadDays: 3, terms: "x", quoteKey: key() });
    await closeEarly("Organizer", one);
    r = await call("Organizer", "POST", `/events/${one}/award`, { supplierPrincipalId: ids.Alfa });
    check("with one quote there is no market and the budget is the baseline", r.status === 200 && settlementOf(r).baselineCents === 8000000 && settlementOf(r).baselineSource === "budget", r.text);

    // ---- proposals -> approval -> live bidding round (the contest) -> settlement against the market
    const flow = "flow-" + crypto.randomBytes(4).toString("hex");
    await call("Organizer", "POST", "/events", { eventRef: flow, participantPrincipalIds: suppliers, closesAt: soon, budget: "100000", currency: "MXN" });
    const bidApi = (who, method, uri, body) => call(who, method, uri, body, "/api/v1/auction-realtime");
    r = await call("Organizer", "POST", `/events/${flow}/approve`, { supplierPrincipalId: ids.Alfa });
    check("a supplier without a proposal cannot be approved", r.status === 409, r.text);
    for (const [who, amount] of [["Alfa", "95000"], ["Beta", "120000"], ["Gamma", "125000"]]) await call(who, "POST", `/events/${flow}/quotes`, { amount, leadDays: 5, terms: "Net 30", quoteKey: key() });
    r = await call("Alfa", "POST", `/events/${flow}/approve`, { supplierPrincipalId: ids.Alfa });
    check("a supplier cannot approve proposals", r.status === 403, r.text);
    r = await call("Organizer", "POST", `/events/${flow}/approve`, { supplierPrincipalId: ids.Alfa });
    check("the organiser approves a proposal", r.status === 200 && r.json.approved === true && r.json.approvedCount === 1, r.text);
    r = await call("Organizer", "POST", `/events/${flow}/contest`, {});
    check("a bidding round needs at least two approved proposals", r.status === 409, r.text);
    await call("Organizer", "POST", `/events/${flow}/approve`, { supplierPrincipalId: ids.Gamma });
    r = await call("Organizer", "POST", `/events/${flow}/approve`, { supplierPrincipalId: ids.Gamma, approved: false });
    check("an approval can be withdrawn before the round starts", r.status === 200 && r.json.approvedCount === 1, r.text);
    r = await call("Organizer", "POST", `/events/${flow}/approve`, { supplierPrincipalId: ids.Beta });
    check("two approved proposals", r.status === 200 && r.json.approvedCount === 2, r.text);
    r = await call("Beta", "GET", `/events/${flow}/state`);
    check("a supplier learns whether its proposal was approved", r.status === 200 && r.json.approved === true, r.text);
    r = await call("Gamma", "GET", `/events/${flow}/state`);
    check("a supplier that was not approved is told so", r.status === 200 && r.json.approved === false && !("contestRef" in r.json), r.text);

    r = await call("Organizer", "POST", `/events/${flow}/contest`, { closesAt: soon });
    // the round opens at the best approved proposal (Alfa, 95,000); the default step is 0.5% of it
    check("the bidding round opens at the best approved proposal", r.status === 200 && r.json.startCents === 9500000 && r.json.entrants === 2 && r.json.auctionRef === `${flow}-live` && r.json.minStepCents === 47500, r.text);
    r = await call("Organizer", "POST", `/events/${flow}/contest`, {});
    check("the round cannot be started twice", r.status === 409, r.text);
    r = await call("Gamma", "POST", `/events/${flow}/quotes`, { amount: "100000", leadDays: 5, terms: "x", quoteKey: key() });
    check("proposals close when the round starts", r.status === 409, r.text);
    r = await call("Organizer", "POST", `/events/${flow}/award`, { supplierPrincipalId: ids.Alfa });
    check("the bidding round, not a direct award, decides the winner", r.status === 409, r.text);
    r = await call("Alfa", "GET", `/events/${flow}/state`);
    check("approved suppliers get the reference of the live round", r.status === 200 && r.json.contestRef === `${flow}-live` && r.json.status === "contest", r.text);

    r = await bidApi("Alfa", "GET", `/rooms/${flow}-live/state`);
    check("the first proposal is the opening bid: Alfa leads at 95,000", r.status === 200 && r.json.bestAmount === "95000.00" && r.json.leading === true && r.json.bidCount === 1, r.text);
    r = await bidApi("Gamma", "POST", `/rooms/${flow}-live/bids`, { amount: "90000", bidKey: key() });
    check("a supplier that was not approved cannot bid", [403, 404].includes(r.status), r.text);
    r = await bidApi("Beta", "POST", `/rooms/${flow}-live/bids`, { amount: "94800", bidKey: key() });
    check("a bid must beat the best by the step", r.status === 422, r.text);
    r = await bidApi("Beta", "POST", `/rooms/${flow}-live/bids`, { amount: "94000", bidKey: key() });
    check("an approved supplier lowers the price and takes the lead", r.status === 200 && r.json.leading === true && r.json.bestAmount === "94000.00", r.text);

    r = await commerce("Organizer", "POST", "/settle", { auctionRef: `${flow}-live` });
    check("the round cannot be settled while it runs", r.status === 409, r.text);
    closeRoom(`${flow}-live`);
    r = await commerce("Organizer", "POST", "/settle", { auctionRef: `${flow}-live` });
    const sc = settlementOf(r);
    // baseline = the market: the median of the three proposals (95,000, 120,000, 125,000) is 120,000, above the budget (100,000) and the start (95,000)
    // saving 120,000 - 94,000 = 26,000; 25% = 6,500; floor 3,000; cap 8% of 94,000 = 7,520 -> the saving decides
    check("the contest settles against the market of the whole RFQ", r.status === 200 && sc.baselineCents === 12000000 && sc.awardedCents === 9400000 && sc.savingCents === 2600000 && sc.feeCents === 650000 && sc.basis === "saving" && sc.baselineSource === "market", r.text);
    const metaC = sql("SELECT baseline_source, quotes_counted, market_cents FROM award_settlement_meta WHERE settlement_id = ?", sc.id)[0] || {};
    check("the basis records the proposals counted and the market", metaC.baseline_source === "market" && Number(metaC.quotes_counted) === 3 && Number(metaC.market_cents) === 12000000, JSON.stringify(metaC));
    check("the winner is the leader of the round, and the RFQ is awarded to them", sql("SELECT status, awarded_principal_id FROM rfq_events WHERE event_ref = ?", flow).some((row) => row.status === "awarded" && row.awarded_principal_id === ids.Beta));
    r = await call("Organizer", "POST", `/events/${flow}/award`, { supplierPrincipalId: ids.Alfa });
    check("an RFQ settled through its round cannot be awarded again", r.status === 409, r.text);
    check("the market of a contest cannot be rewritten", (() => { sql("UPDATE auction_live_rfq SET market_cents = 1"); return Number((sql("SELECT market_cents AS m FROM auction_live_rfq ORDER BY created_at DESC LIMIT 1")[0] || {}).m) !== 1; })());

    // ---- charging mode makes it a receivable
    sql("UPDATE commerce_terms SET mode = 'charging' WHERE scope = 'default'");
    const paid = "paid-" + crypto.randomBytes(4).toString("hex");
    await call("Organizer", "POST", "/events", { eventRef: paid, participantPrincipalIds: suppliers, closesAt: soon, budget: "100000" });
    await call("Alfa", "POST", `/events/${paid}/quotes`, { amount: "80000", leadDays: 3, terms: "x", quoteKey: key() });
    await closeEarly("Organizer", paid);
    r = await call("Organizer", "POST", `/events/${paid}/award`, { supplierPrincipalId: ids.Alfa });
    check("in charging mode an RFQ settlement is pending", r.status === 200 && settlementOf(r).status === "pending", r.text);
    sql("UPDATE commerce_terms SET mode = 'informative' WHERE scope = 'default'");
  } finally { server.kill(); }
  if (failures.length) { console.error(JSON.stringify({ rfqLedger: "FAILED", failures }, null, 2)); process.exit(1); }
  console.log(JSON.stringify({ rfqLedger: "verified" }, null, 2));
}
main().catch((error) => { console.error(error); process.exit(1); });
