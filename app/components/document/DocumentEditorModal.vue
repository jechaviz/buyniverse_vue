<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-md transition-all duration-200"
    role="dialog"
    aria-modal="true"
  >
    <div
      class="relative flex flex-col w-full max-w-7xl h-[92vh] max-h-[920px] rounded-3xl border border-slate-200/90 bg-white shadow-2xl overflow-hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
    >
      <!-- Top Global Action Bar & Metadata Ribbon -->
      <header
        class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/90 bg-slate-50/90 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/80 flex-none"
      >
        <div class="flex items-center gap-3 min-w-0">
          <span class="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white shadow-sm flex-none">
            <i class="fa-solid fa-file-lines text-sm"></i>
          </span>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="badge bg-brand-50 text-brand text-[10px] font-bold dark:bg-brand/20 dark:text-brand-300">
                {{ store.t("Editor Markdown Profesional") }}
              </span>
              <span class="text-xs text-slate-400">·</span>
              <span class="text-xs text-slate-500 dark:text-slate-400 font-mono">{{ sections.length }} {{ store.t("secciones") }}</span>
              <span class="text-xs text-slate-400">·</span>
              <span class="text-xs text-slate-500 dark:text-slate-400 font-mono">{{ totalWordCount }} {{ store.t("palabras") }}</span>
            </div>
            <input
              v-model.trim="docTitle"
              class="font-head text-sm sm:text-base font-800 text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 focus:border-brand focus:outline-none transition py-0.5 max-w-md truncate"
              :placeholder="store.t('Título del Pliego o Especificación de Compra')"
            />
          </div>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <!-- Template selector -->
          <div class="relative">
            <button
              type="button"
              class="btn-muted text-xs py-1.5 px-3 font-semibold flex items-center gap-1.5"
              @click="templatesOpen = !templatesOpen"
            >
              <i class="fa-solid fa-wand-magic-sparkles text-brand text-xs"></i>
              <span>{{ store.t("Plantillas") }}</span>
              <i class="fa-solid fa-chevron-down text-[10px] text-slate-400"></i>
            </button>

            <!-- Floating templates dropdown -->
            <div
              v-if="templatesOpen"
              class="absolute right-0 top-full mt-1 w-64 z-50 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900 space-y-1"
            >
              <button
                v-for="tpl in documentTemplates"
                :key="tpl.id"
                type="button"
                class="flex w-full items-start gap-2.5 rounded-xl p-2.5 text-left text-xs transition hover:bg-slate-100 dark:hover:bg-slate-800"
                @click="loadTemplate(tpl)"
              >
                <i :class="tpl.icon" class="text-brand text-sm mt-0.5"></i>
                <div>
                  <b class="block text-slate-900 dark:text-white">{{ tpl.name }}</b>
                  <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">{{ tpl.desc }}</p>
                </div>
              </button>
            </div>
          </div>

          <!-- Running Headers & Footers Settings Modal Trigger -->
          <button
            type="button"
            class="btn-muted text-xs py-1.5 px-3 font-semibold flex items-center gap-1.5"
            @click="headerFooterSettingsOpen = !headerFooterSettingsOpen"
          >
            <i class="fa-solid fa-heading text-slate-500 text-xs"></i>
            <span class="hidden sm:inline">{{ store.t("Encabezado / Pie") }}</span>
          </button>

          <!-- Copy Markdown Button -->
          <button
            type="button"
            class="btn-muted text-xs py-1.5 px-3 font-semibold flex items-center gap-1.5"
            @click="copyCompiledMarkdown"
            :title="store.t('Copiar documento completo a portapapeles')"
          >
            <i class="fa-regular fa-copy text-xs"></i>
            <span class="hidden md:inline">{{ store.t("Copiar MD") }}</span>
          </button>

          <!-- Insert in Description Primary Button -->
          <button
            type="button"
            class="btn-brand text-xs py-1.5 px-4 font-bold shadow-md flex items-center gap-1.5"
            @click="applyDocumentToDescription"
          >
            <i class="fa-solid fa-check text-xs"></i>
            <span>{{ store.t("Aplicar al Proyecto") }}</span>
          </button>

          <!-- Close Modal Cross -->
          <button
            type="button"
            class="grid h-8 w-8 place-items-center rounded-xl text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
            @click="$emit('update:modelValue', false)"
            aria-label="Cerrar"
          >
            <i class="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>
      </header>

      <!-- Running Header / Footer Configuration Drawer -->
      <div
        v-if="headerFooterSettingsOpen"
        class="border-b border-slate-200/90 bg-brand-50/40 p-4 dark:border-slate-800 dark:bg-slate-900/80 transition flex-none grid gap-4 grid-cols-1 sm:grid-cols-3 text-xs"
      >
        <div>
          <label class="font-bold text-slate-700 dark:text-slate-300 block mb-1">
            <i class="fa-solid fa-heading mr-1 text-brand"></i>{{ store.t("Encabezado Superior Repetible") }}
          </label>
          <input
            v-model="headerText"
            class="input text-xs py-1.5 px-2.5 w-full bg-white dark:bg-slate-800"
            :placeholder="store.t('Ej. RFC / ID de Proyecto / Confidencial')"
          />
        </div>
        <div>
          <label class="font-bold text-slate-700 dark:text-slate-300 block mb-1">
            <i class="fa-solid fa-shoe-prints mr-1 text-brand"></i>{{ store.t("Pie de Página Repetible") }}
          </label>
          <input
            v-model="footerText"
            class="input text-xs py-1.5 px-2.5 w-full bg-white dark:bg-slate-800"
            :placeholder="store.t('Ej. Confidencial · Buyniverse Escrow Protected')"
          />
        </div>
        <div class="flex items-end gap-3">
          <div class="flex-1">
            <label class="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              <i class="fa-solid fa-list-ol mr-1 text-brand"></i>{{ store.t("Numeración de Hoja Carta") }}
            </label>
            <select v-model="pageNumberFormat" class="input text-xs py-1.5 px-2.5 w-full bg-white dark:bg-slate-800">
              <option value="Page X of Y">Página X de Y (Estándar)</option>
              <option value="X / Y">X / Y (Compacto)</option>
              <option value="Page X">Página X</option>
              <option value="none">Sin numeración</option>
            </select>
          </div>
          <button
            type="button"
            class="btn-muted text-xs py-1.5 px-3 h-[34px]"
            @click="headerFooterSettingsOpen = false"
          >
            {{ store.t("Listo") }}
          </button>
        </div>
      </div>

      <!-- Main Dual-Pane Workspace Body -->
      <div class="flex flex-1 min-h-0 overflow-hidden">
        <!-- LEFT PANEL: Sidebar Thumbnails & Tree -->
        <DocumentSidebarPanel
          :store="store"
          :sections="sections"
          :active-section-id="activeSectionId"
          :flat-numbered-sections="flatNumberedSections"
          :estimated-pages="estimatedPages"
          :left-view-tab="leftViewTab"
          :header-text="headerText"
          :footer-text="footerText"
          :page-number-format="pageNumberFormat"
          :show-running-header="showRunningHeader"
          @update:left-view-tab="leftViewTab = $event"
          @update:active-section-id="activeSectionId = $event"
          @add-root-section="addRootSection"
          @add-sub-section="addSubSection"
          @delete-section="deleteSection"
          @select-section="selectSection"
        />

        <!-- RIGHT PANEL: Focused Section Markdown & Inline Style Editor -->
        <DocumentContentEditor
          :store="store"
          :active-section="activeSection"
          :active-section-number="activeSectionNumber"
          :rendered-blocks="renderedBlocks"
          @set-level="setSectionLevel"
          @insert-wrapper="insertMarkdownWrapper"
          @insert-table="insertTableSnippet"
          @insert-prefix="insertMarkdownPrefix"
          @insert-callout="insertCallout"
          @add-root-section="addRootSection"
        />
      </div>
    </div>
  </div>
</template>

<script>
const { inject, ref, computed, nextTick, defineAsyncComponent } = Vue;
const load = (p) => defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(p, window.sfcOptions));
const DocumentSidebarPanel = load("./app/components/document/DocumentSidebarPanel.vue?v=1");
const DocumentContentEditor = load("./app/components/document/DocumentContentEditor.vue?v=1");

const documentTemplates = (window.DocumentTemplates && window.DocumentTemplates.documentTemplates) || [];
const parseMarkdownToBlocks = (window.DocumentParser && window.DocumentParser.parseMarkdownToBlocks) || function () { return []; };
const compileDocumentToMarkdown = (window.DocumentParser && window.DocumentParser.compileDocumentToMarkdown) || function () { return ""; };

export default {
  name: "DocumentEditorModal",
  components: {
    DocumentSidebarPanel,
    DocumentContentEditor,
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    initialMarkdown: {
      type: String,
      default: "",
    },
  },
  emits: ["update:modelValue", "apply"],
  setup(props, { emit }) {
    const store = inject("store");
    const docTitle = ref("Pliego de Términos y Condiciones Técnicas");
    const headerText = ref("BUY-2026-RFP · Especificación de Compra");
    const footerText = ref("Confidencial · Buyniverse Escrow Protected");
    const pageNumberFormat = ref("Page X of Y");
    const showRunningHeader = ref(true);
    const headerFooterSettingsOpen = ref(false);
    const templatesOpen = ref(false);
    const leftViewTab = ref("thumbnails");
    const markdownTextarea = ref(null);

    const sections = ref([
      {
        id: "sec-1",
        title: "Objetivo y Alcance del Proyecto",
        level: 1,
        pageBreakBefore: false,
        content: "El presente documento establece los términos técnicos y comerciales para la adjudicación mediante subasta inversa BAFO.\n\n- **Objetivo Principal:** Implementación de solución escalable con arquitectura segura.\n- **Modalidad de Pago:** Custodia en fideicomiso (Escrow) liberada contra hitos aprobados.\n\n> [!NOTE]\n> Todos los postores deben cumplir con los requisitos de homologación y scoring SRM mínimo de 80 puntos."
      },
      {
        id: "sec-2",
        title: "Requerimientos Técnicos y Entregables",
        level: 2,
        pageBreakBefore: false,
        content: "Los entregables deberán satisfacer la siguiente matriz de aceptación:\n\n| Hito | Entregable Clave | Plazo | % Fondo Escrow |\n| :--- | :--- | :--- | :--- |\n| Hito 1 | Diseño de Arquitectura & Prototipo UX | 15 días | 30% |\n| Hito 2 | Implementación Core & APIs | 30 días | 40% |\n| Hito 3 | Pruebas de Calidad, QA & Despliegue | 15 días | 30% |"
      },
      {
        id: "sec-3",
        title: "Criterios de Seguridad y Cumplimiento",
        level: 3,
        pageBreakBefore: false,
        content: "- Cumplimiento con estándares ISO-27001 y cifrado en tránsito TLS 1.3.\n- Validación fiscal automática mediante conciliación 3-Way Match.\n\n> [!IMPORTANT]\n> Cualquier desviación no autorizada en los plazos pactados aplicará penalización del 2% semanal sobre el monto del hito."
      },
      {
        id: "sec-4",
        title: "Mecanismo de Subasta Inversa BAFO y Ganancia Compartida",
        level: 1,
        pageBreakBefore: true,
        content: "La adjudicación se definirá en subasta inversa en tiempo real.\n\n1. El postor presentará su cotización inicial de referencia.\n2. Se abrirá una ventana de 60 minutos para colocación de contraofertas dinámicas.\n3. La comisión de éxito Gain-Share (40% base o 25% por gran volumen) se liquidará exclusivamente sobre el ahorro neto comprobado."
      }
    ]);

    const activeSectionId = ref("sec-1");

    const activeSection = computed(() => {
      return sections.value.find((s) => s.id === activeSectionId.value) || sections.value[0] || null;
    });

    const flatNumberedSections = computed(() => {
      let l1 = 0;
      let l2 = 0;
      let l3 = 0;

      return sections.value.map((sec) => {
        if (sec.level === 1) {
          l1++;
          l2 = 0;
          l3 = 0;
          return { ...sec, numberStr: `${l1}.` };
        } else if (sec.level === 2) {
          l2++;
          l3 = 0;
          return { ...sec, numberStr: `${l1}.${l2}` };
        } else {
          l3++;
          return { ...sec, numberStr: `${l1}.${l2}.${l3}` };
        }
      });
    });

    function getSectionNumber(sec) {
      const match = flatNumberedSections.value.find((s) => s.id === sec.id);
      return match ? match.numberStr : "1.";
    }

    const activeSectionNumber = computed(() => {
      if (!activeSection.value) return "1.";
      return getSectionNumber(activeSection.value);
    });

    const totalWordCount = computed(() => {
      return sections.value.reduce((sum, sec) => {
        const words = (sec.content || "").trim().split(/\s+/).filter(Boolean).length;
        return sum + words;
      }, 0);
    });

    const estimatedPages = computed(() => {
      const pages = [];
      let currentPage = { sections: [] };

      sections.value.forEach((sec, idx) => {
        if (sec.pageBreakBefore && currentPage.sections.length > 0) {
          pages.push(currentPage);
          currentPage = { sections: [sec] };
        } else {
          currentPage.sections.push(sec);
          const wordsOnPage = currentPage.sections.reduce((w, s) => w + (s.content || "").split(/\s+/).length, 0);
          if (wordsOnPage > 280 && idx < sections.value.length - 1) {
            pages.push(currentPage);
            currentPage = { sections: [] };
          }
        }
      });

      if (currentPage.sections.length > 0) {
        pages.push(currentPage);
      }

      return pages.length ? pages : [{ sections: sections.value }];
    });

    function selectSection(sec) {
      if (sec) {
        activeSectionId.value = sec.id;
      }
    }

    function addRootSection() {
      const newId = "sec-" + Date.now();
      sections.value.push({
        id: newId,
        title: "Nueva Sección",
        level: 1,
        pageBreakBefore: false,
        content: "Descripción de los requerimientos y condiciones."
      });
      activeSectionId.value = newId;
    }

    function addSubSection(parentSec) {
      const newId = "sec-" + Date.now();
      const parentIdx = sections.value.findIndex((s) => s.id === parentSec.id);
      const newLevel = Math.min(parentSec.level + 1, 3);

      sections.value.splice(parentIdx + 1, 0, {
        id: newId,
        title: "Nueva Subsección",
        level: newLevel,
        pageBreakBefore: false,
        content: ""
      });
      activeSectionId.value = newId;
    }

    function deleteSection(id) {
      if (sections.value.length <= 1) {
        store.notice("El documento debe tener al menos una sección", "fa-triangle-exclamation");
        return;
      }
      sections.value = sections.value.filter((s) => s.id !== id);
      if (activeSectionId.value === id) {
        activeSectionId.value = sections.value[0]?.id;
      }
    }

    function setSectionLevel(level) {
      if (activeSection.value) {
        activeSection.value.level = level;
      }
    }

    function insertMarkdownWrapper(prefix, suffix, placeholder) {
      const textarea = markdownTextarea.value;
      if (!textarea || !activeSection.value) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = activeSection.value.content || "";
      const selected = val.substring(start, end) || placeholder;

      activeSection.value.content = val.substring(0, start) + prefix + selected + suffix + val.substring(end);
      nextTick(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
      });
    }

    function insertMarkdownPrefix(prefix) {
      const textarea = markdownTextarea.value;
      if (!textarea || !activeSection.value) return;

      const start = textarea.selectionStart;
      const val = activeSection.value.content || "";

      activeSection.value.content = val.substring(0, start) + "\n" + prefix + val.substring(start);
      nextTick(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length + 1, start + prefix.length + 1);
      });
    }

    function insertCallout(type) {
      insertMarkdownPrefix(`> [!${type}]\n> `);
    }

    function insertTableSnippet() {
      const tableSnippet = `\n| Columna 1 | Columna 2 | Criterio |\n| :--- | :--- | :--- |\n| Valor A | Valor B | Cumple |\n| Valor C | Valor D | En revisión |\n`;
      insertMarkdownPrefix(tableSnippet);
    }

    const renderedBlocks = computed(() => {
      if (!activeSection.value || !activeSection.value.content) return [];
      return parseMarkdownToBlocks(activeSection.value.content);
    });

    function loadTemplate(tpl) {
      docTitle.value = tpl.name;
      sections.value = tpl.build();
      activeSectionId.value = sections.value[0]?.id;
      templatesOpen.value = false;
      store.notice(`Plantilla '${tpl.name}' cargada`, "fa-wand-magic-sparkles");
    }

    function compileToMarkdown() {
      return compileDocumentToMarkdown({
        docTitle: docTitle.value,
        headerText: headerText.value,
        footerText: footerText.value,
        showRunningHeader: showRunningHeader.value,
        flatSections: flatNumberedSections.value,
      });
    }

    function copyCompiledMarkdown() {
      const compiled = compileToMarkdown();
      navigator.clipboard.writeText(compiled).then(() => {
        store.notice("Markdown compilado copiado al portapapeles", "fa-clipboard-check");
      });
    }

    function applyDocumentToDescription() {
      const compiled = compileToMarkdown();
      emit("apply", compiled);
      emit("update:modelValue", false);
      store.notice("Documento Markdown insertado en la descripción", "fa-circle-check");
    }

    return {
      store,
      docTitle,
      headerText,
      footerText,
      pageNumberFormat,
      showRunningHeader,
      headerFooterSettingsOpen,
      templatesOpen,
      leftViewTab,
      markdownTextarea,
      sections,
      activeSectionId,
      activeSection,
      flatNumberedSections,
      activeSectionNumber,
      totalWordCount,
      estimatedPages,
      documentTemplates,
      selectSection,
      addRootSection,
      addSubSection,
      deleteSection,
      setSectionLevel,
      insertMarkdownWrapper,
      insertMarkdownPrefix,
      insertCallout,
      insertTableSnippet,
      renderedBlocks,
      loadTemplate,
      compileToMarkdown,
      copyCompiledMarkdown,
      applyDocumentToDescription
    };
  }
};
</script>

<style scoped>
.scrollbar-thin::-webkit-scrollbar {
  width: 5px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.4);
  border-radius: 9999px;
}
</style>
