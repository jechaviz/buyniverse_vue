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
new Function("window", read("app/store/procurementDomainActions.js"))(windowScope);
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

(async () => {
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
store.notice = () => {};

console.log("=== LIVE AUCTION: THE SERVER LEDGER DECIDES ===");
const request = { id: "PR-LEDGER", title: "Ledger test", ownerId: "user-client-brenda", requesterId: "user-client-brenda", approverId: "user-admin-admin", status: "Approved", currency: "USD", amount: 50000, items: [{ description: "x", quantity: 1, unitPrice: 50000 }] };
state.purchaseRequests.unshift(request);
const event = { id: "AUC-LEDGER", title: "Ledger auction", type: "Auction", status: "Draft", ownerId: "user-client-brenda", requestId: request.id, budget: 50000, currency: "USD", deadline: new Date(Date.now() + 20 * 60000).toISOString(), autoExtend: true, invitedSupplierIds: ["sup-2", "sup-3", "sup-5"], lots: [{ id: "l", description: "x", quantity: 1 }], quotes: [], audit: [] };
state.sourcingEvents.unshift(event);
const auction = store.publishSourcingEvent(event).auction;
useSupplier("user-freelancer-john", "sup-3");
store.isDemo.value = false;

// A tiny stand-in for the PHP ledger: same rule, integer cents, its own truth.
let serverBest = 4000000, serverStatus = "running", serverBids = [], published = 0, fail = null;
const room = {
  placeBid(_room, amount) {
    if (fail) return Promise.reject(fail);
    const cents = Math.round(Number(amount) * 100);
    if (serverStatus !== "running") return Promise.reject(Object.assign(new Error("closed"), { status: 409, body: { error: "Live room is not accepting offers" } }));
    if (cents > serverBest - 10000) return Promise.reject(Object.assign(new Error("x"), { status: 422, body: { error: `Bid must be ${((serverBest - 10000) / 100).toFixed(2)} or lower` } }));
    serverBest = cents; serverBids.push({ id: serverBids.length + 1, bidderId: "p", amount: (cents / 100).toFixed(2), at: new Date().toISOString() });
    return Promise.resolve({ accepted: true, duplicate: false, extended: false, bidId: serverBids.length, amount: (cents / 100).toFixed(2), bestAmount: (cents / 100).toFixed(2), status: serverStatus, closesAt: new Date(Date.now() + 600000).toISOString(), extensionCount: 0, leading: true });
  },
  state() { return Promise.resolve({ role: "bidder", status: serverStatus, bestAmount: (serverBest / 100).toFixed(2), closesAt: new Date(Date.now() + 600000).toISOString(), extensionCount: 1, leading: false }); },
  bids() { return Promise.resolve({ bids: [] }); },
  publish() { published += 1; return null; },
  createRoom: () => Promise.resolve(null), subscribe: () => () => {},
};
windowScope.BuyniverseAuctionRealtime = room;

const localBefore = auction.currentBid;
let bid = await store.placeLiveAuctionBid(auction, 39000);
check(bid && auction.currentBid === 39000 && auction.bids.at(-1).amount === 39000 && auction.bids.at(-1).source === "Server ledger", "An accepted bid updates the local copy from the server's verdict");
check(published === 0, "The browser does not publish a second, self-declared signal for a ledger bid");

const bidsBefore = auction.bids.length, bestBefore = auction.currentBid;
bid = await store.placeLiveAuctionBid(auction, 38950);
check(bid === null && auction.bids.length === bidsBefore && auction.currentBid === bestBefore, "A bid the server refuses changes nothing locally");

// The local copy is stale: it thinks 39000 is the price, the ledger already moved on.
serverBest = 3800000;
bid = await store.placeLiveAuctionBid(auction, 38000);
check(bid === null, "A bid that was valid on a stale local copy is still refused by the ledger");
await new Promise((resolve) => setTimeout(resolve, 0));
check(auction.currentBid === 38000, "A refusal re-syncs the stale local copy to the ledger's price");

fail = Object.assign(new Error("offline"), { status: 503 });
bid = await store.placeLiveAuctionBid(auction, 30000);
check(bid === null && auction.currentBid === 38000, "An unreachable server never makes a bid valid");
fail = null;

serverStatus = "paused";
const synced = await store.syncLiveAuction(auction);
check(synced && auction.currentBid === 38000 && auction.status === "Paused" && auction.extensionCount === 1, "A sync adopts the ledger's price, status and extension count");

store.isDemo.value = true;
check(await store.syncLiveAuction(auction) === false, "The demo never reads a server ledger");
console.log("=== LEDGER CLIENT CONTRACT PASSED ===");
})().catch((error) => { console.error(error); process.exit(1); });
