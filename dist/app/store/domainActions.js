(function (global) {
  "use strict";

  function createDomainActions(state, ui, helpers) {
    const { id, clean, positive, allowedMarketplaceModes } = helpers;

    return {
      securityEvent(action, detail = "", level = "info") {
        const event = {
          id: id("security"),
          action: clean(action, 120),
          detail: clean(detail, 500),
          level: ["info", "warning", "danger"].includes(level) ? level : "info",
          userId: this.currentUser?.value?.id || null,
          at: new Date().toISOString(),
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
        this.userNotifications(userId).forEach((notification) => {
          notification.isRead = true;
        });
        this.notice("All notifications marked as read");
      },

      addNotification(data) {
        if (!data || !state.users.some((user) => user.id === data.userId)) return null;
        const notification = {
          ...data,
          id: id("notif"),
          userId: data.userId,
          isRead: false,
          at: new Date().toISOString(),
          icon: /^fa-[a-z0-9-]+$/i.test(data.icon || "") ? data.icon : "fa-bell",
          title: clean(data.title, 120),
          text: clean(data.text, 500),
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
        const ownAgency =
          gig?.creatorType === "agency" &&
          state.agencies
            .find((agency) => agency.id === gig.creatorId)
            ?.members?.some((member) => member.userId === this.currentUser.value.id);
        if (
          !this.isBuyer.value ||
          !gig ||
          !state.gigs.includes(gig) ||
          gig.creatorId === this.currentUser.value.id ||
          ownAgency
        )
          return this.notice("Service request denied", "fa-shield-halved");
        if (!Array.isArray(state.serviceRequests)) state.serviceRequests = [];
        state.serviceRequests.unshift({
          id: id("service-request"),
          gigId: gig.id,
          buyerId: this.currentUser.value.id,
          status: "Requested",
          createdAt: new Date().toISOString(),
        });
        if (state.users.some((user) => user.id === gig.creatorId))
          this.addNotification({
            userId: gig.creatorId,
            title: "New service request",
            text: `${this.currentUser.value.name} requested ${gig.title}.`,
            link: `/gig/${gig.id}`,
            icon: "fa-store",
          });
        this.notice("Service request sent");
      },

      notice(message, icon = "fa-circle-check") {
        ui.toast = { id: Date.now(), message, icon };
        window.setTimeout(() => {
          if (ui.toast?.message === message) ui.toast = null;
        }, 3200);
      },

      confirm({
        title = "Confirm action",
        message = "This action cannot be undone.",
        confirmText = "Confirm",
        danger = false,
      }) {
        return new Promise((resolve) => {
          ui.modal = { title, message, confirmText, danger, resolve };
        });
      },

      resolveConfirm(accepted) {
        const modal = ui.modal;
        ui.modal = null;
        modal?.resolve(Boolean(accepted));
      },

      lockSession(reason = "Manual privacy lock") {
        ui.modal = null;
        ui.loading = false;
        ui.locked = true;
        this.securityEvent("Session locked", reason, "warning");
      },

      unlockSession() {
        ui.locked = false;
        this.securityEvent("Session resumed", "Local demo privacy lock released");
      },

      async run(message, task) {
        if (ui.loading) return undefined;
        ui.loading = true;
        ui.loadingMessage = message;
        try {
          await new Promise((resolve) => requestAnimationFrame(resolve));
          return await task();
        } finally {
          ui.loading = false;
          ui.loadingMessage = "";
        }
      },

      async reset() {
        const confirmed = await this.confirm({
          title: "Reset demo data?",
          message: "Your local demo changes, saved jobs and generated notifications will be replaced by the clean seed.",
          confirmText: "Reset data",
          danger: true,
        });
        if (!confirmed) return;
        await this.run("Restoring demo data…", async () => {
          const actor = this.currentUser.value?.id;
          Object.assign(state, window.BuyniverseDemo.clone());
          state.securityAudit ||= [];
          state.recentViews ||= [];
          this.securityEvent("Demo data reset", `Requested by ${actor}`, "warning");
          this.notice("Demo data restored");
        });
      },

      addProposal(job, bid) {
        if (!job || !this.isSupplier.value || job.status !== "OPEN" || !positive(bid)) {
          this.notice("This proposal is not allowed", "fa-shield-halved");
          return;
        }
        const exists = job.proposals.some(
          (item) => item.freelancerId === this.currentUser.value.id,
        );
        if (!exists) {
          job.proposals.push({
            id: id("proposal"),
            freelancerId: this.currentUser.value.id,
            bid: Number(bid) || job.budget,
            status: "Pending",
            qualification: "Pending",
          });
          this.addNotification({
            userId: job.clientId,
            title: "New proposal",
            text: `${this.currentUser.value.name} submitted a proposal for ${job.title}.`,
            link: `/project/${job.id}`,
            icon: "fa-file-signature",
          });
          this.notice("Proposal submitted");
        }
      },

      postJob(draft) {
        if (
          (!this.isBuyer.value && !this.isAdmin.value) ||
          !clean(draft?.title, 120) ||
          !clean(draft?.description, 4000)
        ) {
          this.notice("Complete the required project fields", "fa-triangle-exclamation");
          return null;
        }
        const rejectedFiles = [];
        const files = (Array.isArray(draft.files) ? draft.files : [])
          .slice(0, 20)
          .map((file) => {
            const verified = window.BuyniverseSecurity?.validateFileUpload
              ? window.BuyniverseSecurity.validateFileUpload(file)
              : { ok: Boolean(clean(file?.name, 120)), name: clean(file?.name, 120), size: Number(file?.size) || 0, type: clean(file?.type, 100) };
            if (!verified.ok) {
              rejectedFiles.push(verified.reason || "Invalid attachment");
              return null;
            }
            return {
              id: id("file"),
              name: verified.name,
              size: verified.size,
              type: verified.type,
              category: clean(file?.category, 80),
              uploadedAt: new Date().toISOString(),
              uploadedById: this.currentUser.value.id,
              status: "Modified",
              content: clean(file?.content, 100000),
            };
          })
          .filter(Boolean);
        if (rejectedFiles.length) this.securityEvent("Project attachments rejected", `${rejectedFiles.length} rejected`, "warning");
        const job = {
          ...draft,
          id: id("job"),
          clientId: this.currentUser.value.id,
          status: "OPEN",
          progress: 0,
          proposals: [],
          files,
          comments: [],
          questions: [],
          currency: ["USD", "MXN"].includes(draft.currency) ? draft.currency : "USD",
          skills: (Array.isArray(draft.skills) ? draft.skills : [])
            .map((skill) => clean(skill, 80))
            .filter(Boolean)
            .slice(0, 30),
          title: clean(draft.title, 120),
          description: clean(draft.description, 4000),
          budget: positive(draft.budget) ? Number(draft.budget) : 0,
        };
        state.jobs.unshift(job);
        this.securityEvent("Project created", job.id);
        this.addNotification({
          userId: this.currentUser.value.id,
          title: "Job published",
          text: `${job.title} is now open for proposals.`,
          link: `/project/${job.id}`,
          icon: "fa-briefcase",
        });
        this.notice("Job published");
        return job;
      },

      addInvoice(draft) {
        if (!draft || !positive(draft.total)) {
          this.notice("Invoice total must be positive", "fa-triangle-exclamation");
          return null;
        }
        const current = this.currentUser.value;
        if (!this.isSupplier.value && !this.isAdmin.value) {
          this.notice("Invoice creation denied", "fa-shield-halved");
          return null;
        }
        const clientId = draft.receiverId || state.users.find((user) => allowedMarketplaceModes(user).includes("buyer"))?.id;
        const providerId = this.isSupplier.value
          ? current.id
          : draft.providerId || state.users.find((user) => allowedMarketplaceModes(user).includes("supplier"))?.id;
        if (
          !allowedMarketplaceModes(this.user(clientId)).includes("buyer") ||
          !allowedMarketplaceModes(this.user(providerId)).includes("supplier")
        ) {
          this.notice("Choose a valid issuer and receiver", "fa-triangle-exclamation");
          return null;
        }
        const invoice = {
          ...draft,
          id: id("inv"),
          serie: "D",
          folio: String(300 + state.invoices.length),
          uuid: id("uuid").toUpperCase(),
          clientId,
          providerId,
          status: "Vigente",
          paymentStatus: "Unpaid",
          currency: ["USD", "MXN"].includes(draft.currency) ? draft.currency : "USD",
          issuedDate: new Date().toISOString(),
          projectTitle: clean(draft.projectTitle, 240),
          total: Number(draft.total),
        };
        state.invoices.unshift(invoice);
        this.securityEvent("Invoice created", invoice.id);
        this.addNotification({
          userId: invoice.providerId,
          title: "Invoice created",
          text: `Invoice ${invoice.serie}-${invoice.folio} was created.`,
          link: `/invoices/${invoice.id}`,
          icon: "fa-file-invoice-dollar",
        });
        this.notice("Invoice created");
        return invoice;
      },

      addPayment(draft) {
        if (!draft || !positive(draft.amount)) {
          this.notice("Payment amount must be positive", "fa-triangle-exclamation");
          return null;
        }
        const invoice = state.invoices.find((item) => item.id === draft.invoiceId),
          current = this.currentUser.value;
        if (
          !invoice ||
          (current.type !== "Admin" && invoice.providerId !== current.id) ||
          Number(draft.amount) > Number(invoice.total)
        ) {
          this.notice("Payment registration denied or invalid", "fa-shield-halved");
          return null;
        }
        const payment = {
          ...draft,
          id: id("pay"),
          folio: String(state.paymentReceipts.length + 1),
          invoiceId: invoice.id,
          status: "Vigente",
          date: new Date().toISOString(),
          receiverId: invoice.clientId,
          currency: invoice.currency,
          amount: Number(draft.amount),
        };
        state.paymentReceipts.unshift(payment);
        this.securityEvent("Payment recorded", `${payment.id} for ${invoice.id}`);
        this.addNotification({
          userId: invoice.clientId,
          title: "Payment recorded",
          text: `A ${payment.currency || "USD"} ${payment.amount} payment complement was registered.`,
          link: "/payments",
          icon: "fa-credit-card",
        });
        this.notice("Payment recorded");
        return payment;
      },

      sendMessage(jobId, text) {
        text = clean(text, 2000);
        if (!text) return;
        let conversation = state.conversations.find((item) => item.jobId === jobId);
        if (
          conversation &&
          !conversation.participants.includes(this.currentUser.value.id)
        ) {
          this.notice("Conversation access denied", "fa-shield-halved");
          return;
        }
        if (!conversation) {
          const job = this.job(jobId);
          if (
            !job ||
            ![
              job.clientId,
              ...(job.proposals || []).map((item) => item.freelancerId),
            ].includes(this.currentUser.value.id)
          ) {
            this.notice("Conversation access denied", "fa-shield-halved");
            return;
          }
          conversation = {
            id: id("convo"),
            jobId,
            participants: [...new Set([job.clientId, this.currentUser.value.id])],
            messages: [],
          };
          state.conversations.push(conversation);
        }
        conversation.messages.push({
          id: id("msg"),
          senderId: this.currentUser.value.id,
          text,
          at: new Date().toISOString(),
        });
        const recipient = conversation.participants.find(
          (userId) => userId !== this.currentUser.value.id,
        );
        if (recipient)
          this.addNotification({
            userId: recipient,
            title: "New message",
            text: `${this.currentUser.value.name}: ${text.slice(0, 76)}`,
            link: "/messages",
            icon: "fa-comments",
          });
        this.notice("Message sent", "fa-paper-plane");
      },

      release(contract, milestone) {
        if (
          !contract ||
          contract.clientId !== this.currentUser.value.id ||
          milestone.status !== "Funded" ||
          !contract.milestones?.some((item) => item.id === milestone.id)
        ) {
          this.notice("Payment release is not allowed", "fa-shield-halved");
          return;
        }
        milestone.status = "Released";
        this.securityEvent("Milestone released", `${contract.id}/${milestone.id}`);
        state.transactions.unshift({
          id: id("txn"),
          userId: contract.providerId,
          type: "Milestone release",
          amount: milestone.amount,
          relatedId: contract.id,
          date: new Date().toISOString(),
          description: `Milestone released: ${milestone.title}`,
        });
        this.addNotification({
          userId: contract.providerId,
          title: "Milestone released",
          text: `${milestone.title} was released for payment.`,
          link: `/contract/${contract.id}`,
          icon: "fa-circle-dollar-to-slot",
        });
        this.notice("Milestone released");
      },

      procurementEvent(target, action, detail = "", level = "info") {
        const event = window.ProcurementCommon.audit(
          target,
          this.currentUser.value.name,
          action,
          detail,
          level,
        );
        event.objectId = target?.id || "PROCUREMENT";
        state.procurementAudit.unshift(event);
        return event;
      },

      procurementTransition(target, nextStatus, detail = "") {
        if (!target) return null;
        const previous = target.status;
        target.status = nextStatus;
        const event = this.procurementEvent(
          target,
          `${previous} → ${nextStatus}`,
          detail,
          ["Rejected", "Exception", "Escalated"].includes(nextStatus)
            ? "danger"
            : "success",
        );
        this.notice(`${target.id} moved to ${nextStatus}`);
        return event;
      },
    };
  }

  global.BuyniverseDomainActions = { createDomainActions };
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
