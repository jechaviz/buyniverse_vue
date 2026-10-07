<template>
  <section class="procurement-page pg">
    <header class="pg-head">
      <div>
        <h1 class="pg-title">{{ store.t(current.title) }}</h1>
        <p class="pg-lede">{{ store.t(current.description) }}</p>
      </div>
      <div class="pg-actions">
        <RouterLink v-if="canBuy && section === 'queue'" to="/procurement/queue?new=1" class="pg-link" :title="store.t('Full request form with department and budget code')">{{ store.t("Detailed request") }}</RouterLink>
        <button v-if="canBuy && ['cockpit', 'execution'].includes(section)" type="button" class="pg-link" @click="exportWorkspace">{{ store.t("Export") }}</button>
        <RouterLink v-if="canBuy" to="/procurement/intelligence" class="pg-link">{{ store.t("Insights") }}</RouterLink>
      </div>
    </header>

    <ProcurementStageRail v-if="canBuy" :active="activeStage" :overview="section === 'cockpit'" />
    <nav v-if="canBuy && (section === 'sourcing' || section === 'auction')" class="pl-sub" :aria-label="store.t('Compete')">
      <RouterLink to="/procurement/sourcing" :class="{ on: section === 'sourcing' }">{{ store.t("Quote rounds") }}</RouterLink>
      <RouterLink to="/procurement/auction" :class="{ on: section === 'auction' }"><span class="pl-sub__live"></span>{{ store.t("Live auctions") }}</RouterLink>
    </nav>
    <nav
      v-if="!canBuy && sections.length > 1"
      class="pl-sub"
      :aria-label="contextLabel"
    >
      <RouterLink
        v-for="item in sections"
        :key="item.key"
        :to="`/procurement/${item.key}`"
        :class="{ on: section === item.key }"
        >{{ store.t(item.short) }}</RouterLink
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
const Cockpit = load("./app/pages/procurement/ProcurementCockpit.vue?v=14");
const Queue = load("./app/pages/procurement/ProcurementQueue.vue?v=16");
const Sourcing = load("./app/pages/procurement/SourcingWorkspace.vue?v=24");
const Auction = load("./app/pages/procurement/LiveAuctionWorkspace.vue?v=31");
const Execution = load("./app/pages/procurement/ProcurementExecution.vue?v=15");
const Intelligence = load(
  "./app/pages/procurement/ProcurementIntelligence.vue?v=7",
);
const Governance = load(
  "./app/pages/procurement/ProcurementGovernance.vue?v=10",
);
const ProcurementStageRail = load("./app/pages/procurement/ProcurementStageRail.vue?v=4");
export default {
  components: { ProcurementStageRail },
  setup() {
    const store = inject("store"),
      route = useRoute(),
      router = useRouter();
    const allSections = [
      {
        key: "cockpit",
        short: "Overview",
        title: "Purchases",
        description: "Say what you need and follow it until it is paid.",
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
    const accessibleSections = computed(() =>
      store.marketplaceMode.value === "supplier"
        ? allSections.filter((item) => ["sourcing", "auction"].includes(item.key))
        : store.marketplaceMode.value === "admin"
          ? allSections
          : allSections.filter((item) => item.key !== "governance"),
    );
    // The purchasing rail exposes only the operational sequence. Intelligence
    // and governance remain deep-linkable from their contextual cards, rather
    // than competing with the core request-to-order path on every screen.
    const primaryKeys = ["cockpit", "queue", "sourcing", "auction", "execution"];
    const sections = computed(() =>
      accessibleSections.value.filter((item) => primaryKeys.includes(item.key)),
    );
    const defaultSection = computed(() =>
      store.marketplaceMode.value === "supplier" ? "auction" : "cockpit",
    );
    const section = computed(() =>
      accessibleSections.value.some((item) => item.key === route.params.section)
        ? route.params.section
        : defaultSection.value,
    );
    // Which of the five stages this page belongs to (-1 for the overview).
    const activeStage = computed(() => {
      const tab = String(route.query.tab || "");
      if (section.value === "queue") return 0;
      if (section.value === "auction") return 1;
      if (section.value === "sourcing") return ["comparison", "award"].includes(tab) ? 2 : 1;
      if (section.value === "execution") return tab === "matching" ? 4 : 3;
      return -1;
    });
    const current = computed(() => {
      if (store.marketplaceMode.value === "supplier" && section.value === "sourcing")
        return {
          ...allSections.find((item) => item.key === "sourcing"),
          title: "Invited quote rounds",
          description:
            "Respond securely to the requests where your company was invited.",
        };
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
        ? store.scopedRecords(store.state.purchaseRequests).filter((item) =>
            ["Pending approval", "Exception", "Escalated"].includes(
              item.status,
            ),
          ).length +
          store.scopedRecords(store.state.purchaseOrders).reduce(
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
      // For a buyer the overview of purchasing is "My needs", the dashboard home.
      if (store.marketplaceMode.value === "buyer" && (!route.params.section || route.params.section === "cockpit")) {
        router.replace("/dashboard");
        return;
      }
      if (
        !route.params.section ||
        !accessibleSections.value.some((item) => item.key === route.params.section)
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
      activeStage,
      current,
      attentionCount,
      canBuy,
      contextLabel,
      exportWorkspace,
    };
  },
};
</script>
