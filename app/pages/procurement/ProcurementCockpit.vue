<template>
  <div class="space-y-6">
    <!-- 1. Every need, with its stage and what to do next: the one list that matters. -->
    <NeedsBoard />

    <!-- 2. What the pipeline is delivering. -->
    <SavingsWaterfall :model="commercial.primary" :title="store.t('Savings waterfall')" :kicker="store.t('Commercial intelligence')" :configurable="store.canConfigureCommercialTerms()" @change-service-fee="setServiceFee" />

    <!-- 3. Context: trend and the suppliers behind it. -->
    <section class="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,.6fr)]">
      <article class="panel overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-card dark:border-slate-800/80 dark:bg-slate-900/80">
        <div class="mb-2 flex items-center justify-between">
          <h2 class="font-head text-sm font-800 tracking-tight text-slate-900 dark:text-white">{{ store.t('Spend & savings pulse') }}</h2>
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">{{ store.t('Last 6 months') }}</span>
        </div>
        <div class="flex h-40 items-end gap-3 pt-4 sm:gap-5">
          <div v-for="point in analytics.monthly" :key="point.month" class="group flex h-full min-w-0 flex-1 flex-col justify-end">
            <div class="relative flex flex-1 items-end justify-center gap-1.5">
              <div class="w-2/5 rounded-t-lg bg-slate-200 transition group-hover:bg-slate-300 dark:bg-slate-700 dark:group-hover:bg-slate-600" :style="{height:bar(point.spend,150000)}" :title="store.money(point.spend)"></div>
              <div class="w-2/5 rounded-t-lg bg-brand shadow-soft transition" :style="{height:bar(point.savings,15000)}" :title="store.money(point.savings)"></div>
            </div>
            <span class="mt-2 text-center text-[10px] font-bold text-slate-400">{{ point.month }}</span>
          </div>
        </div>
        <div class="mt-3 flex gap-5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <span class="flex items-center gap-1.5"><i class="inline-block h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600"></i>{{ store.t('Spend') }}</span>
          <span class="flex items-center gap-1.5"><i class="inline-block h-2 w-2 rounded-full bg-brand"></i>{{ store.t('Savings') }}</span>
        </div>
      </article>

      <article class="panel rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-card dark:border-slate-800/80 dark:bg-slate-900/80">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <h2 class="font-head text-sm font-800 tracking-tight text-slate-900 dark:text-white">{{ store.t('Top Suppliers') }}</h2>
          <RouterLink to="/procurement/intelligence" class="text-xs font-bold text-brand hover:underline">{{ store.t('Performance') }}</RouterLink>
        </div>
        <div class="mt-3 space-y-2">
          <RouterLink v-for="(supplier,index) in topSuppliers" :key="supplier.id" :to="`/suppliers?supplier=${supplier.id}`" class="grid grid-cols-[1.8rem_minmax(0,1fr)_2.4rem] items-center gap-2 rounded-xl p-1.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <span class="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{{ index+1 }}</span>
            <div class="min-w-0">
              <div class="flex items-center justify-between gap-2">
                <b class="truncate text-xs font-bold text-slate-800 dark:text-slate-200">{{ supplier.name }}</b>
                <span class="font-mono text-[10px] text-slate-400">{{ supplier.onTime }}% {{ store.t('on time') }}</span>
              </div>
              <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div class="h-full rounded-full" :class="supplier.risk>35?'bg-amber-400':'bg-emerald-500'" :style="{width:supplier.score+'%'}"></div>
              </div>
            </div>
            <b class="text-right font-mono text-xs font-bold text-slate-800 dark:text-slate-200">{{ supplier.score }}</b>
          </RouterLink>
        </div>
      </article>
    </section>

    <!-- 4. History, kept short: the full trail lives in Insights. -->
    <section class="panel rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-card dark:border-slate-800/80 dark:bg-slate-900/80">
      <div class="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
        <div>
          <h2 class="font-head text-sm font-800 tracking-tight text-slate-900 dark:text-white">{{ store.t('Recent activity') }}</h2>
          <p class="mt-0.5 text-xs text-slate-400">{{ store.t('Requests, offers, orders and invoice checks in one history.') }}</p>
        </div>
        <RouterLink to="/procurement/intelligence" class="text-xs font-bold text-brand hover:underline">{{ store.t('View insights') }}</RouterLink>
      </div>
      <div class="mt-4 grid gap-3 md:grid-cols-2">
        <div v-for="event in store.state.procurementAudit.slice(0,4)" :key="event.id" class="flex gap-3.5 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/30">
          <span class="mt-1 h-2.5 w-2.5 flex-none rounded-full" :class="event.level==='warning'?'bg-amber-400':event.level==='danger'?'bg-rose-500':event.level==='success'?'bg-emerald-400':'bg-sky-400'"></span>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-2">
              <b class="truncate text-xs font-bold text-slate-800 dark:text-slate-200">{{ event.action }}</b>
              <RouterLink v-if="auditLink(event.objectId)" :to="auditLink(event.objectId)" class="rounded-md bg-brand-50 px-2 py-0.5 font-mono text-[9px] font-bold text-brand hover:underline dark:bg-brand/20">{{ event.objectId }}</RouterLink>
              <span v-else class="rounded-md bg-slate-200/70 px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">{{ event.objectId }}</span>
            </div>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ event.detail }}</p>
            <p class="mt-1 text-[10px] text-slate-400">{{ event.actor }} · {{ store.date(event.at) }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
<script>
const {inject,computed}=Vue;
const load=(path)=>Vue.defineAsyncComponent(()=>window['vue3-sfc-loader'].loadModule(path,window.sfcOptions));
const SavingsWaterfall=load('./app/components/commercial/SavingsWaterfall.vue?v=1');
const NeedsBoard=load('./app/pages/procurement/NeedsBoard.vue?v=2');
export default {components:{SavingsWaterfall,NeedsBoard},setup(){const store=inject('store'),analytics=store.state.procurementAnalytics;
  const commercial=computed(()=>window.BuyniverseCommercialMetrics?.portfolio(store.state)||{primary:{}});
  const setServiceFee=(rate)=>store.setCommercialTerms({rate,basis:store.state.procurementAnalytics?.commercialModel?.successFeeBasis});
  const topSuppliers=computed(()=>[...store.state.suppliers].sort((a,b)=>b.score-a.score).slice(0,4));

  const bar=(value,max)=>`${Math.max(6,Math.round(Number(value||0)/max*100))}%`;
  const auditLink=(id)=>{
    if(!id)return null;
    if(id.startsWith('PR-'))return `/procurement/queue?request=${id}`;
    if(id.startsWith('RFQ-')||id.startsWith('RFP-')||id.startsWith('RFI-'))return `/procurement/sourcing?event=${id}`;
    if(id.startsWith('AUC-'))return `/procurement/auction?auction=${id}`;
    if(id.startsWith('PO-'))return `/procurement/execution?order=${id}`;
    if(id.startsWith('inv-')||id.startsWith('FAC-'))return `/invoices/${id}`;
    return null;
  };
  return{store,analytics,commercial,topSuppliers,bar,auditLink,setServiceFee};}}
</script>
