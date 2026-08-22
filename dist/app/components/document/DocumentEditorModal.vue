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
      <!-- Compact document identity and global actions. Section-specific controls live in the editor bar. -->
      <header class="flex items-center gap-3 border-b border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 flex-none z-10 shadow-lg">
        <div class="flex min-w-0 flex-1 items-center gap-2.5">
          <span class="grid h-8 w-8 place-items-center rounded-xl bg-brand text-white shadow-lg shadow-brand/20 flex-none">
            <i class="fa-solid fa-file-lines text-sm"></i>
          </span>
          <div class="min-w-0 flex-1">
            <input
              v-model.trim="docTitle"
              class="min-w-0 w-full max-w-xl bg-transparent py-0.5 font-head text-sm font-800 text-white border-b border-transparent transition placeholder:text-slate-500 hover:border-slate-600 focus:border-brand focus:outline-none sm:text-base"
              :placeholder="store.t('Título del Pliego o Especificación de Compra')"
              :aria-label="store.t('Título del Pliego o Especificación de Compra')"
            />
            <div class="editor-meta flex min-w-max items-center gap-1.5 text-[9px] text-slate-500">
              <span class="font-mono">{{ sections.length }} {{ store.t("secciones") }} · {{ totalWordCount }} {{ store.t("palabras") }}</span>
              <span class="text-slate-700">•</span>
              <span v-if="activeSection" class="max-w-[20rem] truncate">{{ activeSectionNumber || '—' }} {{ activeSection.title || store.t('Sección Sin Título') }}</span>
            </div>
          </div>
          <div class="editor-meta flex min-w-max items-center gap-1.5 text-[10px] text-slate-400">
            <span class="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
              <i class="fa-solid fa-circle-check text-[9px]" :class="isSaving ? 'animate-spin fa-spinner text-amber-500' : ''"></i>
              <span>{{ isSaving ? store.t("Guardando...") : (lastAutosavedAt ? store.t("Autoguardado ") + lastAutosavedAt : store.t("Autosalvado activo")) }}</span>
            </span>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-1.5">
          <!-- Templates are deliberately available from the library drawer: no clipped duplicate dropdown. -->
          <button
            type="button"
            class="h-8 rounded-lg border border-white/10 px-2.5 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition hover:bg-white/10 hover:text-white cursor-pointer"
            :class="libraryOpen ? 'bg-brand/20 text-white border-brand/35' : ''"
            :title="store.t('Document library')"
            :aria-label="store.t('Document library')"
            :aria-expanded="libraryOpen"
            @click="libraryOpen = !libraryOpen; if (libraryOpen) variableDrawerOpen = false"
          >
            <i class="fa-solid fa-books text-brand text-xs"></i>
            <span class="editor-action-label">{{ store.t("Library") }}</span>
            <span v-if="libraryDocuments.length" class="rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] dark:bg-slate-700">{{ libraryDocuments.length }}</span>
          </button>

          <button
            type="button"
            class="grid h-8 w-8 place-items-center rounded-lg text-xs text-slate-400 transition hover:bg-white/10 hover:text-white cursor-pointer"
            @click="copyCompiledMarkdown"
            :title="store.t('Copiar documento completo a portapapeles')"
            :aria-label="store.t('Copiar documento completo a portapapeles')"
          >
            <i class="fa-regular fa-copy text-xs"></i>
          </button>

          <button
            type="button"
            class="btn-brand h-8 px-3 text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
            :title="store.t('Aplicar al Proyecto')"
            :aria-label="store.t('Aplicar al Proyecto')"
            @click="applyDocumentToDescription"
          >
            <i class="fa-solid fa-check text-xs"></i>
            <span class="editor-action-label">{{ store.t("Apply") }}</span>
          </button>

          <button
            type="button"
            class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
            @click="$emit('update:modelValue', false)"
            aria-label="Cerrar"
          >
            <i class="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>
      </header>

      <!-- Running Header / Footer Configuration Modal Dialog -->
      <DocumentHeaderFooterModal
        v-if="headerFooterSettingsOpen"
        :store="store"
        :active-section="activeSection"
        :doc-title="docTitle"
        :default-header-text="headerText"
        :default-footer-text="footerText"
        :page-number-format="pageNumberFormat"
        :show-running-header="showRunningHeader"
        :watermark-text="watermarkText"
        :suppress-on-cover="suppressOnCover"
        @close="headerFooterSettingsOpen = false"
        @update:section-chrome="updateActiveSectionChrome"
        @apply-to-all="applyChromeToAll"
        @update:page-number-format="pageNumberFormat = $event"
        @update:watermark-text="watermarkText = $event"
        @update:suppress-on-cover="suppressOnCover = $event"
      />

      <TextInputDialog
        :open="variableDialogOpen"
        :title="store.t('Create variable field')"
        :description="store.t('The selected text becomes a reusable field in this document.')"
        :label="store.t('Field identifier')"
        :initial-value="variableDialogValue"
        :placeholder="store.t('e.g. DELIVERY_DATE')"
        :hint="store.t('Use letters, numbers, dashes or underscores.')"
        :confirm-label="store.t('Create field')"
        icon="fa-tag"
        :max-length="64"
        :z-index="1000001"
        @close="variableDialogOpen = false"
        @submit="insertVariableByName"
      />

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
          :doc-title="docTitle"
          :show-running-header="showRunningHeader"
          :suppress-on-cover="suppressOnCover"
          :can-add-cover="!hasCover"
          :can-add-section-end="!hasSectionEnd"
          :resolve-section-chrome="sectionChrome"
          @update:left-view-tab="leftViewTab = $event"
          @update:active-section-id="activeSectionId = $event"
          @add-root-section="addRootSection"
          @add-sub-section="addSubSection"
          @add-cover="addCover"
          @add-section-end="addSectionEnd"
          @delete-section="deleteSection"
          @select-section="selectSection"
        />

        <!-- CENTER PANEL: Focused Section Markdown & Cover/End Editor -->
        <DocumentContentEditor
          :store="store"
          :active-section="activeSection"
          :active-section-number="activeSectionNumber"
          :rendered-blocks="renderedBlocks"
          :section-chrome="sectionChrome(activeSection)"
          :suppress-page-chrome="shouldSuppressChrome(activeSection)"
          @set-level="setSectionLevel"
          @insert-wrapper="insertMarkdownWrapper"
          @insert-table="insertTableSnippet"
          @insert-prefix="insertMarkdownPrefix"
          @insert-callout="insertCallout"
          @insert-variable="insertVariablePrompt"
          @toggle-variable-drawer="variableDrawerOpen = !variableDrawerOpen; if (variableDrawerOpen) libraryOpen = false"
          @open-header-footer-modal="headerFooterSettingsOpen = true"
          @add-root-section="addRootSection"
          @add-cover="addCover"
          @textarea-ready="markdownTextarea = $event"
        />

        <!-- RIGHT PANEL: one compact contextual drawer at a time. -->
        <DocumentVariableDrawer
          v-if="variableDrawerOpen && !libraryOpen"
          :store="store"
          :sections="sections"
          :doc-title="docTitle"
          @close="variableDrawerOpen = false"
          @apply-variables="applyVariablesToSections"
          @load-template-nda="loadTemplateById('nda_b2b')"
        />
        <DocumentLibraryDrawer
          v-else-if="libraryOpen"
          :store="store"
          :documents="libraryDocuments"
          :templates="documentTemplates"
          :doc-title="docTitle"
          :sections="sections"
          @close="libraryOpen = false"
          @load-template="loadTemplate"
          @load-document="loadLibraryDocument"
          @save-current="saveLibraryDocument"
          @save-template-copy="saveTemplateCopy"
          @delete-document="deleteLibraryDocument"
          @new-document="newBlankDocument"
        />
      </div>
    </div>
  </teleport>
</template>

<script>
const { inject, ref, computed, watch, nextTick, onMounted, onBeforeUnmount, defineAsyncComponent } = Vue;
const load = (p) => defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(p, window.sfcOptions));
const DocumentSidebarPanel = load("./app/components/document/DocumentSidebarPanel.vue?v=6");
const DocumentContentEditor = load("./app/components/document/DocumentContentEditor.vue?v=8");
const DocumentVariableDrawer = load("./app/components/document/DocumentVariableDrawer.vue?v=3");
const DocumentHeaderFooterModal = load("./app/components/document/DocumentHeaderFooterModal.vue?v=2");
const DocumentLibraryDrawer = load("./app/components/document/DocumentLibraryDrawer.vue?v=4");
const TextInputDialog = load("./app/components/TextInputDialog.vue?v=3");

const documentTemplates = (window.DocumentTemplates && window.DocumentTemplates.documentTemplates) || [];
const parseMarkdownToBlocks = (window.DocumentParser && window.DocumentParser.parseMarkdownToBlocks) || function () { return []; };
const parseMarkdownToDocument = (window.DocumentParser && window.DocumentParser.parseMarkdownToDocument) || function () { return null; };
const compileDocumentToMarkdown = (window.DocumentParser && window.DocumentParser.compileDocumentToMarkdown) || function () { return ""; };
const documentLibrary = window.DocumentLibrary || null;

export default {
  name: "DocumentEditorModal",
  components: { DocumentSidebarPanel, DocumentContentEditor, DocumentVariableDrawer, DocumentHeaderFooterModal, DocumentLibraryDrawer, TextInputDialog },
  props: { modelValue: { type: Boolean, default: false }, initialMarkdown: { type: String, default: "" } },
  emits: ["update:modelValue", "apply"],
  setup(props, { emit }) {
    const store = inject("store");
    const blankSection = () => ({ id: "sec-" + Date.now(), type: "standard", title: store.t("Overview"), level: 1, pageBreakBefore: false, content: "" });
    const modalRoot = ref(null), docTitle = ref(store.t("Untitled document")), headerText = ref(""), footerText = ref("");
    const pageNumberFormat = ref("Page X of Y"), watermarkText = ref(""), suppressOnCover = ref(true), showRunningHeader = ref(true);
    const headerFooterSettingsOpen = ref(false), variableDrawerOpen = ref(false), libraryOpen = ref(false), leftViewTab = ref("thumbnails"), markdownTextarea = ref(null), isSaving = ref(false), lastAutosavedAt = ref("");
    const variableDialogOpen = ref(false), variableDialogValue = ref(""), pendingVariable = ref(null), libraryDocuments = ref([]), loadedIdentity = ref("");
    const sections = ref([blankSection()]), activeSectionId = ref(sections.value[0].id);

    const currentUserId = () => store.currentUser?.value?.id || "anonymous";
    const draftIdentity = () => documentLibrary?.fingerprint(props.initialMarkdown || "new-document") || String((props.initialMarkdown || "").length);
    const snapshot = (name) => ({
      name: name || docTitle.value || "Untitled document", title: docTitle.value || "Untitled document",
      headerText: headerText.value, footerText: footerText.value, pageNumberFormat: pageNumberFormat.value,
      watermarkText: watermarkText.value, suppressOnCover: suppressOnCover.value, showRunningHeader: showRunningHeader.value,
      sections: JSON.parse(JSON.stringify(sections.value)),
    });
    const refreshLibrary = () => { libraryDocuments.value = documentLibrary ? documentLibrary.list(currentUserId()) : []; };

    function restoreDocument(doc) {
      if (!doc?.sections?.length) return false;
      docTitle.value = doc.title || doc.name || "Untitled document";
      headerText.value = doc.headerText || "";
      footerText.value = doc.footerText || "";
      pageNumberFormat.value = doc.pageNumberFormat || "Page X of Y";
      watermarkText.value = doc.watermarkText || "";
      suppressOnCover.value = doc.suppressOnCover !== false;
      showRunningHeader.value = doc.showRunningHeader !== false;
      sections.value = JSON.parse(JSON.stringify(doc.sections));
      activeSectionId.value = sections.value[0]?.id || "";
      return true;
    }

    function loadIncomingDocument() {
      const identity = draftIdentity();
      if (identity === loadedIdentity.value) return;
      const draft = documentLibrary?.loadDraft(currentUserId(), identity);
      if (draft && restoreDocument(draft)) {
        lastAutosavedAt.value = store.date ? store.date(draft.updatedAt) : draft.updatedAt;
      } else if (String(props.initialMarkdown || "").trim()) {
        const parsed = parseMarkdownToDocument(props.initialMarkdown, docTitle.value);
        if (parsed?.sections?.length) restoreDocument({ ...snapshot(parsed.title), title: parsed.title, sections: parsed.sections });
      }
      loadedIdentity.value = identity;
    }

    watch(() => props.modelValue, (open) => {
      if (open) {
        document.body.style.overflow = "hidden";
        nextTick(() => { if (modalRoot.value && modalRoot.value.parentNode !== document.body) document.body.appendChild(modalRoot.value); });
        refreshLibrary();
        loadIncomingDocument();
      } else { document.body.style.overflow = ""; }
    }, { immediate: true });

    function handleKeydown(e) { if (e.key === "Escape" && props.modelValue) emit("update:modelValue", false); }
    onMounted(() => window.addEventListener("keydown", handleKeydown));
    onBeforeUnmount(() => {
      window.removeEventListener("keydown", handleKeydown);
      if (autosaveTimer) clearTimeout(autosaveTimer);
      document.body.style.overflow = "";
      if (modalRoot.value && modalRoot.value.parentNode === document.body) document.body.removeChild(modalRoot.value);
    });

    let autosaveTimer = null;
    function triggerAutosave() {
      isSaving.value = true;
      if (autosaveTimer) clearTimeout(autosaveTimer);
      autosaveTimer = setTimeout(() => {
        try {
          const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          documentLibrary?.saveDraft(currentUserId(), draftIdentity(), snapshot());
          lastAutosavedAt.value = timeStr;
        } catch (e) {}
        isSaving.value = false;
      }, 400);
    }

    watch([docTitle, headerText, footerText, sections], () => triggerAutosave(), { deep: true });

    const activeSection = computed(() => sections.value.find((s) => s.id === activeSectionId.value) || sections.value[0] || null);
    const hasCover = computed(() => sections.value.some((section) => section.type === "cover"));
    const hasSectionEnd = computed(() => sections.value.some((section) => section.type === "section_end"));
    function interpolateChrome(text, section) {
      const sectionTitle = section?.title || docTitle.value || store.t("Untitled section");
      return String(text || "").replace(/\{\{sectionTitle\}\}/g, sectionTitle).replace(/\{\{documentTitle\}\}/g, docTitle.value || store.t("Untitled document"));
    }
    function sectionChrome(section) {
      const local = section?.headerFooter || {};
      const headerMode = ["section_title", "document_title", "custom"].includes(local.headerMode) ? local.headerMode : "section_title";
      const footerMode = ["section_title", "document_title", "custom"].includes(local.footerMode) ? local.footerMode : "custom";
      const line = (mode, custom, fallback) => {
        if (mode === "section_title") return section?.title || docTitle.value || store.t("Untitled section");
        if (mode === "document_title") return docTitle.value || store.t("Untitled document");
        return interpolateChrome(custom || fallback, section);
      };
      return {
        headerEnabled: local.headerEnabled !== false && showRunningHeader.value !== false,
        headerText: line(headerMode, local.headerText, headerText.value || docTitle.value),
        footerEnabled: local.footerEnabled !== false,
        footerText: line(footerMode, local.footerText, footerText.value || store.t("Confidential")),
      };
    }
    const shouldSuppressChrome = (section) => Boolean(suppressOnCover.value && section?.type === "cover");
    function updateActiveSectionChrome(chrome) { if (activeSection.value) activeSection.value.headerFooter = { ...chrome }; }
    function applyChromeToAll(chrome) {
      const copy = JSON.parse(JSON.stringify(chrome || {}));
      sections.value.forEach((section) => { section.headerFooter = { ...copy }; });
      store.notice(store.t("Section header and footer format applied to all sections"), "fa-arrows-rotate");
    }

    const flatNumberedSections = computed(() => {
      let l1 = 0, l2 = 0, l3 = 0;
      return sections.value.map((sec) => {
        if (sec.type === "cover" || sec.type === "section_end") return { ...sec, numberStr: "" };
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

    const totalWordCount = computed(() => sections.value.reduce((sum, sec) => sum + ((sec.content || "") + " " + (sec.title || "")).trim().split(/\s+/).filter(Boolean).length, 0));

    const estimatedPages = computed(() => {
      const pages = [];
      let currentPage = { sections: [] };
      sections.value.forEach((sec, idx) => {
        if ((sec.pageBreakBefore || sec.type === "cover" || sec.type === "section_end") && currentPage.sections.length > 0) {
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
      sections.value.push({ id: newId, type: "standard", title: "Nueva Sección", level: 1, pageBreakBefore: false, content: "Descripción de los requerimientos y condiciones." });
      activeSectionId.value = newId;
    }
    function addCover() {
      const existing = sections.value.find((section) => section.type === "cover");
      if (existing) {
        activeSectionId.value = existing.id;
        store.notice(store.t("Only one cover is allowed per document."), "fa-file-shield");
        return;
      }
      const newId = "sec-cov-" + Date.now();
      sections.value.unshift({ id: newId, type: "cover", alignVertical: "center", title: "PORTADA DE SECCIÓN / PLIEGO", subtitle: "Documento Protegido · Buyniverse", content: "Resumen y objetivo formal del documento.", legalDisclaimer: "Información confidencial sujeta a secreto industrial.", versionText: `v1.0 · ${new Date().toLocaleDateString()}` });
      activeSectionId.value = newId;
    }
    function addSectionEnd() {
      const existing = sections.value.find((section) => section.type === "section_end");
      if (existing) {
        activeSectionId.value = existing.id;
        store.notice(store.t("Only one section end is allowed per document."), "fa-signature");
        return;
      }
      const newId = "sec-end-" + Date.now();
      sections.value.push({ id: newId, type: "section_end", alignVertical: "bottom", title: "FIN DE SECCIÓN & CONSTANCIA DE FIRMAS", content: "Las partes manifiestan su conformidad con los acuerdos técnicos.", showSignatures: true });
      activeSectionId.value = newId;
    }
    function addSubSection(parentSec) {
      const newId = "sec-" + Date.now(), parentIdx = sections.value.findIndex((s) => s.id === parentSec.id);
      sections.value.splice(parentIdx + 1, 0, { id: newId, type: "standard", title: "Nueva Subsección", level: Math.min((parentSec.level || 1) + 1, 3), pageBreakBefore: false, content: "" });
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
    function insertTableSnippet() { insertMarkdownPrefix(`\n| Columna 1 | Columna 2 | Criterio |\n| :--- | :--- | :--- |\n| Valor A | Valor B | Cumple |\n`); }
    function insertVariablePrompt() {
      const textarea = markdownTextarea.value;
      if (!textarea || !activeSection.value) return;
      const start = textarea.selectionStart, end = textarea.selectionEnd, val = activeSection.value.content || "";
      const selected = val.substring(start, end);
      pendingVariable.value = { start, end, selected, value: val };
      variableDialogValue.value = selected ? selected.toUpperCase().replace(/\s+/g, "_") : "FIELD_NAME";
      variableDialogOpen.value = true;
    }
    function insertVariableByName(name) {
      const pending = pendingVariable.value;
      if (!pending || !activeSection.value) return;
      const cleanKey = String(name || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "_").slice(0, 64);
      if (!cleanKey) return;
      activeSection.value.content = pending.value.substring(0, pending.start) + `{{${cleanKey}:${pending.selected || "Value"}}}` + pending.value.substring(pending.end);
      variableDialogOpen.value = false;
      pendingVariable.value = null;
      variableDrawerOpen.value = true;
      libraryOpen.value = false;
      store.notice(store.t(`Field '{{${cleanKey}}}' is ready to fill`), "fa-tag");
    }
    function applyVariablesToSections(valuesMap) {
      const parser = window.DocumentParser;
      if (!parser || !parser.replaceVariablesInText) return;
      sections.value.forEach((sec) => {
        sec.title = parser.replaceVariablesInText(sec.title, valuesMap);
        sec.content = parser.replaceVariablesInText(sec.content, valuesMap);
        if (sec.subtitle) sec.subtitle = parser.replaceVariablesInText(sec.subtitle, valuesMap);
        if (sec.legalDisclaimer) sec.legalDisclaimer = parser.replaceVariablesInText(sec.legalDisclaimer, valuesMap);
      });
      store.notice("Variables sustituidas por sus valores definitivos", "fa-check-double");
    }

    const renderedBlocks = computed(() => (!activeSection.value || !activeSection.value.content) ? [] : parseMarkdownToBlocks(activeSection.value.content));

    function loadTemplate(tpl) {
      if (!tpl?.build) return;
      docTitle.value = tpl.name;
      sections.value = tpl.build();
      activeSectionId.value = sections.value[0]?.id;
      libraryOpen.value = false;
      if (tpl.isFormTemplate) variableDrawerOpen.value = true;
      store.notice(`Plantilla '${tpl.name}' cargada`, "fa-wand-magic-sparkles");
    }
    function loadTemplateById(id) {
      const found = documentTemplates.find((t) => t.id === id);
      if (found) loadTemplate(found);
    }
    function loadLibraryDocument(doc) {
      if (!restoreDocument(doc)) return;
      libraryOpen.value = false;
      store.notice(store.t(`Reusable copy '${doc.name}' loaded`), "fa-folder-open");
    }
    function saveLibraryDocument(meta) {
      const saved = documentLibrary?.save(currentUserId(), { ...snapshot(meta?.name), name: meta?.name, tags: meta?.tags || [] });
      if (!saved) return store.notice(store.t("Document could not be saved locally"), "fa-triangle-exclamation");
      refreshLibrary();
      store.notice(store.t("Reusable document saved to your local library"), "fa-bookmark");
    }
    function saveTemplateCopy(template) {
      if (!template?.build) return;
      const saved = documentLibrary?.save(currentUserId(), {
        name: `${template.name} · copy`, title: template.name, tags: ["starter"], sections: template.build(), source: "template",
      });
      if (!saved) return store.notice(store.t("Template copy could not be saved"), "fa-triangle-exclamation");
      refreshLibrary();
      store.notice(store.t("Reusable template copy saved"), "fa-bookmark");
    }
    async function deleteLibraryDocument(id) {
      const allowed = await store.confirm({
        title: store.t("Delete reusable document?"), message: store.t("This removes only your local library copy. Project descriptions are not changed."),
        confirmText: store.t("Delete"), danger: true,
      });
      if (!allowed || !documentLibrary?.remove(currentUserId(), id)) return;
      refreshLibrary();
      store.notice(store.t("Reusable document deleted"), "fa-trash-can");
    }
    function newBlankDocument() {
      docTitle.value = store.t("Untitled document");
      sections.value = [blankSection()];
      activeSectionId.value = sections.value[0].id;
      libraryOpen.value = false;
      store.notice(store.t("New blank document created"), "fa-file-circle-plus");
    }
    function compileToMarkdown() {
      return compileDocumentToMarkdown({ docTitle: docTitle.value, headerText: headerText.value, footerText: footerText.value, showRunningHeader: showRunningHeader.value, flatSections: flatNumberedSections.value });
    }
    function copyCompiledMarkdown() {
      navigator.clipboard?.writeText(compileToMarkdown())
        .then(() => store.notice(store.t("Markdown copied to clipboard"), "fa-clipboard-check"))
        .catch(() => store.notice(store.t("Clipboard permission was unavailable"), "fa-triangle-exclamation"));
    }
    function applyDocumentToDescription() {
      emit("apply", compileToMarkdown());
      documentLibrary?.clearDraft(currentUserId(), draftIdentity());
      emit("update:modelValue", false);
      store.notice(store.t("Markdown document applied to the description"), "fa-circle-check");
    }

    return {
      store, modalRoot, docTitle, headerText, footerText, pageNumberFormat, watermarkText, suppressOnCover, showRunningHeader,
      headerFooterSettingsOpen, variableDrawerOpen, libraryOpen, leftViewTab, markdownTextarea, isSaving, lastAutosavedAt,
      variableDialogOpen, variableDialogValue, libraryDocuments, sections, activeSectionId, activeSection, flatNumberedSections,
      activeSectionNumber, totalWordCount, estimatedPages, sectionChrome, shouldSuppressChrome, hasCover, hasSectionEnd, documentTemplates, selectSection,
      addRootSection, addCover, addSectionEnd, addSubSection, deleteSection, setSectionLevel, insertMarkdownWrapper, insertMarkdownPrefix,
      insertCallout, insertTableSnippet, insertVariablePrompt, insertVariableByName, applyVariablesToSections, renderedBlocks,
      loadTemplate, loadTemplateById, loadLibraryDocument, saveLibraryDocument, saveTemplateCopy, deleteLibraryDocument, newBlankDocument,
      compileToMarkdown, copyCompiledMarkdown, applyDocumentToDescription, updateActiveSectionChrome, applyChromeToAll,
    };
  },
};
</script>

<style scoped>
.scrollbar-thin::-webkit-scrollbar { width: 5px; }
.scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
.scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.4); border-radius: 9999px; }
@media (max-width: 1023px) { .editor-meta { display: none; } }
@media (max-width: 639px) { .editor-action-label { display: none; } }
</style>
