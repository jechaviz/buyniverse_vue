<template><div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"><article class="panel overflow-hidden"><header class="flex flex-col gap-3 border-b border-slate-200/70 p-5 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between"><div><h2 class="text-lg font-800">Supplier performance</h2><p class="mt-1 text-xs text-slate-500">Delivery, response, risk and sustainability in one view.</p></div><div class="relative"><i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400"></i><input
            :value="supplierSearch"
            class="field w-64 pl-9"
            placeholder="Search suppliers"
            @input="$emit('update:supplierSearch', $event.target.value)"
          /></div></header><div class="divide-y divide-slate-100 dark:divide-slate-700"><button
          v-for="supplier in filteredSuppliers"
          :key="supplier.id"
          class="grid w-full gap-4 p-4 text-left transition hover:bg-brand-50/40 dark:hover:bg-brand/8 md:grid-cols-[minmax(180px,1fr)_repeat(5,minmax(65px,.5fr))] md:items-center"
          :class="selectedSupplierId === supplier.id ? 'bg-brand-50/60 dark:bg-brand/10' : ''"
          @click="$emit('select-supplier', supplier.id)"
        ><div class="flex items-center gap-3"><span class="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-xs font-800 text-brand">{{ initials(supplier.name) }}</span><span><b class="block text-sm">{{ supplier.name }}</b><small class="mt-1 block text-[10px] text-slate-400">{{ supplier.category }} · {{ supplier.status }}</small></span></div><div v-for="metric in supplierMetrics(supplier)" :key="metric.label" class="text-center"><b class="block text-sm" :class="metric.tone">{{ metric.value }}</b><small class="text-[9px] text-slate-400">{{ metric.label }}</small></div></button></div></article><aside v-if="selectedSupplier" class="panel self-start p-5 xl:sticky xl:top-15"><div class="flex items-center gap-3"><span class="grid h-12 w-12 place-items-center rounded-xl bg-brand text-sm font-800 text-white">{{ initials(selectedSupplier.name) }}</span><div><h2 class="text-lg font-800">{{ selectedSupplier.name }}</h2><p class="mt-1 text-[10px] text-slate-500">{{ selectedSupplier.contact }} · {{ selectedSupplier.email }}</p></div></div><div class="mt-5 grid grid-cols-2 gap-2"><div class="rounded-lg bg-slate-50 p-3 text-center dark:bg-slate-800"><b class="block text-xl">{{ selectedSupplier.score }}</b><small class="text-[9px] text-slate-400">Score</small></div><div class="rounded-lg bg-slate-50 p-3 text-center dark:bg-slate-800"><b class="block text-xl" :class="selectedSupplier.risk > 35 ? 'text-rose-500' : 'text-emerald-500'">{{ selectedSupplier.risk }}</b><small class="text-[9px] text-slate-400">Risk</small></div></div><h3 class="mt-5 text-xs font-800 uppercase tracking-wide text-slate-500">Certifications</h3><div class="mt-2 flex flex-wrap gap-2"><span v-for="cert in selectedSupplier.certifications" :key="cert" class="badge bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">{{ cert }}</span></div><h3 class="mt-5 text-xs font-800 uppercase tracking-wide text-slate-500">Status</h3><p class="mt-2 text-xs leading-5 text-slate-500">Status changes are reversible and saved in history.</p><div class="mt-3 grid grid-cols-2 gap-2"><button class="btn-muted px-2 text-xs" @click="$emit('set-status', 'In review')">Review</button><button class="btn-muted px-2 text-xs" @click="$emit('set-status', 'Preferred')">Prefer</button></div></aside></div></template>
<script>
export default {
props: {
supplierSearch: String,
filteredSuppliers: Array,
selectedSupplierId: String,
selectedSupplier: Object,
supplierMetrics: Function,
initials: Function,
},
emits: ["update:supplierSearch", "select-supplier", "set-status"],
};
</script>