<template><div class="grid gap-5 2xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,.8fr)]"><article class="panel p-5"><div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 class="text-lg font-800">Spend and savings</h2><p class="mt-1 text-xs text-slate-500">Current purchase activity and savings over time.</p></div><button class="btn-muted" @click="$emit('export', 'portfolio')"><i class="fa-solid fa-file-arrow-down"></i>Export
        </button></div><div class="mt-6 flex h-72 items-end gap-3 sm:gap-6"><div v-for="point in analytics.monthly" :key="point.month" class="group flex h-full min-w-0 flex-1 flex-col justify-end"><div class="relative flex flex-1 items-end justify-center gap-1"><div class="w-2/5 rounded-t-md bg-slate-300 transition group-hover:bg-slate-400 dark:bg-slate-600" :style="{ height: height(point.spend, maxSpend) }"><span class="sr-only">{{ formatMoney(point.spend) }}</span></div><div class="w-2/5 rounded-t-md bg-brand transition" :style="{ height: height(point.savings, maxSavings) }"><span class="sr-only">{{ formatMoney(point.savings) }}</span></div></div><div class="mt-2 text-center"><b class="block text-[10px]">{{ point.month }}</b><span class="text-[9px] text-slate-400">{{ point.events }} rounds</span></div></div></div><div class="mt-4 flex flex-wrap gap-4 text-[10px] text-slate-500"><span><i class="mr-1 inline-block h-2 w-2 rounded-sm bg-slate-400"></i>Spend</span><span><i class="mr-1 inline-block h-2 w-2 rounded-sm bg-brand"></i>Savings</span></div></article><article class="panel p-5"><div><h2 class="text-lg font-800">Savings by category</h2><p class="mt-1 text-xs text-slate-500">Spend, savings and supplier risk by category.</p></div><div class="mt-5 space-y-5"><div v-for="cat in analytics.categories" :key="cat.name"><div class="flex items-end justify-between gap-3"><div><b class="text-sm">{{ cat.name }}</b><p class="mt-1 text-[10px] text-slate-400">{{ formatMoney(cat.savings) }} saved</p></div><div class="text-right"><b class="block text-sm">{{ formatMoney(cat.spend) }}</b><span class="text-[10px]" :class="cat.risk > 35 ? 'text-rose-500' : 'text-emerald-500'">Risk {{ cat.risk }}</span></div></div><div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"><div class="h-full rounded-full bg-brand" :style="{ width: height(cat.spend, maxCategorySpend) }"></div></div></div></div></article></div></template>
<script>
export default {
props: {
analytics: Object,
maxSpend: Number,
maxSavings: Number,
maxCategorySpend: Number,
height: Function,
formatMoney: Function,
},
emits: ["export"],
};
</script>