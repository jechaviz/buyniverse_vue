(function (global) {
  "use strict";

  var basePath = global.location.pathname.startsWith("/buyniverse_vue/") ? "/buyniverse_vue" : "";
  var endpoint = basePath + "/api/v1/tenant-context";
  var csrf = "";

  function request(url, options) {
    options = options || {};
    var headers = Object.assign({ Accept: "application/json" }, options.headers || {});
    if (options.method && options.method !== "GET") {
      headers["Content-Type"] = "application/json";
      headers["X-Buyniverse-Request"] = "tenant-context-v1";
      if (csrf) headers["X-Buyniverse-CSRF"] = csrf;
    }
    return fetch(url, {
      method: options.method || "GET",
      headers: headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: "same-origin",
      redirect: "error",
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (body) {
        if (!response.ok) throw new Error(body.error || "Tenant request failed");
        if (typeof body.csrf === "string") csrf = body.csrf;
        return body;
      });
    });
  }

  function safeId(value) {
    return typeof value === "string" && /^[a-f0-9-]{36}$/i.test(value) ? value : "";
  }
  function ensureCsrf() {
    return csrf ? Promise.resolve() : request(endpoint).then(function () { return undefined; });
  }

  global.BuyniverseTenantContext = {
    load: function () { return request(endpoint); },
    switchContext: function (companyId, locationId) {
      companyId = safeId(companyId);
      var hasLocation = locationId !== null && locationId !== undefined && locationId !== "";
      locationId = hasLocation ? safeId(locationId) : "";
      if (!companyId || (hasLocation && !locationId)) return Promise.reject(new Error("Invalid tenant context"));
      return ensureCsrf().then(function () { return request(endpoint, { method: "PUT", body: { companyId: companyId, locationId: locationId || null } }); });
    },
    createCompany: function (input) { return ensureCsrf().then(function () { return request(basePath + "/api/v1/tenant-companies", { method: "POST", body: input || {} }); }); },
    createLocation: function (companyId, input) {
      companyId = safeId(companyId);
      if (!companyId) return Promise.reject(new Error("Invalid company"));
      return ensureCsrf().then(function () { return request(basePath + "/api/v1/tenant-companies/" + encodeURIComponent(companyId) + "/locations", { method: "POST", body: input || {} }); });
    },
    invite: function (companyId, input) {
      companyId = safeId(companyId);
      if (!companyId) return Promise.reject(new Error("Invalid company"));
      return ensureCsrf().then(function () { return request(basePath + "/api/v1/tenant-companies/" + encodeURIComponent(companyId) + "/invitations", { method: "POST", body: input || {} }); });
    },
  };
})(window);
