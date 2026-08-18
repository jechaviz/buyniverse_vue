<template>
  <div class="space-y-16 lg:space-y-24">
    <!-- 1. HERO SECTION (Perfect Dual Light & Dark Mode) -->
    <header class="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-br from-slate-50 via-white to-rose-50/70 p-6 sm:p-10 lg:p-16 text-slate-900 shadow-xl dark:border-slate-800 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-brand-950 dark:text-white">
      <!-- Glow Gradients -->
      <div class="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-brand-500/15 blur-3xl pointer-events-none dark:bg-brand-500/20"></div>
      <div class="absolute -left-20 -bottom-20 h-96 w-96 rounded-full bg-rose-500/10 blur-3xl pointer-events-none dark:bg-indigo-500/15"></div>

      <div class="relative z-10 grid gap-10 lg:grid-cols-12 lg:items-center">
        <!-- Hero Copy -->
        <div class="lg:col-span-7 space-y-6">
          <div class="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50/90 px-3.5 py-1.5 text-xs font-bold text-brand-700 backdrop-blur-md dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
            <span class="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {{ store.t("Ecosistema B2B & Marketplace de Subastas en Vivo") }}
          </div>

          <h1 class="font-head text-3xl sm:text-4xl lg:text-5xl font-800 tracking-tight leading-[1.15] text-slate-900 dark:text-white">
            {{ store.t("Revoluciona tus Compras y Contrata Talento al") }}
            <span class="bg-gradient-to-r from-brand-600 via-rose-500 to-amber-500 bg-clip-text text-transparent dark:from-brand-300 dark:via-rose-300 dark:to-amber-200">
              {{ store.t("Mejor Postor") }}
            </span>
          </h1>

          <p class="text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300 max-w-2xl">
            {{ store.t("La plataforma integral que fusiona subastas inversas en vivo (BAFO), rondas de cotización RFX con 3-way matching, contratos en fideicomiso (Escrow) y pagos transparentes.") }}
          </p>

          <!-- Dual CTA Buttons -->
          <div class="flex flex-wrap items-center gap-3 pt-2">
            <RouterLink to="/post-job/new" class="btn-brand text-sm py-3.5 px-6 shadow-lg shadow-brand-500/20 hover:scale-105 transition-transform">
              <i class="fa-solid fa-plus-circle mr-2"></i>{{ store.t("Publicar Proyecto o RFQ") }}
            </RouterLink>
            <RouterLink to="/procurement/auction" class="rounded-xl border border-slate-300 bg-white/90 px-5 py-3.5 text-sm font-bold text-slate-700 shadow-xs hover:border-brand hover:text-brand dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 transition">
              <i class="fa-solid fa-gavel mr-2 text-brand dark:text-amber-400"></i>{{ store.t("Ver Subastas en Vivo") }}
            </RouterLink>
          </div>
        </div>

        <!-- Live Auction Card Preview (High Contrast in Both Modes) -->
        <div class="lg:col-span-5">
          <div class="rounded-2xl border border-slate-200/90 bg-white/95 p-6 shadow-xl backdrop-blur-xl dark:border-white/15 dark:bg-slate-800/90 space-y-4">
            <div class="flex items-center justify-between">
              <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                {{ store.t("Subasta Activa en Tiempo Real") }}
              </span>
              <span class="font-mono text-xs text-amber-600 dark:text-amber-300 font-bold">
                <i class="fa-solid fa-clock mr-1"></i>04m : 18s
              </span>
            </div>

            <div>
              <h2 class="font-head text-base font-bold text-slate-900 dark:text-white">{{ demoAuctionJob.title }}</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Presupuesto inicial: <b class="font-mono text-slate-900 dark:text-white">{{ store.money(demoAuctionJob.budget) }}</b></p>
            </div>

            <!-- Bids Live Feed -->
            <div class="space-y-2 pt-2 border-t border-slate-100 dark:border-white/10">
              <div
                v-for="(b, idx) in demoBids"
                :key="b.id"
                class="flex items-center justify-between rounded-xl p-2.5 transition"
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
                  <b class="font-mono text-xs font-bold block" :class="idx === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'">{{ store.money(b.amount) }}</b>
                  <span v-if="idx === 0" class="badge bg-emerald-100 text-emerald-800 border border-emerald-200 text-[9px] px-1.5 py-0.5 dark:bg-emerald-500/30 dark:text-emerald-300 dark:border-transparent">Mejor Oferta BAFO</span>
                </div>
              </div>
            </div>

            <div class="pt-2 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
              <span>{{ store.t("Ahorro actual para el cliente") }}:</span>
              <b class="font-mono text-emerald-600 dark:text-emerald-400 font-bold text-sm">-$1,500.00 USD (-6%)</b>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- 2. INTERACTIVE ROI & SAVINGS CALCULATOR -->
    <section class="panel p-8 sm:p-12 rounded-3xl border border-slate-200/90 bg-white shadow-card dark:border-slate-800/80 dark:bg-slate-900/90 space-y-8">
      <div class="text-center max-w-4xl mx-auto space-y-2">
        <p class="premium-kicker text-xs font-bold uppercase tracking-widest text-brand">{{ store.t("Calculadora de Ahorro y Retorno de Inversión") }}</p>
        <h2 class="font-head text-2xl sm:text-3xl lg:text-4xl font-800 tracking-tight text-slate-900 dark:text-white md:whitespace-nowrap">
          {{ store.t("Calcula tu Ahorro con Subastas Inversas y Escrow") }}
        </h2>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
          {{ store.t("Compara el costo tradicional de intermediarios vs. el modelo directo Buyniverse con 3-way match y BAFO.") }}
        </p>
      </div>

      <div class="grid gap-8 lg:grid-cols-12 lg:items-center">
        <!-- Slider Input -->
        <div class="lg:col-span-6 space-y-6">
          <div>
            <div class="flex justify-between items-center mb-2">
              <label class="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">{{ store.t("Gasto o Presupuesto de Contratación Anual") }}</label>
              <b class="font-mono text-lg font-800 text-brand">{{ store.money(annualSpend) }} USD</b>
            </div>
            <input
              v-model.number="annualSpend"
              type="range"
              min="5000"
              max="500000"
              step="5000"
              class="w-full accent-brand cursor-pointer"
            />
            <div class="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>$5,000</span>
              <span>$250,000</span>
              <span>$500,000+</span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
              <span class="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase block">{{ store.t("Proyectos Anuales") }}</span>
              <b class="font-mono text-xl font-800 text-slate-900 dark:text-slate-100">{{ Math.round(annualSpend / 8000) }}</b>
            </div>
            <div class="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
              <span class="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase block">{{ store.t("Tiempo de Adjudicación") }}</span>
              <b class="font-mono text-xl font-800 text-emerald-600 dark:text-emerald-400">3 {{ store.t("días") }} <span class="text-xs text-slate-400">(-85%)</span></b>
            </div>
          </div>
        </div>

        <!-- Calculated Metrics Card -->
        <div class="lg:col-span-6">
          <div class="rounded-3xl bg-gradient-to-br from-brand-50/70 via-rose-50/50 to-white border border-brand-200 p-6 sm:p-8 dark:from-slate-800 dark:to-slate-800/60 dark:border-brand-900/40 space-y-6 shadow-sm">
            <div class="flex items-center justify-between border-b border-brand-200/60 dark:border-slate-700 pb-4">
              <div>
                <p class="text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">{{ store.t("Ahorro Anual Estimado") }}</p>
                <p class="font-head font-mono text-3xl sm:text-4xl font-800 text-slate-900 dark:text-white mt-1">
                  {{ store.money(calculatedSavings) }}
                </p>
              </div>
              <span class="grid h-12 w-12 place-items-center rounded-2xl bg-brand text-white text-lg shadow-md shadow-brand/20">
                <i class="fa-solid fa-piggy-bank"></i>
              </span>
            </div>

            <div class="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div class="flex items-center justify-between">
                <span><i class="fa-solid fa-circle-check text-emerald-500 mr-2"></i>{{ store.t("Ahorro por Subasta Inversa BAFO (~20%)") }}</span>
                <b class="font-mono font-bold text-slate-900 dark:text-white">{{ store.money(annualSpend * 0.20) }}</b>
              </div>
              <div class="flex items-center justify-between">
                <span><i class="fa-solid fa-circle-check text-emerald-500 mr-2"></i>{{ store.t("Cero Comisiones Abusivas para Freelancers") }}</span>
                <b class="font-mono font-bold text-slate-900 dark:text-white">{{ store.money(annualSpend * 0.05) }}</b>
              </div>
              <div class="flex items-center justify-between">
                <span><i class="fa-solid fa-circle-check text-emerald-500 mr-2"></i>{{ store.t("Facturación y Conciliación Fiscal Automatizada") }}</span>
                <b class="font-mono font-bold text-emerald-600 dark:text-emerald-400">{{ store.t("100% Incluido") }}</b>
              </div>
            </div>

            <RouterLink to="/post-job/new" class="btn-brand w-full py-3.5 text-center block text-sm font-bold shadow-md shadow-brand/20">
              {{ store.t("Comenzar a Ahorrar en Buyniverse") }}
            </RouterLink>
          </div>
        </div>
      </div>
    </section>

    <!-- 3. THE 4 PILLARS (ENTERPRISE PROCUREMENT & TOP FREELANCERS) -->
    <section class="space-y-8">
      <div class="text-center max-w-2xl mx-auto space-y-2">
        <p class="premium-kicker text-xs font-bold uppercase tracking-widest text-brand">{{ store.t("Propuesta de Valor Integral") }}</p>
        <h2 class="font-head text-2xl sm:text-3xl font-800 tracking-tight text-slate-900 dark:text-white">
          {{ store.t("Diseñado para Grandes Empresas y Talento Excepcional") }}
        </h2>
      </div>

      <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <!-- Feature 1 -->
        <article class="premium-card p-6 rounded-3xl border border-slate-200/90 bg-white shadow-sm hover:shadow-md hover:border-brand-300 transition dark:border-slate-800/80 dark:bg-slate-900/90 space-y-4">
          <span class="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand text-lg dark:bg-brand/20">
            <i class="fa-solid fa-gavel"></i>
          </span>
          <h3 class="font-head text-base font-800 text-slate-900 dark:text-white">{{ store.t("Subastas Inversas (BAFO)") }}</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {{ store.t("Rondas de contraofertas en vivo donde los proveedores compiten de forma transparente, reduciendo costos de adquisición hasta un 30%.") }}
          </p>
        </article>

        <!-- Feature 2 -->
        <article class="premium-card p-6 rounded-3xl border border-slate-200/90 bg-white shadow-sm hover:shadow-md hover:border-brand-300 transition dark:border-slate-800/80 dark:bg-slate-900/90 space-y-4">
          <span class="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 text-lg dark:bg-emerald-500/20">
            <i class="fa-solid fa-shield-halved"></i>
          </span>
          <h3 class="font-head text-base font-800 text-slate-900 dark:text-white">{{ store.t("Fideicomiso por Hitos") }}</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {{ store.t("Fondos custodiados de forma segura (Escrow) que solo se liberan tras la aprobación formal de cada entregable acordado.") }}
          </p>
        </article>

        <!-- Feature 3 -->
        <article class="premium-card p-6 rounded-3xl border border-slate-200/90 bg-white shadow-sm hover:shadow-md hover:border-brand-300 transition dark:border-slate-800/80 dark:bg-slate-900/90 space-y-4">
          <span class="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 text-lg dark:bg-indigo-500/20">
            <i class="fa-solid fa-code-compare"></i>
          </span>
          <h3 class="font-head text-base font-800 text-slate-900 dark:text-white">{{ store.t("3-Way Match & Conciliación") }}</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {{ store.t("Conciliación perfecta de Órdenes de Compra, Recepción de Mercancías y Facturas validadas con registro fiscal.") }}
          </p>
        </article>

        <!-- Feature 4 -->
        <article class="premium-card p-6 rounded-3xl border border-slate-200/90 bg-white shadow-sm hover:shadow-md hover:border-brand-300 transition dark:border-slate-800/80 dark:bg-slate-900/90 space-y-4">
          <span class="grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-600 text-lg dark:bg-amber-500/20">
            <i class="fa-solid fa-user-astronaut"></i>
          </span>
          <h3 class="font-head text-base font-800 text-slate-900 dark:text-white">{{ store.t("0% Comisión Freelancer") }}</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {{ store.t("Modelo estilo Contra con cero comisiones ocultas para el talento con insignia Top Rated Plus y suscripción Hero.") }}
          </p>
        </article>
      </div>
    </section>

    <!-- 4. LIVE MARKETPLACE JOBS & OPPORTUNITIES -->
    <section class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="premium-kicker text-xs font-bold uppercase tracking-widest text-brand">{{ store.t("Marketplace en Vivo") }}</p>
          <h2 class="font-head text-2xl font-800 tracking-tight text-slate-900 dark:text-white">{{ store.t("Proyectos y Solicitudes Destacadas") }}</h2>
        </div>
        <RouterLink to="/browse-services" class="btn-muted text-xs py-2 px-4 shadow-2xs">
          {{ store.t("Ver Todas las Oportunidades") }} <i class="fa-solid fa-arrow-right ml-1"></i>
        </RouterLink>
      </div>

      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="job in featuredJobs"
          :key="job.id"
          class="premium-card rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-brand/40 dark:border-slate-800/80 dark:bg-slate-900/90 flex flex-col justify-between"
        >
          <div>
            <div class="flex items-center justify-between gap-2">
              <span class="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {{ job.category }}
              </span>
              <span class="badge bg-brand-50 text-brand text-[10px] font-bold border border-brand-100 dark:border-transparent dark:bg-brand/10">
                <i class="fa-solid fa-gavel mr-1"></i>{{ job.auctionType || 'OPEN' }}
              </span>
            </div>

            <RouterLink :to="`/job/${job.id}`" class="block mt-3">
              <h3 class="font-head text-base font-800 text-slate-900 hover:text-brand dark:text-white transition">
                {{ job.title }}
              </h3>
            </RouterLink>

            <p class="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {{ job.description || 'Proyecto empresarial con liberación de fondos por hitos.' }}
            </p>

            <div class="mt-3 flex flex-wrap gap-1.5">
              <span
                v-for="skill in (job.skills || []).slice(0, 3)"
                :key="skill"
                class="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                {{ skill }}
              </span>
            </div>
          </div>

          <div class="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span class="text-[10px] text-slate-400 uppercase font-bold block">{{ job.budgetType || 'Presupuesto' }}</span>
              <b class="font-mono text-sm font-800 text-slate-900 dark:text-white">{{ store.money(job.budget, job.currency) }}</b>
            </div>
            <RouterLink :to="`/job/${job.id}`" class="btn-brand text-xs py-1.5 px-3">
              {{ store.t("Postularse") }}
            </RouterLink>
          </div>
        </article>
      </div>
    </section>

    <!-- 5. FINAL CALL TO ACTION -->
    <section class="rounded-3xl border border-slate-200/90 bg-gradient-to-r from-brand-600 via-rose-600 to-brand-700 p-8 sm:p-12 text-center text-white shadow-xl space-y-6">
      <div class="max-w-2xl mx-auto space-y-3">
        <h2 class="font-head text-2xl sm:text-3xl font-800 tracking-tight">
          {{ store.t("¿Listo para transformar tus adquisiciones y ventas?") }}
        </h2>
        <p class="text-xs sm:text-sm text-brand-100 leading-relaxed">
          {{ store.t("Únete a empresas líderes y freelancers certificados que ya operan bajo el estándar de subastas en vivo, 3-way match y fideicomiso seguro.") }}
        </p>
      </div>

      <div class="flex flex-wrap justify-center items-center gap-4">
        <RouterLink to="/post-job/new" class="rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-brand-600 shadow-md hover:bg-slate-100 transition">
          <i class="fa-solid fa-plus-circle mr-2"></i>{{ store.t("Crear Cuenta y Publicar") }}
        </RouterLink>
        <RouterLink to="/dashboard" class="rounded-xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-md hover:bg-white/20 transition">
          <i class="fa-solid fa-gauge mr-2"></i>{{ store.t("Ir al Panel de Control") }}
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<script>
const { inject, ref, computed } = Vue;
const { useRoute, useRouter } = VueRouter;

export default {
  setup() {
    const store = inject("store");
    const route = useRoute();
    const router = useRouter();
    const annualSpend = ref(75000);

    const tab = computed(() => (route.query.view === "saved" ? "saved" : "search"));
    const openTab = (key) =>
      router.push({
        path: "/",
        query: window.WebCommon ? window.WebCommon.mergeRouteQuery(route.query, { view: key === "saved" ? "saved" : null }) : { view: key === "saved" ? "saved" : undefined },
      });

    const calculatedSavings = computed(() => {
      return annualSpend.value * 0.25; // 25% average savings from BAFO reverse auctions + 0% platform fees
    });

    const demoAuctionJob = ref({
      title: "Desarrollo de Portal E-commerce Micro-Frontend",
      budget: 25000.0,
      currency: "USD"
    });

    const demoBids = ref([
      { id: "b1", name: "John Doe (Tech Solutions)", amount: 23500.0, tier: "Hero", jss: 99 },
      { id: "b2", name: "Jane Smith (Pixel Studio)", amount: 24000.0, tier: "Platinum", jss: 96 },
      { id: "b3", name: "Charlie Brown", amount: 24800.0, tier: "Gold", jss: 92 },
    ]);

    const featuredJobs = computed(() => {
      return (store.state.jobs || []).slice(0, 6);
    });

    return {
      store,
      tab,
      openTab,
      annualSpend,
      calculatedSavings,
      demoAuctionJob,
      demoBids,
      featuredJobs
    };
  },
};
</script>
