/*
 * Buyniverse Commercial Suite Runtime
 * - Bilingual ES / EN toggle (URL ?lang=en|es + localStorage sync)
 * - Exact server-parity fee calculator (mirrors server/modules/commerce/fee.php & app/lib/commerce.js)
 * - Copy-to-clipboard helper with feedback
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "buyniverse_commercial_lang";

  function detectInitialLang() {
    try {
      var params = new URLSearchParams(global.location.search);
      var q = params.get("lang");
      if (q === "es" || q === "en") return q;
      var saved = global.localStorage && global.localStorage.getItem(STORAGE_KEY);
      if (saved === "es" || saved === "en") return saved;
    } catch (e) {}
    return "es";
  }

  function applyLang(lang) {
    var clean = lang === "en" ? "en" : "es";
    document.documentElement.setAttribute("data-lang", clean);
    document.documentElement.setAttribute("lang", clean === "en" ? "en" : "es-MX");
    try {
      if (global.localStorage) global.localStorage.setItem(STORAGE_KEY, clean);
    } catch (e) {}

    document.querySelectorAll("[data-set-lang]").forEach(function (btn) {
      var active = btn.getAttribute("data-set-lang") === clean;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });

    document.querySelectorAll("[data-es][data-en]").forEach(function (el) {
      el.textContent = el.getAttribute("data-" + clean);
    });

    document.querySelectorAll("[data-placeholder-es][data-placeholder-en]").forEach(function (el) {
      el.setAttribute("placeholder", el.getAttribute("data-placeholder-" + clean));
    });

    if (typeof global.onBuyniverseLangChange === "function") {
      global.onBuyniverseLangChange(clean);
    }
  }

  /* Exact mirror of server/modules/commerce/fee.php and app/lib/commerce.js */
  var FEE_DEFAULTS = {
    MXN: { currency: "MXN", ratePercent: 25, bracketRatePercent: 20, bracketThresholdCents: 500000000, floorPercent: 0.4, floorMinCents: 300000, capPercent: 8 },
    USD: { currency: "USD", ratePercent: 25, bracketRatePercent: 20, bracketThresholdCents: 25000000, floorPercent: 0.4, floorMinCents: 15000, capPercent: 8 }
  };

  function whole(value) {
    var n = Math.floor(Number(value));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function bps(percent) {
    return Math.round(Math.min(100, Math.max(0, Number(percent) || 0)) * 100);
  }

  function share(cents, basisPoints) {
    return Math.floor(cents / 10000) * basisPoints + Math.floor(((cents % 10000) * basisPoints) / 10000);
  }

  function computeFee(input) {
    var currency = input.currency === "USD" ? "USD" : "MXN";
    var t = FEE_DEFAULTS[currency];
    var baseline = whole(input.baselineCents);
    var awarded = whole(input.awardedCents);
    var trailing = whole(input.trailingSavingCents || 0);
    var saving = Math.max(0, baseline - awarded);
    var room = Math.max(0, whole(t.bracketThresholdCents) - trailing);
    var standardPart = Math.min(saving, room);
    var excessPart = saving - standardPart;
    var ratioFee = share(standardPart, bps(t.ratePercent)) + share(excessPart, bps(t.bracketRatePercent));
    var floorBps = Math.min(bps(t.floorPercent), bps(t.capPercent));
    var floor = Math.max(whole(t.floorMinCents), share(awarded, floorBps));
    var cap = share(awarded, bps(t.capPercent));
    var amount = awarded === 0 ? 0 : Math.min(cap, Math.max(floor, ratioFee));
    var basis = amount === 0 ? "none" : (cap < Math.max(floor, ratioFee) ? "cap" : (floor > ratioFee ? "floor" : "saving"));
    return {
      currency: currency,
      savingCents: saving,
      ratioFeeCents: ratioFee,
      floorCents: floor,
      capCents: cap,
      feeCents: amount,
      netKeptCents: Math.max(0, saving - amount),
      standardPartCents: standardPart,
      excessPartCents: excessPart,
      basis: basis
    };
  }

  function formatMoney(amount, currency) {
    var cur = currency === "USD" ? "USD" : "MXN";
    var locale = document.documentElement.getAttribute("data-lang") === "en" ? "en-US" : "es-MX";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0
    }).format(Math.round(amount));
  }

  function copyText(text, btn) {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(function () {
      if (!btn) return;
      var orig = btn.innerHTML;
      var isEn = document.documentElement.getAttribute("data-lang") === "en";
      btn.textContent = isEn ? "Copied ✓" : "Copiado ✓";
      setTimeout(function () { btn.innerHTML = orig; }, 1600);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    applyLang(detectInitialLang());
    document.querySelectorAll("[data-set-lang]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        applyLang(btn.getAttribute("data-set-lang"));
      });
    });
    document.querySelectorAll("[data-print-doc]").forEach(function (btn) {
      btn.addEventListener("click", function () { global.print(); });
    });
  });

  global.BuyniverseSuite = {
    applyLang: applyLang,
    getLang: function () { return document.documentElement.getAttribute("data-lang") || "es"; },
    computeFee: computeFee,
    formatMoney: formatMoney,
    copyText: copyText,
    FEE_DEFAULTS: FEE_DEFAULTS
  };
})(window);
