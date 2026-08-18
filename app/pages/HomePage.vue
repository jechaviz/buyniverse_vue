<template>
  <div class="space-y-16 lg:space-y-24">
    <!-- ========================================================================= -->
    <!-- 1. HERO SECTION WITH UNIVERSAL SEARCH & LIVE AUCTION PREVIEW             -->
    <!-- ========================================================================= -->
    <header class="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-br from-slate-50 via-white to-rose-50/70 p-6 sm:p-10 lg:p-14 text-slate-900 shadow-xl dark:border-slate-800 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-brand-950 dark:text-white">
      <!-- Ambient Glows -->
      <div class="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-brand-500/15 blur-3xl pointer-events-none dark:bg-brand-500/20"></div>
      <div class="absolute -left-20 -bottom-20 h-96 w-96 rounded-full bg-rose-500/10 blur-3xl pointer-events-none dark:bg-indigo-500/15"></div>

      <div class="relative z-10 space-y-8">
        <div class="flex flex-col lg:flex-row items-center gap-10">
          <!-- Hero Text -->
          <div class="flex-1 w-full space-y-5">
            <div class="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50/90 px-3.5 py-1.5 text-xs font-bold text-brand-700 backdrop-blur-md dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
              <span class="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {{ store.t("Ecosistema B2B & Marketplace de Subastas en Vivo") }}
            </div>

            <h1 class="font-head text-3xl sm:text-4xl lg:text-5xl font-800 tracking-tight leading-[1.15] text-slate-900 dark:text-white">
              {{ store.t("Contrata Expertos y Optimiza tus Adquisiciones al") }}
              <span class="bg-gradient-to-r from-brand-600 via-rose-500 to-amber-500 bg-clip-text text-transparent dark:from-brand-300 dark:via-rose-300 dark:to-amber-200">
                {{ store.t("Mejor Postor") }}
              </span>
            </h1>

            <p class="text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300 max-w-2xl">
              {{ store.t("Conecta con los mejores freelancers del mundo y proveedores corporativos. Subastas inversas BAFO, cotizaciones RFX, custodia en fideicomiso (Escrow) y pagos 100% seguros.") }}
            </p>

            <!-- Interactive Universal Search Bar -->
            <div class="rounded-2xl border border-slate-200/90 bg-white p-2 shadow-lg dark:border-slate-700/80 dark:bg-slate-900/90">
              <form @submit.prevent="executeSearch" novalidate data-no-validate="true" class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div class="relative flex-1 flex items-center px-3">
                  <i class="fa-solid fa-magnifying-glass text-slate-400 text-sm mr-2.5"></i>
                  <input
                    v-model="searchQuery"
                    type="text"
                    data-optional="true"
                    data-no-validate="true"
                    :placeholder="store.t('¿Qué proyecto o servicio necesitas hoy?')"
                    class="w-full bg-transparent text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none"
                  />
                </div>
                <!-- Custom Styled Category Dropdown -->
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

                  <!-- Floating Glassmorphism Dropdown Menu -->
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
                  <i class="fa-solid fa-arrow-right mr-1 sm:hidden"></i>{{ store.t("Buscar") }}
                </button>
              </form>
            </div>

            <!-- Trending Keywords Pills -->
            <div class="flex flex-wrap items-center gap-2 text-xs">
              <span class="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px]">{{ store.t("Tendencias") }}:</span>
              <button
                v-for="kw in trendingKeywords"
                :key="kw"
                @click="searchWithKeyword(kw)"
                class="rounded-lg bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:bg-brand-50 hover:text-brand transition text-[11px] font-medium"
              >
                {{ kw }}
              </button>
            </div>
          </div>

          <!-- Hero Right: Live Auction Widget -->
          <div class="w-full lg:w-[420px] xl:w-[460px] flex-shrink-0">
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

        <!-- Corporate Trust Logo Bar -->
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

    <!-- ========================================================================= -->
    <!-- 2. EXPLORE POPULAR CATEGORIES (Rich Visual Grid)                           -->
    <!-- ========================================================================= -->
    <section class="space-y-6">
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

          <div class="mt-3 flex items-center text-xs font-bold text-brand">
            <span>{{ store.t("Explorar Proyectos") }}</span>
            <i class="fa-solid fa-arrow-right ml-1.5 transition-transform group-hover:translate-x-1"></i>
          </div>
        </RouterLink>
      </div>
    </section>

    <!-- ========================================================================= -->
    <!-- 3. SPLIT VALUE PROPOSITION ("Construye en Minutos con Escrow y BAFO")     -->
    <!-- ========================================================================= -->
    <section class="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-slate-50 via-white to-rose-50/70 p-8 sm:p-12 text-slate-900 shadow-xl overflow-hidden relative dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 dark:border-slate-800 dark:text-white">
      <div class="flex flex-col lg:flex-row items-center gap-8 relative z-10">
        <!-- Visual Banner Left -->
        <div class="w-full lg:w-1/2 space-y-4">
          <div class="rounded-2xl overflow-hidden border border-slate-200/90 dark:border-white/15 shadow-2xl group">
            <img
              src="assets/homepage/categories_showcase.jpg"
              alt="Buyniverse Categories Showcase"
              class="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        </div>

        <!-- Copy Right -->
        <div class="w-full lg:w-1/2 space-y-5">
          <p class="text-xs font-bold uppercase tracking-widest text-brand dark:text-brand-300">{{ store.t("Innovación en Contratación y Compras B2B") }}</p>
          <h2 class="font-head text-2xl sm:text-3xl lg:text-4xl font-800 tracking-tight leading-tight text-slate-900 dark:text-white">
            {{ store.t("Crea tu Ecosistema de Subastas y Servicios en Minutos") }}
          </h2>
          <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {{ store.t("Experimenta una plataforma de adquisiciones de última generación. Con Buyniverse gestionas rondas de licitación, subastas en vivo, acuerdos por hitos y contratos respaldados por fideicomiso.") }}
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-slate-700 dark:text-slate-200">
            <div class="flex items-center gap-2.5">
              <i class="fa-solid fa-circle-check text-emerald-600 dark:text-emerald-400 text-sm"></i>
              <span>{{ store.t("Subastas inversas transparentes") }}</span>
            </div>
            <div class="flex items-center gap-2.5">
              <i class="fa-solid fa-circle-check text-emerald-600 dark:text-emerald-400 text-sm"></i>
              <span>{{ store.t("Custodia de fondos por entregable") }}</span>
            </div>
            <div class="flex items-center gap-2.5">
              <i class="fa-solid fa-circle-check text-emerald-600 dark:text-emerald-400 text-sm"></i>
              <span>{{ store.t("0% comisiones ocultas para talento") }}</span>
            </div>
            <div class="flex items-center gap-2.5">
              <i class="fa-solid fa-circle-check text-emerald-600 dark:text-emerald-400 text-sm"></i>
              <span>{{ store.t("Mensajería encriptada y videochat") }}</span>
            </div>
          </div>

          <div class="pt-3">
            <RouterLink to="/post-job/new" class="btn-brand text-xs sm:text-sm py-3 px-6 font-bold inline-block shadow-lg">
              {{ store.t("Comenzar Ahora Mismo") }} <i class="fa-solid fa-arrow-right ml-2"></i>
            </RouterLink>
          </div>
        </div>
      </div>
    </section>

    <!-- ========================================================================= -->
    <!-- 3.5 55+ AUTONOMOUS AI PROCUREMENT AGENTS & SRM HUB (Inspired by Mercanis) -->
    <!-- ========================================================================= -->
    <section class="space-y-8">
      <div class="text-center max-w-3xl mx-auto space-y-3">
        <div class="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50/80 px-3.5 py-1 text-xs font-bold text-brand dark:border-brand-900/60 dark:bg-brand/20 dark:text-brand-300 shadow-xs">
          <i class="fa-solid fa-brain text-[11px] animate-pulse"></i>
          <span>{{ store.t("Orquestación Autónoma de Abastecimiento") }}</span>
        </div>
        <h2 class="font-head text-2xl sm:text-3xl lg:text-4xl font-800 tracking-tight text-slate-900 dark:text-white">
          {{ store.t("55+ Agentes Autónomos de IA para Sourcing, SRM, Contratos y Subastas") }}
        </h2>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
          {{ store.t("Multiplica por 10x la productividad de tu equipo de compras. Agentes autónomos especializados que gestionan el ciclo completo desde la solicitud inicial hasta la adjudicación BAFO y el pago en Escrow.") }}
        </p>
      </div>

      <!-- 6 Specialized Agent Cards Grid -->
      <div class="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <!-- Agent 1: Intake & Triage -->
        <article class="premium-card rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm hover:shadow-xl hover:border-brand/40 transition-all dark:border-slate-800/80 dark:bg-slate-900/90 flex flex-col justify-between group">
          <div class="space-y-3.5">
            <div class="flex items-center justify-between">
              <span class="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 text-lg group-hover:scale-110 transition-transform">
                <i class="fa-solid fa-file-signature"></i>
              </span>
              <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span> {{ store.t("Activo") }}
              </span>
            </div>
            <h3 class="font-head text-base font-800 text-slate-900 dark:text-white">{{ store.t("Agente de Intake Inteligente") }}</h3>
            <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {{ store.t("Estructura y clasifica automáticamente solicitudes de compra (PR), valida presupuestos y rutea aprobaciones según políticas corporativas.") }}
            </p>
          </div>
          <div class="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold">
            <span class="text-slate-400">{{ store.t("Impacto") }}:</span>
            <span class="text-emerald-600 dark:text-emerald-400 font-mono">-85% {{ store.t("tiempo de tramitación") }}</span>
          </div>
        </article>

        <!-- Agent 2: Sourcing & RFx -->
        <article class="premium-card rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm hover:shadow-xl hover:border-brand/40 transition-all dark:border-slate-800/80 dark:bg-slate-900/90 flex flex-col justify-between group">
          <div class="space-y-3.5">
            <div class="flex items-center justify-between">
              <span class="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand dark:bg-brand/20 text-lg group-hover:scale-110 transition-transform">
                <i class="fa-solid fa-compass-drafting"></i>
              </span>
              <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span> {{ store.t("Activo") }}
              </span>
            </div>
            <h3 class="font-head text-base font-800 text-slate-900 dark:text-white">{{ store.t("Agente de Sourcing & RFx") }}</h3>
            <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {{ store.t("Genera pliegos de licitación, descubre proveedores calificados, normaliza cotizaciones complejas y construye matrices de comparación.") }}
            </p>
          </div>
          <div class="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold">
            <span class="text-slate-400">{{ store.t("Impacto") }}:</span>
            <span class="text-emerald-600 dark:text-emerald-400 font-mono">+4.2 {{ store.t("proveedores calificados") }}</span>
          </div>
        </article>

        <!-- Agent 3: BAFO Reverse Auction -->
        <article class="premium-card rounded-3xl border-2 border-brand bg-gradient-to-b from-brand-50/40 to-white dark:from-slate-800 dark:to-slate-900 p-6 shadow-md ring-2 ring-brand/20 flex flex-col justify-between group">
          <div class="space-y-3.5">
            <div class="flex items-center justify-between">
              <span class="grid h-12 w-12 place-items-center rounded-2xl bg-brand text-white text-lg group-hover:scale-110 transition-transform shadow-md shadow-brand/20">
                <i class="fa-solid fa-gavel"></i>
              </span>
              <span class="badge bg-brand text-white text-[9px] font-bold">CORE ENGINE</span>
            </div>
            <h3 class="font-head text-base font-800 text-slate-900 dark:text-white">{{ store.t("Agente de Subastas Inversas BAFO") }}</h3>
            <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {{ store.t("Orquesta rondas de pujas en tiempo real, genera contraofertas dinámicas y obtiene la mejor oferta final (BAFO) reduciendo el bid inicial.") }}
            </p>
          </div>
          <div class="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold">
            <span class="text-slate-400">{{ store.t("Impacto") }}:</span>
            <span class="text-brand font-mono font-800">15% a 25% {{ store.t("ahorro directo") }}</span>
          </div>
        </article>

        <!-- Agent 4: SRM & Vendor Risk -->
        <article class="premium-card rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm hover:shadow-xl hover:border-brand/40 transition-all dark:border-slate-800/80 dark:bg-slate-900/90 flex flex-col justify-between group">
          <div class="space-y-3.5">
            <div class="flex items-center justify-between">
              <span class="grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 text-lg group-hover:scale-110 transition-transform">
                <i class="fa-solid fa-shield-halved"></i>
              </span>
              <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span> {{ store.t("Activo") }}
              </span>
            </div>
            <h3 class="font-head text-base font-800 text-slate-900 dark:text-white">{{ store.t("Agente SRM & Riesgo de Proveedores") }}</h3>
            <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {{ store.t("Monitoreo continuo 24/7 de solvencia financiera, certificaciones de cumplimiento normativo (ISO, SOC, SAT) y reputación de entrega.") }}
            </p>
          </div>
          <div class="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold">
            <span class="text-slate-400">{{ store.t("Impacto") }}:</span>
            <span class="text-emerald-600 dark:text-emerald-400 font-mono">100% {{ store.t("visibilidad de riesgo") }}</span>
          </div>
        </article>

        <!-- Agent 5: Smart Contracts & CLM -->
        <article class="premium-card rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm hover:shadow-xl hover:border-brand/40 transition-all dark:border-slate-800/80 dark:bg-slate-900/90 flex flex-col justify-between group">
          <div class="space-y-3.5">
            <div class="flex items-center justify-between">
              <span class="grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400 text-lg group-hover:scale-110 transition-transform">
                <i class="fa-solid fa-file-contract"></i>
              </span>
              <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span> {{ store.t("Activo") }}
              </span>
            </div>
            <h3 class="font-head text-base font-800 text-slate-900 dark:text-white">{{ store.t("Agente de Contratos CLM & Escrow") }}</h3>
            <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {{ store.t("Generación automática de contratos vinculados a entregables, auditoría de cláusulas de SLA y desbloqueo seguro de pagos en custodia.") }}
            </p>
          </div>
          <div class="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold">
            <span class="text-slate-400">{{ store.t("Impacto") }}:</span>
            <span class="text-emerald-600 dark:text-emerald-400 font-mono">0 {{ store.t("disputas no resueltas") }}</span>
          </div>
        </article>

        <!-- Agent 6: Spend Analytics & Gain-Share -->
        <article class="premium-card rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm hover:shadow-xl hover:border-brand/40 transition-all dark:border-slate-800/80 dark:bg-slate-900/90 flex flex-col justify-between group">
          <div class="space-y-3.5">
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

    <!-- ========================================================================= -->
    <!-- 4. TRENDING SERVICES & GIGS (Packaged Solutions)                          -->
    <!-- ========================================================================= -->
    <section class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="premium-kicker text-xs font-bold uppercase tracking-widest text-brand">{{ store.t("Servicios Más Vendidos") }}</p>
          <h2 class="font-head text-2xl font-800 tracking-tight text-slate-900 dark:text-white">{{ store.t("Paquetes de Servicios Destacados") }}</h2>
        </div>
        <RouterLink to="/browse-services" class="btn-muted text-xs py-2 px-4">
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
              <button class="absolute top-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-slate-500 hover:text-rose-500 transition text-xs">
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

    <!-- ========================================================================= -->
    <!-- 5. TWO-COLUMN: LATEST JOBS / RFQs & QUICK SEARCH LINKS                   -->
    <!-- ========================================================================= -->
    <section class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="premium-kicker text-xs font-bold uppercase tracking-widest text-brand">{{ store.t("Oportunidades Abiertas") }}</p>
          <h2 class="font-head text-2xl font-800 tracking-tight text-slate-900 dark:text-white">{{ store.t("Últimos Proyectos y Licitaciones RFX") }}</h2>
        </div>
        <RouterLink to="/browse-services" class="btn-muted text-xs py-2 px-4">
          {{ store.t("Ver Todas las Solicitudes") }} <i class="fa-solid fa-arrow-right ml-1"></i>
        </RouterLink>
      </div>

      <div class="flex flex-col lg:flex-row items-start gap-8">
        <!-- Main: Job Listings (Width: 68%) -->
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

        <!-- Sidebar: Quick Links & Safety Banner (Width: 320px) -->
        <div class="w-full lg:w-80 flex-shrink-0 space-y-6">
          <div class="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/90 space-y-4">
            <h4 class="font-head text-sm font-800 text-slate-900 dark:text-white uppercase tracking-wider">
              {{ store.t("Habilidades Populares") }}
            </h4>
            <div class="flex flex-wrap gap-2 text-xs">
              <RouterLink
                v-for="skill in popularSkills"
                :key="skill"
                to="/browse-services"
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

    <!-- ========================================================================= -->
    <!-- 6. MOST HIRED FREELANCERS & DIRECTORY CARDS                              -->
    <!-- ========================================================================= -->
    <section class="space-y-6">
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

    <!-- ========================================================================= -->
    <!-- 7. SUCCESS-BASED BUSINESS MODEL (GAIN-SHARE / ZERO SUBSCRIPTION)          -->
    <!-- ========================================================================= -->
    <section class="space-y-8">
      <div class="text-center max-w-3xl mx-auto space-y-2">
        <p class="premium-kicker text-xs font-bold uppercase tracking-widest text-brand">{{ store.t("Modelo Basado en Éxito (Gain-Share)") }}</p>
        <h2 class="font-head text-2xl sm:text-3xl lg:text-4xl font-800 tracking-tight text-slate-900 dark:text-white">
          {{ store.t("Sin Suscripciones: Solo Pagas si Generamos Ahorro Real") }}
        </h2>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          {{ store.t("Publicar y licitar es 100% gratuito. Nuestra comisión se calcula únicamente sobre la reducción del bid del proveedor ganador lograda en la subasta inversa BAFO.") }}
        </p>
      </div>

      <div class="grid gap-6 grid-cols-1 md:grid-cols-3">
        <!-- Card 1: 40% Success Fee -->
        <article class="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm flex flex-col justify-between transition-all hover:shadow-xl dark:border-slate-800/80 dark:bg-slate-900/90">
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="font-head text-base font-800 text-slate-900 dark:text-white">{{ store.t("Tarifa Estándar de Éxito") }}</span>
              <span class="badge bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-[10px] font-bold">Base</span>
            </div>

            <div>
              <b class="font-mono text-3xl font-800 text-brand">40%</b>
              <span class="text-xs text-slate-500 dark:text-slate-400"> {{ store.t("del ahorro de subasta") }}</span>
            </div>

            <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {{ store.t("Tu empresa retiene el 60% del ahorro neto obtenido frente al bid inicial del proveedor.") }}
            </p>

            <ul class="space-y-2 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 pt-4">
              <li class="flex items-center gap-2">
                <i class="fa-solid fa-circle-check text-emerald-500"></i>
                <span>{{ store.t("$0 Cuota mensual o por usuario") }}</span>
              </li>
              <li class="flex items-center gap-2">
                <i class="fa-solid fa-circle-check text-emerald-500"></i>
                <span>{{ store.t("Subastas inversas BAFO en vivo ilimitadas") }}</span>
              </li>
              <li class="flex items-center gap-2">
                <i class="fa-solid fa-circle-check text-emerald-500"></i>
                <span>{{ store.t("Custodia en fideicomiso (Escrow) 100% incluida") }}</span>
              </li>
            </ul>
          </div>

          <div class="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <RouterLink to="/post-job/new" class="btn-muted w-full py-2.5 text-center block text-xs font-bold rounded-xl transition">
              {{ store.t("Publicar Proyecto Gratis") }}
            </RouterLink>
          </div>
        </article>

        <!-- Card 2: 25% High Volume / Adjusted Margin -->
        <article class="rounded-3xl border-2 border-brand bg-gradient-to-b from-brand-50/60 to-white dark:from-slate-800 dark:to-slate-900 p-6 shadow-md ring-2 ring-brand/20 flex flex-col justify-between transition-all hover:shadow-xl">
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="font-head text-base font-800 text-slate-900 dark:text-white">{{ store.t("Volumen & Margen Ajustado") }}</span>
              <span class="badge bg-brand text-white text-[9px] font-bold">MÁS ELEGIDO</span>
            </div>

            <div>
              <b class="font-mono text-3xl font-800 text-emerald-600 dark:text-emerald-400">25%</b>
              <span class="text-xs text-slate-500 dark:text-slate-400"> {{ store.t("del ahorro de subasta") }}</span>
            </div>

            <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {{ store.t("Para licitaciones de gran volumen o proyectos donde se pacta un margen estrecho. Tu empresa retiene el 75% del ahorro.") }}
            </p>

            <ul class="space-y-2 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 pt-4">
              <li class="flex items-center gap-2">
                <i class="fa-solid fa-circle-check text-emerald-500"></i>
                <span>{{ store.t("Tu empresa retiene el 75% del ahorro") }}</span>
              </li>
              <li class="flex items-center gap-2">
                <i class="fa-solid fa-circle-check text-emerald-500"></i>
                <span>{{ store.t("3-Way Match y Conciliación Fiscal Automatizada") }}</span>
              </li>
              <li class="flex items-center gap-2">
                <i class="fa-solid fa-circle-check text-emerald-500"></i>
                <span>{{ store.t("Auditoría Financiera y Reporte de Ahorros") }}</span>
              </li>
            </ul>
          </div>

          <div class="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <RouterLink to="/post-job/new" class="btn-brand w-full py-2.5 text-center block text-xs font-bold rounded-xl shadow-md transition">
              {{ store.t("Comenzar con Gain-Share") }}
            </RouterLink>
          </div>
        </article>

        <!-- Card 3: Zero Risk Guarantee -->
        <article class="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm flex flex-col justify-between transition-all hover:shadow-xl dark:border-slate-800/80 dark:bg-slate-900/90">
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="font-head text-base font-800 text-slate-900 dark:text-white">{{ store.t("Garantía Cero Riesgo") }}</span>
              <span class="badge bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 text-[10px] font-bold">100% Seguro</span>
            </div>

            <div>
              <b class="font-mono text-3xl font-800 text-slate-900 dark:text-white">$0.00</b>
              <span class="text-xs text-slate-500 dark:text-slate-400"> {{ store.t("si no hay ahorro") }}</span>
            </div>

            <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {{ store.t("Si los proveedores no reducen su oferta durante la subasta, no pagas un solo centavo de comisión.") }}
            </p>

            <ul class="space-y-2 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 pt-4">
              <li class="flex items-center gap-2">
                <i class="fa-solid fa-circle-check text-emerald-500"></i>
                <span>{{ store.t("Sin compromisos de permanencia") }}</span>
              </li>
              <li class="flex items-center gap-2">
                <i class="fa-solid fa-circle-check text-emerald-500"></i>
                <span>{{ store.t("Transparencia total en el registro de pujas") }}</span>
              </li>
              <li class="flex items-center gap-2">
                <i class="fa-solid fa-circle-check text-emerald-500"></i>
                <span>{{ store.t("Soporte y asesoría de abastecimiento") }}</span>
              </li>
            </ul>
          </div>

          <div class="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <RouterLink to="/post-job/new" class="btn-muted w-full py-2.5 text-center block text-xs font-bold rounded-xl transition">
              {{ store.t("Probar sin Compromiso") }}
            </RouterLink>
          </div>
        </article>
      </div>
    </section>

    <!-- ========================================================================= -->
    <!-- 8. INTERACTIVE ROI & GAIN-SHARE CALCULATOR                                -->
    <!-- ========================================================================= -->
    <section class="panel p-8 sm:p-12 rounded-3xl border border-slate-200/90 bg-white shadow-card dark:border-slate-800/80 dark:bg-slate-900/90 space-y-8">
      <div class="text-center max-w-4xl mx-auto space-y-2">
        <p class="premium-kicker text-xs font-bold uppercase tracking-widest text-brand">{{ store.t("Calculadora de Ahorro y Ganancia Compartida") }}</p>
        <h2 class="font-head text-2xl sm:text-3xl lg:text-4xl font-800 tracking-tight text-slate-900 dark:text-white md:whitespace-nowrap">
          {{ store.t("Simula tu Ahorro de Subasta y el Retorno Neto") }}
        </h2>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
          {{ store.t("La comisión se calcula sobre la rebaja del bid del proveedor ganador en subasta. Tu reporte refleja el ahorro financiero total frente a tu presupuesto base.") }}
        </p>
      </div>

      <div class="flex flex-col lg:flex-row items-center gap-8">
        <!-- Slider Input (50%) -->
        <div class="w-full lg:w-1/2 space-y-6">
          <div>
            <div class="flex justify-between items-center mb-2">
              <label class="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">{{ store.t("Presupuesto Base del Proyecto (Requerido)") }}</label>
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

          <!-- Simulation breakdown cards -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
              <span class="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase block">{{ store.t("Bid Inicial Mejor Proveedor") }}</span>
              <b class="font-mono text-base font-800 text-slate-900 dark:text-slate-100">{{ store.money(annualSpend * 0.95) }}</b>
              <span class="text-[10px] text-slate-400 block mt-0.5">{{ store.t("Oferta antes de subasta") }}</span>
            </div>
            <div class="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
              <span class="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase block">{{ store.t("Oferta Final Adjudicada") }}</span>
              <b class="font-mono text-base font-800 text-emerald-600 dark:text-emerald-400">{{ store.money(annualSpend * 0.80) }}</b>
              <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5">-15% {{ store.t("en subasta BAFO") }}</span>
            </div>
          </div>
        </div>

        <!-- Calculated Metrics Card (50%) -->
        <div class="w-full lg:w-1/2">
          <div class="rounded-3xl bg-gradient-to-br from-brand-50/70 via-rose-50/50 to-white border border-brand-200 p-6 sm:p-8 dark:from-slate-800 dark:to-slate-800/60 dark:border-brand-900/40 space-y-6 shadow-sm">
            <div class="flex items-center justify-between border-b border-brand-200/60 dark:border-slate-700 pb-4">
              <div>
                <p class="text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">{{ store.t("Ganancia Neta en tu Bolsillo") }}</p>
                <p class="font-head font-mono text-3xl sm:text-4xl font-800 text-emerald-600 dark:text-emerald-400 mt-1">
                  +{{ store.money(annualSpend * 0.15 * (1 - gainShareRate)) }}
                </p>
                <span class="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{{ store.t("Ahorro financiero total vs. presupuesto") }}: <b>{{ store.money(annualSpend * 0.20) }} (-20%)</b></span>
              </div>
              <span class="grid h-12 w-12 place-items-center rounded-2xl bg-brand text-white text-lg shadow-md shadow-brand/20">
                <i class="fa-solid fa-hand-holding-dollar"></i>
              </span>
            </div>

            <!-- Gain-share selector buttons -->
            <div class="flex items-center gap-2 text-xs">
              <span class="font-bold text-slate-600 dark:text-slate-300">{{ store.t("Esquema") }}:</span>
              <button
                type="button"
                @click="gainShareRate = 0.40"
                class="px-3 py-1 rounded-lg font-bold transition text-xs cursor-pointer"
                :class="gainShareRate === 0.40 ? 'bg-brand text-white shadow-xs' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'"
              >
                40% {{ store.t("Estándar") }}
              </button>
              <button
                type="button"
                @click="gainShareRate = 0.25"
                class="px-3 py-1 rounded-lg font-bold transition text-xs cursor-pointer"
                :class="gainShareRate === 0.25 ? 'bg-brand text-white shadow-xs' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'"
              >
                25% {{ store.t("Gran Volumen / Margen") }}
              </button>
            </div>

            <div class="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-700 pt-3">
              <div class="flex items-center justify-between">
                <span><i class="fa-solid fa-arrow-trend-down text-emerald-500 mr-2"></i>{{ store.t("Ahorro de Subasta (Bid Inicial - BAFO)") }}</span>
                <b class="font-mono font-bold text-slate-900 dark:text-white">{{ store.money(annualSpend * 0.15) }}</b>
              </div>
              <div class="flex items-center justify-between">
                <span><i class="fa-solid fa-handshake text-brand mr-2"></i>{{ store.t("Honorario Buyniverse por Éxito") }} ({{ Math.round(gainShareRate * 100) }}%)</span>
                <b class="font-mono font-bold text-slate-900 dark:text-white">{{ store.money(annualSpend * 0.15 * gainShareRate) }}</b>
              </div>
              <div class="flex items-center justify-between text-emerald-700 dark:text-emerald-300 font-bold">
                <span><i class="fa-solid fa-circle-check mr-2"></i>{{ store.t("Tu Ahorro Neto Retenido") }} ({{ Math.round((1 - gainShareRate) * 100) }}%)</span>
                <b class="font-mono">{{ store.money(annualSpend * 0.15 * (1 - gainShareRate)) }}</b>
              </div>
            </div>

            <RouterLink to="/post-job/new" class="btn-brand w-full py-3.5 text-center block text-sm font-bold shadow-md shadow-brand/20">
              {{ store.t("Publicar Proyecto y Ahorrar con Gain-Share") }}
            </RouterLink>
          </div>
        </div>
      </div>
    </section>

    <!-- ========================================================================= -->
    <!-- 9. MOBILE EXPERIENCE & APP DOWNLOAD SHOWCASE                              -->
    <!-- ========================================================================= -->
    <section class="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-slate-50 via-white to-indigo-50/70 p-8 sm:p-12 text-slate-900 shadow-xl overflow-hidden relative dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 dark:border-slate-800 dark:text-white">
      <div class="flex flex-col lg:flex-row items-center gap-8 relative z-10">
        <div class="w-full lg:w-1/2 space-y-5">
          <p class="text-xs font-bold uppercase tracking-widest text-brand dark:text-brand-300">{{ store.t("Multi-plataforma & Notificaciones en Vivo") }}</p>
          <h2 class="font-head text-2xl sm:text-3xl lg:text-4xl font-800 tracking-tight leading-tight text-slate-900 dark:text-white">
            {{ store.t("Controla tus Subastas y Contratos desde Cualquier Dispositivo") }}
          </h2>
          <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {{ store.t("Recibe alertas de contraofertas BAFO al instante, aprueba hitos de trabajo sobre la marcha y comunícate en tiempo real con tu equipo.") }}
          </p>

          <div class="flex flex-wrap gap-4 pt-2">
            <button class="rounded-xl border border-slate-300 bg-white px-5 py-3 text-xs font-bold text-slate-800 shadow-sm hover:border-brand hover:text-brand dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 transition flex items-center gap-3">
              <i class="fa-brands fa-apple text-2xl"></i>
              <div class="text-left">
                <span class="text-[9px] text-slate-400 uppercase block">Disponible en</span>
                <span class="text-xs font-bold">App Store</span>
              </div>
            </button>
            <button class="rounded-xl border border-slate-300 bg-white px-5 py-3 text-xs font-bold text-slate-800 shadow-sm hover:border-brand hover:text-brand dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 transition flex items-center gap-3">
              <i class="fa-brands fa-google-play text-xl text-emerald-500"></i>
              <div class="text-left">
                <span class="text-[9px] text-slate-400 uppercase block">Disponible en</span>
                <span class="text-xs font-bold">Google Play</span>
              </div>
            </button>
          </div>
        </div>

        <div class="w-full lg:w-1/2">
          <div class="rounded-2xl overflow-hidden border border-slate-200/90 dark:border-white/15 shadow-2xl group">
            <img
              src="assets/homepage/mobile_app_showcase.jpg"
              alt="Buyniverse Mobile App Showcase"
              class="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- ========================================================================= -->
    <!-- 10. FINAL CALL TO ACTION                                                 -->
    <!-- ========================================================================= -->
    <section class="rounded-3xl border border-slate-200/90 bg-gradient-to-r from-brand-600 via-rose-600 to-brand-700 p-8 sm:p-12 text-center text-white shadow-xl space-y-6">
      <div class="max-w-2xl mx-auto space-y-3">
        <h2 class="font-head text-2xl sm:text-3xl font-800 tracking-tight">
          {{ store.t("¿Listo para transformar tus adquisiciones y ventas?") }}
        </h2>
        <p class="text-xs sm:text-sm text-brand-100 leading-relaxed">
          {{ store.t("Únete a empresas líderes y freelancers certificados que ya operan bajo el estándar de subastas en vivo, 3-way match y fideicomiso seguro.") }}
        </p>
      </div>

      <div class="flex flex-wrap justify-center items-center gap-4 pt-2">
        <RouterLink to="/post-job/new" class="rounded-xl bg-white px-6 py-3.5 text-sm font-800 text-brand-600 shadow-lg hover:bg-slate-100 transition inline-flex items-center">
          <i class="fa-solid fa-plus-circle mr-2 text-brand-600"></i>{{ store.t("Crear Cuenta y Publicar") }}
        </RouterLink>
        <RouterLink to="/dashboard" class="rounded-xl border-2 border-white bg-black/30 hover:bg-white hover:text-brand-600 px-6 py-3.5 text-sm font-800 text-white transition inline-flex items-center shadow-lg group">
          <i class="fa-solid fa-gauge mr-2 group-hover:text-brand-600 transition"></i>{{ store.t("Ir al Panel de Control") }}
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

    const tab = computed(() => (route.query.view === "saved" ? "saved" : "search"));
    const openTab = (key) =>
      router.push({
        path: "/",
        query: window.WebCommon ? window.WebCommon.mergeRouteQuery(route.query, { view: key === "saved" ? "saved" : null }) : { view: key === "saved" ? "saved" : undefined },
      });

    const searchQuery = ref("");
    const selectedCategory = ref("");
    const annualSpend = ref(75000);
    const categoryDropdownOpen = ref(false);

    const categoryOptions = computed(() => [
      { value: "", label: store.t("Todas las Categorías"), icon: "fa-solid fa-layer-group", iconBg: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
      { value: "software", label: store.t("Desarrollo de Software"), icon: "fa-solid fa-code", iconBg: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20" },
      { value: "design", label: store.t("Diseño UX/UI & 3D"), icon: "fa-solid fa-palette", iconBg: "bg-rose-50 text-rose-600 dark:bg-rose-500/20" },
      { value: "procurement", label: store.t("Sourcing & Compras B2B"), icon: "fa-solid fa-gavel", iconBg: "bg-brand-50 text-brand dark:bg-brand/20" },
      { value: "marketing", label: store.t("Marketing & BAFO"), icon: "fa-solid fa-bullhorn", iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20" }
    ]);

    const currentCategoryLabel = computed(() => {
      const found = categoryOptions.value.find((opt) => opt.value === selectedCategory.value);
      return found ? found.label : store.t("Todas las Categorías");
    });

    const currentCategoryIcon = computed(() => {
      const found = categoryOptions.value.find((opt) => opt.value === selectedCategory.value);
      return found ? found.icon : "fa-solid fa-layer-group";
    });

    const selectCategory = (val) => {
      selectedCategory.value = val;
      categoryDropdownOpen.value = false;
    };

    const trendingKeywords = [
      "Subastas Inversas",
      "Desarrollo Web & Apps",
      "Diseño UX/UI",
      "3-Way Match",
      "Marketing B2B",
      "Escrow Seguro"
    ];

    const canSearch = computed(() => !!(searchQuery.value.trim() || selectedCategory.value));

    const executeSearch = () => {
      if (!canSearch.value) return;
      categoryDropdownOpen.value = false;
      const q = searchQuery.value.trim();
      router.push({
        path: "/browse-services",
        query: q ? { q, category: selectedCategory.value || undefined } : (selectedCategory.value ? { category: selectedCategory.value } : undefined)
      });
    };

    const searchWithKeyword = (kw) => {
      searchQuery.value = kw;
      executeSearch();
    };

    const calculatedSavings = computed(() => {
      return annualSpend.value * 0.25;
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

    const categories = computed(() => [
      {
        title: store.t("Desarrollo de Software"),
        subtitle: "Full Stack, Apps Móviles, Cloud & APIs",
        count: "24 Proyectos",
        icon: "fa-solid fa-code",
        iconBg: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20",
        to: "/browse-services"
      },
      {
        title: store.t("Diseño UX/UI & 3D"),
        subtitle: "Figma, Design Systems, Animación",
        count: "18 Proyectos",
        icon: "fa-solid fa-palette",
        iconBg: "bg-rose-50 text-rose-600 dark:bg-rose-500/20",
        to: "/browse-services"
      },
      {
        title: store.t("Sourcing & Compras B2B"),
        subtitle: "Licitaciones RFX, Subastas BAFO",
        count: "32 Rondas",
        icon: "fa-solid fa-gavel",
        iconBg: "bg-brand-50 text-brand dark:bg-brand/20",
        to: "/procurement/auction"
      },
      {
        title: store.t("Marketing & BAFO"),
        subtitle: "Growth, SEO, Campañas Globales",
        count: "15 Proyectos",
        icon: "fa-solid fa-bullhorn",
        iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20",
        to: "/browse-services"
      }
    ]);

    const trendingServices = computed(() => [
      {
        id: "srv-1",
        title: "Desarrollo Completo de App iOS y Android en Flutter",
        category: "Mobile Dev",
        price: 850.0,
        rating: "5.0 (42)",
        icon: "fa-solid fa-mobile-screen-button",
        to: "/browse-services"
      },
      {
        id: "srv-2",
        title: "Diseño de Marca Completa y Manual de Identidad",
        category: "Branding",
        price: 350.0,
        rating: "4.9 (88)",
        icon: "fa-solid fa-pen-nib",
        to: "/browse-services"
      },
      {
        id: "srv-3",
        title: "Auditoría de Compras y Sourcing RFX con 3-Way Match",
        category: "Procurement",
        price: 1200.0,
        rating: "5.0 (19)",
        icon: "fa-solid fa-chart-pie",
        to: "/browse-services"
      },
      {
        id: "srv-4",
        title: "Implementación de Arquitectura Cloud AWS & Docker",
        category: "DevOps",
        price: 950.0,
        rating: "4.8 (31)",
        icon: "fa-solid fa-server",
        to: "/browse-services"
      }
    ]);

    const popularSkills = [
      "Vue 3", "React", "Node.js", "Python", "Figma", "Sourcing B2B", "Docker", "Flutter", "Contratos Escrow", "Subastas BAFO"
    ];

    const topFreelancers = ref([
      {
        id: "user-freelancer-1",
        name: "John Doe",
        title: "Senior Full Stack & Cloud Architect",
        location: "San Francisco, USA",
        hourlyRate: 65.0
      },
      {
        id: "user-freelancer-2",
        name: "Jane Smith",
        title: "Directora de Diseño & UX Specialist",
        location: "Madrid, España",
        hourlyRate: 50.0
      },
      {
        id: "user-supplier-1",
        name: "Carlos Mendoza",
        title: "Especialista en Compras & Licitaciones",
        location: "CDMX, México",
        hourlyRate: 45.0
      },
      {
        id: "user-freelancer-3",
        name: "Sarah Connor",
        title: "DevOps & Security Engineer",
        location: "Austin, USA",
        hourlyRate: 75.0
      }
    ]);

    const gainShareRate = ref(0.40);

    const featuredJobs = computed(() => {
      return (store.state.jobs || []).slice(0, 5);
    });

    return {
      store,
      tab,
      openTab,
      searchQuery,
      selectedCategory,
      categoryDropdownOpen,
      categoryOptions,
      currentCategoryLabel,
      currentCategoryIcon,
      selectCategory,
      annualSpend,
      calculatedSavings,
      gainShareRate,
      canSearch,
      trendingKeywords,
      executeSearch,
      searchWithKeyword,
      demoAuctionJob,
      demoBids,
      categories,
      trendingServices,
      popularSkills,
      topFreelancers,
      featuredJobs
    };
  },
};
</script>
