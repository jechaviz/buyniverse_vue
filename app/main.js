const { createApp, reactive, ref, computed, watch } = Vue;
const { createRouter, createWebHistory, createWebHashHistory } = VueRouter;
const { loadModule } = window["vue3-sfc-loader"];

const fileCache = new Map();

window.sfcOptions = {
  moduleCache: { vue: Vue, "vue-router": VueRouter },
  async getFile(url) {
    const basePath = window.location.pathname.startsWith("/buyniverse_vue")
      ? "/buyniverse_vue/"
      : "/";
    const base = new URL(basePath, window.location.origin);
    const rawStr = String(url);
    let cleanUrl = rawStr.startsWith("./") ? rawStr.slice(2) : (rawStr.startsWith("/") ? rawStr.slice(1) : rawStr);
    const appIndex = cleanUrl.lastIndexOf("app/");
    if (appIndex > 0) {
      cleanUrl = cleanUrl.slice(appIndex);
    }
    const resolved = new URL(cleanUrl, base);
    if (resolved.origin !== window.location.origin)
      throw new Error("Cross-origin SFC loading is blocked.");

    const key = resolved.href;
    if (fileCache.has(key)) {
      const cachedData = fileCache.get(key);
      return {
        getContentData: (binary) => cachedData,
      };
    }

    const response = await fetch(resolved, {
      credentials: "same-origin",
      redirect: "error",
    });
    if (!response.ok)
      throw new Error(`${response.status} ${resolved.pathname}`);

    const text = await response.text();
    fileCache.set(key, text);
    return {
      getContentData: (binary) => (binary ? new TextEncoder().encode(text).buffer : text),
    };
  },
  addStyle(textContent) {
    document.head.appendChild(
      Object.assign(document.createElement("style"), { textContent }),
    );
  },
};

const AsyncPageLoading = {
  template:
    '<section class="panel grid min-h-48 place-items-center p-8" role="status"><div class="text-center"><i class="fa-solid fa-circle-notch animate-spin text-2xl text-brand"></i><p class="mt-3 text-sm font-semibold text-slate-500">Loading workspace…</p></div></section>',
};
const AsyncPageError = {
  template:
    '<section class="panel p-8 text-center"><i class="fa-solid fa-triangle-exclamation text-2xl text-rose-500"></i><h1 class="mt-3 text-xl font-800">This view could not be loaded</h1><button class="btn-brand mt-4" @click="reload">Retry</button></section>',
  setup: () => ({ reload: () => window.location.reload() }),
};
const load = (path) =>
  Vue.defineAsyncComponent({
    loader: () => loadModule(path, window.sfcOptions),
    loadingComponent: AsyncPageLoading,
    errorComponent: AsyncPageError,
    delay: 0,
    timeout: 20000,
    onError(error, retry, fail, attempts) {
      if (attempts <= 2) window.setTimeout(retry, attempts * 250);
      else fail(error);
    },
  });

const isSafeId = (value, max = 120) =>
  typeof value === "string" && value.length > 0 && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value);
const isSafeText = (value, max = 500) =>
  typeof value === "string" && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value);
const hasUnsafeKeys = (value, depth = 0) => {
  if (depth > 18 || value == null || typeof value !== "object") return depth > 18;
  return Object.entries(value).some(([key, entry]) =>
    ["__proto__", "prototype", "constructor"].includes(key) || hasUnsafeKeys(entry, depth + 1),
  );
};
const isPlainRecord = (value) => value && typeof value === "object" && !Array.isArray(value);
const isBoundedRecord = (value, maxEntries, maxBytes) => {
  if (!isPlainRecord(value) || Object.keys(value).length > maxEntries) return false;
  try { return JSON.stringify(value).length <= maxBytes; } catch (_) { return false; }
};
const isSafeRemoteState = (value) => {
  if (
    !value ||
    !Array.isArray(value.users) ||
    !Array.isArray(value.jobs) ||
    value.users.length > 500 ||
    value.jobs.length > 5000
  )
    return false;
  const bounded = Object.values(value)
    .filter(Array.isArray)
    .every((collection) => collection.length <= 10000);
  const allowedMode = !value.activeMarketplaceMode || ["buyer", "supplier", "admin"].includes(value.activeMarketplaceMode);
  const safeNotifications = !Array.isArray(value.notifications) || (
    value.notifications.length <= 500 && value.notifications.every((item) =>
      item && isSafeId(item.id) && isSafeId(item.userId) && isSafeText(item.title, 120) && isSafeText(item.text, 500)
    )
  );
  const safeAudit = !Array.isArray(value.securityAudit) || (
    value.securityAudit.length <= 500 && value.securityAudit.every((item) =>
      item && isSafeId(item.id) && isSafeText(item.action, 120) && isSafeText(item.detail || "", 500)
    )
  );
  const safeSavedJobs = !Array.isArray(value.savedJobIds) || (
    value.savedJobIds.length <= 500 && value.savedJobIds.every((jobId) => isSafeId(jobId))
  );
  const safeTablePreferences = value.tablePreferences === undefined || isBoundedRecord(value.tablePreferences, 100, 512000);
  const safeDocumentLibrary = value.documentLibrary === undefined || (
    isPlainRecord(value.documentLibrary) &&
    isBoundedRecord(value.documentLibrary.documents || {}, 100, 512000) &&
    isBoundedRecord(value.documentLibrary.drafts || {}, 100, 512000)
  );
  return (
    !hasUnsafeKeys(value) &&
    bounded &&
    allowedMode &&
    safeNotifications &&
    safeAudit &&
    safeSavedJobs &&
    safeTablePreferences &&
    safeDocumentLibrary &&
    value.users.every(
      (user) =>
        user &&
        isSafeId(user.id) &&
        ["Client", "Freelancer", "Admin"].includes(user.type),
    ) &&
    value.jobs.every(
      (job) =>
        job &&
        isSafeId(job.id) &&
        isSafeId(job.clientId),
    ) &&
    value.users.some((user) => user.id === value.currentUserId)
  );
};
const state = reactive(window.BuyniverseDemo.clone());
// Document-library records and every other workspace draft share this object,
// which is synchronised through the server-side encrypted state endpoint.
window.BuyniverseWorkspaceRuntimeState = state;
const ui = reactive({
  toast: null,
  loading: false,
  loadingMessage: "",
  modal: null,
  locked: false,
  saveState: "connecting",
  lastSavedAt: null,
  tenantContext: null,
  tenantSwitching: false,
});

const { allowedMarketplaceModes } = window.BuyniverseInitialState
  ? window.BuyniverseInitialState.normalizeState(state)
  : { allowedMarketplaceModes: (u) => u?.marketplaceModes || ["buyer", "supplier"] };

const locale = ref(window.BuyniverseI18n.getLocale());
window.BuyniverseI18n.subscribe((value) => (locale.value = value));
const money = (value, currency = "USD") =>
  new Intl.NumberFormat(locale.value === "es" ? "es-MX" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const date = (value) =>
  value
    ? new Intl.DateTimeFormat(locale.value === "es" ? "es-MX" : "en-US", {
        dateStyle: "medium",
      }).format(new Date(value))
    : window.BuyniverseI18n.t("No date");

const id = (prefix) => window.ProcurementCommon.uid(prefix);
const clean = (value, limit = 4000) => window.WebCommon.sanitizeText(value, limit).trim();
const MAX_TRANSACTION_AMOUNT = window.WebCommon.MAX_FINANCIAL_AMOUNT;
const positive = (value) => window.WebCommon.isSafeAmount(value, 0) && Number(value) > 0;

const helpers = { id, clean, positive, allowedMarketplaceModes };
const domainActions = window.BuyniverseDomainActions
  ? window.BuyniverseDomainActions.createDomainActions(state, ui, helpers)
  : {};

const store = {
  state,
  ui,
  locale,
  setLocale: (next) => {
    window.BuyniverseI18n.setLocale(next);
    locale.value = next;
  },
  t: (key, params) => {
    const _cur = locale.value;
    return window.BuyniverseI18n.t(key, params);
  },
  money,
  date,
  currentUser: computed(
    () => state.users.find((user) => user.id === state.currentUserId) || state.users[0],
  ),
  tenantContext: computed(() => ui.tenantContext),
  marketplaceModes: computed(() =>
    allowedMarketplaceModes(state.users.find((user) => user.id === state.currentUserId)),
  ),
  marketplaceMode: computed(() => state.activeMarketplaceMode),
  isBuyer: computed(() => state.activeMarketplaceMode === "buyer"),
  isSupplier: computed(() => state.activeMarketplaceMode === "supplier"),
  isAdmin: computed(
    () =>
      state.activeMarketplaceMode === "admin" &&
      state.users.find((user) => user.id === state.currentUserId)?.type === "Admin",
  ),
  user: (userId) => state.users.find((user) => user.id === userId),
  job: (jobId) => state.jobs.find((job) => job.id === jobId),
  contract: (contractId) => state.contracts.find((contract) => contract.id === contractId),
  supplier: (supplierId) => state.suppliers.find((supplier) => supplier.id === supplierId),
  userSupplierId: (userId) => {
    const map = {
      "user-client-brenda": "sup-1",
      "user-freelancer-john": "sup-3",
      "user-freelancer-jane": "sup-5",
      "user-freelancer-charlie": "sup-2",
    };
    const u = state.users.find((x) => x.id === userId);
    return u?.supplierProfileId || map[userId] || "sup-1";
  },
  currentSupplierId: computed(() => {
    const map = {
      "user-client-brenda": "sup-1",
      "user-freelancer-john": "sup-3",
      "user-freelancer-jane": "sup-5",
      "user-freelancer-charlie": "sup-2",
    };
    const u = state.users.find((x) => x.id === state.currentUserId);
    return u?.supplierProfileId || map[state.currentUserId] || "sup-1";
  }),
  purchaseRequest: (requestId) =>
    state.purchaseRequests.find((request) => request.id === requestId),
  sourcingEvent: (eventId) =>
    state.sourcingEvents.find((event) => event.id === eventId),
  auction: (auctionId) =>
    state.auctions.find((auction) => auction.id === auctionId),
  purchaseOrder: (orderId) =>
    state.purchaseOrders.find((order) => order.id === orderId),
  procurementRole: computed(() =>
    state.activeMarketplaceMode === "admin"
      ? "Admin"
      : state.activeMarketplaceMode === "supplier"
        ? "Supplier"
        : "Buyer",
  ),
  toasts: computed(() => (ui.toast ? [ui.toast] : [])),
  setMarketplaceMode(mode) {
    const allowed = allowedMarketplaceModes(this.currentUser.value);
    if (!allowed.includes(mode)) {
      this.securityEvent("Workspace switch denied", String(mode), "warning");
      return false;
    }
    const previous = state.activeMarketplaceMode;
    state.activeMarketplaceMode = mode;
    if (previous !== mode)
      this.securityEvent("Operating workspace switched", `${previous} to ${mode}`, "info");
    return true;
  },
  selectUser(userId) {
    const nextUser = state.users.find((user) => user.id === userId);
    if (nextUser) {
      const previous = state.currentUserId;
      state.currentUserId = userId;
      const allowed = allowedMarketplaceModes(nextUser);
      if (!allowed.includes(state.activeMarketplaceMode))
        state.activeMarketplaceMode =
          nextUser.type === "Admin" ? "admin" : allowed[0] || "supplier";
      this.securityEvent("Demo identity switched", `${previous} to ${userId}`, "warning");
    }
  },
  async switchTenantContext(companyId, locationId = null) {
    if (!window.BuyniverseTenantContext || !remoteWorkspace || ui.tenantSwitching) return false;
    ui.tenantSwitching = true;
    try {
      if (!(await persistState())) throw new Error("Current workspace could not be saved");
      await window.BuyniverseTenantContext.switchContext(companyId, locationId);
      remoteHydrating = true;
      const remote = await remoteWorkspace.load();
      applyRemoteWorkspace(remote);
      remoteReady = true;
      ui.saveState = "saved";
      ui.lastSavedAt = remote.state ? new Date().toISOString() : null;
      this.securityEvent("Company context switched", `${companyId}:${locationId || "all"}`, "info");
      return true;
    } catch (error) {
      ui.saveState = "error";
      this.notice("Company context could not be switched", "fa-triangle-exclamation");
      return false;
    } finally {
      remoteHydrating = false;
      ui.tenantSwitching = false;
    }
  },
  async refreshTenantContext() {
    if (!window.BuyniverseTenantContext) return null;
    const response = await window.BuyniverseTenantContext.load();
    if (!isSafeTenantContext(response?.context)) throw new Error("Tenant context was rejected");
    ui.tenantContext = response.context;
    return response.context;
  },
  ...domainActions,
};

let persistenceTimer = 0;
let remoteReady = false;
let remoteHydrating = true;
const remoteWorkspace = window.BuyniverseWorkspaceState;
const isSafeTenantContext = (context) => Boolean(
  context && isSafeId(context?.tenant?.id) && isSafeId(context?.company?.id) &&
  typeof context.company.legalName === "string" && context.company.legalName.length <= 220 &&
  (!context.location || isSafeId(context.location.id)) &&
  Array.isArray(context.companies) && context.companies.length > 0 && context.companies.length <= 100,
);
const replaceWorkspaceState = (nextState) => {
  if (!isSafeRemoteState(nextState)) throw new Error("Remote workspace payload was rejected");
  Object.keys(state).forEach((key) => { delete state[key]; });
  Object.assign(state, nextState);
  window.BuyniverseInitialState?.normalizeState(state);
};
const applyRemoteWorkspace = (remote) => {
  if (remote?.context && !isSafeTenantContext(remote.context)) throw new Error("Tenant context was rejected");
  replaceWorkspaceState(remote?.state || window.BuyniverseDemo.clone());
  ui.tenantContext = remote?.context || null;
};
const persistState = async () => {
  window.clearTimeout(persistenceTimer);
  if (!remoteReady || !remoteWorkspace) return false;
  ui.saveState = "saving";
  try {
    const snapshot = JSON.parse(JSON.stringify(state));
    const saved = await remoteWorkspace.save(snapshot);
    ui.saveState = "saved";
    ui.lastSavedAt = saved.savedAt;
    return true;
  } catch (error) {
    ui.saveState = "error";
    return false;
  }
};
watch(
  state,
  () => {
    if (remoteHydrating || !remoteReady) return;
    ui.saveState = "saving";
    window.clearTimeout(persistenceTimer);
    persistenceTimer = window.setTimeout(() => { void persistState(); }, 550);
  },
  { deep: true },
);
const hydrateRemoteWorkspace = async () => {
  if (!remoteWorkspace) { ui.saveState = "error"; remoteHydrating = false; return; }
  try {
    const remote = await remoteWorkspace.load();
    applyRemoteWorkspace(remote);
    remoteReady = true;
    ui.saveState = "saved";
    ui.lastSavedAt = remote.state ? new Date().toISOString() : null;
    window.dispatchEvent(new Event("buyniverse:workspace-hydrated"));
  } catch (error) {
    // No browser-resident fallback is used: a failed remote write must remain
    // visible instead of falsely claiming that drafts are persisted.
    ui.saveState = "error";
  } finally {
    remoteHydrating = false;
  }
};
void hydrateRemoteWorkspace();
window.addEventListener("pagehide", () => { void persistState(); });
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") void persistState();
});

// Component Loaders
const Dashboard = load("./app/pages/DashboardPage.vue?v=30");
const Home = load("./app/pages/HomePage.vue?v=30");
const Workspace = load("./app/pages/WorkspacePage.vue?v=53");
const Project = load("./app/pages/ProjectPage.vue?v=28");
const Detail = load("./app/pages/DetailPage.vue?v=35");
const PostJobWizard = load("./app/pages/PostJobWizard.vue?v=31");
const JobDetails = load("./app/pages/JobDetailsPage.vue?v=36");
const Fiscal = load("./app/pages/FiscalPage.vue?v=32");
const ContractPage = load("./app/pages/ContractPage.vue?v=33");
const Identity = load("./app/pages/IdentityPage.vue?v=33");
const AdminIssuers = load("./app/pages/AdminIssuersPage.vue?v=30");
const TenantAdmin = load("./app/pages/TenantAdminPage.vue?v=1");
const Billing = load("./app/pages/BillingPage.vue?v=31");
const Contest = load("./app/pages/ContestPage.vue?v=33");
const InvoiceView = load("./app/pages/InvoiceViewPage.vue?v=36");
const Directory = load("./app/pages/DirectoryPage.vue?v=39");
const ProductCatalog = load("./app/pages/ProductCatalogPage.vue?v=1");
const Procurement = load("./app/pages/ProcurementPage.vue?v=22");
const NotFound = {
  template:
    '<section class="panel p-8 text-center"><h1 class="text-2xl font-bold">Ruta no encontrada</h1><p class="mt-2 text-slate-500">La pantalla que buscas no existe en esta réplica.</p><RouterLink class="btn-brand mt-5" to="/">Ir al inicio</RouterLink></section>',
};

const r = (path, component, meta = {}) => ({ path, component, meta });
const routes = [
  r("/", Home),
  r("/find-work", Home, { modes: ["supplier"] }),
  r("/dashboard/:section?", Dashboard, { view: "dashboard", to: "/dashboard/timesheets" }),
  r("/clients", Workspace, { kind: "clients", modes: ["supplier", "admin"] }),
  r("/suppliers", Workspace, { kind: "suppliers", modes: ["buyer", "admin"] }),
  r("/leads", Workspace, { kind: "leads", modes: ["supplier", "admin"] }),
  r("/projects", Workspace, { kind: "projects" }),
  r("/project/:id", Project, { projectAccess: true }),
  r("/project/:id/contest", Contest, { projectAccess: true }),
  r("/invoices", Workspace, { kind: "invoices" }),
  r("/invoices/new", Fiscal, {
    fiscal: "invoice",
    modes: ["supplier", "admin"],
  }),
  r("/invoices/:invoiceId", InvoiceView, { invoiceAccess: true }),
  r("/invoices/:invoiceId/edit", Fiscal, {
    fiscal: "invoice",
    modes: ["supplier", "admin"],
    invoiceAccess: true,
  }),
  r("/estimates", Workspace, { kind: "estimates" }),
  r("/payments", Workspace, { kind: "payments" }),
  r("/payments/new", Fiscal, {
    fiscal: "payment",
    modes: ["supplier", "admin"],
  }),
  r("/payments/:paymentId/edit", Fiscal, {
    fiscal: "payment",
    modes: ["supplier", "admin"],
    paymentAccess: true,
  }),
  r("/products", ProductCatalog, { kind: "products", modes: ["buyer", "admin"] }),
  r("/expenses", Workspace, { kind: "expenses", modes: ["buyer", "admin"] }),
  r("/messages", Workspace, { kind: "messages" }),
  r("/post-job/:id?", PostJobWizard, { modes: ["buyer", "admin"] }),
  r("/job/:jobId", JobDetails, { jobAccess: true }),
  r("/job/:jobId/:slug", JobDetails, { jobAccess: true }),
  r("/client/job/:jobId", JobDetails, {
    clientView: true,
    modes: ["buyer", "admin"],
  }),
  r("/profile/billing", Billing),
  r("/profile/:userId", Identity, { identity: "profile" }),
  r("/profile/:userId/:slug", Identity, { identity: "profile" }),
  r("/agency/:agencyId", Identity, { identity: "agency" }),
  r("/agency/:agencyId/:slug", Identity, { identity: "agency" }),
  r("/contract/:contractId", ContractPage, { contractAccess: true }),
  r("/find-talent", Directory, { directory: "talent", modes: ["buyer", "admin"] }),
  r("/saved-jobs", Workspace, { kind: "saved", modes: ["supplier"] }),
  r("/browse-services", Directory, { directory: "gigs", modes: ["buyer", "admin"] }),
  r("/gig/:gigId", Detail, { kind: "gig" }),
  r("/gig/:gigId/:slug", Detail, { kind: "gig" }),
  r("/admin/issuers", AdminIssuers, { admin: true, roles: ["Admin"] }),
  r("/settings/organizations", TenantAdmin),
  r("/procurement/:section?", Procurement, { domain: "procurement" }),
  r("/:pathMatch(.*)*", NotFound),
];

if (
  window.location.protocol !== "file:" &&
  window.location.hash &&
  window.location.hash.startsWith("#/")
) {
  const cleanPath = window.location.hash.slice(1);
  const basePrefix = window.location.pathname.startsWith("/buyniverse_vue")
    ? "/buyniverse_vue"
    : "";
  window.history.replaceState(null, "", basePrefix + cleanPath);
}

const routerBase = window.location.pathname.startsWith("/buyniverse_vue")
  ? "/buyniverse_vue/"
  : "/";
const routerHistory =
  window.location.protocol === "file:"
    ? createWebHashHistory()
    : createWebHistory(routerBase);

const router = createRouter({
  history: routerHistory,
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

router.beforeEach((to) => {
  const roles = Array.isArray(to.meta.roles) ? to.meta.roles : null;
  if (roles && !roles.includes(store.currentUser.value?.type)) {
    store.securityEvent("Route access denied", to.path, "warning");
    store.notice("You do not have access to that view", "fa-shield-halved");
    return "/dashboard";
  }
  const modes = Array.isArray(to.meta.modes) ? to.meta.modes : null;
  if (modes && !modes.includes(store.marketplaceMode.value)) {
    store.securityEvent("Workspace route denied", `${store.marketplaceMode.value}:${to.path}`, "warning");
    store.notice("Switch to the required company workspace to open this view", "fa-shield-halved");
    return store.isSupplier.value ? "/find-work" : "/dashboard";
  }
  if (to.meta.admin && !store.isAdmin.value) {
    store.securityEvent("Administration route denied", to.path, "warning");
    store.notice("Administration workspace required", "fa-shield-halved");
    return "/dashboard";
  }
  if (to.params.section && ["timesheets", "my-agency"].includes(to.params.section) && !store.isSupplier.value) {
    store.securityEvent("Supplier dashboard route denied", to.path, "warning");
    store.notice("Supplier workspace required", "fa-shield-halved");
    return "/dashboard";
  }
  if (to.meta.projectAccess) {
    const job = store.job(to.params.id),
      user = store.currentUser.value,
      contract = store.contract(job?.contractId);
    const allowed =
      job &&
      (store.isAdmin.value ||
        job.clientId === user.id ||
        contract?.providerId === user.id ||
        job.proposals?.some((proposal) => proposal.freelancerId === user.id));
    if (!allowed) {
      store.securityEvent("Project access denied", clean(to.params.id, 120), "warning");
      store.notice("Project access denied", "fa-shield-halved");
      return "/projects";
    }
  }
  if (to.meta.invoiceAccess) {
    const invoice = state.invoices.find((item) => item.id === to.params.invoiceId),
      user = store.currentUser.value;
    if (
      !invoice ||
      (!store.isAdmin.value && ![invoice.clientId, invoice.providerId].includes(user.id))
    ) {
      store.securityEvent("Invoice access denied", clean(to.params.invoiceId, 120), "warning");
      store.notice("Invoice access denied", "fa-shield-halved");
      return "/invoices";
    }
  }
  if (to.meta.paymentAccess) {
    const payment = state.paymentReceipts.find((item) => item.id === to.params.paymentId),
      invoice = state.invoices.find((item) => item.id === payment?.invoiceId),
      user = store.currentUser.value;
    if (
      !payment ||
      !invoice ||
      (!store.isAdmin.value && invoice.providerId !== user.id)
    ) {
      store.securityEvent("Payment access denied", clean(to.params.paymentId, 120), "warning");
      store.notice("Payment access denied", "fa-shield-halved");
      return "/payments";
    }
  }
  if (to.meta.contractAccess) {
    const contract = store.contract(to.params.contractId),
      user = store.currentUser.value;
    if (
      !contract ||
      (!store.isAdmin.value && ![contract.clientId, contract.providerId].includes(user.id))
    ) {
      store.securityEvent("Contract access denied", clean(to.params.contractId, 120), "warning");
      store.notice("Contract access denied", "fa-shield-halved");
      return "/dashboard";
    }
  }
  if (to.meta.clientView) {
    const job = store.job(to.params.jobId);
    if (
      !job ||
      (!store.isAdmin.value && job.clientId !== store.currentUser.value.id)
    ) {
      store.securityEvent("Proposal access denied", clean(to.params.jobId, 120), "warning");
      store.notice("Project proposal access denied", "fa-shield-halved");
      return job ? `/job/${job.id}` : "/dashboard";
    }
  }
  if (to.meta.jobAccess) {
    const job = store.job(to.params.jobId),
      user = store.currentUser.value;
    const participant =
      job &&
      (job.clientId === user.id ||
        job.proposals?.some((proposal) => proposal.freelancerId === user.id) ||
        store.contract(job.contractId)?.providerId === user.id);
    if (!job || (job.status !== "OPEN" && !store.isAdmin.value && !participant)) {
      store.securityEvent("Job access denied", clean(to.params.jobId, 120), "warning");
      store.notice("Project access denied", "fa-shield-halved");
      return "/dashboard";
    }
  }
  return true;
});

const recentLabel = (to) => {
  if (to.params.id && to.path.startsWith("/project/"))
    return store.job(to.params.id)?.title || "Project";
  if (to.params.contractId)
    return `Contract · ${store.job(store.contract(to.params.contractId)?.sourceId)?.title || to.params.contractId}`;
  if (to.params.invoiceId) return `Invoice ${to.params.invoiceId}`;
  if (to.params.paymentId) return `Payment ${to.params.paymentId}`;
  if (to.params.jobId) return store.job(to.params.jobId)?.title || "Job";
  if (to.params.gigId)
    return state.gigs.find((item) => item.id === to.params.gigId)?.title || "Service";
  if (to.params.agencyId)
    return state.agencies.find((item) => item.id === to.params.agencyId)?.name || "Agency";
  if (to.params.userId)
    return state.users.find((item) => item.id === to.params.userId)?.name || "Profile";
  const item = routes.find((entry) => entry.path === to.path);
  return item ? to.path.replace(/^\//, "").replace(/-/g, " ") || "Dashboard" : "Workspace";
};

router.afterEach((to) => {
  if (window.BuyniverseSeo?.updateSeoMetadata) {
    window.BuyniverseSeo.updateSeoMetadata(to, store);
  }
  if (to.query.new === "1") return;
  const path = window.WebCommon.safeInternalPath(to.fullPath, "/dashboard");
  if (path === "/" || path.startsWith("/post-job/")) return;
  const entry = {
    path,
    label: clean(recentLabel(to), 120),
    userId: store.currentUser.value.id,
    at: new Date().toISOString(),
  };
  state.recentViews = [
    entry,
    ...state.recentViews.filter(
      (item) => item.userId !== entry.userId || item.path !== path,
    ),
  ].slice(0, 24);
});

window.BuyniverseI18n.subscribe(() => {
  if (window.BuyniverseSeo?.updateSeoMetadata) {
    window.BuyniverseSeo.updateSeoMetadata(router.currentRoute.value, store);
  }
});

let appRevealed = false;
const revealApp = () => {
  if (appRevealed) return;
  appRevealed = true;
  const reveal = () => window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
    document.documentElement.dataset.appReady = "true";
    document.getElementById("app")?.setAttribute("data-ready", "true");
    document.getElementById("app-boot")?.setAttribute("aria-hidden", "true");
  }));
  const fontReady = document.fonts?.ready;
  if (fontReady?.then) {
    Promise.race([fontReady, new Promise((resolve) => window.setTimeout(resolve, 350))]).then(reveal, reveal);
  } else {
    reveal();
  }
};
window.addEventListener("buyniverse:app-shell-ready", revealApp, { once: true });
// Fail open rather than leaving a blank application if an external CDN fails.
window.setTimeout(revealApp, 5000);

const app = createApp(load("./app/App.vue?v=44"));
window.__buyniverseErrors = [];
app.config.errorHandler = (error, instance, info) => {
  const detail = {
    message: clean(error?.message || String(error), 500),
    stack: clean(error?.stack || "", 1500),
    info: clean(info, 160),
    at: new Date().toISOString(),
    component: clean(
      instance?.$options?.name || instance?.$?.type?.__file || instance?.$?.type?.name || "anonymous",
      160,
    ),
  };
  window.__buyniverseErrors.push(detail);
  if (window.__buyniverseErrors.length > 50) window.__buyniverseErrors.shift();
  console.error("[Buyniverse Exception]:", error?.message || error, "\nComponent:", detail.component, "\nInfo:", detail.info, "\nStack:", error?.stack, detail);
};

window.WebCommon.installFormValidation(document);
app.config.globalProperties.$t = window.BuyniverseI18n.t;
const DocumentEditorModal = load("./app/components/document/DocumentEditorModal.vue?v=18");
app.component("DocumentEditorModal", DocumentEditorModal);
app.provide("store", store).use(router).mount("#app");
