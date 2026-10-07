<template>
  <ol class="rv" :aria-label="store.t('The five stages of a need')">
    <li v-for="(stage, i) in stages" :key="stage.key" class="rv-col rise" :style="{ '--c': stage.color, '--i': i }">
      <RouterLink :to="stage.to" class="rv-head">
        <span class="rv-node" :class="{ 'is-lit': stage.open > 0, 'is-alert': stage.attention > 0 }"></span>
        <b class="rv-count"><AnimatedNumber :value="stage.open" :duration="700" /></b>
        <span class="rv-verb">{{ store.t(stage.verb) }}</span>
      </RouterLink>
      <div class="rv-dots">
        <RouterLink v-for="n in stage.needs" :key="n.id" :to="n.next.to" class="rv-dot" :class="{ 'is-alert': n.attention, 'is-live': n.live }" :style="{ '--c': n.category.color }" :data-tip="n.title" :aria-label="n.title">
          <i class="fa-solid" :class="n.category.icon"></i>
        </RouterLink>
      </div>
      <small class="rv-hint" :class="{ 'is-alert': stage.attention > 0 }">{{ stage.hint }}</small>
    </li>
  </ol>
</template>
<script>
const { inject, computed, defineAsyncComponent } = Vue;
const AnimatedNumber = defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule("./app/components/AnimatedNumber.vue?v=1", window.sfcOptions));
const COLORS = ["#36e3c0", "#4d9dff", "#a37bff", "#ffb44d", "#ff6b8b"];

export default {
  components: { AnimatedNumber },
  setup() {
    const store = inject("store"), Need = window.BuyniverseNeed;
    const needs = computed(() => Need.fromStore(store));
    const counts = computed(() => Need.counts(needs.value));
    const stages = computed(() => Need.STAGES.map((stage, i) => {
      const here = needs.value.filter((n) => n.stage === i + 1 && !n.done);
      const open = counts.value.open[i], attention = counts.value.attention[i], live = here.filter((n) => n.live).length;
      const target = here.find((n) => n.attention) || here[0];
      const to = [() => "/procurement/queue", () => "/procurement/sourcing", () => (target ? target.next.to : "/procurement/sourcing"), () => "/procurement/execution", () => (target ? target.next.to : "/invoices")][i]();
      const hint = attention ? `${attention} ${store.t("need you")}` : i === 1 && live ? `${live} ${store.t("live now")}` : open ? store.t("On track") : store.t("Nothing here");
      return { ...stage, color: COLORS[i], open, attention, hint, to, needs: here };
    }));
    return { store, stages };
  },
};
</script>
