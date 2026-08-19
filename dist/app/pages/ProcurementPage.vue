<template>
  <section class="procurement-page space-y-5">
    <header
      class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div class="max-w-3xl">
        <p class="mb-1 text-[10px] font-800 uppercase tracking-wider text-brand">
          {{ contextLabel }}
        </p>
        <div class="flex items-center gap-2">
          <h1
            class="premium-title text-3xl font-800 text-slate-900 dark:text-white"
          >
            {{ current.title }}
          </h1>
          <span
            v-if="attentionCount"
            class="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-600 dark:bg-rose-500/10 dark:text-rose-300"
            >{{ attentionCount }} need attention</span
          >
        </div>
        <p
          class="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-300"
        >
          {{ current.description }}
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button v-if="canBuy" class="btn-muted" @click="exportWorkspace">
          <i class="fa-solid fa-download"></i>Export
        </button>
        <RouterLink
          v-if="canBuy && (section === 'cockpit' || section === 'queue')"
          to="/procurement/queue?new=1"
          class="btn-brand"
          ><i class="fa-solid fa-plus"></i>New request</RouterLink
        >
        <RouterLink
          v-else-if="canBuy && section === 'sourcing'"
          to="/procurement/sourcing?new=1"
          class="btn-brand"
          ><i class="fa-solid fa-plus"></i>New quote round</RouterLink
        >
      </div>
    </header>

    <nav
      v-if="sections.length > 1"
      class="section-tabs flex gap-1 overflow-x-auto border-b border-slate-200/80 dark:border-slate-700"
      :aria-label="contextLabel"
    >
      <RouterLink
        v-for="item in sections"
        :key="item.key"
        :to="`/procurement/${item.key}`"
        class="min-w-max border-b-2 border-transparent px-3 py-3 text-xs font-bold text-slate-500 transition hover:text-slate-800 dark:hover:text-white"
        :class="section === item.key ? '!border-brand !text-brand' : ''"
        >{{ item.short }}</RouterLink
      >
    </nav>

    <component :is="current.component" />
  </section>
</template>
<script>
const { inject, computed, watch } = Vue;
const { useRoute, useRouter } = VueRouter;
const load = (p) =>
  Vue.defineAsyncComponent(() =>
    window["vue3-sfc-loader"].loadModule(p, window.sfcOptions),
  );
const Cockpit = load("./app/pages/procurement/ProcurementCockpit.vue?v=7");
const Queue = load("./app/pages/procurement/ProcurementQueue.vue?v=8");
const Sourcing = load("./app/pages/procurement/SourcingWorkspace.vue?v=11");
const Auction = load("./app/pages/procurement/LiveAuctionWorkspace.vue?v=16");
const Execution = load("./app/pages/procurement/ProcurementExecution.vue?v=8");
const Intelligence = load(
  "./app/pages/procurement/ProcurementIntelligence.vue?v=7",
);
const Governance = load(
  "./app/pages/procurement/ProcurementGovernance.vue?v=8",
);
export default {
  setup() {
    const store = inject("store"),
      route = useRoute(),
      router = useRouter();
    const allSections = [
      {
        key: "cockpit",
        short: "Overview",
        title: "Purchases",
        description: "Requests, quotes, orders and savings in one place.",
        component: Cockpit,
      },
      {
        key: "queue",
        short: "Requests",
        title: "Requests",
        description:
          "Review needs and approvals without losing project context.",
        component: Queue,
      },
      {
        key: "sourcing",
        short: "Quotes",
        title: "Quotes",
        description:
          "Invite suppliers, compare offers and choose the best option.",
        component: Sourcing,
      },
      {
        key: "auction",
        short: "Live bids",
        title: "Live bids",
        description:
          "Run a live price round with clear rules and a complete history.",
        component: Auction,
      },
      {
        key: "execution",
        short: "Orders",
        title: "Orders",
        description: "Track delivery, receipts, invoices and issues.",
        component: Execution,
      },
      {
        key: "intelligence",
        short: "Insights",
        title: "Insights",
        description: "Spend, savings and supplier performance at a glance.",
        component: Intelligence,
      },
      {
        key: "governance",
        short: "Settings",
        title: "Settings & history",
        description: "Rules, automations, access and activity history.",
        component: Governance,
      },
    ];
    const canBuy = computed(
      () => store.marketplaceMode.value !== "supplier",
    );
    const sections = computed(() =>
      store.marketplaceMode.value === "supplier"
        ? allSections.filter((item) => item.key === "auction")
        : store.marketplaceMode.value === "admin"
          ? allSections
          : allSections.filter((item) => item.key !== "governance"),
    );
    const defaultSection = computed(() =>
      store.marketplaceMode.value === "supplier" ? "auction" : "cockpit",
    );
    const section = computed(() =>
      sections.value.some((item) => item.key === route.params.section)
        ? route.params.section
        : defaultSection.value,
    );
    const current = computed(() => {
      if (store.marketplaceMode.value === "supplier")
        return {
          ...allSections.find((item) => item.key === "auction"),
          title: "Live opportunities",
          description:
            "Track your position and submit offers only in rounds where your company was invited.",
        };
      return (
        allSections.find((item) => item.key === section.value) || allSections[0]
      );
    });
    const contextLabel = computed(() =>
      store.marketplaceMode.value === "supplier"
        ? "Supplier workspace"
        : store.marketplaceMode.value === "admin"
          ? "Administration workspace"
          : "Buyer workspace",
    );
    const attentionCount = computed(() =>
      canBuy.value
        ? store.state.purchaseRequests.filter((item) =>
            ["Pending approval", "Exception", "Escalated"].includes(
              item.status,
            ),
          ).length +
          store.state.purchaseOrders.reduce(
            (sum, item) =>
              sum +
              (item.exceptions || []).filter(
                (exception) => exception.status !== "Resolved",
              ).length,
            0,
          )
        : 0,
    );
    const exportWorkspace = () => {
      if (!canBuy.value)
        return store.notice("Purchase export denied", "fa-shield-halved");
      const payload = {
        exportedAt: new Date().toISOString(),
        requests: store.state.purchaseRequests,
        events: store.state.sourcingEvents,
        auctions: store.state.auctions,
        orders: store.state.purchaseOrders,
        audit: store.state.procurementAudit,
      };
      window.ProcurementCommon.download(
        "buyniverse-purchases.json",
        JSON.stringify(payload, null, 2),
        "application/json",
      );
      store.notice("Purchases exported", "fa-download");
    };
    const normalizeRoute = () => {
      if (
        !route.params.section ||
        !sections.value.some((item) => item.key === route.params.section)
      )
        router.replace(`/procurement/${defaultSection.value}`);
    };
    watch(
      [() => route.params.section, () => store.marketplaceMode.value],
      normalizeRoute,
      { immediate: true },
    );
    return {
      store,
      sections,
      section,
      current,
      attentionCount,
      canBuy,
      contextLabel,
      exportWorkspace,
    };
  },
};
</script>
