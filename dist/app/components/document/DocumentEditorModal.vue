<template><div
    v-if="modelValue"
    class="fixed inset-0 z-90 flex items-center justify-center bg-slate-950/80 p-2 sm:p-4 backdrop-blur-md animate-fade-in"
    @keydown.esc="$emit('update:modelValue', false)"
  ><div
      class="flex h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-slate-50 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
    ><header class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/90 bg-white px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900/95 flex-none"><div class="flex items-center gap-3 min-w-0"><span class="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white text-sm shadow-soft"><i class="fa-solid fa-file-lines"></i></span><div class="min-w-0"><div class="flex items-center gap-2"><input
                v-model.trim="docTitle"
                class="font-head text-base sm:text-lg font-800 tracking-tight text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 focus:border-brand focus:outline-none transition py-0.5 px-1 rounded truncate max-w-xs sm:max-w-md"
                :placeholder="store.t('Título del Documento')"
              /><span class="rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-mono font-bold text-brand dark:bg-brand/20">
                Markdown Carta
              </span></div><p class="text-[11px] text-slate-400 truncate">
              {{ sections.length }} {{ store.t("secciones") }} · {{ totalWordCount }} {{ store.t("palabras") }} · ~{{ estimatedPages.length }} {{ store.t("páginas tamaño carta") }}
            </p></div></div><div class="flex items-center gap-2 flex-wrap"><div class="relative"><button
              type="button"
              class="btn-muted text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold"
              @click="templatesOpen = !templatesOpen"
            ><i class="fa-solid fa-wand-magic-sparkles text-brand"></i><span>{{ store.t("Plantillas") }}</span><i class="fa-solid fa-chevron-down text-[9px]"></i></button><div
              v-if="templatesOpen"
              class="absolute right-0 top-full mt-1.5 w-64 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900 z-50 space-y-1"
            ><button
                v-for="tpl in documentTemplates"
                :key="tpl.id"
                type="button"
                class="w-full text-left p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition block text-xs"
                @click="loadTemplate(tpl)"
              ><b class="text-slate-900 dark:text-white block font-bold">{{ tpl.name }}</b><span class="text-[11px] text-slate-400 block mt-0.5">{{ tpl.desc }}</span></button></div></div><button
            type="button"
            class="btn-muted text-xs py-1.5 px-3 flex items-center gap-1.5"
            :class="headerFooterSettingsOpen ? 'border-brand text-brand' : ''"
            @click="headerFooterSettingsOpen = !headerFooterSettingsOpen"
            :title="store.t('Configurar Encabezado y Pie de Página')"
          ><i class="fa-solid fa-sliders"></i><span class="hidden sm:inline">{{ store.t("Encabezado/Pie") }}</span></button><button
            type="button"
            class="btn-muted text-xs py-1.5 px-3 flex items-center gap-1.5"
            @click="copyCompiledMarkdown"
            :title="store.t('Copiar Markdown Compilado')"
          ><i class="fa-solid fa-copy"></i><span class="hidden md:inline">{{ store.t("Copiar MD") }}</span></button><button
            type="button"
            class="btn-brand text-xs py-1.5 px-4 font-bold shadow-soft flex items-center gap-1.5"
            @click="applyDocumentToDescription"
          ><i class="fa-solid fa-check"></i><span>{{ store.t("Insertar en Descripción") }}</span></button><button
            type="button"
            class="grid h-8 w-8 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 transition"
            @click="$emit('update:modelValue', false)"
            :aria-label="store.t('Cerrar')"
          ><i class="fa-solid fa-xmark text-sm"></i></button></div></header><div
        v-if="headerFooterSettingsOpen"
        class="border-b border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-800/80 flex-none animate-slide-down"
      ><div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto text-xs"><div><label class="font-bold text-slate-700 dark:text-slate-200 block mb-1">
              {{ store.t("Texto Encabezado Superior (Header)") }}
            </label><input
              v-model="headerText"
              class="field text-xs py-1.5"
              :placeholder="store.t('Ej. BUY-2026-RFP · Confidencial')"
            /></div><div><label class="font-bold text-slate-700 dark:text-slate-200 block mb-1">
              {{ store.t("Texto Pie de Página (Footer)") }}
            </label><input
              v-model="footerText"
              class="field text-xs py-1.5"
              :placeholder="store.t('Ej. Buyniverse Enterprise Sourcing')"
            /></div><div><label class="font-bold text-slate-700 dark:text-slate-200 block mb-1">
              {{ store.t("Formato de Numeración") }}
            </label><select v-model="pageNumberFormat" class="field text-xs py-1.5"><option value="Page X of Y">{{ store.t("Página X de Y") }}</option><option value="X / Y">X / Y</option><option value="Page X">{{ store.t("Página X") }}</option><option value="none">{{ store.t("Sin numeración") }}</option></select></div><div class="flex items-end"><label class="flex items-center gap-2 cursor-pointer pb-2"><input v-model="showRunningHeader" type="checkbox" class="accent-brand" /><span class="font-bold text-slate-700 dark:text-slate-200">{{ store.t("Mostrar en todas las páginas") }}</span></label></div></div></div><div class="flex flex-1 min-h-0 overflow-hidden"><aside class="w-72 sm:w-80 lg:w-96 flex-none border-r border-slate-200/90 bg-slate-100/70 dark:border-slate-800 dark:bg-slate-950/50 flex flex-col min-h-0"><div class="p-3 border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 flex items-center justify-between gap-2 flex-none"><div class="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800 text-xs"><button
                type="button"
                class="px-2.5 py-1 rounded-lg font-bold transition text-xs"
                :class="leftViewTab === 'thumbnails' ? 'bg-white text-brand shadow-xs dark:bg-slate-700' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'"
                @click="leftViewTab = 'thumbnails'"
              ><i class="fa-solid fa-file-invoice mr-1"></i>{{ store.t("Hojas Carta") }}
              </button><button
                type="button"
                class="px-2.5 py-1 rounded-lg font-bold transition text-xs"
                :class="leftViewTab === 'tree' ? 'bg-white text-brand shadow-xs dark:bg-slate-700' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'"
                @click="leftViewTab = 'tree'"
              ><i class="fa-solid fa-list-ol mr-1"></i>{{ store.t("Estructura 1.1") }}
              </button></div><button
              type="button"
              class="rounded-xl bg-brand-50 dark:bg-brand/20 px-2 py-1 text-xs font-bold text-brand hover:bg-brand hover:text-white transition flex items-center gap-1"
              @click="addRootSection"
              :title="store.t('Añadir Sección Principal')"
            ><i class="fa-solid fa-plus text-[10px]"></i><span>{{ store.t("Sección") }}</span></button></div><div
            v-if="leftViewTab === 'thumbnails'"
            class="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin"
          ><div
              v-for="(page, pageIdx) in estimatedPages"
              :key="pageIdx"
              class="group relative cursor-pointer"
              @click="selectSection(page.sections[0])"
            ><div
                class="w-full aspect-[8.5/11] rounded-2xl border bg-white p-3 shadow-md transition-all hover:shadow-xl dark:bg-slate-900 dark:border-slate-800 flex flex-col justify-between overflow-hidden relative"
                :class="isPageActive(page) ? 'ring-2 ring-brand border-brand' : 'border-slate-200/90'"
              ><div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1 text-[8px] font-mono text-slate-400 flex-none"><span class="truncate max-w-[130px] font-bold text-slate-600 dark:text-slate-300 uppercase">{{ headerText || docTitle }}</span><span>{{ new Date().toLocaleDateString() }}</span></div><div class="flex-1 overflow-hidden py-2 space-y-2 pointer-events-none"><div
                    v-for="sec in page.sections"
                    :key="sec.id"
                    class="space-y-1"
                  ><div class="flex items-center gap-1"><b
                        class="font-head font-bold text-slate-900 dark:text-white truncate"
                        :class="sec.level === 1 ? 'text-[10px] text-brand' : sec.level === 2 ? 'text-[9px]' : 'text-[8px] text-slate-600'"
                      >
                        {{ getSectionNumber(sec) }} {{ sec.title || store.t("Sección Sin Título") }}
                      </b></div><div class="text-[7.5px] leading-tight text-slate-500 dark:text-slate-400 line-clamp-4 font-sans">
                      {{ sec.content || '...' }}
                    </div></div></div><div class="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-1 text-[8px] font-mono text-slate-400 flex-none"><span class="truncate max-w-[120px]">{{ footerText || 'CONFIDENTIAL' }}</span><b class="text-slate-700 dark:text-slate-200 font-bold">
                    {{ formatPageNumber(pageIdx + 1, estimatedPages.length) }}
                  </b></div><span class="absolute top-2 right-2 rounded-md bg-slate-900/80 text-white text-[9px] font-mono px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition shadow-xs">
                  Hoja {{ pageIdx + 1 }}
                </span></div></div></div><div
            v-else
            class="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin"
          ><div
              v-for="sec in flatNumberedSections"
              :key="sec.id"
              class="rounded-xl border p-2.5 transition flex items-center justify-between gap-2 cursor-pointer group"
              :class="activeSectionId === sec.id ? 'border-brand bg-brand-50/60 dark:bg-brand/15 dark:border-brand/50 shadow-xs' : 'border-slate-200/80 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60'"
              :style="{ marginLeft: `${(sec.level - 1) * 12}px` }"
              @click="activeSectionId = sec.id"
            ><div class="flex items-center gap-2 min-w-0 flex-1"><span class="font-mono text-[11px] font-800 text-brand flex-none">
                  {{ sec.numberStr }}
                </span><span class="font-head text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {{ sec.title || store.t("Sin título") }}
                </span></div><div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition"><button
                  v-if="sec.level < 3"
                  type="button"
                  class="h-6 w-6 rounded bg-slate-100 dark:bg-slate-800 hover:bg-brand-50 hover:text-brand transition grid place-items-center text-[10px]"
                  @click.stop="addSubSection(sec)"
                  :title="store.t('Añadir Subsección')"
                ><i class="fa-solid fa-turn-down-right text-[8px]"></i></button><button
                  type="button"
                  class="h-6 w-6 rounded bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 transition grid place-items-center text-[10px]"
                  @click.stop="deleteSection(sec.id)"
                  :title="store.t('Eliminar')"
                ><i class="fa-solid fa-trash text-[8px]"></i></button></div></div></div></aside><main class="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 overflow-hidden"><template v-if="activeSection"><div class="flex flex-wrap items-center gap-1 border-b border-slate-200/90 bg-slate-50/90 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900/90 flex-none overflow-x-auto"><div class="flex items-center gap-1 mr-2 border-r border-slate-200 dark:border-slate-700 pr-2"><button
                  type="button"
                  class="rounded-lg px-2 py-1 text-xs font-bold transition"
                  :class="activeSection.level === 1 ? 'bg-brand text-white' : 'btn-muted'"
                  @click="setSectionLevel(1)"
                >
                  1. H1
                </button><button
                  type="button"
                  class="rounded-lg px-2 py-1 text-xs font-bold transition"
                  :class="activeSection.level === 2 ? 'bg-brand text-white' : 'btn-muted'"
                  @click="setSectionLevel(2)"
                >
                  1.1 H2
                </button><button
                  type="button"
                  class="rounded-lg px-2 py-1 text-xs font-bold transition"
                  :class="activeSection.level === 3 ? 'bg-brand text-white' : 'btn-muted'"
                  @click="setSectionLevel(3)"
                >
                  1.1.1 H3
                </button></div><div class="flex items-center gap-1 mr-2 border-r border-slate-200 dark:border-slate-700 pr-2"><button
                  type="button"
                  class="grid h-7 w-7 place-items-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 font-bold"
                  @click="insertMarkdownWrapper('**', '**', 'texto en negrita')"
                  :title="store.t('Negrita (**)')"
                ><b>B</b></button><button
                  type="button"
                  class="grid h-7 w-7 place-items-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 italic"
                  @click="insertMarkdownWrapper('*', '*', 'texto en cursiva')"
                  :title="store.t('Cursiva (*)')"
                ><i>I</i></button><button
                  type="button"
                  class="grid h-7 w-7 place-items-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 line-through"
                  @click="insertMarkdownWrapper('~~', '~~', 'texto tachado')"
                  :title="store.t('Tachado (~~)')"
                >
                  S
                </button><button
                  type="button"
                  class="grid h-7 w-7 place-items-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 font-mono"
                  @click="insertMarkdownWrapper('`', '`', 'codigo')"
                  :title="store.t('Código en línea (` `)')"
                >
                  &lt;/&gt;
                </button></div><div class="flex items-center gap-1 mr-2 border-r border-slate-200 dark:border-slate-700 pr-2"><button
                  type="button"
                  class="grid h-7 w-7 place-items-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-200"
                  @click="insertTableSnippet"
                  :title="store.t('Insertar Tabla')"
                ><i class="fa-solid fa-table"></i></button><button
                  type="button"
                  class="grid h-7 w-7 place-items-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-200"
                  @click="insertMarkdownPrefix('- ')"
                  :title="store.t('Lista con viñetas')"
                ><i class="fa-solid fa-list-ul"></i></button><button
                  type="button"
                  class="grid h-7 w-7 place-items-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-200"
                  @click="insertMarkdownPrefix('1. ')"
                  :title="store.t('Lista numerada')"
                ><i class="fa-solid fa-list-ol"></i></button><button
                  type="button"
                  class="grid h-7 w-7 place-items-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-200"
                  @click="insertMarkdownPrefix('- [ ] ')"
                  :title="store.t('Checklist de Tareas')"
                ><i class="fa-solid fa-square-check"></i></button><button
                  type="button"
                  class="grid h-7 w-7 place-items-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-200"
                  @click="insertMarkdownPrefix('> ')"
                  :title="store.t('Cita en bloque')"
                ><i class="fa-solid fa-quote-left"></i></button></div><div class="flex items-center gap-1 mr-2 border-r border-slate-200 dark:border-slate-700 pr-2"><button
                  type="button"
                  class="rounded-lg bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 text-[10px] font-bold text-sky-600 dark:text-sky-300 hover:bg-sky-100 transition"
                  @click="insertCallout('NOTE')"
                >
                  [!NOTE]
                </button><button
                  type="button"
                  class="rounded-lg bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-300 hover:bg-amber-100 transition"
                  @click="insertCallout('IMPORTANT')"
                >
                  [!IMPORTANT]
                </button><button
                  type="button"
                  class="rounded-lg bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-300 hover:bg-rose-100 transition"
                  @click="insertCallout('WARNING')"
                >
                  [!WARNING]
                </button></div><button
                type="button"
                class="rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-0.5 text-[10px] font-bold transition"
                :class="activeSection.pageBreakBefore ? 'bg-brand text-white border-brand' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'"
                @click="activeSection.pageBreakBefore = !activeSection.pageBreakBefore"
              ><i class="fa-solid fa-file-export mr-1"></i>{{ store.t("Salto de Hoja Carta") }}
              </button></div><div class="flex-1 overflow-y-auto p-6 space-y-4"><div class="flex items-center gap-3"><span class="font-mono text-base sm:text-lg font-800 text-brand flex-none">
                  {{ activeSectionNumber }}
                </span><input
                  v-model.trim="activeSection.title"
                  class="font-head text-lg sm:text-xl font-800 tracking-tight text-slate-900 dark:text-white bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-brand focus:outline-none transition py-1 px-1 flex-1"
                  :placeholder="store.t('Nombre de la Sección (ej. 1.1 Alcance y Entregables)')"
                /></div><div class="relative flex-1 min-h-[300px]"><textarea
                  ref="markdownTextarea"
                  v-model="activeSection.content"
                  class="w-full h-full min-h-[340px] rounded-2xl border border-slate-200/90 bg-white p-4 font-mono text-xs sm:text-sm text-slate-800 leading-relaxed dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-200 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition resize-y"
                  :placeholder="store.t('Escribe aquí el contenido en Markdown para esta sección... Puedes incluir tablas, listas de entregables, fórmulas y reglas de negocio.')"
                ></textarea></div><div class="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30"><div class="flex items-center justify-between mb-2"><span class="text-[11px] font-bold uppercase tracking-wider text-slate-400"><i class="fa-solid fa-eye mr-1"></i>{{ store.t("Vista Previa Renderizada") }}
                  </span><span class="text-[10px] text-slate-400">{{ (activeSection.content || '').length }} {{ store.t("caracteres") }}</span></div><div class="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 overflow-x-auto space-y-2"><template v-for="(b, bIdx) in renderedBlocks" :key="bIdx"><div
                      v-if="b.type === 'callout'"
                      class="p-3 rounded-xl border-l-4 text-xs font-sans"
                      :class="b.tone === 'warning' ? 'bg-rose-50 border-rose-500 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200' : b.tone === 'important' ? 'bg-amber-50 border-amber-500 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200' : 'bg-sky-50 border-sky-500 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200'"
                    ><b class="mr-1">{{ b.title }}:</b><span>{{ b.text }}</span></div><h1 v-else-if="b.type === 'h1'" class="font-head text-base font-800 text-slate-900 dark:text-white mt-3">{{ b.text }}</h1><h2 v-else-if="b.type === 'h2'" class="font-head text-sm font-bold text-slate-900 dark:text-white mt-2">{{ b.text }}</h2><h3 v-else-if="b.type === 'h3'" class="font-head text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">{{ b.text }}</h3><blockquote v-else-if="b.type === 'quote'" class="border-l-2 border-slate-300 dark:border-slate-600 pl-3 italic text-xs text-slate-600 dark:text-slate-400 py-1">{{ b.text }}</blockquote><div v-else-if="b.type === 'todo'" class="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300"><input type="checkbox" :checked="b.checked" disabled class="accent-brand" /><span :class="b.checked ? 'line-through text-slate-400' : ''">{{ b.text }}</span></div><li v-else-if="b.type === 'list-item'" class="ml-4 list-disc text-xs text-slate-700 dark:text-slate-300">{{ b.text }}</li><div v-else-if="b.type === 'table'" class="overflow-x-auto my-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"><table class="w-full text-left"><thead class="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700"><tr><th v-for="(h, hIdx) in b.headers" :key="hIdx" class="p-2 font-bold">{{ h }}</th></tr></thead><tbody class="divide-y divide-slate-100 dark:divide-slate-800"><tr v-for="(row, rIdx) in b.rows" :key="rIdx"><td v-for="(cell, cIdx) in row" :key="cIdx" class="p-2 font-mono text-[11px]">{{ cell }}</td></tr></tbody></table></div><p v-else class="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">{{ b.text }}</p></template>
<script>
const { inject, ref, computed, watch, nextTick } = Vue;
export default {
name: "DocumentEditorModal",
props: {
modelValue: {
type: Boolean,
default: false
},
initialMarkdown: {
type: String,
default: ""
}
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
function isPageActive(page) {
if (!activeSection.value) return false;
return page.sections.some((s) => s.id === activeSection.value.id);
}
function selectSection(sec) {
if (sec) {
activeSectionId.value = sec.id;
}
}
function formatPageNumber(page, total) {
if (pageNumberFormat.value === "none") return "";
if (pageNumberFormat.value === "X / Y") return `${page} / ${total}`;
if (pageNumberFormat.value === "Page X") return `Página ${page}`;
return `Página ${page} de ${total}`;
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
const lines = activeSection.value.content.split("\n");
const blocks = [];
let currentTable = null;
for (const line of lines) {
const trimmed = line.trim();
if (!trimmed) {
currentTable = null;
continue;
}
if (trimmed.startsWith("> [!NOTE]")) {
blocks.push({ type: "callout", tone: "note", title: "Nota", text: trimmed.replace("> [!NOTE]", "").trim() });
} else if (trimmed.startsWith("> [!IMPORTANT]")) {
blocks.push({ type: "callout", tone: "important", title: "Importante", text: trimmed.replace("> [!IMPORTANT]", "").trim() });
} else if (trimmed.startsWith("> [!WARNING]")) {
blocks.push({ type: "callout", tone: "warning", title: "Advertencia", text: trimmed.replace("> [!WARNING]", "").trim() });
} else if (trimmed.startsWith("> ")) {
blocks.push({ type: "quote", text: trimmed.slice(2) });
} else if (trimmed.startsWith("### ")) {
blocks.push({ type: "h3", text: trimmed.slice(4) });
} else if (trimmed.startsWith("## ")) {
blocks.push({ type: "h2", text: trimmed.slice(3) });
} else if (trimmed.startsWith("# ")) {
blocks.push({ type: "h1", text: trimmed.slice(2) });
} else if (trimmed.startsWith("- [ ] ")) {
blocks.push({ type: "todo", checked: false, text: trimmed.slice(6) });
} else if (trimmed.startsWith("- [x] ") || trimmed.startsWith("- [X] ")) {
blocks.push({ type: "todo", checked: true, text: trimmed.slice(6) });
} else if (trimmed.startsWith("- ")) {
blocks.push({ type: "list-item", text: trimmed.slice(2) });
} else if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
const cells = trimmed.split("|").slice(1, -1).map((c) => c.trim());
if (!cells.every((c) => /^:?-+:?$/.test(c))) {
if (!currentTable) {
currentTable = { type: "table", headers: cells, rows: [] };
blocks.push(currentTable);
} else {
currentTable.rows.push(cells);
}
}
} else {
currentTable = null;
blocks.push({ type: "paragraph", text: trimmed });
}
}
return blocks;
});
const documentTemplates = [
{
id: "rfp-sourcing",
name: "Pliego de Licitación RFQ / Sourcing",
desc: "Estructura BAFO con matriz de entregables y criterios de ponderación.",
build: () => [
{ id: "sec-1", title: "Definición del Alcance y Criterios Comerciales", level: 1, pageBreakBefore: false, content: "El objetivo de la presente licitación es la selección y adjudicación directa mediante el motor de subasta inversa BAFO de Buyniverse.\n\n- Presupuesto Máximo de Referencia: Según ficha técnica.\n- Garantía de Cumplimiento: 100% de fondos custodiados en Escrow." },
{ id: "sec-2", title: "Cronograma de Hitos y Entregables", level: 2, pageBreakBefore: false, content: "| Hito | Descripción del Entregable | Duración | Liberación Escrow |\n| :--- | :--- | :--- | :--- |\n| 1 | Especificaciones & Arquitectura | 10 días | 25% |\n| 2 | Desarrollo & Pruebas Unitarias | 25 días | 50% |\n| 3 | Aceptación Final y Go-Live | 10 días | 25% |" },
{ id: "sec-3", title: "Reglas de la Subasta Inversa BAFO", level: 2, pageBreakBefore: true, content: "1. Todos los proveedores pre-calificados entrarán en una ronda en vivo de 45 minutos.\n2. La comisión Gain-Share se deducirá exclusivamente sobre la reducción obtenida frente al bid inicial." }
]
},
{
id: "sla-escrow",
name: "Contrato Marco de Servicios & SLA Escrow",
desc: "Términos legales de custodia, hitos y penalizaciones por mora.",
build: () => [
{ id: "sec-1", title: "Obligaciones del Prestador de Servicios", level: 1, pageBreakBefore: false, content: "El Prestador se compromete a ejecutar los servicios descritos conforme a las mejores prácticas de la industria, garantizando disponibilidad y soporte técnico." },
{ id: "sec-2", title: "Custodia de Fondos en Fideicomiso (Escrow)", level: 2, pageBreakBefore: false, content: "El Cliente depositará los fondos correspondientes a cada hito en el fideicomiso digital de Buyniverse antes del inicio de los trabajos.\n\n> [!NOTE]\n> Los fondos solo se liberarán a la cuenta del proveedor una vez que el cliente valide el 3-Way Match y apruebe el entregable." }
]
},
{
id: "prd-spec",
name: "Especificación Técnica de Software (PRD)",
desc: "Arquitectura, endpoints, modelo de datos y checklist de QA.",
build: () => [
{ id: "sec-1", title: "Visión General y Requisitos Funcionales", level: 1, pageBreakBefore: false, content: "El sistema deberá soportar transacciones concurrentes con latencia inferior a 150ms y compatibilidad multiplataforma." },
{ id: "sec-2", title: "Stack Tecnológico y Dependencias", level: 2, pageBreakBefore: false, content: "- Frontend: Vue 3 Single File Components (SFC) + UnoCSS.\n- Backend: Linux V / C High Performance Gateway.\n- Base de Datos: MariaDB / MySQL InnoDB con soporte transaccional ACID." }
]
}
];
function loadTemplate(tpl) {
docTitle.value = tpl.name;
sections.value = tpl.build();
activeSectionId.value = sections.value[0]?.id;
templatesOpen.value = false;
store.notice(`Plantilla '${tpl.name}' cargada`, "fa-wand-magic-sparkles");
}
function compileToMarkdown() {
let md = `# ${docTitle.value}\n\n`;
if (showRunningHeader.value && headerText.value) {
md += `> **Referencia:** ${headerText.value} | **Fecha:** ${new Date().toLocaleDateString()}\n\n---\n\n`;
}
flatNumberedSections.value.forEach((sec) => {
if (sec.pageBreakBefore) {
md += `\n<!-- pagebreak -->\n\n`;
}
const hashes = "#".repeat(sec.level + 1);
md += `${hashes} ${sec.numberStr} ${sec.title}\n\n`;
if (sec.content && sec.content.trim()) {
md += `${sec.content.trim()}\n\n`;
}
});
if (footerText.value) {
md += `---\n*${footerText.value}*\n`;
}
return md.trim();
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
isPageActive,
selectSection,
formatPageNumber,
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
<style scoped>.scrollbar-thin::-webkit-scrollbar{width:5px;}.scrollbar-thin::-webkit-scrollbar-track{background:transparent;}.scrollbar-thin::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.4);border-radius:9999px;}</style>