// The browser's copy of the fee must give exactly what the server's function gives, on every golden vector.
"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const context = { window: {} };
context.window = context;
new Function("window", fs.readFileSync(path.join(root, "app/lib/commerce.js"), "utf8"))(context);
const { fee, terms, DEFAULTS } = context.BuyniverseCommerce;

const { vectors } = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/commerce-vectors.json"), "utf8"));
assert.ok(vectors.length >= 200, "the vector set is large enough to mean something");
let checked = 0;
for (const v of vectors) {
  const got = fee({ baselineCents: v.baselineCents, awardedCents: v.awardedCents, trailingSavingCents: v.trailingSavingCents, currency: v.currency }, v.terms);
  for (const key of Object.keys(v.expect)) {
    assert.strictEqual(got[key], v.expect[key], `${key} differs for ${JSON.stringify({ b: v.baselineCents, a: v.awardedCents, t: v.trailingSavingCents, c: v.currency, rate: v.terms.ratePercent })}: browser ${got[key]}, server ${v.expect[key]}`);
    checked += 1;
  }
}

// Without runtime terms the defaults apply; with them, the server's win.
assert.strictEqual(terms().ratePercent, DEFAULTS.ratePercent, "defaults without a runtime");
context.BuyniverseRuntime = { commerce: { ratePercent: 18 } };
assert.strictEqual(terms().ratePercent, 18, "the server's terms replace the default");
assert.strictEqual(terms().capPercent, DEFAULTS.capPercent, "missing fields keep their default");
assert.strictEqual(fee({ baselineCents: 100000000, awardedCents: 80000000 }).feeCents, 3600000, "a worked example: 18% of the 200,000 saving");

// The browser cannot set its own fee: no action or control writes a rate into the workspace.
for (const file of ["app/store/procurementDomainActions.js", "app/pages/dashboard/NeedsHome.vue", "app/pages/procurement/ProcurementCockpit.vue", "app/components/commercial/SavingsWaterfall.vue"]) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  assert.ok(!/setCommercialTerms|canConfigureCommercialTerms|change-service-fee/.test(source), `${file} must not let the browser set the service fee`);
}

console.log(`[PASS] Browser fee equals the server fee on ${vectors.length} golden vectors (${checked} values)`);
