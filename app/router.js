(function (global) {
  "use strict";

  function createAppRouter(store, state, runtimeMode, clean, load) {
    const { createRouter, createWebHistory, createWebHashHistory } = VueRouter;

    // Page Components
    const Dashboard = load("./app/pages/DashboardPage.vue?v=34");
    const Home = load("./app/pages/HomePage.vue?v=32");
    const Workspace = load("./app/pages/WorkspacePage.vue?v=57");
    const Project = load("./app/pages/ProjectPage.vue?v=30");
    const Detail = load("./app/pages/DetailPage.vue?v=36");
    const PostJobWizard = load("./app/pages/PostJobWizard.vue?v=35");
    const JobDetails = load("./app/pages/JobDetailsPage.vue?v=38");
    const Fiscal = load("./app/pages/FiscalPage.vue?v=33");
    const ContractPage = load("./app/pages/ContractPage.vue?v=34");
    const Identity = load("./app/pages/IdentityPage.vue?v=34");
    const AdminIssuers = load("./app/pages/AdminIssuersPage.vue?v=31");
    const TenantAdmin = load("./app/pages/TenantAdminPage.vue?v=2");
    const Billing = load("./app/pages/BillingPage.vue?v=32");
    const Contest = load("./app/pages/ContestPage.vue?v=34");
    const InvoiceView = load("./app/pages/InvoiceViewPage.vue?v=37");
    const Directory = load("./app/pages/DirectoryPage.vue?v=40");
    const ProductCatalog = load("./app/pages/ProductCatalogPage.vue?v=2");
    const Procurement = load("./app/pages/ProcurementPage.vue?v=32");
    const Onboarding = load("./app/pages/OnboardingPage.vue?v=2");

    const NotFound = {
      template:
        '<section class="panel p-8 text-center"><h1 class="text-2xl font-bold">Ruta no encontrada</h1><p class="mt-2 text-slate-500">La pantalla que buscas no existe o ya no está disponible.</p><RouterLink class="btn-brand mt-5" to="/">Ir al inicio</RouterLink></section>',
    };

    const r = (path, component, meta = {}) => ({ path, component, meta });
    const routes = [
      r("/", Home),
      r("/onboarding", Onboarding, { onboarding: true }),
      r("/find-work", Home, { modes: ["supplier"] }),
      r("/dashboard/:section?", Dashboard, { view: "dashboard", to: "/dashboard/timesheets" }),
      r("/clients", Workspace, { kind: "clients", modes: ["supplier", "admin"] }),
      r("/suppliers", Workspace, { kind: "suppliers", modes: ["buyer", "admin"] }),
      r("/leads", Workspace, { kind: "leads", modes: ["supplier", "admin"] }),
      r("/projects", Workspace, { kind: "projects" }),
      r("/project/:id", Project, { projectAccess: true }),
      r("/project/:id/contest", Contest, { projectAccess: true }),
      r("/invoices", Workspace, { kind: "invoices" }),
      r("/invoices/new", Fiscal, { fiscal: "invoice", modes: ["supplier", "admin"] }),
      r("/invoices/:invoiceId", InvoiceView, { invoiceAccess: true }),
      r("/invoices/:invoiceId/edit", Fiscal, { fiscal: "invoice", modes: ["supplier", "admin"], invoiceAccess: true }),
      r("/estimates", Workspace, { kind: "estimates" }),
      r("/payments", Workspace, { kind: "payments" }),
      r("/payments/new", Fiscal, { fiscal: "payment", modes: ["supplier", "admin"] }),
      r("/payments/:paymentId/edit", Fiscal, { fiscal: "payment", modes: ["supplier", "admin"], paymentAccess: true }),
      r("/products", ProductCatalog, { kind: "products", modes: ["buyer", "admin"] }),
      r("/expenses", Workspace, { kind: "expenses", modes: ["buyer", "admin"] }),
      r("/messages", Workspace, { kind: "messages" }),
      r("/post-job/:id?", PostJobWizard, { modes: ["buyer", "admin"] }),
      r("/job/:jobId", JobDetails, { jobAccess: true }),
      r("/job/:jobId/:slug", JobDetails, { jobAccess: true }),
      r("/client/job/:jobId", JobDetails, { clientView: true, modes: ["buyer", "admin"] }),
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

    if (window.location.protocol !== "file:" && window.location.hash && window.location.hash.startsWith("#/")) {
      const cleanPath = window.location.hash.slice(1);
      const basePrefix = window.location.pathname.startsWith("/buyniverse_vue") ? "/buyniverse_vue" : "";
      window.history.replaceState(null, "", basePrefix + cleanPath);
    }

    const routerBase = window.location.pathname.startsWith("/buyniverse_vue") ? "/buyniverse_vue/" : "/";
    const routerHistory = window.location.protocol === "file:" ? createWebHashHistory() : createWebHistory(routerBase);

    const router = createRouter({
      history: routerHistory,
      routes,
      scrollBehavior: () => ({ top: 0 }),
    });

    function isPublicRoute(path) {
      if (path === "/" || path.startsWith("/procurement/auction") || path.startsWith("/procurement/sourcing")) return true;
      if (path === "/find-talent" || path === "/browse-services") return true;
      if (path.startsWith("/gig/") || path.startsWith("/job/") || path.startsWith("/profile/") || path.startsWith("/agency/")) return true;
      return false;
    }

    router.beforeEach((to) => {
      if (!store.currentUser.value) {
        if (to.meta.onboarding || isPublicRoute(to.path)) return true;
        if (runtimeMode.value !== "demo") {
          return { path: "/", query: { auth: "login", returnTo: to.fullPath } };
        }
      }
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
        if (!invoice || (!store.isAdmin.value && ![invoice.clientId, invoice.providerId].includes(user.id))) {
          store.securityEvent("Invoice access denied", clean(to.params.invoiceId, 120), "warning");
          store.notice("Invoice access denied", "fa-shield-halved");
          return "/invoices";
        }
      }
      if (to.meta.paymentAccess) {
        const payment = state.paymentReceipts.find((item) => item.id === to.params.paymentId),
          invoice = state.invoices.find((item) => item.id === payment?.invoiceId),
          user = store.currentUser.value;
        if (!payment || !invoice || (!store.isAdmin.value && invoice.providerId !== user.id)) {
          store.securityEvent("Payment access denied", clean(to.params.paymentId, 120), "warning");
          store.notice("Payment access denied", "fa-shield-halved");
          return "/payments";
        }
      }
      if (to.meta.contractAccess) {
        const contract = store.contract(to.params.contractId),
          user = store.currentUser.value;
        if (!contract || (!store.isAdmin.value && ![contract.clientId, contract.providerId].includes(user.id))) {
          store.securityEvent("Contract access denied", clean(to.params.contractId, 120), "warning");
          store.notice("Contract access denied", "fa-shield-halved");
          return "/dashboard";
        }
      }
      if (to.meta.clientView) {
        const job = store.job(to.params.jobId);
        if (!job || (!store.isAdmin.value && job.clientId !== store.currentUser.value.id)) {
          store.securityEvent("Proposal access denied", clean(to.params.jobId, 120), "warning");
          store.notice("Project proposal access denied", "fa-shield-halved");
          return job ? `/job/${job.id}` : "/dashboard";
        }
      }
      if (to.meta.jobAccess) {
        const job = store.job(to.params.jobId),
          user = store.currentUser.value;
        const publicListing = job?.status === "OPEN" && job?.visibility === "public" && job?.confidential !== true;
        const participant =
          job &&
          (job.clientId === user.id ||
            job.proposals?.some((proposal) => proposal.freelancerId === user.id) ||
            store.contract(job.contractId)?.providerId === user.id);
        if (!job || (!publicListing && !store.isAdmin.value && !participant)) {
          store.securityEvent("Job access denied", clean(to.params.jobId, 120), "warning");
          store.notice("Project access denied", "fa-shield-halved");
          return "/dashboard";
        }
      }
      return true;
    });

    const recentLabel = (to) => {
      if (to.params.id && to.path.startsWith("/project/")) return store.job(to.params.id)?.title || "Project";
      if (to.params.contractId) return `Contract · ${store.job(store.contract(to.params.contractId)?.sourceId)?.title || to.params.contractId}`;
      if (to.params.invoiceId) return `Invoice ${to.params.invoiceId}`;
      if (to.params.paymentId) return `Payment ${to.params.paymentId}`;
      if (to.params.jobId) return store.job(to.params.jobId)?.title || "Job";
      if (to.params.gigId) return state.gigs.find((item) => item.id === to.params.gigId)?.title || "Service";
      if (to.params.agencyId) return state.agencies.find((item) => item.id === to.params.agencyId)?.name || "Agency";
      if (to.params.userId) return state.users.find((item) => item.id === to.params.userId)?.name || "Profile";
      const item = routes.find((entry) => entry.path === to.path);
      return item ? to.path.replace(/^\//, "").replace(/-/g, " ") || "Dashboard" : "Workspace";
    };

    router.afterEach((to) => {
      if (window.BuyniverseSeo?.updateSeoMetadata) {
        window.BuyniverseSeo.updateSeoMetadata(to, store);
      }
      if (to.meta.onboarding || to.query.new === "1" || !store.currentUser.value) return;
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
        ...state.recentViews.filter((item) => item.userId !== entry.userId || item.path !== path),
      ].slice(0, 24);
    });

    return router;
  }

  global.BuyniverseRouter = { createAppRouter };
})(typeof window !== "undefined" ? window : globalThis);
