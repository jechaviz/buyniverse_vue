<template><div class="grid gap-5 2xl:grid-cols-[320px_minmax(0,1fr)]"><aside class="panel p-5"><label><span class="mb-1.5 block text-xs font-bold">Quote round</span><select :value="selectedEventId" class="field" @change="$emit('update:selectedEventId', $event.target.value)"><option v-for="item in comparableEvents" :key="item.id" :value="item.id">
            {{ item.id }} · {{ item.title }}
          </option></select></label><div class="mt-5"><h3 class="text-xs font-800 uppercase tracking-wide text-slate-500">Priorities</h3><div class="mt-3 space-y-2"><button
            v-for="scen in analytics.scenarios"
            :key="scen.id"
            class="w-full rounded-xl border p-3 text-left"
            :class="scenarioId === scen.id ? 'border-brand bg-brand-50/60 dark:bg-brand/10' : 'border-slate-200/70 hover:border-brand/35 dark:border-slate-700'"
            @click="$emit('select-scenario', scen)"
          ><div class="flex items-center justify-between"><b class="text-xs">{{ scen.name }}</b><i v-if="scenarioId === scen.id" class="fa-solid fa-circle-check text-brand"></i></div><p class="mt-1 text-[10px] leading-4 text-slate-500">{{ scen.description }}</p></button></div></div><div class="mt-5 space-y-3"><label v-for="criterion in criteria" :key="criterion.key" class="block"><span class="flex justify-between text-[11px]"><b>{{ criterion.label }}</b><span class="font-bold text-brand">{{ weights[criterion.key] }}%</span></span><input
            v-model.number="weights[criterion.key]"
            type="range"
            min="0"
            max="70"
            step="5"
            class="mt-1 w-full accent-[var(--accent)]"
            @input="$emit('custom-weight')"
          /></label></div></aside><article class="panel overflow-hidden"><header class="border-b border-slate-200/70 p-5 dark:border-slate-700"><div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><span class="text-[10px] font-800 uppercase tracking-wide text-brand">Offer comparison</span><h2 class="mt-1 text-xl font-800">{{ selectedEvent?.title }}</h2><p class="mt-1 text-xs text-slate-500">Compare offers with clear, adjustable weights.</p></div><span class="badge bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
            {{ scenarioId === "custom" ? "Custom weights" : analytics.scenarios.find((item) => item.id === scenarioId)?.name }}
          </span></div></header><div class="p-5"><div v-if="scenarioRanking.length" class="grid gap-3 md:grid-cols-3"><article
            v-for="quote in scenarioRanking.slice(0, 3)"
            :key="quote.id"
            class="relative overflow-hidden rounded-xl border p-4"
            :class="quote.rank === 1 ? 'border-brand bg-brand-50/45 dark:bg-brand/8' : 'border-slate-200/70 dark:border-slate-700'"
          ><span class="absolute right-3 top-3 text-4xl font-800 opacity-8">#{{ quote.rank }}</span><span class="grid h-8 w-8 place-items-center rounded-lg" :class="quote.rank === 1 ? 'bg-brand text-white' : 'bg-slate-100 dark:bg-slate-700'">
              {{ quote.rank }}
            </span><h3 class="mt-4 text-sm font-800">{{ supplierName(quote.supplierId) }}</h3><p class="mt-1 text-lg font-800">{{ formatMoney(quote.price, selectedEvent.currency) }}</p><div class="mt-4 flex items-end justify-between"><span class="text-[10px] text-slate-500">Overall score</span><b class="text-2xl text-brand">{{ quote.score }}</b></div><div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"><div class="h-full rounded-full bg-brand" :style="{ width: quote.score + '%' }"></div></div></article></div><div v-else class="py-20 text-center text-slate-400"><i class="fa-solid fa-scale-balanced text-3xl"></i><p class="mt-3 text-sm font-bold">This quote round has no comparable offers yet.</p></div><div v-if="recommendation" class="mt-5 grid gap-4 rounded-xl bg-slate-950 p-5 text-white md:grid-cols-[minmax(0,1fr)_auto]"><div><span class="text-[10px] font-800 uppercase tracking-wide text-brand-100">Suggested choice</span><h3 class="mt-2 text-lg font-800">{{ recommendation.name }} ranks first</h3><p class="mt-2 text-xs leading-5 text-slate-400">
              Score {{ recommendation.quote.score }} with
              {{ formatMoney(recommendation.quote.price, selectedEvent.currency) }},
              {{ recommendation.quote.leadDays }}-day lead time and risk {{ recommendation.quote.risk }}. The buyer makes the final choice.
            </p></div><RouterLink :to="`/procurement/sourcing?event=${selectedEvent.id}&tab=award`" class="btn-brand self-center"><i class="fa-solid fa-arrow-up-right-from-square"></i>Choose supplier
          </RouterLink></div></div></article></div></template>
<script>
export default {
props: {
analytics: Object,
comparableEvents: Array,
selectedEventId: String,
selectedEvent: Object,
scenarioId: String,
criteria: Array,
weights: Object,
scenarioRanking: Array,
recommendation: Object,
supplierName: Function,
formatMoney: Function,
},
emits: ["update:selectedEventId", "select-scenario", "custom-weight"],
};
</script>