<template>
  <div class="space-y-16 lg:space-y-24">
    <!-- 2. EXPLORE POPULAR CATEGORIES (Rich Visual Grid) -->
    <section v-if="!supplierMode" class="space-y-6">
      <div class="text-center max-w-2xl mx-auto space-y-2">
        <p class="premium-kicker text-xs font-bold uppercase tracking-widest text-brand">{{ store.t("Explora por Categorías") }}</p>
        <h2 class="font-head text-2xl sm:text-3xl font-800 tracking-tight text-slate-900 dark:text-white">
          {{ store.t("Talento de Clase Mundial al Alcance de tus Proyectos") }}
        </h2>
      </div>

      <div class="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <RouterLink
          v-for="cat in categories"
          :key="cat.title"
          :to="cat.to"
          class="group relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm hover:shadow-xl hover:border-brand/50 transition-all duration-300 dark:border-slate-800/80 dark:bg-slate-900/90 flex flex-col justify-between min-h-[180px]"
        >
          <div class="flex items-start justify-between">
            <span class="grid h-12 w-12 place-items-center rounded-2xl text-lg transition-transform group-hover:scale-110" :class="cat.iconBg">
              <i :class="cat.icon"></i>
            </span>
            <span class="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {{ cat.count }}
            </span>
          </div>

          <div class="mt-4">
            <h3 class="font-head text-base font-800 text-slate-900 group-hover:text-brand dark:text-white transition">
              {{ cat.title }}
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
              {{ cat.subtitle }}
            </p>
          </div>
        </RouterLink>
      </div>
    </section>

    <!-- 3. MERCANIS PROCUREMENT INTELLIGENCE: AUTONOMOUS AGENTS -->
    <section v-if="!supplierMode" class="space-y-8">
      <div class="text-center max-w-3xl mx-auto space-y-2">
        <div class="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-3.5 py-1 text-xs font-bold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
          <i class="fa-solid fa-brain"></i>
          {{ store.t("Procurement Intelligence & 55+ Agentes Autónomos") }}
        </div>
        <h2 class="font-head text-2xl sm:text-3xl lg:text-4xl font-800 tracking-tight text-slate-900 dark:text-white">
          {{ store.t("Automatiza el Ciclo Source-to-Pay y Sourcing Estratégico") }}
        </h2>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          {{ store.t("Inspirado en la tecnología de Mercanis: orquestación de compras, scoring de proveedores SRM, subastas inversas automatizadas y contratos inteligentes con custodia en Escrow.") }}
        </p>
      </div>

      <div class="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <!-- Agent Card 1 -->
        <article class="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm hover:shadow-xl transition-all duration-300 dark:border-slate-800/80 dark:bg-slate-900/90 flex flex-col justify-between group">
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 text-lg group-hover:scale-110 transition-transform">
                <i class="fa-solid fa-wand-magic-sparkles"></i>
              </span>
              <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span> {{ store.t("Activo") }}
              </span>
            </div>
            <h3 class="font-head text-base font-800 text-slate-900 dark:text-white">{{ store.t("Agente de Ingesta & Sourcing RFX") }}</h3>
            <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {{ store.t("Convierte requerimientos en pliegos de licitación, invita proveedores homologados y pondera cotizaciones multicriterio en minutos.") }}
            </p>
          </div>
          <div class="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold">
            <span class="text-slate-400">{{ store.t("Impacto") }}:</span>
            <span class="text-emerald-600 dark:text-emerald-400 font-mono">-70% {{ store.t("tiempo de ciclo") }}</span>
          </div>
        </article>

        <!-- Agent Card 2 -->
        <article class="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm hover:shadow-xl transition-all duration-300 dark:border-slate-800/80 dark:bg-slate-900/90 flex flex-col justify-between group">
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand dark:bg-brand-950/60 dark:text-brand-300 text-lg group-hover:scale-110 transition-transform">
                <i class="fa-solid fa-gavel"></i>
              </span>
              <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span> {{ store.t("Activo") }}
              </span>
            </div>
            <h3 class="font-head text-base font-800 text-slate-900 dark:text-white">{{ store.t("Motor de Subasta Inversa BAFO") }}</h3>
            <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {{ store.t("Subastas dinámicas en tiempo real donde los proveedores compiten transparentemente para maximizar el ahorro económico del comprador.") }}
            </p>
          </div>
          <div class="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold">
            <span class="text-slate-400">{{ store.t("Impacto") }}:</span>
            <span class="text-emerald-600 dark:text-emerald-400 font-mono">15% a 35% {{ store.t("ahorro directo") }}</span>
          </div>
        </article>

        <!-- Agent Card 3 -->
        <article class="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm hover:shadow-xl transition-all duration-300 dark:border-slate-800/80 dark:bg-slate-900/90 flex flex-col justify-between group">
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 text-lg group-hover:scale-110 transition-transform">
                <i class="fa-solid fa-users-gear"></i>
              </span>
              <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span> {{ store.t("Activo") }}
              </span>
            </div>
            <h3 class="font-head text-base font-800 text-slate-900 dark:text-white">{{ store.t("Agente SRM & Scoring de Riesgo") }}</h3>
            <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {{ store.t("Evaluación 360° continua de proveedores: cumplimiento fiscal SAT 32D, capacidad operativa, SLAs y scoring de desempeño histórico.") }}
            </p>
          </div>
          <div class="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold">
            <span class="text-slate-400">{{ store.t("Impacto") }}:</span>
            <span class="text-emerald-600 dark:text-emerald-400 font-mono">0% {{ store.t("riesgo de incumplimiento") }}</span>
          </div>
        </article>

        <!-- Agent Card 4 -->
        <article class="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm hover:shadow-xl transition-all duration-300 dark:border-slate-800/80 dark:bg-slate-900/90 flex flex-col justify-between group">
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 text-lg group-hover:scale-110 transition-transform">
                <i class="fa-solid fa-chart-line"></i>
              </span>
              <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span> {{ store.t("Activo") }}
              </span>
            </div>
            <h3 class="font-head text-base font-800 text-slate-900 dark:text-white">{{ store.t("Agente de Spend Analytics & 3-Way Match") }}</h3>
            <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {{ store.t("Conciliación automática de facturas vs. órdenes de compra vs. recepciones, y liquidación transparente del ahorro neto en el modelo Gain-Share.") }}
            </p>
          </div>
          <div class="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold">
            <span class="text-slate-400">{{ store.t("Impacto") }}:</span>
            <span class="text-emerald-600 dark:text-emerald-400 font-mono">100% {{ store.t("conciliación en tiempo real") }}</span>
          </div>
        </article>
      </div>

      <!-- Live Multi-Agent Event Stream Card -->
      <div class="panel rounded-3xl border border-slate-200/90 bg-white/95 dark:bg-slate-900/95 dark:border-slate-800/80 p-6 shadow-sm space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div class="flex items-center gap-3">
            <span class="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500 text-white text-xs shadow-xs">
              <i class="fa-solid fa-wave-square"></i>
            </span>
            <div>
              <h4 class="font-head text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">{{ store.t("Flujo de Actividad Multi-Agente en Tiempo Real") }}</h4>
              <p class="text-[11px] text-slate-400">{{ store.t("Coordinación autónoma continua sin intervención manual") }}</p>
            </div>
          </div>
          <span class="rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-300 flex items-center gap-1.5">
            <span class="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span> 55+ AGENTS LIVE
          </span>
        </div>

        <div class="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 text-xs">
          <div class="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 space-y-1.5">
            <div class="flex items-center justify-between">
              <b class="text-indigo-600 dark:text-indigo-400 text-[11px] flex items-center gap-1.5">
                <i class="fa-solid fa-file-signature"></i> Intake Agent
              </b>
              <time class="text-[10px] text-slate-400">Hace 2m</time>
            </div>
            <p class="text-slate-700 dark:text-slate-200 leading-snug">
              {{ store.t("PR-2026-104 validado y asignado automáticamente a subasta Cloud DevOps.") }}
            </p>
          </div>

          <div class="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 space-y-1.5">
            <div class="flex items-center justify-between">
              <b class="text-brand text-[11px] flex items-center gap-1.5">
                <i class="fa-solid fa-gavel"></i> BAFO Auction
              </b>
              <time class="text-[10px] text-slate-400">Hace 4m</time>
            </div>
            <p class="text-slate-700 dark:text-slate-200 leading-snug">
              {{ store.t("Contraoferta generada en AUC-2026-014: -$50 USD sobre el mejor postor.") }}
            </p>
          </div>

          <div class="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 space-y-1.5">
            <div class="flex items-center justify-between">
              <b class="text-amber-600 dark:text-amber-400 text-[11px] flex items-center gap-1.5">
                <i class="fa-solid fa-shield-halved"></i> SRM Agent
              </b>
              <time class="text-[10px] text-slate-400">Hace 7m</time>
            </div>
            <p class="text-slate-700 dark:text-slate-200 leading-snug">
              {{ store.t("Score 96/100 verificado para TechGlobal Inc. (ISO-27001 & SAT 32D activo).") }}
            </p>
          </div>

          <div class="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 space-y-1.5">
            <div class="flex items-center justify-between">
              <b class="text-teal-600 dark:text-teal-400 text-[11px] flex items-center gap-1.5">
                <i class="fa-solid fa-file-contract"></i> CLM & Escrow
              </b>
              <time class="text-[10px] text-slate-400">Hace 11m</time>
            </div>
            <p class="text-slate-700 dark:text-slate-200 leading-snug">
              {{ store.t("Contrato generado con custodia de $14,000 en Escrow y 3 hitos auditables.") }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- 4. TRENDING SERVICES & GIGS -->
    <section v-if="!supplierMode" class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="premium-kicker text-xs font-bold uppercase tracking-widest text-brand">{{ store.t("Servicios Más Vendidos") }}</p>
          <h2 class="font-head text-2xl font-800 tracking-tight text-slate-900 dark:text-white">{{ store.t("Paquetes de Servicios Destacados") }}</h2>
        </div>
        <RouterLink :to="supplierMode ? '/find-work' : '/browse-services'" class="btn-muted text-xs py-2 px-4">
          {{ store.t("Explorar Todo el Catálogo") }} <i class="fa-solid fa-arrow-right ml-1"></i>
        </RouterLink>
      </div>

      <div class="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <article
          v-for="service in trendingServices"
          :key="service.id"
          class="premium-card rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-xl transition-all duration-300 dark:border-slate-800/80 dark:bg-slate-900/90 flex flex-col justify-between"
        >
          <div>
            <div class="relative rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 aspect-video flex items-center justify-center">
              <i :class="service.icon" class="text-3xl text-brand"></i>
              <button class="absolute top-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-slate-500 hover:text-rose-500 transition text-xs cursor-pointer">
                <i class="fa-solid fa-heart"></i>
              </button>
            </div>

            <div class="mt-4 flex items-center justify-between text-xs">
              <span class="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                {{ service.category }}
              </span>
              <span class="text-amber-500 font-bold text-xs flex items-center gap-1">
                <i class="fa-solid fa-star"></i>{{ service.rating }}
              </span>
            </div>

            <h3 class="font-head text-sm font-800 text-slate-900 hover:text-brand dark:text-white mt-2 transition line-clamp-2">
              {{ service.title }}
            </h3>
          </div>

          <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span class="text-[10px] text-slate-400 uppercase font-bold block">{{ store.t("Desde") }}</span>
              <b class="font-mono text-sm font-800 text-brand">{{ store.money(service.price) }}</b>
            </div>
            <RouterLink :to="service.to" class="btn-muted text-xs py-1.5 px-3">
              {{ store.t("Ver Detalle") }}
            </RouterLink>
          </div>
        </article>
      </div>
    </section>

    <!-- 5. TWO-COLUMN: LATEST JOBS / RFQs & QUICK SEARCH LINKS -->
    <section class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="premium-kicker text-xs font-bold uppercase tracking-widest text-brand">{{ store.t("Oportunidades Abiertas") }}</p>
          <h2 class="font-head text-2xl font-800 tracking-tight text-slate-900 dark:text-white">{{ store.t("Últimos Proyectos y Licitaciones RFX") }}</h2>
        </div>
        <RouterLink :to="supplierMode ? '/find-work' : '/browse-services'" class="btn-muted text-xs py-2 px-4">
          {{ store.t("Ver Todas las Solicitudes") }} <i class="fa-solid fa-arrow-right ml-1"></i>
        </RouterLink>
      </div>

      <div class="flex flex-col lg:flex-row items-start gap-8">
        <!-- Main: Job Listings -->
        <div class="flex-1 w-full space-y-4 min-w-0">
          <article
            v-for="job in featuredJobs"
            :key="job.id"
            class="premium-card rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-md hover:border-brand/40 transition dark:border-slate-800/80 dark:bg-slate-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div class="space-y-2 min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="rounded-md bg-brand-50 text-brand dark:bg-brand/15 px-2 py-0.5 text-[10px] font-bold">
                  {{ job.category }}
                </span>
                <span class="text-[10px] font-bold text-slate-400">
                  <i class="fa-solid fa-circle-check text-emerald-500 mr-1"></i>{{ store.t("Verificado") }}
                </span>
              </div>

              <RouterLink :to="`/job/${job.id}`" class="block">
                <h3 class="font-head text-sm sm:text-base font-800 text-slate-900 hover:text-brand dark:text-white transition truncate">
                  {{ job.title }}
                </h3>
              </RouterLink>

              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="skill in (job.skills || []).slice(0, 3)"
                  :key="skill"
                  class="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300"
                >
                  {{ skill }}
                </span>
              </div>
            </div>

            <div class="flex sm:flex-col items-center sm:items-end justify-between gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800 flex-shrink-0">
              <div class="text-left sm:text-right">
                <b class="font-mono text-base font-800 text-slate-900 dark:text-white block">{{ store.money(job.budget, job.currency) }}</b>
                <span class="text-[10px] text-slate-400 font-bold uppercase">{{ job.budgetType || 'Fijo' }}</span>
              </div>
              <RouterLink :to="`/job/${job.id}`" class="btn-brand text-xs py-1.5 px-4">
                {{ store.t("Postularse") }}
              </RouterLink>
            </div>
          </article>
        </div>

        <!-- Sidebar: Quick Links & Safety Banner -->
        <div class="w-full lg:w-80 flex-shrink-0 space-y-6">
          <div class="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/90 space-y-4">
            <h4 class="font-head text-sm font-800 text-slate-900 dark:text-white uppercase tracking-wider">
              {{ store.t("Habilidades Populares") }}
            </h4>
            <div class="flex flex-wrap gap-2 text-xs">
              <RouterLink
                v-for="skill in popularSkills"
                :key="skill"
                :to="supplierMode ? '/find-work' : '/browse-services'"
                class="rounded-lg border border-slate-200/80 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:border-brand hover:text-brand dark:border-slate-700/80 dark:bg-slate-800/60 dark:text-slate-300 transition shadow-2xs"
              >
                {{ skill }}
              </RouterLink>
            </div>
          </div>

          <div class="rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-50 to-rose-50 p-6 dark:from-slate-800 dark:to-slate-800/80 dark:border-brand-900/40 space-y-3">
            <div class="flex items-center gap-2 text-brand">
              <i class="fa-solid fa-shield-halved text-xl"></i>
              <h4 class="font-head text-sm font-800 text-slate-900 dark:text-white">{{ store.t("Garantía Buyniverse Escrow") }}</h4>
            </div>
            <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {{ store.t("Todos los pagos se retienen de forma segura y solo se liberan tras tu aprobación de los entregables.") }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- 6. MOST HIRED FREELANCERS & DIRECTORY CARDS -->
    <section v-if="!supplierMode" class="space-y-6">
      <div class="text-center max-w-2xl mx-auto space-y-2">
        <p class="premium-kicker text-xs font-bold uppercase tracking-widest text-brand">{{ store.t("Talento Más Contratado") }}</p>
        <h2 class="font-head text-2xl sm:text-3xl font-800 tracking-tight text-slate-900 dark:text-white">
          {{ store.t("Profesionales y Agencias de Alto Desempeño") }}
        </h2>
      </div>

      <div class="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <article
          v-for="freelancer in topFreelancers"
          :key="freelancer.id"
          class="premium-card rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm hover:shadow-xl transition-all duration-300 dark:border-slate-800/80 dark:bg-slate-900/90 text-center space-y-3 flex flex-col justify-between"
        >
          <div>
            <div class="relative inline-block mx-auto">
              <span class="grid h-16 w-16 place-items-center rounded-2xl bg-brand font-head text-xl font-bold text-white shadow-md mx-auto">
                {{ freelancer.name.charAt(0) }}
              </span>
              <span class="absolute -top-1 -right-2 badge bg-amber-400 text-slate-950 font-800 text-[9px] px-1.5 py-0.5 shadow-xs">
                FEATURED
              </span>
            </div>

            <h3 class="font-head text-base font-800 text-slate-900 dark:text-white mt-3">{{ freelancer.name }}</h3>
            <p class="text-xs text-brand font-bold">{{ freelancer.title }}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1 mt-1">
              <i class="fa-solid fa-location-dot text-slate-400"></i>{{ freelancer.location }}
            </p>
          </div>

          <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span class="text-[10px] text-slate-400 uppercase font-bold block">{{ store.t("Tarifa") }}</span>
              <b class="font-mono font-800 text-slate-900 dark:text-white">{{ store.money(freelancer.hourlyRate) }}/hr</b>
            </div>
            <RouterLink :to="`/profile/${freelancer.id}`" class="btn-brand text-xs py-1.5 px-3">
              {{ store.t("Contratar") }}
            </RouterLink>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  props: {
    store: Object,
    categories: Array,
    trendingServices: Array,
    featuredJobs: Array,
    popularSkills: Array,
    topFreelancers: Array,
    supplierMode: Boolean,
  }
};
</script>
