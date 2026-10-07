<template>
  <section class="hm">
    <header class="hm-head">
      <p class="hm-hello rise">{{ store.t(greeting) }}, {{ firstName }}</p>
      <h1 class="hm-h1 rise" style="--i: 1">{{ store.t(headline) }}</h1>
      <div class="hm-stats rise" style="--i: 2">
        <div><b><AnimatedNumber :value="counts.total" /></b><span>{{ store.t("in progress") }}</span></div>
        <div :class="{ 'is-alert': attention > 0 }"><b><AnimatedNumber :value="attention" /></b><span>{{ store.t("need you") }}</span></div>
        <div><b><AnimatedNumber money :value="Number(primary.netSavings) || 0" :currency="primary.currency || 'USD'" /></b><span>{{ store.t("Net buyer savings") }}</span></div>
      </div>
    </header>

    <NeedsRiver class="rise" style="--i: 3" />
    <NeedsBoard class="rise" style="--i: 4" />
    <SavingsWaterfall v-if="primary.budget" class="rise" style="--i: 5" :model="primary" :configurable="store.canConfigureCommercialTerms()" @change-service-fee="setServiceFee" />

    <footer class="hm-foot rise" style="--i: 6">
      <RouterLink to="/dashboard/transactions"><i class="fa-solid fa-receipt"></i>{{ store.t("Transactions") }}</RouterLink>
      <RouterLink to="/procurement/intelligence"><i class="fa-solid fa-chart-line"></i>{{ store.t("Insights") }}</RouterLink>
      <RouterLink to="/post-job/new"><i class="fa-solid fa-diagram-project"></i>{{ store.t("Post a project") }}</RouterLink>
    </footer>
  </section>
</template>

<script>
const { inject, computed, defineAsyncComponent } = Vue;
const load = (path) => defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(path, window.sfcOptions));
const AnimatedNumber = load("./app/components/AnimatedNumber.vue?v=1");
const NeedsRiver = load("./app/pages/procurement/NeedsRiver.vue?v=1");
const NeedsBoard = load("./app/pages/procurement/NeedsBoard.vue?v=2");
const SavingsWaterfall = load("./app/components/commercial/SavingsWaterfall.vue?v=4");

export default {
  components: { AnimatedNumber, NeedsRiver, NeedsBoard, SavingsWaterfall },
  setup() {
    const store = inject("store"), Need = window.BuyniverseNeed;
    const needs = computed(() => Need.fromStore(store));
    const counts = computed(() => Need.counts(needs.value));
    const attention = computed(() => counts.value.attention.reduce((a, b) => a + b, 0));
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 19 ? "Good afternoon" : "Good evening";
    const headline = computed(() => (attention.value ? "Something needs you" : counts.value.total ? "Everything is moving" : "What do you need today?"));
    const primary = computed(() => (window.BuyniverseCommercialMetrics?.portfolio(store.state) || { primary: {} }).primary || {});
    const setServiceFee = (rate) => store.setCommercialTerms({ rate, basis: store.state.procurementAnalytics?.commercialModel?.successFeeBasis });
    const firstName = computed(() => String(store.currentUser.value?.name || "").split(/\s+/)[0]);
    return { store, counts, attention, greeting, headline, primary, setServiceFee, firstName };
  },
};
</script>
