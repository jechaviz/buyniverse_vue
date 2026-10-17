// Public savings estimate: the numbers a buyer sees on /ahorro must follow the server's fee rule exactly.
"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const context = { window: {} };
context.window = context;
new Function("window", fs.readFileSync(path.join(root, "app/lib/commerce.js"), "utf8"))(context);
new Function("window", fs.readFileSync(path.join(root, "app/lib/savings-calculator.js"), "utf8"))(context);
const { estimate } = context.BuyniverseSavings;

// 1,000,000 budget, 800,000 offer: saving 200,000; 25% = 50,000; floor 3,200 and cap 64,000 do not bite.
const worked = estimate({ budget: 1000000, offer: 800000 });
assert.deepStrictEqual([worked.valid, worked.savings, worked.fee, worked.net, worked.percentSaved, worked.basis, worked.currency], [true, 200000, 50000, 150000, 20, "saving", "MXN"], "worked example");

// a small purchase hits the cap: 8% of 800 = 64, not 25% of 200 = 50 and not the 3,000 minimum
const small = estimate({ budget: 1000, offer: 800 });
assert.deepStrictEqual([small.fee, small.basis, small.net], [64, "cap", 136], "a small purchase never pays more than the cap");

// no saving: the floor (0.4% of what is awarded, at least 3,000) is what is charged, and it is more than the saving
const none = estimate({ budget: 800000, offer: 900000 });
assert.deepStrictEqual([none.savings, none.fee, none.net, none.basis, none.extra], [0, 3600, 0, "floor", 3600], "no saving still pays the floor");

// a free offer is a valid comparison; the cap is 8% of zero, so nothing is charged
const free = estimate({ budget: 500, offer: 0 });
assert.deepStrictEqual([free.valid, free.savings, free.fee], [true, 500, 0], "an offer of zero owes nothing");

// invalid input
for (const input of [{ budget: 0, offer: 10 }, { budget: 100, offer: -1 }, { budget: "abc", offer: 10 }, {}]) assert.strictEqual(estimate(input).valid, false, `not estimable: ${JSON.stringify(input)}`);

// the server's terms replace the defaults, and the estimate follows them
context.BuyniverseRuntime = { commerce: { ratePercent: 18, capPercent: 5, floorPercent: 0.4 } };
const custom = estimate({ budget: 1000000, offer: 800000 });
assert.deepStrictEqual([custom.fee, custom.ratePercent, custom.capPercent], [36000, 18, 5], "the estimate uses the terms the server published");

// the buyer never pays more than the cap of what is awarded
for (const [b, o] of [[1e6, 1], [1e9, 5e8], [12345.67, 9876.54], [50, 49]]) {
  const e = estimate({ budget: b, offer: o });
  assert.ok(e.fee <= Math.round(o * 5) / 100 + 0.01, `fee ${e.fee} is within the cap for ${b}/${o}`);
}

console.log("[PASS] Public savings estimate follows the server's rule (worked example, floor, cap, server terms, invalid input)");
