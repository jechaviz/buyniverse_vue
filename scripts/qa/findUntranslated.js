const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

const i18nScope = {
  navigator: { language: "es-MX" },
  localStorage: { getItem: () => "es", setItem: () => {}, removeItem: () => {} },
  dispatchEvent: () => {},
  CustomEvent: function (t, i) { this.type = t; this.detail = i?.detail; },
};

new Function("window", read("../lib/web-common/browser.js"))(i18nScope);
new Function("window", read("app/i18n/core.js"))(i18nScope);
new Function("window", read("app/i18n/marketplace.js"))(i18nScope);
new Function("window", read("app/i18n/fiscal.js"))(i18nScope);
new Function("window", read("app/i18n/procurement.js"))(i18nScope);
new Function("window", read("app/i18n.js"))(i18nScope);

const t = i18nScope.BuyniverseI18n.t;

function walk(dir) {
  let res = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, f.name);
    if (f.isDirectory() && f.name !== "node_modules" && f.name !== ".git") {
      res.push(...walk(fp));
    } else if (f.name.endsWith(".vue")) {
      res.push(fp);
    }
  }
  return res;
}

const vueFiles = walk(root);
const untranslated = [];

const whitelist = new Set([
  "Buyniverse", "Finkok", "SW Sapien", "Total", "Subtotal", "CFDI 4.0",
  "USD", "MXN", "EUR", "B2B", "RFQ", "RFP", "RFI", "PO", "PR", "ID",
  "SKU", "API", "VAT", "SAT", "PDF", "CSV", "UUID", "RFC", "CURP",
  "NDA", "SLA", "ESG", "KPI", "ROI", "OAuth", "SSO", "SaaS", "UnoCSS",
  "Vue", "JavaScript", "HTML", "CSS", "JSON", "Node", "TypeScript",
  "Incoterm", "Net 15", "Net 30", "Net 45", "Net 60", "Control",
  "+60 sec", "Brief", "Marketing",
]);

for (const f of vueFiles) {
  const rel = path.relative(root, f).replace(/\\/g, "/");
  const content = fs.readFileSync(f, "utf8");

  const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/);
  if (!templateMatch) continue;
  const tmpl = templateMatch[1];

  const textNodes = [...tmpl.matchAll(/>([^<{][^<]*)</g)]
    .map((m) => m[1].replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 1 && /[a-zA-Z]/.test(s) && !/^([A-Z0-9_-]+|Ctrl K|ESC)$/.test(s));

  const attrs = [...tmpl.matchAll(/(?:placeholder|title|aria-label)=["']([^"']+)["']/g)]
    .map((m) => m[1].trim())
    .filter((s) => s.length > 1 && /[a-zA-Z]/.test(s));

  const allStrings = [...new Set([...textNodes, ...attrs])];
  for (const str of allStrings) {
    const trans = t(str);
    if (trans === str && !whitelist.has(str)) {
      untranslated.push({ file: rel, text: str });
    }
  }
}

console.log("Total untranslated strings found: " + untranslated.length);
const grouped = {};
for (const u of untranslated) {
  if (!grouped[u.file]) grouped[u.file] = [];
  grouped[u.file].push(u.text);
}
console.log(JSON.stringify(grouped, null, 2));
