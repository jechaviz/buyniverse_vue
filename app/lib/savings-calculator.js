/*
 * Public savings estimate: what a buyer keeps after Buyniverse's fee for one
 * purchase, from a budget and one offer. It uses lib/commerce.js, the browser copy
 * of the server's fee rule (same terms, same floor and cap), so the number on the
 * public page is the number the server computes when the award closes.
 *
 * It is an estimate for one comparison, not a quote and not a promise: real
 * results depend on the offers each buyer actually receives.
 */
(function (global) {
  "use strict";

  function number(value) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  /** estimate({ budget, offer }) -> { valid, budget, offer, savings, fee, net, percentSaved, ratePercent, basis, currency } (amounts in whole currency units) */
  function estimate(input) {
    var commerce = global.BuyniverseCommerce;
    if (!commerce) throw new Error("lib/commerce.js must load before savings-calculator.js");
    var terms = commerce.terms();
    var budget = number(input && input.budget);
    var offer = number(input && input.offer);
    var valid = budget !== null && offer !== null && budget > 0 && offer >= 0;
    var base = { valid: false, budget: budget, offer: offer, savings: 0, fee: 0, net: 0, percentSaved: 0, ratePercent: terms.ratePercent, basis: "none", currency: terms.currency, floorPercent: terms.floorPercent, capPercent: terms.capPercent };
    if (!valid) return base;

    var quote = commerce.fee({ baselineCents: Math.round(budget * 100), awardedCents: Math.round(offer * 100) }, terms);
    var savings = quote.savingCents / 100, fee = quote.feeCents / 100;
    return Object.assign(base, {
      valid: true,
      savings: savings,
      fee: fee,
      net: Math.max(0, Math.round((savings - fee) * 100) / 100),
      extra: Math.max(0, Math.round((fee - savings) * 100) / 100),     // what the buyer pays beyond the saving when a floor applies
      percentSaved: Math.round((savings / budget) * 1000) / 10,
      basis: quote.basis,
    });
  }

  global.BuyniverseSavings = { estimate: estimate };
})(typeof window !== "undefined" ? window : globalThis);
