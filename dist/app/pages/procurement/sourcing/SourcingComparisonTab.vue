<template><div class="grid gap-5 p-5 2xl:grid-cols-[300px_minmax(0,1fr)]"><aside><h3 class="text-sm font-800">Scoring</h3><p class="mt-1 text-xs leading-5 text-slate-500">
        Adjust how price, quality, delivery and risk are weighed.
      </p><div class="mt-5 space-y-4"><label v-for="criterion in criteria" :key="criterion.key" class="block"><span class="mb-1.5 flex justify-between text-xs"><b>{{ criterion.label }}</b><span class="font-bold text-brand">{{ event.weights[criterion.key] }}%</span></span><input
            v-model.number="event.weights[criterion.key]"
            type="range"
            min="0"
            max="70"
            step="5"
            class="w-full accent-[var(--accent)]"
          /></label></div><div class="mt-5 grid gap-2"><button
          v-for="scenario in scenarios"
          :key="scenario.id"
          class="rounded-lg border border-slate-200/70 p-3 text-left hover:border-brand/40 dark:border-slate-700"
          @click="$emit('apply-scenario', scenario)"
        ><b class="text-xs">{{ scenario.name }}</b><p class="mt-1 text-[10px] leading-4 text-slate-500">{{ scenario.description }}</p></button></div></aside><div><div class="overflow-x-auto rounded-xl border border-slate-200/70 dark:border-slate-700"><table class="w-full min-w-190 text-left text-xs"><thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 dark:bg-slate-800"><tr><th class="px-4 py-3">Rank</th><th class="px-4 py-3">Supplier</th><th class="px-4 py-3 text-right">Price</th><th class="px-4 py-3">Lead</th><th class="px-4 py-3">Quality</th><th class="px-4 py-3">Risk</th><th class="px-4 py-3">ESG</th><th class="px-4 py-3 text-right">Score</th></tr></thead><tbody class="divide-y divide-slate-100 dark:divide-slate-700"><tr
              v-for="quote in rankedQuotes"
              :key="quote.id"
              class="cursor-pointer transition hover:bg-brand-50/45 dark:hover:bg-brand/8"
              :class="awardSupplierId === quote.supplierId ? 'bg-brand-50/65 dark:bg-brand/10' : ''"
              @click="$emit('update:awardSupplierId', quote.supplierId)"
            ><td class="px-4 py-3"><span
                  class="grid h-7 w-7 place-items-center rounded-lg font-800"
                  :class="quote.rank === 1 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500 dark:bg-slate-700'"
                >
                  {{ quote.rank }}
                </span></td><td class="px-4 py-3"><b>{{ supplierName(quote.supplierId) }}</b><p class="mt-1 text-[10px] text-slate-400">{{ quote.compliant ? 'Compliant' : 'Policy exception' }}</p></td><td class="px-4 py-3 text-right font-bold">{{ formatMoney(quote.price, event.currency) }}</td><td class="px-4 py-3">{{ quote.leadDays }}d</td><td class="px-4 py-3">{{ quote.quality }}</td><td class="px-4 py-3"><span :class="quote.risk > 35 ? 'text-rose-500' : 'text-emerald-500'">{{ quote.risk }}</span></td><td class="px-4 py-3">{{ quote.esg }}</td><td class="px-4 py-3 text-right text-lg font-800 text-brand">{{ quote.score }}</td></tr></tbody></table></div><div v-if="rankedQuotes.length" class="mt-4 grid gap-3 md:grid-cols-3"><article
          v-for="quote in rankedQuotes.slice(0, 3)"
          :key="quote.id"
          class="rounded-xl border border-slate-200/70 p-4 dark:border-slate-700"
        ><div class="flex justify-between"><b class="text-xs">{{ supplierName(quote.supplierId) }}</b><span class="text-xs font-800 text-brand">#{{ quote.rank }}</span></div><div class="mt-3 space-y-2"><div class="flex justify-between text-[10px]"><span class="text-slate-500">Price position</span><b>{{ quote.priceScore }}</b></div><div class="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700"><div class="h-full rounded-full bg-brand" :style="{ width: quote.priceScore + '%' }"></div></div><div class="flex justify-between text-[10px]"><span class="text-slate-500">Delivery position</span><b>{{ quote.deliveryScore }}</b></div><div class="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700"><div class="h-full rounded-full bg-sky-400" :style="{ width: quote.deliveryScore + '%' }"></div></div></div></article></div></div></div></template>
<script>
export default {
props: {
event: Object,
criteria: Array,
scenarios: Array,
rankedQuotes: Array,
awardSupplierId: String,
supplierName: Function,
formatMoney: Function,
},
emits: ["apply-scenario", "update:awardSupplierId"],
};
</script>