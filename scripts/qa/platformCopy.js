// Spanish copy of the platform screens and the new menu: every visible string must
// have a translation (the product is bilingual; English is the key, Spanish is shown).
"use strict";
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const scope = { navigator: { language: "es-MX" }, localStorage: { getItem: () => "es", setItem() {}, removeItem() {} }, dispatchEvent() {}, CustomEvent: function (t, i) { this.type = t; this.detail = i?.detail; } };
new Function("window", read("../lib/web-common/browser.js"))(scope);
// every dictionary the app loads, in the same order as index.html
for (const file of ["core", "common", "marketplace", "workspace", "fiscal", "procurement", "experience", "access", "need", "setup", "marketing", "rfq"]) new Function("window", read(`app/i18n/${file}.js`))(scope);
new Function("window", read("app/i18n.js"))(scope);
scope.BuyniverseI18n.setLocale("es");
const t = scope.BuyniverseI18n.t;

// the strings the new screens and menu use, as written in the source
const page = read("app/pages/PlatformPage.vue");
const nav = read("app/navigation.js");
const fromPage = [...page.matchAll(/\bt\("([^"]+)"\)/g)].map((m) => m[1]);
const fromTemplate = [...page.matchAll(/\{\{\s*t\("([^"]+)"\)\s*\}\}/g)].map((m) => m[1]);
const fromNav = [...nav.matchAll(/(?:screen\(\s*"[^"]+",\s*"[^"]+",\s*|title: |\[")("?)([A-Z][A-Za-z &()\-]+)\1/g)].map((m) => m[2]);
const labels = [...new Set([...fromPage, ...fromTemplate, ...fromNav, "Company", "Platform (SaaS)", "Companies", "Demo access", "Stamps", "Audit", "Company setup", "Platform administration"])];
const names = new Set(["Buyniverse", "Marketing"]); // a proper name, or the same word in Spanish, is not translated
const missing = labels.filter((label) => !names.has(label) && t(label) === label && /[A-Za-z]/.test(label));
if (missing.length) { console.error("Untranslated platform copy:\n  " + missing.join("\n  ")); process.exit(1); }
console.log(`[PASS] platform copy is translated (${labels.length} strings)`);
