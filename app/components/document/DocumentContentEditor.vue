<template>
  <main class="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 overflow-hidden">
    <template v-if="activeSection">
      <!-- Inline Markdown Styling Toolbar -->
      <div class="flex flex-wrap items-center gap-1 border-b border-slate-200/90 bg-slate-50/90 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900/90 flex-none overflow-x-auto">
        <!-- Level Selector -->
        <div class="flex items-center gap-1 mr-2 border-r border-slate-200 dark:border-slate-700 pr-2">
          <button
            type="button"
            class="rounded-lg px-2 py-1 text-xs font-bold transition"
            :class="activeSection.level === 1 ? 'bg-brand text-white' : 'btn-muted'"
            @click="$emit('set-level', 1)"
          >
            1. H1
          </button>
          <button
            type="button"
            class="rounded-lg px-2 py-1 text-xs font-bold transition"
            :class="activeSection.level === 2 ? 'bg-brand text-white' : 'btn-muted'"
            @click="$emit('set-level', 2)"
          >
            1.1 H2
          </button>
          <button
            type="button"
            class="rounded-lg px-2 py-1 text-xs font-bold transition"
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
            class="grid h-7 w-7 place-items-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 font-bold"
            @click="$emit('insert-wrapper', '**', '**', 'texto en negrita')"
            :title="store.t('Negrita (**)')"
          >
            <b>B</b>
          </button>
          <button
            type="button"
            class="grid h-7 w-7 place-items-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 italic"
            @click="$emit('insert-wrapper', '*', '*', 'texto en cursiva')"
            :title="store.t('Cursiva (*)')"
          >
            <i>I</i>
          </button>
          <button
            type="button"
            class="grid h-7 w-7 place-items-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 line-through"
            @click="$emit('insert-wrapper', '~~', '~~', 'texto tachado')"
            :title="store.t('Tachado (~~)')"
          >
            S
          </button>
          <button
            type="button"
            class="grid h-7 w-7 place-items-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 font-mono"
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
            @click="$emit('insert-prefix', '1. ')"
            :title="store.t('Lista numerada')"
          >
            <i class="fa-solid fa-list-ol"></i>
          </button>
          <button
            type="button"
            class="grid h-7 w-7 place-items-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-200"
            @click="$emit('insert-prefix', '- [ ] ')"
            :title="store.t('Checklist de Tareas')"
          >
            <i class="fa-solid fa-square-check"></i>
          </button>
          <button
            type="button"
            class="grid h-7 w-7 place-items-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-200"
            @click="$emit('insert-prefix', '> ')"
            :title="store.t('Cita en bloque')"
          >
            <i class="fa-solid fa-quote-left"></i>
          </button>
        </div>

        <!-- Callouts / Risk Badges -->
        <div class="flex items-center gap-1 mr-2 border-r border-slate-200 dark:border-slate-700 pr-2">
          <button
            type="button"
            class="rounded-lg bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 text-[10px] font-bold text-sky-600 dark:text-sky-300 hover:bg-sky-100 transition"
            @click="$emit('insert-callout', 'NOTE')"
          >
            [!NOTE]
          </button>
          <button
            type="button"
            class="rounded-lg bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-300 hover:bg-amber-100 transition"
            @click="$emit('insert-callout', 'IMPORTANT')"
          >
            [!IMPORTANT]
          </button>
          <button
            type="button"
            class="rounded-lg bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-300 hover:bg-rose-100 transition"
            @click="$emit('insert-callout', 'WARNING')"
          >
            [!WARNING]
          </button>
        </div>

        <!-- Page Break Insert -->
        <button
          type="button"
          class="rounded-lg border border-slate-300 dark:border-slate-700 px-2 py-0.5 text-[10px] font-bold transition"
          :class="activeSection.pageBreakBefore ? 'bg-brand text-white border-brand' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'"
          @click="activeSection.pageBreakBefore = !activeSection.pageBreakBefore"
        >
          <i class="fa-solid fa-file-export mr-1"></i>{{ store.t("Salto de Hoja Carta") }}
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
            class="w-full h-full min-h-[340px] rounded-2xl border border-slate-200/90 bg-white p-4 font-mono text-xs sm:text-sm text-slate-800 leading-relaxed dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-200 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition resize-y"
            :placeholder="store.t('Escribe aquí el contenido en Markdown para esta sección... Puedes incluir tablas, listas de entregables, fórmulas y reglas de negocio.')"
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
    </template>

    <div v-else class="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
      <i class="fa-solid fa-file-circle-plus text-4xl mb-3 text-slate-300 dark:text-slate-600"></i>
      <p class="text-sm font-bold text-slate-700 dark:text-slate-200">{{ store.t("Selecciona o crea una sección") }}</p>
      <p class="text-xs text-slate-400 mt-1 max-w-sm">{{ store.t("Organiza tu documento con numeración arborescente 1.1, 1.1.1 para estructurar pliegos de compra o contratos.") }}</p>
      <button
        type="button"
        class="btn-brand mt-4 text-xs py-2 px-4 font-bold"
        @click="$emit('add-root-section')"
      >
        <i class="fa-solid fa-plus mr-1.5"></i>{{ store.t("Crear Primera Sección") }}
      </button>
    </div>
  </main>
</template>

<script>
const { ref } = Vue;

export default {
  props: {
    store: Object,
    activeSection: Object,
    activeSectionNumber: String,
    renderedBlocks: Array,
  },
  emits: [
    "set-level",
    "insert-wrapper",
    "insert-table",
    "insert-prefix",
    "insert-callout",
    "add-root-section",
  ],
  setup() {
    const textareaEl = ref(null);
    return { textareaEl };
  }
};
</script>
