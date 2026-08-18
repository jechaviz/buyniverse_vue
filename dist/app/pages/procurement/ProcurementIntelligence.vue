<template><div class="space-y-5"><section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-6"><article v-for="metric in metrics" :key="metric.label" class="premium-card rounded-xl border p-4"><div class="flex items-start justify-between"><span class="grid h-9 w-9 place-items-center rounded-lg" :class="metric.tone"><i class="fa-solid" :class="metric.icon"></i></span><span class="text-[10px] font-bold" :class="metric.delta.startsWith('+') ? 'text-emerald-500' : 'text-slate-400'">{{ metric.delta }}</span></div><p class="mt-4 text-xs font-semibold text-slate-500">{{ metric.label }}</p><p class="mt-1 text-2xl font-800">{{ metric.value }}</p></article></section><nav class="glass flex gap-1 overflow-x-auto rounded-xl p-1.5"><button
        v-for="item in tabs"
        :key="item.key"
        class="min-w-max rounded-lg px-3 py-2 text-xs font-bold"
        :class="tab === item.key ? 'bg-brand text-white' : 'text-slate-500 hover:bg-white/60 dark:hover:bg-slate-700'"
        @click="tab = item.key"
      ><i class="fa-solid mr-1.5" :class="item.icon"></i>{{ item.label }}
      </button></nav><IntelligencePortfolioTab
      v-if="tab === 'portfolio'"
      :analytics="analytics"
      :max-spend="maxSpend"
      :max-savings="maxSavings"
      :max-category-spend="maxCategorySpend"
      :height="height"
      :format-money="store.money"
      @export="exportReport"
    /><IntelligenceScenariosTab
      v-else-if="tab === 'scenarios'"
      :analytics="analytics"
      :comparable-events="comparableEvents"
      :selected-event-id="selectedEventId"
      :selected-event="selectedEvent"
      :scenario-id="scenarioId"
      :criteria="criteria"
      :weights="weights"
      :scenario-ranking="scenarioRanking"
      :recommendation="recommendation"
      :supplier-name="(id) => store.supplier(id)?.name"
      :format-money="store.money"
      @update:selected-event-id="selectedEventId = $event"
      @select-scenario="selectScenario"
      @custom-weight="scenarioId = 'custom'"
    /><IntelligenceSuppliersTab
      v-else-if="tab === 'suppliers'"
      :supplier-search="supplierSearch"
      :filtered-suppliers="filteredSuppliers"
      :selected-supplier-id="selectedSupplierId"
      :selected-supplier="selectedSupplier"
      :supplier-metrics="supplierMetrics"
      :initials="initials"
      @update:supplier-search="supplierSearch = $event"
      @select-supplier="selectSupplier"
      @set-status="setSupplierStatus"
    /><IntelligenceRiskTab
      v-else-if="tab === 'risk'"
      :risk-suppliers="riskSuppliers"
      :esg-suppliers="esgSuppliers"
      :grade="grade"
      @open-supplier="openSupplierView"
    /><div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><article v-for="report in reports" :key="report.id" class="premium-card rounded-xl border p-5"><div class="flex items-start justify-between"><span class="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand"><i class="fa-solid" :class="report.icon"></i></span><span class="badge bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">Ready</span></div><h2 class="mt-4 text-base font-800">{{ report.title }}</h2><p class="mt-2 text-xs leading-5 text-slate-500">{{ report.description }}</p><div class="mt-5 flex items-center justify-between"><span class="text-[10px] text-slate-400">Updated today</span><button class="text-xs font-bold text-brand" @click="exportReport(report.id)">
            Export {{ report.format }} <i class="fa-solid fa-download ml-1"></i></button></div></article></div></div></template>
<script>
const { inject, computed, ref, reactive, watch } = Vue;
const { useRoute, useRouter } = VueRouter;
const load = (p) => Vue.defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(p, window.sfcOptions));
const IntelligencePortfolioTab = load("./app/pages/procurement/intelligence/IntelligencePortfolioTab.vue?v=1");
const IntelligenceScenariosTab = load("./app/pages/procurement/intelligence/IntelligenceScenariosTab.vue?v=1");
const IntelligenceSuppliersTab = load("./app/pages/procurement/intelligence/IntelligenceSuppliersTab.vue?v=1");
const IntelligenceRiskTab = load("./app/pages/procurement/intelligence/IntelligenceRiskTab.vue?v=1");
export default {
components: { IntelligencePortfolioTab, IntelligenceScenariosTab, IntelligenceSuppliersTab, IntelligenceRiskTab },
setup() {
const store = inject("store"), route = useRoute(), router = useRouter();
const analytics = store.state.procurementAnalytics;
const selectedEventId = ref(
store.state.sourcingEvents.some((item) => item.id === route.query.event && item.quotes?.length)
? route.query.event
: store.state.sourcingEvents.find((item) => item.quotes?.length)?.id || "",
);
const scenarioId = ref(route.query.scenario || "scenario-balanced");
const weights = reactive({ ...analytics.scenarios[0].weights });
const supplierSearch = ref("");
const selectedSupplierId = ref(store.supplier(route.query.supplier)?.id || store.state.suppliers[0]?.id);
const tab = computed({
get: () => ["portfolio", "scenarios", "suppliers", "risk", "reports"].includes(route.query.tab) ? route.query.tab : "portfolio",
set: (key) => router.push({
path: "/procurement/intelligence",
query: window.WebCommon.mergeRouteQuery(route.query, {
tab: key, event: key === "scenarios" ? selectedEventId.value : null,
scenario: key === "scenarios" ? scenarioId.value : null,
supplier: key === "suppliers" ? selectedSupplierId.value : null,
}),
}),
});
const tabs = [
{ key: "portfolio", label: "Overview", icon: "fa-chart-column" },
{ key: "scenarios", label: "Compare offers", icon: "fa-scale-balanced" },
{ key: "suppliers", label: "Suppliers", icon: "fa-building-circle-check" },
{ key: "risk", label: "Risk", icon: "fa-leaf" },
{ key: "reports", label: "Reports", icon: "fa-file-lines" },
];
const metrics = computed(() => [
{ label: "Addressable spend", value: store.money(analytics.kpis.addressableSpend), delta: "+6.1%", icon: "fa-wallet", tone: "bg-violet-50 text-violet-600 dark:bg-violet-500/10" },
{ label: "Realized savings", value: store.money(analytics.kpis.realizedSavings), delta: "+12.4%", icon: "fa-piggy-bank", tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10" },
{ label: "Savings rate", value: analytics.kpis.savingsRate + "%", delta: "+1.2pp", icon: "fa-arrow-trend-up", tone: "bg-brand-50 text-brand" },
{ label: "Approval cycle", value: analytics.kpis.approvalCycleDays + "d", delta: "-0.8d", icon: "fa-stopwatch", tone: "bg-sky-50 text-sky-600 dark:bg-sky-500/10" },
{ label: "Supplier coverage", value: analytics.kpis.supplierCoverage + "%", delta: "+4pp", icon: "fa-building-circle-check", tone: "bg-amber-50 text-amber-600 dark:bg-amber-500/10" },
{ label: "Open issues", value: analytics.kpis.exceptionCount, delta: "1 critical", icon: "fa-triangle-exclamation", tone: "bg-rose-50 text-rose-600 dark:bg-rose-500/10" },
]);
const maxSpend = Math.max(...analytics.monthly.map((i) => i.spend)), maxSavings = Math.max(...analytics.monthly.map((i) => i.savings)), maxCategorySpend = Math.max(...analytics.categories.map((i) => i.spend));
const height = (v, max) => `${Math.max(8, Math.round((v / max) * 100))}%`;
const comparableEvents = computed(() => store.state.sourcingEvents.filter((item) => item.quotes?.length));
const selectedEvent = computed(() => store.sourcingEvent(selectedEventId.value) || comparableEvents.value[0]);
const scenarioRanking = computed(() => selectedEvent.value ? window.ProcurementCommon.rankQuotes(selectedEvent.value.quotes, weights) : []);
const recommendation = computed(() => scenarioRanking.value[0] ? { quote: scenarioRanking.value[0], name: store.supplier(scenarioRanking.value[0].supplierId)?.name } : null);
const criteria = [{ key: "price", label: "Price" }, { key: "quality", label: "Quality" }, { key: "delivery", label: "Delivery" }, { key: "risk", label: "Risk" }, { key: "esg", label: "ESG" }];
const selectScenario = (scen) => {
scenarioId.value = scen.id; Object.assign(weights, scen.weights);
router.replace({ path: "/procurement/intelligence", query: window.WebCommon.mergeRouteQuery(route.query, { tab: "scenarios", event: selectedEventId.value, scenario: scen.id, supplier: null }) });
};
const filteredSuppliers = computed(() => {
const q = supplierSearch.value.toLowerCase();
return [...store.state.suppliers].filter((i) => !q || [i.name, i.category, i.status].join(" ").toLowerCase().includes(q)).sort((a, b) => b.score - a.score);
});
const selectedSupplier = computed(() => store.supplier(selectedSupplierId.value));
const selectSupplier = (id) => {
if (!store.supplier(id)) return;
selectedSupplierId.value = id;
router.replace({ path: "/procurement/intelligence", query: window.WebCommon.mergeRouteQuery(route.query, { tab: "suppliers", supplier: id, event: null, scenario: null }) });
};
const openSupplierView = (id) => {
if (!store.supplier(id)) return;
selectedSupplierId.value = id;
router.push({ path: "/procurement/intelligence", query: window.WebCommon.mergeRouteQuery(route.query, { tab: "suppliers", supplier: id, event: null, scenario: null }) });
};
watch(selectedEventId, (id) => {
if (tab.value !== "scenarios" || route.query.event === id) return;
router.replace({ path: "/procurement/intelligence", query: window.WebCommon.mergeRouteQuery(route.query, { event: id }) });
});
watch(() => route.query, (v) => {
if (v.event && comparableEvents.value.some((e) => e.id === v.event)) selectedEventId.value = v.event;
if (v.supplier && store.supplier(v.supplier)) selectedSupplierId.value = v.supplier;
if (v.scenario) scenarioId.value = v.scenario;
}, { deep: true });
const supplierMetrics = (s) => [
{ label: "Score", value: s.score, tone: "text-brand" },
{ label: "On-time", value: s.onTime + "%", tone: "text-emerald-500" },
{ label: "Response", value: s.responseRate + "%", tone: "text-sky-500" },
{ label: "Risk", value: s.risk, tone: s.risk > 35 ? "text-rose-500" : "text-emerald-500" },
{ label: "ESG", value: s.esg, tone: "text-violet-500" },
];
const initials = (name) => name.split(" ").map((i) => i[0]).slice(0, 2).join("").toUpperCase();
const setSupplierStatus = (st) => {
selectedSupplier.value.status = st;
store.procurementEvent(selectedSupplier.value, "Supplier status changed", st, st === "In review" ? "warning" : "success");
store.notice(`Supplier moved to ${st}`);
};
const riskSuppliers = computed(() => [...store.state.suppliers].sort((a, b) => b.risk - a.risk).slice(0, 4));
const esgSuppliers = computed(() => [...store.state.suppliers].sort((a, b) => b.esg - a.esg));
const grade = (s) => s >= 90 ? "A+" : s >= 85 ? "A" : s >= 80 ? "B+" : s >= 75 ? "B" : "C";
const reports = [
{ id: "spend", title: "Spend by category", description: "Spend by category and quote coverage.", format: "CSV", icon: "fa-chart-pie" },
{ id: "savings", title: "Savings realization", description: "Baseline, negotiated, selected and realized value.", format: "CSV", icon: "fa-piggy-bank" },
{ id: "supplier-risk", title: "Supplier risk", description: "Supplier status, risk and open issues.", format: "JSON", icon: "fa-shield-halved" },
{ id: "cycle-time", title: "Purchase cycle time", description: "Time from request to completed order.", format: "CSV", icon: "fa-stopwatch" },
{ id: "esg", title: "Sustainability in supplier choices", description: "Sustainability scores used in comparisons.", format: "CSV", icon: "fa-leaf" },
{ id: "auction", title: "Live bid performance", description: "Offer changes, participation and results.", format: "JSON", icon: "fa-gavel" },
];
const exportReport = (id) => {
let rows;
if (id === "supplier-risk" || id === "esg") rows = store.state.suppliers;
else if (["portfolio", "spend", "savings", "cycle-time"].includes(id)) rows = analytics.monthly;
else if (id === "auction") rows = store.state.auctions;
else rows = analytics.categories;
const isJson = id === "supplier-risk" || id === "auction";
window.ProcurementCommon.download(`purchases-${id}.${isJson ? "json" : "csv"}`, isJson ? JSON.stringify(rows, null, 2) : window.ProcurementCommon.csv(rows), isJson ? "application/json" : "text/csv");
store.notice("Report exported", "fa-download");
};
return {
store, analytics, tab, tabs, metrics, maxSpend, maxSavings, maxCategorySpend, height,
selectedEventId, comparableEvents, selectedEvent, scenarioId, weights, criteria,
selectScenario, scenarioRanking, recommendation, supplierSearch, filteredSuppliers,
selectedSupplierId, selectSupplier, openSupplierView, selectedSupplier, supplierMetrics,
initials, setSupplierStatus, riskSuppliers, esgSuppliers, grade, reports, exportReport,
};
},
};
</script>