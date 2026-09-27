<template>
  <div class="bn bn-page">
    <template v-if="supplier">
      <section class="bn-profile-hero">
        <div class="bn-profile-hero__cover"></div>
        <div class="bn-wrap bn-stack" style="gap: 22px">
          <Breadcrumbs v-if="!store.currentUser.value" :key="catalogVersion" />

          <div class="bn-row" style="align-items: flex-start; gap: 20px; flex-wrap: wrap">
            <span class="bn-avatar bn-avatar--lg" :class="'bn-avatar--' + supplier.accent">{{ initials }}</span>
            <div style="flex: 1; min-width: 260px" class="bn-stack">
              <div class="bn-row" style="flex-wrap: wrap; gap: 8px">
                <span v-if="supplier.verified" class="bn-badge bn-badge--violet"><i class="fa-solid fa-circle-check"></i>{{ store.t("Verified supplier") }}</span>
                <span class="bn-badge" :class="statusTone">{{ store.t(supplier.status) }}</span>
                <span class="bn-badge"><i class="fa-regular fa-clock"></i>{{ store.t("Replies in about") }} {{ supplier.responseHours }} h</span>
              </div>
              <h1 class="bn-h2">{{ supplier.name }}</h1>
              <p class="bn-lead" style="max-width: 640px">{{ store.t(supplier.headline) }}</p>
              <div class="bn-row bn-muted" style="flex-wrap: wrap; gap: 6px 18px; font-size: 0.9rem">
                <span><i class="fa-solid fa-location-dot"></i> {{ store.t(supplier.cityLabel) }}, {{ store.t(supplier.regionLabel) }}, {{ store.t(supplier.countryLabel) }}</span>
                <span><i class="fa-solid fa-star" style="color: var(--bn-amber)"></i> <b class="bn-num" style="color: var(--bn-ink)">{{ supplier.rating.toFixed(1) }}</b> · {{ supplier.reviews }} {{ store.t("reviews") }}</span>
                <span><i class="fa-solid fa-users"></i> {{ supplier.employees }} {{ store.t("people") }}</span>
                <span v-if="supplier.founded"><i class="fa-regular fa-calendar"></i> {{ store.t("Since") }} {{ supplier.founded }}</span>
              </div>
            </div>
          </div>

          <nav class="bn-tabs" :aria-label="store.t('Profile sections')">
            <RouterLink v-for="t in tabs" :key="t.key" :to="{ query: { ...route.query, tab: t.key === 'overview' ? undefined : t.key } }" :aria-current="tab === t.key ? 'page' : undefined">
              {{ store.t(t.label) }}<span v-if="t.count !== undefined" class="bn-badge" style="margin-left: 6px; height: 20px">{{ t.count }}</span>
            </RouterLink>
          </nav>
        </div>
      </section>

      <div class="bn-wrap bn-profile">
        <main class="bn-stack" style="gap: 20px">
          <template v-if="tab === 'overview'">
            <section class="bn-card" style="padding: 24px">
              <h2 class="bn-h3" style="margin-bottom: 10px">{{ store.t("About") }}</h2>
              <p style="margin: 0; line-height: 1.7">{{ store.t(supplier.about) }}</p>
            </section>
            <section class="bn-card" style="padding: 24px">
              <h2 class="bn-h3" style="margin-bottom: 14px">{{ store.t("Capabilities") }}</h2>
              <div class="bn-chips">
                <RouterLink v-for="cap in supplier.capabilities" :key="cap" class="bn-chip" :to="{ path: '/marketplace', query: { sector: supplier.sector, category: supplier.category, capability: cap } }">
                  <i class="fa-solid fa-magnifying-glass" style="font-size: 0.75em"></i>{{ store.t(capLabel(cap)) }}
                </RouterLink>
              </div>
              <p class="bn-muted" style="margin: 12px 0 0; font-size: 0.84rem">{{ store.t("Select a capability to see every supplier who offers it.") }}</p>
            </section>
            <section class="bn-card" style="padding: 24px">
              <h2 class="bn-h3" style="margin-bottom: 14px">{{ store.t("Commercial terms") }}</h2>
              <dl class="bn-kv" style="margin: 0">
                <div><dt>{{ store.t("Typical lead time") }}</dt><dd class="bn-num">{{ supplier.leadDays }} {{ store.t(supplier.leadDays === 1 ? "day" : "days") }}</dd></div>
                <div><dt>{{ store.t("Minimum order") }}</dt><dd class="bn-num">{{ supplier.minOrder ? store.money(supplier.minOrder, supplier.currency) : store.t("No minimum") }}</dd></div>
                <div><dt>{{ store.t("Coverage") }}</dt><dd>{{ store.t(supplier.coverage) }}</dd></div>
                <div><dt>{{ store.t("Languages") }}</dt><dd>{{ supplier.languages.map((l) => store.t(l)).join(", ") }}</dd></div>
              </dl>
            </section>
          </template>

          <section v-else-if="tab === 'catalog'" class="bn-card" style="padding: 24px">
            <h2 class="bn-h3" style="margin-bottom: 6px">{{ store.t("Catalog offers") }}</h2>
            <p class="bn-muted" style="margin: 0 0 16px; font-size: 0.9rem">{{ store.t("Live prices this supplier holds on the Buyniverse catalog, compared with the reference price.") }}</p>
            <div v-if="supplier.offers.length" class="bn-scroll-x">
              <table class="bn-table">
                <thead><tr><th>{{ store.t("Item") }}</th><th>{{ store.t("Price") }}</th><th>{{ store.t("vs reference") }}</th><th>{{ store.t("Lead time") }}</th><th>{{ store.t("Terms") }}</th><th>{{ store.t("Compliance") }}</th></tr></thead>
                <tbody>
                  <tr v-for="row in supplier.offers" :key="row.offer.id">
                    <td><b style="display: block">{{ store.t(row.product.description) }}</b><span class="bn-muted" style="font-size: 0.78rem">{{ row.product.sku }} · {{ store.t(row.product.unit) }}</span></td>
                    <td class="bn-num"><b>{{ store.money(row.offer.price, row.product.currency) }}</b></td>
                    <td class="bn-num"><span class="bn-badge" :class="row.offer.price <= row.product.referencePrice ? 'bn-badge--mint' : 'bn-badge--coral'">{{ delta(row) }}</span></td>
                    <td class="bn-num">{{ row.offer.leadDays }} d</td>
                    <td>{{ row.offer.terms }}</td>
                    <td><span class="bn-badge" :class="row.offer.compliant ? 'bn-badge--mint' : 'bn-badge--coral'">{{ store.t(row.offer.compliant ? "Compliant" : "Not compliant") }}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="bn-muted" style="margin: 0">{{ store.t("This supplier quotes per request rather than from a catalog. Invite them to a quote round.") }}</p>
          </section>

          <section v-else class="bn-card" style="padding: 24px">
            <h2 class="bn-h3" style="margin-bottom: 18px">{{ store.t("Performance") }}</h2>
            <div class="bn-row" style="gap: 28px; flex-wrap: wrap; align-items: center">
              <div class="bn-score-ring" :style="{ background: `conic-gradient(var(--bn-violet) ${supplier.score * 3.6}deg, var(--bn-surface-2) 0)` }">
                <span><span><b class="bn-display bn-num" style="font-size: 1.9rem; display: block; line-height: 1">{{ supplier.score }}</b><small class="bn-muted">{{ store.t("Score") }}</small></span></span>
              </div>
              <div style="flex: 1; min-width: 240px" class="bn-stack">
                <div v-for="metric in metrics" :key="metric.label">
                  <div class="bn-label" style="margin-bottom: 4px"><span>{{ store.t(metric.label) }}</span><b class="bn-num" style="color: var(--bn-ink)">{{ metric.value }}{{ metric.unit }}</b></div>
                  <div class="bn-bar" style="height: 8px"><i :style="{ width: metric.bar + '%', background: metric.color }"></i></div>
                </div>
              </div>
            </div>
            <hr class="bn-divider" style="margin: 22px 0" />
            <dl class="bn-kv" style="margin: 0">
              <div><dt>{{ store.t("Quote rounds answered") }}</dt><dd class="bn-num">{{ supplier.quoteCount }}</dd></div>
              <div><dt>{{ store.t("Awards won") }}</dt><dd class="bn-num">{{ supplier.awardCount }}</dd></div>
              <div><dt>{{ store.t("Certifications") }}</dt><dd>{{ supplier.certifications.join(", ") || store.t("None declared") }}</dd></div>
              <div><dt>{{ store.t("Risk level") }}</dt><dd>{{ store.t(riskLabel) }}</dd></div>
            </dl>
          </section>
        </main>

        <aside class="bn-profile__aside bn-stack" style="gap: 16px">
          <div class="bn-card bn-stack" style="padding: 22px; gap: 14px">
            <div class="bn-row" style="justify-content: space-between">
              <span class="bn-muted" style="font-size: 0.85rem">{{ store.t("Minimum order") }}</span>
              <b class="bn-display bn-num" style="font-size: 1.3rem">{{ supplier.minOrder ? store.money(supplier.minOrder, supplier.currency) : store.t("No minimum") }}</b>
            </div>
            <template v-if="canShortlist">
              <button type="button" class="bn-btn bn-btn--primary bn-btn--lg" style="width: 100%" @click="requestQuote">
                <i class="fa-solid fa-file-signature"></i>{{ store.t(shortlistWithThis.length >= 2 ? "Request quotes from shortlist" : "Request a quote") }}
              </button>
              <button type="button" class="bn-btn bn-btn--ghost" style="width: 100%" :aria-pressed="inShortlist" @click="toggleShortlist">
                <i class="fa-solid" :class="inShortlist ? 'fa-check' : 'fa-plus'"></i>{{ store.t(inShortlist ? "In your shortlist" : "Add to shortlist") }}
              </button>
              <p class="bn-muted" style="margin: 0; font-size: 0.8rem; line-height: 1.5">
                {{ shortlistWithThis.length >= 2
                  ? store.t("Your shortlist will be invited together, so their offers are compared side by side.")
                  : store.t("Quote rounds compare at least two suppliers. Add one more from the marketplace to compare offers.") }}
              </p>
            </template>
            <p v-else class="bn-muted" style="margin: 0; font-size: 0.85rem">{{ store.t("Switch to your buyer workspace to invite this supplier to a quote round.") }}</p>
          </div>

          <div v-if="similar.length" class="bn-card" style="padding: 20px">
            <h2 class="bn-h3" style="margin-bottom: 12px; font-size: 1rem">{{ store.t("Similar suppliers") }}</h2>
            <div class="bn-stack" style="gap: 10px">
              <RouterLink v-for="item in similar" :key="item.id" :to="{ path: `/marketplace/supplier/${item.id}`, query: backQuery }" class="bn-row" style="text-decoration: none; color: inherit">
                <span class="bn-avatar" :class="'bn-avatar--' + item.accent" style="width: 38px; height: 38px; border-radius: 12px; font-size: 0.8rem">{{ item.name.slice(0, 2).toUpperCase() }}</span>
                <span style="min-width: 0; flex: 1"><b style="display: block; font-size: 0.9rem">{{ item.name }}</b><span class="bn-muted" style="font-size: 0.78rem">{{ store.t(item.cityLabel) }} · {{ store.t("Score") }} {{ item.score }}</span></span>
                <i class="fa-solid fa-chevron-right bn-muted" style="font-size: 0.7rem"></i>
              </RouterLink>
            </div>
          </div>
        </aside>
      </div>
    </template>

    <div v-else-if="!catalogReady" class="bn-wrap bn-muted" style="padding: 80px 20px">{{ store.t("Loading suppliers…") }}</div>
    <div v-else class="bn-wrap" style="padding: 80px 20px">
      <div class="bn-card bn-empty bn-stack" style="justify-items: center">
        <h1 class="bn-h3">{{ store.t("This supplier is not listed") }}</h1>
        <p class="bn-muted" style="margin: 0">{{ store.t("They may have left the marketplace or the link is incomplete.") }}</p>
        <RouterLink to="/marketplace" class="bn-btn bn-btn--primary bn-btn--sm">{{ store.t("Browse suppliers") }}</RouterLink>
      </div>
    </div>
  </div>
</template>

<script>
const { inject, computed, ref, onMounted, defineAsyncComponent } = Vue;
const { useRoute, useRouter } = VueRouter;
const load = (p) => defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(p, window.sfcOptions));
const Breadcrumbs = load("./app/components/Breadcrumbs.vue?v=6");

export default {
  components: { Breadcrumbs },
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
    const supplier = computed(() => all.value.find((p) => p.id === route.params.supplierId) || null);
    const known = computed(() => new Set(all.value.map((p) => p.id)));
    const shortlist = computed(() => String(route.query.shortlist || "").split(",").filter((id) => known.value.has(id)).slice(0, 50));
    const inShortlist = computed(() => Boolean(supplier.value) && shortlist.value.includes(supplier.value.id));
    const shortlistWithThis = computed(() => (supplier.value && !inShortlist.value ? shortlist.value.concat(supplier.value.id) : shortlist.value));

    // Everything the finder put in the URL except this page's own tab.
    const backQuery = computed(() => {
      const query = { ...route.query };
      delete query.tab;
      return query;
    });

    const tab = computed(() => (["catalog", "performance"].includes(route.query.tab) ? route.query.tab : "overview"));
    const tabs = computed(() => [
      { key: "overview", label: "Overview" },
      { key: "catalog", label: "Catalog", count: supplier.value ? supplier.value.offers.length : 0 },
      { key: "performance", label: "Performance" },
    ]);

    const initials = computed(() => (supplier.value ? supplier.value.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() : ""));
    const capLabel = (value) => M.capabilityLabel(supplier.value, value);
    const statusTone = computed(() => ({ Preferred: "bn-badge--mint", Reliable: "bn-badge--violet", Qualified: "bn-badge--violet", "In review": "bn-badge--amber" }[supplier.value?.status] || ""));
    const riskLabel = computed(() => {
      const risk = supplier.value?.risk || 0;
      return risk < 20 ? "Low" : risk < 32 ? "Moderate" : "Elevated";
    });
    const metrics = computed(() => {
      const s = supplier.value;
      if (!s) return [];
      return [
        { label: "On-time delivery", value: s.onTime, unit: "%", bar: s.onTime, color: "var(--bn-mint)" },
        { label: "Response rate", value: s.responseRate, unit: "%", bar: s.responseRate, color: "var(--bn-violet)" },
        { label: "Sustainability (ESG)", value: s.esg, unit: "", bar: s.esg, color: "var(--bn-amber)" },
        { label: "Risk (lower is better)", value: s.risk, unit: "", bar: s.risk, color: "var(--bn-coral)" },
      ];
    });
    const delta = (row) => {
      const ref = Number(row.product.referencePrice) || 0;
      if (!ref) return "—";
      const pct = ((row.offer.price - ref) / ref) * 100;
      return `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`;
    };

    const similar = computed(() => {
      if (!supplier.value) return [];
      return M.sortProfiles(all.value.filter((p) => p.id !== supplier.value.id && p.category === supplier.value.category), "relevance")
        .concat(M.sortProfiles(all.value.filter((p) => p.id !== supplier.value.id && p.sector === supplier.value.sector && p.category !== supplier.value.category), "relevance"))
        .slice(0, 4);
    });

    const canShortlist = computed(() => !store.isSupplier.value);
    const toggleShortlist = () => {
      if (!supplier.value) return;
      const next = inShortlist.value ? shortlist.value.filter((id) => id !== supplier.value.id) : shortlist.value.concat(supplier.value.id);
      router.replace({ query: { ...route.query, shortlist: next.length ? next.join(",") : undefined } });
    };
    const requestQuote = () => {
      const ids = shortlistWithThis.value;
      const target = `/procurement/sourcing?new=1&suppliers=${ids.join(",")}`;
      if (ids.length < 2) {
        // A round needs two suppliers: keep this one and send the buyer back to choose another.
        router.push({ path: "/marketplace", query: { sector: supplier.value.sector, category: supplier.value.category, shortlist: ids.join(",") } });
        store.notice("Pick at least one more supplier to compare offers", "fa-circle-info");
        return;
      }
      if (!store.currentUser.value) return router.push({ path: "/", query: { auth: "login", returnTo: target } });
      router.push(target);
    };

    return { store, route, catalogReady, catalogVersion, supplier, tab, tabs, backQuery, initials, capLabel, statusTone, riskLabel, metrics, delta, similar, canShortlist, inShortlist, shortlistWithThis, toggleShortlist, requestQuote };
  },
};
</script>
