<template>
  <div class="bn bn-page">
    <!-- 1. Hero: the brand universe, with every listed supplier in orbit -->
    <section class="bn-hero">
      <div class="bn-hero__glow"></div>
      <div class="bn-wrap bn-hero__grid">
        <div class="bn-stack" style="gap: 22px">
          <span class="bn-badge bn-badge--mint" style="justify-self: start"><span class="bn-dot bn-live"></span>{{ store.t("Live reverse auctions running now") }}</span>
          <h1 class="bn-h1" v-if="supplierMode">{{ store.t("Win corporate buyers") }} <span class="bn-grad">{{ store.t("without cold calls.") }}</span></h1>
          <h1 class="bn-h1" v-else>{{ store.t("Every purchase your company makes,") }} <span class="bn-grad">{{ store.t("one universe of suppliers.") }}</span></h1>
          <p class="bn-lead" style="max-width: 560px">
            {{ supplierMode
              ? store.t("Answer published requests from verified companies, compete in transparent reverse auctions and get paid through escrow.")
              : store.t("Find and compare verified suppliers for software, hardware, services, MRO, packaging and freight. Shortlist them, run a quote round or a live reverse auction, and pay through escrow.") }}
          </p>

          <form class="bn-search" role="search" novalidate data-no-validate="true" @submit.prevent="search">
            <label class="bn-sr" for="bn-home-q">{{ store.t("What are you looking for?") }}</label>
            <input id="bn-home-q" v-model="query" class="bn-input" type="search" maxlength="80" data-optional="true" :placeholder="store.t(supplierMode ? 'Search open projects' : 'Laptops, SOC audit, recycled mailers…')" />
            <label class="bn-sr" for="bn-home-sector">{{ store.t("Sector") }}</label>
            <select v-if="!supplierMode" id="bn-home-sector" v-model="sector" class="bn-select">
              <option value="">{{ store.t("All sectors") }}</option>
              <option v-for="s in sectors" :key="s.value" :value="s.value">{{ store.t(s.label) }}</option>
            </select>
            <button type="submit" class="bn-btn bn-btn--primary bn-btn--lg"><i class="fa-solid fa-magnifying-glass"></i>{{ store.t("Search") }}</button>
          </form>

          <div class="bn-chips">
            <span class="bn-muted" style="font-size: 0.82rem; align-self: center">{{ store.t("Popular") }}:</span>
            <RouterLink v-for="p in popular" :key="p.label" class="bn-chip" :to="p.to">{{ store.t(p.label) }}</RouterLink>
          </div>

          <div class="bn-stats" style="margin-top: 6px">
            <div class="bn-stat"><b class="bn-num">{{ suppliers.length }}</b><span>{{ store.t("verified-ready suppliers") }}</span></div>
            <div class="bn-stat"><b class="bn-num">{{ averageScore }}</b><span>{{ store.t("average supplier score") }}</span></div>
            <div class="bn-stat"><b class="bn-num">{{ countries }}</b><span>{{ store.t("countries covered") }}</span></div>
          </div>
        </div>
        <BnUniverse :nodes="nodes" />
      </div>
    </section>

    <!-- 2. Browse by sector -->
    <section class="bn-section">
      <div class="bn-wrap">
        <div class="bn-section__head">
          <div class="bn-stack" style="gap: 8px">
            <span class="bn-eyebrow">{{ store.t("Every class of acquisition") }}</span>
            <h2 class="bn-h2">{{ store.t("Browse by what you buy") }}</h2>
          </div>
          <RouterLink to="/marketplace" class="bn-btn bn-btn--ghost">{{ store.t("All suppliers") }} <i class="fa-solid fa-arrow-right"></i></RouterLink>
        </div>
        <div class="bn-grid bn-grid--4">
          <RouterLink v-for="s in sectors" :key="s.value" :to="{ path: '/marketplace', query: { sector: s.value } }" class="bn-card bn-card--hover bn-sector">
            <span class="bn-sector__icon" :style="{ background: s.soft, color: s.color }"><i class="fa-solid" :class="s.icon"></i></span>
            <span class="bn-stack" style="gap: 4px">
              <b class="bn-display" style="font-size: 1.1rem; color: var(--bn-ink)">{{ store.t(s.label) }}</b>
              <span class="bn-muted" style="font-size: 0.85rem; line-height: 1.45">{{ s.children.map((c) => store.t(c.label)).join(" · ") }}</span>
            </span>
            <span class="bn-row" style="margin-top: auto; justify-content: space-between; font-size: 0.84rem">
              <span class="bn-muted"><b class="bn-num" style="color: var(--bn-ink)">{{ s.count }}</b> {{ store.t("suppliers") }}</span>
              <i class="fa-solid fa-arrow-right" :style="{ color: s.color }"></i>
            </span>
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- 3. Top suppliers (link to the public directory profile, never to an internal identity record) -->
    <section class="bn-section bn-section--tint">
      <div class="bn-wrap">
        <div class="bn-section__head">
          <div class="bn-stack" style="gap: 8px">
            <span class="bn-eyebrow">{{ store.t("Top rated this month") }}</span>
            <h2 class="bn-h2">{{ store.t("Suppliers buyers keep coming back to") }}</h2>
          </div>
          <RouterLink to="/marketplace?sort=score" class="bn-btn bn-btn--ghost">{{ store.t("See the ranking") }} <i class="fa-solid fa-arrow-right"></i></RouterLink>
        </div>
        <div class="bn-grid bn-grid--3">
          <BnSupplierCard v-for="supplier in topSuppliers" :key="supplier.id" :supplier="supplier" />
        </div>
      </div>
    </section>

    <!-- 4. How it works -->
    <section class="bn-section">
      <div class="bn-wrap">
        <div class="bn-section__head">
          <div class="bn-stack" style="gap: 8px">
            <span class="bn-eyebrow">{{ store.t("How Buyniverse works") }}</span>
            <h2 class="bn-h2">{{ store.t("From need to paid invoice, in one place") }}</h2>
          </div>
        </div>
        <div class="bn-grid bn-grid--3">
          <article v-for="(step, i) in steps" :key="step.title" class="bn-card bn-step bn-stack" style="gap: 12px">
            <span class="bn-step__n">0{{ i + 1 }}</span>
            <span class="bn-sector__icon" :style="{ background: step.soft, color: step.color }"><i class="fa-solid" :class="step.icon"></i></span>
            <h3 class="bn-h3">{{ store.t(step.title) }}</h3>
            <p class="bn-muted" style="margin: 0; line-height: 1.6">{{ store.t(step.body) }}</p>
          </article>
        </div>
        <video v-if="filmAvailable" class="bn-video" style="margin-top: 28px" src="assets/media/buyniverse-marketplace.mp4" poster="assets/brand/buyniverse-mark-1024.png" controls preload="none" playsinline :aria-label="store.t('How Buyniverse works, 20 second film')"></video>
      </div>
    </section>

    <!-- 5. Open opportunities: only explicitly published, non-confidential records -->
    <section v-if="featuredJobs.length || supplierMode" class="bn-section bn-section--tint">
      <div class="bn-wrap">
        <div class="bn-section__head">
          <div class="bn-stack" style="gap: 8px">
            <span class="bn-eyebrow">{{ store.t("Open opportunities") }}</span>
            <h2 class="bn-h2">{{ store.t("Projects published by verified buyers") }}</h2>
          </div>
          <div v-if="supplierMode" class="bn-lang" role="tablist" :aria-label="store.t('Opportunities')">
            <button v-for="key in ['search', 'saved']" :key="key" type="button" role="tab" :aria-selected="tab === key" :aria-pressed="tab === key" @click="openTab(key)">{{ store.t(key === "saved" ? "Saved" : "Open") }}</button>
          </div>
        </div>
        <div v-if="visibleJobs.length" class="bn-grid bn-grid--3">
          <article v-for="job in visibleJobs" :key="job.id" class="bn-card bn-card--hover bn-stack" style="padding: 22px; gap: 12px">
            <div class="bn-row" style="justify-content: space-between">
              <span class="bn-badge bn-badge--violet">{{ store.t(job.category) }}</span>
              <button v-if="supplierMode" type="button" class="bn-icon-btn" style="width: 34px; height: 34px" :aria-pressed="isSaved(job.id)" :aria-label="store.t(isSaved(job.id) ? 'Remove from saved' : 'Save project')" @click="store.toggleSavedJob(job.id)">
                <i :class="isSaved(job.id) ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark'" style="color: var(--bn-violet)"></i>
              </button>
            </div>
            <RouterLink :to="`/job/${job.id}`" class="bn-h3" style="text-decoration: none">{{ store.t(job.title) }}</RouterLink>
            <div class="bn-supplier__tags"><span v-for="skill in (job.skills || []).slice(0, 3)" :key="skill" class="bn-badge">{{ skill }}</span></div>
            <div class="bn-supplier__foot">
              <span class="bn-muted" style="font-size: 0.82rem">{{ store.t("Budget") }} <b class="bn-num" style="color: var(--bn-ink)">{{ store.money(job.budget, job.currency) }}</b></span>
              <span class="bn-muted" style="font-size: 0.82rem">{{ (job.proposals || []).length }} {{ store.t("proposals") }}</span>
            </div>
          </article>
        </div>
        <p v-else class="bn-card bn-empty bn-muted" style="margin: 0">{{ store.t(tab === "saved" ? "You have not saved any open project yet." : "No public projects are open right now.") }}</p>
      </div>
    </section>

    <!-- 6. Closing call to action -->
    <section class="bn-section">
      <div class="bn-wrap">
        <div class="bn-card" style="padding: clamp(28px, 5vw, 56px); background: radial-gradient(80% 140% at 100% 0%, color-mix(in srgb, var(--bn-violet) 28%, var(--bn-surface)), var(--bn-surface)); display: grid; gap: 18px">
          <h2 class="bn-h2" style="max-width: 720px">{{ store.t(supplierMode ? "Put your company in front of buyers who are ready to purchase." : "You only pay a share of the savings we find. No savings, no fee.") }}</h2>
          <div class="bn-row" style="flex-wrap: wrap">
            <RouterLink v-if="supplierMode" to="/onboarding" class="bn-btn bn-btn--primary bn-btn--lg">{{ store.t("List your company") }}</RouterLink>
            <RouterLink v-else to="/marketplace" class="bn-btn bn-btn--primary bn-btn--lg">{{ store.t("Start comparing suppliers") }}</RouterLink>
            <RouterLink to="/procurement/auction" class="bn-btn bn-btn--ghost bn-btn--lg"><span class="bn-dot bn-live" style="color: var(--bn-mint)"></span>{{ store.t("Watch a live auction") }}</RouterLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
const { inject, ref, computed, onMounted, defineAsyncComponent } = Vue;
const { useRoute, useRouter } = VueRouter;
const load = (p) => defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(p, window.sfcOptions));
const BnUniverse = load("./app/experience/BnUniverse.vue?v=1");
const BnSupplierCard = load("./app/experience/BnSupplierCard.vue?v=1");

const FILM_READY = true;

const SECTOR_STYLE = {
  technology: { color: "#6d4aff", soft: "color-mix(in srgb, #6d4aff 14%, transparent)" },
  services: { color: "#f0456a", soft: "color-mix(in srgb, #f0456a 14%, transparent)" },
  operations: { color: "#f29a12", soft: "color-mix(in srgb, #f29a12 16%, transparent)" },
  logistics: { color: "#0fb887", soft: "color-mix(in srgb, #0fb887 16%, transparent)" },
};

export default {
  components: { BnUniverse, BnSupplierCard },
  setup() {
    const store = inject("store");
    const route = useRoute();
    const router = useRouter();
    const M = window.BuyniverseMarketplace;

    const supplierMode = computed(() => Boolean(store.isSupplier.value));
    // Guests read the public catalog; a workspace with listed suppliers reads its own.
    const catalogVersion = ref(0);
    const catalogReady = ref(M.hasListedSuppliers(store.state));
    onMounted(() => M.loadPublicCatalog().then(() => { catalogVersion.value += 1; catalogReady.value = true; }));
    const market = computed(() => { catalogVersion.value; return M.marketState(store.state); });
    const suppliers = computed(() => M.profiles(market.value.state));
    const nodes = computed(() => suppliers.value.map((s) => ({ id: s.id, sector: s.sector, score: s.score })));
    const averageScore = computed(() => (suppliers.value.length ? Math.round(suppliers.value.reduce((sum, s) => sum + s.score, 0) / suppliers.value.length) : 0));
    const countries = computed(() => new Set(suppliers.value.map((s) => s.country)).size);

    const sectors = computed(() => M.TAXONOMY.map((node) => ({
      ...node,
      ...SECTOR_STYLE[node.value],
      count: suppliers.value.filter((s) => s.sector === node.value).length,
    })));
    const topSuppliers = computed(() => M.sortProfiles(suppliers.value, "relevance").slice(0, 6));

    const query = ref("");
    const sector = ref("");
    const search = () => {
      const q = query.value.trim();
      if (supplierMode.value) return router.push({ path: "/find-work", query: q ? { q } : {} });
      router.push({ path: "/marketplace", query: M.toQuery({ q, sector: sector.value }) });
    };

    const popular = [
      { label: "Laptops & endpoints", to: "/marketplace?sector=technology&category=hardware" },
      { label: "Security audit", to: "/marketplace?sector=technology&category=cybersecurity&capability=security-audit" },
      { label: "Sustainable packaging", to: "/marketplace?sector=operations&category=packaging&capability=sustainable-packaging" },
      { label: "Customs brokerage", to: "/marketplace?sector=logistics&category=trade" },
      { label: "Suppliers in Monterrey", to: "/marketplace?country=MX&region=NL&city=monterrey" },
    ];

    const steps = [
      { title: "Filter and shortlist", body: "Narrow the market by sector, capability, location and certification. Shortlist the suppliers that fit.", icon: "fa-filter", color: "#6d4aff", soft: "color-mix(in srgb, #6d4aff 14%, transparent)" },
      { title: "Quote round or live auction", body: "Invite your shortlist to a quote round, or let them bid down in a blind reverse auction with anti-sniping.", icon: "fa-gavel", color: "#f29a12", soft: "color-mix(in srgb, #f29a12 16%, transparent)" },
      { title: "Award, receive and pay", body: "Award with an audit trail, match order, receipt and CFDI invoice, and release escrow when it all reconciles.", icon: "fa-file-invoice-dollar", color: "#0fb887", soft: "color-mix(in srgb, #0fb887 16%, transparent)" },
    ];

    // Route-backed tab so "saved" is linkable and survives reload.
    const tab = computed(() => (route.query.view === "saved" ? "saved" : "search"));
    const openTab = (key) =>
      router.push({
        path: route.path,
        query: window.WebCommon ? window.WebCommon.mergeRouteQuery(route.query, { view: key === "saved" ? "saved" : null }) : { view: key === "saved" ? "saved" : undefined },
      });

    // The homepage is discovery, never a shortcut into a tenant's private
    // backlog. Only deliberately published marketplace opportunities belong
    // here; RFX and internal projects stay inside their authorized workspace.
    const featuredJobs = computed(() => {
      const jobs = typeof store.scopedRecords === "function" ? store.scopedRecords(store.state.jobs || []) : store.state.jobs || [];
      return jobs.filter((job) => job?.status === "OPEN" && job?.visibility === "public" && job?.confidential !== true).slice(0, 6);
    });
    const isSaved = (id) => (store.state.savedJobIds || []).includes(id);
    const visibleJobs = computed(() => (tab.value === "saved" ? featuredJobs.value.filter((job) => isSaved(job.id)) : featuredJobs.value));

    // Flip once tools/marketplace-film has been rendered to assets/media.
    // A static flag rather than a HEAD probe, which logs a 404 when absent.
    const filmAvailable = FILM_READY;

    return { store, supplierMode, suppliers, nodes, averageScore, countries, sectors, topSuppliers, query, sector, search, popular, steps, tab, openTab, featuredJobs, visibleJobs, isSaved, filmAvailable };
  },
};
</script>
