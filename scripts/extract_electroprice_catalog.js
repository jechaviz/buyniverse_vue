#!/usr/bin/env node
/**
 * Builds the demo's ElectroPrice catalog from its real data.
 *
 * ElectroPrice (electroprice.appniverse.com) is a real seller of electronics in Mexico and, in Buyniverse, the supplier with
 * a price list for hardware. Its catalog comes from its wholesale providers. This reads the provider captures kept in the
 * electroprice-ec repository and writes the WHOLE catalog (about 20,000 distinct products, in stock or not) as shards the
 * demo loads on demand:
 *
 *   app/data/electroprice/index.json         groups and counts
 *   app/data/electroprice/<group>.json       the products of one group: [sku, name, brand, price, reference, stock, specs, photo]
 *   scripts/data/electroprice-costs.json     sku -> cost, only for QA (never served)
 *
 * The captured prices are what ElectroPrice pays. The price in the shards is that cost plus a 35% markup, so a volume
 * negotiation still leaves 10-15% over cost; the cost itself never leaves this repository's scripts/ folder. Nothing about the
 * products is invented. The wholesalers' names appear nowhere in the output. The captures are large and live outside this
 * repository, so this runs by hand when the catalog should be refreshed.
 *
 *   node scripts/extract_electroprice_catalog.js [path-to-electroprice-ec/out]
 */
const fs = require("fs");
const path = require("path");

const OUT = process.argv[2] || process.env.ELECTROPRICE_OUT || "C:/git/customers/bu/electroprice-ec/out";
const SHARDS = path.join(__dirname, "..", "app", "data", "electroprice");
const COSTS = path.join(__dirname, "data", "electroprice-costs.json");
const MARKUP = 0.35;
const read = (name) => JSON.parse(fs.readFileSync(path.join(OUT, name), "utf8").replace(/^\uFEFF/, "")).rows;

const rows = [...read("cva-proof-20260519.json"), ...read("ctonline-proof-20260520.json")];
// The one exchange rate in the captures (the provider's own); every USD price is converted with it.
const RATE = rows.map((r) => Number(r.ctonline_exchange_rate)).find((n) => n > 10 && n < 40) || 17.5;
const clean = (s) => String(s || "").replace(/\s+/g, " ").trim();
const mxn = (r) => r.currency === "USD" ? Number(r.price) * RATE : r.currency === "MXN" ? Number(r.price) : NaN;
const key = (r) => clean(r.manufacturer_sku || r.provider_part_number || r.provider_sku).toUpperCase();
const sell = (cost) => Math.round(cost * (1 + MARKUP) * 100) / 100;

// Groups: [key, label, test(category + subcategory, title)]. First match wins; the last one takes the rest.
const GROUPS = [
  ["services", "Warranties & services", (c, t) => /POLIZ|P[OÓ]LIZA|GARANT[IÍ]A EXT|SERVICIO/i.test(c) || /^(P[OÓ]LIZA|GARANT[IÍ]A|\d ?YR|\d ?A[ÑN]OS?)\b/i.test(t)],
  ["software", "Software", (c) => /SOFTWARE/i.test(c)],
  ["consumables", "Consumables & supplies", (c) => /CONSUMIBLES|Papeler|Accesorios para Impresi|Accesorios y Consumibles/i.test(c) && !/POS/i.test(c)],
  ["printers", "Printers & scanners", (c) => /IMPRESORA|MULTIFUNCIONAL|Impresi[oó]n|SCANNER|Digitalizaci|IMPRESI/i.test(c)],
  ["servers", "Servers", (c) => /SERVIDORES|Solucion para servidores|Centro de Datos|Accesorios para Servidores/i.test(c)],
  ["laptops", "Laptops", (c, t) => /PORTATIL/i.test(c) || (/Computadoras|Apple/i.test(c) && /LAPTOP|NOTEBOOK|MACBOOK|PORT[AÁ]TIL|THINKPAD|IDEAPAD|VIVOBOOK|ZENBOOK|INSPIRON|LATITUDE|PROBOOK|ELITEBOOK/i.test(t))],
  ["desktops", "Desktops", (c) => /PC.?S$|Computadoras|Computadoras Gaming/i.test(c) && !/Ensamble/i.test(c)],
  ["monitors", "Monitors", (c, t) => /MONITORES/i.test(c) || /^MONITOR\b/i.test(t)],
  ["displays", "Displays & TVs", (c) => /TELEVISOR|VIDEOPROYECTOR|Se[ñn]alizaci[oó]n/i.test(c)],
  ["keyboards", "Keyboards & mice", (c) => /TECLADO|MOUSE/i.test(c)],
  ["power", "Power & UPS", (c) => /ENERGIA|Energ[ií]a|Respaldo y Regulaci|Bater[ií]as|Modulos Supresores/i.test(c)],
  ["networking", "Networking", (c) => /REDES|Red Activa|Red Pasiva/i.test(c)],
  ["cables", "Cables & adapters", (c) => /CABLES|Cables|Adaptadores/i.test(c)],
  ["storage", "Storage", (c, t) => /DISCOS|ALMACENAMIENTO|Almacenamiento/i.test(c) || (/MEMORIAS/i.test(c) && !/\bDDR|\bRAM\b|SODIMM|DIMM/i.test(t))],
  ["tablets", "Tablets", (c) => /TABLETAS|Tablet/i.test(c)],
  ["audio", "Audio & headsets", (c) => /AUDIFONOS|Audio|BOCINAS|VIDEOCONFERENCIA/i.test(c)],
  ["security", "Security & access", (c) => /CAMARAS|Video Vigilancia|VIDEOGRABADORES|Seguridad|CONTROL DE ACCESO|Sistemas de Control|SMART HOME|VIDEO$/i.test(c)],
  ["phones", "Phones", (c) => /TELEFONIA|Tel[eé]fonos/i.test(c)],
  ["pos", "POS & retail", (c) => /POS/i.test(c)],
  ["gaming", "Gaming", (c) => /Gaming/i.test(c)],
  ["components", "Components", (c) => /PROCESADORES|TARJETA MADRE|GABINETES|VENTILADORES|Accesorios para Componentes|Tarjetas|Ensamble|MEMORIAS/i.test(c)],
  ["other", "Accessories & other", () => true],
];
// The main device groups hold devices: a battery "for MacBook", a lanyard or a stand that the provider filed under laptops goes to
// accessories. A device is named by its type first ("Laptop Dell ...", "Monitor AOC ..."); anything else in these groups is an accessory.
const DEVICE_GROUPS = new Set(["laptops", "desktops", "monitors", "tablets", "phones", "printers", "displays", "servers"]);
const DEVICE_START = /^(LAPTOP|LAPTOPS|NOTEBOOK|COMPUTADORA|COMPUTADORAS|PC\b|PCS\b|MINI ?PC|ALL[ -]?IN[ -]?ONE|MONITOR|MONITORES|TABLET|TABLETA|IPAD|IMPRESORA|MULTIFUNCIONAL|ESC[AÁ]NER|ESCANER|SERVIDOR|SERVER|TELEVISOR|TELEVISI[OÓ]N|SMART TV|TV\b|PANTALLA|PROYECTOR|VIDEOPROYECTOR|CELULAR|SMARTPHONE|TEL[EÉ]FONO|MACBOOK|WORKSTATION|ESTACI[OÓ]N DE TRABAJO|PLOTTER|SISTEMA|EQUIPO|PORT[AÁ]TIL|PUNTO DE VENTA|KIOSCO)/i;
const groupOf = (row) => { const c = clean(row.category) + " " + clean(row.subcategory), t = clean(row.source_title || row.normalized_title); const key = GROUPS.find(([, , test]) => test(c, t))[0]; return DEVICE_GROUPS.has(key) && !DEVICE_START.test(t) ? "other" : key; };

const SMALL = new Set(["PC", "USB", "LED", "LCD", "SSD", "HDD", "NAS", "UPS", "RAM", "DDR4", "DDR5", "HDMI", "WIFI", "IP", "NVR", "DVR", "TV", "4K", "HD", "RJ45", "POE", "PCIE", "AMD", "HP", "LG", "AOC", "MSI", "VGA", "SFP", "LTE", "ATX", "RGB", "OEM"]);
const LOWER = new Set(["PARA", "CON", "SIN", "DE", "DEL", "LA", "EL", "Y", "EN", "POR", "O", "A", "LOS", "LAS", "UN", "UNA"]);
const titleCase = (text) => clean(text).split(" ").map((w, i) => {
  if (!/[A-ZÁÉÍÓÚÑ]/.test(w) || /[a-záéíóúñ]/.test(w)) return w;
  if (i > 0 && LOWER.has(w)) return w.toLowerCase();
  if (/\d/.test(w) || w.length <= 3 || SMALL.has(w)) return w;
  return w.charAt(0) + w.slice(1).toLowerCase();
}).join(" ");
const SINGULAR = { laptops: "Laptop", monitores: "Monitor", impresoras: "Impresora", computadoras: "Computadora" };
const tidy = (text) => {
  const words = clean(text).replace(/^(Laptops|Monitores|Impresoras|Computadoras)\b/i, (m) => SINGULAR[m.toLowerCase()]).split(" ");
  const joined = words.filter((w, i) => !(i > 0 && w.toLowerCase() === words[i - 1].toLowerCase())).join(" ");
  return joined.length <= 100 ? joined : joined.slice(0, 100).replace(/\s+\S*$/, "");
};
const sentence = (text) => { const d = clean(text).split(/(?<=[.;])\s/)[0].replace(/[.;]+$/, "").slice(0, 140); return d.length >= 12 ? d.charAt(0) + d.slice(1).toLowerCase() : ""; };
// A photo is a short token, not a URL: "t<path>" is a photo on the seller's image host, "v<id>" one on its second source.
// The first is preferred (larger). Products with no usable photo get "".
const photoOf = (list) => {
  for (const r of list) { const m = /^https:\/\/static\.ctonline\.mx\/imagenes\/([A-Za-z0-9._\-/]+\.(?:jpg|png))$/.exec(clean(r.image_url)); if (m && r.image_status === "valid") return "t" + m[1]; }
  for (const r of list) { const m = /fProd=(\d+)$/.exec(clean(r.image_url)); if (m && r.image_status === "valid") return "v" + m[1]; }
  return "";
};
const SKIP_SPEC = /^Color del producto$|^Peso$|^Anchura|^Altura|^Profundidad|^C[oó]digo|^Ancho|^Alto|^Largo|^Dimensiones/i;

const byKey = new Map();
for (const row of rows) {
  const price = mxn(row), id = key(row);
  if (!(price >= 10 && price <= 2000000) || !clean(row.brand) || id.length < 3) continue;
  const entry = byKey.get(id) || { id, rows: [] };
  entry.rows.push({ ...row, mxn: price });
  byKey.set(id, entry);
}

const shards = {}, costs = {};
for (const { id, rows: list } of byKey.values()) {
  const stocked = list.filter((r) => Number(r.stock) > 0 && r.stock_status !== "out_of_stock");
  const pool = stocked.length ? stocked : list;
  const cost = Math.min(...pool.map((r) => r.mxn));
  const top = Math.max(...pool.map((r) => r.mxn));
  const best = pool.find((r) => r.mxn === cost);
  const richest = list.find((r) => Array.isArray(r.specifications) && r.specifications.length >= 2) || best;
  const brandRaw = clean(best.brand), brand = brandRaw.length <= 3 ? brandRaw.toUpperCase() : titleCase(brandRaw);
  const specs = {};
  (richest.specifications || []).filter((s) => s.tipo && s.valor && String(s.valor).length <= 60 && clean(s.tipo).length <= 38 && !SKIP_SPEC.test(clean(s.tipo))).slice(0, 9).forEach((s) => { specs[clean(s.tipo)] = clean(s.valor); });
  if (!Object.keys(specs).length) { const about = sentence(best.description); if (about) specs.about = about; }
  const model = clean(best.manufacturer_model || best.manufacturer_sku || id);
  const group = groupOf(best);
  (shards[group] = shards[group] || []).push([
    id, tidy(titleCase(clean(best.source_title || best.normalized_title))), brand, sell(cost), sell(top), stocked.length ? Math.min(9999, Math.max(...stocked.map((r) => Number(r.stock) || 0))) : 0, { model, ...specs }, photoOf(list),
  ]);
  costs[id] = Math.round(cost * 100) / 100;
}

fs.rmSync(SHARDS, { recursive: true, force: true });
fs.mkdirSync(SHARDS, { recursive: true });
fs.mkdirSync(path.dirname(COSTS), { recursive: true });
const index = { supplier: "ElectroPrice", site: "https://electroprice.appniverse.com", currency: "MXN", markup: MARKUP, total: 0, groups: [] };
for (const [gkey, label] of GROUPS.map((g) => [g[0], g[1]])) {
  const list = (shards[gkey] || []).sort((a, b) => a[1].localeCompare(b[1], "es"));
  if (!list.length) continue;
  fs.writeFileSync(path.join(SHARDS, gkey + ".json"), JSON.stringify(list));
  index.groups.push({ key: gkey, label, count: list.length, inStock: list.filter((r) => r[5] > 0).length });
  index.total += list.length;
}
fs.writeFileSync(path.join(SHARDS, "index.json"), JSON.stringify(index));
fs.writeFileSync(COSTS, JSON.stringify(costs));
const all = Object.values(shards).flat();
console.log(`photos: ${all.filter((r) => r[7]).length}/${all.length}, with 3+ specifications: ${all.filter((r) => Object.keys(r[6]).length >= 4).length}`);
const mb = fs.readdirSync(SHARDS).reduce((n, f) => n + fs.statSync(path.join(SHARDS, f)).size, 0) / 1048576;
console.log(`wrote ${index.total} products in ${index.groups.length} groups (${mb.toFixed(1)} MB, usd rate ${RATE})\n` + index.groups.map((g) => `  ${g.key}: ${g.count} (${g.inStock} in stock)`).join("\n"));
