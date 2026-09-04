(function (global) {
  "use strict";

  function createProcurementDomainActions(state, ui, helpers) {
    const { id, clean, positive, applyCurrentOperationalScope } = helpers;
    const scoped = (record) => typeof applyCurrentOperationalScope === "function"
      ? applyCurrentOperationalScope(record)
      : record;

    const userIds = (ids) => [
      ...new Set((Array.isArray(ids) ? ids : []).filter((userId) =>
        state.users.some((user) => user.id === userId),
      )),
    ].slice(0, 50);

    const supplierUserIds = (supplierIds) => {
      const allowed = new Set(Array.isArray(supplierIds) ? supplierIds : []);
      return state.users
        .filter((user) => allowed.has(user.supplierProfileId))
        .map((user) => user.id);
    };

    const auctionParticipantUserIds = (auction, event) => userIds([
      ...(supplierUserIds((auction?.participants || []).map((participant) => participant.supplierId))),
      ...(supplierUserIds(event?.invitedSupplierIds || [])),
    ]);

    const emitAuctionSignal = (store, auction, event, input = {}) => {
      if (!auction) return null;
      const at = new Date().toISOString();
      const supplierId = input.supplierId || null;
      const actor = state.users.find((user) => user.supplierProfileId === supplierId) || store.currentUser?.value || null;
      const ownerId = event?.ownerId || auction.hostId || null;
      const participantIds = auctionParticipantUserIds(auction, event);
      const extended = input.extended === true;
      const signal = {
        id: id("auction-signal"), type: input.type || "bid_activity", at,
        actorId: actor?.id || null, supplierId, extended, source: input.source || "validated",
      };
      if (!Array.isArray(auction.realtimeEvents)) auction.realtimeEvents = [];
      auction.realtimeEvents.unshift(signal);
      auction.realtimeEvents = auction.realtimeEvents.slice(0, 50);

      const link = `/procurement/auction?auction=${auction.id}`;
      if (ownerId && actor) store.addNotification({
        userId: ownerId, title: "New live offer",
        text: `${actor.name} submitted a validated offer.`, link, icon: "fa-gavel",
      });
      participantIds.forEach((userId) => {
        if (userId === ownerId) return;
        if (userId === actor?.id) {
          store.addNotification({
            userId, title: "Offer recorded", text: "Your valid offer is now in the live round.", link, icon: "fa-circle-check",
          });
        } else {
          // Rival suppliers receive a competitive prompt only. Identity and
          // financial terms stay restricted to the organizer's bid record.
          store.addNotification({
            userId, title: "Live auction moved", text: "A competing offer was recorded. Improve your offer while the round is open.", link, icon: "fa-bolt",
          });
        }
      });
      if (extended) {
        userIds([ownerId, ...participantIds]).forEach((userId) => store.addNotification({
          userId, title: "Auction extended", text: "A valid late offer extended this live round by 60 seconds.", link, icon: "fa-clock-rotate-left",
        }));
      }
      window.BuyniverseAuctionRealtime?.publish?.(auction.realtimeRoomRef || auction.id, "bid_activity", { extended });
      return signal;
    };

    const provisionAuctionSignalRoom = (store, auction, event) => {
      if (!auction) return;
      auction.realtimeRoomRef ||= auction.id;
      auction.realtimeChannel ||= store.isDemo?.value ? "browser" : "pending";
      const participantPrincipalIds = auctionParticipantUserIds(auction, event)
        .filter((value) => /^[a-f0-9-]{36}$/i.test(value));
      if (store.isDemo?.value || participantPrincipalIds.length < 2 || !window.BuyniverseAuctionRealtime?.createRoom) return;
      window.BuyniverseAuctionRealtime.createRoom({
        auctionRef: auction.realtimeRoomRef,
        participantPrincipalIds,
        closesAt: auction.closingAt || auction.endAt,
      }).then((room) => {
        if (!room) return;
        auction.realtimeChannel = "server";
        auction.realtimeRoomReady = true;
      }).catch(() => {
        // A notification channel outage must never change auction validity or
        // prevent a locally validated bid. Polling will retry once a room is
        // provisioned by the organizer.
        auction.realtimeChannel = "browser";
      });
    };

    return {
      canManageProcurement(record) {
        const currentUser = this.currentUser?.value;
        if (!record || !currentUser || !(this.isAdmin?.value || this.isBuyer?.value)) return false;
        if (this.isAdmin?.value) return true;
        return [record.ownerId, record.requesterId, record.buyerId].includes(currentUser.id);
      },

      canConfigureCommercialTerms() {
        const permissions = this.tenantContext?.value?.permissions;
        return Boolean(this.isAdmin?.value || permissions?.manageTenant || (this.isDemo?.value && this.isBuyer?.value));
      },

      setCommercialTerms(input = {}) {
        if (!this.canConfigureCommercialTerms()) {
          this.notice("Commercial terms update denied", "fa-shield-halved");
          return false;
        }
        const rate = Number(input.rate);
        if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
          this.notice("Enter a service fee between 0% and 100%", "fa-triangle-exclamation");
          return false;
        }
        state.procurementAnalytics ||= {};
        state.procurementAnalytics.commercialModel ||= {};
        const model = state.procurementAnalytics.commercialModel;
        const previous = Number(model.gainShareRate);
        model.gainShareRate = Math.round(rate * 100) / 100;
        model.successFeeBasis = input.basis === "buyniverse" ? "buyniverse" : "total";
        model.financialBaseline = "Approved budget";
        state.procurementAudit.unshift({
          id: id("commercial-terms"), at: new Date().toISOString(), actor: this.currentUser.value.name,
          action: "Commercial terms updated", objectId: "COMMERCIAL_TERMS",
          detail: `${Number.isFinite(previous) ? previous : 40}% → ${model.gainShareRate}% of ${model.successFeeBasis === "buyniverse" ? "auction-generated" : "validated total"} savings`, level: "info",
        });
        this.notice("Commercial terms saved", "fa-percent");
        return true;
      },

      createPurchaseOrderFromAward(event, supplierId, quote = {}) {
        if (!event || !supplierId || !this.canManageProcurement(event)) return null;
        const price = positive(quote.price ?? quote.amount);
        const supplier = state.suppliers.find((item) => item.id === supplierId);
        if (!price || !supplier || !(event.invitedSupplierIds || []).includes(supplierId)) return null;
        let order = state.purchaseOrders.find((item) => item.eventId === event.id);
        if (order) return order;
        const lines = (event.lots || []).slice(0, 100).map((lot) => ({
          id: id("po-line"), productId: clean(lot?.productId, 120) || null,
          description: clean(lot?.description, 300), ordered: Math.max(1, Number(lot?.quantity) || 1),
          received: 0, unitPrice: 0,
        })).filter((line) => line.description);
        if (!lines.length) return null;
        const units = lines.reduce((sum, line) => sum + line.ordered, 0) || 1;
        lines.forEach((line) => { line.unitPrice = Math.round((price / units) * 100) / 100; });
        order = scoped({
          id: `PO-${String(7720 + state.purchaseOrders.length)}`,
          title: clean(event.title, 240), requestId: event.requestId || null, eventId: event.id,
          projectId: event.projectId || null, supplierId, buyerId: this.currentUser.value.id,
          status: "Awaiting receipt", total: price, currency: event.currency || "USD",
          receivedPercent: 0, matchStatus: "3-way match", shipTo: "Main warehouse",
          incoterm: "DAP", paymentTerms: clean(quote.terms, 80) || "Net 30",
          eta: new Date(Date.now() + Math.max(1, Number(quote.leadDays) || 14) * 86400000).toISOString(),
          warehouse: "WH-01", invoiceId: null, exceptions: [], lines, receipts: [], audit: [],
          createdAt: new Date().toISOString(),
        });
        state.purchaseOrders.unshift(order);
        this.procurementEvent(order, "Purchase order created", `Generated from ${event.id}`, "success");
        return order;
      },

      awardSourcingEvent(eventRef, supplierId, reason) {
        const event = typeof eventRef === "string" ? this.sourcingEvent(eventRef) : eventRef;
        const decision = clean(reason, 1000).trim();
        const quote = event?.quotes?.find((item) => item.supplierId === supplierId && item.compliant !== false);
        if (!event || !quote || !decision || event.awardedSupplierId || !this.canManageProcurement(event)) {
          this.notice("Supplier selection is not allowed or incomplete", "fa-shield-halved");
          return null;
        }
        const order = this.createPurchaseOrderFromAward(event, supplierId, quote);
        if (!order) return null;
        event.awardedSupplierId = supplierId;
        event.awardReason = decision;
        event.status = "Awarded";
        const request = this.purchaseRequest(event.requestId);
        if (request) { request.status = "Awarded"; request.nextAction = `Order ${order.id} awaiting receipt`; }
        const supplier = state.suppliers.find((item) => item.id === supplierId);
        this.procurementEvent(event, "Supplier selected", `${supplier?.name || supplierId} · ${decision}`, "success");
        supplierUserIds([supplierId]).forEach((userId) => this.addNotification({
          userId, title: "Supplier selected", text: `${event.title} was awarded to your company.`,
          link: `/procurement/execution?order=${order.id}`, icon: "fa-trophy",
        }));
        this.notice("Supplier selected and purchase order created", "fa-trophy");
        return order;
      },

      publishSourcingEvent(eventRef) {
        const event = typeof eventRef === "string" ? this.sourcingEvent(eventRef) : eventRef;
        if (!event || !this.canManageProcurement(event) || !["Draft", "Sent"].includes(event.status) ||
          !(event.lots || []).length || (event.invitedSupplierIds || []).length < 2 || !Number.isFinite(Date.parse(event.deadline))) {
          this.notice("Complete items, deadline and at least two suppliers", "fa-triangle-exclamation");
          return null;
        }
        event.publishedAt = new Date().toISOString();
        this.procurementTransition(event, "Published", `${event.invitedSupplierIds.length} suppliers invited`);
        if (event.type === "Auction") {
          const auction = this.startLiveAuction(event.id);
          return auction ? { event, auction } : null;
        }
        return { event, auction: null };
      },

      // A supplier may submit or amend only its own commercial response.  The
      // server implementation applies the same tenant/invitation checks; this
      // client-side guard keeps the demo and the optimistic UI on that exact
      // contract and, importantly, never reads or derives a rival response.
      submitSourcingResponse(eventRef, input = {}) {
        const event = typeof eventRef === "string" ? this.sourcingEvent(eventRef) : eventRef;
        const currentUser = this.currentUser?.value;
        const supplierId = this.currentSupplierId?.value;
        const deadline = Date.parse(event?.deadline);
        const price = positive(input.price ?? input.amount);
        const leadDays = Number(input.leadDays);
        const terms = clean(input.terms, 80);
        const notes = clean(input.notes, 1200);
        const invited = Boolean(supplierId && (event?.invitedSupplierIds || []).includes(supplierId));
        const open = ["Published", "Sent"].includes(event?.status) && Number.isFinite(deadline) && deadline > Date.now();

        if (!event || !currentUser || !supplierId || !this.isSupplier?.value || !invited || !open ||
          !window.WebCommon.isSafeAmount(price, 0.01) || !Number.isInteger(leadDays) || leadDays < 1 || leadDays > 3650 || !terms) {
          this.notice("This sourcing response cannot be submitted", "fa-shield-halved");
          return null;
        }

        const supplier = state.suppliers.find((item) => item.id === supplierId);
        if (!supplier) {
          this.notice("Supplier profile is unavailable", "fa-shield-halved");
          return null;
        }
        event.quotes ||= [];
        const existing = event.quotes.find((item) => item.supplierId === supplierId);
        const now = new Date().toISOString();
        const quote = existing || { id: id("quote"), supplierId, createdAt: now };
        Object.assign(quote, {
          supplierId,
          price,
          leadDays,
          terms,
          notes,
          // Supplier-controlled commercial fields are intentionally limited.
          // Evaluation inputs are sourced from the qualified supplier profile.
          quality: Number(supplier.score) || 0,
          risk: Number(supplier.risk) || 0,
          esg: Number(supplier.esg) || 0,
          compliant: Number(supplier.risk) < 40,
          submittedAt: now,
          updatedAt: now,
        });
        if (!existing) event.quotes.push(quote);

        const action = existing ? "Supplier response updated" : "Supplier response submitted";
        this.procurementEvent(event, action, supplier.name || supplierId, "success");
        if (event.ownerId && event.ownerId !== currentUser.id) {
          this.addNotification({
            userId: event.ownerId,
            title: existing ? "Supplier response updated" : "Supplier response received",
            text: `${supplier.name || "An invited supplier"} responded to ${event.title}.`,
            link: `/procurement/sourcing?event=${event.id}&tab=bidsheet`,
            icon: "fa-file-circle-check",
          });
        }
        this.notice(existing ? "Response updated" : "Response submitted", "fa-circle-check");
        return quote;
      },

      startLiveAuction(eventRef) {
        const event = typeof eventRef === "string" ? this.sourcingEvent(eventRef) : eventRef;
        if (!event || event.type !== "Auction" || !this.canManageProcurement(event)) return null;
        const existing = state.auctions.find((item) => item.eventId === event.id || item.id === event.id);
        if (existing) return existing;
        const budget = positive(event.budget);
        if (!budget || (event.invitedSupplierIds || []).length < 2) return null;
        const requestedClose = Date.parse(event.deadline);
        const closingAt = Number.isFinite(requestedClose) && requestedClose > Date.now()
          ? new Date(requestedClose).toISOString()
          : new Date(Date.now() + 15 * 60000).toISOString();
        const reserve = Math.round(budget * 0.95);
        const floor = Math.max(1, Math.round(budget * 0.78));
        const auction = scoped({
          id: event.id, eventId: event.id, title: clean(event.title, 240), hostId: event.ownerId,
          status: "Running", mode: "Reverse", currency: event.currency || "USD", currentBid: budget,
          startingPrice: budget, reserve, floor, minStep: Math.max(1, Math.round(budget * 0.005)),
          startedAt: new Date().toISOString(), closingAt, endAt: closingAt,
          antiSnipingSeconds: 60, extensionCount: 0, maxExtensions: 5, leadingSupplierId: null,
          participants: event.invitedSupplierIds.slice(0, 50).map((supplierId) => ({
            supplierId, name: state.suppliers.find((supplier) => supplier.id === supplierId)?.name || supplierId,
            bidCount: 0, lastBid: null, rank: "—", autoBid: false, cap: floor, risk: Number(state.suppliers.find((supplier) => supplier.id === supplierId)?.risk) || 0,
          })),
          bids: [], audit: [], createdAt: new Date().toISOString(),
        });
        state.auctions.unshift(auction);
        event.status = "Running";
        this.procurementEvent(event, "Live auction opened", auction.id, "success");
        this.procurementEvent(auction, "Live round opened", `${auction.participants.length} qualified suppliers`, "success");
        provisionAuctionSignalRoom(this, auction, event);
        return auction;
      },

      placeLiveAuctionBid(auctionRef, amount) {
        const auction = typeof auctionRef === "string" ? this.auction(auctionRef) : auctionRef;
        const supplierId = this.currentSupplierId?.value;
        if (!auction || !supplierId || !this.isSupplier?.value) {
          this.notice("Bid submission denied", "fa-shield-halved");
          return null;
        }
        const result = window.ProcurementCommon.placeReverseBid(auction, supplierId, amount, this.currentUser.value.name);
        if (!result.ok) {
          this.notice(result.reason || "Bid submission denied", "fa-triangle-exclamation");
          return null;
        }
        const audit = auction.audit?.[0];
        if (audit) state.procurementAudit.unshift({ ...audit, objectId: auction.id });
        const closeAt = Date.parse(auction.closingAt || auction.endAt);
        const remaining = closeAt - Date.now();
        let extended = false;
        if (auction.autoExtend !== false && remaining >= 0 && remaining <= Math.max(1, Number(auction.antiSnipingSeconds) || 60) * 1000 && auction.extensionCount < auction.maxExtensions) {
          auction.closingAt = new Date(closeAt + 60000).toISOString();
          auction.endAt = auction.closingAt;
          auction.extensionCount += 1;
          extended = true;
          this.procurementEvent(auction, "Anti-sniping extension", "+60 seconds after valid offer", "info");
        }
        const event = this.sourcingEvent(auction.eventId);
        emitAuctionSignal(this, auction, event, { supplierId, extended });
        this.notice("Bid accepted", "fa-gavel");
        return result.bid;
      },

      manageLiveAuction(auctionRef, operation) {
        const auction = typeof auctionRef === "string" ? this.auction(auctionRef) : auctionRef;
        const event = auction ? this.sourcingEvent(auction.eventId) : null;
        if (!auction || !event || !this.canManageProcurement(event)) {
          this.notice("Live round operation denied", "fa-shield-halved");
          return false;
        }
        if (operation === "pause" && auction.status === "Running") {
          auction.status = "Paused";
          this.procurementEvent(auction, "Auction paused", "Organizer intervention", "warning");
          userIds([event.ownerId, ...auctionParticipantUserIds(auction, event)]).forEach((userId) => this.addNotification({
            userId, title: "Auction paused", text: "The organizer paused this live round.", link: `/procurement/auction?auction=${auction.id}`, icon: "fa-pause",
          }));
          window.BuyniverseAuctionRealtime?.publish?.(auction.realtimeRoomRef || auction.id, "auction_paused");
          return true;
        }
        if (operation === "resume" && auction.status === "Paused") {
          auction.status = "Running";
          this.procurementEvent(auction, "Auction resumed", "Bidding live", "success");
          userIds([event.ownerId, ...auctionParticipantUserIds(auction, event)]).forEach((userId) => this.addNotification({
            userId, title: "Auction resumed", text: "The organizer resumed this live round. You may submit a new offer.", link: `/procurement/auction?auction=${auction.id}`, icon: "fa-play",
          }));
          window.BuyniverseAuctionRealtime?.publish?.(auction.realtimeRoomRef || auction.id, "auction_resumed");
          return true;
        }
        if (operation === "extend" && ["Running", "Paused"].includes(auction.status) && auction.extensionCount < auction.maxExtensions) {
          const closeAt = Date.parse(auction.closingAt || auction.endAt);
          const base = Number.isFinite(closeAt) && closeAt > Date.now() ? closeAt : Date.now();
          auction.closingAt = new Date(base + 60000).toISOString();
          auction.endAt = auction.closingAt;
          auction.extensionCount += 1;
          this.procurementEvent(auction, "Time extended", "+60 seconds manual extension", "info");
          userIds([event.ownerId, ...auctionParticipantUserIds(auction, event)]).forEach((userId) => this.addNotification({
            userId, title: "Auction extended", text: "The organizer extended this live round by 60 seconds.", link: `/procurement/auction?auction=${auction.id}`, icon: "fa-clock-rotate-left",
          }));
          window.BuyniverseAuctionRealtime?.publish?.(auction.realtimeRoomRef || auction.id, "auction_extended");
          return true;
        }
        if (operation === "cancel" && ["Running", "Paused"].includes(auction.status)) {
          auction.status = "Closed";
          this.procurementEvent(auction, "Auction cancelled", "Round terminated early", "warning");
          userIds([event.ownerId, ...auctionParticipantUserIds(auction, event)]).forEach((userId) => this.addNotification({
            userId, title: "Auction closed", text: "The organizer closed this live round.", link: `/procurement/auction?auction=${auction.id}`, icon: "fa-ban",
          }));
          window.BuyniverseAuctionRealtime?.publish?.(auction.realtimeRoomRef || auction.id, "auction_closed");
          return true;
        }
        this.notice("That live round operation is not available", "fa-circle-info");
        return false;
      },

      simulateLiveAuctionBid(auctionRef, supplierId) {
        const auction = typeof auctionRef === "string" ? this.auction(auctionRef) : auctionRef;
        if (!this.isDemo?.value || !auction || !this.canManageProcurement(this.sourcingEvent(auction.eventId))) return null;
        const participant = auction.participants?.find((item) => item.supplierId === supplierId && !item.disqualified);
        const amount = auction.currentBid - Math.max(1, Number(auction.minStep) || 1);
        if (!participant || amount < Number(auction.floor)) return null;
        const result = window.ProcurementCommon.placeReverseBid(auction, supplierId, amount, participant.name || "Demo bidder");
        if (result.ok) {
          const audit = auction.audit?.[0];
          if (audit) state.procurementAudit.unshift({ ...audit, objectId: auction.id });
          const event = this.sourcingEvent(auction.eventId);
          emitAuctionSignal(this, auction, event, { supplierId, source: "simulation" });
        }
        return result.ok ? result.bid : null;
      },

      awardLiveAuction(auctionRef, reason) {
        const auction = typeof auctionRef === "string" ? this.auction(auctionRef) : auctionRef;
        const decision = clean(reason, 1000).trim();
        const event = auction ? this.sourcingEvent(auction.eventId) : null;
        const winner = auction?.participants?.find((item) => item.supplierId === auction.leadingSupplierId && !item.disqualified);
        if (!auction || !event || !winner || !decision || !this.canManageProcurement(event) || !["Running", "Paused"].includes(auction.status)) {
          this.notice("Auction award is not allowed or incomplete", "fa-shield-halved");
          return null;
        }
        const offer = { price: auction.currentBid, leadDays: 14, terms: "Net 30" };
        const order = this.createPurchaseOrderFromAward(event, winner.supplierId, offer);
        if (!order) return null;
        const commercialModel = state.procurementAnalytics?.commercialModel || {};
        const commercial = window.BuyniverseCommercialMetrics?.auction(auction, event, {
          successFeeRate: commercialModel.gainShareRate ?? 40,
          successFeeBasis: commercialModel.successFeeBasis,
        }) || {};
        const settlement = {
          calculatedAt: new Date().toISOString(), currency: commercial.currency || event.currency || "USD",
          financialSavings: Number(commercial.financialSavings) || 0,
          buyniverseSavings: Number(commercial.buyniverseSavings) || 0,
          totalSavings: Number(commercial.totalSavings) || 0,
          buyerRetainedSavings: Number(commercial.netSavings) || 0,
          serviceFee: {
            rate: Number(commercial.successFeeRate) || 40,
            basis: commercial.successFeeBasis === "buyniverse" ? "buyniverse" : "total",
            basisAmount: commercial.successFeeBasis === "buyniverse" ? Number(commercial.buyniverseSavings) || 0 : Number(commercial.totalSavings) || 0,
            amount: Number(commercial.outcomeShare) || 0,
            status: "pending_billing",
          },
        };
        order.commercialSettlement = settlement;
        auction.status = "Awarded";
        auction.awardedSupplierId = winner.supplierId;
        auction.awardReason = decision;
        auction.commercialSettlement = settlement;
        event.awardedSupplierId = winner.supplierId;
        event.awardReason = decision;
        event.commercialSettlement = settlement;
        event.status = "Awarded";
        const request = this.purchaseRequest(event.requestId);
        if (request) { request.status = "Awarded"; request.nextAction = `Order ${order.id} awaiting receipt`; }
        this.procurementEvent(auction, "Auction awarded", `${winner.name} · ${decision}`, "success");
        this.procurementEvent(event, "Supplier selected", `${winner.name} · live award`, "success");
        this.procurementEvent(auction, "Commercial savings locked", `${settlement.serviceFee.rate}% service fee · ${settlement.serviceFee.amount} ${settlement.currency}`, "info");
        this.procurementEvent(order, "Service fee recorded", `${settlement.serviceFee.rate}% of ${settlement.serviceFee.basis} savings · pending billing`, "info");
        supplierUserIds([winner.supplierId]).forEach((userId) => this.addNotification({
          userId, title: "Auction awarded", text: `${auction.title} was awarded to your company.`,
          link: `/procurement/auction?auction=${auction.id}`, icon: "fa-trophy",
        }));
        this.notice("Auction awarded and purchase order created", "fa-trophy");
        return order;
      },

      recordOrderReceipt(orderRef, incomingLines) {
        const order = typeof orderRef === "string" ? this.purchaseOrder(orderRef) : orderRef;
        if (!order || !this.canManageProcurement(order) || !Array.isArray(incomingLines)) return null;
        const accepted = [];
        incomingLines.slice(0, 100).forEach((input) => {
          const line = order.lines?.find((item) => item.id === input?.id);
          const remaining = line ? Math.max(0, Number(line.ordered) - Number(line.received)) : 0;
          const quantity = Math.min(remaining, Math.max(0, Number(input?.receiveNow) || 0));
          if (line && quantity > 0) { line.received += quantity; accepted.push({ lineId: line.id, quantity }); }
        });
        if (!accepted.length) {
          this.notice("Enter a receipt quantity", "fa-circle-info");
          return null;
        }
        const ordered = order.lines.reduce((sum, line) => sum + Number(line.ordered || 0), 0);
        const received = order.lines.reduce((sum, line) => sum + Number(line.received || 0), 0);
        order.receivedPercent = ordered ? Math.round((received / ordered) * 100) : 0;
        order.receipts ||= [];
        order.receipts.push({ id: id("receipt"), at: new Date().toISOString(), warehouse: clean(order.warehouse, 80), status: "Posted", lines: accepted.length, items: accepted });
        order.status = order.receivedPercent === 100 ? "Received" : "Partially received";
        this.procurementEvent(order, order.receivedPercent === 100 ? "Receipt completed" : "Partial receipt", `${order.receivedPercent}% received`, order.receivedPercent === 100 ? "success" : "warning");
        this.notice("Goods receipt posted", "fa-box");
        return order;
      },

      attachOrderInvoice(orderRef, invoiceRef) {
        const order = typeof orderRef === "string" ? this.purchaseOrder(orderRef) : orderRef;
        const invoiceId = typeof invoiceRef === "string" ? invoiceRef : invoiceRef?.id;
        const invoice = state.invoices.find((item) => item.id === invoiceId);
        if (!order || !invoice || !this.canManageProcurement(order) || invoice.currency !== order.currency) {
          this.notice("Invoice attachment denied", "fa-shield-halved");
          return null;
        }
        const difference = Math.abs(Number(invoice.total) - Number(order.total));
        const tolerance = Math.max(0.01, Number(order.total) * 0.02);
        order.invoiceId = invoice.id;
        if (difference > tolerance && !order.exceptions?.some((item) => item.type === "Invoice variance" && item.status !== "Resolved")) {
          order.exceptions ||= [];
          order.exceptions.push({ id: id("exception"), type: "Invoice variance", ownerId: this.currentUser.value.id, status: "Open", severity: "High", detail: `Difference ${difference.toFixed(2)} exceeds the 2% tolerance.` });
          this.procurementEvent(order, "Invoice variance detected", invoice.id, "warning");
        } else this.procurementEvent(order, "Invoice attached", invoice.id, "info");
        return { order, invoice, difference, tolerance, withinTolerance: difference <= tolerance };
      },

      runThreeWayMatch(orderRef) {
        const order = typeof orderRef === "string" ? this.purchaseOrder(orderRef) : orderRef;
        const invoice = state.invoices.find((item) => item.id === order?.invoiceId);
        const difference = order && invoice ? Math.abs(Number(invoice.total) - Number(order.total)) : Infinity;
        const tolerance = order ? Math.max(0.01, Number(order.total) * 0.02) : 0;
        if (!order || !this.canManageProcurement(order) || order.receivedPercent < 100 || !invoice || difference > tolerance || (order.exceptions || []).some((item) => item.status !== "Resolved")) {
          this.notice("Receive all items, attach a matching invoice and resolve issues", "fa-triangle-exclamation");
          return false;
        }
        order.matchStatus = "3-way match";
        this.procurementTransition(order, "Matched", `PO, receipt and ${invoice.id} reconciled within 2%`);
        return true;
      },

      closePurchaseOrder(orderRef) {
        const order = typeof orderRef === "string" ? this.purchaseOrder(orderRef) : orderRef;
        if (!order || !this.canManageProcurement(order) || order.status !== "Matched" || (order.exceptions || []).some((item) => item.status !== "Resolved")) {
          this.notice("A matched order with no open issues is required before closing", "fa-triangle-exclamation");
          return false;
        }
        this.procurementTransition(order, "Closed", "Execution complete");
        return true;
      },

      procurementEvent(target, action, detail = "", level = "info") {
        const event = window.ProcurementCommon.audit(target, this.currentUser.value.name, action, detail, level);
        event.objectId = target?.id || "PROCUREMENT";
        state.procurementAudit.unshift(event);
        return event;
      },

      procurementTransition(target, nextStatus, detail = "") {
        if (!target) return null;
        const previous = target.status;
        target.status = nextStatus;
        const event = this.procurementEvent(
          target, `${previous} → ${nextStatus}`, detail,
          ["Rejected", "Exception", "Escalated"].includes(nextStatus) ? "danger" : "success",
        );
        this.notice(`${target.id} moved to ${nextStatus}`);
        return event;
      },
    };
  }

  global.BuyniverseProcurementDomainActions = { createProcurementDomainActions };
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
