const { createApp, reactive, ref, computed, watch } = Vue;
const { createRouter, createWebHistory, createWebHashHistory } = VueRouter;
const { loadModule } = window["vue3-sfc-loader"];

window.sfcOptions = {
  moduleCache: { vue: Vue, "vue-router": VueRouter },
  async getFile(url) {
    const resolved = new URL(url, window.location.href);
    if (resolved.origin !== window.location.origin)
      throw new Error("Cross-origin SFC loading is blocked.");
    const response = await fetch(resolved, {
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
    });
    if (!response.ok)
      throw new Error(`${response.status} ${resolved.pathname}`);
    return {
      getContentData: (binary) =>
        binary ? response.arrayBuffer() : response.text(),
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

const STORAGE_VERSION = 10;
const storage = window.WebCommon.createVersionedStorage(
  "buyniverse-vue-demo-v1",
  STORAGE_VERSION,
);
const cached = storage.read();
const cachedValue = cached?.legacy ? null : cached?.value;
const isSafeCachedState = (value) => {
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
  return (
    bounded &&
    value.users.every(
      (user) =>
        user &&
        typeof user.id === "string" &&
        user.id.length <= 120 &&
        ["Client", "Freelancer", "Admin"].includes(user.type),
    ) &&
    value.jobs.every(
      (job) =>
        job &&
        typeof job.id === "string" &&
        job.id.length <= 120 &&
        typeof job.clientId === "string",
    ) &&
    value.users.some((user) => user.id === value.currentUserId)
  );
};
const candidateState = cachedValue?.users ? cachedValue : cachedValue?.state;
const cachedState = isSafeCachedState(candidateState) ? candidateState : null;
const state = reactive(cachedState || window.BuyniverseDemo.clone());
const ui = reactive({
  toast: null,
  loading: false,
  loadingMessage: "",
  modal: null,
  locked: false,
  saveState: "saved",
  lastSavedAt: cached?.savedAt || null,
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
const positive = (value) => Number.isFinite(Number(value)) && Number(value) > 0;

const helpers = { id, clean, positive, allowedMarketplaceModes };
const domainActions = window.BuyniverseDomainActions
  ? window.BuyniverseDomainActions.createDomainActions(state, ui, helpers)
  : {};

const store = {
  state,
  ui,
  locale,
  setLocale: window.BuyniverseI18n.setLocale,
  t: window.BuyniverseI18n.t,
  money,
  date,
  currentUser: computed(
    () => state.users.find((user) => user.id === state.currentUserId) || state.users[0],
  ),
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
  ...domainActions,
};

let persistenceTimer = 0;
const persistState = () => {
  window.clearTimeout(persistenceTimer);
  const saved = storage.write(state);
  ui.saveState = saved ? "saved" : "error";
  if (saved) ui.lastSavedAt = new Date().toISOString();
  return saved;
};
watch(
  state,
  () => {
    ui.saveState = "saving";
    window.clearTimeout(persistenceTimer);
    persistenceTimer = window.setTimeout(persistState, 250);
  },
  { deep: true },
);
window.addEventListener("pagehide", persistState);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") persistState();
});

// Component Loaders
const Dashboard = load("./app/pages/DashboardPage.vue?v=27");
const Home = load("./app/pages/HomePage.vue?v=26");
const Workspace = load("./app/pages/WorkspacePage.vue?v=52");
const Project = load("./app/pages/ProjectPage.vue?v=28");
const Detail = load("./app/pages/DetailPage.vue?v=35");
const PostJobWizard = load("./app/pages/PostJobWizard.vue?v=29");
const JobDetails = load("./app/pages/JobDetailsPage.vue?v=33");
const Fiscal = load("./app/pages/FiscalPage.vue?v=31");
const ContractPage = load("./app/pages/ContractPage.vue?v=32");
const Identity = load("./app/pages/IdentityPage.vue?v=33");
const AdminIssuers = load("./app/pages/AdminIssuersPage.vue?v=30");
const Billing = load("./app/pages/BillingPage.vue?v=31");
const Contest = load("./app/pages/ContestPage.vue?v=32");
const InvoiceView = load("./app/pages/InvoiceViewPage.vue?v=35");
const Directory = load("./app/pages/DirectoryPage.vue?v=37");
const Procurement = load("./app/pages/ProcurementPage.vue?v=21");
const NotFound = {
  template:
    '<section class="panel p-8 text-center"><h1 class="text-2xl font-bold">Ruta no encontrada</h1><p class="mt-2 text-slate-500">La pantalla que buscas no existe en esta réplica.</p><RouterLink class="btn-brand mt-5" to="/">Ir al inicio</RouterLink></section>',
};

const r = (path, component, meta = {}) => ({ path, component, meta });
const routes = [
  r("/", Home),
  r("/dashboard/:section?", Dashboard, { view: "dashboard", to: "/dashboard/timesheets" }),
  r("/clients", Workspace, { kind: "clients" }),
  r("/suppliers", Workspace, { kind: "suppliers", roles: ["Client", "Admin"] }),
  r("/leads", Workspace, { kind: "leads" }),
  r("/projects", Workspace, { kind: "projects" }),
  r("/project/:id", Project, { projectAccess: true }),
  r("/project/:id/contest", Contest, { projectAccess: true }),
  r("/invoices", Workspace, { kind: "invoices" }),
  r("/invoices/new", Fiscal, {
    fiscal: "invoice",
    roles: ["Freelancer", "Admin"],
  }),
  r("/invoices/:invoiceId", InvoiceView, { invoiceAccess: true }),
  r("/invoices/:invoiceId/edit", Fiscal, {
    fiscal: "invoice",
    roles: ["Freelancer", "Admin"],
    invoiceAccess: true,
  }),
  r("/estimates", Workspace, { kind: "estimates" }),
  r("/payments", Workspace, { kind: "payments" }),
  r("/payments/new", Fiscal, {
    fiscal: "payment",
    roles: ["Freelancer", "Admin"],
  }),
  r("/payments/:paymentId/edit", Fiscal, {
    fiscal: "payment",
    roles: ["Freelancer", "Admin"],
    paymentAccess: true,
  }),
  r("/products", Workspace, { kind: "products", roles: ["Client", "Admin"] }),
  r("/expenses", Workspace, { kind: "expenses", roles: ["Client", "Admin"] }),
  r("/messages", Workspace, { kind: "messages" }),
  r("/post-job/:id?", PostJobWizard, { roles: ["Client", "Admin"] }),
  r("/job/:jobId", JobDetails, { jobAccess: true }),
  r("/job/:jobId/:slug", JobDetails, { jobAccess: true }),
  r("/client/job/:jobId", JobDetails, {
    clientView: true,
    roles: ["Client", "Admin"],
  }),
  r("/profile/billing", Billing),
  r("/profile/:userId", Identity, { identity: "profile" }),
  r("/profile/:userId/:slug", Identity, { identity: "profile" }),
  r("/agency/:agencyId", Identity, { identity: "agency" }),
  r("/agency/:agencyId/:slug", Identity, { identity: "agency" }),
  r("/contract/:contractId", ContractPage, { contractAccess: true }),
  r("/find-talent", Directory, { directory: "talent" }),
  r("/saved-jobs", Workspace, { kind: "saved" }),
  r("/browse-services", Directory, { directory: "gigs" }),
  r("/gig/:gigId", Detail, { kind: "gig" }),
  r("/gig/:gigId/:slug", Detail, { kind: "gig" }),
  r("/admin/issuers", AdminIssuers, { admin: true, roles: ["Admin"] }),
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
  if (to.meta.projectAccess) {
    const job = store.job(to.params.id),
      user = store.currentUser.value,
      contract = store.contract(job?.contractId);
    const allowed =
      job &&
      (user.type === "Admin" ||
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
      (user.type !== "Admin" && ![invoice.clientId, invoice.providerId].includes(user.id))
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
      (user.type !== "Admin" && invoice.providerId !== user.id)
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
      (user.type !== "Admin" && ![contract.clientId, contract.providerId].includes(user.id))
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
      (store.currentUser.value.type !== "Admin" && job.clientId !== store.currentUser.value.id)
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
    if (!job || (job.status !== "OPEN" && user.type !== "Admin" && !participant)) {
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

const app = createApp(load("./app/App.vue?v=37"));
window.__buyniverseErrors = [];
app.config.errorHandler = (error, instance, info) => {
  const detail = {
    message: clean(error?.message || String(error), 500),
    info: clean(info, 160),
    at: new Date().toISOString(),
    component: clean(
      instance?.$options?.name || instance?.$?.type?.__file || "anonymous",
      160,
    ),
  };
  window.__buyniverseErrors.push(detail);
  if (window.__buyniverseErrors.length > 50) window.__buyniverseErrors.shift();
  console.error("[Buyniverse]", detail);
};

window.WebCommon.installFormValidation(document);
app.config.globalProperties.$t = window.BuyniverseI18n.t;
app.provide("store", store).use(router).mount("#app");
