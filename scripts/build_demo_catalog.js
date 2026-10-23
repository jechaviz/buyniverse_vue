#!/usr/bin/env node
/**
 * Builds the demo's hardware catalog: what a buyer puts on a shopping list.
 *
 * The products are real. ElectroPrice (electroprice.appniverse.com) is a real seller of electronics in Mexico and, in
 * Buyniverse, the supplier with a price list for hardware: scripts/data/electroprice-catalog.json is a curated sample of
 * its catalog (real products, brands, part numbers, prices, stock and specifications; see
 * scripts/extract_electroprice_catalog.js). Nothing about the products is invented here.
 *
 * The other hardware suppliers of the demo are fictional and have no price list: they answer a quick quote. They exist
 * because a quote round and a live round need rivals, and the virtual people (scripts/build_demo_cast.js) play them.
 *
 *   node scripts/build_demo_catalog.js          rewrites the generated block of app/data/demo.js
 *   node scripts/build_demo_catalog.js --check  fails when the block is out of date
 */
const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "app", "data", "demo.js");
const sample = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "electroprice-catalog.json"), "utf8"));
const START = "  // <generated:catalog> scripts/build_demo_catalog.js, do not edit by hand";
const END = "  // </generated:catalog>";

// ElectroPrice: real. Its rating, score and risk are the demo's own sample metrics for a supplier with no history here yet.
const ELECTROPRICE = {
  id: "sup-31", name: "ElectroPrice", contact: "Equipo ElectroPrice", city: "cdmx", region: "CDMX", rating: 4.6, score: 90, risk: 15, hours: 2, lead: 3,
  headline: "Electrónica y tecnología con envío a todo México", about: "Tienda en línea de electrónica en México: laptops, monitores, impresoras, redes, almacenamiento y más de las mejores marcas, con envío a todo el país. Precios y existencias actualizados desde sus mayoristas.", site: sample.site,
};
// Fictional suppliers with no price list: they quote on request, fast.
const QUICK = [
  { id: "sup-19", name: "Mayoreo Cómputo MX", contact: "Rosa Almazán", city: "cdmx", region: "CDMX", rating: 4.7, score: 91, risk: 16, hours: 3, lead: 2 },
  { id: "sup-20", name: "Sierra Distribución IT", contact: "Héctor Sierra", city: "monterrey", region: "NL", rating: 4.5, score: 88, risk: 21, hours: 4, lead: 3 },
  { id: "sup-21", name: "ByteBodega", contact: "Lucía Ferrer", city: "guadalajara", region: "JAL", rating: 4.4, score: 85, risk: 24, hours: 2, lead: 2 },
  { id: "sup-22", name: "CompuNorte", contact: "Gabriel Cano", city: "tijuana", region: "BCN", rating: 4.3, score: 83, risk: 27, hours: 6, lead: 4 },
  { id: "sup-23", name: "OfiTech Mayoreo", contact: "Diana Ibarra", city: "queretaro", region: "QRO", rating: 4.6, score: 89, risk: 19, hours: 3, lead: 3 },
  { id: "sup-24", name: "Pacífico Digital", contact: "Mario Quiroz", city: "guadalajara", region: "JAL", rating: 4.5, score: 87, risk: 22, hours: 5, lead: 3 },
  { id: "sup-25", name: "Cima Hardware", contact: "Elena Cota", city: "monterrey", region: "NL", rating: 4.2, score: 82, risk: 29, hours: 8, lead: 5 },
  { id: "sup-26", name: "TecnoAndes Import", contact: "Julián Ortega", city: "bogota", region: "DC", rating: 4.1, score: 80, risk: 33, hours: 12, lead: 9, country: "CO" },
  { id: "sup-27", name: "Impresión Total", contact: "Carmen Roldán", city: "cdmx", region: "CDMX", rating: 4.8, score: 93, risk: 14, hours: 2, lead: 2 },
  { id: "sup-28", name: "Redes del Bajío", contact: "Iker Valdés", city: "queretaro", region: "QRO", rating: 4.6, score: 90, risk: 17, hours: 4, lead: 3 },
  { id: "sup-29", name: "Equipos Especiales del Golfo", contact: "Ramón Beltrán", city: "veracruz", region: "VER", rating: 4.4, score: 84, risk: 25, hours: 2, lead: 5 },
  { id: "sup-30", name: "Importadora Meridiana", contact: "Alma Cetina", city: "merida", region: "YUC", rating: 4.3, score: 82, risk: 28, hours: 3, lead: 7 },
];

const hash = (text) => { let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const products = sample.products.map((item, index) => {
  const id = "cat-" + String(index + 1).padStart(3, "0");
  return {
    id, sku: item.sku, description: item.name, brand: item.brand, model: item.specs.model || item.sku, rate: item.price, referencePrice: Math.max(item.reference, item.price), unit: "Each", currency: sample.currency,
    category: item.group, preferredSupplierId: ELECTROPRICE.id, procurementRule: "Approved catalog item", specs: item.specs,
    offers: [{ id: `offer-${id}-ep`, supplierId: ELECTROPRICE.id, price: item.price, leadDays: ELECTROPRICE.lead, stock: item.stock, terms: "Prepaid", compliant: true }],
  };
});

const sup = (v, listed) => ({
  id: v.id, name: v.name, category: "Technology", contact: v.contact, email: slug(v.contact.split(" ")[0]) + "@" + slug(v.name) + ".example", totalSpend: 0, status: v.score >= 90 ? "Preferred" : v.score >= 85 ? "Reliable" : "Qualified",
  rating: v.rating, score: v.score, risk: v.risk, esg: 70 + Math.round(hash(v.id + "e") * 15), onTime: 88 + Math.round(hash(v.id + "o") * 9), responseRate: 88 + Math.round(hash(v.id + "r") * 11), certifications: ["ISO 9001"],
  marketplace: {
    listed: true, sector: "technology", category: "hardware", capabilities: listed ? ["computing", "peripherals", "networking", "price-list"] : ["computing", "quotes-on-request"], country: v.country || "MX", region: v.region, city: v.city,
    headline: v.headline || "No price list: send the list, get an offer within hours",
    about: v.about || "Sources special orders and large lots. Has no published price list, so it answers each request with its own offer.",
    founded: null, employees: "—", leadDays: v.lead, minOrder: 0, currency: "MXN", languages: ["Spanish"], coverage: "National", responseHours: v.hours, verified: listed,
    reviews: listed ? 0 : 30 + Math.round(hash(v.id + "v") * 90), accent: ["violet", "amber", "emerald"][Math.floor(hash(v.id + "a") * 3)], priceList: listed, ...(v.site ? { website: v.site } : {}),
  },
});

const newSuppliers = [sup(ELECTROPRICE, true), ...QUICK.map((v) => sup(v, false))];
const block = [
  START,
  "  const catalogSuppliers = " + JSON.stringify(newSuppliers) + ";",
  "  const catalogProducts = " + JSON.stringify(products) + ";",
  "  suppliers.push(...catalogSuppliers);",
  "  products.push(...catalogProducts);",
  "  // Existing hardware supplier of the demo that answers on request, with no price list.",
  "  suppliers.forEach((supplier) => { if (supplier.id === 'sup-16' && supplier.marketplace) supplier.marketplace.priceList = false; });",
  END,
].join("\n");

const source = fs.readFileSync(target, "utf8");
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
let next;
if (source.includes(START)) next = source.replace(new RegExp(escape(START) + "[\\s\\S]*?" + escape(END)), () => block);
else {
  const anchor = "  const seed = {";
  if (!source.includes(anchor)) throw new Error("demo.js has no `const seed` anchor");
  next = source.replace(anchor, () => block + "\n\n" + anchor);
}
if (process.argv.includes("--check")) {
  if (next !== source) { console.error("app/data/demo.js catalog block is out of date: run node scripts/build_demo_catalog.js"); process.exit(1); }
  console.log("demo catalog up to date (" + products.length + " products)"); process.exit(0);
}
fs.writeFileSync(target, next);
console.log("wrote " + products.length + " ElectroPrice products and " + newSuppliers.length + " suppliers");
