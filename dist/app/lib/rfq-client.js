/*
 * Client of the server's sealed-bid RFQ (server/modules/rfq). Outside the demo the server keeps the
 * budget, the quotes and the award; this file only carries the calls and the CSRF token the server
 * issues. In the demo every call resolves null and the browser's own state runs the RFQ as before.
 */
(function (global) {
  "use strict";

  var base = (global.BuyniverseBase && global.BuyniverseBase.sub) || "";
  var token = "";

  function demo() { return !global.BuyniverseRuntime || global.BuyniverseRuntime.mode === "demo"; }
  function ref(value) {
    var text = typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 120) : "";
    return /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(text) ? text : "";
  }
  function amount(value) {
    var n = Number(value);
    return Number.isFinite(n) && n > 0 ? n.toFixed(2) : "";
  }
  function parse(response) {
    return response.json().catch(function () { return {}; }).then(function (body) {
      if (body && typeof body.csrf === "string" && /^[a-f0-9]{64}$/i.test(body.csrf)) token = body.csrf;
      if (!response.ok) { var error = new Error((body && body.error) || "RFQ is unavailable."); error.status = response.status; throw error; }
      return body;
    });
  }
  function ensureToken() {
    if (token) return Promise.resolve();
    return global.fetch(base + "/api/v1/auction-realtime/session", { credentials: "same-origin", cache: "no-store", redirect: "error", headers: { Accept: "application/json" } }).then(parse);
  }
  function post(path, payload) {
    return ensureToken().then(function () {
      return global.fetch(base + "/api/v1/rfq" + path, {
        method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error",
        headers: { Accept: "application/json", "Content-Type": "application/json", "X-Buyniverse-Request": "rfq-v1", "X-Buyniverse-CSRF": token },
        body: JSON.stringify(payload || {}),
      }).then(parse);
    });
  }
  function key() { return "q-" + Math.random().toString(16).slice(2, 12) + Date.now().toString(16); }
  function ids(list) { return (Array.isArray(list) ? list : []).filter(function (v) { return /^[a-f0-9-]{36}$/i.test(String(v || "")); }).slice(0, 50); }

  global.BuyniverseRfq = {
    /** Opens the RFQ on the server; the budget is fixed from here on. */
    open: function (input) {
      var eventRef = ref(input && input.eventRef), budget = amount(input && input.budget), participants = ids(input && input.participantPrincipalIds);
      if (demo() || !eventRef || !budget || participants.length < 2) return Promise.resolve(null);
      return post("/events", { eventRef: eventRef, participantPrincipalIds: participants, closesAt: String((input && input.closesAt) || "").slice(0, 40), budget: budget, currency: String((input && input.currency) || "MXN").slice(0, 3) });
    },
    /** A supplier's quote; the server keeps every revision and counts the latest. */
    quote: function (eventRef, input) {
      var r = ref(eventRef), price = amount(input && input.price), days = Number(input && input.leadDays);
      if (demo() || !r || !price || !Number.isInteger(days)) return Promise.resolve(null);
      return post("/events/" + encodeURIComponent(r) + "/quotes", { amount: price, leadDays: days, terms: String((input && input.terms) || "").slice(0, 80), quoteKey: key() });
    },
    /** Closes the RFQ (the organiser) and awards it; resolves with the settlement the server computed, or null. */
    award: function (eventRef, supplierPrincipalId) {
      var r = ref(eventRef);
      if (demo() || !r || !/^[a-f0-9-]{36}$/i.test(String(supplierPrincipalId || ""))) return Promise.resolve(null);
      return post("/events/" + encodeURIComponent(r) + "/close", {})
        .catch(function () { /* already closed is fine */ })
        .then(function () { return post("/events/" + encodeURIComponent(r) + "/award", { supplierPrincipalId: supplierPrincipalId }); })
        .then(function (body) { return body && body.settlement && typeof body.settlement === "object" ? body.settlement : null; })
        .catch(function () { return null; });
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
