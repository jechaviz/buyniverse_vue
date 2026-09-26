<template>
  <form class="bn-card bn-filters" :class="{ 'bn-filters--collapsed': collapsed }" role="search" :aria-label="store.t('Filter suppliers')" novalidate data-no-validate="true" @submit.prevent="applyKeyword">
    <div class="bn-row" style="justify-content: space-between">
      <span class="bn-filters__title"><i class="fa-solid fa-sliders"></i>{{ store.t("Filters") }}</span>
      <button v-if="activeCount" type="button" class="bn-link" style="background: none; border: 0; cursor: pointer; font-size: 0.84rem" @click="$emit('reset')">
        {{ store.t("Clear all") }} ({{ activeCount }})
      </button>
    </div>

    <div>
      <label class="bn-label" for="bn-f-q">{{ store.t("Keyword") }}</label>
      <input id="bn-f-q" ref="keyword" class="bn-input" type="search" :value="filters.q" maxlength="80" :placeholder="store.t('Name, capability, certification…')" data-optional="true" @input="debouncedQ($event.target.value)" />
    </div>

    <!-- Category: sector -> category -> capability -->
    <fieldset class="bn-filters__group" style="border: 0; padding: 0; margin: 0">
      <legend class="bn-filters__title" style="margin-bottom: 10px"><i class="fa-solid fa-layer-group"></i>{{ store.t("What do you need?") }}</legend>
      <div class="bn-cascade">
        <div v-for="step in categorySteps" :key="step.key" class="bn-cascade__step" :class="{ 'bn-cascade__step--root': step.root }">
          <label class="bn-label" :for="'bn-f-' + step.key">
            <span>{{ store.t(step.label) }}</span>
            <span v-if="step.hint" style="font-weight: 500; color: var(--bn-faint)">{{ store.t(step.hint) }}</span>
          </label>
          <select :id="'bn-f-' + step.key" class="bn-select" :value="filters[step.key]" :disabled="step.disabled" @change="set(step.key, $event.target.value)">
            <option value="">{{ store.t(step.disabled ? step.lockedText : step.anyText) }}</option>
            <option v-for="opt in options[step.key]" :key="opt.value" :value="opt.value" :disabled="opt.count === 0 && filters[step.key] !== opt.value">
              {{ store.t(opt.label) }} ({{ opt.count }})
            </option>
          </select>
        </div>
      </div>
    </fieldset>

    <!-- Location: country -> region -> city -->
    <fieldset class="bn-filters__group" style="border: 0; padding: 0; margin: 0">
      <legend class="bn-filters__title" style="margin-bottom: 10px"><i class="fa-solid fa-earth-americas"></i>{{ store.t("Where should they be?") }}</legend>
      <div class="bn-cascade">
        <div v-for="step in locationSteps" :key="step.key" class="bn-cascade__step" :class="{ 'bn-cascade__step--root': step.root }">
          <label class="bn-label" :for="'bn-f-' + step.key"><span>{{ store.t(step.label) }}</span></label>
          <select :id="'bn-f-' + step.key" class="bn-select" :value="filters[step.key]" :disabled="step.disabled" @change="set(step.key, $event.target.value)">
            <option value="">{{ store.t(step.disabled ? step.lockedText : step.anyText) }}</option>
            <option v-for="opt in options[step.key]" :key="opt.value" :value="opt.value" :disabled="opt.count === 0 && filters[step.key] !== opt.value">
              {{ store.t(opt.label) }} ({{ opt.count }})
            </option>
          </select>
        </div>
      </div>
    </fieldset>

    <fieldset class="bn-filters__group" style="border: 0; padding: 0; margin: 0">
      <legend class="bn-filters__title" style="margin-bottom: 10px"><i class="fa-solid fa-shield-halved"></i>{{ store.t("Qualification") }}</legend>
      <div>
        <label class="bn-label" for="bn-f-cert">{{ store.t("Certification") }}</label>
        <select id="bn-f-cert" class="bn-select" :value="filters.certification" @change="set('certification', $event.target.value)">
          <option value="">{{ store.t("Any certification") }}</option>
          <option v-for="opt in options.certification" :key="opt.value" :value="opt.value" :disabled="opt.count === 0 && filters.certification !== opt.value">{{ opt.label }} ({{ opt.count }})</option>
        </select>
      </div>
      <div>
        <label class="bn-label" for="bn-f-status">{{ store.t("Supplier status") }}</label>
        <select id="bn-f-status" class="bn-select" :value="filters.status" @change="set('status', $event.target.value)">
          <option value="">{{ store.t("Any status") }}</option>
          <option v-for="opt in options.status" :key="opt.value" :value="opt.value" :disabled="opt.count === 0 && filters.status !== opt.value">{{ store.t(opt.label) }} ({{ opt.count }})</option>
        </select>
      </div>
      <div>
        <label class="bn-label" for="bn-f-score"><span>{{ store.t("Minimum score") }}</span><b class="bn-num" style="color: var(--bn-ink)">{{ filters.minScore || store.t("Any") }}</b></label>
        <input id="bn-f-score" class="bn-range" type="range" min="0" max="95" step="5" :value="filters.minScore" data-optional="true" @change="set('minScore', Number($event.target.value))" />
      </div>
      <div>
        <label class="bn-label" for="bn-f-lead"><span>{{ store.t("Maximum lead time") }}</span><b class="bn-num" style="color: var(--bn-ink)">{{ filters.maxLead ? filters.maxLead + " d" : store.t("Any") }}</b></label>
        <input id="bn-f-lead" class="bn-range" type="range" min="0" max="30" step="1" :value="filters.maxLead" data-optional="true" @change="set('maxLead', Number($event.target.value))" />
      </div>
      <label class="bn-check"><input type="checkbox" :checked="filters.verified" @change="set('verified', $event.target.checked)" />{{ store.t("Verified suppliers only") }}</label>
    </fieldset>
  </form>
</template>

<script>
const { inject, computed, ref } = Vue;

export default {
  props: {
    filters: { type: Object, required: true },
    options: { type: Object, required: true },
    collapsed: { type: Boolean, default: false },
  },
  emits: ["change", "reset"],
  setup(props, { emit }) {
    const store = inject("store");

    // The engine clears descendants when a parent changes; the component only
    // reports which control moved.
    const set = (key, value) => emit("change", key, value);
    let timer = null;
    const keyword = ref(null);
    const debouncedQ = (value) => {
      clearTimeout(timer);
      timer = setTimeout(() => set("q", value), 220);
    };
    // Enter applies the keyword at once instead of waiting out the debounce.
    const applyKeyword = () => {
      clearTimeout(timer);
      if (keyword.value) set("q", keyword.value.value);
    };

    const categorySteps = computed(() => [
      { key: "sector", label: "Sector", root: true, disabled: false, anyText: "All sectors" },
      { key: "category", label: "Category", hint: props.filters.sector ? "" : "Pick a sector first", disabled: !props.filters.sector, anyText: "All categories", lockedText: "Choose a sector" },
      { key: "capability", label: "Capability", hint: props.filters.category ? "" : "Pick a category first", disabled: !props.filters.category, anyText: "All capabilities", lockedText: "Choose a category" },
    ]);
    const locationSteps = computed(() => [
      { key: "country", label: "Country", root: true, disabled: false, anyText: "Any country" },
      { key: "region", label: "State / region", disabled: !props.filters.country, anyText: "Any region", lockedText: "Choose a country" },
      { key: "city", label: "City", disabled: !props.filters.region, anyText: "Any city", lockedText: "Choose a region" },
    ]);

    const activeCount = computed(() => window.BuyniverseMarketplace.activeChips(props.filters).length);

    return { store, set, keyword, debouncedQ, applyKeyword, categorySteps, locationSteps, activeCount };
  },
};
</script>
