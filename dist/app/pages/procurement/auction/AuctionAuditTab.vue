<template>
  <div class="p-5">
    <div class="mx-auto max-w-4xl">
      <div
        v-for="entry in audit"
        :key="entry.id"
        class="flex gap-3 border-l border-slate-200 pb-5 pl-5 last:pb-0 dark:border-slate-700"
      >
        <span class="-ml-[1.63rem] mt-1 h-3 w-3 flex-none rounded-full border-2 border-white bg-brand dark:border-slate-900"></span>
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <b class="text-xs">{{ actionLabel(entry.action) }}</b>
            <span class="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500 dark:bg-slate-700">{{ entry.level }}</span>
          </div>
          <p class="mt-1 text-[11px] text-slate-500">{{ entry.detail }}</p>
          <time class="mt-1 block text-[10px] text-slate-400">{{ entry.actor }} · {{ formatDate(entry.at) }}</time>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
export default {
  props: {
    audit: Array,
    actionLabel: Function,
    formatDate: Function,
  },
};
</script>
