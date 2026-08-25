<template>
  <div class="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
    <article
      v-for="item in items"
      :key="item.id"
      class="rounded-xl border border-slate-200/70 p-4 transition hover:border-brand dark:border-slate-700"
    >
      <div class="flex items-start justify-between gap-3">
        <div>
          <b class="text-sm">{{ display(item, visibleColumns[0]?.key) }}</b>
          <p v-if="visibleColumns[1]" class="mt-1 text-xs text-slate-500">
            {{ display(item, visibleColumns[1].key) }}
          </p>
        </div>
        <input
          :checked="selection[item.id]"
          type="checkbox"
          :aria-label="`${t('Select')} ${item.id}`"
          @change="$emit('toggle-select', item.id)"
        />
      </div>
      <div class="mt-3 flex flex-wrap gap-2 text-xs">
        <span
          v-for="col in visibleColumns.slice(2)"
          :key="col.key"
          class="rounded bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-slate-700 dark:text-slate-200"
        >
          {{ t(col.label) }}: {{ display(item, col.key) }}
        </span>
      </div>
    </article>
  </div>
</template>
<script>
export default {
  inject: ["store"],
  props: {
    items: { type: Array, required: true },
    visibleColumns: { type: Array, required: true },
    selection: { type: Object, required: true },
    display: { type: Function, required: true },
  },
  emits: ["toggle-select"],
  methods: {
    t(key) {
      void this.store?.locale?.value;
      return this.store?.t?.(key) || key;
    },
  },
};
</script>
