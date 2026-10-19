// The browser's side of the server RFQ: outside the demo the RFQ is opened, quoted, awarded and settled by the
// server (a stand-in records the calls); in the demo nothing reaches a server. The award is never blocked by the server.
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const windowScope = {
  navigator: { language: "en-US" },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  dispatchEvent: () => {}, CustomEvent: function () {}, setTimeout,
};
new Function("window", read("../lib/web-common/browser.js"))(windowScope);
new Function("window", read("../lib/procurement-common/browser.js"))(windowScope);
new Function("window", read("app/lib/commerce.js"))(windowScope);
new Function("window", read("app/lib/commercial-metrics.js"))(windowScope);
new Function("window", read("app/data/demo.js"))(windowScope);
new Function("window", read("app/store/procurementDomainActions.js"))(windowScope);
new Function("window", read("app/store/domainActions.js"))(windowScope);

const state = windowScope.BuyniverseDemo.clone();
const actor = (id) => state.users.find((user) => user.id === id);
const ref = (value) => ({ value });
const helpers = {
  id: (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  clean: (value, limit) => windowScope.WebCommon.sanitizeText(value, limit).trim(),
  positive: (value) => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 0,
  allowedMarketplaceModes: () => ["buyer", "supplier", "admin"],
  applyCurrentOperationalScope: (record) => record,
};
const store = {
  state, currentUser: ref(actor("user-client-brenda")), isBuyer: ref(true), isSupplier: ref(false), isAdmin: ref(false), isDemo: ref(true), currentSupplierId: ref("sup-1"),
  job: (id) => state.jobs.find((item) => item.id === id), contract: (id) => state.contracts.find((item) => item.id === id),
  supplier: (id) => state.suppliers.find((item) => item.id === id), purchaseRequest: (id) => state.purchaseRequests.find((item) => item.id === id),
  sourcingEvent: (id) => state.sourcingEvents.find((item) => item.id === id), auction: (id) => state.auctions.find((item) => item.id === id),
  purchaseOrder: (id) => state.purchaseOrders.find((item) => item.id === id),
};
Object.assign(store, windowScope.BuyniverseDomainActions.createDomainActions(state, {}, helpers));
store.notice = () => {};
const check = (condition, message) => { if (!condition) throw new Error(message); console.log(`[PASS] ${message}`); };
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

(async () => {
  // In production the people are server principals (uuids); the invited suppliers' users get them here.
  const invited = ["sup-2", "sup-3", "sup-5"];
  invited.forEach((supplierId, index) => { const user = state.users.find((u) => u.supplierProfileId === supplierId); if (user) user.id = uuid(index + 1); });
  const principalOf = (supplierId) => state.users.find((u) => u.supplierProfileId === supplierId).id;

  const calls = { open: [], quote: [], award: [] };
  let settlement = { id: "s-1", feeCents: 625000, baselineCents: 12000000, awardedCents: 9500000, savingCents: 2500000, basis: "saving", baselineSource: "market", currency: "USD", status: "informative" };
  windowScope.BuyniverseRfq = {
    open: (input) => { calls.open.push(input); return Promise.resolve({ eventId: "e-1" }); },
    quote: (eventRef, input) => { calls.quote.push({ eventRef, ...input }); return Promise.resolve({ accepted: true }); },
    award: (eventRef, principal) => { calls.award.push({ eventRef, principal }); return Promise.resolve(settlement); },
  };

  const request = { id: "PR-RFQ-CLIENT", title: "RFQ client test", ownerId: "user-client-brenda", requesterId: "user-client-brenda", approverId: "user-admin-admin", status: "Approved", currency: "USD", amount: 50000, items: [] };
  state.purchaseRequests.unshift(request);
  const mk = (id) => ({ id, title: "RFQ " + id, type: "RFQ", status: "Draft", ownerId: "user-client-brenda", requestId: request.id, budget: 100000, currency: "USD", deadline: new Date(Date.now() + 3600e3).toISOString(), invitedSupplierIds: invited, lots: [{ id: "lot-1", description: "Goods", quantity: 1 }], quotes: [], audit: [] });

  console.log("=== DEMO: nothing reaches a server ===");
  const demoEvent = mk("RFQ-DEMO"); state.sourcingEvents.unshift(demoEvent);
  check(store.publishSourcingEvent(demoEvent) !== null && calls.open.length === 0, "Publishing an RFQ in the demo does not call the server");

  console.log("=== PRODUCTION: the server keeps the RFQ ===");
  store.isDemo.value = false;
  const event = mk("RFQ-LIVE"); state.sourcingEvents.unshift(event);
  check(store.publishSourcingEvent(event) !== null, "The RFQ is published");
  await Promise.resolve();
  check(calls.open.length === 1 && calls.open[0].eventRef === "RFQ-LIVE" && calls.open[0].budget === 100000 && calls.open[0].participantPrincipalIds.length === 3 && calls.open[0].participantPrincipalIds.every((id) => /^[a-f0-9-]{36}$/.test(id)), "Publishing opens the RFQ on the server with its budget and the invited principals");
  check(event.serverRfq === "ready", "The event remembers the server has it");

  // A supplier quotes: the browser keeps it locally and the server receives the amount.
  store.currentUser.value = actor(principalOf("sup-3")); store.isBuyer.value = false; store.isSupplier.value = true; store.currentSupplierId.value = "sup-3";
  const quote = store.submitSourcingResponse(event, { price: 95000, leadDays: 10, terms: "Net 30", notes: "" });
  check(Boolean(quote) && calls.quote.length === 1 && calls.quote[0].price === 95000 && calls.quote[0].leadDays === 10 && calls.quote[0].eventRef === "RFQ-LIVE", "A supplier's quote also reaches the server");
  for (const [sup, price] of [["sup-2", 120000], ["sup-5", 125000]]) {
    store.currentUser.value = actor(principalOf(sup)); store.currentSupplierId.value = sup;
    store.submitSourcingResponse(event, { price, leadDays: 7, terms: "Net 30", notes: "" });
  }
  check(calls.quote.length === 3, "Every supplier's quote is sent");

  // The buyer awards: the server settles; the browser stores what it answered.
  store.currentUser.value = actor("user-client-brenda"); store.isBuyer.value = true; store.isSupplier.value = false;
  const order = store.awardSourcingEvent(event, "sup-3", "Best compliant price with confirmed lead time.");
  check(Boolean(order) && event.status === "Awarded", "The award creates the order locally");
  await new Promise((resolve) => setTimeout(resolve, 5));
  check(calls.award.length === 1 && calls.award[0].eventRef === "RFQ-LIVE" && calls.award[0].principal === principalOf("sup-3"), "The award is sent to the server with the winner's principal");
  const fee = event.commercialSettlement?.serviceFee;
  check(fee && fee.amount === 6250 && fee.baselineSource === "market" && fee.feeBasis === "saving" && fee.status === "informative" && fee.serverSettlementId === "s-1" && order.commercialSettlement === event.commercialSettlement, "The server's fee and baseline are stored on the event and its order");
  check(event.commercialSettlement.totalSavings === 25000 && event.commercialSettlement.buyerRetainedSavings === 18750, "The buyer's net saving follows the server's numbers (25,000 - 6,250)");

  console.log("=== The award never waits on the server ===");
  settlement = null;
  const down = mk("RFQ-DOWN"); state.sourcingEvents.unshift(down);
  store.publishSourcingEvent(down);
  store.currentUser.value = actor(principalOf("sup-3")); store.isBuyer.value = false; store.isSupplier.value = true; store.currentSupplierId.value = "sup-3";
  store.submitSourcingResponse(down, { price: 90000, leadDays: 5, terms: "Net 30", notes: "" });
  store.currentUser.value = actor("user-client-brenda"); store.isBuyer.value = true; store.isSupplier.value = false;
  const order2 = store.awardSourcingEvent(down, "sup-3", "Best compliant price.");
  await new Promise((resolve) => setTimeout(resolve, 5));
  check(Boolean(order2) && down.status === "Awarded" && !down.commercialSettlement, "If the server cannot settle, the award stands and no estimate is invented");

  console.log("=== DEMO again: the award does not call the server ===");
  store.isDemo.value = true; const before = calls.award.length;
  const demo2 = mk("RFQ-DEMO-2"); state.sourcingEvents.unshift(demo2);
  store.publishSourcingEvent(demo2);
  store.currentUser.value = actor(principalOf("sup-3")); store.isBuyer.value = false; store.isSupplier.value = true; store.currentSupplierId.value = "sup-3";
  store.submitSourcingResponse(demo2, { price: 90000, leadDays: 5, terms: "Net 30", notes: "" });
  store.currentUser.value = actor("user-client-brenda"); store.isBuyer.value = true; store.isSupplier.value = false;
  store.awardSourcingEvent(demo2, "sup-3", "Best compliant price.");
  await new Promise((resolve) => setTimeout(resolve, 5));
  check(calls.award.length === before && calls.quote.length === 4 && calls.open.length === 2, "In the demo no RFQ call reaches the server");
  console.log("=== RFQ CLIENT PASSED ===");
})().catch((error) => { console.error(error); process.exit(1); });
