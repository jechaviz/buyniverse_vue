<template>
  <span
    class="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-brand/20 bg-brand-50/70 px-2 py-1 text-[10px] font-bold text-brand dark:bg-brand/10"
    :title="label"
  >
    <i class="fa-solid fa-building-shield flex-none text-[10px]"></i>
    <span class="truncate">{{ prefix }}{{ label }}</span>
  </span>
</template>

<script>
const { inject, computed } = Vue;
export default {
  props: { record: { type: Object, default: null }, scope: { type: Object, default: null }, showPrefix: { type: Boolean, default: true } },
  setup(props) {
    const store = inject("store");
    const scope = computed(() => props.scope || props.record?.operationalScope || store.operationalScope.value);
    const label = computed(() => store.scopeLabel(scope.value));
    const prefix = computed(() => props.showPrefix ? `${store.t("Applies to")}: ` : "");
    return { label, prefix };
  },
};
</script>
