<template>
  <div class="premium-shell relative flex h-screen overflow-hidden bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
    <CommandPalette :open="commandOpen" @close="commandOpen = false" />
    <AppModals :ui="ui" @resume-session="resumeSession" @resolve-confirm="store.resolveConfirm" />

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
      />

      <main class="relative z-10 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div class="mx-auto" :class="fullWidth ? 'max-w-none' : 'max-w-7xl'">
          <Breadcrumbs />
          <RouterView />
        </div>
      </main>
    </div>

    <!-- Toast stack -->
    <div class="pointer-events-none fixed bottom-4 right-4 z-80 flex flex-col gap-2">
      <TransitionGroup name="toast">
        <div
          v-for="toast in store.toasts.value"
          :key="toast.id"
          class="pointer-events-auto flex items-center gap-3 rounded-2xl bg-slate-950 px-4 py-3 text-xs font-semibold text-white shadow-elevated"
        >
          <i class="fa-solid text-brand" :class="toast.icon || 'fa-circle-check'"></i>
          <span>{{ toast.text }}</span>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>
<script>
const { inject, computed, ref, onMounted, onBeforeUnmount } = Vue;
const { useRoute, useRouter } = VueRouter;
const load = (p) => Vue.defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(p, window.sfcOptions));
const CommandPalette = load("./app/components/CommandPalette.vue?v=2");
const Breadcrumbs = load("./app/components/Breadcrumbs.vue?v=3");
const AppModals = load("./app/components/layout/AppModals.vue?v=1");
const AppSidebar = load("./app/components/layout/AppSidebar.vue?v=1");
const AppHeader = load("./app/components/layout/AppHeader.vue?v=1");

export default {
  components: { Breadcrumbs, CommandPalette, AppModals, AppSidebar, AppHeader },
  setup() {
    const store = inject("store"), route = useRoute(), router = useRouter();
    const collapsed = ref(false), mobileOpen = ref(false);
    const dark = ref(localStorage.getItem("buyniverse-vue-theme") !== "light");
    const notificationsOpen = ref(false), accountOpen = ref(false), commandOpen = ref(false);
    const locale = store.locale;
    let stopTranslator = () => {};

    const setLocale = (code) => {
      store.setLocale(code);
      document.title = locale.value === "es" ? "Buyniverse · Operaciones de trabajo y compras" : "Buyniverse · Work and procurement operations";
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

    const savedAccent = localStorage.getItem("buyniverse-vue-accent") || "red";
    const accent = ref(accents.some((x) => x.key === savedAccent) ? savedAccent : "red");
    applyAccent(accents.find((x) => x.key === accent.value));

    const user = store.currentUser, marketplaceMode = store.marketplaceMode;
    const marketplaceModeOptions = computed(() => {
      const meta = { buyer: { key: "buyer", label: "Buy", icon: "fa-cart-shopping" }, supplier: { key: "supplier", label: "Sell", icon: "fa-store" }, admin: { key: "admin", label: "Admin", icon: "fa-shield-halved" } };
      return store.marketplaceModes.value.map((m) => meta[m]);
    });
    const activeModeLabel = computed(() => marketplaceModeOptions.value.find((o) => o.key === marketplaceMode.value)?.label || "Workspace");

    const visibleNotifications = computed(() => store.userNotifications(user.value.id));
    const unreadNotifications = computed(() => store.unreadNotifications(user.value.id));

    const setAccent = (opt) => { accent.value = opt.key; applyAccent(opt); localStorage.setItem("buyniverse-vue-accent", opt.key); };
    const closeOverlays = (kind) => {
      notificationsOpen.value = kind === "notifications" ? !notificationsOpen.value : false;
      accountOpen.value = kind === "account" ? !accountOpen.value : false;
    };
    const openNotification = (n) => { store.markNotificationRead(n); notificationsOpen.value = false; };
    const switchUser = (id) => { store.selectUser(id); accountOpen.value = false; router.replace("/dashboard"); store.notice("Demo account switched"); };
    const switchMarketplaceMode = (mode) => {
      if (!store.setMarketplaceMode(mode)) return;
      accountOpen.value = false;
      router.replace(mode === "supplier" ? "/" : "/dashboard");
      store.notice(mode === "buyer" ? "Buyer workspace active" : mode === "supplier" ? "Supplier workspace active" : "Administration workspace active");
    };

    const toggleNav = () => { if (window.innerWidth < 768) mobileOpen.value = !mobileOpen.value; else collapsed.value = !collapsed.value; };
    const toggleTheme = () => {
      dark.value = !dark.value;
      document.documentElement.classList.toggle("dark", dark.value);
      localStorage.setItem("buyniverse-vue-theme", dark.value ? "dark" : "light");
    };

    let lastActivity = Date.now(), sessionTimer = 0;
    const touchSession = () => { if (!store.ui.locked) lastActivity = Date.now(); };
    const keyHandler = (e) => {
      touchSession();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); commandOpen.value = !commandOpen.value; }
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
    });

    onBeforeUnmount(() => {
      window.removeEventListener("pointerdown", touchSession);
      window.removeEventListener("keydown", keyHandler);
      window.clearInterval(sessionTimer);
      stopTranslator();
    });

    document.documentElement.classList.toggle("dark", dark.value);

    const menu = computed(() => {
      const core = { title: "", items: [{ to: "/dashboard", icon: "fa-solid fa-tachometer-alt", label: "Dashboard" }] };
      const purchases = { to: "/procurement", icon: "fa-solid fa-cart-shopping", label: "Purchases" };
      if (marketplaceMode.value === "buyer") return [
        core,
        { title: "", items: [{ to: "/projects", icon: "fa-solid fa-folder", label: "Projects" }, purchases, { to: "/suppliers", icon: "fa-solid fa-building-circle-check", label: "Suppliers" }, { to: "/products", icon: "fa-solid fa-boxes-stacked", label: "Products" }, { to: "/expenses", icon: "fa-solid fa-money-bill-wave", label: "Expenses" }] },
        { title: "Payables", items: [{ to: "/invoices", icon: "fa-solid fa-file-invoice-dollar", label: "Invoices" }, { to: "/payments", icon: "fa-solid fa-credit-card", label: "Payments" }] },
        { title: "Discover", items: [{ to: "/find-talent", icon: "fa-solid fa-users", label: "Find Talent" }, { to: "/browse-services", icon: "fa-solid fa-store", label: "Browse Services" }, { to: "/messages", icon: "fa-solid fa-comments", label: "Messages" }] },
      ];
      if (marketplaceMode.value === "admin") return [
        core,
        { title: "Management", items: [{ to: "/projects", icon: "fa-solid fa-folder", label: "Projects" }, purchases, { to: "/clients", icon: "fa-solid fa-user-tie", label: "Clients" }, { to: "/suppliers", icon: "fa-solid fa-building-circle-check", label: "Suppliers" }, { to: "/invoices", icon: "fa-solid fa-file-invoice-dollar", label: "Invoices" }] },
        { title: "Settings", items: [{ to: "/admin/issuers", icon: "fa-solid fa-building-columns", label: "Issuers" }] },
      ];
      return [
        core,
        { title: "Delivery", items: [{ to: "/projects", icon: "fa-solid fa-folder", label: "Projects" }, { to: "/procurement/auction", icon: "fa-solid fa-gavel", label: "Live Offers" }] },
        { title: "Find work", items: [{ to: "/", icon: "fa-solid fa-briefcase", label: "Find Work" }, { to: "/saved-jobs", icon: "fa-solid fa-bookmark", label: "Saved Jobs" }] },
        { title: "Sales", items: [{ to: "/leads", icon: "fa-solid fa-bullseye", label: "Leads" }, { to: "/clients", icon: "fa-solid fa-user-tie", label: "Clients" }, { to: "/estimates", icon: "fa-solid fa-file-invoice", label: "Estimates" }, { to: "/invoices", icon: "fa-solid fa-file-invoice-dollar", label: "Invoices" }, { to: "/payments", icon: "fa-solid fa-credit-card", label: "Payments" }, { to: "/messages", icon: "fa-solid fa-comments", label: "Messages" }] },
      ];
    });

    return {
      store, ui: store.ui, user, marketplaceMode, marketplaceModeOptions, activeModeLabel, switchMarketplaceMode,
      route, locale, setLocale, collapsed, mobileOpen, toggleNav, dark, toggleTheme, menu, notificationsOpen,
      accountOpen, commandOpen, accents, accent, setAccent, closeOverlays, visibleNotifications,
      unreadNotifications, openNotification, switchUser, lockNow, resumeSession,
      fullWidth: computed(() => route.path.includes("/contest") || route.path.startsWith("/post-job/") || route.path.startsWith("/procurement")),
    };
  },
};
</script>
