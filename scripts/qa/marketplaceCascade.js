// Contract tests for the supplier finder's dependent filters.
// Run: bun scripts/qa/marketplaceCascade.js
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const scope = {};
new Function("window", fs.readFileSync(path.join(root, "app/data/demo.js"), "utf8"))(scope);
new Function("window", "globalThis", fs.readFileSync(path.join(root, "app/lib/marketplace-catalog.js"), "utf8"))(scope, scope);

const M = scope.BuyniverseMarketplace;
const seed = scope.BuyniverseDemo.seed;
const list = M.profiles(seed);
let failures = 0;

function check(name, condition, detail) {
  if (condition) console.log(`[PASS] ${name}`);
  else {
    failures += 1;
    console.log(`[FAIL] ${name}${detail ? ` -- ${detail}` : ""}`);
  }
}
const counts = (options) => options.map((o) => `${o.value}:${o.count}`).join(" ");

check("Every listed supplier resolves in the taxonomy and on the map",
  list.length === seed.suppliers.length && list.every((p) => p.sectorLabel && p.categoryLabel && p.countryLabel && p.regionLabel && p.cityLabel),
  `${list.length}/${seed.suppliers.length}`);

let f = M.emptyFilters();
let c = M.cascade(list, f);
check("Child combos stay empty until their parent is chosen",
  c.category.length === 0 && c.capability.length === 0 && c.region.length === 0 && c.city.length === 0);
check("Sector counts add up to the full market",
  c.sector.reduce((sum, o) => sum + o.count, 0) === list.length, counts(c.sector));

f = M.setFilter(f, "country", "MX");
c = M.cascade(list, f);
const mexico = list.filter((p) => p.country === "MX").length;
check("Choosing a country re-counts sectors against that country only",
  c.sector.reduce((sum, o) => sum + o.count, 0) === mexico, counts(c.sector));
check("Regions are the chosen country's regions", c.region.every((o) => ["CDMX", "NL", "JAL", "QRO"].includes(o.value)), counts(c.region));

f = M.setFilter(f, "region", "NL");
c = M.cascade(list, f);
check("Cities belong to the chosen region", c.city.map((o) => o.value).sort().join() === "monterrey,san-pedro", counts(c.city));

f = M.setFilter(f, "sector", "logistics");
const nlLogistics = M.applyFilters(list, f);
check("Filters intersect across both hierarchies",
  nlLogistics.length > 0 && nlLogistics.every((p) => p.region === "NL" && p.sector === "logistics"),
  nlLogistics.map((p) => p.name).join(", "));

c = M.cascade(list, f);
check("A combo never counts against its own current value",
  c.region.find((o) => o.value === "JAL") !== undefined, counts(c.region));

f = M.setFilter(f, "country", "US");
check("Changing a parent clears every descendant", f.region === "" && f.city === "" && f.sector === "logistics");

check("A stale child that does not belong to its parent is rejected",
  M.normalizeFilters({ sector: "technology", category: "packaging", capability: "labels" }).category === "" &&
  M.normalizeFilters({ sector: "technology", category: "packaging", capability: "labels" }).capability === "");
check("An orphan child without a parent is rejected", M.normalizeFilters({ city: "monterrey" }).city === "");

const roundTrip = M.fromQuery(M.toQuery({ sector: "services", category: "design", country: "ES", region: "MD", minScore: 85, verified: true }));
check("Filters survive a route-query round trip",
  roundTrip.sector === "services" && roundTrip.category === "design" && roundTrip.region === "MD" && roundTrip.minScore === 85 && roundTrip.verified === true);
check("Hostile query values are clamped", M.fromQuery({ minScore: "900", maxLead: "-4", q: "x".repeat(500) }).minScore === 100 &&
  M.fromQuery({ maxLead: "-4" }).maxLead === 0 && M.fromQuery({ q: "x".repeat(500) }).q.length === 80);

const byLead = M.sortProfiles(list, "lead");
check("Lead-time sort is ascending", byLead.every((p, i) => i === 0 || byLead[i - 1].leadDays <= p.leadDays));

const withOffers = list.filter((p) => p.offers.length > 0);
check("Catalog offers are attributed to the supplier that made them",
  withOffers.length > 0 && withOffers.every((p) => p.offers.every((o) => o.offer.supplierId === p.id)));

if (failures) {
  console.log(`=== ${failures} MARKETPLACE CASCADE CHECK(S) FAILED ===`);
  process.exit(1);
}
console.log("=== MARKETPLACE CASCADE CONTRACT PASSED ===");
