<template>
  <section class="space-y-6">
    <header class="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
      <div class="space-y-1">
        <p class="premium-kicker text-[11px] font-bold uppercase tracking-widest text-brand">
          {{ store.t("Dashboard") }}
        </p>
        <h1 class="font-head text-2xl sm:text-3xl font-800 tracking-tight text-slate-900 dark:text-white">
          {{ store.t(titles[section]) }}
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400">{{ store.t(copies[section]) }}</p>
      </div>
      <RouterLink
        v-if="store.isBuyer.value"
        class="btn-brand text-xs sm:text-sm py-2.5 px-5 font-bold shadow-sm inline-flex items-center"
        to="/post-job/new"
        ><i class="fa-solid fa-plus mr-2"></i>{{ store.t("Post a job") }}</RouterLink
      >
      <RouterLink
        v-else-if="store.isSupplier.value"
        class="btn-brand text-xs sm:text-sm py-2.5 px-5 font-bold shadow-sm inline-flex items-center"
        to="/find-work"
        ><i class="fa-solid fa-briefcase mr-2"></i>{{ store.t("Find work") }}</RouterLink
      >
    </header>
    <nav class="flex gap-1.5 overflow-x-auto p-1.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 rounded-2xl">
      <RouterLink
        v-for="x in tabs"
        :key="x.key"
        :to="x.to"
        class="whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold transition-all"
        :class="section === x.key ? 'bg-white text-brand shadow-sm dark:bg-slate-900 dark:text-brand-300' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'"
        >{{ store.t(x.label) }}</RouterLink
      >
    </nav>
    <template v-if="section === 'overview'">
      <!-- 4 Metric Cards Row -->
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article
          v-for="card in cards"
          :key="card.label"
          class="premium-card rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/80"
        >
          <div class="flex items-center justify-between">
            <p class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{{ store.t(card.label) }}</p>
            <span class="grid h-8 w-8 place-items-center rounded-xl bg-brand-50 text-brand dark:bg-brand/15 text-xs">
              <i class="fa-solid" :class="card.icon || 'fa-chart-simple'"></i>
            </span>
          </div>
          <p class="font-head mt-3 text-2xl sm:text-3xl font-800 tracking-tight text-slate-900 dark:text-white">{{ card.value }}</p>
          <p class="mt-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
            <span class="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            {{ store.t(card.note) }}
          </p>
        </article>
      </div>

      <MarketplaceValueHub />

      <!-- Local demo-state summary and reset controls -->
      <AdminDatabaseCard v-if="store.isDemo.value && store.isAdmin.value" />

      <!-- Recent Workspaces -->
      <article
        class="panel grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center rounded-2xl border border-slate-200/80 dark:border-slate-800/80"
      >
        <div>
          <div class="flex items-center justify-between gap-3">
            <div>
              <p
                class="premium-kicker text-[10px] font-800 uppercase tracking-wider text-brand"
              >
                {{ store.t("Continue working") }}
              </p>
              <h2 class="font-head mt-0.5 font-800 text-base text-slate-900 dark:text-white">{{ store.t("Recent workspaces") }}</h2>
            </div>
            <span class="text-[10px] font-semibold text-slate-400 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full"
              ><i class="fa-solid fa-shield-halved mr-1 text-emerald-500"></i>15
              {{ store.t("min privacy lock") }}</span
            >
          </div>
          <div v-if="recent.length" class="mt-3.5 flex flex-wrap gap-2">
            <RouterLink
              v-for="item in recent"
              :key="item.path"
              :to="item.path"
              class="rounded-xl border border-slate-200/90 bg-slate-50/70 px-3 py-2 text-xs font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-slate-700/80 dark:bg-slate-800/60 dark:text-slate-200 shadow-xs transition"
              ><i
                class="fa-solid fa-clock-rotate-left mr-2 text-[10px] text-slate-400"
              ></i
              >{{ store.t(item.label) }}</RouterLink
            >
          </div>
          <p v-else class="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {{ store.t("Open a project, invoice or request and it will appear here.") }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2 lg:justify-end">
          <RouterLink
            v-for="action in quickActions"
            :key="action.to"
            :to="action.to"
            class="btn-muted whitespace-nowrap text-xs py-2 px-3.5"
            ><i class="fa-solid mr-1.5 text-xs" :class="action.icon"></i
            >{{ store.t(action.label) }}</RouterLink
          >
        </div>
      </article>
      <div class="grid gap-6 lg:grid-cols-2">
        <article class="panel p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 class="font-head font-800 text-sm tracking-tight text-slate-900 dark:text-white">{{ store.t(store.isBuyer.value ? "Active projects" : "Active contracts") }}</h2>
            <span class="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold text-slate-500">{{ contracts.length }} {{ store.t("active") }}</span>
          </div>
          <div class="mt-4 space-y-2.5">
            <RouterLink
              v-for="x in contracts"
              :key="x.id"
              :to="`/contract/${x.id}`"
              class="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 transition hover:border-slate-200 hover:bg-slate-100/70 dark:border-slate-800 dark:bg-slate-800/50 dark:hover:bg-slate-800"
              ><span class="min-w-0 pr-3"
                ><b class="block truncate text-xs font-bold text-slate-900 dark:text-white">{{ store.job(x.sourceId)?.title }}</b
                ><span class="mt-1 inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  {{ store.t(x.status) }}
                </span></span
              ><b class="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">{{ store.money(x.amount) }}</b></RouterLink
            >
            <p v-if="!contracts.length" class="p-6 text-center text-xs text-slate-400">{{ store.t(store.isBuyer.value ? "No active projects." : "No active contracts.") }}</p>
          </div>
        </article>
        <article class="panel p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 class="font-head font-800 text-sm tracking-tight text-slate-900 dark:text-white">{{ store.t("Recent activity") }}</h2>
            <RouterLink to="/dashboard/transactions" class="text-xs font-semibold text-brand hover:underline">{{ store.t("View all") }}</RouterLink>
          </div>
          <div class="mt-4 space-y-2.5">
            <div
              v-for="x in transactions.slice(0, 5)"
              :key="x.id"
              class="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/30"
            >
              <div class="min-w-0 pr-3">
                <span class="block truncate font-semibold text-slate-800 dark:text-slate-200">{{ x.description }}</span>
                <span class="text-[10px] text-slate-400">{{ store.date(x.date) }}</span>
              </div>
              <b class="font-mono font-bold" :class="x.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'">{{ store.money(x.amount) }}</b>
            </div>
            <p v-if="!transactions.length" class="p-6 text-center text-xs text-slate-400">{{ store.t("No recent activity.") }}</p>
          </div>
        </article>
      </div></template
    >
    <article v-else-if="section === 'timesheets' && store.isSupplier.value" class="panel overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
      <div
        class="grid grid-cols-[8rem_1fr_9rem_5rem] gap-3 bg-slate-50/80 p-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-800"
      >
        <span>{{ store.t("Date") }}</span><span>{{ store.t("Work") }}</span><span>{{ store.t("Project") }}</span><span class="text-right">{{ store.t("Hours") }}</span>
      </div>
      <div
        v-for="x in times"
        :key="x.id"
        class="grid grid-cols-[8rem_1fr_9rem_5rem] gap-3 border-b border-slate-100 p-4 text-xs dark:border-slate-800/80 items-center hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition"
      >
        <span class="text-slate-500 font-medium">{{ store.date(x.date) }}</span
        ><span class="font-semibold text-slate-800 dark:text-slate-200">{{ x.memo }}</span
        ><RouterLink class="text-brand font-semibold hover:underline" :to="`/contract/${x.contractId}`"
          >{{ store.t("Contract") }}</RouterLink
        ><b class="text-right font-mono font-bold">{{ x.hours }}</b>
      </div>
      <p v-if="!times.length" class="p-8 text-center text-xs text-slate-400">
        {{ store.t("No time entries.") }}
      </p>
    </article>
    <article
      v-else-if="section === 'transactions'"
      class="panel overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80"
    >
      <div
        v-for="x in transactions"
        :key="x.id"
        class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 text-xs dark:border-slate-800/80 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition"
      >
        <div>
          <b class="font-bold text-slate-800 dark:text-slate-100">{{ x.description }}</b>
          <p class="mt-0.5 text-[11px] text-slate-400">
            {{ x.type }} · {{ store.date(x.date) }}
          </p>
        </div>
        <b class="font-mono text-sm font-bold" :class="x.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'">{{
          store.money(x.amount)
        }}</b>
      </div>
      <p v-if="!transactions.length" class="p-8 text-center text-xs text-slate-400">
        {{ store.t("No transactions.") }}
      </p>
    </article>
    <article v-else-if="section === 'my-agency' && store.isSupplier.value" class="panel p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
      <template v-if="agency"
        ><div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p class="text-xs font-bold uppercase tracking-wider text-brand">{{ store.t("Agency workspace") }}</p>
            <h2 class="font-head mt-1 text-2xl font-800 tracking-tight text-slate-900 dark:text-white">{{ agency.name }}</h2>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ agency.tagline }}</p>
          </div>
          <RouterLink class="btn-brand text-xs py-2 px-4" :to="`/agency/${agency.id}`"
            >{{ store.t("Manage agency") }}</RouterLink
          >
        </div>
        <div class="mt-6 flex flex-wrap gap-2">
          <span
            v-for="m in agency.members"
            :key="m.userId"
            class="badge rounded-xl border border-slate-200/80 bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >{{ store.user(m.userId)?.name }} · {{ store.t(m.role) }}</span
          >
        </div></template
      >
      <p v-else class="text-slate-400 text-xs">
        {{ store.t("This account does not belong to an agency.") }}
      </p>
    </article>
  </section>
</template>
<script>
const { inject, computed } = Vue;
const { useRoute } = VueRouter;
const load = (p) => Vue.defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(p, window.sfcOptions));
const AdminDatabaseCard = load("./app/pages/dashboard/AdminDatabaseCard.vue?v=1");
const MarketplaceValueHub = load("./app/components/commercial/MarketplaceValueHub.vue?v=1");

export default {
  components: { AdminDatabaseCard, MarketplaceValueHub },
  setup() {
    const store = inject("store"),
      route = useRoute(),
      user = store.currentUser;
    const tabs = computed(() => {
      const base = [
        { key: "overview", label: "Overview", to: "/dashboard" },
        { key: "transactions", label: "Transactions", to: "/dashboard/transactions" },
      ];
      return store.isSupplier.value
        ? [
            base[0],
            { key: "timesheets", label: "Timesheets", to: "/dashboard/timesheets" },
            base[1],
            { key: "my-agency", label: "My agency", to: "/dashboard/my-agency" },
          ]
        : base;
    });
    const section = computed(() =>
      tabs.value.some((tab) => tab.key === route.params.section)
        ? route.params.section
        : "overview",
    );
    const contracts = computed(() => {
      if (store.isAdmin.value) return store.state.contracts;
      return store.state.contracts.filter((x) =>
        store.isSupplier.value
          ? x.providerId === user.value.id
          : x.clientId === user.value.id,
      );
    });
    const times = computed(() =>
      store.isSupplier.value
        ? store.state.timeEntries.filter(
            (x) =>
              x.userId === user.value.id ||
              contracts.value.some((c) => c.id === x.contractId),
          )
        : [],
    );
    const transactions = computed(() =>
      store.state.transactions.filter((x) => x.userId === user.value.id),
    );
    const agency = computed(() =>
      store.state.agencies.find((x) => x.id === user.value.agencyId),
    );
    const commercial = computed(() => window.BuyniverseCommercialMetrics?.portfolio(store.state) || { primary: {}, modules: {} });
    const cards = computed(() => {
      const unread = store.unreadNotifications(user.value.id).length;
      if (store.isSupplier.value)
        return [
          { label: "Active contracts", value: contracts.value.length, note: "Current engagements", icon: "fa-briefcase" },
          { label: "Contracted value", value: store.money(contracts.value.reduce((n, x) => n + x.amount, 0)), note: "Supplier volume", icon: "fa-chart-line" },
          { label: "Hours logged", value: times.value.reduce((n, x) => n + x.hours, 0), note: "Across deliveries", icon: "fa-clock" },
          { label: "Unread updates", value: unread, note: "Notifications", icon: "fa-bell" },
        ];
      if (store.isBuyer.value)
        return [
          { label: "Financial savings", value: store.money(commercial.value.primary.financialSavings || 0, commercial.value.primary.currency || "USD"), note: "Budget to best first offer", icon: "fa-chart-line" },
          { label: "Buyniverse savings", value: store.money(commercial.value.primary.buyniverseSavings || 0, commercial.value.primary.currency || "USD"), note: "First offer to best final bid", icon: "fa-gavel" },
          { label: "Live opportunities", value: commercial.value.modules.procurement?.active || 0, note: "Competitive sourcing events", icon: "fa-tower-broadcast" },
          { label: "Committed spend", value: store.money(contracts.value.reduce((n, x) => n + x.amount, 0)), note: "Buyer commitments", icon: "fa-wallet" },
        ];
      return [
        { label: "Active contracts", value: contracts.value.length, note: "Across workspaces", icon: "fa-briefcase" },
        { label: "Platform value", value: store.money(contracts.value.reduce((n, x) => n + x.amount, 0)), note: "Current portfolio", icon: "fa-chart-line" },
        { label: "Open requests", value: store.state.purchaseRequests.filter((x) => !["Closed", "Rejected"].includes(x.status)).length, note: "Needs attention", icon: "fa-cart-plus" },
        { label: "Unread updates", value: unread, note: "Notifications", icon: "fa-bell" },
      ];
    });
    const recentLabel = (path, label) => {
      if (label && label !== "Workspace") return label;
      const labels = [
        ["/procurement/cockpit", "Purchases"],
        ["/procurement/queue", "Purchase requests"],
        ["/procurement/sourcing", "Quote rounds"],
        ["/procurement/auction", "Live auctions"],
        ["/procurement/governance", "Settings & history"],
        ["/projects", "Projects"],
        ["/invoices", "Invoices"],
        ["/payments", "Payments"],
        ["/contracts", "Contracts"],
        ["/suppliers", "Suppliers"],
        ["/find-work", "Find work"],
        ["/post-job", "Post a job"],
        ["/dashboard", "Dashboard"],
      ];
      return labels.find(([prefix]) => path.startsWith(prefix))?.[1] || "Dashboard";
    };
    const recent = computed(() => {
      const seen = new Set();
      return (store.state.recentViews || [])
        .filter(
          (item) => item.userId === user.value.id && item.path !== "/dashboard",
        )
        .map((item) => {
          const path = String(item.path || "/dashboard").split("?")[0];
          const label = recentLabel(path, item.label);
          return { ...item, path, label };
        })
        .filter((item) => {
          if (seen.has(item.path)) return false;
          seen.add(item.path);
          return true;
        })
        .slice(0, 4);
    });
    const quickActions = computed(() =>
      store.isSupplier.value
        ? [
            { to: "/find-work", label: "Find work", icon: "fa-briefcase" },
            {
              to: "/procurement/auction",
              label: "Live offers",
              icon: "fa-gavel",
            },
            {
              to: "/invoices/new",
              label: "New invoice",
              icon: "fa-file-circle-plus",
            },
          ]
        : store.isBuyer.value
        ? [
            { to: "/post-job/new", label: "New project", icon: "fa-plus" },
            {
              to: "/procurement/queue?new=1",
              label: "New request",
              icon: "fa-cart-plus",
            },
            {
              to: "/procurement/sourcing?new=1",
              label: "New quote round",
              icon: "fa-file-signature",
            },
          ]
        : [
            { to: "/procurement", label: "Procurement", icon: "fa-cart-shopping" },
            { to: "/projects", label: "Projects", icon: "fa-folder" },
            { to: "/admin/issuers", label: "Issuers", icon: "fa-building-columns" },
          ],
    );
    return {
      store,
      user,
      section,
      tabs,
      contracts,
      times,
      transactions,
      agency,
      commercial,
      cards,
      recent,
      quickActions,
      titles: {
        overview: "Your workspace",
        timesheets: "Timesheets",
        transactions: "Transactions",
        "my-agency": "My agency",
      },
      copies: {
        overview: "A compact view of work, money and activity.",
        timesheets: "Recorded delivery time across contracts.",
        transactions: "A complete ledger of workspace activity.",
        "my-agency": "Members, capabilities and shared delivery.",
      },
    };
  },
};
</script>
