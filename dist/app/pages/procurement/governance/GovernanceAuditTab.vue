<template><div class="panel overflow-hidden"><header class="flex flex-col gap-3 border-b border-slate-200/70 p-5 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between"><div><h2 class="text-lg font-800">History</h2><p class="mt-1 text-xs text-slate-500">Requests, decisions, offers, receipts, issues and rule changes.</p></div><div class="flex gap-2"><div class="relative"><i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400"></i><input
            :value="auditSearch"
            class="field w-64 pl-9"
            placeholder="Search history"
            @input="$emit('update:auditSearch', $event.target.value)"
          /></div><button class="btn-muted" @click="$emit('export')"><i class="fa-solid fa-download"></i>Export</button></div></header><div class="overflow-x-auto"><table class="w-full min-w-210 text-left text-xs"><thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 dark:bg-slate-800"><tr><th class="px-4 py-3">Timestamp</th><th class="px-4 py-3">Object</th><th class="px-4 py-3">Action</th><th class="px-4 py-3">Actor</th><th class="px-4 py-3">Detail</th><th class="px-4 py-3">Level</th></tr></thead><tbody class="divide-y divide-slate-100 dark:divide-slate-700"><tr v-for="entry in filteredAudit" :key="entry.id"><td class="px-4 py-3 whitespace-nowrap">{{ formatDate(entry.at) }}</td><td class="px-4 py-3 font-mono font-bold">{{ entry.entityId || "SYSTEM" }}</td><td class="px-4 py-3 font-bold">{{ entry.action }}</td><td class="px-4 py-3 text-slate-500">{{ userName(entry.actorId) || entry.actorId || "System" }}</td><td class="px-4 py-3 text-slate-500 max-w-xs truncate">{{ entry.detail }}</td><td class="px-4 py-3"><span class="badge" :class="entry.level === 'warning' ? 'bg-amber-100 text-amber-700' : entry.level === 'danger' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'">
                {{ entry.level || "info" }}
              </span></td></tr></tbody></table></div></div></template>
<script>
export default {
props: {
auditSearch: String,
filteredAudit: Array,
formatDate: Function,
userName: Function,
},
emits: ["update:auditSearch", "export"],
};
</script>