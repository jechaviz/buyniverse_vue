<template>
  <header class="relative isolate overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-br from-slate-50 via-white to-rose-50/70 p-6 sm:p-10 lg:p-14 text-slate-900 shadow-xl dark:border-slate-800 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-brand-950 dark:text-white">
    <!-- Brand monogram rendered in WebGL. Its convergence is driven by the live
         round below, so the motion is the auction, not an ambient loop. -->
    <BrandUniverse :convergence="convergence" :particles="820" />

    <div class="relative z-10 space-y-8">
      <div class="grid items-center gap-10 lg:grid-cols-5">
        <!-- Act I - the promise -->
        <div class="min-w-0 space-y-5 lg:col-span-3">
          <div class="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50/90 px-3.5 py-1.5 text-xs font-bold text-brand-700 backdrop-blur-md dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
            <span class="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {{ store.t("Ronda en vivo") }} · {{ roundLabel }}
          </div>

          <h1 class="font-head text-3xl sm:text-4xl lg:text-5xl font-800 tracking-tight leading-[1.12] text-slate-900 dark:text-white">
            <template v-if="supplierMode">
              {{ store.t("Deja de perseguir clientes.") }}
              <span class="ml-2 inline-block bg-gradient-to-r from-brand-600 via-rose-500 to-amber-500 bg-clip-text text-transparent dark:from-brand-300 dark:via-rose-300 dark:to-amber-200">
                {{ store.t("Entra a la ronda.") }}
              </span>
            </template>
            <template v-else>
              {{ store.t("Tus proveedores compiten.") }}
              <span class="ml-2 inline-block bg-gradient-to-r from-brand-600 via-rose-500 to-emerald-500 bg-clip-text text-transparent dark:from-brand-300 dark:via-rose-300 dark:to-emerald-300">
                {{ store.t("El precio baja solo.") }}
              </span>
            </template>
          </h1>

          <p class="text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300 max-w-2xl">
            {{
              supplierMode
                ? store.t("Publicamos la demanda real de empresas compradoras. Ofertas ciegas, reglas visibles y contratos con pago en custodia: compites por margen, no por descuento a ciegas.")
                : store.t("Publica lo que necesitas y deja que los proveedores calificados bajen su oferta en vivo. Nosotros solo cobramos una parte del ahorro que consigues: si no bajas el precio, no pagas nada.")
            }}
          </p>

          <!-- Act II - the single action -->
          <div class="rounded-2xl border border-slate-200/90 bg-white p-2 shadow-lg dark:border-slate-700/80 dark:bg-slate-900/90">
            <form @submit.prevent="executeSearch" novalidate data-no-validate="true" class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div class="relative flex-1 flex items-center px-3">
                <i class="fa-solid fa-magnifying-glass text-slate-400 text-sm mr-2.5"></i>
                <input
                  v-model="searchQuery"
                  type="text"
                  data-optional="true"
                  data-no-validate="true"
                  :placeholder="store.t(supplierMode ? 'Busca proyectos, categorías u oportunidades' : '¿Qué necesitas comprar o contratar?')"
                  class="w-full bg-transparent text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none"
                />
              </div>
              <div class="relative">
                <button
                  type="button"
                  @click="categoryDropdownOpen = !categoryDropdownOpen"
                  class="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:text-brand dark:text-slate-200 dark:hover:text-white transition whitespace-nowrap cursor-pointer"
                >
                  <i :class="currentCategoryIcon" class="text-brand text-xs"></i>
                  <span>{{ currentCategoryLabel }}</span>
                  <i class="fa-solid fa-chevron-down text-[10px] text-slate-400 transition-transform duration-200" :class="{ 'rotate-180': categoryDropdownOpen }"></i>
                </button>

                <div
                  v-if="categoryDropdownOpen"
                  class="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-64 z-50 rounded-2xl border border-slate-200/90 bg-white/95 p-1.5 shadow-2xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95 space-y-0.5"
                >
                  <button
                    v-for="opt in categoryOptions"
                    :key="opt.value"
                    type="button"
                    @click="selectCategory(opt.value)"
                    class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition cursor-pointer"
                    :class="selectedCategory === opt.value ? 'bg-brand-50 text-brand dark:bg-brand/20 dark:text-brand-300 font-bold' : 'text-slate-700 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:bg-slate-800'"
                  >
                    <div class="flex items-center gap-2.5">
                      <span class="grid h-7 w-7 place-items-center rounded-lg text-xs" :class="opt.iconBg">
                        <i :class="opt.icon"></i>
                      </span>
                      <span>{{ opt.label }}</span>
                    </div>
                    <i v-if="selectedCategory === opt.value" class="fa-solid fa-check text-brand text-xs"></i>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                :disabled="!canSearch"
                class="text-xs sm:text-sm py-2.5 px-5 font-bold rounded-xl transition inline-flex items-center justify-center"
                :class="canSearch ? 'btn-brand shadow-md cursor-pointer' : 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed opacity-50 pointer-events-none'"
              >
                <i class="fa-solid fa-arrow-right mr-1 sm:hidden"></i>{{ store.t("Empezar") }}
              </button>
            </form>
          </div>

          <div class="flex flex-wrap items-center gap-2 text-xs">
            <span class="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px]">{{ store.t("Tendencias") }}:</span>
            <button
              v-for="kw in trendingKeywords"
              :key="kw"
              @click="searchWithKeyword(kw)"
              class="rounded-lg bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:bg-brand-50 hover:text-brand transition text-[11px] font-medium cursor-pointer"
            >
              {{ kw }}
            </button>
          </div>

          <!-- Act III - the proof, stated as numbers rather than adjectives -->
          <dl class="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-200/80 dark:border-slate-800 dark:bg-slate-800">
            <div v-for="proof in proofPoints" :key="proof.label" class="bg-white/90 px-3 py-3 dark:bg-slate-900/90">
              <dt class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{{ proof.label }}</dt>
              <dd class="font-head font-mono mt-0.5 text-lg font-800 tracking-tight" :class="proof.tone">{{ proof.value }}</dd>
              <dd class="text-[11px] leading-tight text-slate-500 dark:text-slate-400">{{ proof.note }}</dd>
            </div>
          </dl>
        </div>

        <!-- Act IV - the mechanism, running in front of you -->
        <div class="min-w-0 lg:col-span-2">
          <div class="rounded-2xl border border-slate-200/90 bg-white/95 p-6 shadow-xl backdrop-blur-xl dark:border-white/15 dark:bg-slate-800/90 space-y-4">
            <div class="flex items-center justify-between">
              <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                {{ store.t("Subasta inversa en curso") }}
              </span>
              <span class="font-mono text-xs font-bold" :class="secondsLeft <= 60 ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-300'">
                <i class="fa-solid fa-clock mr-1"></i>{{ countdown }}
              </span>
            </div>

            <div>
              <h2 class="font-head text-base font-bold text-slate-900 dark:text-white">{{ demoAuctionJob.title }}</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {{ store.t("Precio de salida") }}:
                <b class="font-mono text-slate-900 line-through decoration-slate-300 dark:text-white dark:decoration-slate-600">{{ store.money(demoAuctionJob.budget) }}</b>
                <span class="mx-1.5 text-slate-300 dark:text-slate-600">→</span>
                <b class="font-mono text-emerald-600 dark:text-emerald-400">{{ store.money(bestBid) }}</b>
              </p>
            </div>

            <!-- Descending offers. Rank order is real; identities stay masked,
                 exactly as the blind-bid rules require inside the workspace. -->
            <div class="space-y-2 pt-2 border-t border-slate-100 dark:border-white/10">
              <div
                v-for="(b, idx) in demoBids"
                :key="b.id"
                class="flex items-center justify-between rounded-xl p-2.5 transition-all duration-500"
                :class="idx === 0 ? 'bg-brand-50/80 border border-brand-200 text-brand-950 dark:bg-brand-500/20 dark:border-brand-500/40 dark:text-white' : 'bg-slate-50 border border-slate-100 text-slate-700 dark:bg-slate-900/40 dark:border-transparent dark:text-slate-300'"
              >
                <div class="flex items-center gap-2.5">
                  <span class="grid h-7 w-7 place-items-center rounded-lg text-xs font-bold" :class="idx === 0 ? 'bg-brand text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'">
                    #{{ idx + 1 }}
                  </span>
                  <div>
                    <span class="text-xs font-bold block text-slate-900 dark:text-white">{{ b.name }}</span>
                    <span class="text-[10px] text-slate-500 dark:text-slate-400">{{ b.tier }} · JSS {{ b.jss }}%</span>
                  </div>
                </div>
                <div class="text-right">
                  <b class="font-mono text-xs font-bold block tabular-nums" :class="idx === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'">{{ store.money(b.amount) }}</b>
                  <span v-if="idx === 0" class="badge bg-emerald-100 text-emerald-800 border border-emerald-200 text-[9px] px-1.5 py-0.5 dark:bg-emerald-500/30 dark:text-emerald-300 dark:border-transparent">{{ store.t("Mejor oferta") }}</span>
                </div>
              </div>
            </div>

            <div class="space-y-2 pt-1">
              <div class="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
                <div class="h-full rounded-full bg-gradient-to-r from-brand to-emerald-500 transition-all duration-700" :style="{ width: Math.round(convergence * 100) + '%' }"></div>
              </div>
              <div class="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                <span>{{ store.t("Ahorro acumulado") }}:</span>
                <b class="font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                  −{{ store.money(savedAmount) }} ({{ savedPercent }}%)
                </b>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="pt-4 border-t border-slate-200/60 dark:border-slate-800/80">
        <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 text-center mb-3">
          {{ store.t("Confianza y Respaldo Empresarial de Líderes Globales") }}
        </p>
        <div class="flex flex-wrap items-center justify-center gap-6 sm:gap-12 opacity-70 grayscale hover:grayscale-0 transition">
          <span class="font-head font-800 text-sm tracking-wider text-slate-700 dark:text-slate-300"><i class="fa-brands fa-paypal mr-1.5"></i>PayPal</span>
          <span class="font-head font-800 text-sm tracking-wider text-slate-700 dark:text-slate-300"><i class="fa-brands fa-slack mr-1.5"></i>Slack</span>
          <span class="font-head font-800 text-sm tracking-wider text-slate-700 dark:text-slate-300"><i class="fa-brands fa-amazon mr-1.5"></i>Amazon</span>
          <span class="font-head font-800 text-sm tracking-wider text-slate-700 dark:text-slate-300"><i class="fa-brands fa-google mr-1.5"></i>Google</span>
          <span class="font-head font-800 text-sm tracking-wider text-slate-700 dark:text-slate-300"><i class="fa-brands fa-spotify mr-1.5"></i>Spotify</span>
        </div>
      </div>
    </div>
  </header>
</template>

<script>
const { ref, computed, onMounted, onBeforeUnmount, defineAsyncComponent } = Vue;
const { useRouter } = VueRouter;
const load = (p) => defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(p, window.sfcOptions));

const BrandUniverse = load("./app/components/ui/BrandUniverse.vue?v=1");

const ROUND_SECONDS = 258;
const OPENING_BUDGET = 25000;

export default {
  components: { BrandUniverse },
  props: {
    store: Object,
    supplierMode: Boolean,
  },
  setup(props) {
    const router = useRouter();
    const searchQuery = ref("");
    const selectedCategory = ref("");
    const categoryDropdownOpen = ref(false);

    const categoryOptions = computed(() => [
      { value: "", label: props.store.t("Todas las Categorías"), icon: "fa-solid fa-layer-group", iconBg: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
      { value: "software", label: props.store.t("Desarrollo de Software"), icon: "fa-solid fa-code", iconBg: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20" },
      { value: "design", label: props.store.t("Diseño UX/UI & 3D"), icon: "fa-solid fa-palette", iconBg: "bg-rose-50 text-rose-600 dark:bg-rose-500/20" },
      { value: "procurement", label: props.store.t("Sourcing & Compras B2B"), icon: "fa-solid fa-gavel", iconBg: "bg-brand-50 text-brand dark:bg-brand/20" },
      { value: "marketing", label: props.store.t("Marketing & BAFO"), icon: "fa-solid fa-bullhorn", iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20" },
    ]);

    const currentCategoryLabel = computed(() => {
      const found = categoryOptions.value.find((opt) => opt.value === selectedCategory.value);
      return found ? found.label : props.store.t("Todas las Categorías");
    });

    const currentCategoryIcon = computed(() => {
      const found = categoryOptions.value.find((opt) => opt.value === selectedCategory.value);
      return found ? found.icon : "fa-solid fa-layer-group";
    });

    const selectCategory = (val) => {
      selectedCategory.value = val;
      categoryDropdownOpen.value = false;
    };

    const trendingKeywords = ["Subastas Inversas", "Desarrollo Web & Apps", "Diseño UX/UI", "3-Way Match", "Marketing B2B", "Escrow Seguro"];

    const canSearch = computed(() => !!(searchQuery.value.trim() || selectedCategory.value));

    const executeSearch = () => {
      if (!canSearch.value) return;
      categoryDropdownOpen.value = false;
      const q = searchQuery.value.trim();
      router.push({
        path: props.supplierMode ? "/find-work" : "/browse-services",
        query: q ? { q, category: selectedCategory.value || undefined } : selectedCategory.value ? { category: selectedCategory.value } : undefined,
      });
    };

    const searchWithKeyword = (kw) => {
      searchQuery.value = kw;
      executeSearch();
    };

    const demoAuctionJob = ref({
      title: "Desarrollo de Portal E-commerce Micro-Frontend",
      budget: OPENING_BUDGET,
      currency: "USD",
    });

    // The round genuinely runs: offers step down, the clock drains, and the
    // resulting progress is what the WebGL layer consumes as convergence.
    const demoBids = ref([
      { id: "b1", name: "John Doe (Tech Solutions)", amount: 23500, floor: 21400, tier: "Hero", jss: 99 },
      { id: "b2", name: "Jane Smith (Pixel Studio)", amount: 24000, floor: 22150, tier: "Platinum", jss: 96 },
      { id: "b3", name: "Charlie Brown", amount: 24800, floor: 23050, tier: "Gold", jss: 92 },
    ]);

    const secondsLeft = ref(ROUND_SECONDS);
    let timer = null;

    const countdown = computed(() => {
      const m = Math.floor(secondsLeft.value / 60);
      const s = secondsLeft.value % 60;
      return `${String(m).padStart(2, "0")}m : ${String(s).padStart(2, "0")}s`;
    });

    const roundLabel = computed(() => props.store.t("3 proveedores compitiendo ahora"));

    // 0 at the opening bell, 1 when the clock runs out.
    const convergence = computed(() => 1 - secondsLeft.value / ROUND_SECONDS);

    const bestBid = computed(() => Math.min(...demoBids.value.map((b) => b.amount)));
    const savedAmount = computed(() => Math.max(0, OPENING_BUDGET - bestBid.value));
    const savedPercent = computed(() => ((savedAmount.value / OPENING_BUDGET) * 100).toFixed(1));

    const tick = () => {
      secondsLeft.value = secondsLeft.value > 0 ? secondsLeft.value - 1 : ROUND_SECONDS;
      if (secondsLeft.value === ROUND_SECONDS) {
        // New round: everyone reopens near their starting position.
        demoBids.value = demoBids.value.map((b) => ({ ...b, amount: b.floor + Math.round((OPENING_BUDGET - b.floor) * 0.72) }));
        return;
      }
      // One supplier improves per tick, never below its own walk-away floor.
      const idx = secondsLeft.value % demoBids.value.length;
      const bid = demoBids.value[idx];
      const step = Math.round((bid.amount - bid.floor) * 0.06);
      if (step > 0) {
        const next = demoBids.value.slice();
        next[idx] = { ...bid, amount: bid.amount - step };
        next.sort((a, b) => a.amount - b.amount);
        demoBids.value = next;
      }
    };

    onMounted(() => {
      timer = window.setInterval(tick, 1000);
    });

    onBeforeUnmount(() => {
      if (timer) window.clearInterval(timer);
      timer = null;
    });

    const proofPoints = computed(() => [
      { label: props.store.t("Ahorro medio"), value: "8.4%", note: props.store.t("De salida a adjudicación"), tone: "text-emerald-600 dark:text-emerald-400" },
      { label: props.store.t("Tiempo a adjudicar"), value: "4.2 d", note: props.store.t("Antes: 3 semanas"), tone: "text-slate-900 dark:text-white" },
      { label: props.store.t("Comisión"), value: "0%", note: props.store.t("Si no hay ahorro"), tone: "text-brand" },
    ]);

    return {
      searchQuery,
      selectedCategory,
      categoryDropdownOpen,
      categoryOptions,
      currentCategoryLabel,
      currentCategoryIcon,
      selectCategory,
      trendingKeywords,
      canSearch,
      executeSearch,
      searchWithKeyword,
      demoAuctionJob,
      demoBids,
      secondsLeft,
      countdown,
      roundLabel,
      convergence,
      bestBid,
      savedAmount,
      savedPercent,
      proofPoints,
    };
  },
};
</script>
