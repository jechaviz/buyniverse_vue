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
        const proposal = {
          id: id("prop"), jobId: job.id, freelancerId: currentUser.id, amount: positive(payload.amount) || job.budget,
          coverLetter: clean(payload.coverLetter, 3000) || "", milestones: Array.isArray(payload.milestones) ? payload.milestones : [],
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

      renderMessageTemplate(templateId, contextType, contextId) {
        const template = state.messageTemplates?.find((item) => item.id === templateId);
        if (!template) return null;
        const record = contextType === "project" ? state.jobs.find((item) => item.id === contextId) : contextType === "sourcing" ? state.sourcingEvents.find((item) => item.id === contextId) : state.auctions.find((item) => item.id === contextId);
        const buyer = state.users.find((user) => user.id === (record?.clientId || record?.ownerId || record?.hostId));
        const values = {
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

      release(contract, milestone) {
        if (!contract || contract.clientId !== this.currentUser.value.id || milestone.status !== "Funded" || !contract.milestones?.some((item) => item.id === milestone.id)) {
          this.notice("Payment release is not allowed", "fa-shield-halved");
          return;
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
