(function (global) {
  "use strict";

  // Client of the company setup wizard API. Every call is same-origin with the
  // session cookie; every write also carries the session's CSRF token. The
  // server returns codes and numbers; this file never decides anything.
  var base = (global.BuyniverseBase && global.BuyniverseBase.sub) || "";
  var csrf = "";

  function parse(response) {
    return response.json().catch(function () { return {}; }).then(function (body) {
      if (typeof body.csrf === "string" && /^[a-f0-9]{64}$/i.test(body.csrf)) csrf = body.csrf;
      if (!response.ok) {
        var error = new Error(body.error || "Setup is unavailable.");
        error.status = response.status;
        error.body = body;
        throw error;
      }
      return body;
    });
  }
  function send(method, path, kind, payload) {
    var headers = { Accept: "application/json" };
    var isForm = typeof FormData !== "undefined" && payload instanceof FormData;
    if (method !== "GET") {
      if (!isForm) headers["Content-Type"] = "application/json";
      headers["X-Buyniverse-Request"] = kind;
      if (csrf) headers["X-Buyniverse-CSRF"] = csrf;
    }
    return fetch(base + path, {
      method: method, credentials: "same-origin", cache: "no-store", redirect: "error", headers: headers,
      body: method === "GET" ? undefined : (isForm ? payload : JSON.stringify(payload || {})),
    }).then(parse);
  }
  // A write needs the token the server issued to this session. The invitations
  // endpoint answers for any signed-in identity, even one with no company yet.
  function write(path, kind, payload) {
    return (csrf ? Promise.resolve() : send("GET", "/api/v1/setup/invitations", "")).then(function () { return send("POST", path, kind, payload); });
  }
  function fiscalForm(companyId, certificate, privateKey, password) {
    if (!(certificate instanceof File) || !(privateKey instanceof File) || !password) return null;
    var form = new FormData();
    form.append("companyId", companyId); form.append("certificate", certificate); form.append("privateKey", privateKey); form.append("privateKeyPassword", password);
    return form;
  }

  global.BuyniverseSetup = {
    status: function () { return send("GET", "/api/v1/setup/status", ""); },
    saveCompany: function (input) { return write("/api/v1/setup/company", "setup-v1", input); },
    saveLocation: function (input) { return write("/api/v1/setup/locations", "setup-v1", input); },
    savePayout: function (input) { return write("/api/v1/setup/payout", "setup-v1", input); },
    invitations: function () { return send("GET", "/api/v1/setup/invitations", ""); },
    acceptInvitation: function (invitationId) { return write("/api/v1/setup/invitations/accept", "setup-v1", { invitationId: invitationId }); },
    revokeInvitation: function (id) { return write("/api/v1/setup/invitations/revoke", "setup-v1", { id: id }); },
    invite: function (companyId, input) { return write("/api/v1/tenant-companies/" + encodeURIComponent(companyId) + "/invitations", "tenant-context-v1", input); },
    catalogs: function () { return send("GET", "/api/v1/cfdi/catalogs", ""); },
    series: function () { return send("GET", "/api/v1/cfdi/series", ""); },
    saveSeries: function (input) { return write("/api/v1/cfdi/series", "cfdi-v1", input); },
    verifyCsd: function (companyId, cer, key, password) {
      var form = fiscalForm(companyId, cer, key, password);
      return form ? write("/api/v1/onboarding/fiscal-credentials/verify", "fiscal-credential-v1", form) : Promise.reject(new Error("Certificate, private key and password are required."));
    },
    uploadCsd: function (companyId, cer, key, password) {
      var form = fiscalForm(companyId, cer, key, password);
      return form ? write("/api/v1/onboarding/fiscal-credentials", "fiscal-credential-v1", form) : Promise.reject(new Error("Certificate, private key and password are required."));
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
