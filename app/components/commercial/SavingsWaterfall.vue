<template>
  <article class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-card dark:border-slate-800/80 dark:bg-slate-900/90">
    <header class="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
      <div>
        <p class="premium-kicker text-[10px] font-800 uppercase tracking-[.15em] text-brand">{{ store.t(kicker) }}</p>
        <h2 class="font-head mt-0.5 text-sm font-800 tracking-tight text-slate-900 dark:text-white">{{ store.t(title) }}</h2>
      </div>
      <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-800" :class="model.state === 'realized' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-brand-50 text-brand dark:bg-brand/15'">
        <i class="fa-solid" :class="model.state === 'realized' ? 'fa-circle-check' : 'fa-tower-broadcast'"></i>
        {{ store.t(model.state === 'realized' ? 'Realized at award' : 'Live potential') }}
      </span>
    </header>

    <div class="grid gap-px bg-slate-100 dark:bg-slate-800 sm:grid-cols-3">
      <div v-for="(step, index) in steps" :key="step.key" class="relative min-w-0 bg-white p-3 dark:bg-slate-900">
        <span v-if="index" class="absolute -left-2 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 place-items-center rounded-full bg-slate-100 text-[8px] text-slate-400 dark:bg-slate-800 sm:grid"><i class="fa-solid fa-chevron-right"></i></span>
        <div class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
          <i class="fa-solid text-[9px]" :class="step.icon"></i>{{ store.t(step.label) }}
        </div>
        <p class="mt-1 truncate font-head font-mono text-base font-800 tracking-tight text-slate-900 dark:text-white">{{ display(step.value) }}</p>
        <p class="mt-1 text-[10px] leading-snug" :class="step.tone">{{ store.t(step.note) }}</p>
      </div>
    </div>

    <footer class="flex flex-wrap items-center gap-x-4 gap-y-1.5 bg-slate-50/70 px-4 py-2.5 text-[10px] dark:bg-slate-950/40">
      <span class="font-bold uppercase tracking-wide text-slate-400">{{ store.t('Total savings') }}</span>
      <b class="font-mono text-sm font-800 text-emerald-600 dark:text-emerald-400">{{ display(model.totalSavings) }}</b>
      <span class="h-3 w-px bg-slate-200 dark:bg-slate-700"></span>
      <span class="text-slate-500 dark:text-slate-400">{{ store.t('Outcome share') }} · {{ model.successFeeRate || 0 }}% {{ store.t('of validated savings') }}</span>
      <b class="font-mono font-800 text-slate-700 dark:text-slate-200">{{ display(model.outcomeShare) }}</b>
      <span class="ml-auto text-slate-400">{{ store.t('Auditable from source bids') }}</span>
    </footer>
  </article>
</template>

<script>
const { inject, computed } = Vue;
export default {
  props: {
    model: { type: Object, default: () => ({}) },
    title: { type: String, default: 'Savings waterfall' },
    kicker: { type: String, default: 'Commercial intelligence' },
  },
  setup(props) {
    const store = inject('store');
    const display = (value) => store.money(Number(value) || 0, props.model.currency || 'USD');
    const steps = computed(() => [
      { key: 'budget', label: 'Budget baseline', value: props.model.budget, icon: 'fa-wallet', note: 'Approved commercial ceiling', tone: 'text-slate-400' },
      { key: 'first', label: 'Best first offer', value: props.model.bestFirst, icon: 'fa-handshake', note: `${store.t('Financial savings')} · ${display(props.model.financialSavings)}`, tone: 'text-sky-600 dark:text-sky-400' },
      { key: 'final', label: 'Best final offer', value: props.model.bestFinal, icon: 'fa-gavel', note: `${store.t('Buyniverse savings')} · ${display(props.model.buyniverseSavings)}`, tone: 'text-emerald-600 dark:text-emerald-400' },
    ]);
    return { store, steps, display };
  },
};
</script>
