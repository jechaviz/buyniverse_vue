<template>
  <aside class="flex w-80 max-w-[88vw] flex-none flex-col overflow-hidden border-l border-slate-200/90 bg-slate-50/95 shadow-xl dark:border-slate-800 dark:bg-slate-950/95">
    <header class="flex items-center justify-between border-b border-slate-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/80">
      <div class="flex items-center gap-2">
        <span class="grid h-7 w-7 place-items-center rounded-lg bg-amber-500/10 text-xs text-amber-600 dark:text-amber-400"><i class="fa-solid fa-tags"></i></span>
        <div>
          <b class="block text-xs font-800 text-slate-900 dark:text-white">{{ store.t("Variable fields") }}</b>
          <span class="font-mono text-[10px] text-slate-400">{{ detectedVariables.length }} {{ store.t("detected fields") }}</span>
        </div>
      </div>
      <button type="button" class="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200" :aria-label="store.t('Close')" @click="$emit('close')"><i class="fa-solid fa-xmark text-xs"></i></button>
    </header>

    <div class="flex-1 space-y-4 overflow-y-auto p-4">
      <div v-if="detectedVariables.length === 0" class="space-y-2 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-400 dark:border-slate-700">
        <i class="fa-solid fa-tags text-2xl text-slate-300 dark:text-slate-600"></i>
        <p class="text-xs font-bold text-slate-600 dark:text-slate-300">{{ store.t("No variable fields detected") }}</p>
        <p class="text-[11px] leading-snug">{{ store.t("Select text in the editor and mark it as a field, or use a starter template.") }}</p>
        <button type="button" class="btn-muted mt-2 px-3 py-1.5 text-xs font-semibold" @click="$emit('load-template-nda')"><i class="fa-solid fa-wand-magic-sparkles mr-1 text-brand"></i>{{ store.t("Use NDA starter") }}</button>
      </div>

      <template v-else>
        <div class="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] text-amber-800 dark:text-amber-200">
          <i class="fa-solid fa-lightbulb mt-0.5 text-amber-600"></i>
          <span>{{ store.t("Fill values once, then apply them to create a finalized copy of this document.") }}</span>
        </div>
        <div class="space-y-3">
          <div v-for="item in detectedVariables" :key="item.key" class="space-y-1.5 rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div class="flex items-center justify-between gap-2">
              <label class="truncate text-[11px] font-bold text-slate-700 dark:text-slate-200">{{ item.label }}</label>
              <span class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] text-slate-400 dark:bg-slate-800">{{ item.key }}</span>
            </div>
            <input v-model="variableValues[item.key]" class="field bg-slate-50 px-2.5 py-1.5 text-xs focus:bg-white dark:bg-slate-950" :placeholder="item.defaultValue || item.label" />
          </div>
        </div>
      </template>
    </div>

    <footer v-if="detectedVariables.length" class="space-y-2 border-t border-slate-200 bg-white/75 p-4 dark:border-slate-800 dark:bg-slate-900/75">
      <button type="button" class="btn-brand w-full py-2 text-xs font-bold" @click="applyVariables"><i class="fa-solid fa-check-double mr-1.5"></i>{{ store.t("Apply values to copy") }}</button>
      <button type="button" class="btn-muted w-full py-1.5 text-xs font-semibold" @click="autofillWithUserData"><i class="fa-solid fa-user-check mr-1.5 text-brand"></i>{{ store.t("Fill from my profile") }}</button>
    </footer>
  </aside>
</template>

<script>
const { ref, computed, watch } = Vue;

export default {
  name: "DocumentVariableDrawer",
  props: { store: Object, sections: Array, docTitle: String },
  emits: ["close", "apply-variables", "load-template-nda"],
  setup(props, { emit }) {
    const variableValues = ref({});
    const detectedVariables = computed(() => window.DocumentParser?.extractVariablesFromSections?.(props.sections) || []);
    watch(detectedVariables, (variables) => {
      variables.forEach((item) => {
        if (variableValues.value[item.key] === undefined) variableValues.value[item.key] = item.defaultValue || "";
      });
    }, { immediate: true });
    const applyVariables = () => emit("apply-variables", { ...variableValues.value });
    const autofillWithUserData = () => {
      const user = props.store.currentUser?.value || {};
      variableValues.value.CIUDAD_FIRMA = "Ciudad de México";
      variableValues.value.FECHA_FIRMA = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
      variableValues.value.EMPRESA_CLIENTE = user.company || user.organization || "Buyniverse Enterprise";
      variableValues.value.REPRESENTANTE_CLIENTE = user.name || "Authorized representative";
      variableValues.value.NOMBRE_CLIENTE = user.name || "Customer";
      variableValues.value.TITULO_PROYECTO = props.docTitle || "Strategic project";
      props.store.notice(props.store.t("Document fields filled from your profile"), "fa-wand-magic-sparkles");
    };
    return { variableValues, detectedVariables, applyVariables, autofillWithUserData };
  },
};
</script>
