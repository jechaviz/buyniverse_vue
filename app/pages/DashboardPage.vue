<template>
  <AdminControlCenter v-if="store.isAdmin.value" />
  <NeedsHome v-else-if="needsHome" />
  <section v-else class="dsh">
    <header class="pg-head">
      <div>
        <h1 class="pg-title">{{ store.t(titles[section]) }}</h1>
        <p class="pg-lede">{{ store.t(copies[section]) }}</p>
      </div>
    </header>

    <nav class="pl-sub" :aria-label="store.t('Dashboard')">
      <RouterLink v-for="x in tabs" :key="x.key" :to="x.to" :class="{ on: section === x.key }">{{ store.t(x.label) }}</RouterLink>
    </nav>

    <template v-if="section === 'overview'">
      <div class="st">
        <div v-for="card in cards" :key="card.label" class="st-item">
          <b>{{ card.value }}</b>
          <span>{{ store.t(card.label) }}</span>
          <small>{{ store.t(card.note) }}</small>
        </div>
      </div>

      <MarketplaceValueHub />

      <AdminDatabaseCard v-if="store.isDemo.value && store.isAdmin.value" />

      <div class="dsh-cols">
        <section class="ls">
          <h2 class="ls-h">{{ store.t(store.isBuyer.value ? "Active projects" : "Active contracts") }}<em>{{ contracts.length }}</em></h2>
          <ul class="ls-list">
            <li v-for="x in contracts" :key="x.id">
              <RouterLink :to="`/contract/${x.id}`" class="ls-row">
                <span class="ls-main"><b>{{ store.job(x.sourceId)?.title }}</b><small><i class="ls-dot"></i>{{ store.t(x.status) }}</small></span>
                <span class="ls-num">{{ store.money(x.amount) }}</span>
              </RouterLink>
            </li>
          </ul>
          <p v-if="!contracts.length" class="ls-empty">{{ store.t(store.isBuyer.value ? "No active projects." : "No active contracts.") }}</p>
        </section>

        <section class="ls">
          <h2 class="ls-h">{{ store.t("Recent activity") }}<RouterLink to="/dashboard/transactions">{{ store.t("View all") }}</RouterLink></h2>
          <ul class="ls-list">
            <li v-for="x in transactions.slice(0, 5)" :key="x.id" class="ls-row">
              <span class="ls-main"><b>{{ x.description }}</b><small>{{ store.date(x.date) }}</small></span>
              <span class="ls-num" :class="{ 'is-pos': x.amount >= 0 }">{{ store.money(x.amount) }}</span>
            </li>
          </ul>
          <p v-if="!transactions.length" class="ls-empty">{{ store.t("No recent activity.") }}</p>
        </section>
      </div>

      <footer class="hm-foot">
        <span class="hm-foot__label">{{ store.t("Continue working") }}</span>
        <RouterLink v-for="item in recent" :key="item.path" :to="item.path"><i class="fa-solid fa-clock-rotate-left"></i>{{ store.t(item.label) }}</RouterLink>
        <RouterLink v-for="action in quickActions" :key="action.to" :to="action.to"><i class="fa-solid" :class="action.icon"></i>{{ store.t(action.label) }}</RouterLink>
      </footer>
    </template>

    <section v-else-if="section === 'timesheets' && store.isSupplier.value" class="ls">
      <ul class="ls-list">
        <li v-for="x in times" :key="x.id" class="ls-row">
          <span class="ls-main"><b>{{ x.memo }}</b><small>{{ store.date(x.date) }} · <RouterLink :to="`/contract/${x.contractId}`">{{ store.t("Contract") }}</RouterLink></small></span>
          <span class="ls-num">{{ x.hours }} h</span>
        </li>
      </ul>
      <p v-if="!times.length" class="ls-empty">{{ store.t("No time entries.") }}</p>
    </section>

    <section v-else-if="section === 'transactions'" class="ls">
      <ul class="ls-list">
        <li v-for="x in transactions" :key="x.id" class="ls-row">
          <span class="ls-main"><b>{{ x.description }}</b><small>{{ x.type }} · {{ store.date(x.date) }}</small></span>
          <span class="ls-num" :class="{ 'is-pos': x.amount >= 0 }">{{ store.money(x.amount) }}</span>
        </li>
      </ul>
      <p v-if="!transactions.length" class="ls-empty">{{ store.t("No transactions.") }}</p>
    </section>

    <section v-else-if="section === 'my-agency' && store.isSupplier.value" class="ls">
      <template v-if="agency">
        <h2 class="ls-h">{{ agency.name }}<RouterLink :to="`/agency/${agency.id}`">{{ store.t("Manage agency") }}</RouterLink></h2>
        <p class="pg-lede">{{ agency.tagline }}</p>
        <ul class="ls-list">
          <li v-for="m in agency.members" :key="m.userId" class="ls-row">
            <span class="ls-main"><b>{{ store.user(m.userId)?.name }}</b><small>{{ store.t(m.role) }}</small></span>
          </li>
        </ul>
      </template>
      <p v-else class="ls-empty">{{ store.t("This account does not belong to an agency.") }}</p>
    </section>
  </section>
</template>
<script>
const { inject, computed } = Vue;
const { useRoute } = VueRouter;
const load = (p) => Vue.defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(p, window.sfcOptions));
const AdminDatabaseCard = load("./app/pages/dashboard/AdminDatabaseCard.vue?v=1");
const AdminControlCenter = load("./app/pages/dashboard/AdminControlCenter.vue?v=1");
const MarketplaceValueHub = load("./app/components/commercial/MarketplaceValueHub.vue?v=2");
const NeedsHome = load("./app/pages/dashboard/NeedsHome.vue?v=1");

export default {
  components: { AdminDatabaseCard, AdminControlCenter, MarketplaceValueHub, NeedsHome },
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
    // A buyer lands on their needs; every other overview keeps the classic dashboard.
    const needsHome = computed(() => store.isBuyer.value && !store.isAdmin.value && section.value === "overview");
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
            { to: "/procurement/auction", label: "Live offers", icon: "fa-gavel" },
            { to: "/invoices/new", label: "New invoice", icon: "fa-file-circle-plus" },
          ]
        : store.isBuyer.value
        ? [
            { to: "/post-job/new", label: "New project", icon: "fa-plus" },
            { to: "/procurement/queue?new=1", label: "New request", icon: "fa-cart-plus" },
            { to: "/procurement/sourcing?new=1", label: "New quote round", icon: "fa-file-signature" },
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
      needsHome,
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
