#!/usr/bin/env node
/**
 * Builds the demo's virtual people: a small team inside every supplier (sales, technical, logistics, billing)
 * and the buyer's own internal team (IT requester, finance, warehouse, legal). They are the cast the demo
 * auction, the order conversations and the order tasks are played by. Nobody here is real:
 * every address is on yopmail.com (a public disposable inbox), so nothing sent to them could reach a person.
 *
 *   node scripts/build_demo_cast.js          rewrites the generated block of app/data/demo.js
 *   node scripts/build_demo_cast.js --check  fails when the block is out of date
 *
 * Run it after scripts/build_demo_catalog.js: it reads the suppliers that block adds.
 */
const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "app", "data", "demo.js");
const START = "  // <generated:cast> scripts/build_demo_cast.js, do not edit by hand";
const END = "  // </generated:cast>";

const FIRST = ["Rosa", "Héctor", "Lucía", "Gabriel", "Diana", "Mario", "Elena", "Julián", "Carmen", "Iker", "Ramón", "Alma", "Sofía", "Andrés", "Paola", "Ricardo", "Camila", "Luis", "Marta", "Iván", "Natalia", "Óscar", "Fernanda", "Tomás", "Regina", "Emilio", "Daniela", "Joaquín", "Mariana", "Sergio", "Ximena", "Pablo", "Renata", "Hugo", "Beatriz", "Cristian"];
const LAST = ["Almazán", "Sierra", "Ferrer", "Cano", "Ibarra", "Quiroz", "Cota", "Ortega", "Roldán", "Valdés", "Beltrán", "Cetina", "Treviño", "Vela", "Garza", "Salas", "Rojas", "Peña", "León", "Luna", "Herrera", "Mendoza", "Aguilar", "Castañeda", "Domínguez", "Fuentes", "Ibáñez", "Lara", "Montes", "Navarro", "Orozco", "Paredes", "Robles", "Soto", "Téllez", "Zamora"];

const ROLES = [
  { role: "sales", es: "Ejecutivo de cuenta", en: "Account executive" },
  { role: "technical", es: "Preventa técnica", en: "Technical pre-sales" },
  { role: "logistics", es: "Logística y entregas", en: "Logistics and delivery" },
  { role: "billing", es: "Facturación y cobranza", en: "Billing and collections" },
];

// How each supplier's sales lead behaves in a live auction.
const STYLE = { "sup-2": "cautious", "sup-3": "aggressive", "sup-4": "steady", "sup-5": "steady", "sup-16": "steady", "sup-19": "steady", "sup-20": "steady", "sup-21": "steady", "sup-22": "cautious", "sup-23": "cautious", "sup-24": "bluffer", "sup-25": "aggressive", "sup-26": "sniper", "sup-27": "aggressive", "sup-28": "sniper", "sup-29": "cautious", "sup-30": "bluffer", "sup-31": "steady" };

const BUYER_TEAM = [
  { id: "user-team-marcos", name: "Marcos Villarreal", role: "requester", es: "Gerente de TI (solicitante)", en: "IT manager (requester)", email: "marcos.villarreal.innovate@yopmail.com" },
  { id: "user-team-patricia", name: "Patricia Ochoa", role: "finance", es: "Controller financiero", en: "Finance controller", email: "patricia.ochoa.innovate@yopmail.com" },
  { id: "user-team-ernesto", name: "Ernesto Lozano", role: "warehouse", es: "Jefe de almacén", en: "Warehouse manager", email: "ernesto.lozano.innovate@yopmail.com" },
  { id: "user-team-valeria", name: "Valeria Núñez", role: "legal", es: "Contratos y cumplimiento", en: "Contracts and compliance", email: "valeria.nunez.innovate@yopmail.com" },
];

const hash = (text) => { let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
const initials = (name) => name.split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

function build() {
  const scope = {};
  const source = fs.readFileSync(target, "utf8");
  const start = source.indexOf(START);
  const clean = start >= 0 ? source.slice(0, start) + source.slice(source.indexOf(END) + END.length) : source;
  new Function("window", clean)(scope);
  const suppliers = scope.BuyniverseDemo.seed.suppliers;
  const wanted = suppliers.filter((s) => STYLE[s.id]);
  const used = new Set(scope.BuyniverseDemo.seed.users.map((u) => u.name));
  const users = [];
  wanted.forEach((supplier, index) => {
    const code = supplier.id.replace("sup-", "s");
    const city = supplier.marketplace && supplier.marketplace.city ? supplier.marketplace.city : "cdmx";
    ROLES.forEach((r, k) => {
      // The sales lead is the supplier's own contact; the rest of the team is generated.
      let name = r.role === "sales" ? supplier.contact : "";
      for (let n = 0; !name || used.has(name); n++) name = FIRST[Math.floor(hash(supplier.id + r.role + n + "f") * FIRST.length)] + " " + LAST[Math.floor(hash(supplier.id + r.role + n + "l") * LAST.length)];
      used.add(name);
      const parts = name.split(" ");
      users.push({
        id: `user-sim-${code}-${r.role}`, name, email: `${slug(parts[0])}.${slug(parts.slice(1).join(" "))}.${code}@yopmail.com`, type: "Contact", companyName: supplier.name, location: city,
        avatar: initials(name), marketplaceModes: ["supplier"], supplierProfileId: supplier.id, virtual: true,
        team: { side: "supplier", role: r.role, title: { es: r.es, en: r.en }, ...(r.role === "sales" ? { style: STYLE[supplier.id] } : {}) },
      });
    });
  });
  BUYER_TEAM.forEach((m) => users.push({
    id: m.id, name: m.name, email: m.email, type: "Contact", companyName: "Innovate Inc.", location: "New York, USA", avatar: initials(m.name), marketplaceModes: ["buyer"], virtual: true,
    team: { side: "buyer", role: m.role, title: { es: m.es, en: m.en } },
  }));
  return users;
}

const users = build();
const block = [START, "  users.push(...(" + JSON.stringify(users) + "));", END].join("\n");
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
  if (next !== source) { console.error("app/data/demo.js cast block is out of date: run node scripts/build_demo_cast.js"); process.exit(1); }
  console.log("demo cast up to date (" + users.length + " people)"); process.exit(0);
}
fs.writeFileSync(target, next);
console.log("wrote " + users.length + " virtual people");
