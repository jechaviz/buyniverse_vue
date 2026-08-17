<template>
  <div
    class="flex min-h-11 flex-wrap items-center justify-between gap-3 border-b border-brand-200 bg-brand-50/70 px-4 py-2 text-sm dark:bg-brand/10"
  >
    <div class="flex min-w-0 items-center gap-3">
      <span
        class="grid h-7 w-7 flex-none place-items-center rounded-lg bg-brand text-xs text-white"
      >
        <i class="fa-solid fa-check-double"></i>
      </span>
      <span class="whitespace-nowrap"
        ><b>{{ selectedCount }}</b> selected</span
      >
      <button
        v-if="selectedCount < totalCount"
        type="button"
        class="hidden text-xs font-semibold text-brand hover:underline sm:block"
        @click="$emit('select-all')"
      >
        Select all {{ totalCount }} matching
      </button>
      <span v-else class="hidden text-xs text-slate-500 sm:block"
        >All matching selected</span
      >
    </div>

    <div
      ref="root"
      class="relative flex items-center"
      @focusout="handleFocusOut"
    >
      <button
        type="button"
        class="btn-muted h-8 rounded-r-none px-3 text-xs"
        :disabled="!actions.length"
        :aria-expanded="menuOpen"
        aria-haspopup="menu"
        @click="menuOpen = !menuOpen"
      >
        <i class="fa-solid fa-bolt"></i>Bulk actions
        <span
          class="rounded-full bg-slate-200/80 px-1.5 py-0.5 text-[9px] dark:bg-slate-700"
        >
          {{ actions.length }}
        </span>
        <i class="fa-solid fa-chevron-down text-[8px] opacity-60"></i>
      </button>
      <button
        type="button"
        class="btn-muted -ml-px h-8 w-8 rounded-l-none p-0"
        title="Clear selection"
        aria-label="Clear selection"
        @click="$emit('clear')"
      >
        <i class="fa-solid fa-xmark"></i>
      </button>
      <div
        v-if="menuOpen"
        class="glass absolute right-0 top-10 z-60 w-60 rounded-xl p-2 shadow-2xl"
        role="menu"
      >
        <p
          class="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400"
        >
          Apply to {{ selectedCount }} records
        </p>
        <template v-for="(action, index) in actions" :key="action.key">
          <div
            v-if="
              action.tone === 'danger' &&
              index > 0 &&
              actions[index - 1]?.tone !== 'danger'
            "
            class="my-1 border-t border-slate-200/80 dark:border-slate-700"
          ></div>
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
            :class="action.tone === 'danger' ? 'text-rose-500' : ''"
            role="menuitem"
            :disabled="action.disabled"
            @click="run(action)"
          >
            <span
              class="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 dark:bg-slate-700"
            >
              <i class="fa-solid text-xs" :class="action.icon"></i>
            </span>
            <span class="min-w-0 flex-1">
              <b class="block truncate text-xs">{{ action.label }}</b>
              <small
                v-if="action.description"
                class="mt-0.5 block truncate text-[9px] opacity-65"
              >
                {{ action.description }}
              </small>
            </span>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    selectedCount: { type: Number, required: true },
    totalCount: { type: Number, required: true },
    actions: { type: Array, default: () => [] },
  },
  emits: ["action", "clear", "select-all"],
  data() {
    return { menuOpen: false };
  },
  methods: {
    run(action) {
      if (!action || action.disabled) return;
      this.menuOpen = false;
      this.$emit("action", action);
    },
    handleFocusOut(event) {
      this.$nextTick(() => {
        if (!this.$refs.root?.contains(event.relatedTarget))
          this.menuOpen = false;
      });
    },
  },
};
</script>
