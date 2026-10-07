<template>
  <ol class="pl-rail" :aria-label="store.t('The five stages of a need')">
    <li>
      <RouterLink to="/dashboard" class="pl-rail__home" :aria-current="active < 0 && overview ? 'page' : undefined">
        <b>{{ store.t("My needs") }}</b>
      </RouterLink>
    </li>
    <template v-for="(stage, index) in stages" :key="stage.key">
      <li aria-hidden="true"><span class="pl-link" :class="{ 'is-done': active >= index }"></span></li>
      <li>
        <RouterLink :to="stage.to" class="pl-step" :class="{ 'is-done': active > index }" :style="{ '--c': stage.color }" :aria-current="active === index ? 'step' : undefined">
          <span class="pl-step__no">
            <i v-if="active > index" class="fa-solid fa-check text-[11px]" aria-hidden="true"></i>
            <template v-else>{{ index + 1 }}</template>
          </span>
          <span class="pl-step__body">
            <span class="pl-step__title">{{ store.t(stage.verb) }}<span class="pl-step__count">{{ stage.open }}</span></span>
            <span class="pl-step__hint" :class="{ 'is-alert': stage.attention > 0 }">{{ stage.hint }}</span>
          </span>
        </RouterLink>
      </li>
    </template>
  </ol>
</template>
<script>
const { inject, computed } = Vue;
const COLORS = ["#36e3c0", "#4d9dff", "#a37bff", "#ffb44d", "#ff6b8b"];
export default {
  // active: 0..4 for a stage page, -1 for the overview
  props: { active: { type: Number, default: -1 }, overview: { type: Boolean, default: true } },
  setup() {
    const store = inject("store"), Need = window.BuyniverseNeed;
    const needs = computed(() => Need.fromStore(store));
    const counts = computed(() => Need.counts(needs.value));
    const first = (stage) => needs.value.find((n) => n.stage === stage && !n.done && n.attention) || needs.value.find((n) => n.stage === stage && !n.done);
    const stages = computed(() => Need.STAGES.map((stage, i) => {
      const open = counts.value.open[i], attention = counts.value.attention[i], live = needs.value.filter((n) => n.stage === 2 && n.live).length;
      const target = first(i + 1);
      const to = [() => "/procurement/queue", () => "/procurement/sourcing", () => (target ? target.next.to : "/procurement/sourcing"), () => "/procurement/execution", () => (target ? target.next.to : "/invoices")][i]();
      const hint = attention ? `${attention} ${store.t("need you")}` : i === 1 && live ? `${live} ${store.t("live now")}` : open ? `${open} ${store.t("in progress")}` : store.t("Nothing here");
      return { ...stage, color: COLORS[i], open, attention, hint, to };
    }));
    return { store, stages };
  },
};
</script>
