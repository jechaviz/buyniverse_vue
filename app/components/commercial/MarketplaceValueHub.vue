<template>
  <section v-if="store.isBuyer.value || store.isAdmin.value" class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-card dark:border-slate-800/80 dark:bg-slate-900/80">
    <header class="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
      <div>
        <p class="premium-kicker text-[10px] font-800 uppercase tracking-[.15em] text-brand">{{ store.t('Marketplace value') }}</p>
        <h2 class="font-head mt-0.5 text-base font-800 tracking-tight text-slate-900 dark:text-white">{{ store.t('One commercial workspace') }}</h2>
        <p class="mt-1 text-[11px] text-slate-400">{{ store.t('Price discovery, delivery and supplier capacity in one operating model.') }}</p>
      </div>
      <RouterLink to="/procurement" class="btn-muted px-3 py-2 text-[11px] font-bold"><i class="fa-solid fa-arrow-up-right-from-square mr-1.5"></i>{{ store.t('Open procurement') }}</RouterLink>
    </header>

    <div class="grid gap-0 xl:grid-cols-[minmax(0,1.2fr)_minmax(440px,.8fr)]">
      <div class="p-4">
        <SavingsWaterfall :model="portfolio.primary" title="Savings waterfall" kicker="Commercial intelligence" />
      </div>
      <div class="grid content-center gap-2 border-t border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/25 xl:border-l xl:border-t-0">
        <RouterLink v-for="module in modules" :key="module.key" :to="module.to" class="group flex min-w-0 items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 transition hover:-translate-y-px hover:border-brand/50 hover:shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs" :class="module.tone"><i class="fa-solid" :class="module.icon"></i></span>
          <span class="min-w-0 flex-1"><b class="block text-[11px] font-800 text-slate-800 dark:text-slate-100">{{ store.t(module.label) }}</b><small class="block truncate text-[10px] text-slate-400">{{ store.t(module.note) }}</small></span>
          <b class="font-mono text-xs font-800 text-slate-700 dark:text-slate-200">{{ module.value }}</b>
          <i class="fa-solid fa-chevron-right text-[8px] text-slate-300 transition group-hover:text-brand"></i>
        </RouterLink>
      </div>
    </div>
  </section>
</template>

<script>
const { inject, computed } = Vue;
const load = (path) => Vue.defineAsyncComponent(() => window['vue3-sfc-loader'].loadModule(path, window.sfcOptions));
const SavingsWaterfall = load('./app/components/commercial/SavingsWaterfall.vue?v=3');
export default {
  components: { SavingsWaterfall },
  setup() {
    const store = inject('store');
    const portfolio = computed(() => window.BuyniverseCommercialMetrics?.portfolio(store.state) || { primary: {}, modules: {} });
    const money = (value) => store.money(Number(value) || 0, portfolio.value.primary?.currency || 'USD');
    const modules = computed(() => {
      const data = portfolio.value.modules || {};
      return [
        { key: 'procurement', label: 'Procurement', note: `${data.procurement?.active || 0} ${store.t('live events')} · ${store.t('Total savings')}`, value: money(data.procurement?.totalSavings), to: '/procurement', icon: 'fa-cart-shopping', tone: 'bg-brand-50 text-brand dark:bg-brand/15' },
        { key: 'talent', label: 'Talent', note: `${data.talent?.active || 0} ${store.t('active opportunities')} · ${store.t('Financial savings')}`, value: money(data.talent?.financialSavings), to: '/find-talent', icon: 'fa-people-group', tone: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300' },
        { key: 'projects', label: 'Projects', note: `${data.projects?.active || 0} ${store.t('active deliveries')}`, value: String(data.projects?.active || 0), to: '/projects', icon: 'fa-diagram-project', tone: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300' },
        { key: 'services', label: 'Services', note: `${data.services?.active || 0} ${store.t('ready-to-buy services')}`, value: String(data.services?.active || 0), to: '/browse-services', icon: 'fa-store', tone: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300' },
        { key: 'products', label: 'Products', note: `${data.products?.active || 0} ${store.t('Compared SKUs')} · ${store.t('Savings per unit')}`, value: money(data.products?.savingsPerUnit), to: '/products', icon: 'fa-boxes-stacked', tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300' },
      ];
    });
    return { store, portfolio, modules };
  },
};
</script>
