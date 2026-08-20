<template>
  <aside
    class="w-80 sm:w-96 flex flex-col border-l border-slate-200/90 bg-slate-50/95 dark:border-slate-800 dark:bg-slate-950/95 overflow-hidden flex-none z-20 shadow-xl"
  >
    <!-- Drawer Header -->
    <header class="flex items-center justify-between border-b border-slate-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/80 flex-none">
      <div class="flex items-center gap-2">
        <span class="grid h-7 w-7 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs">
          <i class="fa-solid fa-sliders"></i>
        </span>
        <div>
          <b class="text-xs font-800 text-slate-900 dark:text-white block">{{ store.t("Campos Configurables") }}</b>
          <span class="text-[10px] text-slate-400 font-mono">{{ detectedVariables.length }} {{ store.t("campos detectados") }}</span>
        </div>
      </div>
      <button
        type="button"
        class="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition text-xs"
        @click="$emit('close')"
      >
        <i class="fa-solid fa-xmark"></i>
      </button>
    </header>

    <!-- Nav Tabs inside Drawer -->
    <div class="flex border-b border-slate-200/80 bg-slate-100/70 p-1.5 dark:border-slate-800 dark:bg-slate-900/50 flex-none gap-1">
      <button
        type="button"
        class="flex-1 rounded-lg py-1.5 text-xs font-bold transition flex items-center justify-center gap-1.5"
        :class="activeTab === 'fields' ? 'bg-white shadow-xs text-brand dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'"
        @click="activeTab = 'fields'"
      >
        <i class="fa-solid fa-file-signature text-[11px]"></i>
        <span>{{ store.t("Llenar Machote") }}</span>
      </button>
      <button
        type="button"
        class="flex-1 rounded-lg py-1.5 text-xs font-bold transition flex items-center justify-center gap-1.5"
        :class="activeTab === 'saved' ? 'bg-white shadow-xs text-brand dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'"
        @click="activeTab = 'saved'"
      >
        <i class="fa-solid fa-folder-open text-[11px]"></i>
        <span>{{ store.t("Mis Plantillas") }}</span>
      </button>
    </div>

    <!-- TAB 1: FORM FIELDS / FILL-IN DRAWER -->
    <div v-if="activeTab === 'fields'" class="flex-1 overflow-y-auto p-4 space-y-4">
      <div v-if="detectedVariables.length === 0" class="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-400 dark:border-slate-700 space-y-2">
        <i class="fa-solid fa-tags text-2xl text-slate-300 dark:text-slate-600"></i>
        <p class="text-xs font-bold text-slate-600 dark:text-slate-300">{{ store.t("Sin campos configurables detectados") }}</p>
        <p class="text-[11px] text-slate-400 leading-snug">
          {{ store.t("Selecciona cualquier texto en el editor y haz clic en '🏷️ Marcar Campo' o escribe {{NOMBRE_CAMPO:Valor por defecto}}.") }}
        </p>
        <button
          type="button"
          class="btn-muted text-xs py-1.5 px-3 mt-2 font-semibold"
          @click="$emit('load-template-nda')"
        >
          <i class="fa-solid fa-wand-magic-sparkles mr-1 text-brand"></i>{{ store.t("Cargar Machote NDA de Ejemplo") }}
        </button>
      </div>

      <template v-else>
        <div class="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-2">
          <i class="fa-solid fa-lightbulb text-amber-600 mt-0.5"></i>
          <span>{{ store.t("Modifica los valores abajo para personalizar este contrato o pliego en tiempo real.") }}</span>
        </div>

        <div class="space-y-3">
          <div
            v-for="item in detectedVariables"
            :key="item.key"
            class="rounded-xl border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 shadow-2xs space-y-1.5"
          >
            <div class="flex items-center justify-between">
              <label class="text-[11px] font-bold text-slate-700 dark:text-slate-200 block truncate">
                {{ item.label }}
              </label>
              <span class="font-mono text-[9px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                {{ item.key }}
              </span>
            </div>
            <input
              v-model="variableValues[item.key]"
              class="field text-xs py-1.5 px-2.5 bg-slate-50 dark:bg-slate-950 focus:bg-white"
              :placeholder="item.defaultValue || item.label"
            />
          </div>
        </div>

        <div class="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <button
            type="button"
            class="btn-brand w-full text-xs py-2 font-bold shadow-md"
            @click="applyVariables"
          >
            <i class="fa-solid fa-check-double mr-1.5"></i>{{ store.t("Reemplazar Variables por Valores") }}
          </button>
          <button
            type="button"
            class="btn-muted w-full text-xs py-1.5 font-semibold"
            @click="autofillWithUserData"
          >
            <i class="fa-solid fa-user-check mr-1.5 text-brand"></i>{{ store.t("Autocompletar con mis Datos") }}
          </button>
        </div>
      </template>
    </div>

    <!-- TAB 2: SAVED TEMPLATES / DOCS MENU -->
    <div v-else class="flex-1 overflow-y-auto p-4 space-y-4">
      <!-- Save current doc as template -->
      <div class="rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900 space-y-2.5 shadow-xs">
        <b class="text-xs font-800 text-slate-900 dark:text-white block">{{ store.t("Guardar Documento Actual") }}</b>
        <input
          v-model.trim="saveTemplateName"
          class="field text-xs py-1.5 px-2.5"
          :placeholder="store.t('Nombre de la Plantilla (ej. Mi NDA 2026)')"
        />
        <button
          type="button"
          class="btn-brand w-full text-xs py-1.5 font-bold"
          :disabled="!saveTemplateName"
          @click="saveCurrentDoc"
        >
          <i class="fa-solid fa-floppy-disk mr-1.5"></i>{{ store.t("Guardar en Mis Plantillas") }}
        </button>
      </div>

      <!-- List of Saved Templates -->
      <div class="space-y-2">
        <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
          {{ store.t("Plantillas Guardadas") }} ({{ savedDocuments.length }})
        </span>

        <div v-if="savedDocuments.length === 0" class="text-center py-6 text-slate-400 text-xs">
          <i class="fa-regular fa-folder-open text-2xl mb-1 text-slate-300 dark:text-slate-600 block"></i>
          <span>{{ store.t("No tienes plantillas guardadas aún.") }}</span>
        </div>

        <div
          v-for="doc in savedDocuments"
          :key="doc.id"
          class="rounded-xl border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 space-y-2 shadow-2xs hover:border-brand/40 transition"
        >
          <div class="flex items-start justify-between gap-2">
            <div>
              <b class="text-xs font-bold text-slate-900 dark:text-white block">{{ doc.name }}</b>
              <span class="text-[10px] text-slate-400">{{ doc.sections?.length || 0 }} {{ store.t("secciones") }} · {{ doc.createdAt }}</span>
            </div>
            <button
              type="button"
              class="text-slate-400 hover:text-rose-500 p-1 text-xs"
              @click="deleteSavedDoc(doc.id)"
              :title="store.t('Eliminar plantilla')"
            >
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>

          <div class="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              class="btn-muted flex-1 text-[11px] py-1 font-bold"
              @click="$emit('load-saved-doc', doc)"
            >
              <i class="fa-solid fa-folder-open mr-1 text-brand"></i>{{ store.t("Cargar") }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<script>
const { ref, computed, watch } = Vue;

export default {
  name: "DocumentVariableDrawer",
  props: {
    store: Object,
    sections: Array,
    docTitle: String,
  },
  emits: ["close", "apply-variables", "load-saved-doc", "load-template-nda", "save-doc"],
  setup(props, { emit }) {
    const activeTab = ref("fields");
    const saveTemplateName = ref("");
    const variableValues = ref({});

    // Retrieve detected variables from DocumentParser
    const detectedVariables = computed(() => {
      const parser = window.DocumentParser;
      if (!parser || !parser.extractVariablesFromSections) return [];
      return parser.extractVariablesFromSections(props.sections);
    });

    // Initialize values when variables are detected
    watch(
      detectedVariables,
      (vars) => {
        vars.forEach((v) => {
          if (variableValues.value[v.key] === undefined) {
            variableValues.value[v.key] = v.defaultValue || "";
          }
        });
      },
      { immediate: true }
    );

    // Persistence for user saved docs
    const savedDocuments = ref([]);
    const STORAGE_KEY = "buyniverse_saved_doc_templates";

    function loadSavedDocsFromStorage() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) savedDocuments.value = JSON.parse(raw);
      } catch (e) {}
    }
    loadSavedDocsFromStorage();

    function saveCurrentDoc() {
      if (!saveTemplateName.value) return;
      const newDoc = {
        id: "doc-" + Date.now(),
        name: saveTemplateName.value,
        title: props.docTitle,
        sections: JSON.parse(JSON.stringify(props.sections)),
        createdAt: new Date().toLocaleDateString(),
      };
      savedDocuments.value.unshift(newDoc);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedDocuments.value));
      } catch (e) {}
      saveTemplateName.value = "";
      props.store.notice("Plantilla guardada con éxito en Mis Documentos", "fa-circle-check");
    }

    function deleteSavedDoc(id) {
      savedDocuments.value = savedDocuments.value.filter((d) => d.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedDocuments.value));
      } catch (e) {}
      props.store.notice("Plantilla eliminada", "fa-trash-can");
    }

    function applyVariables() {
      emit("apply-variables", variableValues.value);
    }

    function autofillWithUserData() {
      const user = props.store.state?.user || {};
      const company = props.store.state?.company || {};
      variableValues.value["CIUDAD_FIRMA"] = "Ciudad de México";
      variableValues.value["FECHA_FIRMA"] = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
      variableValues.value["EMPRESA_CLIENTE"] = company.name || "Buyniverse Enterprise S.A.";
      variableValues.value["REPRESENTANTE_CLIENTE"] = user.name || "Director General";
      variableValues.value["RFC_CLIENTE"] = company.taxId || "BUY260101XYZ";
      variableValues.value["NOMBRE_CLIENTE"] = user.name || "Acme Corporation";
      variableValues.value["TITULO_PROYECTO"] = props.docTitle || "Proyecto Estratégico 2026";
      props.store.notice("Datos autocompletados desde el perfil", "fa-wand-magic-sparkles");
    }

    return {
      activeTab,
      saveTemplateName,
      variableValues,
      detectedVariables,
      savedDocuments,
      saveCurrentDoc,
      deleteSavedDoc,
      applyVariables,
      autofillWithUserData,
    };
  },
};
</script>
