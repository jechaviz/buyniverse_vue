#!/usr/bin/env node
/**
 * Curates a real sample of ElectroPrice's catalog for the demo.
 *
 * ElectroPrice (electroprice.appniverse.com) is a real Mexican electronics seller whose catalog comes from its
 * wholesale providers. This reads the provider price captures kept in the electroprice-ec repo and writes a small,
 * deterministic selection (real products, real brands and part numbers, real prices and stock, real specifications
 * where the capture has them) to scripts/data/electroprice-catalog.json. scripts/build_demo_catalog.js turns that
 * file into the demo's catalog. Nothing is invented here; the choice of which products to keep is the only decision.
 *
 *   node scripts/extract_electroprice_catalog.js [path-to-electroprice-ec/out]
 *
 * The captures are large and live outside this repository, so this is run by hand when the sample should change.
 * Provider names never leave this script: the demo shows ElectroPrice as the supplier.
 */
const fs = require("fs");
const path = require("path");

const OUT = process.argv[2] || process.env.ELECTROPRICE_OUT || "C:/git/customers/bu/electroprice-ec/out";
const target = path.join(__dirname, "data", "electroprice-catalog.json");
const read = (name) => JSON.parse(fs.readFileSync(path.join(OUT, name), "utf8").replace(/^\uFEFF/, "")).rows;

const cva = read("cva-proof-20260519.json");
const ct = read("ctonline-proof-20260520.json");
// The one exchange rate in the captures (the provider's own); every USD price is converted with it.
const RATE = ct.map((r) => Number(r.ctonline_exchange_rate)).find((n) => n > 10 && n < 40) || 17.5;

const hash = (text) => { let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
const clean = (s) => String(s || "").replace(/\s+/g, " ").trim();
const mxn = (row) => row.currency === "USD" ? Number(row.price) * RATE : row.currency === "MXN" ? Number(row.price) : NaN;
const key = (row) => clean(row.manufacturer_sku || row.provider_part_number || row.provider_sku).toUpperCase();

// Which of our groups a product belongs to. Each rule sees the provider category, subcategory and title.
const NOT = /POLIZA|P[OÓ]LIZA|GARANT[IÍ]A|REFACCI|REPUESTO|BATER[IÍ]A DE REPUESTO|LICENCIA ?CAL|SERVICIO DE|INSTALACI[OÓ]N|CARTUCHO|T[OÓ]NER|TINTA|PAPEL|ETIQUETA|CINTA|MOCHILA|LIMPIEZA|SOPORTE|BASE PARA|CHAROLA|CHAROLA|CHAROLA|MONTAJE|BRAZO|ADAPTADOR DE CORRIENTE|CARGADOR/i;
const GROUPS = [
  ["Monitors", (c, s, t) => /^MONITOR|\bMONITOR\b/i.test(t) && /MONITORES|Monitores|Electr[oó]nica|Video|Computo|C[oó]mputo/i.test(c + " " + s) && !/CABLE|SOPORTE|CHAROLA|BASE/i.test(t)],
  ["Laptops", (c, s, t) => /PORTATIL|Computadoras|Apple/i.test(c) && /LAPTOP|NOTEBOOK|PORT[AÁ]TIL|MACBOOK|THINKPAD|IDEAPAD|LATITUDE|PROBOOK|ELITEBOOK|VIVOBOOK|INSPIRON|ZENBOOK/i.test(t)],
  ["Desktops", (c, s, t) => /PC|Computadoras|Ensamble/i.test(c) && /MINI ?PC|ALL IN ONE|ALL-IN-ONE|DESKTOP|ESCRITORIO|WORKSTATION|OPTIPLEX|THINKCENTRE|PRODESK|MAC MINI/i.test(t) && !/GAMING|GAMER/i.test(t)],
  ["Printers", (c, s, t) => /IMPRESORA|MULTIFUNCIONAL|Impresi[oó]n|SCANNER|Digitalizaci/i.test(c + " " + s) && /IMPRESORA|MULTIFUNCIONAL|ESC[AÁ]NER|ESCANER|PLOTTER/i.test(t)],
  ["Keyboards & mice", (c, s, t) => /TECLADO|MOUSE|Perif[eé]ricos|Accesorios para C[oó]mputo/i.test(c + " " + s) && /^(TECLADO|MOUSE|KIT|COMBO)|TECLADO Y MOUSE|MOUSE|TECLADO/i.test(t) && !/POS|GAMING|GAMER|FUNDA|PAD/i.test(t)],
  ["Networking", (c, s, t) => /REDES|Red Activa/i.test(c) && /SWITCH|ROUTER|ACCESS POINT|PUNTO DE ACCESO|FIREWALL|ANTENA|GATEWAY/i.test(t)],
  ["Storage", (c, s, t) => /DISCOS|ALMACENAMIENTO|Almacenamiento|MEMORIAS/i.test(c) && /SSD|DISCO DUR|UNIDAD DE ESTADO|NAS|USB|MICROSD|MEMORIA/i.test(t) && !/TARJETA MADRE|CABLE/i.test(t)],
  ["Power & UPS", (c, s, t) => /ENERGIA|Respaldo|Energ[ií]a/i.test(c) && /NO BREAK|UPS|REGULADOR|SUPRESOR/i.test(t)],
  ["Tablets", (c, s, t) => /TABLETAS|Tablet/i.test(c) && /TABLET|IPAD/i.test(t)],
  ["Headsets & webcams", (c, s, t) => /AUDIFONOS|Audio|VIDEOCONFERENCIA|Perif[eé]ricos|C[AÁ]MARAS WEB/i.test(c + " " + s) && /AUDIFONO|DIADEMA|HEADSET|WEBCAM|C[AÁ]MARA WEB/i.test(t)],
  ["Docks & cables", (c, s, t) => /ACCESORIOS|CABLES|Adaptadores|Cables|Accesorios para C[oó]mputo/i.test(c + " " + s) && /\bDOCK|\bHUB\b|DOCKING|ADAPTADOR USB|CABLE (HDMI|USB|DISPLAYPORT)/i.test(t)],
  ["Displays & TVs", (c, s, t) => /TELEVISOR|VIDEOPROYECTOR|Se[ñn]alizaci[oó]n|Electr[oó]nica/i.test(c + " " + s) && /TELEVISOR|PANTALLA|PROYECTOR|TV\b|SMART TV/i.test(t) && !/SOPORTE|CONTROL REMOTO|CABLE/i.test(t)],
  ["Phones", (c, s, t) => /TELEFONIA|Tel[eé]fonos/i.test(c) && /SMARTPHONE|CELULAR|TEL[EÉ]FONO IP|TELEFONO IP/i.test(t)],
  ["Security cameras", (c, s, t) => /CAMARAS|Video Vigilancia|VIDEOGRABADORES/i.test(c) && /C[AÁ]MARA|CAMARA|NVR|DVR/i.test(t) && /(DOMO|BALA|BULLET|DOME|NVR|DVR|IP)/i.test(t)],
  ["Components", (c, s, t) => /PROCESADORES|TARJETA MADRE|MEMORIAS|Accesorios para Componentes|Tarjetas|GABINETES/i.test(c + " " + s) && /PROCESADOR|TARJETA MADRE|MEMORIA RAM|DDR[345]|TARJETA DE VIDEO|FUENTE DE PODER/i.test(t)],
  ["Software", (c, s, t) => /SOFTWARE|Software/i.test(c) && /OFFICE|MICROSOFT|WINDOWS|ANTIVIRUS|ACROBAT|365|ESET|KASPERSKY|NORTON/i.test(t)],
  ["Servers", (c, s, t) => /SERVIDORES|Solucion para servidores|Centro de Datos/i.test(c) && /SERVIDOR|SERVER/i.test(t)],
];
const FLOOR = { Monitors: 1200, Laptops: 6000, Desktops: 3500, Printers: 900, Tablets: 1500, Phones: 1800, "Displays & TVs": 2800, Servers: 9000, "Power & UPS": 600, Storage: 350, "Security cameras": 350, Software: 300, "Docks & cables": 150, Networking: 150, Components: 300, "Headsets & webcams": 150, "Keyboards & mice": 90 };
const WANT = { Monitors: 14, Laptops: 14, Desktops: 10, Printers: 14, "Keyboards & mice": 12, Networking: 14, Storage: 14, "Power & UPS": 10, Tablets: 8, "Headsets & webcams": 10, "Docks & cables": 10, "Displays & TVs": 8, Phones: 6, "Security cameras": 8, Components: 10, Software: 8, Servers: 6 };

const groupOf = (row) => { const t = clean(row.source_title || row.normalized_title); if (NOT.test(t)) return null; const g = GROUPS.find(([, test]) => test(clean(row.category), clean(row.subcategory), t)); return g ? g[0] : null; };

const small = new Set(["PC", "USB", "LED", "LCD", "SSD", "HDD", "NAS", "UPS", "RAM", "DDR4", "DDR5", "HDMI", "WIFI", "IP", "NVR", "DVR", "TV", "4K", "HD", "RJ45", "PoE", "POE", "PCIE", "AMD", "HP", "LG", "AOC", "MSI"]);
const LOWER = new Set(["PARA", "CON", "SIN", "DE", "DEL", "LA", "EL", "Y", "EN", "POR", "O"]);
const titleCase = (text) => clean(text).split(" ").map((w, i) => {
  if (!/[A-ZÁÉÍÓÚÑ]/.test(w) || /[a-záéíóúñ]/.test(w)) return w;        // already mixed case: keep
  if (i > 0 && LOWER.has(w)) return w.toLowerCase();
  if (/\d/.test(w) || w.length <= 3 || small.has(w)) return w;
  return w.charAt(0) + w.slice(1).toLowerCase();
}).join(" ");
// Singular group word, no repeated words (the capture often repeats the brand), and not longer than a card can hold.
const tidy = (text) => {
  const words = clean(text).replace(/^(Laptops|Monitores|Impresoras|Computadoras)\b/i, (m) => ({ laptops: "Laptop", monitores: "Monitor", impresoras: "Impresora", computadoras: "Computadora" })[m.toLowerCase()]).split(" ");
  const joined = words.filter((w, i) => !(i > 0 && w.toLowerCase() === words[i - 1].toLowerCase())).join(" ");
  return joined.length <= 96 ? joined : joined.slice(0, 96).replace(/\s+\S*$/, "");
};

const candidates = new Map();      // mpn -> { group, rows: [] }
for (const row of [...cva, ...ct]) {
  const price = mxn(row);
  if (!(price >= 120 && price <= 150000) || !(Number(row.stock) >= 3) || row.stock_status === "out_of_stock") continue;
  if (!clean(row.brand) || !key(row) || key(row).length < 3) continue;
  const group = groupOf(row);
  if (!group || price < (FLOOR[group] || 0)) continue;
  const id = key(row);
  const entry = candidates.get(id) || { id, group, rows: [] };
  entry.rows.push({ ...row, mxn: price });
  candidates.set(id, entry);
}

const products = [];
for (const [group, want] of Object.entries(WANT)) {
  const pool = [...candidates.values()].filter((c) => c.group === group).map((c) => {
    const withSpecs = c.rows.find((r) => Array.isArray(r.specifications) && r.specifications.length >= 3);
    return { ...c, withSpecs, score: (c.rows.length > 1 ? 2 : 0) + (withSpecs ? 1.2 : 0) + hash(c.id) };
  }).sort((a, b) => b.score - a.score);
  const brands = {};
  for (const c of pool) {
    const row = (c.withSpecs || c.rows[0]);
    const brandRaw = clean(row.brand), brand = brandRaw.length <= 3 ? brandRaw.toUpperCase() : titleCase(brandRaw);
    if ((brands[brand] || 0) >= 3 || /^(Software|Laptop|Monitor|Mouse)$/i.test(clean(row.manufacturer_model || ""))) continue;
    brands[brand] = (brands[brand] || 0) + 1;
    const prices = c.rows.map((r) => r.mxn);
    const best = Math.min(...prices), top = Math.max(...prices);
    const specs = { brand, model: clean(row.manufacturer_model || row.manufacturer_sku || c.id) };
    const list = (row.specifications || []).filter((s) => s.tipo && s.valor && String(s.valor).length <= 60 && clean(s.tipo).length <= 38 && !/^Color del producto$|^Peso$|^Anchura|^Altura|^Profundidad|^C[oó]digo/i.test(clean(s.tipo))).slice(0, 6);
    list.forEach((s) => { specs[clean(s.tipo)] = clean(s.valor); });
    if (!list.length) { const d = clean(row.description).split(/[.;]/)[0]; if (d && d.length >= 12 && d.length <= 140) specs.about = d.charAt(0) + d.slice(1).toLowerCase(); }
    products.push({
      group, sku: c.id, name: tidy(titleCase(clean(row.source_title || row.normalized_title))), brand, specs,
      price: Math.round(best * 100) / 100, reference: Math.round(top * 100) / 100, stock: Math.min(999, Math.max(...c.rows.map((r) => Number(r.stock) || 0))),
      sources: c.rows.length,
    });
    if (products.filter((p) => p.group === group).length >= want) break;
  }
}
products.sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify({
  supplier: "ElectroPrice", site: "https://electroprice.appniverse.com", currency: "MXN", usdRate: RATE,
  note: "Real products, brands, part numbers, prices and stock captured from ElectroPrice's wholesale providers, May 2026. Prices before tax. USD prices converted at usdRate.",
  products,
}, null, 1) + "\n");
const counts = {}; products.forEach((p) => { counts[p.group] = (counts[p.group] || 0) + 1; });
console.log(`wrote ${products.length} products to ${path.relative(process.cwd(), target)}\n` + Object.entries(counts).map(([k, v]) => `  ${k}: ${v}`).join("\n"));
