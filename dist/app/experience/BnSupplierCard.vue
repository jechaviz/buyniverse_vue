<template>
  <article class="bn-card bn-card--hover bn-supplier">
    <button
      v-if="selectable"
      type="button"
      class="bn-select-toggle"
      :aria-pressed="selected"
      :aria-label="store.t(selected ? 'Remove from shortlist' : 'Add to shortlist') + ': ' + supplier.name"
      @click="$emit('toggle', supplier.id)"
    >
      <i class="fa-solid" :class="selected ? 'fa-check' : 'fa-plus'"></i>
    </button>

    <div class="bn-supplier__head">
      <span class="bn-avatar" :class="'bn-avatar--' + supplier.accent">{{ initials }}</span>
      <div style="min-width: 0; padding-right: 36px">
        <RouterLink :to="profileLink" class="bn-supplier__name" style="text-decoration: none; display: block">
          {{ supplier.name }}
          <i v-if="supplier.verified" class="fa-solid fa-circle-check" style="color: var(--bn-violet); font-size: 0.85em" :title="store.t('Verified supplier')"></i>
        </RouterLink>
        <div class="bn-supplier__meta">
          <span><i class="fa-solid fa-location-dot"></i> {{ store.t(supplier.cityLabel) }}, {{ store.t(supplier.countryLabel) }}</span>
          <span><i class="fa-solid fa-star" style="color: var(--bn-amber)"></i> <b class="bn-num">{{ supplier.rating.toFixed(1) }}</b> ({{ supplier.reviews }})</span>
        </div>
      </div>
    </div>

    <p style="margin: 0; font-size: 0.92rem; line-height: 1.5; color: var(--bn-text)">{{ store.t(supplier.headline) }}</p>

    <div class="bn-supplier__tags">
      <span class="bn-badge bn-badge--violet">{{ store.t(supplier.categoryLabel) }}</span>
      <span v-for="cap in supplier.capabilities.slice(0, 2)" :key="cap" class="bn-badge">{{ store.t(capLabel(cap)) }}</span>
      <span v-for="cert in supplier.certifications.slice(0, 2)" :key="cert" class="bn-badge bn-badge--mint"><i class="fa-solid fa-shield-halved"></i>{{ cert }}</span>
    </div>

    <div class="bn-meter">
      <div>{{ store.t("Score") }}<b class="bn-num">{{ supplier.score }}</b><span class="bn-bar"><i :style="{ width: supplier.score + '%' }"></i></span></div>
      <div>{{ store.t("On time") }}<b class="bn-num">{{ supplier.onTime }}%</b><span class="bn-bar"><i :style="{ width: supplier.onTime + '%', background: 'var(--bn-mint)' }"></i></span></div>
      <div>ESG<b class="bn-num">{{ supplier.esg }}</b><span class="bn-bar"><i :style="{ width: supplier.esg + '%', background: 'var(--bn-amber)' }"></i></span></div>
    </div>

    <div class="bn-supplier__foot">
      <span class="bn-muted" style="font-size: 0.82rem">
        <i class="fa-regular fa-clock"></i> {{ store.t("Delivers in") }} <b class="bn-num" style="color: var(--bn-ink)">{{ supplier.leadDays }} {{ store.t(supplier.leadDays === 1 ? "day" : "days") }}</b>
      </span>
      <RouterLink :to="profileLink" class="bn-btn bn-btn--ghost bn-btn--sm">{{ store.t("View profile") }}</RouterLink>
    </div>
  </article>
</template>

<script>
const { inject, computed } = Vue;

export default {
  props: {
    supplier: { type: Object, required: true },
    selectable: { type: Boolean, default: false },
    selected: { type: Boolean, default: false },
    returnQuery: { type: Object, default: () => ({}) },
  },
  emits: ["toggle"],
  setup(props) {
    const store = inject("store");
    const initials = computed(() => props.supplier.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase());
    // The profile keeps the finder's filters so "back to results" restores them.
    const profileLink = computed(() => ({ path: `/marketplace/supplier/${props.supplier.id}`, query: props.returnQuery }));
    const capLabel = (value) => window.BuyniverseMarketplace.capabilityLabel(props.supplier, value);
    return { store, initials, profileLink, capLabel };
  },
};
</script>
