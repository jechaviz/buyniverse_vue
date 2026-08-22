(function (global) {
  "use strict";

  function normalizeState(state) {
    [
      "users", "jobs", "contracts", "invoices", "paymentReceipts", "transactions",
      "timeEntries", "contests", "gigs", "conversations", "issuers", "agencies",
      "suppliers", "leads", "products", "expenses", "estimates", "purchaseRequests",
      "sourcingEvents", "auctions", "purchaseOrders", "procurementRules",
      "procurementWorkflows", "procurementAudit", "securityAudit", "recentViews",
      "messageTemplates", "mailings",
    ].forEach((key) => {
      if (!Array.isArray(state[key])) state[key] = [];
    });

    if (!state.users.some((user) => user.id === state.currentUserId))
      state.currentUserId = state.users[0]?.id;

    const defaultMarketplaceModes = (user) =>
      user?.type === "Admin" ? ["admin", "buyer", "supplier"] : ["buyer", "supplier"];

    const allowedMarketplaceModes = (user) => {
      const modes = Array.isArray(user?.marketplaceModes)
        ? user.marketplaceModes
        : defaultMarketplaceModes(user);
      return [...new Set(modes)].filter((mode) =>
        ["buyer", "supplier", "admin"].includes(mode),
      );
    };

    state.users.forEach((user) => {
      user.marketplaceModes = allowedMarketplaceModes(user);
    });

    const initialMarketplaceUser = state.users.find(
      (user) => user.id === state.currentUserId,
    );
    const initialMarketplaceModes = allowedMarketplaceModes(initialMarketplaceUser);
    if (!initialMarketplaceModes.includes(state.activeMarketplaceMode))
      state.activeMarketplaceMode =
        initialMarketplaceUser?.type === "Admin"
          ? "admin"
          : initialMarketplaceModes[0] || "supplier";

    if (!state.procurementAnalytics || typeof state.procurementAnalytics !== "object")
      state.procurementAnalytics = window.BuyniverseDemo.clone().procurementAnalytics;

    state.jobs.forEach((job, index) => {
      job.skills ||= [];
      job.proposals ||= [];
      job.files ||= [];
      job.comments ||= [];
      job.questions ||= [];
      job.description ||= `${job.title} requires a focused delivery plan, collaborative reviews and production-ready handoff.`;
      job.postedAt ||= new Date(Date.UTC(2026, 6, Math.max(1, 12 - index))).toISOString();
      job.budgetType ||= index % 3 === 1 ? "Hourly" : "Fixed price";
      job.experienceLevel ||= ["Intermediate", "Expert", "Entry"][index % 3];
      job.location ||= "Remote";
      job.requiresNDA ??= index === 1;
    });

    state.users.forEach((user) => {
      if (user.type === "Freelancer") {
        user.skills ||= [];
        user.availability ||= "Available";
        user.bio ||= `${user.headline || user.name} focused on dependable, well-documented delivery.`;
      }
    });

    state.invoices.forEach((invoice) => {
      invoice.currency ||= "MXN";
      invoice.status ||= "Vigente";
      invoice.paymentStatus ||= "Unpaid";
    });

    state.purchaseRequests.forEach((request) => {
      request.items ||= [];
      request.audit ||= [];
    });

    state.sourcingEvents.forEach((event) => {
      event.invitedSupplierIds ||= [];
      event.lots ||= [];
      event.quotes ||= [];
      event.files ||= [];
      event.audit ||= [];
    });

    const seededCommunication = window.BuyniverseDemo?.clone?.() || {};
    const knownUsers = new Set(state.users.map((user) => user.id));
    const validContextTypes = new Set(["project", "sourcing", "auction"]);
    state.conversations = state.conversations
      .map((conversation) => {
        const contextType = validContextTypes.has(conversation?.contextType)
          ? conversation.contextType
          : conversation?.jobId
            ? "project"
            : null;
        const contextId = window.WebCommon.sanitizeText(
          conversation?.contextId || conversation?.jobId,
          120,
        ).trim();
        if (!contextType || !contextId) return null;
        const participants = [
          ...new Set(
            (Array.isArray(conversation?.participants)
              ? conversation.participants
              : []
            ).filter((userId) => knownUsers.has(userId)),
          ),
        ].slice(0, 50);
        const messages = (Array.isArray(conversation?.messages)
          ? conversation.messages
          : []
        )
          .map((message, index) => {
            if (!knownUsers.has(message?.senderId)) return null;
            const text = window.WebCommon.sanitizeText(message?.text, 3000).trim();
            if (!text) return null;
            const at = new Date(message?.at);
            return {
              id: window.WebCommon.sanitizeText(message?.id, 120).trim() || `msg-seed-${index}`,
              senderId: message.senderId,
              text,
              subject: window.WebCommon.sanitizeText(message?.subject, 180).trim(),
              kind: message?.kind === "announcement" ? "announcement" : "message",
              channel: "internal",
              at: Number.isNaN(at.getTime()) ? new Date().toISOString() : at.toISOString(),
            };
          })
          .filter(Boolean)
          .slice(-500);
        return {
          id: window.WebCommon.sanitizeText(conversation?.id, 120).trim() || `convo-${contextType}-${contextId}`,
          contextType,
          contextId,
          jobId: contextType === "project" ? contextId : null,
          subject: window.WebCommon.sanitizeText(conversation?.subject, 180).trim(),
          participants,
          messages,
        };
      })
      .filter(Boolean)
      .slice(0, 200);

    for (const seeded of seededCommunication.conversations || []) {
      const contextType = validContextTypes.has(seeded?.contextType)
        ? seeded.contextType
        : seeded?.jobId
          ? "project"
          : null;
      const contextId = window.WebCommon.sanitizeText(
        seeded?.contextId || seeded?.jobId,
        120,
      ).trim();
      if (
        !contextType ||
        !contextId ||
        state.conversations.some(
          (conversation) =>
            conversation.contextType === contextType &&
            conversation.contextId === contextId,
        )
      )
        continue;
      const participants = [
        ...new Set(
          (Array.isArray(seeded.participants) ? seeded.participants : []).filter(
            (userId) => knownUsers.has(userId),
          ),
        ),
      ].slice(0, 50);
      if (!participants.length) continue;
      const messages = (Array.isArray(seeded.messages) ? seeded.messages : [])
        .map((message, index) => {
          if (!knownUsers.has(message?.senderId)) return null;
          const text = window.WebCommon.sanitizeText(message?.text, 3000).trim();
          if (!text) return null;
          const at = new Date(message?.at);
          return {
            id: window.WebCommon.sanitizeText(message?.id, 120).trim() || `msg-demo-${index}`,
            senderId: message.senderId,
            text,
            subject: window.WebCommon.sanitizeText(message?.subject, 180).trim(),
            kind: message?.kind === "announcement" ? "announcement" : "message",
            channel: "internal",
            at: Number.isNaN(at.getTime()) ? new Date().toISOString() : at.toISOString(),
          };
        })
        .filter(Boolean)
        .slice(-500);
      state.conversations.push({
        id: window.WebCommon.sanitizeText(seeded.id, 120).trim() || `convo-demo-${contextType}-${contextId}`,
        contextType,
        contextId,
        jobId: contextType === "project" ? contextId : null,
        subject: window.WebCommon.sanitizeText(seeded.subject, 180).trim(),
        participants,
        messages,
      });
    }
    state.conversations = state.conversations.slice(0, 200);

    if (!state.messageTemplates.length)
      state.messageTemplates = seededCommunication.messageTemplates || [];
    state.messageTemplates = state.messageTemplates
      .map((template) => {
        const id = window.WebCommon.sanitizeText(template?.id, 120).trim();
        const name = window.WebCommon.sanitizeText(template?.name, 120).trim();
        const subject = window.WebCommon.sanitizeText(template?.subject, 180).trim();
        const body = window.WebCommon.sanitizeText(template?.body, 3000).trim();
        if (!id || !name || !subject || !body) return null;
        return {
          id,
          name,
          scope: validContextTypes.has(template.scope) ? template.scope : "all",
          subject,
          body,
          subjectEs: window.WebCommon.sanitizeText(template.subjectEs, 180).trim(),
          bodyEs: window.WebCommon.sanitizeText(template.bodyEs, 3000).trim(),
        };
      })
      .filter(Boolean)
      .slice(0, 50);

    state.mailings = state.mailings
      .map((mailing, index) => {
        const contextType = validContextTypes.has(mailing?.contextType)
          ? mailing.contextType
          : null;
        const contextId = window.WebCommon.sanitizeText(mailing?.contextId, 120).trim();
        const subject = window.WebCommon.sanitizeText(mailing?.subject, 180).trim();
        const body = window.WebCommon.sanitizeText(mailing?.body, 3000).trim();
        if (!contextType || !contextId || !subject || !body) return null;
        return {
          id: window.WebCommon.sanitizeText(mailing?.id, 120).trim() || `mail-seed-${index}`,
          contextType,
          contextId,
          templateId: window.WebCommon.sanitizeText(mailing?.templateId, 120).trim() || null,
          subject,
          body,
          recipientSupplierIds: [...new Set(Array.isArray(mailing?.recipientSupplierIds) ? mailing.recipientSupplierIds : [])].slice(0, 50),
          recipientUserIds: [...new Set((Array.isArray(mailing?.recipientUserIds) ? mailing.recipientUserIds : []).filter((userId) => knownUsers.has(userId)))].slice(0, 50),
          status: "Draft",
          channel: "email",
          localOnly: true,
          createdById: knownUsers.has(mailing?.createdById) ? mailing.createdById : state.currentUserId,
          createdAt: Number.isNaN(new Date(mailing?.createdAt).getTime()) ? new Date().toISOString() : new Date(mailing.createdAt).toISOString(),
        };
      })
      .filter(Boolean)
      .slice(0, 200);

    state.auctions.forEach((auction) => {
      auction.participants ||= [];
      auction.bids ||= [];
      auction.audit ||= [];
      auction.participants.forEach((participant) => {
        const profile = state.suppliers.find((supplier) => supplier.id === participant.supplierId);
        if (profile?.name) participant.name = profile.name;
      });
      auction.closingAt ||= auction.endAt;
      auction.endAt ||= auction.closingAt;
      if (auction.status === "Running" && (!Number.isFinite(Date.parse(auction.closingAt)) || Date.parse(auction.closingAt) <= Date.now())) {
        auction.closingAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        auction.endAt = auction.closingAt;
      }
      auction.extensionCount = Number(auction.extensionCount || 0);
      auction.maxExtensions = Number(auction.maxExtensions || 5);
      auction.minStep = Math.max(1, Number(auction.minStep || 1));
    });

    state.purchaseOrders.forEach((order) => {
      order.lines ||= [];
      order.receipts ||= [];
      order.exceptions ||= [];
      order.audit ||= [];
    });

    if (!Array.isArray(state.notifications)) {
      state.notifications = [
        {
          id: "notif-welcome",
          userId: "user-client-brenda",
          title: "Project update",
          text: "E-commerce Platform Development reached 45% progress.",
          link: "/project/job-1",
          icon: "fa-chart-line",
          isRead: false,
          at: "2026-07-15T09:00:00Z",
        },
        {
          id: "notif-payment",
          userId: "user-client-brenda",
          title: "Payment received",
          text: "A payment complement was recorded for invoice B-201.",
          link: "/payments",
          icon: "fa-credit-card",
          isRead: false,
          at: "2026-07-14T15:30:00Z",
        },
        {
          id: "notif-freelancer",
          userId: "user-freelancer-john",
          title: "Milestone funded",
          text: "Backend API is ready to be released when delivered.",
          link: "/contract/contract-1",
          icon: "fa-flag-checkered",
          isRead: false,
          at: "2026-07-13T12:00:00Z",
        },
      ];
    }
    state.notifications.forEach((notification) => {
      notification.link = window.WebCommon.safeInternalPath(notification.link, "/dashboard");
    });
    state.notifications = state.notifications.slice(0, 500);
    state.securityAudit = state.securityAudit.slice(0, 500);
    state.recentViews = state.recentViews
      .filter((item) => item && state.users.some((user) => user.id === item.userId))
      .map((item) => ({
        path: window.WebCommon.safeInternalPath(item.path, "/dashboard"),
        label: window.WebCommon.sanitizeText(item.label, 120).trim() || "Workspace",
        userId: item.userId,
        at: item.at,
      }))
      .slice(0, 24);

    return { allowedMarketplaceModes };
  }

  global.BuyniverseInitialState = { normalizeState };
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
