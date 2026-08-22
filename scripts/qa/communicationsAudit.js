const fs = require("fs");
const path = require("path");

function runCommunicationsAudit(root, read) {
  const scope = {
    navigator: { language: "en-US" },
    setTimeout,
    clearTimeout,
  };
  new Function(
    "window",
    fs.readFileSync(path.resolve(root, "../lib/web-common/browser.js"), "utf8"),
  )(scope);
  new Function("window", read("app/store/initialState.js"))(scope);
  new Function("window", read("app/store/domainActions.js"))(scope);
  new Function("window", read("app/data/demo.js"))(scope);

  const state = scope.BuyniverseDemo.clone();
  const { allowedMarketplaceModes } = scope.BuyniverseInitialState.normalizeState(
    state,
  );
  let sequence = 0;
  const actions = scope.BuyniverseDomainActions.createDomainActions(state, {}, {
    id: (prefix) => `${prefix}-qa-${++sequence}`,
    clean: scope.WebCommon.sanitizeText,
    positive: (value) => Number.isFinite(Number(value)) && Number(value) > 0,
    allowedMarketplaceModes,
  });
  const currentUser = { value: state.users.find((user) => user.id === "user-client-brenda") };
  const store = {
    ...actions,
    currentUser,
    isAdmin: { value: false },
    isBuyer: { value: true },
    isSupplier: { value: false },
    job: (id) => state.jobs.find((item) => item.id === id),
    user: (id) => state.users.find((item) => item.id === id),
    notice: () => {},
  };

  const eventId = "RFP-2026-091";
  const conversation = store.conversationFor({
    contextType: "sourcing",
    contextId: eventId,
  });
  if (!conversation || conversation.contextType !== "sourcing")
    throw new Error("Sourcing conversation is not discoverable for its owner");

  const initialMessages = conversation.messages.length;
  const announcement = store.sendMessage({
    contextType: "sourcing",
    contextId: eventId,
    kind: "announcement",
    subject: "QA update",
    text: "A controlled supplier announcement.",
  });
  if (
    !announcement ||
    conversation.messages.length !== initialMessages + 1 ||
    announcement.kind !== "announcement" ||
    !state.notifications.some((item) => item.userId === "user-freelancer-charlie")
  )
    throw new Error("Supplier announcement flow did not notify the authorized audience");

  const draft = store.createMailDraft({
    contextType: "sourcing",
    contextId: eventId,
    templateId: "tpl-rfx-invitation",
  });
  if (
    !draft ||
    draft.localOnly ||
    draft.status !== "Draft" ||
    !draft.recipientSupplierIds.length
  )
    throw new Error("Server-workspace email draft flow is incomplete");

  const comment = store.addProjectComment({
    jobId: "job-1",
    text: "QA project update",
  });
  if (!comment || !state.jobs.find((job) => job.id === "job-1").comments.includes(comment))
    throw new Error("Project comment was not stored separately from the chat thread");

  currentUser.value = state.users.find((user) => user.id === "user-freelancer-john");
  store.isBuyer.value = false;
  store.isSupplier.value = true;
  const denied = store.sendMessage({
    contextType: "sourcing",
    contextId: eventId,
    kind: "message",
    text: "This user was not invited.",
  });
  if (denied || !state.securityAudit.some((item) => item.action === "Communication access denied"))
    throw new Error("Unauthorized supplier communication was not denied and audited");

  currentUser.value = state.users.find((user) => user.id === "user-freelancer-charlie");
  const supplierMessage = store.sendMessage({
    contextType: "sourcing",
    contextId: eventId,
    kind: "message",
    text: "Authorized supplier question.",
  });
  const supplierAnnouncement = store.sendMessage({
    contextType: "sourcing",
    contextId: eventId,
    kind: "announcement",
    subject: "Not allowed",
    text: "Suppliers cannot broadcast.",
  });
  if (!supplierMessage || supplierAnnouncement)
    throw new Error("Supplier messaging or announcement authorization is incorrect");

  return {
    threads: state.conversations.length,
    templates: state.messageTemplates.length,
    workspaceDrafts: state.mailings.length,
  };
}

module.exports = { runCommunicationsAudit };
