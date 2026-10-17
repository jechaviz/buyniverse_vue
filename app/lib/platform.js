(function (global) {
  "use strict";

  // Client of the platform administration API. The server decides who may use
  // it and what it shows; this file only carries the calls and the CSRF token
  // the server issues to this session.
  var base = (global.BuyniverseBase && global.BuyniverseBase.sub) || "";
  var csrf = "";

  function parse(response) {
    return response.json().catch(function () { return {}; }).then(function (body) {
      if (typeof body.csrf === "string" && /^[a-f0-9]{64}$/i.test(body.csrf)) csrf = body.csrf;
      if (!response.ok) {
        var error = new Error(body.error || "Platform administration is unavailable.");
        error.status = response.status;
        throw error;
      }
      return body;
    });
  }
  function get(path) {
    return fetch(base + path, { credentials: "same-origin", cache: "no-store", redirect: "error", headers: { Accept: "application/json" } }).then(parse);
  }
  function write(path, payload) {
    var go = function () {
      return fetch(base + path, {
        method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error",
        headers: { Accept: "application/json", "Content-Type": "application/json", "X-Buyniverse-Request": "platform-v1", "X-Buyniverse-CSRF": csrf },
        body: JSON.stringify(payload || {}),
      }).then(parse);
    };
    return (csrf ? Promise.resolve() : get("/api/v1/platform/me")).then(go);
  }

  global.BuyniverseAdmin = {
    me: function () { return get("/api/v1/platform/me").then(function (body) { return body; }); },
    overview: function () { return get("/api/v1/platform/overview"); },
    adjustStamps: function (companyId, delta, note) { return write("/api/v1/platform/stamps", { companyId: companyId, delta: delta, note: note }); },
    decideRequest: function (id, action, days) { return write("/api/v1/platform/demo-requests/" + encodeURIComponent(id), { action: action, days: days }); },
    revokeCode: function (id) { return write("/api/v1/platform/demo-codes/" + encodeURIComponent(id) + "/revoke", {}); },
    savePack: function (pack) { return write("/api/v1/platform/packs", pack); },
    createCharge: function (companyId, packId) { return write("/api/v1/platform/charges", { companyId: companyId, packId: packId }); },
    payCharge: function (id, reference) { return write("/api/v1/platform/charges/" + encodeURIComponent(id) + "/paid", { reference: reference }); },
    cancelCharge: function (id) { return write("/api/v1/platform/charges/" + encodeURIComponent(id) + "/cancel", {}); },
    saveTerms: function (terms) { return write("/api/v1/platform/commerce-terms", terms); },
    collectSettlement: function (id, reference) { return write("/api/v1/platform/settlements/" + encodeURIComponent(id) + "/paid", { reference: reference }); },
    waiveSettlement: function (id, reason) { return write("/api/v1/platform/settlements/" + encodeURIComponent(id) + "/waive", { reference: reason }); },
  };
})(typeof window !== "undefined" ? window : globalThis);
