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

  global.BuyniverseOnboarding = {
    load: function () { return request("GET"); },
    enroll: function (payload) { return request("POST", payload); },
    uploadFiscalCredentials: uploadFiscalCredentials,
  };
})(window);
