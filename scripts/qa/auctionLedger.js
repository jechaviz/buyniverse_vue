// Auction bid ledger: runs the real PHP boundary (index.php under `php -S`)
// against a disposable MariaDB/MySQL with every migration applied and checks
// that the server, not the browser, decides whether a bid is valid. Opt-in,
// because it needs a database:
//   BUYNIVERSE_TEST_RUNTIME_CONFIG=/path/runtime-test.php node scripts/qa/auctionLedger.js
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { spawn, execFileSync } = require("child_process");

const config = process.env.BUYNIVERSE_TEST_RUNTIME_CONFIG;
if (!config) { console.log(JSON.stringify({ auctionLedger: "skipped (set BUYNIVERSE_TEST_RUNTIME_CONFIG)" }, null, 2)); process.exit(0); }

const ROOT = path.resolve(__dirname, "../..");
const work = fs.mkdtempSync(path.join(os.tmpdir(), "bnv-ledger-"));
const sessions = path.join(work, "sessions"); fs.mkdirSync(sessions);
const port = 8900 + Math.floor(Math.random() * 60);
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

async function call(who, method, uri, body) {
  await pause(340); // the channel rate-limits a session to one write per 300 ms
  const s = sessionOf[who];
  const headers = { Accept: "application/json", Cookie: s.cookie, Origin: base };
  let payload;
  if (body) { payload = JSON.stringify(body); headers["Content-Type"] = "application/json"; }
  if (method !== "GET") { headers["X-Buyniverse-CSRF"] = s.csrf; headers["X-Buyniverse-Request"] = "auction-realtime-v1"; }
  const response = await fetch(base + "/api/v1/auction-realtime" + uri, { method, headers, body: payload });
  const text = await response.text(); let json = null; try { json = JSON.parse(text); } catch (_) {}
  const set = response.headers.get("set-cookie"); if (set && /buyniverse_workspace=([^;]+)/.test(set)) s.cookie = `buyniverse_workspace=${RegExp.$1}`;
  if (json && typeof json.csrf === "string") s.csrf = json.csrf;
  return { status: response.status, json, text };
}
const key = () => "bid-" + crypto.randomBytes(8).toString("hex");

async function main() {
  const server = spawn("php", ["-d", "display_startup_errors=0", "-d", `session.save_path=${sessions}`, "-S", `127.0.0.1:${port}`, "index.php"], { cwd: ROOT, env: { ...process.env, BUYNIVERSE_RUNTIME_CONFIG: config }, stdio: "ignore" });
  try {
    for (let i = 0; i < 40; i++) { try { await fetch(base + "/api/v1/runtime"); break; } catch (_) { await pause(150); } }
    const bidders = [ids.Alfa, ids.Beta, ids.Gamma];
    const ref = "ledger-" + crypto.randomBytes(4).toString("hex");
    const soon = new Date(Date.now() + 2 * 3600e3).toISOString();

    let r = await call("Organizer", "POST", "/rooms", { auctionRef: ref, participantPrincipalIds: bidders, closesAt: soon, startAmount: "10000.00", minStep: 100, floor: "6000", currency: "MXN" });
    check("organizer opens a room with terms", r.status === 200 && r.json.created === true, r.text);
    r = await call("Organizer", "POST", "/rooms", { auctionRef: "no-terms", participantPrincipalIds: bidders });
    check("a room without a start price is refused", r.status === 400, r.text);
    r = await call("Alfa", "POST", "/rooms", { auctionRef: "x-" + ref, participantPrincipalIds: bidders, startAmount: "10" });
    check("a supplier cannot open a room", r.status === 403, r.text);

    r = await call("Alfa", "POST", `/rooms/${ref}/bids`, { amount: "9900.00", bidKey: key() });
    check("a valid bid is accepted and leads", r.status === 200 && r.json.accepted && r.json.leading === true && r.json.bestAmount === "9900.00", r.text);
    const dupKey = key();
    r = await call("Beta", "POST", `/rooms/${ref}/bids`, { amount: "9900.00", bidKey: dupKey });
    check("a bid that does not beat the best by the step is refused", r.status === 422 && r.json.maximum === "9800.00", r.text);
    r = await call("Beta", "POST", `/rooms/${ref}/bids`, { amount: "9850", bidKey: key() });
    check("the minimum step is enforced", r.status === 422, r.text);
    r = await call("Beta", "POST", `/rooms/${ref}/bids`, { amount: "9800", bidKey: dupKey });
    check("a lower bid from a rival is accepted", r.status === 200 && r.json.leading === true && r.json.bestAmount === "9800.00", r.text);
    r = await call("Beta", "POST", `/rooms/${ref}/bids`, { amount: "9800", bidKey: dupKey });
    check("a retried bid key is idempotent", r.status === 200 && r.json.duplicate === true && r.json.bidCount === 2, r.text);
    r = await call("Alfa", "GET", `/rooms/${ref}/state`);
    check("the previous leader learns the new price and that it no longer leads", r.status === 200 && r.json.leading === false && r.json.bestAmount === "9800.00", r.text);
    check("a bidder never sees the reserve price", r.json && !("floor" in r.json) && !("startAmount" in r.json), r.text);
    r = await call("Organizer", "GET", `/rooms/${ref}/state`);
    check("the organizer sees the reserve price", r.json && r.json.floor === "6000.00", r.text);

    for (const bad of ["9500.123", "-5", "abc", "0", "1e3", "", null]) {
      r = await call("Gamma", "POST", `/rooms/${ref}/bids`, { amount: bad, bidKey: key() });
      check(`malformed amount ${JSON.stringify(bad)} is refused`, r.status === 400, r.text);
    }
    r = await call("Gamma", "POST", `/rooms/${ref}/bids`, { amount: "5000", bidKey: key() });
    check("a bid under the floor is refused", r.status === 422 && !/6000/.test(r.text), r.text);
    r = await call("Organizer", "POST", `/rooms/${ref}/bids`, { amount: "9000", bidKey: key() });
    check("the organizer cannot bid", r.status === 403, r.text);
    r = await call("Outsider", "POST", `/rooms/${ref}/bids`, { amount: "9000", bidKey: key() });
    check("someone outside the tenant cannot bid", r.status === 403 || r.status === 404, r.text);
    r = await call("Alfa", "POST", `/rooms/${ref}/events`, { type: "bid_activity", eventKey: key() + "0000" });
    check("a bare signal cannot fake an offer in a ledger room", r.status === 409, r.text);

    r = await call("Organizer", "GET", `/rooms/${ref}/bids`);
    check("the organizer reads the whole ledger with names", r.status === 200 && r.json.bids.length === 2 && r.json.bids[1].bidderName === "Beta" && r.json.bids[1].amount === "9800.00", r.text);
    r = await call("Alfa", "GET", `/rooms/${ref}/bids`);
    check("a bidder reads only their own bids", r.status === 200 && r.json.bids.length === 1 && r.json.bids[0].amount === "9900.00" && r.json.bids[0].bidderName === "", r.text);
    r = await call("Alfa", "GET", `/rooms/${ref}/events?after=0`);
    check("a rival's bid reaches others as an anonymous signal", r.status === 200 && r.json.events.some((e) => e.type === "competitive_offer" && e.actor === ""), r.text);
    r = await call("Organizer", "GET", `/rooms/${ref}/events?after=0`);
    check("the organizer's signal names the bidder", r.json.events.some((e) => e.type === "bid_received" && e.actor === "Beta"), r.text);

    // Pause blocks bidding; resume restores it.
    r = await call("Organizer", "POST", `/rooms/${ref}/events`, { type: "auction_paused", eventKey: key() + "0000" });
    check("organizer pauses", r.status === 200, r.text);
    r = await call("Gamma", "POST", `/rooms/${ref}/bids`, { amount: "9000", bidKey: key() });
    check("a paused room refuses bids", r.status === 409, r.text);
    r = await call("Organizer", "POST", `/rooms/${ref}/events`, { type: "auction_resumed", eventKey: key() + "0000" });
    r = await call("Gamma", "POST", `/rooms/${ref}/bids`, { amount: "9000", bidKey: key() });
    check("bidding resumes", r.status === 200 && r.json.bestAmount === "9000.00", r.text);

    // Anti-sniping: the shortest allowed window (60 s) is already inside the last 60 s.
    const snipe = "snipe-" + crypto.randomBytes(4).toString("hex");
    await call("Organizer", "POST", "/rooms", { auctionRef: snipe, participantPrincipalIds: bidders, closesAt: new Date(Date.now() + 5000).toISOString(), startAmount: "500", minStep: 1, floor: "100", antiSnipingSeconds: 60, maxExtensions: 2 });
    r = await call("Alfa", "GET", `/rooms/${snipe}/state`); const before = Date.parse(r.json.closesAt);
    r = await call("Alfa", "POST", `/rooms/${snipe}/bids`, { amount: "400", bidKey: key() });
    check("a late bid extends the round", r.status === 200 && r.json.extended === true && Date.parse(r.json.closesAt) - before === 60000 && r.json.extensionCount === 1, r.text);
    r = await call("Beta", "POST", `/rooms/${snipe}/bids`, { amount: "300", bidKey: key() });
    check("a bid outside the last seconds does not extend", r.status === 200 && r.json.extended === false && r.json.extensionCount === 1, r.text);
    r = await call("Organizer", "POST", `/rooms/${snipe}/events`, { type: "auction_extended", eventKey: key() + "0000" });
    check("a manual extension moves the real closing time", r.status === 200, r.text);
    r = await call("Gamma", "GET", `/rooms/${snipe}/state`);
    check("the manual extension counts against the same cap", r.json.extensionCount === 2 && Date.parse(r.json.closesAt) > before + 60000, r.text);
    r = await call("Organizer", "POST", `/rooms/${snipe}/events`, { type: "auction_extended", eventKey: key() + "0000" });
    check("a manual extension over the cap is refused", r.status === 409, r.text);
    r = await call("Alfa", "POST", `/rooms/${snipe}/bids`, { amount: "100", bidKey: key() });
    check("the floor itself is a valid bid", r.status === 200 && r.json.bestAmount === "100.00", r.text);
    r = await call("Beta", "POST", `/rooms/${snipe}/bids`, { amount: "99", bidKey: key() });
    check("nothing can beat the floor", r.status === 422, r.text);

    // The ledger is append-only, even for the application's own database user.
    const immutable = path.join(work, "immutable.php");
    fs.writeFileSync(immutable, `<?php
$c = require getenv('BUYNIVERSE_RUNTIME_CONFIG'); $pdo = new PDO($c['db_dsn'], $c['db_user'], $c['db_password'], [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
foreach (['UPDATE auction_live_bids SET amount_cents = 1', 'DELETE FROM auction_live_bids'] as $sql) { try { $pdo->exec($sql); echo 'CHANGED'; } catch (Throwable $e) { echo 'BLOCKED;'; } }`);
    check("bids cannot be updated or deleted", php([immutable]) === "BLOCKED;BLOCKED;");
  } finally { server.kill(); }
  if (failures.length) { console.error(JSON.stringify({ auctionLedger: "FAILED", failures }, null, 2)); process.exit(1); }
  console.log(JSON.stringify({ auctionLedger: "verified" }, null, 2));
}
main().catch((error) => { console.error(error); process.exit(1); });
