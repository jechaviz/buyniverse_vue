// Private demo: runs the real PHP boundary against a disposable database and
// checks that nothing under /demo/ is served without its own session, that the
// owners' universal password and approved guest codes work, and that a revoked
// code stops working. Opt-in, because it needs a database:
//   BUYNIVERSE_TEST_RUNTIME_CONFIG=/path/runtime-test.php node scripts/qa/demoAccess.js
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn, execFileSync } = require("child_process");

const baseConfig = process.env.BUYNIVERSE_TEST_RUNTIME_CONFIG;
if (!baseConfig) { console.log(JSON.stringify({ demoAccess: "skipped (set BUYNIVERSE_TEST_RUNTIME_CONFIG)" }, null, 2)); process.exit(0); }

const ROOT = path.resolve(__dirname, "../..");
const work = fs.mkdtempSync(path.join(os.tmpdir(), "bnv-demo-"));
const ownerPassword = "owner-universal-" + Math.random().toString(36).slice(2, 12);
const quiet = { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] };
const ownerHash = (execFileSync("php", ["-d", "display_startup_errors=0", "-r", "echo password_hash($argv[1], PASSWORD_DEFAULT);", ownerPassword], quiet).match(/\$2y\$[^\s]+/) || [])[0];
const config = path.join(work, "runtime.php");
fs.writeFileSync(config, `<?php $c = require ${JSON.stringify(baseConfig)}; $c['demo_owner_password_hash'] = '${ownerHash}'; return $c;`);
const cli = (...args) => execFileSync("php", ["-d", "display_startup_errors=0", path.join(ROOT, "demo_admin.php"), ...args], { ...quiet, env: { ...process.env, BUYNIVERSE_RUNTIME_CONFIG: config } });
const port = 9010 + Math.floor(Math.random() * 40);
const base = `http://127.0.0.1:${port}`;
const failures = [];
const check = (label, ok, detail = "") => { if (!ok) failures.push(`${label}${detail ? ": " + detail : ""}`); };
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// A browser's cookie jar, reduced to what the gate uses.
function jar() {
  const cookies = {};
  return {
    cookies,
    header: () => Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; "),
    absorb: (response) => { for (const line of response.headers.getSetCookie()) { const [pair] = line.split(";"); const i = pair.indexOf("="); const k = pair.slice(0, i), v = pair.slice(i + 1); if (v === "" || /expires=Thu, 01 Jan 1970|max-age=0/i.test(line)) delete cookies[k]; else cookies[k] = v; } },
  };
}
async function go(client, method, uri, form) {
  const headers = { Cookie: client.header(), Origin: base };
  let body;
  if (form) { headers["Content-Type"] = "application/x-www-form-urlencoded"; body = new URLSearchParams(form).toString(); }
  const response = await fetch(base + uri, { method, headers, body, redirect: "manual" });
  client.absorb(response);
  return { status: response.status, response, text: await response.text(), location: response.headers.get("location") };
}
async function gate(client) { const r = await go(client, "GET", "/demo/"); const token = (r.text.match(/name="t" value="([a-f0-9]+)"/) || [])[1]; return { r, token }; }
async function login(client, code) { const { token } = await gate(client); return go(client, "POST", "/demo/__demo/access", { t: token, code }); }

async function main() {
  execFileSync("php", ["-d", "display_startup_errors=0", "-r", "$c=require $argv[1]; (new PDO($c['db_dsn'],$c['db_user'],$c['db_password']))->exec('DELETE FROM demo_access_attempts');", baseConfig], quiet); // earlier runs share this address
  const server = spawn("php", ["-d", "display_startup_errors=0", "-S", `127.0.0.1:${port}`, "index.php"], { cwd: ROOT, env: { ...process.env, BUYNIVERSE_RUNTIME_CONFIG: config }, stdio: "ignore" });
  try {
    for (let i = 0; i < 40; i++) { try { await fetch(base + "/api/v1/runtime"); break; } catch (_) { await pause(150); } }
    const anon = jar();

    // The door is closed to everyone without a session.
    const { r: g, token } = await gate(anon);
    check("/demo/ shows the access gate, not the app", g.status === 200 && /name="code"/.test(g.text) && !/app\/main\.js/.test(g.text) && token, g.text.slice(0, 120));
    check("the gate is not indexable", /noindex/.test(g.response.headers.get("x-robots-tag") || ""));
    for (const asset of ["/demo/app/main.js", "/demo/app/data/demo.js", "/demo/app/pages/HomePage.vue", "/demo/assets/brand/buyniverse-ring.svg"]) check(`${asset} is refused without a session`, (await go(anon, "GET", asset)).status === 401);
    check("a deep app route shows the gate", /name="code"/.test((await go(anon, "GET", "/demo/procurement/auction")).text));
    check("the gate answers no POST outside its own forms", (await go(anon, "POST", "/demo/")).status === 405);
    check("the real product is not gated and not noindex", (await go(anon, "GET", "/")).status === 200 && !(await fetch(base + "/")).headers.get("x-robots-tag"));
    check("the demo data is refused outside /demo/ even with a session cookie", (await go(anon, "GET", "/app/data/demo.js")).status === 404);

    // Wrong codes and forged forms.
    let r = await go(anon, "POST", "/demo/__demo/access", { t: "forged", code: ownerPassword });
    check("a form without the gate token is refused", r.status === 403, String(r.status));
    r = await login(anon, "WRONG-CODE-0000");
    check("a wrong code is refused and sets no session", r.status === 401 && !anon.cookies.buyniverse_demo, String(r.status));

    // The owners' universal password.
    const owner = jar();
    r = await login(owner, ownerPassword);
    check("the owner password opens the demo", r.status === 303 && r.location === "/demo/" && owner.cookies.buyniverse_demo, String(r.status));
    const cookieLine = (await fetch(base + "/demo/", { headers: { Cookie: owner.header() } })).status;
    check("with the session the app is served", cookieLine === 200 && /app\/boot\.js/.test((await go(owner, "GET", "/demo/")).text));
    check("with the session the sample data is served", (await go(owner, "GET", "/demo/app/data/demo.js")).status === 200);
    check("the demo still has no API", (await go(owner, "GET", "/demo/api/v1/runtime")).status === 404);
    const raw = await fetch(base + "/demo/__demo/access", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: `buyniverse_demo_gate=${token}` }, body: new URLSearchParams({ t: token, code: ownerPassword }), redirect: "manual" });
    const setCookie = raw.headers.getSetCookie().find((line) => line.startsWith("buyniverse_demo=")) || "";
    check("the session cookie is HttpOnly, Strict and scoped to /demo", /HttpOnly/i.test(setCookie) && /SameSite=Strict/i.test(setCookie) && /path=\/demo/i.test(setCookie), setCookie.slice(0, 160));
    const forged = jar(); forged.cookies.buyniverse_demo = owner.cookies.buyniverse_demo.replace(/.$/, (c) => (c === "a" ? "b" : "a"));
    check("a tampered cookie opens nothing", (await go(forged, "GET", "/demo/app/main.js")).status === 401);
    const swapped = jar(); const [body] = owner.cookies.buyniverse_demo.split("."); swapped.cookies.buyniverse_demo = body + ".00";
    check("a cookie with a forged signature opens nothing", (await go(swapped, "GET", "/demo/app/main.js")).status === 401);
    r = await go(owner, "GET", "/demo/__demo/exit");
    check("leaving the demo clears the session", r.status === 303 && !owner.cookies.buyniverse_demo && (await go(owner, "GET", "/demo/app/main.js")).status === 401);

    // A guest code approved by an owner.
    const created = cli("create", "QA guest", "1");
    const code = (created.match(/\n([A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4})\s*$/) || [])[1]; const id = (created.match(/id ([0-9a-f-]{36})/) || [])[1];
    check("an owner can issue a code", !!code && !!id, created);
    const guest = jar();
    r = await login(guest, code.toLowerCase().replace(/-/g, " "));
    check("a guest code opens the demo (typed loosely)", r.status === 303 && guest.cookies.buyniverse_demo, String(r.status));
    check("the guest sees the app", (await go(guest, "GET", "/demo/")).status === 200 && /app\/boot\.js/.test((await go(guest, "GET", "/demo/")).text));
    check("the code is stored only as a hash", !fs.readFileSync(path.join(work, "runtime.php"), "utf8").includes(code) && execFileSync("php", ["-r", "$c=require $argv[1]; $p=new PDO($c['db_dsn'],$c['db_user'],$c['db_password']); echo $p->query(\"SELECT code_hash FROM demo_access_codes WHERE id='\".$argv[2].\"'\")->fetchColumn();", baseConfig, id], quiet).includes("$2y$"));
    cli("revoke", id);
    check("a revoked code stops opening the app at the next page load", /name="code"/.test((await go(guest, "GET", "/demo/")).text));
    check("a revoked code cannot be used again", (await login(jar(), code)).status === 401);

    // A request, approved from the command line.
    const asker = jar(); const { token: t2 } = await gate(asker);
    r = await go(asker, "POST", "/demo/__demo/request", { t: t2, name: "María Prueba", email: `maria.${Date.now()}@example.com`, company: "ACME", note: "Quiero ver las subastas" });
    check("a request is received", r.status === 200 && /\bn\b/.test(r.text) && !/name="code".*bad/.test(r.text), String(r.status));
    const listing = cli("requests"); const requestId = (listing.match(/^([0-9a-f-]{36}) \| pending/m) || [])[1];
    check("the owner sees the pending request with its email", !!requestId && /María Prueba/.test(listing) && /@example\.com/.test(listing), listing);
    const approved = cli("approve", requestId, "2"); const approvedCode = (approved.match(/\n([A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4})\s*$/) || [])[1];
    check("approving a request issues a code", !!approvedCode, approved);
    check("the approved code works", (await login(jar(), approvedCode)).status === 303);
    r = await go(asker, "POST", "/demo/__demo/request", { t: (await gate(asker)).token, name: "X", email: "not-an-email" });
    check("an invalid request is refused", r.status === 422, String(r.status));

    // Guessing is throttled.
    const attacker = jar(); let last = 0;
    for (let i = 0; i < 10; i++) last = (await login(attacker, "GUESS-" + i)).status;
    check("repeated wrong codes are throttled", last === 429, String(last));
    check("even the right code waits while throttled", (await login(attacker, ownerPassword)).status === 429);
  } finally { server.kill(); }
  if (failures.length) { console.error(JSON.stringify({ demoAccess: "FAILED", failures }, null, 2)); process.exit(1); }
  console.log(JSON.stringify({ demoAccess: "verified" }, null, 2));
}
main().catch((error) => { console.error(JSON.stringify(failures, null, 1)); console.error(error); process.exit(1); });
