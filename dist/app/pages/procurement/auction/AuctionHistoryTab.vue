<template><div class="p-5"><div class="overflow-x-auto rounded-xl border border-slate-200/70 dark:border-slate-700"><table class="w-full min-w-190 text-left text-xs"><thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 dark:bg-slate-800"><tr><th class="px-4 py-3">Time</th><th class="px-4 py-3">Supplier</th><th class="px-4 py-3 text-right">Offer</th><th class="px-4 py-3 text-right">Change</th><th class="px-4 py-3">From</th><th class="px-4 py-3">Result</th></tr></thead><tbody class="divide-y divide-slate-100 dark:divide-slate-700"><tr v-for="bid in bids" :key="bid.id"><td class="px-4 py-3">{{ clock(bid.at) }}</td><td class="px-4 py-3 font-bold">{{ supplierName(bid.supplierId) }}</td><td class="px-4 py-3 text-right font-800">{{ formatMoney(bid.amount, currency) }}</td><td class="px-4 py-3 text-right" :class="bid.delta < 0 ? 'text-emerald-500' : ''">
              {{ bid.delta ? formatMoney(bid.delta, currency) : "—" }}
            </td><td class="px-4 py-3">{{ sourceLabel(bid.source) }}</td><td class="px-4 py-3"><span class="badge bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">Accepted</span></td></tr></tbody></table></div></div></template>
<script>
export default {
props: {
bids: Array,
currency: String,
clock: Function,
supplierName: Function,
formatMoney: Function,
sourceLabel: Function,
},
};
</script>