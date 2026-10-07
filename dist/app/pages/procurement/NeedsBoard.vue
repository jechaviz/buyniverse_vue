<template>
  <section class="nb" :aria-label="store.t('My needs')">
    <header class="nb__head">
      <div>
        <h2 class="nb__h2">{{ store.t("My needs") }}</h2>
        <p class="nb__sub">{{ store.t("Every purchase, from the day you publish it to the day you pay it.") }}</p>
      </div>
      <div class="nb__filters" role="group" :aria-label="store.t('Filter')">
        <button v-for="f in filters" :key="f.key" type="button" :class="{ on: filter === f.key }" :aria-pressed="filter === f.key" @click="filter = f.key">{{ store.t(f.label) }}<b>{{ f.count }}</b></button>
      </div>
    </header>

    <ul v-if="visible.length" class="nb__list">
      <li v-for="(n, i) in visible" :key="n.id" class="rise" :style="{ '--i': i }">
        <RouterLink :to="n.next.to" class="nb__row" :class="{ 'is-alert': n.attention, 'is-done': n.done }" :style="{ '--c': n.category.color }">
          <span class="nb__what">
            <i class="nb__icon fa-solid" :class="n.category.icon" aria-hidden="true"></i>
            <span class="min-w-0">
              <b class="nb__title">{{ n.title }}</b>
              <small class="nb__meta">{{ n.id }} · {{ store.t(n.category.label) }}<template v-if="n.note"> · {{ n.note }}</template></small>
            </span>
          </span>
          <span class="nb__track" role="img" :aria-label="`${store.t('Stage')} ${n.stage} / 5: ${store.t(stageOf(n).verb)}`">
            <span v-for="s in stages" :key="s.key" class="nb__seg" :class="{ done: n.done || s.n < n.stage, now: !n.done && s.n === n.stage, live: n.live && s.n === n.stage }" :title="store.t(s.verb)"></span>
            <em>{{ n.done ? store.t("Paid") : store.t(stageOf(n).verb) }}</em>
          </span>
          <span class="nb__num">
            <b>{{ store.money(n.best || n.budget, n.currency) }}</b>
            <small v-if="n.best && n.budget > n.best" class="nb__save">−{{ Math.round((1 - n.best / n.budget) * 100) }}% {{ store.t("vs budget") }}</small>
            <small v-else-if="n.offers">{{ n.offers }} {{ store.t("offers") }}</small>
            <small v-else>{{ store.t("Budget") }}</small>
          </span>
          <span class="nb__go">{{ store.t(n.next.label) }}<i class="fa-solid fa-arrow-right"></i></span>
        </RouterLink>
      </li>
    </ul>
    <div v-else class="nb__empty">
      <i class="fa-solid fa-bolt"></i>
      <p>{{ store.t(filter === "all" ? "Nothing published yet. Say what you need and the offers come to you." : "Nothing here right now.") }}</p>
      <RouterLink v-if="filter === 'all' && canBuy" to="/necesito" class="btn-brand"><i class="fa-solid fa-bolt"></i>{{ store.t("I need…") }}</RouterLink>
    </div>
  </section>
</template>

<script>
const { inject, ref, computed } = Vue;

export default {
  setup() {
    const store = inject("store"), Need = window.BuyniverseNeed;
    const filter = ref("all");
    const stages = Need.STAGES.map((s, i) => ({ ...s, n: i + 1 }));
    const needs = computed(() => Need.fromStore(store));
    const filters = computed(() => [
      { key: "all", label: "All", count: needs.value.length },
      { key: "you", label: "Need you", count: needs.value.filter((n) => n.attention && !n.done).length },
      { key: "going", label: "In progress", count: needs.value.filter((n) => !n.done && !n.attention).length },
      { key: "done", label: "Paid", count: needs.value.filter((n) => n.done).length },
    ]);
    const visible = computed(() => needs.value.filter((n) => filter.value === "all" || (filter.value === "you" ? n.attention && !n.done : filter.value === "done" ? n.done : !n.done && !n.attention)));
    const stageOf = (n) => stages[n.stage - 1];
    return { store, filter, filters, visible, stages, stageOf, canBuy: computed(() => store.marketplaceMode.value !== "supplier") };
  },
};
</script>
