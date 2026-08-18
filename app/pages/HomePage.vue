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
        <div class="grid gap-10 lg:grid-cols-12 lg:items-center">
          <!-- Hero Text -->
          <div class="lg:col-span-7 space-y-5">
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
              <form @submit.prevent="executeSearch" class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div class="relative flex-1 flex items-center px-3">
                  <i class="fa-solid fa-magnifying-glass text-slate-400 text-sm mr-2.5"></i>
                  <input
                    v-model="searchQuery"
                    type="text"
                    :placeholder="store.t('¿Qué proyecto o servicio necesitas hoy?')"
                    class="w-full bg-transparent text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none"
                  />
                </div>
                <div class="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
                <select
                  v-model="selectedCategory"
                  class="bg-transparent text-xs font-semibold text-slate-600 dark:text-slate-300 px-3 py-2 outline-none cursor-pointer"
                >
                  <option value="">{{ store.t("Todas las Categorías") }}</option>
                  <option value="software">{{ store.t("Desarrollo de Software") }}</option>
                  <option value="design">{{ store.t("Diseño UX/UI & 3D") }}</option>
                  <option value="procurement">{{ store.t("Sourcing & Compras B2B") }}</option>
                  <option value="marketing">{{ store.t("Marketing & BAFO") }}</option>
                </select>
                <button type="submit" class="btn-brand text-xs sm:text-sm py-2.5 px-5 font-bold shadow-md">
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

      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
    <section class="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-8 sm:p-12 text-white shadow-2xl overflow-hidden relative">
      <div class="grid gap-8 lg:grid-cols-12 lg:items-center relative z-10">
        <!-- Visual Banner Left -->
        <div class="lg:col-span-6 space-y-4">
          <div class="rounded-2xl overflow-hidden border border-white/15 shadow-2xl group">
            <img
              src="assets/homepage/categories_showcase.jpg"
              alt="Buyniverse Categories Showcase"
              class="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        </div>

        <!-- Copy Right -->
        <div class="lg:col-span-6 space-y-5">
          <p class="text-xs font-bold uppercase tracking-widest text-brand-300">{{ store.t("Innovación en Contratación y Compras B2B") }}</p>
          <h2 class="font-head text-2xl sm:text-3xl lg:text-4xl font-800 tracking-tight leading-tight">
            {{ store.t("Crea tu Ecosistema de Subastas y Servicios en Minutos") }}
          </h2>
          <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {{ store.t("Experimenta una plataforma de adquisiciones de última generación. Con Buyniverse gestionas rondas de licitación, subastas en vivo, acuerdos por hitos y contratos respaldados por fideicomiso.") }}
          </p>

          <div class="grid sm:grid-cols-2 gap-3 pt-2 text-xs">
            <div class="flex items-center gap-2.5">
              <i class="fa-solid fa-circle-check text-emerald-400 text-sm"></i>
              <span>{{ store.t("Subastas inversas transparentes") }}</span>
            </div>
            <div class="flex items-center gap-2.5">
              <i class="fa-solid fa-circle-check text-emerald-400 text-sm"></i>
              <span>{{ store.t("Custodia de fondos por entregable") }}</span>
            </div>
            <div class="flex items-center gap-2.5">
              <i class="fa-solid fa-circle-check text-emerald-400 text-sm"></i>
              <span>{{ store.t("0% comisiones ocultas para talento") }}</span>
            </div>
            <div class="flex items-center gap-2.5">
              <i class="fa-solid fa-circle-check text-emerald-400 text-sm"></i>
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

      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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

      <div class="grid gap-8 lg:grid-cols-12">
        <!-- Main: Job Listings (8 Cols) -->
        <div class="lg:col-span-8 space-y-4">
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

            <div class="flex sm:flex-col items-center sm:items-end justify-between gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800">
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

        <!-- Sidebar: Quick Links & Safety Banner (4 Cols) -->
        <div class="lg:col-span-4 space-y-6">
          <div class="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/90 space-y-4">
            <h4 class="font-head text-sm font-800 text-slate-900 dark:text-white uppercase tracking-wider">
              {{ store.t("Habilidades Populares") }}
            </h4>
            <div class="flex flex-wrap gap-1.5 text-xs">
              <RouterLink
                v-for="skill in popularSkills"
                :key="skill"
                to="/browse-services"
                class="rounded-lg border border-slate-200/80 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:border-brand hover:text-brand dark:border-slate-700/80 dark:bg-slate-800/60 dark:text-slate-300 transition"
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

      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
    <!-- 7. SUBSCRIPTION PLANS & MEMBERSHIPS (4-Tier Matrix)                      -->
    <!-- ========================================================================= -->
    <section class="space-y-8">
      <div class="text-center max-w-2xl mx-auto space-y-2">
        <p class="premium-kicker text-xs font-bold uppercase tracking-widest text-brand">{{ store.t("Planes Transparentes") }}</p>
        <h2 class="font-head text-2xl sm:text-3xl font-800 tracking-tight text-slate-900 dark:text-white">
          {{ store.t("Elige el Plan Perfecto para tu Empresa o Carrera") }}
        </h2>
      </div>

      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <article
          v-for="plan in pricingPlans"
          :key="plan.name"
          class="rounded-3xl border p-6 shadow-sm flex flex-col justify-between transition-all hover:shadow-xl"
          :class="plan.featured ? 'border-brand bg-gradient-to-b from-brand-50/50 to-white dark:from-slate-800 dark:to-slate-900 shadow-md ring-2 ring-brand/20' : 'border-slate-200/90 bg-white dark:border-slate-800/80 dark:bg-slate-900/90'"
        >
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="font-head text-base font-800 text-slate-900 dark:text-white">{{ plan.name }}</span>
              <span v-if="plan.featured" class="badge bg-brand text-white text-[9px] font-bold">RECOMENDADO</span>
            </div>

            <div>
              <b class="font-mono text-3xl font-800 text-slate-900 dark:text-white">{{ store.money(plan.price) }}</b>
              <span class="text-xs text-slate-400">/mes</span>
            </div>

            <ul class="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <li v-for="feat in plan.features" :key="feat.text" class="flex items-center gap-2">
                <i :class="feat.included ? 'fa-solid fa-circle-check text-emerald-500' : 'fa-solid fa-circle-xmark text-slate-300 dark:text-slate-600'"></i>
                <span :class="feat.included ? '' : 'text-slate-400 line-through'">{{ feat.text }}</span>
              </li>
            </ul>
          </div>

          <div class="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <RouterLink to="/post-job/new" class="w-full py-2.5 text-center block text-xs font-bold rounded-xl transition" :class="plan.featured ? 'btn-brand shadow-md' : 'btn-muted'">
              {{ store.t("Seleccionar Plan") }}
            </RouterLink>
          </div>
        </article>
      </div>
    </section>

    <!-- ========================================================================= -->
    <!-- 8. INTERACTIVE ROI & SAVINGS CALCULATOR                                   -->
    <!-- ========================================================================= -->
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

    <!-- ========================================================================= -->
    <!-- 9. MOBILE EXPERIENCE & APP DOWNLOAD SHOWCASE                              -->
    <!-- ========================================================================= -->
    <section class="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-8 sm:p-12 text-white shadow-2xl overflow-hidden relative">
      <div class="grid gap-8 lg:grid-cols-12 lg:items-center relative z-10">
        <div class="lg:col-span-6 space-y-5">
          <p class="text-xs font-bold uppercase tracking-widest text-brand-300">{{ store.t("Multi-plataforma & Notificaciones en Vivo") }}</p>
          <h2 class="font-head text-2xl sm:text-3xl lg:text-4xl font-800 tracking-tight leading-tight">
            {{ store.t("Controla tus Subastas y Contratos desde Cualquier Dispositivo") }}
          </h2>
          <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {{ store.t("Recibe alertas de contraofertas BAFO al instante, aprueba hitos de trabajo sobre la marcha y comunícate en tiempo real con tu equipo.") }}
          </p>

          <div class="flex flex-wrap gap-4 pt-2">
            <button class="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-xs font-bold text-white backdrop-blur-md hover:bg-white/20 transition flex items-center gap-3">
              <i class="fa-brands fa-apple text-2xl"></i>
              <div class="text-left">
                <span class="text-[9px] text-slate-300 uppercase block">Disponible en</span>
                <span class="text-xs font-bold">App Store</span>
              </div>
            </button>
            <button class="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-xs font-bold text-white backdrop-blur-md hover:bg-white/20 transition flex items-center gap-3">
              <i class="fa-brands fa-google-play text-xl text-emerald-400"></i>
              <div class="text-left">
                <span class="text-[9px] text-slate-300 uppercase block">Disponible en</span>
                <span class="text-xs font-bold">Google Play</span>
              </div>
            </button>
          </div>
        </div>

        <div class="lg:col-span-6">
          <div class="rounded-2xl overflow-hidden border border-white/15 shadow-2xl group">
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

    const tab = computed(() => (route.query.view === "saved" ? "saved" : "search"));
    const openTab = (key) =>
      router.push({
        path: "/",
        query: window.WebCommon ? window.WebCommon.mergeRouteQuery(route.query, { view: key === "saved" ? "saved" : null }) : { view: key === "saved" ? "saved" : undefined },
      });

    const searchQuery = ref("");
    const selectedCategory = ref("");
    const annualSpend = ref(75000);

    const trendingKeywords = [
      "Subastas Inversas",
      "Desarrollo Web & Apps",
      "Diseño UX/UI",
      "3-Way Match",
      "Marketing B2B",
      "Escrow Seguro"
    ];

    const executeSearch = () => {
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

    const categories = ref([
      {
        title: "Desarrollo de Software",
        subtitle: "Full Stack, Apps Móviles, Cloud & APIs",
        count: "24 Proyectos",
        icon: "fa-solid fa-code",
        iconBg: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20",
        to: "/browse-services"
      },
      {
        title: "Diseño UX/UI & Motion 3D",
        subtitle: "Figma, Design Systems, Animación",
        count: "18 Proyectos",
        icon: "fa-solid fa-palette",
        iconBg: "bg-rose-50 text-rose-600 dark:bg-rose-500/20",
        to: "/browse-services"
      },
      {
        title: "Sourcing & Compras B2B",
        subtitle: "Licitaciones RFX, Subastas BAFO",
        count: "32 Rondas",
        icon: "fa-solid fa-gavel",
        iconBg: "bg-brand-50 text-brand dark:bg-brand/20",
        to: "/procurement/auction"
      },
      {
        title: "Marketing & Estrategia",
        subtitle: "Growth, SEO, Campañas Globales",
        count: "15 Proyectos",
        icon: "fa-solid fa-bullhorn",
        iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20",
        to: "/browse-services"
      }
    ]);

    const trendingServices = ref([
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

    const pricingPlans = ref([
      {
        name: "Básico",
        price: 15.0,
        featured: false,
        features: [
          { text: "15 Créditos de Postulación", included: true },
          { text: "Acceso a Marketplace y RFQ", included: true },
          { text: "Custodia en Fideicomiso (Escrow)", included: true },
          { text: "Subastas Inversas en Vivo BAFO", included: false },
          { text: "3-Way Match Avanzado", included: false }
        ]
      },
      {
        name: "Empresarial",
        price: 29.0,
        featured: true,
        features: [
          { text: "50 Créditos de Postulación", included: true },
          { text: "Subastas Inversas en Vivo BAFO", included: true },
          { text: "Custodia en Fideicomiso (Escrow)", included: true },
          { text: "Insignia Verified Pro / Top Rated", included: true },
          { text: "Soporte Prioritario 24/7", included: true }
        ]
      },
      {
        name: "Corporativo",
        price: 49.0,
        featured: false,
        features: [
          { text: "Créditos Ilimitados", included: true },
          { text: "Rondas de Licitación RFX Ilimitadas", included: true },
          { text: "3-Way Match y Conciliación Fiscal", included: true },
          { text: "Múltiples Aprobadores y Roles", included: true },
          { text: "Gerente de Cuenta Dedicado", included: true }
        ]
      },
      {
        name: "Ilimitado",
        price: 89.0,
        featured: false,
        features: [
          { text: "0% Comisiones en Todas las Operaciones", included: true },
          { text: "Acceso VIP a Subastas Exclusivas", included: true },
          { text: "SLA de Soporte en 15 Minutos", included: true },
          { text: "API Empresarial & Webhooks", included: true },
          { text: "Auditoría Financiera y Reportes", included: true }
        ]
      }
    ]);

    const featuredJobs = computed(() => {
      return (store.state.jobs || []).slice(0, 5);
    });

    return {
      store,
      tab,
      openTab,
      searchQuery,
      selectedCategory,
      annualSpend,
      calculatedSavings,
      trendingKeywords,
      executeSearch,
      searchWithKeyword,
      demoAuctionJob,
      demoBids,
      categories,
      trendingServices,
      popularSkills,
      topFreelancers,
      pricingPlans,
      featuredJobs
    };
  },
};
</script>
