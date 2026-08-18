<template><div class="p-5"><div class="flex items-center justify-between"><div><h3 class="text-sm font-800">Issues</h3><p class="mt-1 text-xs text-slate-500">Each issue has an owner, next action and history.</p></div><button class="btn-muted" @click="$emit('add')"><i class="fa-solid fa-plus mr-1"></i>Add issue
      </button></div><div class="mt-4 space-y-3"><article
        v-for="exception in order.exceptions"
        :key="exception.id"
        class="grid gap-4 rounded-xl border p-4 md:grid-cols-[auto_minmax(0,1fr)_auto]"
        :class="
          exception.status === 'Resolved'
            ? 'border-emerald-200 bg-emerald-50/35 dark:border-emerald-500/20 dark:bg-emerald-500/5'
            : 'border-rose-200 bg-rose-50/35 dark:border-rose-500/20 dark:bg-rose-500/5'
        "
      ><span
          class="grid h-10 w-10 place-items-center rounded-lg"
          :class="exception.status === 'Resolved' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'"
        ><i class="fa-solid" :class="exception.status === 'Resolved' ? 'fa-check' : 'fa-triangle-exclamation'"></i></span><div><div class="flex flex-wrap items-center gap-2"><b class="text-sm">{{ exception.type }}</b><span class="badge" :class="exception.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'">
              {{ exception.status }}
            </span><span class="text-[10px] font-bold text-slate-400">{{ exception.severity }}</span></div><p class="mt-2 text-xs leading-5 text-slate-500">{{ exception.detail }}</p><p class="mt-2 text-[10px] text-slate-400">Owner: {{ userName(exception.ownerId) || "Unassigned" }}</p></div><button
          v-if="exception.status !== 'Resolved'"
          class="btn-brand self-center"
          @click="$emit('resolve', exception)"
        ><i class="fa-solid fa-check mr-1"></i>Resolve
        </button></article><div
        v-if="!order.exceptions.length"
        class="rounded-xl border border-dashed border-slate-300 py-14 text-center text-slate-400 dark:border-slate-600"
      ><i class="fa-solid fa-shield-check text-2xl"></i><p class="mt-2 text-sm font-bold">No open issues</p></div></div></div></template>
<script>
export default {
props: {
order: Object,
userName: Function,
},
emits: ["add", "resolve"],
};
</script>