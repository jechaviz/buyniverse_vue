/*
 * Public savings estimate: what a buyer keeps after Buyniverse's fee for one
 * purchase, from a budget and one offer. It reuses the same rule the dashboard
 * uses (commercial-metrics.js), so the number on the public page and the number
 * a buyer later sees for a real auction cannot drift apart.
 *
 * It is an estimate for one comparison, not a quote and not a promise: real
 * results depend on the offers each buyer actually receives.
 */
(function (global) {
  // Same default as commercial-metrics.js (gain-share on the total savings).
  var GAIN_SHARE_RATE = 40;

  function number(value) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  /** estimate({ budget, offer, rate? }) -> { valid, budget, offer, savings, fee, net, rate, percentSaved } */
  function estimate(input) {
    var budget = number(input && input.budget);
    var offer = number(input && input.offer);
    var rate = number(input && input.rate);
    rate = rate === null ? GAIN_SHARE_RATE : Math.min(100, Math.max(0, rate));
    var valid = budget !== null && offer !== null && budget > 0 && offer >= 0;
    if (!valid) return { valid: false, budget: budget, offer: offer, savings: 0, fee: 0, net: 0, rate: rate, percentSaved: 0 };

    var metrics = global.BuyniverseCommercialMetrics;
    if (!metrics || typeof metrics.auction !== "function") throw new Error("lib/commercial-metrics.js must load before savings-calculator.js");
    // A single awarded comparison: the budget is the starting price and the offer is the final bid.
    var at = new Date(0).toISOString();
    var record = {
      id: "estimate", currency: "USD", startingPrice: budget, currentBid: offer, status: "Awarded",
      bids: [{ supplierId: "estimate", amount: offer, at: at }],
    };
    var model = metrics.auction(record, { budget: budget, status: "Awarded" }, { successFeeRate: rate, successFeeBasis: "total" });
    var savings = model.totalSavings;
    return {
      valid: true,
      budget: budget,
      offer: offer,
      savings: savings,
      fee: model.outcomeShare,
      net: model.netSavings,
      rate: rate,
      percentSaved: budget > 0 ? Math.round((savings / budget) * 1000) / 10 : 0,
    };
  }

  global.BuyniverseSavings = { estimate: estimate, GAIN_SHARE_RATE: GAIN_SHARE_RATE };
})(typeof window !== "undefined" ? window : globalThis);
