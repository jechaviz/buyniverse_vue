(function (global) {
  "use strict";

  var basePath = global.location.pathname.startsWith("/buyniverse_vue/") ? "/buyniverse_vue" : "";
  var endpoint = basePath + "/api/v1/onboarding";
  var csrf = "";

  function parse(response) {
    return response.json().catch(function () { return {}; }).then(function (body) {
      if (typeof body.csrf === "string" && /^[a-f0-9]{64}$/i.test(body.csrf)) csrf = body.csrf;
      if (!response.ok) {
        var error = new Error(body.error || "Secure onboarding is unavailable.");
        error.status = response.status;
        error.body = body;
        throw error;
      }
      return body;
    });
  }

  function request(method, payload) {
    var headers = { Accept: "application/json" };
    if (method !== "GET") {
      headers["Content-Type"] = "application/json";
      headers["X-Buyniverse-Request"] = "onboarding-v1";
      if (csrf) headers["X-Buyniverse-CSRF"] = csrf;
    }
    return fetch(endpoint, {
      method: method,
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
      headers: headers,
      body: method === "GET" ? undefined : JSON.stringify(payload || {}),
    }).then(parse);
  }

  function uploadFiscalCredentials(companyId, certificate, privateKey, password) {
    if (typeof companyId !== "string" || !/^[a-f0-9-]{36}$/i.test(companyId)) return Promise.reject(new Error("Invalid fiscal company."));
    if (!(certificate instanceof File) || !(privateKey instanceof File) || typeof password !== "string") return Promise.reject(new Error("Certificate, private key and password are required."));
    var form = new FormData();
    form.append("companyId", companyId);
    form.append("certificate", certificate);
    form.append("privateKey", privateKey);
    form.append("privateKeyPassword", password);
    var headers = {
      Accept: "application/json",
      "X-Buyniverse-Request": "fiscal-credential-v1",
    };
    if (csrf) headers["X-Buyniverse-CSRF"] = csrf;
    return fetch(basePath + "/api/v1/onboarding/fiscal-credentials", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
      headers: headers,
      body: form,
    }).then(parse);
  }

  function uploadComplianceDocument(companyId, requirementId, issuedOn, file) {
    if (typeof companyId !== "string" || !/^[a-f0-9-]{36}$/i.test(companyId)) return Promise.reject(new Error("Invalid company."));
    if (!(file instanceof File) || !/^\d{4}-\d{2}-\d{2}$/.test(String(issuedOn))) return Promise.reject(new Error("Attach the PDF and its issue date."));
    var form = new FormData();
    form.append("companyId", companyId);
    form.append("requirementId", String(requirementId));
    form.append("issuedOn", String(issuedOn));
    form.append("document", file);
    var headers = { Accept: "application/json", "X-Buyniverse-Request": "compliance-document-v1" };
    if (csrf) headers["X-Buyniverse-CSRF"] = csrf;
    return fetch(basePath + "/api/v1/onboarding/compliance-documents", {
      method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error", headers: headers, body: form,
    }).then(parse);
  }

  // Public reference data, fetched once: the fiscal jurisdiction registry,
  // U.S. counties and SAT postal codes (split by their first two digits).
  var cache = {};
  function json(url) {
    if (!cache[url]) cache[url] = fetch(basePath + "/" + url, { cache: "force-cache", headers: { Accept: "application/json" } })
      .then(function (response) { if (!response.ok) throw new Error("Reference data unavailable"); return response.json(); })
      .catch(function (error) { delete cache[url]; throw error; });
    return cache[url];
  }
  function postalInfo(code) {
    if (!/^\d{5}$/.test(String(code))) return Promise.resolve(null);
    return json("app/data/sat/cp/" + String(code).slice(0, 2) + ".json").then(function (rows) {
      var row = rows[code];
      return row ? { state: row[0], stateName: row[1], municipality: row[2], city: row[3], neighborhoods: row[4] || [] } : null;
    }).catch(function () { return null; });
  }

  global.BuyniverseOnboarding = {
    load: function () { return request("GET"); },
    enroll: function (payload) { return request("POST", payload); },
    uploadFiscalCredentials: uploadFiscalCredentials,
    loadCompliance: function () {
      return fetch(basePath + "/api/v1/onboarding/compliance", { credentials: "same-origin", cache: "no-store", redirect: "error", headers: { Accept: "application/json" } }).then(parse);
    },
    uploadComplianceDocument: uploadComplianceDocument,
    registry: function () { return json("app/data/fiscal/jurisdictions.json?v=1"); },
    usCounties: function () { return json("app/data/fiscal/us-counties.json?v=1").then(function (data) { return data.counties || {}; }); },
    postalInfo: postalInfo,
  };
})(window);
