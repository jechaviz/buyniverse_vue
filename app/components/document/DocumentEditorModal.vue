<template>
  <teleport to="body">
    <div
      v-if="modelValue"
      ref="modalRoot"
      class="fixed inset-0 z-[999999] flex flex-col w-screen h-screen max-w-[100vw] max-h-[100vh] bg-white dark:bg-slate-900 dark:text-slate-100 overflow-hidden m-0 p-0"
      style="position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 999999 !important;"
      role="dialog"
      aria-modal="true"
    >
      <!-- Top Global Action Bar & Metadata Ribbon -->
      <header class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/90 bg-slate-50/95 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-950/95 flex-none z-10">
        <div class="flex items-center gap-3 min-w-0">
          <span class="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white shadow-sm flex-none">
            <i class="fa-solid fa-file-lines text-sm"></i>
          </span>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="badge bg-brand-50 text-brand text-[10px] font-bold dark:bg-brand/20 dark:text-brand-300">
                {{ store.t("Editor Markdown Profesional") }}
              </span>
              <span class="text-xs text-slate-400">·</span>
              <span class="text-xs text-slate-500 dark:text-slate-400 font-mono">{{ sections.length }} {{ store.t("secciones") }}</span>
              <span class="text-xs text-slate-400">·</span>
              <span class="text-xs text-slate-500 dark:text-slate-400 font-mono">{{ totalWordCount }} {{ store.t("palabras") }}</span>
              <!-- Autosave status pill -->
              <span class="text-xs text-slate-400">·</span>
              <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <i class="fa-solid fa-circle-check text-[10px]" :class="isSaving ? 'animate-spin fa-spinner text-amber-500' : ''"></i>
                <span>{{ isSaving ? store.t("Guardando...") : (lastAutosavedAt ? store.t("Autoguardado ") + lastAutosavedAt : store.t("Autosalvado activo")) }}</span>
              </span>
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
              class="btn-muted text-xs py-1.5 px-3 font-semibold flex items-center gap-1.5 cursor-pointer"
              @click="templatesOpen = !templatesOpen"
            >
              <i class="fa-solid fa-wand-magic-sparkles text-brand text-xs"></i>
              <span>{{ store.t("Plantillas") }}</span>
              <i class="fa-solid fa-chevron-down text-[10px] text-slate-400"></i>
            </button>

            <!-- Floating templates dropdown -->
            <div
              v-if="templatesOpen"
              class="absolute right-0 top-full mt-1 w-72 z-50 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900 space-y-1"
            >
              <button
                v-for="tpl in documentTemplates"
                :key="tpl.id"
                type="button"
                class="flex w-full items-start gap-2.5 rounded-xl p-2.5 text-left text-xs transition hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                @click="loadTemplate(tpl)"
              >
                <i :class="tpl.icon" class="text-brand text-sm mt-0.5"></i>
                <div>
                  <div class="flex items-center gap-1.5">
                    <b class="text-slate-900 dark:text-white">{{ tpl.name }}</b>
                    <span v-if="tpl.isFormTemplate" class="badge bg-amber-100 text-amber-800 text-[9px] px-1 py-0 dark:bg-amber-900/50 dark:text-amber-300">Machote</span>
                  </div>
                  <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">{{ tpl.desc }}</p>
                </div>
              </button>
            </div>
          </div>

          <!-- Docs / Templates Repository Drawer Trigger -->
          <button
            type="button"
            class="btn-muted text-xs py-1.5 px-3 font-semibold flex items-center gap-1.5 cursor-pointer"
            :class="variableDrawerOpen ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/30' : ''"
            @click="variableDrawerOpen = !variableDrawerOpen"
          >
            <i class="fa-solid fa-sliders text-amber-600 text-xs"></i>
            <span>{{ store.t("Docs & Machote") }}</span>
          </button>

          <!-- Running Headers & Footers Settings Trigger -->
          <button
            type="button"
            class="btn-muted text-xs py-1.5 px-3 font-semibold flex items-center gap-1.5 cursor-pointer"
            @click="headerFooterSettingsOpen = !headerFooterSettingsOpen"
          >
            <i class="fa-solid fa-heading text-slate-500 text-xs"></i>
            <span class="hidden sm:inline">{{ store.t("Encabezado / Pie") }}</span>
          </button>

          <!-- Copy Markdown Button -->
          <button
            type="button"
            class="btn-muted text-xs py-1.5 px-3 font-semibold flex items-center gap-1.5 cursor-pointer"
            @click="copyCompiledMarkdown"
            :title="store.t('Copiar documento completo a portapapeles')"
          >
            <i class="fa-regular fa-copy text-xs"></i>
            <span class="hidden md:inline">{{ store.t("Copiar MD") }}</span>
          </button>

          <!-- Apply & Close Primary Button -->
          <button
            type="button"
            class="btn-brand text-xs py-1.5 px-4 font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
            @click="applyDocumentToDescription"
          >
            <i class="fa-solid fa-check text-xs"></i>
            <span>{{ store.t("Aplicar al Proyecto") }}</span>
          </button>

          <!-- Close Modal Cross -->
          <button
            type="button"
            class="grid h-8 w-8 place-items-center rounded-xl text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
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
          <input v-model="headerText" class="input text-xs py-1.5 px-2.5 w-full bg-white dark:bg-slate-800" :placeholder="store.t('Ej. RFC / ID de Proyecto / Confidencial')" />
        </div>
        <div>
          <label class="font-bold text-slate-700 dark:text-slate-300 block mb-1">
            <i class="fa-solid fa-shoe-prints mr-1 text-brand"></i>{{ store.t("Pie de Página Repetible") }}
          </label>
          <input v-model="footerText" class="input text-xs py-1.5 px-2.5 w-full bg-white dark:bg-slate-800" :placeholder="store.t('Ej. Confidencial · Buyniverse Escrow Protected')" />
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
          <button type="button" class="btn-muted text-xs py-1.5 px-3 h-[34px] cursor-pointer" @click="headerFooterSettingsOpen = false">
            {{ store.t("Listo") }}
          </button>
        </div>
      </div>

      <!-- Main Tri-Pane Workspace Body -->
      <div class="flex flex-1 min-h-0 overflow-hidden relative">
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

        <!-- CENTER PANEL: Focused Section Markdown & Inline Style Editor -->
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
          @insert-variable="insertVariablePrompt"
          @toggle-variable-drawer="variableDrawerOpen = !variableDrawerOpen"
          @add-root-section="addRootSection"
        />

        <!-- RIGHT PANEL: Configurable Variables Drawer & Docs Menu -->
        <DocumentVariableDrawer
          v-if="variableDrawerOpen"
          :store="store"
          :sections="sections"
          :doc-title="docTitle"
          @close="variableDrawerOpen = false"
          @apply-variables="applyVariablesToSections"
          @load-saved-doc="loadSavedDoc"
          @load-template-nda="loadTemplateById('nda_b2b')"
        />
      </div>
    </div>
  </teleport>
</template>

<script>
const { inject, ref, computed, watch, nextTick, onMounted, onBeforeUnmount, defineAsyncComponent } = Vue;
const load = (p) => defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(p, window.sfcOptions));
const DocumentSidebarPanel = load("./app/components/document/DocumentSidebarPanel.vue?v=1");
const DocumentContentEditor = load("./app/components/document/DocumentContentEditor.vue?v=1");
const DocumentVariableDrawer = load("./app/components/document/DocumentVariableDrawer.vue?v=1");

const documentTemplates = (window.DocumentTemplates && window.DocumentTemplates.documentTemplates) || [];
const parseMarkdownToBlocks = (window.DocumentParser && window.DocumentParser.parseMarkdownToBlocks) || function () { return []; };
const compileDocumentToMarkdown = (window.DocumentParser && window.DocumentParser.compileDocumentToMarkdown) || function () { return ""; };

const AUTOSAVE_KEY = "buyniverse_doc_editor_autosave";

export default {
  name: "DocumentEditorModal",
  components: {
    DocumentSidebarPanel,
    DocumentContentEditor,
    DocumentVariableDrawer,
  },
  props: {
    modelValue: { type: Boolean, default: false },
    initialMarkdown: { type: String, default: "" },
  },
  emits: ["update:modelValue", "apply"],
  setup(props, { emit }) {
    const store = inject("store");
    const modalRoot = ref(null);
    const docTitle = ref("Pliego de Términos y Condiciones Técnicas");
    const headerText = ref("BUY-2026-RFP · Especificación de Compra");
    const footerText = ref("Confidencial · Buyniverse Escrow Protected");
    const pageNumberFormat = ref("Page X of Y");
    const showRunningHeader = ref(true);
    const headerFooterSettingsOpen = ref(false);
    const templatesOpen = ref(false);
    const variableDrawerOpen = ref(false);
    const leftViewTab = ref("thumbnails");
    const markdownTextarea = ref(null);
    const isSaving = ref(false);
    const lastAutosavedAt = ref("");

    const sections = ref([
      { id: "sec-1", title: "Objetivo y Alcance del Proyecto", level: 1, pageBreakBefore: false, content: "El presente documento establece los términos técnicos y comerciales para la adjudicación mediante subasta inversa BAFO.\n\n- **Objetivo Principal:** Implementación de solución escalable para {{NOMBRE_PROYECTO:Portal B2B}}.\n- **Modalidad de Pago:** Custodia en fideicomiso (Escrow) liberada contra hitos aprobados.\n\n> [!NOTE]\n> Todos los postores deben cumplir con los requisitos de homologación y scoring SRM mínimo de 80 puntos." },
      { id: "sec-2", title: "Requerimientos Técnicos y Entregables", level: 2, pageBreakBefore: false, content: "Los entregables deberán satisfacer la siguiente matriz de aceptación:\n\n| Hito | Entregable Clave | Plazo | % Fondo Escrow |\n| :--- | :--- | :--- | :--- |\n| Hito 1 | Diseño de Arquitectura & Prototipo UX | {{PLAZO_HITO_1:15 días}} | 30% |\n| Hito 2 | Implementación Core & APIs | {{PLAZO_HITO_2:30 días}} | 40% |\n| Hito 3 | Pruebas de Calidad, QA & Despliegue | {{PLAZO_HITO_3:15 días}} | 30% |" },
      { id: "sec-3", title: "Criterios de Seguridad y Cumplimiento", level: 3, pageBreakBefore: false, content: "- Cumplimiento con estándares ISO-27001 y cifrado en tránsito TLS 1.3.\n- Validación fiscal automática mediante conciliación 3-Way Match.\n\n> [!IMPORTANT]\n> Cualquier desviación no autorizada en los plazos pactados aplicará penalización del {{PORCENTAJE_PENALIZACION:2%}} semanal sobre el monto del hito." },
      { id: "sec-4", title: "Mecanismo de Subasta Inversa BAFO y Ganancia Compartida", level: 1, pageBreakBefore: true, content: "La adjudicación se definirá en subasta inversa en tiempo real.\n\n1. El postor presentará su cotización inicial de referencia.\n2. Se abrirá una ventana de 60 minutos para colocación de contraofertas dinámicas.\n3. La comisión de éxito Gain-Share (40% base o 25% por gran volumen) se liquidará exclusivamente sobre el ahorro neto comprobado." }
    ]);

    // Force appending directly to document.body on open to guarantee full-viewport escape
    watch(
      () => props.modelValue,
      (open) => {
        if (open) {
          document.body.style.overflow = "hidden";
          nextTick(() => {
            if (modalRoot.value && modalRoot.value.parentNode !== document.body) {
              document.body.appendChild(modalRoot.value);
            }
          });
        } else {
          document.body.style.overflow = "";
        }
      },
      { immediate: true }
    );

    function handleKeydown(e) {
      if (e.key === "Escape" && props.modelValue) {
        emit("update:modelValue", false);
      }
    }

    onMounted(() => {
      window.addEventListener("keydown", handleKeydown);
      // Restore autosaved draft if exists and matches
      try {
        const raw = localStorage.getItem(AUTOSAVE_KEY);
        if (raw) {
          const draft = JSON.parse(raw);
          if (draft && draft.sections && draft.sections.length > 0) {
            sections.value = draft.sections;
            if (draft.docTitle) docTitle.value = draft.docTitle;
            if (draft.headerText) headerText.value = draft.headerText;
            if (draft.footerText) footerText.value = draft.footerText;
            lastAutosavedAt.value = draft.savedAt || "";
          }
        }
      } catch (e) {}
    });

    onBeforeUnmount(() => {
      window.removeEventListener("keydown", handleKeydown);
      document.body.style.overflow = "";
      if (modalRoot.value && modalRoot.value.parentNode === document.body) {
        document.body.removeChild(modalRoot.value);
      }
    });

    // Auto-save logic with debounce
    let autosaveTimer = null;
    function triggerAutosave() {
      isSaving.value = true;
      if (autosaveTimer) clearTimeout(autosaveTimer);
      autosaveTimer = setTimeout(() => {
        try {
          const now = new Date();
          const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          const payload = {
            docTitle: docTitle.value,
            headerText: headerText.value,
            footerText: footerText.value,
            sections: sections.value,
            savedAt: timeStr,
          };
          localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(payload));
          lastAutosavedAt.value = timeStr;
          // Synchronously emit compiled markdown to project
          emit("apply", compileToMarkdown());
        } catch (e) {}
        isSaving.value = false;
      }, 400);
    }

    watch([docTitle, headerText, footerText, sections], () => triggerAutosave(), { deep: true });

    const activeSectionId = ref("sec-1");
    const activeSection = computed(() => sections.value.find((s) => s.id === activeSectionId.value) || sections.value[0] || null);

    const flatNumberedSections = computed(() => {
      let l1 = 0, l2 = 0, l3 = 0;
      return sections.value.map((sec) => {
        if (sec.level === 1) { l1++; l2 = 0; l3 = 0; return { ...sec, numberStr: `${l1}.` }; }
        if (sec.level === 2) { l2++; l3 = 0; return { ...sec, numberStr: `${l1}.${l2}` }; }
        l3++; return { ...sec, numberStr: `${l1}.${l2}.${l3}` };
      });
    });

    const activeSectionNumber = computed(() => {
      if (!activeSection.value) return "1.";
      const match = flatNumberedSections.value.find((s) => s.id === activeSection.value.id);
      return match ? match.numberStr : "1.";
    });

    const totalWordCount = computed(() => sections.value.reduce((sum, sec) => sum + (sec.content || "").trim().split(/\s+/).filter(Boolean).length, 0));

    const estimatedPages = computed(() => {
      const pages = [];
      let currentPage = { sections: [] };
      sections.value.forEach((sec, idx) => {
        if (sec.pageBreakBefore && currentPage.sections.length > 0) {
          pages.push(currentPage);
          currentPage = { sections: [sec] };
        } else {
          currentPage.sections.push(sec);
          const words = currentPage.sections.reduce((w, s) => w + (s.content || "").split(/\s+/).length, 0);
          if (words > 280 && idx < sections.value.length - 1) {
            pages.push(currentPage);
            currentPage = { sections: [] };
          }
        }
      });
      if (currentPage.sections.length > 0) pages.push(currentPage);
      return pages.length ? pages : [{ sections: sections.value }];
    });

    function selectSection(sec) { if (sec) activeSectionId.value = sec.id; }
    function addRootSection() {
      const newId = "sec-" + Date.now();
      sections.value.push({ id: newId, title: "Nueva Sección", level: 1, pageBreakBefore: false, content: "Descripción de los requerimientos y condiciones." });
      activeSectionId.value = newId;
    }
    function addSubSection(parentSec) {
      const newId = "sec-" + Date.now();
      const parentIdx = sections.value.findIndex((s) => s.id === parentSec.id);
      sections.value.splice(parentIdx + 1, 0, { id: newId, title: "Nueva Subsección", level: Math.min(parentSec.level + 1, 3), pageBreakBefore: false, content: "" });
      activeSectionId.value = newId;
    }
    function deleteSection(id) {
      if (sections.value.length <= 1) { store.notice("El documento debe tener al menos una sección", "fa-triangle-exclamation"); return; }
      sections.value = sections.value.filter((s) => s.id !== id);
      if (activeSectionId.value === id) activeSectionId.value = sections.value[0]?.id;
    }
    function setSectionLevel(level) { if (activeSection.value) activeSection.value.level = level; }

    function insertMarkdownWrapper(prefix, suffix, placeholder) {
      const textarea = markdownTextarea.value;
      if (!textarea || !activeSection.value) return;
      const start = textarea.selectionStart, end = textarea.selectionEnd, val = activeSection.value.content || "";
      const selected = val.substring(start, end) || placeholder;
      activeSection.value.content = val.substring(0, start) + prefix + selected + suffix + val.substring(end);
      nextTick(() => { textarea.focus(); textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length); });
    }

    function insertMarkdownPrefix(prefix) {
      const textarea = markdownTextarea.value;
      if (!textarea || !activeSection.value) return;
      const start = textarea.selectionStart, val = activeSection.value.content || "";
      activeSection.value.content = val.substring(0, start) + "\n" + prefix + val.substring(start);
      nextTick(() => { textarea.focus(); textarea.setSelectionRange(start + prefix.length + 1, start + prefix.length + 1); });
    }

    function insertCallout(type) { insertMarkdownPrefix(`> [!${type}]\n> `); }
    function insertTableSnippet() { insertMarkdownPrefix(`\n| Columna 1 | Columna 2 | Criterio |\n| :--- | :--- | :--- |\n| Valor A | Valor B | Cumple |\n| Valor C | Valor D | En revisión |\n`); }

    function insertVariablePrompt() {
      const textarea = markdownTextarea.value;
      if (!textarea || !activeSection.value) return;
      const start = textarea.selectionStart, end = textarea.selectionEnd, val = activeSection.value.content || "";
      const selected = val.substring(start, end);
      const varName = prompt("Ingresa el identificador del campo configurable (ej. RAZON_SOCIAL, FECHA_ENTREGA):", selected ? selected.toUpperCase().replace(/\s+/g, "_") : "CAMPO_NUEVO");
      if (!varName) return;
      const cleanKey = varName.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "_");
      const defaultVal = selected || "Valor";
      activeSection.value.content = val.substring(0, start) + `{{${cleanKey}:${defaultVal}}}` + val.substring(end);
      store.notice(`Campo '{{${cleanKey}}}' marcado como configurable`, "fa-tag");
      variableDrawerOpen.value = true;
    }

    function applyVariablesToSections(valuesMap) {
      const parser = window.DocumentParser;
      if (!parser || !parser.replaceVariablesInText) return;
      sections.value.forEach((sec) => {
        sec.title = parser.replaceVariablesInText(sec.title, valuesMap);
        sec.content = parser.replaceVariablesInText(sec.content, valuesMap);
      });
      store.notice("Variables sustituidas por sus valores definitivos", "fa-check-double");
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
      if (tpl.isFormTemplate) variableDrawerOpen.value = true;
      store.notice(`Plantilla '${tpl.name}' cargada`, "fa-wand-magic-sparkles");
    }

    function loadTemplateById(id) {
      const found = documentTemplates.find((t) => t.id === id);
      if (found) loadTemplate(found);
    }

    function loadSavedDoc(doc) {
      if (!doc) return;
      docTitle.value = doc.title || doc.name;
      sections.value = JSON.parse(JSON.stringify(doc.sections || []));
      activeSectionId.value = sections.value[0]?.id;
      store.notice(`Plantilla '${doc.name}' cargada desde Mis Documentos`, "fa-folder-open");
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
      navigator.clipboard.writeText(compiled).then(() => store.notice("Markdown compilado copiado al portapapeles", "fa-clipboard-check"));
    }

    function applyDocumentToDescription() {
      const compiled = compileToMarkdown();
      emit("apply", compiled);
      emit("update:modelValue", false);
      store.notice("Documento Markdown insertado en la descripción", "fa-circle-check");
    }

    return {
      store,
      modalRoot,
      docTitle,
      headerText,
      footerText,
      pageNumberFormat,
      showRunningHeader,
      headerFooterSettingsOpen,
      templatesOpen,
      variableDrawerOpen,
      leftViewTab,
      markdownTextarea,
      isSaving,
      lastAutosavedAt,
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
      insertVariablePrompt,
      applyVariablesToSections,
      renderedBlocks,
      loadTemplate,
      loadTemplateById,
      loadSavedDoc,
      compileToMarkdown,
      copyCompiledMarkdown,
      applyDocumentToDescription,
    };
  },
};
</script>

<style scoped>
.scrollbar-thin::-webkit-scrollbar { width: 5px; }
.scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
.scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.4); border-radius: 9999px; }
</style>
