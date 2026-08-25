<template>
  <div
    ref="root"
    class="relative inline-flex h-8 items-center"
    @keydown.esc="close"
    @focusout="handleFocusOut"
  >
    <span v-if="!actions.length" class="text-slate-300">—</span>
    <button
      v-else
      type="button"
      class="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white/55 transition group-hover:border-brand/40 group-hover:text-brand dark:border-slate-600 dark:bg-slate-800/55"
      :class="[
        toneClass(primaryAction),
        railOpen ? 'border-brand text-brand' : '',
      ]"
      :title="`${t(primaryAction.label)} · ${t('Show actions')}`"
      :aria-label="`${t('Actions')} · ${itemLabel} · ${t(primaryAction.label)}`"
      :aria-expanded="railOpen"
      @click="railOpen = !railOpen"
    >
      <i class="fa-solid text-xs" :class="primaryAction.icon"></i>
    </button>

    <div
      v-if="actions.length"
      class="row-action-rail glass pointer-events-none absolute top-1/2 z-50 flex -translate-y-1/2 items-center gap-1 rounded-xl border border-slate-200/80 p-1 opacity-0 shadow-xl transition-all duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 dark:border-slate-700"
      :class="[
        align === 'left' ? 'left-0' : 'right-0',
        railOpen ? 'pointer-events-auto opacity-100' : '',
      ]"
      role="toolbar"
      :aria-label="`${t('Actions')} · ${itemLabel}`"
    >
      <button
        v-for="action in actions"
        :key="action.key"
        type="button"
        class="grid h-8 w-8 flex-none place-items-center rounded-lg transition hover:bg-slate-100 dark:hover:bg-slate-700"
        :class="toneClass(action)"
        :title="t(action.label)"
        :aria-label="t(action.label)"
        :disabled="action.disabled"
        @click="run(action)"
      >
        <i class="fa-solid text-xs" :class="action.icon"></i>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  inject: ["store"],
  props: {
    actions: { type: Array, default: () => [] },
    itemLabel: { type: String, default: "record" },
    align: { type: String, default: "right" },
  },
  emits: ["action"],
  data() {
    return { railOpen: false };
  },
  computed: {
    primaryAction() {
      return this.actions[this.actions.length - 1] || {};
    },
  },
  methods: {
    t(key) {
      void this.store?.locale?.value;
      return this.store?.t?.(key) || key;
    },
    toneClass(action) {
      if (action?.tone === "danger") return "text-rose-500";
      if (action?.tone === "success") return "text-emerald-600";
      return "";
    },
    run(action) {
      if (!action || action.disabled) return;
      this.close();
      this.$emit("action", action);
    },
    close() {
      this.railOpen = false;
    },
    handleFocusOut(event) {
      this.$nextTick(() => {
        if (!this.$refs.root?.contains(event.relatedTarget)) this.close();
      });
    },
  },
};
</script>
