<template><section
    class="overflow-hidden rounded-xl border border-slate-200/80 bg-white/35 dark:border-slate-700 dark:bg-slate-800/25"
  ><button
      type="button"
      class="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-100/70 dark:hover:bg-slate-700/50"
      :aria-expanded="isOpen"
      :aria-controls="contentId"
      @click="toggle"
    ><span
        v-if="icon"
        class="grid h-8 w-8 flex-none place-items-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300"
      ><i class="fa-solid text-xs" :class="icon"></i></span><span class="min-w-0 flex-1"><b class="block truncate text-sm">{{ title }}</b><small
          v-if="subtitle"
          class="mt-0.5 block truncate text-[10px] text-slate-500"
        >
          {{ subtitle }}
        </small></span><span
        v-if="count !== null && count !== undefined"
        class="grid h-5 min-w-5 place-items-center rounded-full bg-slate-100 px-1.5 text-[9px] font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-300"
      >
        {{ count }}
      </span><i
        class="fa-solid fa-chevron-down text-[10px] text-slate-400 transition-transform"
        :class="isOpen ? 'rotate-180' : ''"
      ></i></button><div
      v-show="isOpen"
      :id="contentId"
      class="border-t border-slate-200/70 p-4 dark:border-slate-700"
    ><slot></slot></div></section></template>
<script>
export default {
props: {
modelValue: { type: Boolean, default: null },
defaultOpen: { type: Boolean, default: false },
title: { type: String, required: true },
subtitle: { type: String, default: "" },
icon: { type: String, default: "" },
count: { type: [Number, String], default: null },
},
emits: ["update:modelValue"],
data() {
return {
internalOpen: this.defaultOpen,
contentId: `collapsible-${Math.random().toString(36).slice(2, 9)}`,
};
},
computed: {
isOpen() {
return this.modelValue === null ? this.internalOpen : this.modelValue;
},
},
methods: {
toggle() {
const next = !this.isOpen;
this.internalOpen = next;
this.$emit("update:modelValue", next);
},
},
};
</script>