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
      <header class="z-20 flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80 sm:px-6 lg:px-8">
        <div class="flex items-center gap-3">
          <button class="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 md:hidden" aria-label="Toggle navigation" @click="toggleNav">
            <i class="fa-solid fa-bars text-xl"></i>
          </button>
          <button class="grid h-9 w-9 place-items-center rounded-xl border border-slate-200/80 bg-slate-50 text-slate-500 md:hidden dark:border-slate-800 dark:bg-slate-800" aria-label="Quick access" @click="commandOpen = true">
            <i class="fa-solid fa-magnifying-glass text-xs"></i>
          </button>
          <button class="hidden items-center gap-2.5 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-900/90 px-3.5 py-2 text-xs font-semibold text-slate-500 hover:border-brand hover:text-brand md:flex shadow-xs transition" @click="commandOpen = true">
            <i class="fa-solid fa-magnifying-glass text-xs"></i>
            <span>Quick access</span>
            <kbd class="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-mono font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">Ctrl K</kbd>
          </button>
          <span class="hidden items-center gap-2 rounded-xl border border-slate-200/90 bg-slate-100/70 px-3 py-1.5 text-[11px] font-700 text-slate-600 lg:flex dark:border-slate-700/80 dark:bg-slate-800/70 dark:text-slate-300" title="Active company workspace">
            <i class="fa-solid text-brand text-xs" :class="marketplaceMode === 'buyer' ? 'fa-cart-shopping' : marketplaceMode === 'supplier' ? 'fa-store' : 'fa-shield-halved'"></i>
            {{ activeModeLabel }}
          </span>
        </div>

        <div class="flex items-center gap-3 sm:gap-4">
          <span class="hidden items-center gap-1.5 text-[11px] font-medium lg:flex" :class="ui.saveState === 'error' ? 'text-rose-500' : 'text-slate-400'" :title="ui.lastSavedAt ? `Last local save ${ui.lastSavedAt}` : 'Local save status'">
            <i class="fa-solid text-xs" :class="ui.saveState === 'saving' ? 'fa-circle-notch animate-spin' : ui.saveState === 'error' ? 'fa-triangle-exclamation' : 'fa-cloud-arrow-up'"></i>
            {{ ui.saveState === "saving" ? "Saving…" : ui.saveState === "error" ? "Save failed" : "Saved locally" }}
          </span>

          <RouterLink v-if="marketplaceMode === 'buyer'" to="/post-job/new" class="btn-brand hidden text-xs py-2 px-3.5 sm:inline-flex">
            <i class="fa-solid fa-plus text-xs mr-1.5"></i>Post a Job
          </RouterLink>
          <RouterLink v-else-if="marketplaceMode === 'supplier'" to="/" class="btn-brand hidden text-xs py-2 px-3.5 sm:inline-flex">
            <i class="fa-solid fa-briefcase text-xs mr-1.5"></i>Find Work
          </RouterLink>

          <!-- Notifications -->
          <div class="relative">
            <button
              class="relative hidden h-9 w-9 place-items-center rounded-xl border border-slate-200/80 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-400 sm:grid shadow-xs transition"
              title="Notifications"
              aria-label="Notifications"
              :aria-expanded="notificationsOpen"
              @click="closeOverlays('notifications')"
            >
              <i class="fa-regular fa-bell text-sm"></i>
              <span v-if="unreadNotifications.length" class="absolute -right-1 -top-1 grid min-w-4 h-4 place-items-center rounded-full bg-brand px-1 text-[9px] font-bold text-white shadow-soft">
                {{ unreadNotifications.length }}
              </span>
            </button>
            <div v-if="notificationsOpen" class="absolute right-0 top-11 z-50 w-90 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-elevated dark:border-slate-700 dark:bg-slate-900">
              <div class="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
                <div>
                  <h2 class="font-head font-bold text-sm">Notifications</h2>
                  <p class="mt-0.5 text-xs text-slate-500">{{ unreadNotifications.length ? `${unreadNotifications.length} unread` : "You are all caught up" }}</p>
                </div>
                <button v-if="unreadNotifications.length" class="text-xs font-semibold text-brand hover:underline" @click="store.markAllNotificationsRead(user.id)">
                  Mark all read
                </button>
              </div>
              <div class="max-h-96 overflow-y-auto">
                <RouterLink
                  v-for="notification in visibleNotifications"
                  :key="notification.id"
                  :to="notification.link"
                  class="flex gap-3 border-b border-slate-100 p-4 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                  :class="!notification.isRead ? 'bg-brand-50/40 dark:bg-brand/10' : ''"
                  @click="openNotification(notification)"
                >
                  <span class="grid h-9 w-9 flex-none place-items-center rounded-xl bg-brand-50 text-brand dark:bg-brand/20">
                    <i class="fa-solid text-sm" :class="notification.icon"></i>
                  </span>
                  <span class="min-w-0">
                    <b class="block text-xs font-bold text-slate-900 dark:text-slate-100">{{ notification.title }}</b>
                    <span class="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">{{ notification.text }}</span>
                    <time class="mt-1 block text-[10px] text-slate-400">{{ store.date(notification.at) }}</time>
                  </span>
                </RouterLink>
                <div v-if="!visibleNotifications.length" class="p-8 text-center text-sm text-slate-500">
                  <i class="fa-regular fa-bell-slash text-2xl text-slate-300 dark:text-slate-600"></i>
                  <p class="mt-2 text-xs">No notifications yet.</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Account Menu -->
          <div class="relative">
            <button
              class="grid h-9 w-9 place-items-center rounded-xl bg-brand-100 text-xs font-bold text-brand ring-2 ring-transparent hover:ring-brand/30 dark:bg-brand/20 dark:text-brand-200 transition"
              aria-label="Account menu"
              :aria-expanded="accountOpen"
              @click="closeOverlays('account')"
            >
              {{ user.avatar }}
            </button>
            <div v-if="accountOpen" class="absolute right-0 top-11 z-50 max-h-[calc(100vh-5rem)] w-76 overflow-y-auto rounded-2xl border border-slate-200/90 bg-white shadow-elevated dark:border-slate-700 dark:bg-slate-900">
              <div class="border-b border-slate-100 p-4 dark:border-slate-800">
                <p class="font-head font-bold text-sm">{{ user.name }}</p>
                <p class="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{{ user.email }}</p>
              </div>
              <div class="py-1">
                <RouterLink :to="`/profile/${user.id}`" class="flex items-center px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 transition" @click="accountOpen = false">
                  <i class="fa-regular fa-user mr-2.5 w-4 text-slate-400"></i>View profile
                </RouterLink>
                <RouterLink to="/profile/billing" class="flex items-center px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 transition" @click="accountOpen = false">
                  <i class="fa-regular fa-credit-card mr-2.5 w-4 text-slate-400"></i>Billing & folios
                </RouterLink>
                <button class="flex w-full items-center px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 transition" @click="lockNow">
                  <i class="fa-solid fa-lock mr-2.5 w-4 text-slate-400"></i>Lock workspace
                </button>
              </div>

              <!-- Company Workspace Mode -->
              <section v-if="marketplaceModeOptions.length > 1" class="border-t border-slate-100 p-3.5 dark:border-slate-800" aria-labelledby="company-workspace-title">
                <h2 id="company-workspace-title" class="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Company workspace</h2>
                <div class="grid gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/60" :class="marketplaceModeOptions.length > 2 ? 'grid-cols-3' : 'grid-cols-2'" role="group" aria-label="Company operating workspace">
                  <button
                    v-for="option in marketplaceModeOptions"
                    :key="option.key"
                    class="flex h-8 items-center justify-center gap-1.5 rounded-lg px-2 text-[10px] font-800 transition"
                    :class="marketplaceMode === option.key ? 'bg-white text-brand shadow-xs dark:bg-slate-700' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
                    :aria-pressed="marketplaceMode === option.key"
                    @click="switchMarketplaceMode(option.key)"
                  >
                    <i class="fa-solid text-xs" :class="option.icon"></i>{{ option.label }}
                  </button>
                </div>
                <p class="mt-2 text-[10px] leading-4 text-slate-400">One company identity; navigation and permissions follow the active workspace.</p>
              </section>

              <!-- Preferences -->
              <section class="border-t border-slate-100 p-3.5 dark:border-slate-800" aria-labelledby="user-preferences-title">
                <h2 id="user-preferences-title" class="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Preferences</h2>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">Language</span>
                  <div class="flex rounded-lg bg-slate-100 p-0.5 text-[10px] font-800 dark:bg-slate-800/60" role="group" aria-label="Language">
                    <button
                      v-for="code in ['en', 'es']"
                      :key="code"
                      class="h-6 rounded-md px-2.5 transition font-bold"
                      :class="locale === code ? 'bg-white text-brand shadow-xs dark:bg-slate-700' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
                      :aria-pressed="locale === code"
                      :title="code === 'en' ? 'Switch to English' : 'Switch to Spanish'"
                      @click="setLocale(code)"
                    >
                      {{ code.toUpperCase() }}
                    </button>
                  </div>
                </div>
                <div class="mt-3 flex items-center justify-between gap-3">
                  <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">Theme</span>
                  <button class="flex items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:text-brand dark:bg-slate-800/60 dark:text-slate-300 transition" :aria-label="dark ? 'Switch to light mode' : 'Switch to dark mode'" @click="toggleTheme">
                    <i class="fa-solid" :class="dark ? 'fa-moon' : 'fa-sun'"></i>
                    {{ dark ? "Dark mode" : "Light mode" }}
                  </button>
                </div>
                <div class="mt-3">
                  <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">Accent</span>
                  <div class="mt-2 flex items-center justify-between gap-1">
                    <button
                      v-for="option in accents"
                      :key="option.key"
                      class="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-slate-100 dark:hover:bg-slate-800"
                      :aria-label="`Use ${option.label} accent`"
                      :aria-pressed="accent === option.key"
                      :title="option.label"
                      @click="setAccent(option)"
                    >
                      <span class="h-4 w-4 rounded-full ring-2 ring-offset-2 dark:ring-offset-slate-900" :class="accent === option.key ? 'ring-slate-500' : 'ring-transparent'" :style="{ backgroundColor: option.accent }"></span>
                    </button>
                  </div>
                </div>
              </section>

              <!-- Demo Account Selector -->
              <div class="border-t border-slate-100 p-3.5 dark:border-slate-800">
                <label class="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Demo account</label>
                <select class="field py-2 text-xs" :value="store.state.currentUserId" @change="switchUser($event.target.value)">
                  <option v-for="person in store.state.users" :key="person.id" :value="person.id">
                    {{ person.name }} · {{ person.type }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main class="relative z-10 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div class="mx-auto" :class="fullWidth ? 'max-w-none' : 'max-w-7xl'">
          <Breadcrumbs />
          <RouterView :key="route.path" />
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

export default {
  components: { Breadcrumbs, CommandPalette, AppModals, AppSidebar },
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
