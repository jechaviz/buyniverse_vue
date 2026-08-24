(function (global) {
  "use strict";

  // Demo is an explicit runtime mode. A missing endpoint must never turn a
  // public deployment into a demo; only local previews can fall back to it.
  var basePath = global.location.pathname.startsWith("/buyniverse_vue/") ? "/buyniverse_vue" : "";
  var localHost = /^(?:localhost|127\.0\.0\.1|\[::1\]|::1)$/i.test(global.location.hostname || "");
  var fallbackMode = global.location.protocol === "file:" || localHost ? "demo" : "production";
  var runtime = { mode: fallbackMode, endpoint: basePath + "/api/v1/runtime" };

  runtime.load = function () {
    return fetch(runtime.endpoint, {
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
      headers: { Accept: "application/json" },
    })
      .then(function (response) {
        if (!response.ok) throw new Error("Runtime policy unavailable");
        return response.json();
      })
      .then(function (payload) {
        runtime.mode = payload && payload.mode === "demo" ? "demo" : "production";
        return { mode: runtime.mode, serverAuth: payload && payload.serverAuth === true };
      })
      .catch(function () {
        // Local static previews intentionally remain useful. Every networked
        // host fails closed into production mode if its policy cannot load.
        runtime.mode = fallbackMode;
        return { mode: runtime.mode, serverAuth: runtime.mode === "production" };
      });
  };

  global.BuyniverseRuntime = runtime;
})(typeof window !== "undefined" ? window : globalThis);
