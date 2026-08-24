(function (global) {
  "use strict";

  // The browser never supplies an account identifier to this adapter. The
  // server binds the record to its HttpOnly session and enforces CSRF itself.
  var BASE_PATH = global.location.pathname.startsWith("/buyniverse_vue/") ? "/buyniverse_vue" : "";
  var ENDPOINT = BASE_PATH + "/api/v1/workspace-state";
  var CSRF_HEADER = "X-Buyniverse-CSRF";
  var csrf = "";
  var version = 0;

  function json(response) {
    return response.text().then(function (text) {
      if (!text || text.length > 1048576) return {};
      try { return JSON.parse(text); } catch (_) { return {}; }
    });
  }

  function request(method, payload) {
    var headers = { "Accept": "application/json" };
    var body;
    if (method !== "GET") {
      headers["Content-Type"] = "application/json";
      headers["X-Buyniverse-Request"] = "workspace-state-v1";
      if (csrf) headers[CSRF_HEADER] = csrf;
      body = payload == null ? undefined : JSON.stringify(payload);
    }
    return fetch(ENDPOINT, {
      method: method,
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
      headers: headers,
      // pagehide may finish a compact save; large bodies remain normal fetches
      // because browser keepalive requests are intentionally size-limited.
      keepalive: Boolean(body && body.length <= 60000),
      body: body,
    }).then(function (response) {
      return json(response).then(function (body) {
        if (!response.ok) {
          var error = new Error(body.error || "Workspace persistence is unavailable.");
          error.status = response.status;
          error.body = body;
          throw error;
        }
        return body;
      });
    });
  }

  function load() {
    return request("GET").then(function (body) {
      csrf = typeof body.csrf === "string" ? body.csrf : "";
      version = Number.isSafeInteger(body.version) && body.version >= 0 ? body.version : 0;
      return { state: body.state || null, version: version, mode: body.mode === "demo" ? "demo" : "production", context: body.context || null };
    });
  }

  function save(state) {
    return request("PUT", { state: state, version: version }).then(function (body) {
      csrf = typeof body.csrf === "string" ? body.csrf : csrf;
      version = Number.isSafeInteger(body.version) && body.version >= 0 ? body.version : version;
      return { version: version, savedAt: body.savedAt || new Date().toISOString(), context: body.context || null };
    });
  }

  global.BuyniverseWorkspaceState = { load: load, save: save, endpoint: ENDPOINT };
})(typeof window !== "undefined" ? window : globalThis);
