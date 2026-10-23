/**
 * "Necesito" store actions: publish a need once and let suppliers compete.
 *
 * publishNeed creates the purchase request. When the person publishing is also
 * the approver (an admin, or the request's approver) the request is approved
 * on the spot and launchNeed opens the quote round or live auction with the
 * suppliers that fit the category. Otherwise the request waits for its approver
 * with the intent attached, and approving it launches the round: governance is
 * never skipped, only the second form is.
 */
(function (global) {
  "use strict";

  var CURRENCIES = ["MXN", "USD", "EUR"];

  function createNeedActions(state, ui, helpers) {
    var scoped = function (record) { return typeof helpers.applyCurrentOperationalScope === "function" ? helpers.applyCurrentOperationalScope(record) : record; };
    var text = function (value, max) {
      var cleaned = global.WebCommon && global.WebCommon.sanitizeText ? global.WebCommon.sanitizeText(value, max) : String(value || "").slice(0, max);
      return String(cleaned || "").trim();
    };
    var uid = function (prefix) { return global.ProcurementCommon && global.ProcurementCommon.uid ? global.ProcurementCommon.uid(prefix) : prefix + "-" + Math.random().toString(36).slice(2, 9); };
    var safeAmount = function (n, min) { return global.WebCommon && global.WebCommon.isSafeAmount ? global.WebCommon.isSafeAmount(n, min) : Number.isFinite(n) && n >= min; };
    var nextId = function (prefix, list, base) {
      var n = base + list.length;
      while (list.some(function (item) { return item.id === prefix + n; })) n++;
      return prefix + n;
    };

    return {
      /** Can the current person decide on this request without waiting for anyone? */
      canApproveRequest(request) {
        var user = this.currentUser && this.currentUser.value;
        return Boolean(request && user && ((this.isAdmin && this.isAdmin.value) || request.approverId === user.id));
      },

      /** Validate a need and create its purchase request. Returns { request, event, auction, pending } or null. */
      publishNeed(input) {
        input = input || {};
        var user = this.currentUser && this.currentUser.value;
        if (!user || (this.marketplaceMode && this.marketplaceMode.value === "supplier")) { this.notice("Only buyers can publish a need", "fa-shield-halved"); return null; }
        var Need = global.BuyniverseNeed;
        var title = text(input.text, 160);
        var category = Need.byKey(input.category) || Need.byKey(Need.guess(title)) || Need.byKey("products");
        var blank = function (v) { return v === undefined || v === null || v === ""; };
        var quantity = blank(input.quantity) ? 1 : Number(input.quantity), budget = Number(input.budget), days = blank(input.days) ? 7 : Number(input.days);
        var currency = CURRENCIES.indexOf(input.currency) >= 0 ? input.currency : "USD";
        var mode = input.mode === "auction" ? "auction" : "rfq";
        if (title.length < 3 || !Number.isInteger(quantity) || quantity < 1 || quantity > 1000000 || !safeAmount(budget, 0.01) || !Number.isInteger(days) || days < 1 || days > 90) {
          this.notice("Complete what you need, the quantity and your maximum budget", "fa-triangle-exclamation");
          return null;
        }
        var request = scoped({
          id: nextId("PR-", state.purchaseRequests, 2410), title: title, requesterId: user.id, ownerId: user.id, approverId: "user-admin-admin",
          department: text(input.department, 80) || "Purchasing", amount: Number(budget.toFixed(2)), currency: currency, status: "Draft", priority: "Medium",
          category: category.label, dueDate: new Date(Date.now() + days * 86400000).toISOString(), budgetCode: "", notes: text(input.notes, 2000),
          nextAction: "Submit for approval", items: [{ id: uid("pr-line"), description: title, quantity: quantity, unitPrice: Number((budget / quantity).toFixed(2)) }], audit: [],
          need: { mode: mode, days: days, minutes: Math.max(10, Math.min(1440, Number(input.minutes) || 60)), categoryKey: category.key },
        });
        state.purchaseRequests.unshift(request);
        this.procurementEvent(request, "Need published", category.label + " · " + title, "success");
        if (this.canApproveRequest(request)) {
          this.procurementTransition(request, "Approved", "Approved by the publisher");
          var launched = this.launchNeed(request);
          return { request: request, event: launched && launched.event, auction: launched && launched.auction, pending: false };
        }
        this.procurementTransition(request, "Pending approval", "Submitted to " + ((this.user && this.user(request.approverId) && this.user(request.approverId).name) || "the approver"));
        request.nextAction = "Approval decision";
        if (this.addNotification) this.addNotification({ userId: request.approverId, title: "A need is waiting for your approval", text: request.id + " · " + title, link: "/procurement/queue?request=" + request.id, icon: "fa-stamp" });
        return { request: request, event: null, auction: null, pending: true };
      },

      /**
       * Publish a shopping list. Lines with a chosen price (a supplier's price list) become one purchase request per
       * supplier; lines without one (not on any price list, or typed by the buyer) go together into a quick quote that
       * suppliers answer within `hours`. Returns { requests, event, pending, priced, quick, invited } or null.
       */
      publishShoppingList(input) {
        input = input || {};
        var user = this.currentUser && this.currentUser.value;
        if (!user || (this.marketplaceMode && this.marketplaceMode.value === "supplier")) { this.notice("Only buyers can publish a need", "fa-shield-halved"); return null; }
        var Need = global.BuyniverseNeed;
        var raw = Array.isArray(input.lines) ? input.lines.slice(0, 60) : [];
        var hours = Number(input.hours) > 0 ? Math.min(168, Number(input.hours)) : 24;
        var priced = {}, quick = [], invalid = false;
        raw.forEach(function (line) {
          var product = line.productId ? state.products.filter(function (p) { return p.id === line.productId; })[0] : null;
          var quantity = Number(line.quantity), description = text(line.description || (product && product.description), 160);
          if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000 || description.length < 3) { invalid = true; return; }
          var offer = product && line.offerId ? (product.offers || []).filter(function (o) { return o.id === line.offerId; })[0] : null;
          if (offer) {
            var unitPrice = Number(offer.price);
            if (!safeAmount(unitPrice, 0.01)) { invalid = true; return; }
            (priced[offer.supplierId] = priced[offer.supplierId] || []).push({ product: product, offer: offer, description: description, quantity: quantity, unitPrice: unitPrice });
            return;
          }
          var estimate = Number(line.budget) > 0 ? Number(line.budget) : product ? Number(product.referencePrice || product.rate) : 0;
          if (!safeAmount(estimate, 0.01)) { invalid = true; return; }
          quick.push({ product: product, description: description, quantity: quantity, unitPrice: estimate, spec: text(line.spec, 300) });
        });
        var suppliersWithPrice = Object.keys(priced);
        if (invalid || (!suppliersWithPrice.length && !quick.length)) {
          this.notice("Complete the quantity of each item; an item that is not in the catalog also needs a budget", "fa-triangle-exclamation");
          return null;
        }
        var invited = [];
        if (quick.length) {
          invited = Need.quickQuoteSuppliers(state, quick.map(function (l) { return l.product && l.product.id; }), hours).slice(0, 6);
          if (invited.length < 2) { this.notice("Fewer than two suppliers can answer in that time; allow more time", "fa-triangle-exclamation"); return null; }
        }
        var requests = [], event = null, pending = false, store = this;
        var currencyOf = function (lines) { var withProduct = lines.filter(function (l) { return l.product; })[0]; return (withProduct && withProduct.product.currency) || "MXN"; };
        var open = function (request) {
          store.procurementEvent(request, "Shopping list published", request.title, "success");
          if (store.canApproveRequest(request)) { store.procurementTransition(request, "Approved", "Approved by the publisher"); return true; }
          store.procurementTransition(request, "Pending approval", "Submitted to " + ((store.user && store.user(request.approverId) && store.user(request.approverId).name) || "the approver"));
          request.nextAction = "Approval decision"; pending = true;
          if (store.addNotification) store.addNotification({ userId: request.approverId, title: "A shopping list is waiting for your approval", text: request.id + " · " + request.title, link: "/procurement/queue?request=" + request.id, icon: "fa-stamp" });
          return false;
        };
        suppliersWithPrice.forEach(function (supplierId) {
          var lines = priced[supplierId], supplier = state.suppliers.filter(function (s) { return s.id === supplierId; })[0];
          var amount = Number(lines.reduce(function (sum, l) { return sum + l.quantity * l.unitPrice; }, 0).toFixed(2));
          var request = scoped({
            id: nextId("PR-", state.purchaseRequests, 2410), title: "Shopping list · " + (supplier ? supplier.name : supplierId), requesterId: user.id, ownerId: user.id, approverId: "user-admin-admin",
            department: text(input.department, 80) || "Purchasing", amount: amount, currency: currencyOf(lines), status: "Draft", priority: "Medium", category: lines[0].product.category,
            dueDate: new Date(Date.now() + Math.max.apply(null, lines.map(function (l) { return l.offer.leadDays || 7; })) * 86400000).toISOString(), budgetCode: "CATALOG-2026",
            notes: text(input.notes, 2000), nextAction: "Submit for approval", supplierId: supplierId, preferredOfferId: lines[0].offer.id,
            items: lines.map(function (l) { return { id: uid("pr-line"), productId: l.product.id, description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, supplierId: supplierId }; }), audit: [],
          });
          state.purchaseRequests.unshift(request); requests.push(request); open(request);
        });
        if (quick.length) {
          var amountQuick = Number(quick.reduce(function (sum, l) { return sum + l.quantity * l.unitPrice; }, 0).toFixed(2));
          var quickRequest = scoped({
            id: nextId("PR-", state.purchaseRequests, 2410), title: "Shopping list · quick quote (" + quick.length + (quick.length === 1 ? " item" : " items") + ")", requesterId: user.id, ownerId: user.id, approverId: "user-admin-admin",
            department: text(input.department, 80) || "Purchasing", amount: amountQuick, currency: currencyOf(quick), status: "Draft", priority: "High", category: "Hardware",
            dueDate: new Date(Date.now() + hours * 3600000).toISOString(), budgetCode: "", notes: text(input.notes, 2000), nextAction: "Submit for approval",
            items: quick.map(function (l) { return { id: uid("pr-line"), productId: l.product ? l.product.id : undefined, description: l.description + (l.spec ? " - " + l.spec : ""), quantity: l.quantity, unitPrice: l.unitPrice }; }), audit: [],
            need: { mode: "rfq", days: Math.max(1, Math.ceil(hours / 24)), hours: hours, minutes: 60, categoryKey: "products", supplierIds: invited.map(function (s) { return s.id; }) },
          });
          state.purchaseRequests.unshift(quickRequest); requests.push(quickRequest);
          if (open(quickRequest)) { var launched = this.launchNeed(quickRequest); event = launched && launched.event; }
        }
        return { requests: requests, event: event, pending: pending, priced: suppliersWithPrice.length, quick: quick.length, invited: invited.length };
      },

      /** Open the quote round or live auction for an approved need, inviting the suppliers that fit. */
      launchNeed(request) {
        var intent = request && request.need;
        if (!intent || request.status !== "Approved" || request.sourcingEventId) return null;
        // Approving a need is the decision to open it. The approver is not the owner, so the
        // management checks of the steps below run as the owner for this one call only.
        var store = this, original = this.canManageProcurement;
        var owned = function (record) { return Boolean(record && (record.id === request.id || record.requestId === request.id)) || original.call(store, record); };
        if (!original.call(this, request) && !this.canApproveRequest(request)) return null;
        this.canManageProcurement = owned;
        try { return this.openNeedRound(request, intent); } finally { this.canManageProcurement = original; }
      },

      /** Internal: build and publish the round once the caller's right to do so has been established. */
      openNeedRound(request, intent) {
        // A shopping list's quick quote names the suppliers it invited; any other need is matched by category.
        var suppliers = intent.supplierIds && intent.supplierIds.length
          ? state.suppliers.filter(function (s) { return intent.supplierIds.indexOf(s.id) >= 0; })
          : global.BuyniverseNeed.matchSuppliers(state, intent.categoryKey, 4);
        if (suppliers.length < 2) { this.notice("Fewer than two suppliers fit this need yet", "fa-triangle-exclamation"); return null; }
        var auction = intent.mode === "auction";
        var year = new Date().getFullYear();
        var event = scoped({
          id: nextId(auction ? "AUC-" + year + "-" : "RFQ-" + year + "-", state.sourcingEvents, 100), title: text(request.title, 160), type: auction ? "Auction" : "RFQ", status: "Draft",
          requestId: request.id, projectId: request.projectId || null, ownerId: request.ownerId, budget: Number(request.amount), currency: request.currency, round: 1,
          deadline: new Date(Date.now() + (auction ? intent.minutes * 60000 : intent.hours ? intent.hours * 3600000 : intent.days * 86400000)).toISOString(), visibility: "Private", autoExtend: auction,
          publishedAt: null, invitedSupplierIds: suppliers.map(function (s) { return s.id; }), messagesOpen: 0, savingsTarget: auction ? 10 : 8, awardReason: "", awardedSupplierId: null,
          weights: auction ? { price: 55, quality: 20, delivery: 10, risk: 10, esg: 5 } : { price: 40, quality: 25, delivery: 15, risk: 15, esg: 5 },
          lots: (request.items || []).map(function (item) { return { id: uid("lot"), description: item.description, quantity: item.quantity, unit: "unit", ceiling: Number((item.quantity * item.unitPrice).toFixed(2)), targetPrice: item.unitPrice }; }),
          quotes: [], files: [], audit: [],
        });
        state.sourcingEvents.unshift(event);
        request.sourcingEventId = event.id;
        this.procurementTransition(request, "RFQ in progress", suppliers.length + " suppliers invited");
        request.nextAction = "Collect supplier offers";
        var published = this.publishSourcingEvent(event);
        if (!published) return null;
        var supplierIds = suppliers.map(function (s) { return s.id; });
        state.users.filter(function (u) { return supplierIds.indexOf(u.supplierProfileId) >= 0; }).forEach(function (u) {
          if (this.addNotification) this.addNotification({ userId: u.id, title: "A buyer needs " + request.title, text: "Send your offer before the round closes.", link: auction ? "/procurement/auction?auction=" + event.id : "/procurement/sourcing?event=" + event.id, icon: "fa-gavel" });
        }, this);
        return published;
      },
    };
  }

  var api = { createNeedActions: createNeedActions };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.BuyniverseNeedActions = api;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
