(function (global) {
  "use strict";

  function createDomainActions(state, ui, helpers) {
    const { id, clean, positive, allowedMarketplaceModes, applyCurrentOperationalScope } = helpers;
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

    const communicationContext = (type, contextId) => {
      const contextType = ["project", "sourcing", "auction"].includes(type) ? type : null;
      const idValue = clean(contextId, 120);
      if (!contextType || !idValue) return null;

      if (contextType === "project") {
        const record = state.jobs.find((item) => item.id === idValue);
        if (!record) return null;
        const contract = state.contracts.find((item) => item.id === record.contractId);
        const participants = userIds([
          record.clientId,
          ...(record.proposals || []).map((item) => item.freelancerId),
          contract?.providerId,
        ]);
        return {
          type: contextType, id: idValue, record, title: record.title, ownerId: record.clientId,
          participants,
          supplierIds: state.users.filter((user) => participants.includes(user.id)).map((user) => user.supplierProfileId).filter(Boolean),
          link: `/project/${record.id}?tab=communications`,
        };
      }

      if (contextType === "sourcing") {
        const record = state.sourcingEvents.find((item) => item.id === idValue);
        if (!record) return null;
        const supplierIds = [...new Set(record.invitedSupplierIds || [])].slice(0, 50);
        return {
          type: contextType, id: idValue, record, title: record.title, ownerId: record.ownerId,
          participants: userIds([record.ownerId, ...supplierUserIds(supplierIds)]),
          supplierIds,
          link: `/procurement/sourcing?event=${record.id}&tab=communications`,
        };
      }

      const record = state.auctions.find((item) => item.id === idValue);
      if (!record) return null;
      const event = state.sourcingEvents.find((item) => item.id === record.eventId);
      const supplierIds = [...(record.participants || []).map((item) => item.supplierId), ...(event?.invitedSupplierIds || [])];
      const ownerId = record.hostId || event?.ownerId;
      return {
        type: contextType, id: idValue, record, title: record.title, ownerId,
        participants: userIds([ownerId, ...supplierUserIds(supplierIds)]),
        supplierIds: [...new Set(supplierIds.filter(Boolean))].slice(0, 50),
        link: `/procurement/auction?auction=${record.id}&tab=communications`,
      };
    };

    return {
      communicationContext,
      resolveCommunicationContext(type, contextId) {
        return communicationContext(type, contextId);
      },

      conversationFor(input) {
        const request = typeof input === "object" && input ? input : { contextType: "project", contextId: input };
        const contextType = request.contextType || (request.jobId ? "project" : "");
        const contextId = request.contextId || request.jobId;
        const context = communicationContext(contextType, contextId);
        const currentUser = this.currentUser?.value;
        if (!context || !currentUser) return null;
        const canAccess = this.isAdmin?.value || context.participants.includes(currentUser.id);
        if (!canAccess) return null;

        let conversation = request.conversationId ? state.conversations.find((item) => item.id === request.conversationId) : null;
        if (!conversation) conversation = state.conversations.find((item) => item.contextType === context.type && item.contextId === context.id);
        if (!conversation) {
          conversation = {
            id: id("convo"), contextType: context.type, contextId: context.id, jobId: context.type === "project" ? context.id : null,
            subject: context.title, participants: context.participants, messages: [],
          };
          state.conversations.push(conversation);
        } else {
          conversation.participants = context.participants;
        }
        return conversation;
      },

      sendMessage(input, legacyText) {
        const request = typeof input === "object" && input ? input : { contextType: "project", contextId: input, text: legacyText };
        const contextType = request.contextType || (request.jobId ? "project" : "");
        const contextId = request.contextId || request.jobId;
        const context = communicationContext(contextType, contextId);
        const currentUser = this.currentUser?.value;
        const text = clean(request.text, 3000);
        const kind = request.kind === "announcement" ? "announcement" : "message";
        const subject = clean(request.subject, 180);
        if (!context || !currentUser || !text) return null;
        const canAccess = this.isAdmin?.value || context.participants.includes(currentUser.id);
        const canAnnounce = this.isAdmin?.value || context.ownerId === currentUser.id;
        if (!canAccess || (kind === "announcement" && !canAnnounce)) {
          this.securityEvent("Communication access denied", `${contextType}:${clean(contextId, 120)}`, "warning");
          this.notice("Communication access denied", "fa-shield-halved");
          return null;
        }

        let conversation = request.conversationId ? state.conversations.find((item) => item.id === request.conversationId) : null;
        if (conversation && (conversation.contextType !== context.type || conversation.contextId !== context.id || (!this.isAdmin?.value && !conversation.participants.includes(currentUser.id)))) {
          this.securityEvent("Conversation access denied", context.id, "warning");
          this.notice("Conversation access denied", "fa-shield-halved");
          return null;
        }
        if (!conversation) conversation = state.conversations.find((item) => item.contextType === context.type && item.contextId === context.id);
        if (!conversation) {
          conversation = {
            id: id("convo"), contextType: context.type, contextId: context.id, jobId: context.type === "project" ? context.id : null,
            subject: subject || context.title, participants: context.participants, messages: [],
          };
          state.conversations.push(conversation);
        } else {
          conversation.participants = context.participants;
          if (subject) conversation.subject = subject;
        }

        const message = { id: id("msg"), senderId: currentUser.id, text, subject: kind === "announcement" ? subject : "", kind, channel: "internal", at: new Date().toISOString() };
        conversation.messages.push(message);
        conversation.messages = conversation.messages.slice(-500);
        context.participants.filter((userId) => userId !== currentUser.id).forEach((userId) =>
          this.addNotification({
            userId, title: kind === "announcement" ? "Supplier announcement" : "New message",
            text: `${currentUser.name}: ${text.slice(0, 76)}`, link: context.link, icon: kind === "announcement" ? "fa-bullhorn" : "fa-comments",
          })
        );
        if (kind === "announcement" && context.record?.audit) {
          const audit = { id: id("communication"), at: message.at, actor: currentUser.name, action: "Supplier announcement posted", detail: subject || text.slice(0, 160), level: "info" };
          context.record.audit.unshift(audit);
          if (Array.isArray(state.procurementAudit)) state.procurementAudit.unshift({ ...audit, objectId: context.id });
        }
        this.notice(kind === "announcement" ? "Announcement posted" : "Message sent", kind === "announcement" ? "fa-bullhorn" : "fa-paper-plane");
        return message;
      },

      createMailDraft(input = {}) {
        const context = communicationContext(input.contextType, input.contextId);
        const currentUser = this.currentUser?.value;
        if (!context || !currentUser || (!this.isAdmin?.value && context.ownerId !== currentUser.id)) {
          this.securityEvent("Mail draft access denied", `${clean(input.contextType, 40)}:${clean(input.contextId, 120)}`, "warning");
          this.notice("Mail draft access denied", "fa-shield-halved");
          return null;
        }
        const template = input.templateId ? this.renderMessageTemplate(input.templateId, context.type, context.id) : null;
        const subject = clean(input.subject || template?.subject, 180);
        const body = clean(input.body || template?.body, 3000);
        if (!subject || !body || !context.supplierIds.length) {
          this.notice("Complete a subject, message and supplier audience", "fa-triangle-exclamation");
          return null;
        }
        if (!Array.isArray(state.mailings)) state.mailings = [];
        const mailing = {
          id: id("mail"), contextType: context.type, contextId: context.id, templateId: template?.id || null,
          subject, body, recipientSupplierIds: context.supplierIds, recipientUserIds: supplierUserIds(context.supplierIds),
          status: "Draft", channel: "email", localOnly: false, createdById: currentUser.id, createdAt: new Date().toISOString(),
        };
        state.mailings.unshift(mailing);
        state.mailings = state.mailings.slice(0, 200);
        this.notice("Email draft saved to workspace", "fa-envelope");
        return mailing;
      },

      addProjectComment({ jobId, text, parentId = null } = {}) {
        const job = this.job(jobId);
        const currentUser = this.currentUser?.value;
        const allowed = job && currentUser && (this.isAdmin?.value || job.clientId === currentUser.id || job.proposals?.some((item) => item.freelancerId === currentUser.id) || state.contracts.some((item) => item.sourceId === job.id && item.providerId === currentUser.id));
        const message = clean(text, 2000);
        if (!allowed || !message) {
          this.notice("Project comment denied", "fa-shield-halved");
          return null;
        }
        const parent = parentId ? job.comments?.find((item) => item.id === parentId) : null;
        if (parentId && !parent) return null;
        const comment = { id: id("comment"), userId: currentUser.id, text: message, parentId: parent?.id || null, at: new Date().toISOString() };
        job.comments = job.comments || [];
        job.comments.push(comment);
        job.comments = job.comments.slice(-500);
        this.notice("Project update posted", "fa-comments");
        return comment;
      },

      securityEvent(action, detail = "", level = "info") {
        if (!Array.isArray(state.securityAudit)) state.securityAudit = [];
        const event = {
          id: id("security"), action: clean(action, 120), detail: clean(detail, 500),
          level: ["info", "warning", "danger"].includes(level) ? level : "info",
          userId: this.currentUser?.value?.id || null, at: new Date().toISOString(),
        };
        state.securityAudit.unshift(event);
        if (state.securityAudit.length > 500) state.securityAudit.length = 500;
        return event;
      },

      userNotifications(userId) {
        return state.notifications
          .filter((notification) => notification.userId === userId)
          .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      },

      unreadNotifications(userId) {
        return this.userNotifications(userId).filter((notification) => !notification.isRead);
      },

      markNotificationRead(notification) {
        if (notification?.userId === this.currentUser.value.id)
          notification.isRead = true;
      },

      markAllNotificationsRead(userId) {
        if (userId !== this.currentUser.value.id)
          return this.securityEvent("Notification access denied", clean(userId, 120), "warning");
        this.userNotifications(userId).forEach((notification) => { notification.isRead = true; });
        this.notice("All notifications marked as read");
      },

      addNotification(data) {
        if (!data || !state.users.some((user) => user.id === data.userId)) return null;
        if (!Array.isArray(state.notifications)) state.notifications = [];
        const notification = {
          ...data, id: id("notif"), userId: data.userId, isRead: false, at: new Date().toISOString(),
          icon: /^fa-[a-z0-9-]+$/i.test(data.icon || "") ? data.icon : "fa-bell",
          title: clean(data.title, 120), text: clean(data.text, 500),
          link: window.WebCommon.safeInternalPath(data.link, "/dashboard"),
        };
        state.notifications.unshift(notification);
        if (state.notifications.length > 500) state.notifications.length = 500;
        return notification;
      },

      toggleSavedJob(jobId) {
        const job = this.job(jobId);
        if (!this.isSupplier.value || !job || job.status !== "OPEN") return;
        if (!Array.isArray(state.savedJobIds)) state.savedJobIds = [];
        const index = state.savedJobIds.indexOf(jobId);
        if (index < 0) {
          state.savedJobIds.push(jobId);
          this.notice("Job saved", "fa-bookmark");
        } else {
          state.savedJobIds.splice(index, 1);
          this.notice("Job removed from saved jobs");
        }
      },

      requestGig(gig) {
        const ownAgency = gig?.creatorType === "agency" && state.agencies.find((agency) => agency.id === gig.creatorId)?.members?.some((member) => member.userId === this.currentUser.value.id);
        if (!this.isBuyer.value || !gig || !state.gigs.includes(gig) || gig.creatorId === this.currentUser.value.id || ownAgency)
          return this.notice("Service request denied", "fa-shield-halved");
        if (!Array.isArray(state.serviceRequests)) state.serviceRequests = [];
        state.serviceRequests.unshift(scoped({
          id: id("service-request"), gigId: gig.id, buyerId: this.currentUser.value.id, status: "Requested", createdAt: new Date().toISOString(),
        }));
        if (state.users.some((user) => user.id === gig.creatorId))
          this.addNotification({
            userId: gig.creatorId, title: "New service request", text: `${this.currentUser.value.name} requested ${gig.title}.`,
            link: `/gig/${gig.id}`, icon: "fa-store",
          });
        this.notice("Service request sent");
      },

      notice(message, icon = "fa-circle-check") {
        ui.toast = { id: Date.now(), message, icon };
        window.setTimeout(() => { if (ui.toast?.message === message) ui.toast = null; }, 3200);
      },

      confirm({ title = "Are you sure?", message = "", confirmText = "Confirm", cancelText = "Cancel", danger = false } = {}) {
        return new Promise((resolve) => { ui.confirmDialog = { title, message, confirmText, cancelText, danger, resolve }; });
      },

      prompt({ title = "Input requested", message = "", value = "", placeholder = "", confirmText = "Submit", cancelText = "Cancel", multiline = false, rows = 4 } = {}) {
        return new Promise((resolve) => { ui.inputDialog = { title, message, value: String(value || ""), placeholder, confirmText, cancelText, multiline, rows, resolve }; });
      },

      createJob(payload = {}) {
        if (!this.isBuyer.value) {
          this.notice("Only buyer accounts can post jobs", "fa-shield-halved");
          return null;
        }
        const job = scoped({
          id: id("job"), clientId: this.currentUser.value.id, title: clean(payload.title, 160) || "Untitled Project",
          category: clean(payload.category, 80) || "Engineering", description: clean(payload.description, 5000) || "",
          type: payload.type === "hourly" ? "hourly" : "fixed", budget: positive(payload.budget) || 1000,
          hourlyRate: positive(payload.hourlyRate) || 35, estimatedHours: positive(payload.estimatedHours) || 40,
          visibility: ["public", "private", "invite-only"].includes(payload.visibility) ? payload.visibility : "public",
          skills: Array.isArray(payload.skills) ? payload.skills.map((s) => clean(s, 50)).filter(Boolean) : [],
          status: "OPEN", proposals: [], proposalsCount: 0, createdAt: new Date().toISOString(),
        });
        state.jobs.unshift(job);
        this.notice("Project created successfully", "fa-circle-check");
        return job;
      },

      addInvoice(payload = {}) {
        const currentUser = this.currentUser?.value;
        const receiverId = clean(payload.receiverId, 120);
        const currency = ["MXN", "USD", "EUR"].includes(payload.currency) ? payload.currency : "MXN";
        const total = Number(payload.total);
        if (!currentUser || (!this.isSupplier?.value && !this.isAdmin?.value) ||
          !state.users.some((item) => item.id === receiverId) || !Number.isFinite(total) || total <= 0 || !window.WebCommon.isSafeAmount(total, 0)) {
          this.notice("Invoice creation denied", "fa-shield-halved");
          return null;
        }
        const lineItems = (Array.isArray(payload.lineItems) ? payload.lineItems : []).map((line, index) => {
          const quantity = Number(line?.quantity), unitPrice = Number(line?.unitPrice);
          const description = clean(line?.description, 500);
          if (!description || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice <= 0) return null;
          return { id: clean(line?.id, 120) || `line-${index + 1}`, description, quantity, unitPrice, amount: quantity * unitPrice, taxes: Array.isArray(line?.taxes) ? line.taxes.slice(0, 8) : [] };
        }).filter(Boolean).slice(0, 100);
        if (!lineItems.length) {
          this.notice("Complete every invoice concept", "fa-triangle-exclamation");
          return null;
        }
        const invoice = scoped({
          id: id("invoice"), issuerId: clean(payload.issuerId, 120) || null, receiverId,
          clientId: receiverId, providerId: currentUser.id, currency, total, status: "Vigente", paymentStatus: "Unpaid",
          method: clean(payload.method, 20), exchangeRate: Number(payload.exchangeRate) || 1,
          projectTitle: clean(payload.projectTitle, 240) || lineItems[0].description,
          issuedDate: typeof payload.issuedDate === "string" ? payload.issuedDate : new Date().toISOString(),
          dueDate: typeof payload.dueDate === "string" ? payload.dueDate : null,
          lineItems,
        });
        state.invoices.unshift(invoice);
        this.notice("Invoice created successfully", "fa-file-invoice-dollar");
        return invoice;
      },

      addPayment(payload = {}) {
        const currentUser = this.currentUser?.value;
        const invoice = state.invoices.find((item) => item.id === clean(payload.invoiceId, 120));
        const amount = Number(payload.amount);
        if (!currentUser || !invoice || (!this.isAdmin?.value && invoice.providerId !== currentUser.id) ||
          !Number.isFinite(amount) || amount <= 0 || amount > Number(invoice.total) || !window.WebCommon.isSafeAmount(amount, 0)) {
          this.notice("Payment creation denied", "fa-shield-halved");
          return null;
        }
        const receipt = scoped({
          id: id("payment"), invoiceId: invoice.id, receiverId: invoice.clientId, providerId: invoice.providerId,
          issuerId: clean(payload.issuerId, 120) || null, amount, currency: invoice.currency, status: "Vigente",
          date: typeof payload.date === "string" ? payload.date : new Date().toISOString(), method: clean(payload.method, 20),
          relatedDocuments: Array.isArray(payload.relatedDocuments) ? payload.relatedDocuments.slice(0, 20) : [],
        });
        state.paymentReceipts.unshift(receipt);
        invoice.paymentStatus = amount >= Number(invoice.total) ? "Paid" : "Partial";
        this.notice("Payment receipt created", "fa-receipt");
        return receipt;
      },

      submitProposal(jobId, payload = {}) {
        const job = this.job(jobId);
        const currentUser = this.currentUser?.value;
        if (!job || !currentUser || !this.isSupplier.value || job.status !== "OPEN") {
          this.notice("Unable to submit proposal", "fa-triangle-exclamation");
          return null;
        }
        if ((job.proposals || []).some((item) => item.freelancerId === currentUser.id)) {
          this.notice("You already have an active proposal", "fa-circle-info");
          return null;
        }
        const bid = positive(payload.amount ?? payload.bid) || job.budget;
        const proposal = {
          id: id("prop"), jobId: job.id, freelancerId: currentUser.id, amount: bid, bid,
          coverLetter: clean(payload.coverLetter, 3000) || "",
          completionTime: clean(payload.completionTime, 120) || "",
          milestones: Array.isArray(payload.milestones) ? payload.milestones.slice(0, 12).map((milestone, index) => ({
            id: clean(milestone?.id, 120) || `proposal-milestone-${index + 1}`,
            title: clean(milestone?.title, 180) || `Milestone ${index + 1}`,
            amount: positive(milestone?.amount) || 0,
          })).filter((milestone) => milestone.amount > 0) : [],
          extras: Array.isArray(payload.extras) ? payload.extras.slice(0, 20) : [],
          boosted: Boolean(payload.boosted),
          status: "Submitted", createdAt: new Date().toISOString(),
        };
        job.proposals = job.proposals || [];
        job.proposals.push(proposal);
        job.proposalsCount = job.proposals.length;
        this.addNotification({
          userId: job.clientId, title: "New proposal submitted", text: `${currentUser.name} submitted a proposal for ${job.title}.`,
          link: `/project/${job.id}`, icon: "fa-file-invoice",
        });
        this.notice("Proposal submitted successfully", "fa-paper-plane");
        return proposal;
      },

      // Backwards-compatible entry point used by both the detailed job room and
      // the compact project view. Keeping it here prevents one UI from bypassing
      // proposal validation or creating a differently-shaped record.
      addProposal(jobRef, payload = {}) {
        const jobId = typeof jobRef === "string" ? jobRef : jobRef?.id;
        const source = typeof payload === "number" ? { amount: payload } : payload;
        return this.submitProposal(jobId, source);
      },

      awardJobProposal(jobRef, proposalRef) {
        const jobId = typeof jobRef === "string" ? jobRef : jobRef?.id;
        const proposalId = typeof proposalRef === "string" ? proposalRef : proposalRef?.id;
        const job = this.job(jobId);
        const currentUser = this.currentUser?.value;
        const proposal = job?.proposals?.find((item) => item.id === proposalId);
        if (!job || !proposal || !currentUser || job.contractId ||
          !(this.isAdmin?.value || (this.isBuyer?.value && job.clientId === currentUser.id))) {
          this.notice("Project award is not allowed", "fa-shield-halved");
          return null;
        }
        const amount = positive(proposal.bid ?? proposal.amount);
        if (!amount) {
          this.notice("The selected proposal has no valid amount", "fa-triangle-exclamation");
          return null;
        }
        const proposedMilestones = Array.isArray(proposal.milestones) ? proposal.milestones : [];
        const milestones = proposedMilestones.length ? proposedMilestones : [{ title: "Project delivery", amount }];
        const normalized = milestones.slice(0, 12).map((milestone, index) => ({
          id: id("milestone"),
          title: clean(milestone?.title, 180) || `Milestone ${index + 1}`,
          amount: positive(milestone?.amount) || Math.round((amount / milestones.length) * 100) / 100,
          status: index === 0 ? "Funded" : "Pending",
          dueDate: new Date(Date.now() + (index + 1) * 14 * 86400000).toISOString(),
          tasks: [],
        }));
        const contract = scoped({
          id: id("contract"), sourceId: job.id, clientId: job.clientId,
          providerId: proposal.freelancerId, amount, status: "In progress", milestones: normalized,
          audit: [], createdAt: new Date().toISOString(),
        });
        proposal.status = "Accepted";
        job.proposals.forEach((item) => { if (item.id !== proposal.id && item.status === "Submitted") item.status = "Not selected"; });
        job.status = "IN_PROGRESS";
        job.contractId = contract.id;
        state.contracts.unshift(contract);
        this.securityEvent("Project proposal awarded", `${job.id}/${proposal.id}`);
        this.addNotification({
          userId: proposal.freelancerId, title: "Project awarded", text: `${job.title} is funded and ready to start.`,
          link: `/contract/${contract.id}`, icon: "fa-handshake",
        });
        this.notice("Project awarded and first milestone funded", "fa-handshake");
        return contract;
      },

      canManageProcurement(record) {
        const currentUser = this.currentUser?.value;
        if (!record || !currentUser || !(this.isAdmin?.value || this.isBuyer?.value)) return false;
        if (this.isAdmin?.value) return true;
        return [record.ownerId, record.requesterId, record.buyerId].includes(currentUser.id);
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
        if (auction.autoExtend !== false && remaining >= 0 && remaining <= Math.max(1, Number(auction.antiSnipingSeconds) || 60) * 1000 && auction.extensionCount < auction.maxExtensions) {
          auction.closingAt = new Date(closeAt + 60000).toISOString();
          auction.endAt = auction.closingAt;
          auction.extensionCount += 1;
          this.procurementEvent(auction, "Anti-sniping extension", "+60 seconds after valid offer", "info");
        }
        const event = this.sourcingEvent(auction.eventId);
        if (event?.ownerId) this.addNotification({
          userId: event.ownerId, title: "New live offer", text: `${this.currentUser.value.name} submitted ${auction.currentBid}.`,
          link: `/procurement/auction?auction=${auction.id}`, icon: "fa-gavel",
        });
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
          return true;
        }
        if (operation === "resume" && auction.status === "Paused") {
          auction.status = "Running";
          this.procurementEvent(auction, "Auction resumed", "Bidding live", "success");
          return true;
        }
        if (operation === "extend" && ["Running", "Paused"].includes(auction.status) && auction.extensionCount < auction.maxExtensions) {
          const closeAt = Date.parse(auction.closingAt || auction.endAt);
          const base = Number.isFinite(closeAt) && closeAt > Date.now() ? closeAt : Date.now();
          auction.closingAt = new Date(base + 60000).toISOString();
          auction.endAt = auction.closingAt;
          auction.extensionCount += 1;
          this.procurementEvent(auction, "Time extended", "+60 seconds manual extension", "info");
          return true;
        }
        if (operation === "cancel" && ["Running", "Paused"].includes(auction.status)) {
          auction.status = "Closed";
          this.procurementEvent(auction, "Auction cancelled", "Round terminated early", "warning");
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
        auction.status = "Awarded";
        auction.awardedSupplierId = winner.supplierId;
        auction.awardReason = decision;
        event.awardedSupplierId = winner.supplierId;
        event.awardReason = decision;
        event.status = "Awarded";
        const request = this.purchaseRequest(event.requestId);
        if (request) { request.status = "Awarded"; request.nextAction = `Order ${order.id} awaiting receipt`; }
        this.procurementEvent(auction, "Auction awarded", `${winner.name} · ${decision}`, "success");
        this.procurementEvent(event, "Supplier selected", `${winner.name} · live award`, "success");
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

      renderMessageTemplate(templateId, contextType, contextId) {
        const template = state.messageTemplates?.find((item) => item.id === templateId);
        if (!template) return null;
        const record = contextType === "project" ? state.jobs.find((item) => item.id === contextId) : contextType === "sourcing" ? state.sourcingEvents.find((item) => item.id === contextId) : state.auctions.find((item) => item.id === contextId);
        const buyer = state.users.find((user) => user.id === (record?.clientId || record?.ownerId || record?.hostId));
        const values = {
          "{{context}}": record?.title || record?.id || "",
          "{{reference}}": record?.id || "",
          "{{deadline}}": record?.deadline ? new Date(record.deadline).toLocaleDateString() : "—",
          "{{company}}": buyer?.company || buyer?.name || "Buyniverse",
          "{eventTitle}": record?.title || record?.id || "",
          "{buyerName}": buyer?.name || "",
          "{date}": new Date().toLocaleDateString(),
        };
        const render = (value, limit) => Object.entries(values).reduce((text, [token, replacement]) => text.replaceAll(token, replacement), clean(value, limit));
        const isSpanish = window.BuyniverseI18n?.locale?.value === "es";
        return {
          id: template.id,
          subject: render(isSpanish ? template.subjectEs || template.subject : template.subject, 180),
          body: render(isSpanish ? template.bodyEs || template.body : template.body, 3000),
        };
      },

      release(contractRef, milestoneRef) {
        const contract = typeof contractRef === "string" ? this.contract(contractRef) : contractRef;
        const milestoneId = typeof milestoneRef === "string" ? milestoneRef : milestoneRef?.id;
        const milestone = contract?.milestones?.find((item) => item.id === milestoneId);
        if (!contract || !milestone || (contract.clientId !== this.currentUser.value.id && !this.isAdmin?.value) || milestone.status !== "Funded") {
          this.notice("Payment release is not allowed", "fa-shield-halved");
          return false;
        }
        milestone.status = "Released";
        this.securityEvent("Milestone released", `${contract.id}/${milestone.id}`);
        state.transactions.unshift({
          id: id("txn"), userId: contract.providerId, type: "Milestone release", amount: milestone.amount,
          relatedId: contract.id, date: new Date().toISOString(), description: `Milestone released: ${milestone.title}`,
        });
        this.addNotification({
          userId: contract.providerId, title: "Milestone released", text: `${milestone.title} was released for payment.`,
          link: `/contract/${contract.id}`, icon: "fa-circle-dollar-to-slot",
        });
        this.notice("Milestone released");
        return true;
      },

      updateMilestoneTask(contractRef, milestoneRef, taskRef, nextStatus) {
        const contract = typeof contractRef === "string" ? this.contract(contractRef) : contractRef;
        const milestoneId = typeof milestoneRef === "string" ? milestoneRef : milestoneRef?.id;
        const taskId = typeof taskRef === "string" ? taskRef : taskRef?.id;
        const milestone = contract?.milestones?.find((item) => item.id === milestoneId);
        const task = milestone?.tasks?.find((item) => item.id === taskId);
        const currentUser = this.currentUser?.value;
        const allowed = Boolean(contract && task && currentUser && (this.isAdmin?.value || [contract.clientId, contract.providerId].includes(currentUser.id) || task.assignedTo?.includes(currentUser.id)));
        if (!allowed || !["Todo", "In progress", "Done"].includes(nextStatus)) {
          this.notice("Task update is not allowed", "fa-shield-halved");
          return false;
        }
        task.status = nextStatus;
        task.updatedAt = new Date().toISOString();
        contract.audit ||= [];
        contract.audit.unshift({ id: id("contract-audit"), at: task.updatedAt, actor: currentUser.name, action: "Milestone task updated", detail: `${milestone.title} · ${task.title} → ${nextStatus}`, level: "info" });
        if (nextStatus === "Done" && milestone.tasks?.length && milestone.tasks.every((item) => item.status === "Done") && milestone.status === "Pending")
          milestone.status = "Ready for funding";
        this.notice("Task updated", "fa-list-check");
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

  global.BuyniverseDomainActions = { createDomainActions };
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
