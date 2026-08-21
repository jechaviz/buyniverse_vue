<template>
  <footer
    class="flex flex-col gap-3 border-t border-slate-200/70 bg-slate-50/45 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/25 sm:flex-row sm:items-center sm:justify-between"
  >
    <label class="flex items-center gap-2 text-slate-500"
      >Rows
      <select
        :value="pageSize"
        class="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700"
        @change="$emit('update:pageSize', Number($event.target.value))"
      >
        <option :value="5">5</option>
        <option :value="10">10</option>
        <option :value="20">20</option>
        <option :value="50">50</option><option :value="100">100</option><option :value="200">200</option>
      </select></label
    >
    <div class="flex items-center justify-between gap-3 sm:justify-end">
      <span class="text-slate-500">{{ rangeLabel }}</span>
      <div class="flex items-center gap-1">
        <button
          class="btn-muted h-8 w-8 p-0"
          v-if="!cursorMode" :disabled="page === 1"
          @click="$emit('update:page', 1)"
        >
          «</button
        ><button
          class="btn-muted h-8 w-8 p-0"
          :disabled="page === 1"
          @click="$emit('update:page', page - 1)"
        >
          ‹</button
        ><span class="min-w-18 text-center text-xs"
          >{{ page }} / {{ pageCount }}</span
        ><button
          class="btn-muted h-8 w-8 p-0"
          :disabled="loading || (cursorMode ? !hasNext : page === pageCount)"
          @click="$emit('update:page', page + 1)"
        >
          ›</button
        ><button
          class="btn-muted h-8 w-8 p-0"
          v-if="!cursorMode" :disabled="page === pageCount"
          @click="$emit('update:page', pageCount)"
        >
          »
        </button>
      </div>
    </div>
  </footer>
</template>
<script>
export default {
  props: {
    page: { type: Number, required: true },
    pageCount: { type: Number, required: true },
    pageSize: { type: Number, required: true },
    rangeLabel: { type: String, required: true },
    cursorMode: Boolean,
    hasNext: Boolean,
    loading: Boolean,
  },
  emits: ["update:page", "update:pageSize"],
};
</script>
