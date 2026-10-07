/**
 * "Necesito": the one idea behind Buyniverse.
 *
 * A buyer states a need once; suppliers compete for it; the buyer chooses,
 * receives and pays. Requests, quote rounds, live bids, orders and invoices are
 * not separate modules: they are the five stages of one object, the need.
 * This file is that object's model: categories, stage rules, supplier matching
 * and the journey of every need in the workspace. Pure functions of the state,
 * so the browser, QA under Node and (later) the server read it the same way.
 */
(function (global) {
  "use strict";

  // One accent per kind of purchase. The accent recolors everything the need touches.
  var CATEGORIES = [
    { key: "products", label: "Products", color: "#36e3c0", icon: "fa-box-open", ph: "equipment and goods", keywords: /laptop|equipo|mobiliari|c[oó]mputo|compra|hardware|computer|furniture|device|servidor|server|monitor|impresora|printer/,
      match: function (m) { return (m.sector === "technology" && m.category === "hardware") || (m.sector === "operations" && m.category === "office") ? 2 : m.sector === "technology" ? 1 : 0; } },
    { key: "talent", label: "Talent", color: "#a37bff", icon: "fa-user-astronaut", ph: "specialists", keywords: /desarroll|dise[ñn]|analista|program|ingenier|contrat|personal|talento|developer|designer|engineer|freelanc|hire/,
      match: function (m) { return (m.sector === "technology" && m.category === "software") || (m.sector === "services" && m.category === "design") ? 2 : m.sector === "services" ? 1 : 0; } },
    { key: "services", label: "Services", color: "#4d9dff", icon: "fa-screwdriver-wrench", ph: "professional services", keywords: /servicio|mantenim|limpie|audit|consult|seguridad|cyber|service|maintenance|cleaning/,
      match: function (m) { return (m.sector === "services" && (m.category === "consulting" || m.category === "marketing")) || m.category === "cybersecurity" ? 2 : m.sector === "services" ? 1 : 0; } },
    { key: "projects", label: "Projects", color: "#ffb44d", icon: "fa-helmet-safety", ph: "turnkey projects", keywords: /obra|proyecto|remodel|\berp\b|construc|implementaci|project|build|renovat/,
      match: function (m) { return (m.sector === "services" && m.category === "consulting") || (m.sector === "technology" && m.category === "software") ? 2 : m.sector === "operations" ? 1 : 0; } },
    { key: "freight", label: "Freight", color: "#ff6b8b", icon: "fa-truck-fast", ph: "transport and logistics", keywords: /flete|transporte|log[ií]stic|carga|env[ií]o|cami[oó]n|freight|shipping|truck|cargo/,
      match: function (m) { return m.sector === "logistics" ? (m.category === "transport" ? 2 : 1) : 0; } },
    { key: "supplies", label: "Supplies", color: "#c6e84a", icon: "fa-boxes-stacked", ph: "supplies and materials", keywords: /papel|insumo|material|\bepp\b|protecci|caf[eé]|supplies|stationery|packag|empaque|el[eé]ctric/,
      match: function (m) { return m.sector === "operations" ? (m.category === "mro" || m.category === "packaging" ? 2 : 1) : 0; } },
  ];

  // The five stages of a need. `to` is where the work for that stage happens.
  var STAGES = [
    { key: "publish", label: "Publish", verb: "You publish", icon: "fa-bullhorn" },
    { key: "compete", label: "Compete", verb: "They compete", icon: "fa-gavel" },
    { key: "choose", label: "Choose", verb: "You choose", icon: "fa-scale-balanced" },
    { key: "receive", label: "Receive", verb: "You receive", icon: "fa-truck-ramp-box" },
    { key: "pay", label: "Pay", verb: "You pay", icon: "fa-credit-card" },
  ];

  var RECORD_CATEGORY = { hardware: "products", technology: "products", software: "talent", development: "talent", mobile: "talent", design: "talent", "web design": "talent",
    services: "services", consulting: "services", marketing: "services", cybersecurity: "services", logistics: "freight", transport: "freight", trade: "freight",
    packaging: "supplies", operations: "supplies", office: "supplies", mro: "supplies", supplies: "supplies" };

  function byKey(key) { return CATEGORIES.filter(function (c) { return c.key === key; })[0] || null; }

  /** Best category for free text, or null when nothing in it says what is being bought. */
  function guess(text) {
    var l = String(text || "").toLowerCase();
    if (l.trim().length < 3) return null;
    var hit = CATEGORIES.filter(function (c) { return c.keywords.test(l); })[0];
    return hit ? hit.key : null;
  }

  function categoryOfRecord(record, state) {
    var raw = String((record && record.category) || "").toLowerCase();
    if (RECORD_CATEGORY[raw]) return byKey(RECORD_CATEGORY[raw]);
    var found = guess((record && record.title) || "");
    if (found) return byKey(found);
    var supplier = record && record.supplierId && state && (state.suppliers || []).filter(function (s) { return s.id === record.supplierId; })[0];
    var m = supplier && supplier.marketplace;
    if (m) { var best = CATEGORIES.filter(function (c) { return c.match(m) > 1; })[0]; if (best) return best; }
    return byKey("products");
  }

  /** Suppliers able to answer a need, best first. Never offers a supplier the risk rule excludes. */
  function matchSuppliers(state, categoryKey, limit) {
    var cat = byKey(categoryKey);
    var list = (state.suppliers || []).filter(function (s) { return !s.marketplace || s.marketplace.listed !== false; });
    var ranked = list.map(function (s) {
      // The supplier master nests the listing under `marketplace`; public profiles are already flat.
      var m = s.marketplace || s;
      return { supplier: s, fit: cat ? cat.match(m) : 0 };
    }).filter(function (x) { return Number(x.supplier.risk) <= 40; });
    ranked.sort(function (a, b) { return b.fit - a.fit || Number(b.supplier.score) - Number(a.supplier.score); });
    var fit = ranked.filter(function (x) { return x.fit > 0; });
    return (fit.length >= 2 ? fit : ranked).slice(0, limit || 4).map(function (x) { return x.supplier; });
  }

  function isPaid(invoice) {
    if (!invoice) return false;
    var s = String(invoice.paymentStatus || invoice.status || "").toLowerCase();
    return /paid|pagad/.test(s) && !/unpaid|no pagad/.test(s);
  }

  function minPrice(event, auction) {
    var prices = ((event && event.quotes) || []).map(function (q) { return Number(q.price); }).filter(function (n) { return n > 0; });
    if (auction && (auction.bids || []).length) prices.push(Number(auction.currentBid));
    return prices.length ? Math.min.apply(null, prices) : null;
  }

  /** Stage (1..5) and what to do next for one need. */
  function place(request, event, auction, order, invoice) {
    var q = encodeURIComponent;
    if (order) {
      var issues = (order.exceptions || []).filter(function (x) { return x.status !== "Resolved"; }).length;
      if (/matched|closed|invoiced/i.test(order.status)) {
        var paid = isPaid(invoice);
        return { stage: 5, done: paid, attention: false, next: paid ? { label: "Paid", to: "/invoices/" + q(invoice.id) } : invoice ? { label: "Review and pay", to: "/invoices/" + q(invoice.id) } : { label: "Match invoice", to: "/procurement/execution?order=" + q(order.id) + "&tab=matching" } };
      }
      return { stage: 4, done: false, attention: issues > 0, note: issues ? issues + " open" : "", next: { label: issues ? "Resolve issue" : "Record receipt", to: "/procurement/execution?order=" + q(order.id) } };
    }
    if (event && event.status === "Awarded") return { stage: 4, done: false, attention: true, next: { label: "Create order", to: "/procurement/sourcing?event=" + q(event.id) + "&tab=award" } };
    if (event && event.status !== "Draft") {
      var quotes = (event.quotes || []).length, live = auction && /running|paused|scheduled/i.test(auction.status);
      if (live || event.status === "Running") return { stage: 2, done: false, attention: false, live: true, next: { label: "Watch live bids", to: "/procurement/auction?auction=" + q((auction && auction.id) || event.id) } };
      if (event.status === "Comparing" || (event.status === "Closed" && quotes) || (auction && /ended|closed/i.test(auction.status)))
        return { stage: 3, done: false, attention: true, next: { label: "Compare offers", to: "/procurement/sourcing?event=" + q(event.id) + "&tab=comparison" } };
      return { stage: 2, done: false, attention: false, next: { label: "Follow offers", to: "/procurement/sourcing?event=" + q(event.id) + "&tab=bidsheet" } };
    }
    if (event) return { stage: 1, done: false, attention: false, next: { label: "Complete the round", to: "/procurement/sourcing?event=" + q(event.id) } };
    var st = request.status;
    var go = "/procurement/queue?request=" + q(request.id);
    if (st === "Pending approval") return { stage: 1, done: false, attention: true, next: { label: "Review decision", to: go } };
    if (st === "Approved") return { stage: 1, done: false, attention: false, next: { label: "Start quotes", to: go } };
    if (st === "Rejected") return { stage: 1, done: false, attention: true, next: { label: "Revise request", to: go } };
    return { stage: 1, done: false, attention: false, next: { label: "Send for approval", to: go } };
  }

  /** Every need in the workspace, those asking for a hand first. */
  function journey(state) {
    var requests = (state.purchaseRequests || []).filter(function (r) { return !r.archived && r.status !== "Closed"; });
    var events = state.sourcingEvents || [], auctions = state.auctions || [], orders = state.purchaseOrders || [], invoices = state.invoices || [];
    var used = {};
    function build(request, order) {
      var mine = events.filter(function (e) { return request && (e.requestId === request.id || e.id === request.sourcingEventId); });
      var event = mine.filter(function (e) { return e.status !== "Closed"; })[0] || mine[mine.length - 1] || null;
      var o = order || (request && orders.filter(function (x) { return x.requestId === request.id; })[0]) || (event && orders.filter(function (x) { return x.eventId === event.id; })[0]) || null;
      var auction = event && auctions.filter(function (a) { return a.eventId === event.id; })[0] || null;
      var invoice = o && o.invoiceId ? invoices.filter(function (i) { return i.id === o.invoiceId; })[0] : null;
      if (o) used[o.id] = true;
      var spot = place(request || {}, event, auction, o, invoice);
      var base = request || o;
      var cat = categoryOfRecord(request || o, state);
      return { id: base.id, title: base.title || (o && o.id), category: cat, stage: spot.stage, done: spot.done, attention: spot.attention, live: Boolean(spot.live), note: spot.note || "", next: spot.next,
        budget: Number(request ? request.amount : o.total) || 0, currency: base.currency || "USD", offers: event ? (event.quotes || []).length + (auction ? (auction.participants || []).filter(function (p) { return p.bidCount > 0; }).length : 0) : 0,
        best: minPrice(event, auction), eventId: event && event.id, auctionId: auction && auction.id, orderId: o && o.id, requestId: request && request.id, invoiceId: invoice && invoice.id };
    }
    var needs = requests.map(function (r) { return build(r, null); });
    orders.forEach(function (o) { if (!used[o.id] && !needs.some(function (n) { return n.orderId === o.id; })) needs.push(build(null, o)); });
    needs.sort(function (a, b) { return (b.attention ? 1 : 0) - (a.attention ? 1 : 0) || a.stage - b.stage || String(a.id).localeCompare(String(b.id)); });
    return needs;
  }

  function counts(needs) {
    var out = [0, 0, 0, 0, 0], attention = [0, 0, 0, 0, 0];
    needs.forEach(function (n) { if (!n.done) { out[n.stage - 1]++; if (n.attention) attention[n.stage - 1]++; } });
    return { open: out, attention: attention, total: needs.filter(function (n) { return !n.done; }).length };
  }

  /** The journey of the needs the current workspace may see (scoped to the active company and location). */
  function fromStore(store) {
    var scoped = function (list) { return typeof store.scopedRecords === "function" ? store.scopedRecords(list || []) : list || []; };
    var st = store.state;
    return journey({ purchaseRequests: scoped(st.purchaseRequests), sourcingEvents: scoped(st.sourcingEvents), auctions: scoped(st.auctions), purchaseOrders: scoped(st.purchaseOrders), invoices: st.invoices || [], suppliers: st.suppliers || [] });
  }

  var api = { fromStore: fromStore, CATEGORIES: CATEGORIES, STAGES: STAGES, byKey: byKey, guess: guess, categoryOfRecord: categoryOfRecord, matchSuppliers: matchSuppliers, journey: journey, counts: counts };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.BuyniverseNeed = api;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
