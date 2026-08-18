<template><div class="p-5"><div class="mx-auto max-w-4xl"><div
        v-for="entry in audit"
        :key="entry.id"
        class="grid grid-cols-[90px_20px_minmax(0,1fr)] gap-3"
      ><time class="pt-1 text-right text-[10px] text-slate-400">{{ formatDate(entry.at) }}</time><div class="relative flex justify-center"><span class="z-1 mt-1.5 h-2.5 w-2.5 rounded-full bg-brand"></span><span class="absolute bottom-0 top-4 w-px bg-slate-200 dark:bg-slate-700"></span></div><div class="mb-5 rounded-xl border border-slate-200/70 p-3 dark:border-slate-700"><div class="flex flex-wrap items-center gap-2"><b class="text-xs">{{ entry.action }}</b><span class="text-[10px] text-slate-400">by {{ entry.actor }}</span></div><p class="mt-1 text-[11px] text-slate-500">{{ entry.detail }}</p></div></div><p v-if="!audit.length" class="py-16 text-center text-sm text-slate-400">
        No activity recorded.
      </p></div></div></template>
<script>
export default {
props: {
audit: Array,
formatDate: Function,
},
};
</script>