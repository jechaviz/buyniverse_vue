(function (global) {
  "use strict";

  // Demo is an explicit runtime mode. A missing endpoint must never turn a
  // public deployment into a demo; only local previews can fall back to it.
  var basePath = global.location.pathname.startsWith("/buyniverse_vue/") ? "/buyniverse_vue" : "";
  var localHost = /^(?:localhost|127\.0\.0\.1|\[::1\]|::1)$/i.test(global.location.hostname || "");
  // Production and demo are separate deployments. A networked host takes its
  // mode only from the server, which decides by host; a URL hint can never turn
  // a production site into a demo. The demo is entered through /demo, which the
  // server forwards to the operator's demo host (or refuses).
  var fallbackMode = global.location.protocol === "file:" || localHost ? "demo" : "production";
  var runtime = { mode: fallbackMode, endpoint: basePath + "/api/v1/runtime", demoEntry: basePath + "/demo", demoAvailable: false };

  // The sample data exists only in a demo: it is fetched on demand after the
  // server confirmed the mode, and a production host refuses to serve it.
  function loadFixture(result) {
    if (runtime.mode !== "demo" || global.BuyniverseDemo) return Promise.resolve(result);
    return new Promise(function (resolve, reject) {
      var script = global.document.createElement("script");
      script.src = "app/data/demo.js?v=10";
      script.onload = function () { resolve(result); };
      script.onerror = function () { reject(new Error("Demo fixture unavailable")); };
      global.document.head.appendChild(script);
    });
  }

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
        runtime.demoAvailable = runtime.mode !== "demo" && payload && payload.demoAvailable === true;
        return { mode: runtime.mode, serverAuth: payload && payload.serverAuth === true, demoAvailable: runtime.demoAvailable };
      })
      .then(loadFixture)
      .catch(function () {
        // Local static previews intentionally remain useful. Every networked
        // host fails closed into production mode if its policy cannot load.
        runtime.mode = fallbackMode;
        return loadFixture({ mode: runtime.mode, serverAuth: runtime.mode === "production" });
      });
  };

  global.BuyniverseRuntime = runtime;
})(typeof window !== "undefined" ? window : globalThis);
