<template><div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"><article class="panel overflow-hidden"><header class="border-b border-slate-200/70 p-5 dark:border-slate-700"><h2 class="text-lg font-800">Rules</h2><p class="mt-1 text-xs text-slate-500">Approval, quote, live bid and invoice rules.</p></header><div class="divide-y divide-slate-100 dark:divide-slate-700"><article
          v-for="rule in rules"
          :key="rule.id"
          class="grid gap-4 p-5 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center"
        ><span class="grid h-10 w-10 place-items-center rounded-xl" :class="rule.enabled ? 'bg-brand-50 text-brand' : 'bg-slate-100 text-slate-400 dark:bg-slate-700'"><i class="fa-solid" :class="ruleIcon(rule.type)"></i></span><div><div class="flex flex-wrap items-center gap-2"><b class="text-sm">{{ rule.name }}</b><span class="badge bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">{{ ruleTypeLabel(rule.type) }}</span><span class="text-[10px] text-slate-400">Owner: {{ rule.owner }}</span></div><div class="mt-2 flex flex-wrap items-center gap-2 text-[11px]"><span class="rounded bg-slate-100 px-2 py-1 font-semibold dark:bg-slate-700">IF {{ rule.condition }}</span><i class="fa-solid fa-arrow-right text-slate-300"></i><span class="rounded bg-brand-50 px-2 py-1 font-semibold text-brand">THEN {{ rule.action }}</span></div></div><button class="text-xl" :class="rule.enabled ? 'text-emerald-500' : 'text-slate-300'" @click="$emit('toggle-rule', rule)"><i class="fa-solid" :class="rule.enabled ? 'fa-toggle-on' : 'fa-toggle-off'"></i></button></article></div></article><aside class="panel p-5"><span class="text-[10px] font-800 uppercase tracking-wide text-brand">New rule</span><h3 class="mt-1 text-lg font-800">Add rule</h3><form class="mt-4 space-y-3" @submit.prevent="$emit('add-rule')"><label><span class="mb-1 block text-xs font-bold">Name</span><input v-model.trim="ruleDraft.name" class="field" required /></label><label><span class="mb-1 block text-xs font-bold">Type</span><select v-model="ruleDraft.type" class="field"><option>Approval</option><option>Exclusion</option><option value="Auction">Live bid</option><option value="Matching">Invoice check</option><option>Supplier limit</option><option>Price threshold</option></select></label><label><span class="mb-1 block text-xs font-bold">IF condition</span><input v-model.trim="ruleDraft.condition" class="field" required placeholder="Amount > 25,000" /></label><label><span class="mb-1 block text-xs font-bold">THEN action</span><input v-model.trim="ruleDraft.action" class="field" required placeholder="Require CFO approval" /></label><button class="btn-brand w-full"><i class="fa-solid fa-plus"></i>Add rule</button></form></aside></div></template>
<script>
export default {
props: {
rules: Array,
ruleDraft: Object,
ruleIcon: Function,
ruleTypeLabel: Function,
},
emits: ["toggle-rule", "add-rule"],
};
</script>