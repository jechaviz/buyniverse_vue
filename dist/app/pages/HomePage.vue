<template>
  <div class="bn bn-page">
    <!-- 1. Hero: a cinematic purchasing universe; every listed supplier is a node on its trade routes -->
    <BnNeedHero v-if="!supplierMode" :suppliers="suppliers" />
    <section v-else class="bn-cinema">
      <div class="bn-wrap">
        <div class="bn-cinema__copy">
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
      </div>
    </section>

    <!-- 2. Proof: three numbers, nothing boxed -->
    <section v-if="!supplierMode" class="hp-proof">
      <div class="bn-wrap hp-proof__row">
        <div class="hp-reveal"><b><AnimatedNumber :value="suppliers.length" /></b><span>{{ store.t("verified-ready suppliers") }}</span></div>
        <div class="hp-reveal" style="--i: 1"><b><AnimatedNumber :value="averageScore" /></b><span>{{ store.t("average supplier score") }}</span></div>
        <div class="hp-reveal" style="--i: 2"><b><AnimatedNumber :value="countries" /></b><span>{{ store.t("countries covered") }}</span></div>
        <div class="hp-reveal" style="--i: 3"><b>0%</b><span>{{ store.t("commission if there are no savings") }}</span></div>
      </div>
    </section>

    <!-- 3. The journey -->
    <section class="hp-section" id="how-it-works">
      <div class="bn-wrap">
        <p class="hp-eyebrow">{{ store.t("How Buyniverse works") }}</p>
        <h2 class="hp-h2">{{ store.t("From need to paid invoice, in one place") }}</h2>
        <ol class="hp-steps">
          <li v-for="(step, index) in journey" :key="step.key" class="hp-reveal" :style="{ '--c': step.color, '--i': index }">
            <span class="hp-steps__node"></span>
            <b class="hp-steps__n">0{{ step.n }}</b>
            <h3>{{ store.t(step.verb) }}</h3>
            <p>{{ store.t(step.body) }}</p>
          </li>
        </ol>
        <video v-if="filmAvailable" class="hp-film hp-reveal" src="assets/media/buyniverse-marketplace.mp4" poster="assets/brand/buyniverse-mark-1024.png?v=3" controls preload="none" playsinline :aria-label="store.t('How Buyniverse works, 20 second film')"></video>
      </div>
    </section>

    <!-- 4. Suppliers buyers keep coming back to -->
    <section v-if="!supplierMode" class="hp-section hp-section--tint">
      <div class="bn-wrap">
        <div class="hp-head">
          <div>
            <p class="hp-eyebrow">{{ store.t("Top rated this month") }}</p>
            <h2 class="hp-h2">{{ store.t("Suppliers buyers keep coming back to") }}</h2>
          </div>
          <RouterLink to="/marketplace?sort=score" class="hp-more">{{ store.t("See the ranking") }} <i class="fa-solid fa-arrow-right"></i></RouterLink>
        </div>
        <ul class="hp-sups">
          <li v-for="supplier in topSuppliers" :key="supplier.id">
            <RouterLink :to="`/marketplace/supplier/${supplier.id}`" class="hp-sup">
              <span class="hp-sup__av">{{ initials(supplier.name) }}</span>
              <span class="hp-sup__t"><b>{{ supplier.name }}<i v-if="supplier.verified" class="fa-solid fa-circle-check" :title="store.t('Verified supplier')"></i></b><small>{{ store.t(supplier.categoryLabel) }} · {{ store.t(supplier.cityLabel) }}</small></span>
              <span class="hp-sup__score"><b>{{ supplier.score }}</b><small>{{ store.t("Score") }}</small></span>
            </RouterLink>
          </li>
        </ul>
      </div>
    </section>

    <!-- 5. Open opportunities (for suppliers): only explicitly published, non-confidential records -->
    <section v-if="supplierMode" class="hp-section">
      <div class="bn-wrap">
        <div class="hp-head">
          <div>
            <p class="hp-eyebrow">{{ store.t("Open opportunities") }}</p>
            <h2 class="hp-h2">{{ store.t("Projects published by verified buyers") }}</h2>
          </div>
          <div class="bn-lang" role="tablist" :aria-label="store.t('Opportunities')">
            <button v-for="key in ['search', 'saved']" :key="key" type="button" role="tab" :aria-selected="tab === key" :aria-pressed="tab === key" @click="openTab(key)">{{ store.t(key === "saved" ? "Saved" : "Open") }}</button>
          </div>
        </div>
        <ul v-if="visibleJobs.length" class="hp-sups">
          <li v-for="job in visibleJobs" :key="job.id">
            <RouterLink :to="`/job/${job.id}`" class="hp-sup">
              <span class="hp-sup__av"><i class="fa-solid fa-briefcase"></i></span>
              <span class="hp-sup__t"><b>{{ store.t(job.title) }}</b><small>{{ store.t(job.category) }} · {{ (job.proposals || []).length }} {{ store.t("proposals") }}</small></span>
              <span class="hp-sup__score"><b>{{ store.money(job.budget, job.currency) }}</b><small>{{ store.t("Budget") }}</small></span>
            </RouterLink>
            <button type="button" class="hp-save" :aria-pressed="isSaved(job.id)" :aria-label="store.t(isSaved(job.id) ? 'Remove from saved' : 'Save project')" @click="store.toggleSavedJob(job.id)"><i :class="isSaved(job.id) ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark'"></i></button>
          </li>
        </ul>
        <p v-else class="hp-empty">{{ store.t(tab === "saved" ? "You have not saved any open project yet." : "No public projects are open right now.") }}</p>
      </div>
    </section>

    <!-- 6. Closing call to action -->
    <section class="hp-cta">
      <div class="bn-wrap">
        <h2 class="hp-cta__h">{{ store.t(supplierMode ? "Put your company in front of buyers who are ready to purchase." : "Publish once. Let them compete.") }}</h2>
        <p class="hp-cta__p">{{ store.t(supplierMode ? "Answer verified requests and get paid through escrow." : "You only pay a share of the savings we find. No savings, no fee.") }}</p>
        <div class="hp-cta__row">
          <RouterLink v-if="supplierMode" to="/onboarding" class="hp-go">{{ store.t("List your company") }}</RouterLink>
          <RouterLink v-else to="/necesito" class="hp-go">{{ store.t("I need…") }} →</RouterLink>
          <RouterLink to="/procurement/auction" class="hp-more"><span class="hp-live"></span>{{ store.t("Watch a live auction") }}</RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
const { inject, ref, computed, onMounted, onBeforeUnmount, defineAsyncComponent } = Vue;
const { useRoute, useRouter } = VueRouter;
const load = (p) => defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(p, window.sfcOptions));
const BnNeedHero = load("./app/experience/BnNeedHero.vue?v=3");
const AnimatedNumber = load("./app/components/AnimatedNumber.vue?v=1");

// The explainer film still shows the previous brand mark; it returns once it is re-rendered with the ring and the dot.
const FILM_READY = false;

const SECTOR_STYLE = {
  technology: { color: "#3f6af2", soft: "color-mix(in srgb, #3f6af2 14%, transparent)" },
  services: { color: "#f0456a", soft: "color-mix(in srgb, #f0456a 14%, transparent)" },
  operations: { color: "#f29a12", soft: "color-mix(in srgb, #f29a12 16%, transparent)" },
  logistics: { color: "#0fb887", soft: "color-mix(in srgb, #0fb887 16%, transparent)" },
};

export default {
  components: { BnNeedHero, AnimatedNumber },
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
    const averageScore = computed(() => (suppliers.value.length ? Math.round(suppliers.value.reduce((sum, s) => sum + s.score, 0) / suppliers.value.length) : 0));
    const countries = computed(() => new Set(suppliers.value.map((s) => s.country)).size);

    const sectors = computed(() => M.TAXONOMY.map((node) => ({
      ...node,
      ...SECTOR_STYLE[node.value],
      count: suppliers.value.filter((s) => s.sector === node.value).length,
    })));
    const topSuppliers = computed(() => M.sortProfiles(suppliers.value, "relevance").slice(0, 6));

    const initials = (name) => String(name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
    // Sections arrive as you reach them.
    let observer = null;
    onMounted(() => {
      const items = document.querySelectorAll(".hp-reveal");
      if (!("IntersectionObserver" in window)) return items.forEach((el) => el.classList.add("is-in"));
      observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("is-in"); observer.unobserve(entry.target); } }), { threshold: 0.12 });
      items.forEach((el) => observer.observe(el));
    });
    onBeforeUnmount(() => observer && observer.disconnect());

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

    // The product in one line: a need has five stages, and each one is somebody's job.
    const journey = window.BuyniverseNeed.STAGES.map((stage, i) => ({ ...stage, n: i + 1, body: [
      "State what you need once: what, how many and your maximum budget. No supplier-by-supplier emails.",
      "Verified suppliers send offers, or bid each other down in a live reverse auction with anti-sniping.",
      "Compare price, delivery, risk and ESG side by side, and award with a full audit trail.",
      "Order, receipt and issues in one place. A short shipment is flagged, not forgotten.",
      "Three-way match with the CFDI invoice, then release payment through escrow.",
    ][i], color: ["#36e3c0", "#4d9dff", "#a37bff", "#ffb44d", "#ff6b8b"][i] }));

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

    return { store, supplierMode, suppliers, journey, initials, averageScore, countries, sectors, topSuppliers, query, sector, search, popular, tab, openTab, featuredJobs, visibleJobs, isSaved, filmAvailable };
  },
};
</script>
