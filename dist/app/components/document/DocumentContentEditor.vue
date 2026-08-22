<template>
  <main class="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 overflow-hidden">
    <template v-if="activeSection">
      <!-- Section Role Switcher & Header Bar -->
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/90 bg-slate-50/90 px-4 py-2 dark:border-slate-800 dark:bg-slate-900/90 flex-none">
        <div class="flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 p-1 dark:bg-slate-800 dark:border-slate-700 text-xs">
          <span class="text-[10px] font-bold text-slate-400 uppercase px-1">{{ store.t("Tipo:") }}</span>
          <button
            type="button"
            class="px-2.5 py-0.5 rounded-lg font-bold transition text-[11px]"
            :class="activeSection.type === 'standard' || !activeSection.type ? 'bg-brand text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'"
            @click="activeSection.type = 'standard'"
          >
            <i class="fa-solid fa-file-lines mr-1"></i>{{ store.t("Contenido") }}
          </button>
          <button
            type="button"
            class="px-2.5 py-0.5 rounded-lg font-bold transition text-[11px]"
            :class="activeSection.type === 'cover' ? 'bg-purple-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'"
            @click="activeSection.type = 'cover'"
          >
            <i class="fa-solid fa-file-shield mr-1"></i>{{ store.t("Portada") }}
          </button>
          <button
            type="button"
            class="px-2.5 py-0.5 rounded-lg font-bold transition text-[11px]"
            :class="activeSection.type === 'section_end' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'"
            @click="activeSection.type = 'section_end'"
          >
            <i class="fa-solid fa-signature mr-1"></i>{{ store.t("Fin de Sección") }}
          </button>
        </div>

        <div class="flex items-center gap-2">
          <!-- Button to customize Headers & Footers -->
          <button
            type="button"
            class="btn-muted text-xs py-1 px-2.5 font-semibold flex items-center gap-1 cursor-pointer"
            :title="store.t('Section header and footer')"
            :aria-label="store.t('Section header and footer')"
            @click="$emit('open-header-footer-modal')"
          >
            <i class="fa-solid fa-heading text-slate-500 text-[10px]"></i>
            <span class="hidden sm:inline">{{ store.t("Encabezado / Pie") }}</span>
          </button>

          <!-- Drawer Trigger -->
          <button
            type="button"
            class="rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-3 py-1 text-xs font-bold transition flex items-center gap-1.5 shadow-sm hover:scale-105 cursor-pointer"
            @click="$emit('toggle-variable-drawer')"
          >
            <i class="fa-solid fa-tags text-amber-400 dark:text-amber-600 text-xs"></i>
            <span>{{ store.t("Fields") }}</span>
          </button>
        </div>
      </div>

      <!-- VIEW A: COVER / SECTION END SPECIALIZED COMPONENT -->
      <DocumentCoverEditor
        v-if="activeSection.type === 'cover' || activeSection.type === 'section_end'"
        :store="store"
        :active-section="activeSection"
        :section-chrome="sectionChrome"
        :suppress-page-chrome="suppressPageChrome"
      />

      <!-- VIEW B: STANDARD 1.1 MARKDOWN SECTION EDITOR -->
      <div v-else class="flex-1 flex flex-col min-h-0 overflow-hidden">
        <!-- Inline Markdown Styling Toolbar -->
        <div class="flex flex-wrap items-center gap-1 border-b border-slate-200/90 bg-slate-50/70 px-4 py-2 dark:border-slate-800 dark:bg-slate-900/70 flex-none overflow-x-auto">
          <!-- Level Selector -->
          <div class="flex items-center gap-1 mr-2 border-r border-slate-200 dark:border-slate-700 pr-2">
            <button
              type="button"
              class="rounded-lg px-2 py-0.5 text-xs font-bold transition"
              :class="activeSection.level === 1 ? 'bg-brand text-white' : 'btn-muted'"
              @click="$emit('set-level', 1)"
            >
              1. H1
            </button>
            <button
              type="button"
              class="rounded-lg px-2 py-0.5 text-xs font-bold transition"
              :class="activeSection.level === 2 ? 'bg-brand text-white' : 'btn-muted'"
              @click="$emit('set-level', 2)"
            >
              1.1 H2
            </button>
            <button
              type="button"
              class="rounded-lg px-2 py-0.5 text-xs font-bold transition"
              :class="activeSection.level === 3 ? 'bg-brand text-white' : 'btn-muted'"
              @click="$emit('set-level', 3)"
            >
              1.1.1 H3
            </button>
          </div>

          <!-- Inline Style Buttons -->
          <div class="flex items-center gap-1 mr-2 border-r border-slate-200 dark:border-slate-700 pr-2">
            <button
              type="button"
              class="grid h-7 w-7 place-items-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-bold"
              @click="$emit('insert-wrapper', '**', '**', 'texto en negrita')"
              :title="store.t('Negrita (**)')"
            >
              <b>B</b>
            </button>
            <button
              type="button"
              class="grid h-7 w-7 place-items-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-xs italic"
              @click="$emit('insert-wrapper', '*', '*', 'texto en cursiva')"
              :title="store.t('Cursiva (*)')"
            >
              <i>I</i>
            </button>
            <button
              type="button"
              class="grid h-7 w-7 place-items-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-mono"
              @click="$emit('insert-wrapper', '`', '`', 'codigo')"
              :title="store.t('Código en línea (` `)')"
            >
              &lt;/&gt;
            </button>
          </div>

          <!-- Markdown Elements Insert Tools -->
          <div class="flex items-center gap-1 mr-2 border-r border-slate-200 dark:border-slate-700 pr-2">
            <button
              type="button"
              class="grid h-7 w-7 place-items-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-200"
              @click="$emit('insert-table')"
              :title="store.t('Insertar Tabla')"
            >
              <i class="fa-solid fa-table"></i>
            </button>
            <button
              type="button"
              class="grid h-7 w-7 place-items-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-200"
              @click="$emit('insert-prefix', '- ')"
              :title="store.t('Lista con viñetas')"
            >
              <i class="fa-solid fa-list-ul"></i>
            </button>
            <button
              type="button"
              class="grid h-7 w-7 place-items-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-200"
              @click="$emit('insert-prefix', '- [ ] ')"
              :title="store.t('Checklist de Tareas')"
            >
              <i class="fa-solid fa-square-check"></i>
            </button>
          </div>

          <!-- Callouts / Risk Badges -->
          <div class="flex items-center gap-1 mr-2 border-r border-slate-200 dark:border-slate-700 pr-2">
            <button
              type="button"
              class="rounded-lg bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 text-[10px] font-bold text-sky-600 dark:text-sky-300"
              @click="$emit('insert-callout', 'NOTE')"
            >
              [!NOTE]
            </button>
            <button
              type="button"
              class="rounded-lg bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-300"
              @click="$emit('insert-callout', 'IMPORTANT')"
            >
              [!IMPORTANT]
            </button>
            <button
              type="button"
              class="rounded-lg bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-300"
              @click="$emit('insert-callout', 'WARNING')"
            >
              [!WARNING]
            </button>
          </div>

          <!-- Configurable Variable Mark Button -->
          <button
            type="button"
            class="rounded-lg bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-[10px] font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-500/25 transition flex items-center gap-1 cursor-pointer"
            @click="$emit('insert-variable')"
            :title="store.t('Convertir texto seleccionado en campo configurable {{CAMPO:Valor}}')"
          >
            <i class="fa-solid fa-tag text-[9px]"></i>
            <span>{{ store.t("Marcar Campo") }}</span>
          </button>

          <!-- Page Break Insert -->
          <button
            type="button"
            class="rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-0.5 text-[10px] font-bold transition ml-1"
            :class="activeSection.pageBreakBefore ? 'bg-brand text-white border-brand' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300'"
            @click="activeSection.pageBreakBefore = !activeSection.pageBreakBefore"
          >
            <i class="fa-solid fa-file-export mr-1"></i>{{ store.t("Salto Hoja") }}
          </button>
        </div>

        <!-- Focused Section Editing Area -->
        <div class="flex-1 overflow-y-auto p-6 space-y-4">
          <!-- Section Header Field -->
          <div class="flex items-center gap-3">
            <span class="font-mono text-base sm:text-lg font-800 text-brand flex-none">
              {{ activeSectionNumber }}
            </span>
            <input
              v-model.trim="activeSection.title"
              class="font-head text-lg sm:text-xl font-800 tracking-tight text-slate-900 dark:text-white bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-brand focus:outline-none transition py-1 px-1 flex-1"
              :placeholder="store.t('Nombre de la Sección (ej. 1.1 Alcance y Entregables)')"
            />
          </div>

          <!-- Markdown Textarea -->
          <div class="relative flex-1 min-h-[300px]">
            <textarea
              ref="textareaEl"
              v-model="activeSection.content"
              class="w-full h-full min-h-[320px] rounded-2xl border border-slate-200/90 bg-white p-4 font-mono text-xs sm:text-sm text-slate-800 leading-relaxed dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-200 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition resize-y"
              :placeholder="store.t('Escribe aquí el contenido en Markdown para esta sección...')"
            ></textarea>
          </div>

          <!-- Live Formatted Preview Accordion -->
          <div class="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <i class="fa-solid fa-eye mr-1"></i>{{ store.t("Vista Previa Renderizada") }}
              </span>
              <span class="text-[10px] text-slate-400">{{ (activeSection.content || '').length }} {{ store.t("caracteres") }}</span>
            </div>
            <div class="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 overflow-x-auto space-y-2">
              <template v-for="(b, bIdx) in renderedBlocks" :key="bIdx">
                <div
                  v-if="b.type === 'callout'"
                  class="p-3 rounded-xl border-l-4 text-xs font-sans"
                  :class="b.tone === 'warning' ? 'bg-rose-50 border-rose-500 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200' : b.tone === 'important' ? 'bg-amber-50 border-amber-500 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200' : 'bg-sky-50 border-sky-500 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200'"
                >
                  <b class="mr-1">{{ b.title }}:</b> <span>{{ b.text }}</span>
                </div>
                <h1 v-else-if="b.type === 'h1'" class="font-head text-base font-800 text-slate-900 dark:text-white mt-3">{{ b.text }}</h1>
                <h2 v-else-if="b.type === 'h2'" class="font-head text-sm font-bold text-slate-900 dark:text-white mt-2">{{ b.text }}</h2>
                <h3 v-else-if="b.type === 'h3'" class="font-head text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">{{ b.text }}</h3>
                <blockquote v-else-if="b.type === 'quote'" class="border-l-2 border-slate-300 dark:border-slate-600 pl-3 italic text-xs text-slate-600 dark:text-slate-400 py-1">{{ b.text }}</blockquote>
                <div v-else-if="b.type === 'todo'" class="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <input type="checkbox" :checked="b.checked" disabled class="accent-brand" />
                  <span :class="b.checked ? 'line-through text-slate-400' : ''">{{ b.text }}</span>
                </div>
                <li v-else-if="b.type === 'list-item'" class="ml-4 list-disc text-xs text-slate-700 dark:text-slate-300">{{ b.text }}</li>
                <div v-else-if="b.type === 'table'" class="overflow-x-auto my-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <table class="w-full text-left">
                    <thead class="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th v-for="(h, hIdx) in b.headers" :key="hIdx" class="p-2 font-bold">{{ h }}</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                      <tr v-for="(row, rIdx) in b.rows" :key="rIdx">
                        <td v-for="(cell, cIdx) in row" :key="cIdx" class="p-2 font-mono text-[11px]">{{ cell }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p v-else class="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">{{ b.text }}</p>
              </template>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
      <i class="fa-solid fa-file-circle-plus text-4xl mb-3 text-slate-300 dark:text-slate-600"></i>
      <p class="text-sm font-bold text-slate-700 dark:text-slate-200">{{ store.t("Selecciona o crea una sección") }}</p>
      <div class="flex items-center gap-2 mt-4">
        <button
          type="button"
          class="btn-muted text-xs py-2 px-3 font-bold"
          @click="$emit('add-cover')"
        >
          <i class="fa-solid fa-file-shield mr-1.5 text-purple-600"></i>{{ store.t("Crear Portada") }}
        </button>
        <button
          type="button"
          class="btn-brand text-xs py-2 px-4 font-bold"
          @click="$emit('add-root-section')"
        >
          <i class="fa-solid fa-plus mr-1.5"></i>{{ store.t("Crear Sección 1.1") }}
        </button>
      </div>
    </div>
  </main>
</template>

<script>
const { ref, defineAsyncComponent, nextTick, onMounted, watch } = Vue;
const load = (p) => defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(p, window.sfcOptions));
const DocumentCoverEditor = load("./app/components/document/DocumentCoverEditor.vue?v=3");

export default {
  components: { DocumentCoverEditor },
  props: {
    store: Object,
    activeSection: Object,
    activeSectionNumber: String,
    renderedBlocks: Array,
    sectionChrome: Object,
    suppressPageChrome: Boolean,
  },
  emits: [
    "set-level",
    "insert-wrapper",
    "insert-table",
    "insert-prefix",
    "insert-callout",
    "insert-variable",
    "toggle-variable-drawer",
    "open-header-footer-modal",
    "add-root-section",
    "add-cover",
    "textarea-ready",
  ],
  setup(props, { emit }) {
    const textareaEl = ref(null);
    const registerTextarea = () => nextTick(() => emit("textarea-ready", textareaEl.value || null));
    onMounted(registerTextarea);
    watch(() => props.activeSection?.type, registerTextarea);
    return { textareaEl };
  }
};
</script>
