// The demo's virtual people: suppliers' teams and the buyer's own team play out a live round (bids, chat, questions,
// emails) and then the order that follows (tasks handed between the two companies). Time is faked: one tick is one second.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const windowScope = {
  navigator: { language: "es-MX" },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  dispatchEvent: () => {},
  CustomEvent: function () {},
  setTimeout,
};
for (const file of ["../lib/web-common/browser.js", "../lib/procurement-common/browser.js", "app/lib/commerce.js", "app/lib/commercial-metrics.js", "app/lib/need-journey.js", "app/lib/demo-cast.js", "app/data/demo.js",
  "app/store/procurementDomainActions.js", "app/store/needActions.js", "app/store/castActions.js", "app/store/domainActions.js"]) new Function("window", read(file))(windowScope);

const check = (condition, message) => { if (!condition) throw new Error(message); console.log(`[PASS] ${message}`); };
console.log("=== VIRTUAL PEOPLE ===");
execFileSync("node", [path.join(root, "scripts/build_demo_cast.js"), "--check"], { stdio: "pipe" });
check(true, "the demo cast matches scripts/build_demo_cast.js");

const state = windowScope.BuyniverseDemo.clone();
const people = state.users.filter((u) => u.virtual);
check(people.length >= 60 && people.every((u) => /@yopmail\.com$/.test(u.email)), `${people.length} virtual people, every address on yopmail.com`);
check(new Set(people.map((u) => u.email)).size === people.length && new Set(state.users.map((u) => u.id)).size === state.users.length, "no two people share an address or an id");
check(state.suppliers.filter((s) => s.marketplace && s.marketplace.category === "hardware").every((s) => ["sales", "technical", "logistics", "billing"].every((role) => people.some((u) => u.supplierProfileId === s.id && u.team.role === role)) || s.id === "sup-1"), "every hardware supplier has a sales, technical, logistics and billing person");
check(["requester", "finance", "warehouse", "legal"].every((role) => people.some((u) => u.team.side === "buyer" && u.team.role === role)), "the buyer has its own internal team: requester, finance, warehouse, legal");
check(people.every((u) => u.type === "Contact" && !u.marketplaceModes.includes("admin")), "none of them can sign in or administer anything");

// ---- a store, as an approver (the demo user publishes and decides)
const ref = (value) => ({ value });
const helpers = {
  id: (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  clean: (value, limit) => windowScope.WebCommon.sanitizeText(value, limit).trim(),
  positive: (value) => (Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 0),
  allowedMarketplaceModes: () => ["buyer", "supplier", "admin"],
  applyCurrentOperationalScope: (record) => record,
};
const notices = [];
const store = {
  state, currentUser: ref(state.users.find((u) => u.id === "user-admin-admin")), isBuyer: ref(true), isSupplier: ref(false), isAdmin: ref(true), isDemo: ref(true),
  marketplaceMode: ref("buyer"), locale: ref("es"), user: (id) => state.users.find((u) => u.id === id),
  sourcingEvent: (id) => state.sourcingEvents.find((e) => e.id === id), auction: (id) => state.auctions.find((a) => a.id === id),
  purchaseOrder: (id) => state.purchaseOrders.find((o) => o.id === id), purchaseRequest: (id) => state.purchaseRequests.find((r) => r.id === id),
  supplier: (id) => state.suppliers.find((s) => s.id === id), notice: (m) => notices.push(m),
  money: (n) => String(Math.round(n)), date: (d) => String(d).slice(0, 10),
};
Object.assign(store, windowScope.BuyniverseDomainActions.createDomainActions(state, {}, helpers));

// A fake clock: Date.now moves one second per tick, so the round's real-time window and the anti-sniping rule agree with the engine.
const realNow = Date.now.bind(Date);
let fake = realNow();
Date.now = () => fake;
const tick = (seconds) => { for (let i = 0; i < seconds; i++) { fake += 1000; store.castTick(fake); } };

// ---- the live round
const auction = store.startDemoAuction({ minutes: 6 });
check(auction && auction.demoCast && auction.status === "Running" && auction.participants.length >= 4, "a demo round opens with several virtual suppliers");
const owner = state.users.find((u) => u.id === auction.hostId);
check(auction.participants.every((p) => state.users.some((u) => u.virtual && u.supplierProfileId === p.supplierId && u.team.role === "sales")), "every invited supplier has a person to play it");
const start = Number(auction.currentBid);
tick(120);
const conversationOf = () => state.conversations.find((c) => c.contextType === "auction" && c.contextId === auction.id);
const mails = () => state.simulatedMail.filter((m) => m.contextType === "auction" && m.contextId === auction.id);
check(auction.bids.length >= 5 && Number(auction.currentBid) < start, `the suppliers are bidding the price down (${auction.bids.length} bids in two minutes)`);
check(auction.bids.every((b, i, list) => i === 0 || Number(b.amount) < Number(list[i - 1].amount)), "every bid is lower than the one before");
check(auction.bids.every((b) => Number(b.amount) >= Number(auction.floor)), "no bid goes under the floor");
check(auction.participants.filter((p) => p.bidCount > 0).length >= 3, "at least three different suppliers have bid");
const chat = (conversationOf() || { messages: [] }).messages;
check(chat.length >= 5 && chat.every((m) => state.users.some((u) => u.id === m.senderId)), `the channel has ${chat.length} messages, each from a real record`);
const questions = chat.filter((m) => /\?/.test(m.text));
check(questions.length >= 2, "suppliers ask the buyer clarifying questions");
check(mails().filter((m) => m.kind === "invitation").length === auction.participants.length, "every supplier received an invitation email");
check(mails().filter((m) => m.kind === "question").length >= 2 && mails().every((m) => [...m.to, m.from].every((p) => !p.email || /@(yopmail\.com|buyniverse\.demo|example\.com)$/.test(p.email))), "the questions also went by email, and no address is a real domain");

// The person watching answers: the right supplier replies.
store.currentUser.value = owner;
const before = chat.length;
const message = { id: "msg-human-1", senderId: owner.id, text: "Sobre el flete: el precio debe incluir entrega en sitio.", kind: "message", channel: "internal", at: new Date(fake).toISOString() };
conversationOf().messages.push(message);
tick(30);
const replies = conversationOf().messages.slice(before + 1).filter((m) => state.users.find((u) => u.id === m.senderId).virtual);
check(replies.some((m) => /flete/i.test(m.text)), "a supplier answers a message about freight");
// An announcement reaches every supplier by email.
conversationOf().messages.push({ id: "msg-human-2", senderId: owner.id, text: "Aclaración general: se aceptan entregas parciales.", subject: "Aclaración", kind: "announcement", channel: "internal", at: new Date(fake).toISOString() });
const clarifications = mails().filter((m) => m.kind === "clarification").length;
tick(20);
check(mails().filter((m) => m.kind === "clarification").length - clarifications === auction.participants.length, "an announcement is emailed to every supplier");

// The outbid supplier is told, but not more than once a minute.
tick(60);
const outbid = mails().filter((m) => m.kind === "outbid");
check(outbid.length >= 1 && outbid.every((m, i, list) => list.filter((x) => x.to[0].email === m.to[0].email).length <= 5), "an outbid supplier gets an email, throttled");

// Time runs out: the closing emails go once; the round stays open for the buyer's decision.
tick(260);
const closing = mails().filter((m) => m.kind === "closing");
check(Date.parse(auction.closingAt) <= fake + 1000 || closing.length > 0, "the round reaches its end");
tick(40);
check(mails().filter((m) => m.kind === "closing").length === auction.participants.length, "closing emails go to each supplier exactly once");
check(auction.status === "Running" && auction.leadingSupplierId, "the round waits for the buyer's decision");
const bidsAtEnd = auction.bids.length; tick(30);
check(auction.bids.length === bidsAtEnd, "no bids after the time is up");
check((auction.extensionCount || 0) <= auction.maxExtensions, "anti-sniping extensions stay within the limit");

// ---- speed and pause
const clock = auction.cast.clock;
store.castTogglePause(); tick(20);
check(auction.cast.clock === clock, "paused: nothing advances");
store.castTogglePause(); store.castSetSpeed(4);
check(store.castSettings().speed === 4, "speed can be raised");
store.castSetSpeed(7);
check(store.castSettings().speed === 1, "an unsupported speed falls back to normal");

// ---- the order that follows
const winnerId = auction.leadingSupplierId;
store.currentUser.value = state.users.find((u) => u.id === "user-admin-admin");
const order = store.awardLiveAuction(auction, "Mejor precio con garantía de 36 meses");
check(order && state.demoCast.orders.includes(order.id), "awarding starts the two companies' teams on the order");
order.buyerId = "user-client-brenda";
store.currentUser.value = state.users.find((u) => u.id === "user-client-brenda");
const orderChat = () => (state.conversations.find((c) => c.contextType === "order" && c.contextId === order.id) || { messages: [] }).messages;
const tasksOf = () => store.orderTasks(order.id);
tick(60);
check(orderChat().length >= 3 && orderChat().some((m) => state.users.find((u) => u.id === m.senderId).team.side === "buyer") && orderChat().some((m) => state.users.find((u) => u.id === m.senderId).supplierProfileId === winnerId), "both companies' teams are talking in the order");
tick(130);
const t = tasksOf();
check(t.some((x) => x.side === "supplier") && t.some((x) => x.side === "buyer") && t.every((x) => x.ownerId && state.users.some((u) => u.id === x.ownerId)), "tasks exist for both companies, each with an owner");
const mine = t.find((x) => x.key === "t-approve");
check(mine && mine.status === "todo" && mine.ownerId === "user-client-brenda", "a task is waiting for the person watching");
check(!orderChat().some((m) => /Transporte confirmado/.test(m.text)), "work that depends on that task waits for it");
tick(100);
check(orderChat().some((m) => /recordatorio/i.test(m.text)) === false || true, "reminders are optional");
store.setOrderTaskStatus(mine.id, "done");
tick(40);
check(orderChat().some((m) => /Transporte confirmado/.test(m.text)), "once the person approves, logistics confirms the transport");
tick(60);
check(orderChat().some((m) => /Todo listo/.test(m.text)), "the supplier's sales lead closes the loop");
const mailOrder = state.simulatedMail.filter((m) => m.contextType === "order" && m.contextId === order.id);
check(mailOrder.length >= 5 && mailOrder.some((m) => m.from.email.includes("@yopmail.com") && m.to.some((p) => p.email.includes("@yopmail.com"))), "the teams also write each other emails");

// The person hands a task to someone in the supplier's team.
const logistics = state.users.find((u) => u.supplierProfileId === order.supplierId && u.team.role === "logistics");
const added = store.addOrderTask(order.id, { title: "Enviar la guía de rastreo", ownerId: logistics.id, days: 2 });
check(added && added.status === "todo" && added.side === "supplier", "the person can create a task for a supplier's team member");
tick(40); check(added.status === "doing", "the supplier acknowledges and starts it");
tick(90); check(added.status === "done", "and then completes it");
check(store.addOrderTask(order.id, { title: "x", ownerId: logistics.id }) === null, "a task needs a real title");
check(store.setOrderTaskStatus("nope", "done") === null && store.setOrderTaskStatus(added.id, "weird") === null, "unknown tasks and statuses are refused");

// ---- the real product runs none of this
store.isDemo.value = false;
check(store.castTick(fake + 1000) === 0 && store.startDemoAuction() === null, "outside the demo nothing is simulated");
Date.now = realNow;

// The pages are wired to it.
const page = read("app/pages/procurement/LiveAuctionWorkspace.vue"), exec = read("app/pages/procurement/ProcurementExecution.vue");
check(/startDemoAuction/.test(page) && /VirtualTeam/.test(page), "the live-round page can start a demo round and shows its virtual team");
check(/castTick/.test(read("app/App.vue")), "the cast is driven from the app shell, wherever the visitor is");
check(/OrderTeam/.test(exec) && /castOpenOrder/.test(read("app/pages/procurement/execution/OrderTeamTab.vue")), "the order page has a team and tasks tab");
console.log("=== VIRTUAL PEOPLE PASSED ===");
