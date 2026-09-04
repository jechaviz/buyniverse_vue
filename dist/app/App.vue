<template>
  <div class="premium-shell relative min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
    <a href="#main-content" class="skip-link">{{ store.t("Skip to workspace content") }}</a>

    <!-- Global Command Palette & Modals -->
    <CommandPalette :open="commandOpen" @close="commandOpen = false" />
    <AppModals :ui="ui" :locale="store.locale" @resume-session="resumeSession" @resolve-confirm="store.resolveConfirm" />
    <AuthModal :open="authOpen" :initial-mode="authMode" @close="authOpen = false" />

    <!-- 1. FULL-BLEED PUBLIC LANDING PAGE LAYOUT -->
    <div v-if="isLanding" class="flex-1 flex flex-col min-h-screen">
      <AppPublicNavbar
        :locale="locale"
        :dark="dark"
        @set-locale="setLocale"
        @toggle-theme="toggleTheme"
        @open-auth="openAuth"
        @launch-demo="launchDemo"
      />
      <main id="main-content" class="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12" tabindex="-1">
        <RouterView :key="route.path" />
      </main>
      <AppPublicFooter />
    </div>

    <!-- 2. SOCIAL ONBOARDING DEDICATED SHELL -->
    <div v-else-if="isOnboarding" class="min-h-screen">
      <RouterView />
    </div>

    <!-- 3. AUTHENTICATED WORKSPACE SHELL -->
    <div v-else class="relative flex h-screen overflow-hidden">
      <button v-if="mobileOpen" class="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-xs md:hidden" aria-label="Close navigation" @click="mobileOpen = false"></button>

      <AppSidebar
        :menu="menu"
        :collapsed="collapsed"
        :mobile-open="mobileOpen"
        @close-mobile="mobileOpen = false"
        @toggle-collapse="collapsed = !collapsed"
      />

      <div class="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader
          :ui="ui"
          :user="user"
          :users="store.state.users"
          :current-user-id="store.state.currentUserId"
          :marketplace-mode="marketplaceMode"
          :marketplace-mode-options="marketplaceModeOptions"
          :active-mode-label="activeModeLabel"
          :workspace-shortcut-label="workspaceShortcutLabel"
          :tenant-context="tenantContext"
          :save-status="saveStatus"
          :save-status-title="saveStatusTitle"
          :notifications-open="notificationsOpen"
          :visible-notifications="visibleNotifications"
          :unread-notifications="unreadNotifications"
          :account-open="accountOpen"
          :locale="locale"
          :dark="dark"
          :accents="accents"
          :accent="accent"
          :format-date="store.date"
          @toggle-nav="toggleNav"
          @open-command="commandOpen = true"
          @toggle-overlay="closeOverlays"
          @mark-all-read="store.markAllNotificationsRead(user.id)"
          @open-notification="openNotification"
          @close-account="accountOpen = false"
          @lock-now="lockNow"
          @switch-mode="switchMarketplaceMode"
          @set-locale="setLocale"
          @toggle-theme="toggleTheme"
          @set-accent="setAccent"
          @switch-user="switchUser"
          @switch-tenant="switchTenantContext"
          @open-workspace-shortcut="openWorkspaceShortcut"
        />

        <main id="main-content" class="relative z-10 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8" tabindex="-1">
          <div class="mx-auto" :class="fullWidth ? 'max-w-none' : 'max-w-7xl'">
            <Breadcrumbs />
            <RouterView :key="route.path" />
          </div>
        </main>
      </div>
    </div>

    <!-- Toast stack -->
    <div v-if="ui.toast" class="pointer-events-none fixed bottom-4 right-4 z-80 flex flex-col gap-2">
      <Transition name="toast">
        <div class="pointer-events-auto flex items-center gap-3 rounded-2xl bg-slate-950 px-4 py-3 text-xs font-semibold text-white shadow-elevated border border-slate-800/80 backdrop-blur-xl">
          <i class="fa-solid text-brand" :class="ui.toast.icon || 'fa-circle-check'"></i>
          <span>{{ ui.toast.message || ui.toast.text }}</span>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script>
const { inject, computed, ref, watch, nextTick, onMounted, onBeforeUnmount } = Vue;
const { useRoute, useRouter } = VueRouter;
const load = (p) => Vue.defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(p, window.sfcOptions));
const CommandPalette = load("./app/components/CommandPalette.vue?v=5");
const Breadcrumbs = load("./app/components/Breadcrumbs.vue?v=4");
const AppModals = load("./app/components/layout/AppModals.vue?v=4");
const AppSidebar = load("./app/components/layout/AppSidebar.vue?v=2");
const AppHeader = load("./app/components/layout/AppHeader.vue?v=2");
const AppPublicNavbar = load("./app/components/layout/AppPublicNavbar.vue?v=1");
const AppPublicFooter = load("./app/components/layout/AppPublicFooter.vue?v=1");
const AuthModal = load("./app/components/AuthModal.vue?v=6");

export default {
  components: { Breadcrumbs, CommandPalette, AppModals, AppSidebar, AppHeader, AppPublicNavbar, AppPublicFooter, AuthModal },
  setup() {
    const store = inject("store"), route = useRoute(), router = useRouter();
    const collapsed = ref(false), mobileOpen = ref(false);
    const preference = {
      read(key, fallback = "") {
        try { return localStorage.getItem(key) || fallback; } catch (_) { return fallback; }
      },
      write(key, value) {
        try { localStorage.setItem(key, value); } catch (_) { /* Storage can be disabled by privacy controls. */ }
      },
    };
    const dark = ref(preference.read("buyniverse-vue-theme") !== "light");
    const notificationsOpen = ref(false), accountOpen = ref(false), commandOpen = ref(false);
    const authMode = ref(route.query.auth === "register" ? "register" : "login");
    const authOpen = ref(["login", "register"].includes(route.query.auth));
    const locale = store.locale;
    let stopTranslator = () => {};

    watch(() => store.ui.locked, (locked) => {
      if (!locked) return;
      notificationsOpen.value = false;
      accountOpen.value = false;
      commandOpen.value = false;
      authOpen.value = false;
    });

    const isLanding = computed(() => !route.meta.onboarding && (!store.currentUser.value || route.path === "/"));
    const isOnboarding = computed(() => route.meta.onboarding === true);

    const openAuth = (mode = "login") => {
      authMode.value = mode;
      authOpen.value = true;
    };
    const launchDemo = () => {
      const root = window.location.pathname.startsWith("/buyniverse_vue") ? "/buyniverse_vue/" : "/";
      const target = (route.query && route.query.returnTo) ? String(route.query.returnTo) : "/dashboard";
      const hash = target.startsWith("/") ? `#${target}` : `#/${target}`;
      window.location.assign(`${root}?demo=1${hash}`);
    };
    watch(() => route.query.auth, (requested) => {
      if (!["login", "register"].includes(requested)) return;
      authMode.value = requested;
      authOpen.value = true;
    });

    const setLocale = (code) => {
      store.setLocale(code);
      document.title = locale.value === "es" ? "Buyniverse · Plataforma de Compras B2B, Sourcing y Talento Freelance" : "Buyniverse · B2B Procurement & Freelance Platform";
    };

    const accents = [
      { key: "red", label: "Red", accent: "#e5484d", deep: "#c9363c", soft: "#fff1f1", pale: "#ffe3e3" },
      { key: "violet", label: "Violet", accent: "#7c3aed", deep: "#6d28d9", soft: "#f5f3ff", pale: "#ede9fe" },
      { key: "blue", label: "Blue", accent: "#2563eb", deep: "#1d4ed8", soft: "#eff6ff", pale: "#dbeafe" },
      { key: "teal", label: "Teal", accent: "#0f766e", deep: "#115e59", soft: "#f0fdfa", pale: "#ccfbf1" },
      { key: "orange", label: "Orange", accent: "#ea580c", deep: "#c2410c", soft: "#fff7ed", pale: "#ffedd5" },
      { key: "pink", label: "Pink", accent: "#db2777", deep: "#be185d", soft: "#fdf2f8", pale: "#fce7f3" },
    ];

    const applyAccent = (opt) => {
      document.documentElement.style.setProperty("--accent", opt.accent);
      document.documentElement.style.setProperty("--accent-deep", opt.deep);
      document.documentElement.style.setProperty("--accent-soft", opt.soft);
      document.documentElement.style.setProperty("--accent-pale", opt.pale);
    };

    const savedAccent = preference.read("buyniverse-vue-accent", "red");
    const accent = ref(accents.some((x) => x.key === savedAccent) ? savedAccent : "red");
    applyAccent(accents.find((x) => x.key === accent.value));
    const currentAccent = computed(() => accents.find((x) => x.key === accent.value) || accents[0]);

    const user = store.currentUser, marketplaceMode = store.marketplaceMode, tenantContext = store.tenantContext;
    const marketplaceModeOptions = computed(() => {
      const meta = { buyer: { key: "buyer", label: "Buy", icon: "fa-cart-shopping" }, supplier: { key: "supplier", label: "Sell", icon: "fa-store" }, admin: { key: "admin", label: "Admin", icon: "fa-shield-halved" } };
      return store.marketplaceModes.value.map((m) => meta[m]);
    });
    const activeModeLabel = computed(() => marketplaceModeOptions.value.find((o) => o.key === marketplaceMode.value)?.label || "Workspace");

    const visibleNotifications = computed(() => store.userNotifications(user.value?.id || ""));
    const unreadNotifications = computed(() => store.unreadNotifications(user.value?.id || ""));
    const saveStatus = computed(() => {
      if (store.ui.saveState === "connecting") return { label: store.t("Connecting secure workspace…"), icon: "fa-arrows-rotate fa-spin", tone: "text-sky-600 dark:text-sky-300" };
      if (store.ui.saveState === "saving") return { label: store.t("Saving securely…"), icon: "fa-arrows-rotate fa-spin", tone: "text-amber-600 dark:text-amber-400" };
      if (store.ui.saveState === "error") return { label: store.t("Secure save unavailable"), icon: "fa-triangle-exclamation", tone: "text-rose-600 dark:text-rose-400" };
      if (store.ui.saveState === "demo") return { label: store.t("Local demo · not synced"), icon: "fa-flask", tone: "text-amber-600 dark:text-amber-400" };
      return { label: store.t("Saved to workspace"), icon: "fa-shield-halved", tone: "text-emerald-600 dark:text-emerald-400" };
    });
    const saveStatusTitle = computed(() => store.isDemo.value
      ? store.t("The public demo uses fictional data and never connects to a production workspace.")
      : store.t("Workspace changes are encrypted and saved on the server."));

    const setAccent = (opt) => {
      if (!opt || !accents.some((item) => item.key === opt.key)) return;
      accent.value = opt.key;
      applyAccent(opt);
      preference.write("buyniverse-vue-accent", opt.key);
    };
    const closeOverlays = (kind) => {
      notificationsOpen.value = kind === "notifications" ? !notificationsOpen.value : false;
      accountOpen.value = kind === "account" ? !accountOpen.value : false;
    };
    const openNotification = (n) => { store.markNotificationRead(n); notificationsOpen.value = false; };
    const switchUser = (id) => {
      if (!store.isDemo.value) return;
      store.selectUser(id);
      accountOpen.value = false;
      router.replace("/dashboard");
      store.notice("Demo account switched");
    };
    const switchMarketplaceMode = (mode) => {
      if (!store.setMarketplaceMode(mode)) return;
      accountOpen.value = false;
      router.replace(mode === "supplier" ? "/find-work" : "/dashboard");
      store.notice(mode === "buyer" ? "Buyer workspace active" : mode === "supplier" ? "Supplier workspace active" : "Administration workspace active");
    };
    const switchTenantContext = async ({ companyId, locationId }) => {
      const switched = await store.switchTenantContext(companyId, locationId);
      if (!switched) return;
      accountOpen.value = false;
      router.replace("/dashboard");
      store.notice(store.t("Company context switched"), "fa-building-shield");
    };
    const openPurchasingWorkspace = () => {
      const switched = marketplaceMode.value !== "buyer";
      if (!store.setMarketplaceMode("buyer")) {
        store.notice("Buyer workspace is unavailable for this account", "fa-shield-halved");
        return;
      }
      accountOpen.value = false;
      router.push("/procurement");
      if (switched) store.notice("Buyer workspace active");
    };
    const workspaceShortcutLabel = computed(() => marketplaceMode.value === "admin"
      ? store.t("Open administration control center")
      : store.t("Open purchasing workspace"));
    const openWorkspaceShortcut = () => {
      if (marketplaceMode.value === "admin") {
        router.push("/settings/organizations");
        return;
      }
      openPurchasingWorkspace();
    };

    const toggleNav = () => { if (window.innerWidth < 768) mobileOpen.value = !mobileOpen.value; else collapsed.value = !collapsed.value; };
    const toggleTheme = () => {
      dark.value = !dark.value;
      document.documentElement.classList.toggle("dark", dark.value);
      preference.write("buyniverse-vue-theme", dark.value ? "dark" : "light");
    };

    let lastActivity = Date.now(), sessionTimer = 0;
    const touchSession = () => { if (!store.ui.locked) lastActivity = Date.now(); };
    const keyHandler = (e) => {
      touchSession();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k" && store.currentUser.value) { e.preventDefault(); commandOpen.value = !commandOpen.value; }
      else if (e.key === "Escape") commandOpen.value = false;
    };
    const lockNow = () => { accountOpen.value = false; commandOpen.value = false; store.lockSession("Manual privacy lock"); };
    const resumeSession = () => { store.unlockSession(); touchSession(); };

    onMounted(() => {
      stopTranslator = window.BuyniverseI18n.install(document.body);
      setLocale(locale.value);
      window.addEventListener("pointerdown", touchSession, { passive: true });
      window.addEventListener("keydown", keyHandler);
      sessionTimer = window.setInterval(() => {
        if (!store.ui.locked && Date.now() - lastActivity >= 15 * 60 * 1000) store.lockSession("15 minutes of inactivity");
      }, 30000);
      nextTick(() => window.requestAnimationFrame(() => window.dispatchEvent(new Event("buyniverse:app-shell-ready"))));
    });

    onBeforeUnmount(() => {
      window.removeEventListener("pointerdown", touchSession);
      window.removeEventListener("keydown", keyHandler);
      window.clearInterval(sessionTimer);
      stopTranslator();
    });

    document.documentElement.classList.toggle("dark", dark.value);

    const menu = computed(() => {
      const localize = (sections) => sections.map((section) => ({
        ...section,
        title: store.t(section.title),
        items: section.items.map((item) => ({ ...item, label: store.t(item.label) })),
      }));
      const core = { title: "", items: [{ to: "/dashboard", icon: "fa-solid fa-tachometer-alt", label: "Dashboard" }] };
      const purchases = { to: "/procurement", icon: "fa-solid fa-cart-shopping", label: "Purchases" };
      if (marketplaceMode.value === "buyer") return localize([
        core,
        { title: "Mercado & Proyectos", items: [{ to: "/projects", icon: "fa-solid fa-folder", label: "Projects" }, purchases, { to: "/suppliers", icon: "fa-solid fa-building-circle-check", label: "Suppliers" }, { to: "/products", icon: "fa-solid fa-boxes-stacked", label: "Products" }, { to: "/expenses", icon: "fa-solid fa-money-bill-wave", label: "Expenses" }] },
        { title: "Finanzas & Pagos", items: [{ to: "/invoices", icon: "fa-solid fa-file-invoice-dollar", label: "Invoices" }, { to: "/payments", icon: "fa-solid fa-credit-card", label: "Payments" }] },
        { title: "Descubrir", items: [{ to: "/find-talent", icon: "fa-solid fa-users", label: "Find Talent" }, { to: "/browse-services", icon: "fa-solid fa-store", label: "Browse Services" }, { to: "/messages", icon: "fa-solid fa-comments", label: "Messages" }] },
      ]);
      if (marketplaceMode.value === "admin") return localize([
        core,
        { title: "Identidad & Control", items: [{ to: "/settings/organizations", icon: "fa-solid fa-building-shield", label: "Companies & access" }, { to: "/admin/issuers", icon: "fa-solid fa-file-invoice-dollar", label: "Fiscal issuers" }, { to: "/procurement/governance", icon: "fa-solid fa-scale-balanced", label: "Policies & audit" }] },
        { title: "Supervisión Operativa", items: [{ to: "/procurement/cockpit", icon: "fa-solid fa-binoculars", label: "Procurement oversight" }, { to: "/projects", icon: "fa-solid fa-folder-tree", label: "Project oversight" }, { to: "/invoices", icon: "fa-solid fa-receipt", label: "Invoice oversight" }] },
      ]);
      return localize([
        core,
        { title: "Entregas & Subastas", items: [{ to: "/projects", icon: "fa-solid fa-folder", label: "Projects" }, { to: "/procurement/auction", icon: "fa-solid fa-gavel", label: "Live Offers" }] },
        { title: "Buscar Oportunidades", items: [{ to: "/find-work", icon: "fa-solid fa-briefcase", label: "Find Work" }, { to: "/saved-jobs", icon: "fa-solid fa-bookmark", label: "Saved Jobs" }] },
        { title: "Ventas & Clientes", items: [{ to: "/leads", icon: "fa-solid fa-bullseye", label: "Leads" }, { to: "/clients", icon: "fa-solid fa-user-tie", label: "Clients" }, { to: "/estimates", icon: "fa-solid fa-file-invoice", label: "Estimates" }, { to: "/invoices", icon: "fa-solid fa-file-invoice-dollar", label: "Invoices" }, { to: "/payments", icon: "fa-solid fa-credit-card", label: "Payments" }, { to: "/messages", icon: "fa-solid fa-comments", label: "Messages" }] },
      ]);
    });

    return {
      store, ui: store.ui, user, marketplaceMode, marketplaceModeOptions, activeModeLabel, tenantContext, switchMarketplaceMode, switchTenantContext, openPurchasingWorkspace, openWorkspaceShortcut, workspaceShortcutLabel,
      route, isLanding, isOnboarding, locale, setLocale, collapsed, mobileOpen, toggleNav, dark, toggleTheme, menu, notificationsOpen,
      accountOpen, commandOpen, authOpen, authMode, openAuth, launchDemo, accents, accent, currentAccent, setAccent, closeOverlays, visibleNotifications, saveStatus, saveStatusTitle,
      unreadNotifications, openNotification, switchUser, lockNow, resumeSession,
      fullWidth: computed(() => isLanding.value || route.path === "/find-work" || route.path.includes("/contest") || route.path.startsWith("/post-job/") || route.path.startsWith("/procurement")),
    };
  },
};
</script>
