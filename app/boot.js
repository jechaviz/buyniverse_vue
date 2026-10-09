(function (document) {
  "use strict";

  // Where the app is mounted. The demo lives under /demo/ of the same host; it
  // is reached only through that path (the server serves it without any API,
  // session or database) and the client treats nothing else as demo.
  var path = (document.defaultView && document.defaultView.location.pathname) || "";
  var sub = path.indexOf("/buyniverse_vue/") === 0 || path === "/buyniverse_vue" ? "/buyniverse_vue" : "";
  var rest = path.slice(sub.length);
  var demo = rest === "/demo" || rest.indexOf("/demo/") === 0;
  document.defaultView.BuyniverseBase = Object.freeze({ sub: sub, demo: demo, prefix: sub + (demo ? "/demo" : ""), root: sub + (demo ? "/demo/" : "/") });

  // The demo shares its origin (and therefore cookies) with the real product,
  // so it must never reach the real API: refuse every same-origin /api/ call.
  var realFetch = demo && document.defaultView.fetch;
  if (realFetch) {
    document.defaultView.fetch = function (input, init) {
      try {
        var target = new URL(typeof input === "string" ? input : (input && input.url) || "", document.defaultView.location.href);
        if (target.origin === document.defaultView.location.origin && /(^|\/)api(\/|$)/.test(target.pathname))
          return Promise.reject(new TypeError("The demo has no server."));
      } catch (_) { /* a malformed URL fails in fetch itself */ }
      return realFetch.call(this, input, init);
    };
  }

  // Apply visual preferences before the first stylesheet paints. Vue applies
  // the same values later; this only prevents a light/red frame from flashing.
  var root = document.documentElement;
  var palette = {
    cosmos: ["#3f6af2", "#2f55d4", "#eef3ff", "#dbe6ff"],
    red: ["#e5484d", "#c9363c", "#fff1f1", "#ffe3e3"],
    violet: ["#7c3aed", "#6d28d9", "#f5f3ff", "#ede9fe"],
    blue: ["#2563eb", "#1d4ed8", "#eff6ff", "#dbeafe"],
    teal: ["#0f766e", "#115e59", "#f0fdfa", "#ccfbf1"],
    orange: ["#ea580c", "#c2410c", "#fff7ed", "#ffedd5"],
    pink: ["#db2777", "#be185d", "#fdf2f8", "#fce7f3"],
  };

  var theme = "dark";
  var accent = "cosmos";
  try {
    theme = localStorage.getItem("buyniverse-vue-theme") || "dark";
    accent = localStorage.getItem("buyniverse-vue-accent") || "cosmos";
  } catch (_) {
    // Privacy tools can make Storage unavailable. The accessible defaults stay intact.
  }

  root.dataset.appReady = "false";
  root.classList.toggle("dark", theme !== "light");
  var colors = palette[accent] || palette.cosmos;
  root.style.setProperty("--accent", colors[0]);
  root.style.setProperty("--accent-deep", colors[1]);
  root.style.setProperty("--accent-soft", colors[2]);
  root.style.setProperty("--accent-pale", colors[3]);
})(document);
