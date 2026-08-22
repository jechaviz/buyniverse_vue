(function (document) {
  "use strict";

  // Ensure base tag handles subfolder if running on /buyniverse_vue/ in local dev
  var base = document.querySelector("base");
  if (base && window.location.pathname.startsWith("/buyniverse_vue")) {
    base.href = "/buyniverse_vue/";
  }

  // Apply visual preferences before the first stylesheet paints. Vue applies
  // the same values later; this only prevents a light/red frame from flashing.
  var root = document.documentElement;
  var palette = {
    red: ["#e5484d", "#c9363c", "#fff1f1", "#ffe3e3"],
    violet: ["#7c3aed", "#6d28d9", "#f5f3ff", "#ede9fe"],
    blue: ["#2563eb", "#1d4ed8", "#eff6ff", "#dbeafe"],
    teal: ["#0f766e", "#115e59", "#f0fdfa", "#ccfbf1"],
    orange: ["#ea580c", "#c2410c", "#fff7ed", "#ffedd5"],
    pink: ["#db2777", "#be185d", "#fdf2f8", "#fce7f3"],
  };

  var theme = "dark";
  var accent = "red";
  try {
    theme = localStorage.getItem("buyniverse-vue-theme") || "dark";
    accent = localStorage.getItem("buyniverse-vue-accent") || "red";
  } catch (_) {
    // Privacy tools can make Storage unavailable. The accessible defaults stay intact.
  }

  root.dataset.appReady = "false";
  root.classList.toggle("dark", theme !== "light");
  var colors = palette[accent] || palette.red;
  root.style.setProperty("--accent", colors[0]);
  root.style.setProperty("--accent-deep", colors[1]);
  root.style.setProperty("--accent-soft", colors[2]);
  root.style.setProperty("--accent-pale", colors[3]);
})(document);
