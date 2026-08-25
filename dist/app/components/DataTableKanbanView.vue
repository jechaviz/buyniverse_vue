<template>
  <div class="grid gap-4 overflow-x-auto p-4 sm:grid-cols-2 lg:grid-cols-4">
    <section
      v-for="group in groups"
      :key="group.value"
      class="rounded-xl bg-slate-100/70 p-3 dark:bg-slate-800/55"
    >
      <h2 class="mb-3 text-sm font-bold">
        {{ t(group.label) }}
        <span class="text-slate-400">{{ group.count }}</span>
      </h2>
      <div class="space-y-2">
        <article
          v-for="item in groupedItems(group.value)"
          :key="item.id"
          class="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-700"
        >
          <b class="text-sm">{{ display(item, visibleColumns[0]?.key) }}</b>
          <p v-if="visibleColumns[1]" class="mt-1 text-xs text-slate-500">
            {{ display(item, visibleColumns[1].key) }}
          </p>
        </article>
      </div>
    </section>
  </div>
</template>
<script>
export default {
  inject: ["store"],
  props: {
    groups: { type: Array, required: true },
    visibleColumns: { type: Array, required: true },
    groupedItems: { type: Function, required: true },
    display: { type: Function, required: true },
  },
  methods: {
    t(key) {
      void this.store?.locale?.value;
      return this.store?.t?.(key) || key;
    },
  },
};
</script>
