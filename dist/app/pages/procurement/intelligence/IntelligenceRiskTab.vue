<template><div class="grid gap-5 xl:grid-cols-2"><article class="panel p-5"><div class="flex items-center justify-between"><div><h2 class="text-lg font-800">Supplier risk</h2><p class="mt-1 text-xs text-slate-500">Suppliers that may need attention.</p></div><span class="badge bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{{ riskSuppliers.length }} watched</span></div><div class="mt-5 space-y-3"><div v-for="supplier in riskSuppliers" :key="supplier.id" class="rounded-xl border border-slate-200/70 p-4 dark:border-slate-700"><div class="flex items-center justify-between"><div><b class="text-sm">{{ supplier.name }}</b><p class="mt-1 text-[10px] text-slate-500">{{ supplier.category }} · {{ supplier.status }}</p></div><span class="text-xl font-800" :class="supplier.risk > 40 ? 'text-rose-500' : 'text-amber-500'">{{ supplier.risk }}</span></div><div class="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"><div class="h-full rounded-full" :class="supplier.risk > 40 ? 'bg-rose-500' : 'bg-amber-400'" :style="{ width: supplier.risk + '%' }"></div></div><div class="mt-3 flex justify-between text-[10px] text-slate-500"><span>On-time {{ supplier.onTime }}%</span><span>Response {{ supplier.responseRate }}%</span><button class="font-bold text-brand" @click="$emit('open-supplier', supplier.id)">Open profile</button></div></div></div></article><article class="panel p-5"><div><h2 class="text-lg font-800">ESG performance</h2><p class="mt-1 text-xs text-slate-500">Sustainability is included when offers are compared.</p></div><div class="mt-5 space-y-4"><div v-for="supplier in esgSuppliers" :key="supplier.id" class="grid grid-cols-[minmax(0,1fr)_4rem] items-center gap-4"><div><div class="flex justify-between text-xs"><b>{{ supplier.name }}</b><span class="text-slate-400">{{ supplier.esg }}/100</span></div><div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"><div
                class="h-full rounded-full"
                :class="supplier.esg >= 85 ? 'bg-emerald-400' : supplier.esg >= 75 ? 'bg-sky-400' : 'bg-amber-400'"
                :style="{ width: supplier.esg + '%' }"
              ></div></div></div><span
            class="grid h-12 w-12 place-items-center rounded-full text-sm font-800"
            :class="supplier.esg >= 85 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-slate-100 text-slate-600 dark:bg-slate-700'"
          >
            {{ grade(supplier.esg) }}
          </span></div></div></article></div></template>
<script>
export default {
props: {
riskSuppliers: Array,
esgSuppliers: Array,
grade: Function,
},
emits: ["open-supplier"],
};
</script>