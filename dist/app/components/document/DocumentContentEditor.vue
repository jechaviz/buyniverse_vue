<template>
  <main class="flex min-w-0 flex-1 flex-col overflow-hidden bg-white dark:bg-slate-900">
    <template v-if="activeSection">
      <DocumentCoverEditor
        v-if="activeSection.type === 'cover' || activeSection.type === 'section_end'"
        :store="store"
        :active-section="activeSection"
        :section-chrome="sectionChrome"
        :suppress-page-chrome="suppressPageChrome"
      />

      <div v-else class="flex min-h-0 flex-1 flex-col overflow-hidden">
        <!-- Structure is managed in the navigator; this bar is only for the active section. -->
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/90 bg-slate-50/90 px-4 py-2 dark:border-slate-800 dark:bg-slate-900/90">
          <div class="flex min-w-0 items-center gap-2">
            <span class="inline-flex items-center gap-1 rounded-lg bg-brand/10 px-2 py-1 text-[10px] font-800 uppercase tracking-wide text-brand dark:bg-brand/20"><i class="fa-solid fa-file-lines"></i>{{ store.t('Contenido') }}</span>
            <span class="font-mono text-sm font-800 text-brand">{{ activeSectionNumber }}</span>
            <div class="flex rounded-lg border border-slate-200 bg-white p-0.5 text-[10px] dark:border-slate-700 dark:bg-slate-800" :aria-label="store.t('Section level')">
              <button v-for="level in levels" :key="level.value" type="button" class="rounded-md px-1.5 py-1 font-800 transition" :class="activeSection.level === level.value ? 'bg-brand text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'" :title="level.title" @click="$emit('set-level', level.value)">{{ level.label }}</button>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <button type="button" class="grid h-7 w-7 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white" :class="activeSection.pageBreakBefore ? 'bg-brand text-white hover:bg-brand' : ''" :title="store.t('Salto Hoja')" :aria-pressed="activeSection.pageBreakBefore" @click="activeSection.pageBreakBefore = !activeSection.pageBreakBefore"><i class="fa-solid fa-file-export text-[11px]"></i></button>
            <button type="button" class="grid h-7 w-7 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white" :title="store.t('Section header and footer')" :aria-label="store.t('Section header and footer')" @click="$emit('open-header-footer-modal')"><i class="fa-solid fa-heading text-[11px]"></i></button>
            <button type="button" class="grid h-7 w-7 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white" :title="store.t('Fields')" :aria-label="store.t('Fields')" @click="$emit('toggle-variable-drawer')"><i class="fa-solid fa-tags text-[11px] text-amber-500"></i></button>
            <span class="mx-0.5 h-4 w-px bg-slate-200 dark:bg-slate-700"></span>
            <button type="button" class="inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-[10px] font-bold transition" :class="previewOpen ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'" :title="store.t('Vista Previa Renderizada')" :aria-pressed="previewOpen" @click="previewOpen = !previewOpen"><i class="fa-solid" :class="previewOpen ? 'fa-eye-slash' : 'fa-eye'"></i><span class="hidden sm:inline">{{ store.t('Vista Previa Renderizada') }}</span></button>
          </div>
        </div>

        <!-- A compact command rail keeps writing tools in one discoverable place. -->
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-200/90 bg-white px-4 py-1.5 dark:border-slate-800 dark:bg-slate-950/45">
          <div class="flex items-center gap-0.5"><span class="mr-1 text-[9px] font-800 uppercase tracking-wide text-slate-400">Aa</span><button type="button" class="editor-icon font-bold" :title="store.t('Negrita (**)')" @click="$emit('insert-wrapper', '**', '**', 'texto en negrita')"><b>B</b></button><button type="button" class="editor-icon italic" :title="store.t('Cursiva (*)')" @click="$emit('insert-wrapper', '*', '*', 'texto en cursiva')">I</button><button type="button" class="editor-icon font-mono" :title="store.t('Código en línea (` `)')" @click="$emit('insert-wrapper', '`', '`', 'codigo')">&lt;/&gt;</button></div>
          <span class="hidden h-4 w-px bg-slate-200 dark:bg-slate-700 sm:block"></span>
          <div class="flex items-center gap-0.5"><span class="mr-1 text-[9px] font-800 uppercase tracking-wide text-slate-400">{{ store.t('Blocks') }}</span><button type="button" class="editor-icon" :title="store.t('Insertar Tabla')" @click="$emit('insert-table')"><i class="fa-solid fa-table"></i></button><button type="button" class="editor-icon" :title="store.t('Lista con viñetas')" @click="$emit('insert-prefix', '- ')"><i class="fa-solid fa-list-ul"></i></button><button type="button" class="editor-icon" :title="store.t('Checklist de Tareas')" @click="$emit('insert-prefix', '- [ ] ')"><i class="fa-solid fa-square-check"></i></button></div>
          <span class="hidden h-4 w-px bg-slate-200 dark:bg-slate-700 sm:block"></span>
          <div class="flex items-center gap-1"><span class="mr-1 text-[9px] font-800 uppercase tracking-wide text-slate-400">!</span><button type="button" class="rounded-md bg-sky-50 px-1.5 py-1 text-[9px] font-800 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300" @click="$emit('insert-callout', 'NOTE')">NOTE</button><button type="button" class="rounded-md bg-amber-50 px-1.5 py-1 text-[9px] font-800 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300" @click="$emit('insert-callout', 'IMPORTANT')">IMPORTANT</button><button type="button" class="rounded-md bg-rose-50 px-1.5 py-1 text-[9px] font-800 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300" @click="$emit('insert-callout', 'WARNING')">WARNING</button></div>
          <button type="button" class="ml-auto inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[9px] font-800 text-amber-800 transition hover:bg-amber-500/20 dark:text-amber-300" :title="store.t('Convertir texto seleccionado en campo configurable {{CAMPO:Valor}}')" @click="$emit('insert-variable')"><i class="fa-solid fa-tag"></i>{{ store.t('Marcar Campo') }}</button>
        </div>

        <div class="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-5">
          <div class="mb-3 flex min-w-0 items-center gap-3 border-b border-slate-200 pb-2 dark:border-slate-800"><span class="font-mono text-base font-800 text-brand sm:text-lg">{{ activeSectionNumber }}</span><input v-model.trim="activeSection.title" class="min-w-0 flex-1 bg-transparent py-1 font-head text-lg font-800 tracking-tight text-slate-900 outline-none transition placeholder:text-slate-300 focus:text-brand dark:text-white dark:placeholder:text-slate-600 sm:text-xl" :placeholder="store.t('Nombre de la Sección (ej. 1.1 Alcance y Entregables)')" /></div>

          <div class="grid min-h-[430px] flex-1 gap-4" :class="previewOpen ? 'xl:grid-cols-2' : 'grid-cols-1'">
            <section class="flex min-h-[430px] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-950 shadow-inner dark:border-slate-700"><div class="flex items-center justify-between border-b border-white/10 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400"><span><i class="fa-solid fa-code mr-1 text-brand"></i>Markdown</span><span>{{ (activeSection.content || '').length }} {{ store.t('caracteres') }}</span></div><textarea ref="textareaEl" v-model="activeSection.content" class="min-h-[360px] flex-1 resize-y bg-transparent p-4 font-mono text-xs leading-relaxed text-slate-100 outline-none placeholder:text-slate-500 sm:text-sm" :placeholder="store.t('Escribe aquí el contenido en Markdown para esta sección...')" spellcheck="true" @keydown="handleEditorKeydown"></textarea><div class="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/10 px-3 py-1.5 font-mono text-[9px] text-slate-500"><span>Tab ↹</span><span>Shift+Tab ⇧↹</span><span>Ctrl/⌘+B</span><span>Ctrl/⌘+I</span><span>Enter ↵</span></div></section>

            <aside v-if="previewOpen" class="min-h-[430px] overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50/70 shadow-sm dark:border-slate-800 dark:bg-slate-950/45"><div class="flex items-center justify-between border-b border-slate-200/90 bg-white/80 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-900/80"><span class="text-[10px] font-800 uppercase tracking-wider text-slate-500"><i class="fa-solid fa-eye mr-1 text-brand"></i>{{ store.t('Vista Previa Renderizada') }}</span><span class="text-[9px] font-mono text-slate-400">{{ renderedBlocks.length }} bloques</span></div><div class="h-[calc(100%-33px)] overflow-y-auto bg-white p-4 text-slate-800 dark:bg-slate-900 dark:text-slate-200"><template v-if="renderedBlocks.length" v-for="(b, bIdx) in renderedBlocks" :key="bIdx"><div v-if="b.type === 'callout'" class="my-2 rounded-r-xl border-l-4 p-3 text-xs" :class="b.tone === 'warning' ? 'border-rose-500 bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-100' : b.tone === 'important' ? 'border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100' : 'border-sky-500 bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-100'"><b>{{ b.title }}:</b> {{ b.text }}</div><h1 v-else-if="b.type === 'h1'" class="mt-4 font-head text-base font-800">{{ b.text }}</h1><h2 v-else-if="b.type === 'h2'" class="mt-3 font-head text-sm font-800">{{ b.text }}</h2><h3 v-else-if="b.type === 'h3'" class="mt-2 text-xs font-800">{{ b.text }}</h3><blockquote v-else-if="b.type === 'quote'" class="my-2 border-l-2 border-slate-300 pl-3 text-xs italic text-slate-500 dark:border-slate-600 dark:text-slate-400">{{ b.text }}</blockquote><div v-else-if="b.type === 'todo'" class="my-1.5 flex items-center gap-2 text-xs"><input type="checkbox" :checked="b.checked" disabled class="accent-brand" /><span :class="b.checked ? 'text-slate-400 line-through' : ''">{{ b.text }}</span></div><ul v-else-if="b.type === 'ul'" class="my-2 list-disc space-y-1 pl-5 text-xs"><li v-for="(item, index) in b.items" :key="index">{{ item }}</li></ul><ol v-else-if="b.type === 'ol'" class="my-2 list-decimal space-y-1 pl-5 text-xs"><li v-for="(item, index) in b.items" :key="index">{{ item }}</li></ol><div v-else-if="b.type === 'table'" class="my-2 overflow-x-auto rounded-xl border border-slate-200 text-xs dark:border-slate-700"><table class="w-full text-left"><thead class="bg-slate-50 dark:bg-slate-800"><tr><th v-for="(h, hIdx) in b.headers" :key="hIdx" class="p-2 font-bold">{{ h }}</th></tr></thead><tbody class="divide-y divide-slate-100 dark:divide-slate-800"><tr v-for="(row, rIdx) in b.rows" :key="rIdx"><td v-for="(cell, cIdx) in row" :key="cIdx" class="p-2 font-mono text-[11px]">{{ cell }}</td></tr></tbody></table></div><p v-else class="my-2 text-xs leading-relaxed">{{ b.text }}</p></template><div v-else class="grid h-full min-h-56 place-items-center text-center text-xs text-slate-400"><div><i class="fa-solid fa-wand-magic-sparkles mb-2 block text-xl text-brand/70"></i>{{ store.t('Write content to see it formatted here.') }}</div></div></div></aside>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="flex flex-1 flex-col items-center justify-center p-8 text-center text-slate-400"><i class="fa-solid fa-file-circle-plus mb-3 text-4xl text-slate-300 dark:text-slate-600"></i><p class="text-sm font-bold text-slate-700 dark:text-slate-200">{{ store.t('Selecciona o crea una sección') }}</p><div class="mt-4 flex items-center gap-2"><button type="button" class="btn-muted px-3 py-2 text-xs font-bold" @click="$emit('add-cover')"><i class="fa-solid fa-file-shield mr-1.5 text-purple-600"></i>{{ store.t('Crear Portada') }}</button><button type="button" class="btn-brand px-4 py-2 text-xs font-bold" @click="$emit('add-root-section')"><i class="fa-solid fa-plus mr-1.5"></i>{{ store.t('Crear Sección 1.1') }}</button></div></div>
  </main>
</template>

<script>
const { ref, defineAsyncComponent, nextTick, onMounted, watch } = Vue;
const load = (p) => defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(p, window.sfcOptions));
const DocumentCoverEditor = load("./app/components/document/DocumentCoverEditor.vue?v=4");

export default {
  components: { DocumentCoverEditor },
  props: { store: Object, activeSection: Object, activeSectionNumber: String, renderedBlocks: Array, sectionChrome: Object, suppressPageChrome: Boolean },
  emits: ["set-level", "insert-wrapper", "insert-table", "insert-prefix", "insert-callout", "insert-variable", "toggle-variable-drawer", "open-header-footer-modal", "add-root-section", "add-cover", "textarea-ready"],
  setup(props, { emit }) {
    const textareaEl = ref(null), previewOpen = ref(false);
    const levels = [{ value: 1, label: "H1", title: "Level 1" }, { value: 2, label: "H2", title: "Level 2" }, { value: 3, label: "H3", title: "Level 3" }];
    const registerTextarea = () => nextTick(() => emit("textarea-ready", textareaEl.value || null));
    onMounted(registerTextarea);
    watch(() => props.activeSection?.id, registerTextarea);
    watch(() => props.activeSection?.type, registerTextarea);
    function updateContent(next, start, end) { if (!props.activeSection || !textareaEl.value) return; props.activeSection.content = next; nextTick(() => { textareaEl.value.focus(); textareaEl.value.setSelectionRange(start, end == null ? start : end); }); }
    function indentSelection(event) {
      const textarea = textareaEl.value, value = props.activeSection?.content || "", start = textarea.selectionStart, end = textarea.selectionEnd;
      const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1, rawEnd = value.indexOf("\n", end), lineEnd = rawEnd < 0 ? value.length : rawEnd;
      const chunk = value.slice(lineStart, lineEnd), lines = chunk.split("\n"), unindent = event.shiftKey;
      const nextChunk = lines.map((line) => unindent ? line.replace(/^(?:\t| {1,2})/, "") : `  ${line}`).join("\n");
      const startShift = unindent ? -Math.min(2, (lines[0].match(/^(?:\t| {1,2})/) || [""])[0].length) : 2;
      event.preventDefault(); updateContent(value.slice(0, lineStart) + nextChunk + value.slice(lineEnd), Math.max(lineStart, start + startShift), Math.max(lineStart, end + (nextChunk.length - chunk.length)));
    }
    function continueList(event) {
      const textarea = textareaEl.value, value = props.activeSection?.content || "", start = textarea.selectionStart, end = textarea.selectionEnd;
      if (start !== end) return false;
      const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1, line = value.slice(lineStart, start);
      const list = line.match(/^(\s*)(?:(\d+)([.)])\s+|(- \[[ xX]\])\s+|([-+*])\s+)(.*)$/);
      if (!list) return false;
      event.preventDefault(); const [, indent, number, delimiter, taskMarker, bullet, body] = list;
      if (!String(body || "").trim()) { updateContent(value.slice(0, lineStart) + value.slice(start), lineStart); return true; }
      const marker = number ? `${indent}${Number(number) + 1}${delimiter} ` : taskMarker ? `${indent}- [ ] ` : `${indent}${bullet} `, insert = `\n${marker}`;
      updateContent(value.slice(0, start) + insert + value.slice(start), start + insert.length); return true;
    }
    function handleEditorKeydown(event) {
      const shortcut = event.ctrlKey || event.metaKey;
      if (shortcut && !event.altKey && event.key.toLowerCase() === "b") { event.preventDefault(); emit("insert-wrapper", "**", "**", "texto en negrita"); return; }
      if (shortcut && !event.altKey && event.key.toLowerCase() === "i") { event.preventDefault(); emit("insert-wrapper", "*", "*", "texto en cursiva"); return; }
      if (event.key === "Tab") { indentSelection(event); return; }
      if (event.key === "Enter") continueList(event);
    }
    return { textareaEl, previewOpen, levels, handleEditorKeydown };
  },
};
</script>

<style scoped>
.editor-icon { display:inline-grid; height:1.7rem; width:1.7rem; place-items:center; border-radius:.42rem; color:#64748b; font-size:.72rem; transition:background-color .15s,color .15s; }
.editor-icon:hover { background:rgba(148,163,184,.18); color:#0f172a; }
.dark .editor-icon:hover { color:#f8fafc; }
</style>
