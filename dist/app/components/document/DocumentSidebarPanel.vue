<template>
  <aside class="w-72 sm:w-80 lg:w-96 flex-none border-r border-slate-200/90 bg-slate-100/70 dark:border-slate-800 dark:bg-slate-950/50 flex flex-col min-h-0">
    <!-- Sub-tabs: Miniaturas vs Árbol -->
    <div class="p-3 border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 flex items-center justify-between gap-2 flex-none">
      <div class="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800 text-xs">
        <button
          type="button"
          class="px-2.5 py-1 rounded-lg font-bold transition text-xs"
          :class="leftViewTab === 'thumbnails' ? 'bg-white text-brand shadow-xs dark:bg-slate-700' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'"
          @click="$emit('update:leftViewTab', 'thumbnails')"
        >
          <i class="fa-solid fa-file-invoice mr-1"></i>{{ store.t("Hojas Carta") }}
        </button>
        <button
          type="button"
          class="px-2.5 py-1 rounded-lg font-bold transition text-xs"
          :class="leftViewTab === 'tree' ? 'bg-white text-brand shadow-xs dark:bg-slate-700' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'"
          @click="$emit('update:leftViewTab', 'tree')"
        >
          <i class="fa-solid fa-list-ol mr-1"></i>{{ store.t("Estructura 1.1") }}
        </button>
      </div>

      <button
        type="button"
        class="rounded-xl bg-brand-50 dark:bg-brand/20 px-2 py-1 text-xs font-bold text-brand hover:bg-brand hover:text-white transition flex items-center gap-1"
        @click="$emit('add-root-section')"
        :title="store.t('Añadir Sección Principal')"
      >
        <i class="fa-solid fa-plus text-[10px]"></i>
        <span>{{ store.t("Sección") }}</span>
      </button>
    </div>

    <!-- Tab 1: Letter Page Thumbnails Stream -->
    <div
      v-if="leftViewTab === 'thumbnails'"
      class="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin"
    >
      <div
        v-for="(page, pageIdx) in estimatedPages"
        :key="pageIdx"
        class="group relative cursor-pointer"
        @click="$emit('select-section', page.sections[0])"
      >
        <!-- Letter Thumbnail Canvas Aspect Ratio 8.5 x 11 -->
        <div
          class="w-full aspect-[8.5/11] rounded-2xl border bg-white p-3 shadow-md transition-all hover:shadow-xl dark:bg-slate-900 dark:border-slate-800 flex flex-col justify-between overflow-hidden relative"
          :class="isPageActive(page) ? 'ring-2 ring-brand border-brand' : 'border-slate-200/90'"
        >
          <!-- Thumbnail Running Header -->
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1 text-[8px] font-mono text-slate-400 flex-none">
            <span class="truncate max-w-[130px] font-bold text-slate-600 dark:text-slate-300 uppercase">{{ headerText || docTitle }}</span>
            <span>{{ new Date().toLocaleDateString() }}</span>
          </div>

          <!-- Thumbnail Page Content Body -->
          <div class="flex-1 overflow-hidden py-2 space-y-2 pointer-events-none">
            <div
              v-for="sec in page.sections"
              :key="sec.id"
              class="space-y-1"
            >
              <div class="flex items-center gap-1">
                <b
                  class="font-head font-bold text-slate-900 dark:text-white truncate"
                  :class="sec.level === 1 ? 'text-[10px] text-brand' : sec.level === 2 ? 'text-[9px]' : 'text-[8px] text-slate-600'"
                >
                  {{ getSectionNumber(sec) }} {{ sec.title || store.t("Sección Sin Título") }}
                </b>
              </div>
              <div class="text-[7.5px] leading-tight text-slate-500 dark:text-slate-400 line-clamp-4 font-sans">
                {{ sec.content || '...' }}
              </div>
            </div>
          </div>

          <!-- Thumbnail Running Footer -->
          <div class="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-1 text-[8px] font-mono text-slate-400 flex-none">
            <span class="truncate max-w-[120px]">{{ footerText || 'CONFIDENTIAL' }}</span>
            <b class="text-slate-700 dark:text-slate-200 font-bold">
              {{ formatPageNumber(pageIdx + 1, estimatedPages.length) }}
            </b>
          </div>

          <!-- Page Number Tag on hover -->
          <span class="absolute top-2 right-2 rounded-md bg-slate-900/80 text-white text-[9px] font-mono px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition shadow-xs">
            Hoja {{ pageIdx + 1 }}
          </span>
        </div>
      </div>
    </div>

    <!-- Tab 2: Hierarchical Tree Navigation (1, 1.1, 1.1.1) -->
    <div
      v-else
      class="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin"
    >
      <div
        v-for="sec in flatNumberedSections"
        :key="sec.id"
        class="rounded-xl border p-2.5 transition flex items-center justify-between gap-2 cursor-pointer group"
        :class="activeSectionId === sec.id ? 'border-brand bg-brand-50/60 dark:bg-brand/15 dark:border-brand/50 shadow-xs' : 'border-slate-200/80 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60'"
        :style="{ marginLeft: `${(sec.level - 1) * 12}px` }"
        @click="$emit('update:activeSectionId', sec.id)"
      >
        <div class="flex items-center gap-2 min-w-0 flex-1">
          <span class="font-mono text-[11px] font-800 text-brand flex-none">
            {{ sec.numberStr }}
          </span>
          <span class="font-head text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
            {{ sec.title || store.t("Sin título") }}
          </span>
        </div>

        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
          <button
            v-if="sec.level < 3"
            type="button"
            class="h-6 w-6 rounded bg-slate-100 dark:bg-slate-800 hover:bg-brand-50 hover:text-brand transition grid place-items-center text-[10px]"
            @click.stop="$emit('add-sub-section', sec)"
            :title="store.t('Añadir Subsección')"
          >
            <i class="fa-solid fa-turn-down-right text-[8px]"></i>
          </button>
          <button
            type="button"
            class="h-6 w-6 rounded bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 transition grid place-items-center text-[10px]"
            @click.stop="$emit('delete-section', sec.id)"
            :title="store.t('Eliminar')"
          >
            <i class="fa-solid fa-trash text-[8px]"></i>
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<script>
export default {
  props: {
    store: Object,
    leftViewTab: String,
    estimatedPages: Array,
    headerText: String,
    docTitle: String,
    footerText: String,
    pageNumberFormat: String,
    activeSection: Object,
    activeSectionId: String,
    flatNumberedSections: Array,
  },
  emits: [
    "update:leftViewTab",
    "update:activeSectionId",
    "add-root-section",
    "add-sub-section",
    "delete-section",
    "select-section"
  ],
  setup(props) {
    function isPageActive(page) {
      if (!props.activeSection) return false;
      return page.sections.some((s) => s.id === props.activeSection.id);
    }

    function getSectionNumber(sec) {
      const match = props.flatNumberedSections.find((s) => s.id === sec.id);
      return match ? match.numberStr : "1.";
    }

    function formatPageNumber(page, total) {
      if (props.pageNumberFormat === "none") return "";
      if (props.pageNumberFormat === "X / Y") return `${page} / ${total}`;
      if (props.pageNumberFormat === "Page X") return `Página ${page}`;
      return `Página ${page} de ${total}`;
    }

    return { isPageActive, getSectionNumber, formatPageNumber };
  }
};
</script>
