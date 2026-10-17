/*
 * Buyniverse's fee, as the browser shows it. The server is the only place a fee is
 * decided (server/modules/commerce/fee.php); this file repeats the same arithmetic so
 * the public calculator and the dashboards show the number the server will compute.
 * Both are checked against the same vectors (scripts/qa/fixtures/commerce-vectors.json).
 *
 * The terms come from /api/v1/runtime. Without them (the demo, an old server) the
 * defaults below apply. Money is integer cents; rates are percentages here and basis
 * points in the arithmetic.
 */
(function (global) {
  "use strict";

  var DEFAULTS = { currency: "MXN", ratePercent: 25, bracketRatePercent: 20, bracketThresholdCents: 500000000, floorPercent: 0.4, floorMinCents: 300000, capPercent: 8, mode: "informative" };

  function whole(value) { var n = Math.floor(Number(value)); return Number.isFinite(n) && n > 0 ? n : 0; }
  function bps(percent) { return Math.round(Math.min(100, Math.max(0, Number(percent) || 0)) * 100); }

  /** floor(cents * bps / 10000) without losing precision on large amounts. */
  function share(cents, basisPoints) {
    return Math.floor(cents / 10000) * basisPoints + Math.floor(((cents % 10000) * basisPoints) / 10000);
  }

  /** The terms in force: the server's, when the runtime has them, else the defaults. */
  function terms() {
    var fromServer = global.BuyniverseRuntime && global.BuyniverseRuntime.commerce;
    return Object.assign({}, DEFAULTS, fromServer && typeof fromServer === "object" ? fromServer : {});
  }

  /** fee({ baselineCents, awardedCents, trailingSavingCents?, currency? }, terms?) -> same fields as the PHP function. */
  function fee(input, withTerms) {
    var t = withTerms || terms();
    var baseline = whole(input.baselineCents), awarded = whole(input.awardedCents), trailing = whole(input.trailingSavingCents);
    var currency = input.currency || t.currency;
    var saving = Math.max(0, baseline - awarded);
    var absolute = currency === t.currency;                 // fixed amounts only mean something in the terms' currency
    var room = absolute ? Math.max(0, whole(t.bracketThresholdCents) - trailing) : Infinity;
    var standardPart = Math.min(saving, room);
    var excessPart = saving - standardPart;
    var ratioFee = share(standardPart, bps(t.ratePercent)) + share(excessPart, bps(t.bracketRatePercent));
    var floorBps = Math.min(bps(t.floorPercent), bps(t.capPercent));
    var floor = Math.max(absolute ? whole(t.floorMinCents) : 0, share(awarded, floorBps));
    var cap = share(awarded, bps(t.capPercent));
    var amount = awarded === 0 ? 0 : Math.min(cap, Math.max(floor, ratioFee));
    var basis = amount === 0 ? "none" : (cap < Math.max(floor, ratioFee) ? "cap" : (floor > ratioFee ? "floor" : "saving"));
    return { savingCents: saving, ratioFeeCents: ratioFee, floorCents: floor, capCents: cap, feeCents: amount, standardPartCents: standardPart, excessPartCents: excessPart, basis: basis };
  }

  global.BuyniverseCommerce = { fee: fee, terms: terms, DEFAULTS: DEFAULTS, share: share };
})(typeof window !== "undefined" ? window : globalThis);
