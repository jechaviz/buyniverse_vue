// Fiscal rules conformance: the JavaScript engine and the PHP port
// (fiscal_rules.php) must give identical answers for the shared vectors.
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const rules = require("../../app/lib/fiscal-rules.js");

const ROOT = path.resolve(__dirname, "../..");
const vectors = JSON.parse(fs.readFileSync(path.join(__dirname, "fiscal-vectors.json"), "utf8"));
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, "app/data/fiscal/jurisdictions.json"), "utf8"));
const failures = [];

function check(label, condition, detail) { if (!condition) failures.push(`${label}: ${detail}`); }

function verify(engine, validate, evaluate) {
  for (const [validator, value, valid, code, person] of vectors.validators) {
    const result = validate(validator, value);
    const label = `${engine} ${validator}(${value})`;
    check(label, result.valid === valid, `expected valid=${valid}, got ${result.valid} (${result.code})`);
    if (code) check(label, result.code === code, `expected code ${code}, got ${result.code}`);
    if (person) check(label, result.person === person, `expected person ${person}, got ${result.person}`);
    if (valid) check(label, (result.warnings || []).length === 0, `unexpected warnings ${result.warnings}`);
  }
  for (const scenario of vectors.evaluations) {
    const result = evaluate(scenario.country, scenario.profile, scenario.now, vectors.evaluations.indexOf(scenario));
    const byId = Object.fromEntries(result.requirements.map((item) => [item.id, item]));
    const label = `${engine} "${scenario.name}"`;
    const expect = scenario.expect;
    for (const key of ["enrollmentReady", "formal"]) {
      if (key in expect) check(label, result.summary[key] === expect[key], `${key} expected ${expect[key]}, got ${result.summary[key]}`);
    }
    for (const [id, status] of Object.entries(expect.status || {})) check(label, byId[id] && byId[id].status === status, `${id} expected ${status}, got ${byId[id] && byId[id].status}`);
    for (const [id, code] of Object.entries(expect.codes || {})) check(label, byId[id] && byId[id].code === code, `${id} expected code ${code}, got ${byId[id] && byId[id].code}`);
    for (const [id, warning] of Object.entries(expect.warnings || {})) check(label, byId[id] && (byId[id].warnings || []).includes(warning), `${id} expected warning ${warning}`);
    for (const id of expect.absent || []) check(label, !byId[id], `${id} should not apply`);
  }
}

verify("js", rules.validateTaxId, (country, profile, now) => rules.evaluate(registry, country, profile, { now }));

// Country detection hints.
const detect = (timeZone, languages) => rules.detectCountry(registry, { timeZone, languages }).code;
check("detect", detect("America/Monterrey", []) === "MX", "Monterrey time zone should suggest MX");
check("detect", detect("America/Chicago", ["es-MX"]) === "US", "time zone outranks language");
check("detect", detect("UTC", ["es-CO", "es"]) === "CO", "language region fallback");
check("detect", detect("UTC", ["es"]) === "", "no signal suggests nothing");

// The PHP port runs the same vectors when a PHP CLI is available.
let php = "skipped (no PHP CLI)";
try {
  const out = execFileSync("php", ["-d", "display_startup_errors=0", path.join(__dirname, "fiscal_rules_test.php")], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const parsed = JSON.parse(out.trim().split(/\r?\n/).pop());
  verify("php", (validator, value) => parsed.validators[`${validator}|${value}`], (country, profile, now, index) => parsed.evaluations[index]);
  php = "verified";
} catch (error) {
  if (error.code !== "ENOENT") failures.push(`php runner: ${error.message.split("\n")[0]}`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({ fiscalRules: "ok", validators: vectors.validators.length, evaluations: vectors.evaluations.length, php }, null, 2));
