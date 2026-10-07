// "Necesito": a need is published once and competes, is chosen, received and paid.
// Covers the journey model (stages from real records), supplier matching, and
// the publish -> approve -> launch path with and without the approver's rights.
const fs = require("fs");
const path = require("path");

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
for (const file of ["../lib/web-common/browser.js", "../lib/procurement-common/browser.js", "app/lib/commercial-metrics.js", "app/lib/need-journey.js", "app/data/demo.js",
  "app/store/procurementDomainActions.js", "app/store/needActions.js", "app/store/domainActions.js"]) new Function("window", read(file))(windowScope);

const state = windowScope.BuyniverseDemo.clone();
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
const Need = windowScope.BuyniverseNeed;
const check = (condition, message) => { if (!condition) throw new Error(message); console.log(`[PASS] ${message}`); };

console.log("=== NECESITO: ONE NEED, FIVE STAGES ===");

// Stage model
const needs = Need.journey(state);
check(needs.length >= 5 && needs.every((n) => n.stage >= 1 && n.stage <= 5), "every request and orphan order becomes a need with a stage 1-5");
check(needs.some((n) => n.stage === 5 && n.next.to.startsWith("/invoices/")), "an invoiced order lands on Pay and points at its invoice");
check(needs.find((n) => n.attention) === needs[0], "needs asking for a hand come first");
const counts = Need.counts(needs);
check(counts.open.reduce((a, b) => a + b, 0) === counts.total, "stage counts add up to the open needs");

// Category guessing and supplier matching
check(Need.guess("50 laptops para mi oficina") === "products" && Need.guess("flete Monterrey - CDMX") === "freight" && Need.guess("desarrollador senior") === "talent" && Need.guess("hola") === null, "free text maps to the right category, and to none when it says nothing");
const freight = Need.matchSuppliers(state, "freight", 4);
check(freight.length >= 2 && freight.every((s) => Number(s.risk) <= 40), "matching returns at least two suppliers and never one the risk rule excludes");

// Publish without approval rights: the need waits, with its intent attached
let r = store.publishNeed({ text: "50 laptops corporativas", category: "products", quantity: 50, budget: 60000, currency: "USD", days: 5, mode: "rfq" });
check(r && r.pending && r.request.status === "Pending approval" && r.request.need.mode === "rfq" && !r.event, "a buyer without approval rights publishes a need that waits for its approver");
check((state.notifications || []).some((n) => n.userId === "user-admin-admin" && /waiting/.test(n.title)), "the approver is notified");
const journeyOf = (id) => Need.journey(state).find((n) => n.id === id);
check(journeyOf(r.request.id).stage === 1 && journeyOf(r.request.id).attention, "it sits at Publish and asks for the approver");

// The approver approves: the round opens by itself
store.currentUser.value = state.users.find((u) => u.id === "user-admin-admin"); store.isAdmin.value = false; store.isBuyer.value = true; // the approver is a buyer-side user, not the owner
store.procurementTransition(r.request, "Approved", "ok");
check(store.canManageProcurement(r.request) === false, "the approver does not gain general management rights over the owner's records");
const launched = store.launchNeed(r.request);
check(store.canManageProcurement(r.request) === false, "the delegation ends with the call");
check(launched && launched.event.status === "Published" && launched.event.invitedSupplierIds.length >= 2 && r.request.status === "RFQ in progress", "approving a need opens its quote round with the matching suppliers");
check(journeyOf(r.request.id).stage === 2 && journeyOf(r.request.id).eventId === launched.event.id, "the need moves to Compete");
check(store.launchNeed(r.request) === null, "a need cannot launch twice");

// Publisher is also the approver: a live auction opens at once
r = store.publishNeed({ text: "Flete Monterrey - CDMX, 20 t", category: "freight", quantity: 1, budget: 18000, currency: "MXN", days: 3, mode: "auction", minutes: 30 });
check(r && !r.pending && r.auction && r.auction.status === "Running" && r.event.type === "Auction", "an approver publishing a freight need opens a live reverse auction immediately");
check(journeyOf(r.request.id).stage === 2 && journeyOf(r.request.id).live, "a running auction is a live Compete stage");

// Guards
check(store.publishNeed({ text: "x", budget: 10 }) === null, "a need must say what it is");
check(store.publishNeed({ text: "Laptops", budget: 0 }) === null && store.publishNeed({ text: "Laptops", budget: 100, quantity: 0 }) === null, "a need needs a budget and a quantity");
store.marketplaceMode.value = "supplier";
check(store.publishNeed({ text: "Laptops", budget: 100 }) === null, "a supplier workspace cannot publish needs");
// The store helper the actions rely on must hand back the amount, not just "true":
// a boolean here once turned every live auction and quote into a price of 1.
const mainSource = read("app/main.js");
check(/const positive = .*\? Number\(value\) : 0\)/.test(mainSource), "main.js positive() returns the safe amount, not a boolean");
console.log("=== NECESITO FLOW PASSED ===");
