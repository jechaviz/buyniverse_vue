<template>
  <div class="space-y-16 lg:space-y-24">
    <!-- 7. SUCCESS-BASED BUSINESS MODEL (GAIN-SHARE / ZERO SUBSCRIPTION) -->
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

    <!-- 8. INTERACTIVE ROI & GAIN-SHARE CALCULATOR -->
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
        <!-- Slider Input -->
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

        <!-- Calculated Metrics Card -->
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

    <!-- 9. MOBILE EXPERIENCE & APP DOWNLOAD SHOWCASE -->
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
            <button class="rounded-xl border border-slate-300 bg-white px-5 py-3 text-xs font-bold text-slate-800 shadow-sm hover:border-brand hover:text-brand dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 transition flex items-center gap-3 cursor-pointer">
              <i class="fa-brands fa-apple text-2xl"></i>
              <div class="text-left">
                <span class="text-[9px] text-slate-400 uppercase block">Disponible en</span>
                <span class="text-xs font-bold">App Store</span>
              </div>
            </button>
            <button class="rounded-xl border border-slate-300 bg-white px-5 py-3 text-xs font-bold text-slate-800 shadow-sm hover:border-brand hover:text-brand dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 transition flex items-center gap-3 cursor-pointer">
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

    <!-- 10. FINAL CALL TO ACTION -->
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
const { ref } = Vue;

export default {
  props: {
    store: Object,
  },
  setup() {
    const annualSpend = ref(75000);
    const gainShareRate = ref(0.40);

    return {
      annualSpend,
      gainShareRate,
    };
  }
};
</script>
