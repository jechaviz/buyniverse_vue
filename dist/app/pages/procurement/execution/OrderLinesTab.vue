<template><div class="p-5"><div class="overflow-x-auto rounded-xl border border-slate-200/70 dark:border-slate-700"><table class="w-full min-w-190 text-left text-xs"><thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 dark:bg-slate-800"><tr><th class="px-4 py-3">Product / service</th><th class="px-4 py-3 text-right">Ordered</th><th class="px-4 py-3 text-right">Received</th><th class="px-4 py-3 text-right">Remaining</th><th class="px-4 py-3 text-right">Unit price</th><th class="px-4 py-3 text-right">Line total</th></tr></thead><tbody class="divide-y divide-slate-100 dark:divide-slate-700"><tr v-for="line in order.lines" :key="line.id"><td class="px-4 py-3"><b>{{ line.description }}</b><p v-if="line.productId" class="mt-1 text-[10px] text-slate-400">{{ line.productId }}</p></td><td class="px-4 py-3 text-right">{{ line.ordered }}</td><td class="px-4 py-3 text-right font-bold text-emerald-500">{{ line.received }}</td><td class="px-4 py-3 text-right">{{ Math.max(0, line.ordered - line.received) }}</td><td class="px-4 py-3 text-right">{{ formatMoney(line.unitPrice, order.currency) }}</td><td class="px-4 py-3 text-right font-800">{{ formatMoney(line.ordered * line.unitPrice, order.currency) }}</td></tr></tbody></table></div></div></template>
<script>
export default {
props: {
order: Object,
formatMoney: Function,
},
};
</script>