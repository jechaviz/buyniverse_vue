// Public savings estimate: the numbers a buyer sees on /ahorro must follow the commercial rule exactly.
"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const context = { window: {} };
context.window = context;
new Function("window", fs.readFileSync(path.join(root, "app/lib/commercial-metrics.js"), "utf8"))(context);
new Function("window", fs.readFileSync(path.join(root, "app/lib/savings-calculator.js"), "utf8"))(context);
const { estimate, GAIN_SHARE_RATE } = context.BuyniverseSavings;

assert.strictEqual(GAIN_SHARE_RATE, 40, "the public estimate uses the commercial default rate");

// 1,000 budget, 800 offer: 200 saved, 40% of it is the fee, the buyer keeps 120.
const worked = estimate({ budget: 1000, offer: 800 });
assert.deepStrictEqual([worked.valid, worked.savings, worked.fee, worked.net, worked.percentSaved], [true, 200, 80, 120, 20], "worked example");

// an offer above the budget saves nothing and charges nothing
const above = estimate({ budget: 1000, offer: 1200 });
assert.deepStrictEqual([above.valid, above.savings, above.fee, above.net], [true, 0, 0, 0], "no savings above budget");

// a free offer is still a valid comparison
const free = estimate({ budget: 500, offer: 0 });
assert.deepStrictEqual([free.valid, free.savings, free.net], [true, 500, 300], "an offer of zero saves the whole budget");

// without a budget or with a negative offer there is nothing to estimate
assert.strictEqual(estimate({ budget: 0, offer: 10 }).valid, false, "a zero budget is not estimable");
assert.strictEqual(estimate({ budget: 100, offer: -1 }).valid, false, "a negative offer is not estimable");
assert.strictEqual(estimate({ budget: "abc", offer: 10 }).valid, false, "a non-number budget is not estimable");
assert.strictEqual(estimate({}).valid, false, "empty input is not estimable");

// the rate can be changed by the caller and is clamped to 0..100
assert.strictEqual(estimate({ budget: 1000, offer: 800, rate: 0 }).fee, 0, "rate 0 charges no fee");
assert.strictEqual(estimate({ budget: 1000, offer: 800, rate: 150 }).rate, 100, "rate is capped at 100");
assert.strictEqual(estimate({ budget: 1000, offer: 800, rate: 150 }).net, 0, "a 100% fee leaves nothing");

// the buyer never keeps more than the savings, and the fee never exceeds them
const sample = estimate({ budget: 12345.67, offer: 9876.54 });
assert.ok(sample.fee <= sample.savings && sample.net === Math.round((sample.savings - sample.fee) * 100) / 100, "fee is bounded by savings and net = savings - fee");

console.log("[PASS] Public savings estimate follows the commercial rule (worked example, bounds, invalid input)");
