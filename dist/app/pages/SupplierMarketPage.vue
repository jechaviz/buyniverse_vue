<template>
  <div class="bn bn-page">
    <section class="bn-hero" style="padding: 36px 0 8px">
      <div class="bn-hero__glow"></div>
      <div class="bn-wrap bn-stack" style="gap: 14px">
        <!-- The workspace shell already renders the global trail when signed in. -->
        <Breadcrumbs v-if="!store.currentUser.value" :key="catalogVersion" />
        <h1 class="bn-h2">{{ store.t("Find the right supplier for every purchase") }}</h1>
        <p v-if="market.sample" class="bn-badge bn-badge--amber" style="justify-self: start; height: auto; padding: 6px 12px; white-space: normal">
          <i class="fa-solid fa-circle-info"></i>{{ store.t("Sample directory: example profiles while real suppliers are onboarded. Quote rounds invite suppliers from your own workspace.") }}
        </p>
        <p class="bn-lead" style="max-width: 720px">
          {{ store.t("Narrow the market by what you buy and where you need it. Every option shows how many suppliers remain, so you never land on an empty page.") }}
        </p>
      </div>
    </section>

    <div class="bn-wrap bn-finder">
      <aside>
        <button type="button" class="bn-btn bn-btn--ghost bn-filters-toggle" style="width: 100%; margin-bottom: 12px" :aria-expanded="!filtersCollapsed" @click="filtersCollapsed = !filtersCollapsed">
          <i class="fa-solid fa-sliders"></i>{{ store.t(filtersCollapsed ? "Show filters" : "Hide filters") }}<span v-if="chips.length" class="bn-badge bn-badge--violet">{{ chips.length }}</span>
        </button>
        <BnCascadeFilters :filters="filters" :options="options" :collapsed="filtersCollapsed" @change="changeFilter" @reset="resetFilters" />
      </aside>

      <section :aria-label="store.t('Results')" aria-live="polite">
        <div class="bn-results__bar">
          <div>
            <b class="bn-display bn-num" style="font-size: 1.25rem">{{ results.length }}</b>
            <span class="bn-muted" style="margin-left: 6px">{{ store.t(results.length === 1 ? "supplier matches" : "suppliers match") }}</span>
          </div>
          <label class="bn-row" style="gap: 8px">
            <span class="bn-muted" style="font-size: 0.84rem; white-space: nowrap">{{ store.t("Sort by") }}</span>
            <select class="bn-select" style="height: 38px; width: auto" :value="sort" @change="changeSort($event.target.value)">
              <option v-for="option in sortOptions" :key="option.value" :value="option.value">{{ store.t(option.label) }}</option>
            </select>
          </label>
        </div>

        <div v-if="chips.length" class="bn-chips" style="margin-bottom: 16px">
          <button v-for="chip in chips" :key="chip.key" type="button" class="bn-chip bn-chip--active" :aria-label="store.t('Remove filter') + ': ' + chip.label" @click="clearOne(chip.key)">
            {{ store.t(chip.label) }} <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div v-if="results.length" class="bn-grid bn-grid--cards">
          <BnSupplierCard
            v-for="supplier in results"
            :key="supplier.id"
            :supplier="supplier"
            :selectable="canShortlist"
            :selected="shortlist.includes(supplier.id)"
            :return-query="route.query"
            @toggle="toggleShortlist"
          />
        </div>

        <div v-else-if="!catalogReady" class="bn-card bn-empty bn-muted">{{ store.t("Loading suppliers…") }}</div>
        <div v-else class="bn-card bn-empty bn-stack" style="justify-items: center">
          <span class="bn-avatar bn-avatar--violet"><i class="fa-solid fa-satellite"></i></span>
          <h2 class="bn-h3">{{ store.t("No supplier matches every filter") }}</h2>
          <p class="bn-muted" style="margin: 0; max-width: 420px">{{ store.t("Loosen the most specific filter first. Counts next to each option show what remains.") }}</p>
          <div class="bn-row" style="flex-wrap: wrap; justify-content: center">
            <button v-if="lastChip" type="button" class="bn-btn bn-btn--primary bn-btn--sm" @click="clearOne(lastChip.key)">{{ store.t("Remove") }} “{{ store.t(lastChip.label) }}”</button>
            <button type="button" class="bn-btn bn-btn--ghost bn-btn--sm" @click="resetFilters">{{ store.t("Clear all") }}</button>
          </div>
        </div>
      </section>
    </div>

    <!-- Shortlist tray: the bridge from browsing to an actual RFQ. Teleported
         because the page is a size container, which would otherwise pin this
         fixed element to the page instead of the viewport. -->
    <Teleport to="body">
    <div v-if="shortlist.length" class="bn bn-tray" role="region" :aria-label="store.t('Shortlist')">
      <div class="bn-tray__avatars">
        <span v-for="item in shortlistProfiles.slice(0, 4)" :key="item.id" class="bn-avatar" :class="'bn-avatar--' + item.accent">{{ item.name.slice(0, 2).toUpperCase() }}</span>
      </div>
      <div class="bn-tray__text">
        <b>{{ shortlist.length }} {{ store.t(shortlist.length === 1 ? "supplier shortlisted" : "suppliers shortlisted") }}</b>
        <span v-if="shortlist.length < minimumInvites" style="opacity: 0.75">{{ store.t("A quote round needs at least two suppliers.") }}</span>
        <span v-else style="opacity: 0.75">{{ store.t("Invite them to a quote round or a live reverse auction.") }}</span>
      </div>
      <button type="button" class="bn-btn bn-btn--sm" style="background: transparent; color: inherit; border-color: rgba(255,255,255,.25)" @click="clearShortlist">{{ store.t("Clear") }}</button>
      <button type="button" class="bn-btn bn-btn--mint bn-btn--sm" :disabled="shortlist.length < minimumInvites" @click="requestQuotes">
        {{ store.t("Request quotes") }} <i class="fa-solid fa-arrow-right"></i>
      </button>
    </div>
    </Teleport>
  </div>
</template>

<script>
const { inject, computed, ref, onMounted, defineAsyncComponent } = Vue;
const { useRoute, useRouter } = VueRouter;
const load = (p) => defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(p, window.sfcOptions));
const BnCascadeFilters = load("./app/experience/BnCascadeFilters.vue?v=1");
const BnSupplierCard = load("./app/experience/BnSupplierCard.vue?v=1");
const Breadcrumbs = load("./app/components/Breadcrumbs.vue?v=6");

// Same limits the RFQ wizard enforces when it creates the event.
const MINIMUM_INVITES = 2;
const MAXIMUM_INVITES = 50;

export default {
  components: { BnCascadeFilters, BnSupplierCard, Breadcrumbs },
  setup() {
    const store = inject("store");
    const route = useRoute();
    const router = useRouter();
    const M = window.BuyniverseMarketplace;

    // Guests read the public catalog; a workspace with listed suppliers reads its own.
    const catalogVersion = ref(0);
    const catalogReady = ref(M.hasListedSuppliers(store.state));
    onMounted(() => M.loadPublicCatalog().then(() => { catalogVersion.value += 1; catalogReady.value = true; }));
    const market = computed(() => { catalogVersion.value; return M.marketState(store.state); });
    const all = computed(() => M.profiles(market.value.state));
    const known = computed(() => new Set(all.value.map((p) => p.id)));

    // Filters, sort and shortlist all live in the URL: results are linkable,
    // survive reload, and "back" from a profile restores them exactly.
    const filters = computed(() => M.fromQuery(route.query));
    const sort = computed(() => (M.SORTS.includes(route.query.sort) ? route.query.sort : "relevance"));
    const shortlist = computed(() => String(route.query.shortlist || "").split(",").filter((id) => known.value.has(id)).slice(0, MAXIMUM_INVITES));

    const options = computed(() => M.cascade(all.value, filters.value));
    const results = computed(() => M.sortProfiles(M.applyFilters(all.value, filters.value), sort.value));
    const chips = computed(() => M.activeChips(filters.value));
    const lastChip = computed(() => chips.value[chips.value.length - 1] || null);
    const shortlistProfiles = computed(() => shortlist.value.map((id) => all.value.find((p) => p.id === id)).filter(Boolean));
    const filtersCollapsed = ref(true);

    const push = (nextFilters, extra = {}) => {
      const query = M.toQuery(nextFilters, {
        sort: sort.value === "relevance" ? undefined : sort.value,
        shortlist: shortlist.value.length ? shortlist.value.join(",") : undefined,
        ...extra,
      });
      Object.keys(query).forEach((key) => query[key] === undefined && delete query[key]);
      router.replace({ path: "/marketplace", query });
    };

    const changeFilter = (key, value) => push(M.setFilter(filters.value, key, value));
    const clearOne = (key) => push(M.setFilter(filters.value, key, key === "verified" ? false : key === "minScore" || key === "maxLead" ? 0 : ""));
    const resetFilters = () => push(M.emptyFilters());
    const changeSort = (value) => push(filters.value, { sort: value === "relevance" ? undefined : value });

    const toggleShortlist = (id) => {
      const next = shortlist.value.includes(id) ? shortlist.value.filter((x) => x !== id) : shortlist.value.concat(id).slice(0, MAXIMUM_INVITES);
      push(filters.value, { shortlist: next.length ? next.join(",") : undefined });
    };
    const clearShortlist = () => push(filters.value, { shortlist: undefined });

    // Only buyers create quote rounds; suppliers browse the market read-only.
    const canShortlist = computed(() => !store.isSupplier.value);

    const requestQuotes = () => {
      if (shortlist.value.length < MINIMUM_INVITES) return;
      const target = `/procurement/sourcing?new=1&suppliers=${shortlist.value.join(",")}`;
      if (!store.currentUser.value) {
        router.push({ path: "/", query: { auth: "login", returnTo: target } });
        return;
      }
      router.push(target);
    };

    const sortOptions = [
      { value: "relevance", label: "Best match" },
      { value: "score", label: "Supplier score" },
      { value: "rating", label: "Rating" },
      { value: "lead", label: "Fastest delivery" },
      { value: "esg", label: "Sustainability" },
    ];

    return {
      store, route, market, catalogReady, catalogVersion, filters, sort, options, results, chips, lastChip, shortlist, shortlistProfiles, filtersCollapsed,
      changeFilter, clearOne, resetFilters, changeSort, toggleShortlist, clearShortlist, requestQuotes, canShortlist,
      sortOptions, minimumInvites: MINIMUM_INVITES,
    };
  },
};
</script>
