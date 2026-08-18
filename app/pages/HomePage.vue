<template>
  <div class="space-y-16 lg:space-y-24">
    <!-- 1. HERO SECTION -->
    <header class="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-900 to-brand-950 p-6 sm:p-10 lg:p-16 text-white shadow-2xl dark:border-slate-800">
      <!-- Glow Gradients -->
      <div class="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl pointer-events-none"></div>
      <div class="absolute -left-20 -bottom-20 h-96 w-96 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none"></div>

      <div class="relative z-10 grid gap-10 lg:grid-cols-12 lg:items-center">
        <!-- Hero Copy -->
        <div class="lg:col-span-7 space-y-6">
          <div class="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3.5 py-1.5 text-xs font-bold text-brand-300 backdrop-blur-md">
            <span class="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            {{ store.t("Ecosistema B2B & Marketplace de Subastas en Vivo") }}
          </div>

          <h1 class="font-head text-3xl sm:text-4xl lg:text-5xl font-800 tracking-tight leading-[1.15]">
            {{ store.t("Revoluciona tus Compras y Contrata Talento al") }}
            <span class="bg-gradient-to-r from-brand-300 via-rose-300 to-amber-200 bg-clip-text text-transparent">
              {{ store.t("Mejor Postor") }}
            </span>
          </h1>

          <p class="text-sm sm:text-base leading-relaxed text-slate-300 max-w-2xl">
            {{ store.t("La plataforma integral que fusiona subastas inversas en vivo (BAFO), rondas de cotización RFX con 3-way matching, contratos en fideicomiso (Escrow) y facturación electrónica CFDI 4.0.") }}
          </p>

          <!-- Dual CTA Buttons -->
          <div class="flex flex-wrap items-center gap-3 pt-2">
            <RouterLink to="/post-job/new" class="btn-brand text-sm py-3.5 px-6 shadow-lg shadow-brand-500/30 hover:scale-105 transition-transform">
              <i class="fa-solid fa-plus-circle mr-2"></i>{{ store.t("Publicar Proyecto o RFQ") }}
            </RouterLink>
            <RouterLink to="/procurement/auction" class="rounded-xl border border-white/20 bg-white/10 px-5 py-3.5 text-sm font-bold text-white backdrop-blur-md hover:bg-white/20 hover:border-white/40 transition">
              <i class="fa-solid fa-gavel mr-2 text-amber-400"></i>{{ store.t("Ver Subastas en Vivo") }}
            </RouterLink>
          </div>
        </div>

        <!-- Live Auction Card Preview -->
        <div class="lg:col-span-5">
          <div class="rounded-2xl border border-white/15 bg-slate-800/80 p-6 backdrop-blur-xl shadow-2xl space-y-4">
            <div class="flex items-center justify-between">
              <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-bold text-emerald-300 border border-emerald-500/30">
                <span class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                {{ store.t("Subasta Activa en Tiempo Real") }}
              </span>
              <span class="font-mono text-xs text-amber-300 font-bold">
                <i class="fa-solid fa-clock mr-1"></i>04m : 18s
              </span>
            </div>

            <div>
              <h2 class="font-head text-base font-bold text-white">{{ demoAuctionJob.title }}</h2>
              <p class="text-xs text-slate-400 mt-1">Presupuesto inicial: <b class="font-mono text-white">{{ store.money(demoAuctionJob.budget) }}</b></p>
            </div>

            <!-- Bids Live Feed -->
            <div class="space-y-2 pt-2 border-t border-white/10">
              <div
                v-for="(b, idx) in demoBids"
                :key="b.id"
                class="flex items-center justify-between rounded-xl p-2.5 transition"
                :class="idx === 0 ? 'bg-brand-500/20 border border-brand-500/40 text-white' : 'bg-slate-900/40 text-slate-300'"
              >
                <div class="flex items-center gap-2.5">
                  <span class="grid h-7 w-7 place-items-center rounded-lg text-xs font-bold" :class="idx === 0 ? 'bg-brand text-white' : 'bg-slate-700 text-slate-300'">
                    #{{ idx + 1 }}
                  </span>
                  <div>
                    <span class="text-xs font-bold block">{{ b.name }}</span>
                    <span class="text-[10px] text-slate-400">{{ b.tier }} · JSS {{ b.jss }}%</span>
                  </div>
                </div>
                <div class="text-right">
                  <b class="font-mono text-xs font-bold block" :class="idx === 0 ? 'text-emerald-400' : ''">{{ store.money(b.amount) }}</b>
                  <span v-if="idx === 0" class="badge bg-emerald-500/30 text-emerald-300 text-[9px] px-1.5 py-0.5">Mejor Oferta BAFO</span>
                </div>
              </div>
            </div>

            <div class="pt-2 flex items-center justify-between text-xs text-slate-300">
              <span>{{ store.t("Ahorro actual para el cliente") }}:</span>
              <b class="font-mono text-emerald-400 font-bold text-sm">-$1,500.00 USD (-6%)</b>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- 2. INTERACTIVE ROI & SAVINGS CALCULATOR -->
    <section class="panel p-8 sm:p-12 rounded-3xl border border-slate-200/80 bg-white/90 shadow-card dark:border-slate-800/80 dark:bg-slate-900/90 space-y-8">
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
              <label class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{{ store.t("Gasto o Presupuesto de Contratación Anual") }}</label>
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
            <div class="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
              <span class="text-[11px] font-bold text-slate-400 uppercase block">{{ store.t("Proyectos Anuales") }}</span>
              <b class="font-mono text-xl font-800 text-slate-800 dark:text-slate-100">{{ Math.round(annualSpend / 8000) }}</b>
            </div>
            <div class="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
              <span class="text-[11px] font-bold text-slate-400 uppercase block">{{ store.t("Tiempo de Adjudicación") }}</span>
              <b class="font-mono text-xl font-800 text-emerald-600 dark:text-emerald-400">3 {{ store.t("días") }} <span class="text-xs text-slate-400">(-85%)</span></b>
            </div>
          </div>
        </div>

        <!-- Calculated Metrics Card -->
        <div class="lg:col-span-6">
          <div class="rounded-3xl bg-gradient-to-br from-brand-50 to-rose-50 border border-brand-200/60 p-6 sm:p-8 dark:from-slate-800 dark:to-slate-800/60 dark:border-brand-900/40 space-y-6">
            <div class="flex items-center justify-between border-b border-brand-200/40 dark:border-slate-700 pb-4">
              <div>
                <p class="text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">{{ store.t("Ahorro Anual Estimado") }}</p>
                <p class="font-head font-mono text-3xl sm:text-4xl font-800 text-slate-900 dark:text-white mt-1">
                  {{ store.money(calculatedSavings) }}
                </p>
              </div>
              <span class="grid h-12 w-12 place-items-center rounded-2xl bg-brand text-white text-lg shadow-md">
                <i class="fa-solid fa-piggy-bank"></i>
              </span>
            </div>

            <div class="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div class="flex items-center justify-between">
                <span><i class="fa-solid fa-circle-check text-emerald-500 mr-2"></i>{{ store.t("Ahorro por Subasta Inversa BAFO (~20%)") }}</span>
                <b class="font-mono font-bold">{{ store.money(annualSpend * 0.20) }}</b>
              </div>
              <div class="flex items-center justify-between">
                <span><i class="fa-solid fa-circle-check text-emerald-500 mr-2"></i>{{ store.t("Cero Comisiones Abusivas para Freelancers") }}</span>
                <b class="font-mono font-bold">{{ store.money(annualSpend * 0.05) }}</b>
              </div>
              <div class="flex items-center justify-between">
                <span><i class="fa-solid fa-circle-check text-emerald-500 mr-2"></i>{{ store.t("Timbrado SAT CFDI 4.0 Automatizado") }}</span>
                <b class="font-mono font-bold text-emerald-600 dark:text-emerald-400">{{ store.t("100% Incluido") }}</b>
              </div>
            </div>

            <RouterLink to="/post-job/new" class="btn-brand w-full py-3 text-center block text-sm">
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
        <article class="premium-card p-6 rounded-3xl border border-slate-200/80 bg-white/95 dark:border-slate-800/80 dark:bg-slate-900/90 space-y-4">
          <span class="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand text-lg dark:bg-brand/20">
            <i class="fa-solid fa-gavel"></i>
          </span>
          <h3 class="font-head text-base font-800 text-slate-900 dark:text-white">{{ store.t("Subastas Inversas (BAFO)") }}</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {{ store.t("Rondas de contraofertas en vivo donde los proveedores compiten de forma transparente, reduciendo costos de adquisición hasta un 30%.") }}
          </p>
        </article>

        <!-- Feature 2 -->
        <article class="premium-card p-6 rounded-3xl border border-slate-200/80 bg-white/95 dark:border-slate-800/80 dark:bg-slate-900/90 space-y-4">
          <span class="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 text-lg dark:bg-emerald-500/20">
            <i class="fa-solid fa-shield-halved"></i>
          </span>
          <h3 class="font-head text-base font-800 text-slate-900 dark:text-white">{{ store.t("Fideicomiso por Hitos") }}</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {{ store.t("Fondos custodiados de forma segura (Escrow) que solo se liberan tras la aprobación formal de cada entregable acordado.") }}
          </p>
        </article>

        <!-- Feature 3 -->
        <article class="premium-card p-6 rounded-3xl border border-slate-200/80 bg-white/95 dark:border-slate-800/80 dark:bg-slate-900/90 space-y-4">
          <span class="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 text-lg dark:bg-indigo-500/20">
            <i class="fa-solid fa-code-compare"></i>
          </span>
          <h3 class="font-head text-base font-800 text-slate-900 dark:text-white">{{ store.t("3-Way Match & SAT CFDI") }}</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {{ store.t("Conciliación perfecta de Órdenes de Compra, Recepción de Mercancías y Facturación Electrónica SAT CFDI 4.0 con validación de RFC.") }}
          </p>
        </article>

        <!-- Feature 4 -->
        <article class="premium-card p-6 rounded-3xl border border-slate-200/80 bg-white/95 dark:border-slate-800/80 dark:bg-slate-900/90 space-y-4">
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
        <RouterLink to="/browse-services" class="btn-muted text-xs py-2 px-4">
          {{ store.t("Ver Todas las Oportunidades") }} <i class="fa-solid fa-arrow-right ml-1"></i>
        </RouterLink>
      </div>

      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="job in featuredJobs"
          :key="job.id"
          class="premium-card rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-card transition hover:shadow-elevated dark:border-slate-800/80 dark:bg-slate-900/90 flex flex-col justify-between"
        >
          <div>
            <div class="flex items-center justify-between gap-2">
              <span class="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {{ job.category }}
              </span>
              <span class="badge bg-brand-50 text-brand text-[10px] font-bold dark:bg-brand/10">
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
    <section class="rounded-3xl border border-slate-200/80 bg-gradient-to-r from-brand-600 via-rose-600 to-brand-700 p-8 sm:p-12 text-center text-white shadow-xl space-y-6">
      <div class="max-w-2xl mx-auto space-y-3">
        <h2 class="font-head text-2xl sm:text-3xl font-800 tracking-tight">
          {{ store.t("¿Listo para transformar tus adquisiciones y ventas?") }}
        </h2>
        <p class="text-xs sm:text-sm text-brand-100 leading-relaxed">
          {{ store.t("Únete a empresas líderes y freelancers certificados que ya operan bajo el estándar de subastas en vivo, 3-way match y CFDI 4.0.") }}
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
