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

new Function("window", read("../lib/web-common/browser.js"))(windowScope);
new Function("window", read("../lib/procurement-common/browser.js"))(windowScope);
new Function("window", read("app/lib/commercial-metrics.js"))(windowScope);
new Function("window", read("app/data/demo.js"))(windowScope);
new Function("window", read("app/store/domainActions.js"))(windowScope);

const state = windowScope.BuyniverseDemo.clone();
const ui = {};
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
  state,
  currentUser: ref(actor("user-client-brenda")),
  isBuyer: ref(true),
  isSupplier: ref(false),
  isAdmin: ref(false),
  isDemo: ref(true),
  currentSupplierId: ref("sup-1"),
  job: (id) => state.jobs.find((item) => item.id === id),
  contract: (id) => state.contracts.find((item) => item.id === id),
  supplier: (id) => state.suppliers.find((item) => item.id === id),
  purchaseRequest: (id) => state.purchaseRequests.find((item) => item.id === id),
  sourcingEvent: (id) => state.sourcingEvents.find((item) => item.id === id),
  auction: (id) => state.auctions.find((item) => item.id === id),
  purchaseOrder: (id) => state.purchaseOrders.find((item) => item.id === id),
};
Object.assign(store, windowScope.BuyniverseDomainActions.createDomainActions(state, ui, helpers));

function useBuyer() {
  store.currentUser.value = actor("user-client-brenda");
  store.isBuyer.value = true;
  store.isSupplier.value = false;
  store.currentSupplierId.value = "sup-1";
}
function useSupplier(userId, supplierId) {
  store.currentUser.value = actor(userId);
  store.isBuyer.value = false;
  store.isSupplier.value = true;
  store.currentSupplierId.value = supplierId;
}
function check(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`[PASS] ${message}`);
}

console.log("=== FULL PROCUREMENT + PROJECT LIFECYCLE ===");

// Supplier invitation -> private response. Only the invited supplier may
// create/update its own quote; no buyer-only evaluation fields are accepted.
const rfx = {
  id: "RFX-DEMO-LIFECYCLE", title: "Secure branch connectivity", type: "RFQ", status: "Published",
  ownerId: "user-client-brenda", budget: 18000, currency: "USD",
  deadline: new Date(Date.now() + 20 * 60000).toISOString(),
  invitedSupplierIds: ["sup-2", "sup-3"], lots: [{ id: "lot-rfx", description: "Connectivity package", quantity: 1 }],
  quotes: [], audit: [],
};
state.sourcingEvents.unshift(rfx);
useSupplier("user-freelancer-john", "sup-3");
const firstResponse = store.submitSourcingResponse(rfx, { price: 16200, leadDays: 12, terms: "Net 30", notes: "Includes monitored deployment." });
check(Boolean(firstResponse) && rfx.quotes.length === 1 && firstResponse.supplierId === "sup-3", "An invited supplier submits a private RFX response");
const revisedResponse = store.submitSourcingResponse(rfx, { price: 15800, leadDays: 10, terms: "Net 30", notes: "Updated delivery commitment." });
check(rfx.quotes.length === 1 && revisedResponse?.price === 15800 && revisedResponse?.quality === state.suppliers.find((item) => item.id === "sup-3").score, "A supplier updates only its own response while evaluation data stays server-derived");
useSupplier("user-client-brenda", "sup-1");
check(!store.submitSourcingResponse(rfx, { price: 15000, leadDays: 8, terms: "Net 30" }) && rfx.quotes.length === 1, "A non-invited supplier cannot add a response");
useBuyer();

// Purchase request -> approved auction -> supplier bid -> award -> order.
const request = {
  id: "PR-DEMO-LIFECYCLE", title: "Warehouse automation rollout", ownerId: "user-client-brenda",
  requesterId: "user-client-brenda", approverId: "user-admin-admin", status: "Approved", currency: "USD",
  amount: 50000, items: [{ description: "Scanning and packing automation", quantity: 1, unitPrice: 50000 }],
};
state.purchaseRequests.unshift(request);
const event = {
  id: "AUC-DEMO-LIFECYCLE", title: "Warehouse automation live bid", type: "Auction", status: "Draft",
  ownerId: "user-client-brenda", requestId: request.id, budget: 50000, currency: "USD",
  deadline: new Date(Date.now() + 20 * 60000).toISOString(), autoExtend: true,
  invitedSupplierIds: ["sup-2", "sup-3", "sup-5"], lots: [{ id: "lot-demo", description: "Warehouse automation bundle", quantity: 1 }],
  quotes: [], audit: [],
};
state.sourcingEvents.unshift(event);
const publication = store.publishSourcingEvent(event);
check(publication?.auction?.status === "Running", "Publishing an auction creates its live bidding room");
check(event.status === "Running", "The sourcing event transitions into the live stage");

useSupplier("user-freelancer-john", "sup-3");
publication.auction.closingAt = new Date(Date.now() + 30 * 1000).toISOString();
publication.auction.endAt = publication.auction.closingAt;
const bid = store.placeLiveAuctionBid(event.id, publication.auction.currentBid - publication.auction.minStep);
check(Boolean(bid) && publication.auction.leadingSupplierId === "sup-3", "An invited supplier places a validated reverse bid");
check(publication.auction.audit.some((item) => item.action === "Bid accepted"), "The bid creates an immutable-style audit entry");
check(publication.auction.extensionCount === 1 && publication.auction.realtimeEvents.some((item) => item.extended === true), "A late valid bid creates an anti-sniping activity signal");
check(state.notifications.some((item) => item.userId === "user-client-brenda" && item.title === "New live offer"), "The organizer receives a private live-offer notification");
check(state.notifications.some((item) => item.userId === "user-freelancer-john" && item.title === "Offer recorded"), "The bidding supplier receives an immediate confirmation");
const rivalNotice = state.notifications.find((item) => item.userId === "user-freelancer-charlie" && item.title === "Live auction moved");
check(Boolean(rivalNotice) && !/John Doe|\$|50000/.test(rivalNotice.text), "Rival bidders receive a competitive prompt without bidder identity or amount");

useBuyer();
const order = store.awardLiveAuction(publication.auction, "Best compliant value with confirmed delivery capacity.");
check(Boolean(order) && order.status === "Awaiting receipt", "Auction award creates an execution-ready purchase order");
check(order.commercialSettlement?.serviceFee?.rate === 40 && order.commercialSettlement.serviceFee.amount === Math.round(order.commercialSettlement.totalSavings * 0.4 * 100) / 100 && order.commercialSettlement.buyerRetainedSavings === Math.round(order.commercialSettlement.totalSavings * 0.6 * 100) / 100, "Award locks the 40% service fee and buyer net savings for billing");
check(event.awardedSupplierId === "sup-3" && request.status === "Awarded", "Award propagates to the sourcing event and purchase request");
check(!store.closePurchaseOrder(order) && order.status === "Awaiting receipt", "An unmatched order cannot be closed early");

const receipt = store.recordOrderReceipt(order, order.lines.map((line) => ({ id: line.id, receiveNow: line.ordered })));
check(receipt?.receivedPercent === 100 && receipt.status === "Received", "Full goods receipt advances the order to received");
const invoice = { id: "INV-DEMO-LIFECYCLE", currency: "USD", total: Math.round(order.total * 1.015 * 100) / 100, providerId: "user-freelancer-john", clientId: "user-client-brenda" };
state.invoices.unshift(invoice);
const attached = store.attachOrderInvoice(order, invoice);
check(attached?.withinTolerance, "A matching fiscal invoice is attached within the stated 2% tolerance");
check(store.runThreeWayMatch(order) && order.status === "Matched", "Three-way matching requires and records PO, receipt and invoice reconciliation");
check(store.closePurchaseOrder(order) && order.status === "Closed", "A purchase order cannot close until reconciliation is complete");

// Supplier proposal -> contract -> task update -> funded milestone release.
const project = {
  id: "job-demo-lifecycle", title: "Supplier portal accessibility delivery", clientId: "user-client-brenda",
  status: "OPEN", budget: 12000, currency: "USD", proposals: [], files: [], comments: [], skills: ["Vue", "Accessibility"],
};
state.jobs.unshift(project);
useSupplier("user-freelancer-john", "sup-3");
const proposal = store.submitProposal(project.id, {
  amount: 11800, completionTime: "3 weeks", coverLetter: "Accessible, tested delivery.",
  milestones: [{ title: "Accessible prototype", amount: 5000 }, { title: "Implementation and handoff", amount: 6800 }],
});
check(Boolean(proposal) && proposal.bid === 11800, "A supplier submits one validated proposal with milestones");
useBuyer();
const contract = store.awardJobProposal(project, proposal);
check(Boolean(contract) && project.contractId === contract.id && contract.milestones[0].status === "Funded", "Awarding a project creates a contract and funds the first milestone");
const task = { id: "task-demo", title: "Validate accessible prototype", status: "Todo", assignedTo: ["user-freelancer-john"] };
contract.milestones[0].tasks.push(task);
useSupplier("user-freelancer-john", "sup-3");
check(store.updateMilestoneTask(contract, contract.milestones[0], task, "Done"), "The assigned provider can complete a milestone task");
useBuyer();
check(store.release(contract, contract.milestones[0]) && contract.milestones[0].status === "Released", "Only the buyer/admin can release funded milestone payment");

console.log("=== COMPLETE LIFECYCLE PASSED ===");
