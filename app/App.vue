<template>
  <div class="premium-shell relative min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
    <a href="#main-content" class="skip-link">{{ store.t("Skip to workspace content") }}</a>

    <!-- Global Command Palette & Modals -->
    <CommandPalette :open="commandOpen" @close="commandOpen = false" />
    <AppModals :ui="ui" :locale="store.locale" @resume-session="resumeSession" @resolve-confirm="store.resolveConfirm" />
    <AuthModal :open="authOpen" :initial-mode="authMode" :error="authError" @close="closeAuth" />
    <button v-if="showHelp" type="button" class="bn-help" :aria-label="store.t('Help and support')" @click="openHelp"><i class="fa-solid fa-life-ring"></i><span>{{ store.t("Help") }}</span></button>

    <!-- 1. FULL-BLEED PUBLIC LANDING PAGE LAYOUT -->
    <div v-if="isLanding" class="flex-1 flex flex-col min-h-screen">
      <BnNavbar
        :locale="locale"
        :dark="dark"
        @set-locale="setLocale"
        @toggle-theme="toggleTheme"
        @open-auth="openAuth"
        @launch-demo="launchDemo"
      />
      <!-- Marketplace experience pages lay out their own full-bleed sections;
           the remaining public pages keep the contained reading column. -->
      <main id="main-content" :class="route.meta.experience ? 'flex-1 w-full' : 'flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12'" tabindex="-1">
        <RouterView :key="route.path" />
      </main>
      <BnFooter />
    </div>

    <!-- 2. SOCIAL ONBOARDING DEDICATED SHELL -->
    <div v-else-if="isOnboarding" class="min-h-screen">
      <RouterView />
    </div>

    <!-- 3. AUTHENTICATED WORKSPACE SHELL: ambient light, a quiet sidebar, one prompt, one page -->
    <div v-else class="ws" :class="{ 'is-collapsed': collapsed }" :style="{ '--ambient': ambient }">
      <div class="ws-ambient" aria-hidden="true"></div>
      <button v-if="mobileOpen" type="button" class="ws-scrim" :aria-label="store.t('Close navigation')" @click="mobileOpen = false"></button>

      <AppSidebar
        :menu="menu"
        :collapsed="collapsed"
        :mobile-open="mobileOpen"
        @close-mobile="mobileOpen = false"
        @toggle-collapse="collapsed = !collapsed"
      />

      <div class="ws-body">
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
          @open-auth="openAuth"
        />

        <main id="main-content" class="ws-main" tabindex="-1">
          <div class="ws-wrap" :class="{ 'ws-wrap--wide': fullWidth }">
            <Breadcrumbs />
            <SetupBanner />
            <RouterView v-slot="{ Component }">
              <Transition name="page" mode="out-in">
                <component :is="Component" :key="route.path" />
              </Transition>
            </RouterView>
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
const CommandPalette = load("./app/components/CommandPalette.vue?v=6");
const Breadcrumbs = load("./app/components/Breadcrumbs.vue?v=7");
const AppModals = load("./app/components/layout/AppModals.vue?v=4");
const AppSidebar = load("./app/components/layout/AppSidebar.vue?v=10");
const AppHeader = load("./app/components/layout/AppHeader.vue?v=7");
const BnNavbar = load("./app/experience/BnNavbar.vue?v=9");
const BnFooter = load("./app/experience/BnFooter.vue?v=4");
const AuthModal = load("./app/components/AuthModal.vue?v=11");
const SetupBanner = load("./app/components/SetupBanner.vue?v=1");

export default {
  components: { Breadcrumbs, SetupBanner, CommandPalette, AppModals, AppSidebar, AppHeader, BnNavbar, BnFooter, AuthModal },
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
    const authOpen = ref(["login", "register"].includes(route.query.auth) || Boolean(route.query.login_error));
    // The federated callback returns here with ?login_error=cancelled|identity.
    const authError = computed(() => (typeof route.query.login_error === "string" ? route.query.login_error : ""));
    watch(authError, (error) => { if (error) { authMode.value = "login"; authOpen.value = true; } });
    const closeAuth = () => {
      authOpen.value = false;
      if (route.query.login_error || route.query.auth) {
        const query = { ...route.query }; delete query.login_error; delete query.auth;
        router.replace({ query });
      }
    };
    const locale = store.locale;
    let stopTranslator = () => {};

    watch(() => store.ui.locked, (locked) => {
      if (!locked) return;
      notificationsOpen.value = false;
      accountOpen.value = false;
      commandOpen.value = false;
      authOpen.value = false;
    });

    const isLanding = computed(() => !route.meta.onboarding && (!store.currentUser.value || (store.isDemo.value && route.path === "/")));
    // A real session has no use for the marketing home: it opens the workspace. The router
    // guard handles direct visits; this covers a session that resolves (or signs in) while on "/".
    watch([() => store.currentUser.value, () => route.path], ([signedIn, path]) => {
      if (signedIn && path === "/" && !store.isDemo.value && !route.query.auth) router.replace(store.isSupplier.value ? "/find-work" : "/dashboard");
    }, { immediate: true });
    const isOnboarding = computed(() => route.meta.onboarding === true);
    // Help is one click away everywhere except the support centre and onboarding.
    const showHelp = computed(() => route.path !== "/soporte" && !isOnboarding.value && !store.ui.locked);
    const openHelp = () => router.push({ path: "/soporte", query: { from: route.fullPath } });

    const openAuth = (mode = "login") => {
      authMode.value = mode;
      authOpen.value = true;
    };
    const launchDemo = () => store.enterDemo();
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
      { key: "cosmos", label: "Cosmos", accent: "#3f6af2", deep: "#2f55d4", soft: "#eef3ff", pale: "#dbe6ff" },
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

    const savedAccent = preference.read("buyniverse-vue-accent", "cosmos");
    const accent = ref(accents.some((x) => x.key === savedAccent) ? savedAccent : "cosmos");
    applyAccent(accents.find((x) => x.key === accent.value));
    const currentAccent = computed(() => accents.find((x) => x.key === accent.value) || accents[0]);

    // The colour of the five stages. The whole workspace glows with the one you are working in.
    const STAGE_COLORS = ["#36e3c0", "#4d9dff", "#a37bff", "#ffb44d", "#ff6b8b"];
    const ambient = computed(() => {
      if (store.ui.ambient) return store.ui.ambient;
      const path = route.path, tab = String(route.query.tab || "");
      if (path.startsWith("/procurement/queue") || path.startsWith("/necesito")) return STAGE_COLORS[0];
      if (path.startsWith("/procurement/auction")) return STAGE_COLORS[1];
      if (path.startsWith("/procurement/sourcing")) return ["comparison", "award"].includes(tab) ? STAGE_COLORS[2] : STAGE_COLORS[1];
      if (path.startsWith("/procurement/execution")) return tab === "matching" ? STAGE_COLORS[4] : STAGE_COLORS[3];
      if (path.startsWith("/invoices") || path.startsWith("/payments")) return STAGE_COLORS[4];
      return currentAccent.value.accent;
    });

    const user = store.currentUser, marketplaceMode = store.marketplaceMode, tenantContext = store.tenantContext;
    const marketplaceModeOptions = computed(() => {
      const meta = { buyer: { key: "buyer", label: "Buy", icon: "fa-cart-shopping" }, supplier: { key: "supplier", label: "Sell", icon: "fa-store" }, admin: { key: "admin", label: "Admin", icon: "fa-shield-halved" } };
      return store.marketplaceModes.value.map((m) => meta[m]);
    });
    const activeModeLabel = computed(() => marketplaceModeOptions.value.find((o) => o.key === marketplaceMode.value)?.label || "Workspace");

    const visibleNotifications = computed(() => store.userNotifications(user.value?.id || ""));
    const unreadNotifications = computed(() => store.unreadNotifications(user.value?.id || ""));
    const saveStatus = computed(() => {
      if (store.ui.saveState === "connecting") return { state: "busy", short: store.t("Connecting…") };
      if (store.ui.saveState === "saving") return { state: "busy", short: store.t("Saving…") };
      if (store.ui.saveState === "error") return { state: "error", short: store.t("Secure save unavailable") };
      if (store.ui.saveState === "demo") return { state: "demo", short: store.t("Demo") };
      return { state: "saved", short: store.t("Saved to workspace") };
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
      const localize = (groups) => groups.map((group) => ({
        ...group,
        title: store.t(group.title),
        items: group.items.map((item) => ({ ...item, label: store.t(item.label) })),
      }));
      const item = (to, icon, label, extra = {}) => ({ to, icon: `fa-solid ${icon}`, label, ...extra });
      if (marketplaceMode.value === "buyer") return localize([
        { title: "Needs", items: [item("/dashboard", "fa-bolt", "My needs", { match: ["/dashboard", "/procurement", "/necesito"] })] },
        { title: "Market", items: [item("/suppliers", "fa-building-circle-check", "Suppliers"), item("/products", "fa-boxes-stacked", "Products"), item("/find-talent", "fa-users", "Talent & services", { match: ["/find-talent", "/browse-services"] })] },
        { title: "Work", items: [item("/projects", "fa-folder", "Projects"), item("/messages", "fa-comments", "Messages")] },
        { title: "Money", items: [item("/invoices", "fa-file-invoice-dollar", "Invoices"), item("/payments", "fa-credit-card", "Payments"), item("/expenses", "fa-money-bill-wave", "Expenses")] },
      ]);
      if (marketplaceMode.value === "admin") return localize([
        { title: "Home", items: [item("/dashboard", "fa-gauge", "Dashboard")] },
        { title: "Identity & Control", items: [item("/settings/organizations", "fa-building-shield", "Companies & access"), item("/admin/issuers", "fa-file-invoice-dollar", "Fiscal issuers"), item("/procurement/governance", "fa-scale-balanced", "Policies & audit")] },
        { title: "Oversight", items: [item("/procurement/cockpit", "fa-binoculars", "Procurement oversight"), item("/projects", "fa-folder-tree", "Project oversight"), item("/invoices", "fa-receipt", "Invoice oversight")] },
      ]);
      return localize([
        { title: "Home", items: [item("/dashboard", "fa-gauge", "Dashboard")] },
        { title: "Deliver", items: [item("/projects", "fa-folder", "Projects"), item("/procurement/auction", "fa-gavel", "Live Offers")] },
        { title: "Find", items: [item("/find-work", "fa-briefcase", "Find Work"), item("/saved-jobs", "fa-bookmark", "Saved Jobs")] },
        { title: "Sell", items: [item("/leads", "fa-bullseye", "Leads"), item("/clients", "fa-user-tie", "Clients"), item("/estimates", "fa-file-invoice", "Estimates"), item("/invoices", "fa-file-invoice-dollar", "Invoices"), item("/payments", "fa-credit-card", "Payments"), item("/messages", "fa-comments", "Messages")] },
      ]);
    });

    return {
      store, ui: store.ui, user, marketplaceMode, marketplaceModeOptions, activeModeLabel, tenantContext, switchMarketplaceMode, switchTenantContext, openPurchasingWorkspace, openWorkspaceShortcut, workspaceShortcutLabel,
      route, isLanding, isOnboarding, locale, setLocale, collapsed, mobileOpen, toggleNav, dark, toggleTheme, menu, notificationsOpen,
      accountOpen, commandOpen, authOpen, authMode, authError, closeAuth, openAuth, showHelp, openHelp, launchDemo, ambient, accents, accent, currentAccent, setAccent, closeOverlays, visibleNotifications, saveStatus, saveStatusTitle,
      unreadNotifications, openNotification, switchUser, lockNow, resumeSession,
      fullWidth: computed(() => isLanding.value || route.path === "/find-work" || route.path.includes("/contest") || route.path.startsWith("/post-job/") || route.path.startsWith("/procurement")),
    };
  },
};
</script>
