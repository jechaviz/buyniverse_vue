(function (global) {
  "use strict";

  // Production and demo are separate: the demo is the /demo/ path of the same
  // host, served by the server with no API, no session and no database, and it
  // runs only from the sanitized client fixture. Anywhere else a networked host
  // takes its mode from the server and fails closed into production; a query
  // string can never turn it into a demo. Local previews may fall back to demo.
  var base = global.BuyniverseBase;
  var localHost = /^(?:localhost|127\.0\.0\.1|\[::1\]|::1)$/i.test(global.location.hostname || "");
  var fallbackMode = base.demo || global.location.protocol === "file:" || localHost ? "demo" : "production";
  var runtime = { mode: fallbackMode, endpoint: base.sub + "/api/v1/runtime", demoEntry: base.sub + "/demo/", demoAvailable: false, inDemo: base.demo };

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
    if (base.demo) {
      // Under /demo/ there is nothing to ask the server: no API exists there.
      runtime.mode = "demo";
      return loadFixture({ mode: "demo", serverAuth: false, demoAvailable: false });
    }
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
