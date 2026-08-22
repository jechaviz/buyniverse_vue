<template>
  <section class="rounded-xl border border-slate-200/80 bg-slate-50/75 dark:border-slate-700 dark:bg-slate-800/60" :aria-label="store.t('Block style controls')">
    <button type="button" class="flex w-full items-center gap-2 px-2.5 py-1.5 text-left" :aria-expanded="expanded" @click="expanded = !expanded">
      <span class="grid h-5 w-5 place-items-center rounded-md bg-white text-[9px] text-brand shadow-2xs dark:bg-slate-900"><i class="fa-solid fa-sliders"></i></span>
      <span class="text-[10px] font-800 uppercase tracking-wide text-slate-600 dark:text-slate-300">{{ store.t(label) }}</span>
      <span class="ml-auto flex items-center gap-1 text-[9px] font-bold text-slate-400">
        <i class="fa-solid" :class="activeHorizontal.icon"></i><span class="h-3 w-px bg-slate-300 dark:bg-slate-600"></span><span>{{ activeSize.label }}</span><i class="fa-solid fa-circle text-[7px]" :class="activeTone.className"></i>
      </span>
      <i class="fa-solid text-[9px] text-slate-400" :class="expanded ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
    </button>
    <div v-show="expanded" class="flex flex-wrap items-center gap-2 border-t border-slate-200/80 px-2.5 py-2 dark:border-slate-700" role="toolbar">
      <div class="flex items-center gap-1"><span class="text-[9px] font-bold text-slate-400">↔</span><div class="flex rounded-md bg-white p-0.5 shadow-2xs dark:bg-slate-900" :aria-label="store.t('Horizontal alignment')"><button v-for="option in horizontal" :key="option.value" type="button" class="grid h-5 w-5 place-items-center rounded text-[9px] transition" :class="value.align === option.value ? 'bg-brand text-white' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'" :title="store.t(option.title)" @click="patch({ align: option.value })"><i class="fa-solid" :class="option.icon"></i></button></div></div>
      <div class="flex items-center gap-1"><span class="text-[9px] font-bold text-slate-400">↕</span><div class="flex rounded-md bg-white p-0.5 shadow-2xs dark:bg-slate-900" :aria-label="store.t('Vertical alignment')"><button v-for="option in vertical" :key="option.value" type="button" class="grid h-5 w-5 place-items-center rounded text-[9px] transition" :class="value.vertical === option.value ? 'bg-brand text-white' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'" :title="store.t(option.title)" @click="patch({ vertical: option.value })"><i class="fa-solid" :class="option.icon"></i></button></div></div>
      <div class="flex rounded-md bg-white p-0.5 shadow-2xs dark:bg-slate-900" :aria-label="store.t('Text size')"><button v-for="option in sizes" :key="option.value" type="button" class="grid h-5 min-w-5 place-items-center rounded px-1 font-head text-[9px] font-800 transition" :class="value.size === option.value ? 'bg-brand text-white' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'" :title="store.t(option.title)" @click="patch({ size: option.value })">{{ option.label }}</button></div>
      <div class="flex rounded-md bg-white p-0.5 shadow-2xs dark:bg-slate-900" :aria-label="store.t('Text tone')"><button v-for="option in tones" :key="option.value" type="button" class="grid h-5 w-5 place-items-center rounded text-[9px] transition" :class="value.tone === option.value ? 'bg-brand/15 ring-1 ring-brand text-brand dark:bg-brand/25' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'" :title="store.t(option.title)" @click="patch({ tone: option.value })"><i class="fa-solid fa-circle" :class="option.className"></i></button></div>
      <div v-if="presets.length" class="ml-auto flex items-center gap-1"><span class="text-[9px] font-bold text-slate-400">{{ store.t('Preset') }}</span><button v-for="preset in presets" :key="preset.key" type="button" class="rounded-md px-1.5 py-1 text-[9px] font-bold transition" :class="isPreset(preset) ? 'bg-brand-50 text-brand dark:bg-brand/20 dark:text-brand-200' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'" :title="store.t(preset.description)" @click="applyPreset(preset)">{{ store.t(preset.label) }}</button></div>
    </div>
  </section>
</template>

<script>
const { computed, ref } = Vue;

export default {
  name: "DocumentBlockStyleToolbar",
  props: {
    store: Object,
    label: { type: String, default: "Style" },
    modelValue: { type: Object, default: () => ({}) },
    presets: { type: Array, default: () => [] },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const fallback = { align: "left", vertical: "top", size: "md", tone: "default", surface: "plain" };
    const value = computed(() => ({ ...fallback, ...(props.modelValue || {}) }));
    const expanded = ref(false);
    const horizontal = [
      { value: "left", icon: "fa-align-left", title: "Align left" },
      { value: "center", icon: "fa-align-center", title: "Align center" },
      { value: "right", icon: "fa-align-right", title: "Align right" },
    ];
    const vertical = [
      { value: "top", icon: "fa-align-left rotate-90", title: "Align to top" },
      { value: "center", icon: "fa-grip-lines", title: "Align vertically center" },
      { value: "bottom", icon: "fa-align-right rotate-90", title: "Align to bottom" },
    ];
    const sizes = [
      { value: "sm", label: "A−", title: "Small text" },
      { value: "md", label: "A", title: "Medium text" },
      { value: "lg", label: "A+", title: "Large text" },
    ];
    const tones = [
      { value: "default", title: "Default tone", className: "text-slate-500" },
      { value: "brand", title: "Brand tone", className: "text-brand" },
      { value: "muted", title: "Muted tone", className: "text-slate-400" },
      { value: "legal", title: "Legal tone", className: "text-amber-500" },
    ];
    const patch = (next) => emit("update:modelValue", { ...value.value, ...next });
    const applyPreset = (preset) => patch(preset.style || {});
    const isPreset = (preset) => Object.entries(preset.style || {}).every(([key, item]) => value.value[key] === item);
    const activeHorizontal = computed(() => horizontal.find((item) => item.value === value.value.align) || horizontal[0]);
    const activeSize = computed(() => sizes.find((item) => item.value === value.value.size) || sizes[1]);
    const activeTone = computed(() => tones.find((item) => item.value === value.value.tone) || tones[0]);
    return { value, expanded, horizontal, vertical, sizes, tones, activeHorizontal, activeSize, activeTone, patch, applyPreset, isPreset };
  },
};
</script>
