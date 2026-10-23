// The shopping list: a buyer searches the catalog, adds what is needed and publishes the list.
// Items with a supplier's price become purchase requests (one per supplier); the rest go together into
// a quick quote that only the suppliers able to answer in time are invited to.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const windowScope = {
  navigator: { language: "en-US" },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  dispatchEvent: () => {},
  CustomEvent: function () {},
  setTimeout,
};
for (const file of ["../lib/web-common/browser.js", "../lib/procurement-common/browser.js", "app/lib/commerce.js", "app/lib/commercial-metrics.js", "app/lib/need-journey.js", "app/lib/electroprice-catalog.js", "app/data/demo.js",
  "app/store/procurementDomainActions.js", "app/store/needActions.js", "app/store/domainActions.js"]) new Function("window", read(file))(windowScope);

const check = (condition, message) => { if (!condition) throw new Error(message); console.log(`[PASS] ${message}`); };
console.log("=== SHOPPING LIST ===");

// The catalog block is generated: it must match its generator.
execFileSync("node", [path.join(root, "scripts/build_demo_catalog.js"), "--check"], { stdio: "pipe" });
check(true, "the demo catalog matches scripts/build_demo_catalog.js");

const state = windowScope.BuyniverseDemo.clone();
const Need = windowScope.BuyniverseNeed, Catalog = windowScope.BuyniverseCatalog;

// ElectroPrice's catalog is real and whole: about 20,000 products in shards the demo loads on demand.
execFileSync("node", [path.join(root, "scripts/build_demo_catalog.js"), "--check"], { stdio: "pipe" });
check(true, "the demo's suppliers match scripts/build_demo_catalog.js");
const shardDir = path.join(root, "app/data/electroprice");
const index = JSON.parse(fs.readFileSync(path.join(shardDir, "index.json"), "utf8"));
const raw = index.groups.map((g) => ({ g, rows: JSON.parse(fs.readFileSync(path.join(shardDir, g.key + ".json"), "utf8")) }));
const rows = raw.flatMap(({ g, rows: list }) => list.map((r) => Catalog.row(r, g.key, g.label)));
check(rows.length >= 20000 && rows.length === index.total && index.groups.length >= 20, `the catalog has ${rows.length} products in ${index.groups.length} groups`);
check(index.groups.every((g) => raw.find((x) => x.g.key === g.key).rows.length === g.count), "the index counts match the shards");
for (const wanted of ["Monitors", "Laptops", "Desktops", "Printers & scanners", "Keyboards & mice", "Networking", "Storage", "Power & UPS"]) check(index.groups.some((g) => g.label === wanted && g.count >= 100), `the catalog has ${wanted}`);
check(new Set(rows.map((r) => r.id)).size === rows.length, "no two products share an id");
const electroprice = state.suppliers.find((s) => s.name === "ElectroPrice");
check(electroprice && electroprice.id === Catalog.SUPPLIER && electroprice.marketplace.priceList === true && electroprice.marketplace.website === "https://electroprice.appniverse.com", "ElectroPrice, the real seller, is the supplier with the price list");
check(rows.every((r) => r.sku && r.brand && r.description.length >= 3 && r.price > 0 && r.reference >= r.price && r.stock >= 0 && r.specs && r.specs.model), "every product has a part number, brand, name, price, a reference not below it, stock and a model");
check(rows.filter((r) => r.stock > 0).length >= 6000 && rows.filter((r) => r.stock === 0).length >= 10000, "in stock and on-order products are both there");
check(rows.some((r) => r.reference > r.price), "some products show a real spread between sources");
const cost = JSON.parse(fs.readFileSync(path.join(root, "scripts/data/electroprice-costs.json"), "utf8"));
check(rows.every((r) => cost[r.sku] > 0 && r.price >= cost[r.sku] * 1.35 - 0.02), "every price carries at least a 35% margin over ElectroPrice's cost");
check(rows.every((r) => r.price * (1 - 0.15) >= cost[r.sku] * 1.10), "a 15% negotiated discount still leaves at least 10% over cost");
check(!/b(CVA|CTONLINE|CT ONLINE|INGRAM MICRO)b/i.test(fs.readdirSync(shardDir).map((f) => fs.readFileSync(path.join(shardDir, f), "utf8")).join("")), "the wholesale providers' names never reach the demo");
check(!fs.readdirSync(shardDir).some((f) => /cost/i.test(f)) && !/"cost"/.test(fs.readFileSync(path.join(shardDir, "index.json"), "utf8")), "the cost is not among the served files");
check(rows.filter((r) => r.image).length >= rows.length * 0.99, `${rows.filter((r) => r.image).length} of ${rows.length} products have a photo`);
check(rows.every((r) => !r.image || /^https:\/\/(static\.ctonline\.mx\/imagenes\/[A-Za-z0-9._\-\/]+\.(jpg|png)|me2\.grupocva\.com\/me\/imagen\/imagen_art_detalles\.php\?fProd=\d+)$/.test(r.image)), "every photo is on one of the two allowed image hosts");
check(rows.every((r) => !r.image || r.imageReferrer === (r.image.includes("grupocva") ? "origin" : "no-referrer")), "each photo host gets the Referer policy it accepts");
for (const file of [".htaccess", "index.html", "index.php", "serve.py", "backend/v-service/src/buyniverse.v"]) check(/img-src 'self' data: blob: https:\/\/static\.ctonline\.mx https:\/\/me2\.grupocva\.com;/.test(read(file)), `${file} lets those two hosts, and only those, serve images`);
const spec = rows.filter((r) => Object.keys(r.specs).length >= 4).length;
check(spec >= 5000 && rows.every((r) => r.specs.model), `${spec} products carry real specifications; the rest carry their model and, where there is one, a description`);
const offer = Catalog.offerOf(rows.find((r) => r.stock > 0)), onOrder = Catalog.offerOf(rows.find((r) => r.stock === 0));
check(offer.supplierId === electroprice.id && offer.leadDays < onOrder.leadDays && onOrder.stock === 0, "an on-order product has a longer lead time than one in stock");

// A catalog product becomes a workspace product only when it is used.
const pick = (group, inStock = true) => rows.find((r) => r.group === group && (!inStock || r.stock >= 20));
const productsBefore = state.products.length;
const monitor = Catalog.ensure(state, pick("monitors")), laptop = Catalog.ensure(state, pick("laptops")), printer = Catalog.ensure(state, pick("printers")), keyboard = Catalog.ensure(state, pick("keyboards"));
check(state.products.length === productsBefore + 4 && Catalog.ensure(state, pick("monitors")) === monitor && state.products.length === productsBefore + 4, "a catalog product enters the workspace once, when it is used");
check([monitor, laptop, printer, keyboard].every((p) => p.currency === "MXN" && p.offers.length === 1 && p.offers[0].supplierId === electroprice.id && p.id.startsWith("ep-")), "it is ElectroPrice's, in MXN, with its one offer");
const supplierIds = new Set(state.suppliers.map((s) => s.id));
check(state.products.every((p) => p.offers.every((o) => supplierIds.has(o.supplierId) && o.price > 0 && o.leadDays >= 1)), "every offer belongs to a supplier in the demo and has a price and lead time");
check(new Set(state.products.map((p) => p.id)).size === state.products.length && new Set(state.suppliers.map((s) => s.id)).size === state.suppliers.length, "no duplicate product or supplier ids");

// Who can answer quickly: suppliers with no price list, or none for these items.
const anyHour = Need.quickQuoteSuppliers(state, [monitor.id], 0);
const inThree = Need.quickQuoteSuppliers(state, [monitor.id], 3);
check(anyHour.length >= 3 && anyHour.every((s) => s.marketplace.category === "hardware") && !anyHour.includes(electroprice), "several hardware suppliers can quote a monitor on request; ElectroPrice already has its price");
check(inThree.length >= 2 && inThree.length <= anyHour.length && inThree.every((s) => s.marketplace.responseHours <= 3), "asking for an answer within 3 hours leaves only the suppliers that can do it");
check(anyHour.every((s, i, list) => i === 0 || list[i - 1].marketplace.responseHours <= s.marketplace.responseHours), "the fastest suppliers come first");
check(anyHour.some((s) => s.marketplace.priceList === false), "a supplier with no price list is among the quick quoters");

// Publish as a buyer who is also the approver.
const ref = (value) => ({ value });
const notices = [];
const helpers = {
  id: (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  clean: (value, limit) => windowScope.WebCommon.sanitizeText(value, limit).trim(),
  positive: (value) => (Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 0),
  allowedMarketplaceModes: () => ["buyer", "supplier", "admin"],
  applyCurrentOperationalScope: (record) => record,
};
const store = {
  state, currentUser: ref(state.users.find((u) => u.id === "user-client-brenda")), isBuyer: ref(true), isSupplier: ref(false), isAdmin: ref(false), isDemo: ref(true),
  marketplaceMode: ref("buyer"), user: (id) => state.users.find((u) => u.id === id),
  sourcingEvent: (id) => state.sourcingEvents.find((e) => e.id === id), auction: (id) => state.auctions.find((a) => a.id === id),
  notice: (m) => notices.push(m),
};
Object.assign(store, windowScope.BuyniverseDomainActions.createDomainActions(state, {}, helpers));

const line = (product, quantity, offer) => ({ productId: product.id, quantity, offerId: offer ? offer.id : undefined });

// A buyer without approval rights: everything waits for the approver, nothing opens yet.
let r = store.publishShoppingList({ lines: [line(laptop, 10, laptop.offers[0]), line(keyboard, 10, keyboard.offers[0]), line(monitor, 10)], hours: 24 });
check(r && r.pending && r.requests.length >= 2 && !r.event, "a buyer without approval rights publishes a list that waits for the approver");
check(r.requests.every((q) => q.status === "Pending approval"), "every request of the list is pending approval");
check(r.quick === 1 && r.invited >= 2, "the item without a chosen price becomes a quick quote with at least two suppliers");

// A publisher who is also the approver: priced items are approved, the quick quote opens at once.
store.currentUser.value = state.users.find((u) => u.id === "user-admin-admin"); store.isAdmin.value = true;
const before = state.purchaseRequests.length, eventsBefore = state.sourcingEvents.length;
const cheapest = (p) => p.offers[0];
r = store.publishShoppingList({
  hours: 4,
  lines: [line(laptop, 5, cheapest(laptop)), line(printer, 2, cheapest(printer)), line(keyboard, 20, cheapest(keyboard)), line(monitor, 8),
    { description: "Rack de piso 42U con ventilación", quantity: 2, budget: 9500, spec: "600 x 1000 mm, puertas perforadas" }],
});
check(r && !r.pending && r.quick === 2 && r.priced >= 1, "a list mixing priced and unpriced items is split in two");
const priced = r.requests.filter((q) => q.supplierId), quick = r.requests.find((q) => q.need);
check(priced.length === r.priced && priced.every((q) => q.status === "Approved" && q.items.every((i) => i.supplierId === q.supplierId)), "each supplier gets one approved purchase request with its own lines");
const total = priced.reduce((sum, q) => sum + q.amount, 0);
const expected = [[laptop, 5], [printer, 2], [keyboard, 20]].reduce((sum, [p, n]) => sum + p.offers[0].price * n, 0);
check(Math.abs(total - expected) < 0.01, "the requests add up to the chosen prices, not to the reference");
check(state.purchaseRequests.length === before + r.requests.length, "every request is stored");
check(r.event && r.event.status === "Published" && r.event.type === "RFQ" && state.sourcingEvents.length === eventsBefore + 1, "the quick quote opens as a published RFQ");
const hoursLeft = (Date.parse(r.event.deadline) - Date.now()) / 3600000;
check(hoursLeft > 3.9 && hoursLeft <= 4.01, "the quote closes within the hours the buyer chose");
check(r.event.lots.length === 2 && r.event.lots.some((l) => /Rack de piso/.test(l.description)) && r.event.budget === quick.amount, "its lots are the unpriced items, and its budget is their estimate");
const invited = state.suppliers.filter((s) => r.event.invitedSupplierIds.includes(s.id));
check(invited.length >= 2 && invited.every((s) => s.marketplace.responseHours <= 4 && s.marketplace.category === "hardware"), "only hardware suppliers that can answer within the window are invited");
check(r.event.budget > 0 && quick.status === "RFQ in progress" && quick.sourcingEventId === r.event.id, "the request moves to RFQ in progress and points at the quote");

// Guards.
const count = state.purchaseRequests.length;
check(store.publishShoppingList({ lines: [] }) === null, "an empty list publishes nothing");
check(store.publishShoppingList({ lines: [{ description: "Algo raro", quantity: 3 }] }) === null, "an item that is not in the catalog needs a budget");
check(store.publishShoppingList({ lines: [line(laptop, 0, laptop.offers[0])] }) === null && store.publishShoppingList({ lines: [line(laptop, 1.5, laptop.offers[0])] }) === null, "quantities are whole numbers of at least one");
const forged = store.publishShoppingList({ lines: [line(laptop, 1, { id: "offer-forged" })] });
check(forged && forged.priced === 0 && forged.quick === 1 && forged.requests.every((q) => !q.supplierId), "an offer that is not in the catalog cannot be forged into a price: the item is quoted instead");
check(store.publishShoppingList({ hours: 1, lines: [{ description: "Servidor especial a medida", quantity: 1, budget: 90000 }] }) === null, "a quote nobody can answer in the time asked is refused");
const afterGuards = state.purchaseRequests.length;
store.marketplaceMode.value = "supplier";
check(store.publishShoppingList({ lines: [line(laptop, 1, laptop.offers[0])] }) === null && state.purchaseRequests.length === afterGuards, "a supplier workspace cannot publish a shopping list");

// The page wires all of it.
const page = read("app/pages/ProductCatalogPage.vue"), panel = read("app/pages/catalog/ShoppingList.vue");
check(/ShoppingList/.test(page) && /quickQuoteSuppliers/.test(page) && /addToList/.test(page), "the catalog page adds to the list and shows who can quote quickly");
check(/class="ct-photo"/.test(page) && /ct-hero-photo/.test(page) && /photoFailed/.test(page) && /loading="lazy"/.test(page), "cards and the detail show the photo, lazily, and fall back to an icon when it fails");
check(/publishShoppingList/.test(panel) && /quickQuoteSuppliers/.test(panel), "the list panel publishes through the store and checks who can answer in time");
console.log("=== SHOPPING LIST PASSED ===");
