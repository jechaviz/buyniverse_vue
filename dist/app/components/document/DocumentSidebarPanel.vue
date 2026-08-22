<template>
  <aside class="w-72 sm:w-80 lg:w-96 flex-none border-r border-slate-200/90 bg-slate-100/70 dark:border-slate-800 dark:bg-slate-950/50 flex flex-col min-h-0">
    <!-- Sub-tabs: Miniaturas vs Árbol -->
    <div class="p-3 border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 flex items-center justify-between gap-2 flex-none flex-wrap">
      <div class="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800 text-xs">
        <button
          type="button"
          class="px-2 py-1 rounded-lg font-bold transition text-xs"
          :class="leftViewTab === 'thumbnails' ? 'bg-white text-brand shadow-xs dark:bg-slate-700' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'"
          @click="$emit('update:leftViewTab', 'thumbnails')"
        >
          <i class="fa-solid fa-file-invoice mr-1"></i>{{ store.t("Hojas Carta") }}
        </button>
        <button
          type="button"
          class="px-2 py-1 rounded-lg font-bold transition text-xs"
          :class="leftViewTab === 'tree' ? 'bg-white text-brand shadow-xs dark:bg-slate-700' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'"
          @click="$emit('update:leftViewTab', 'tree')"
        >
          <i class="fa-solid fa-list-ol mr-1"></i>{{ store.t("Estructura") }}
        </button>
      </div>

      <!-- Quick Add Actions Dropdown/Group -->
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="rounded-lg bg-purple-50 dark:bg-purple-900/30 px-2 py-1 text-[11px] font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition"
          @click="$emit('add-cover')"
          :title="store.t('Añadir Portada de Sección')"
        >
          <i class="fa-solid fa-file-shield mr-1"></i>{{ store.t("+ Portada") }}
        </button>
        <button
          type="button"
          class="rounded-lg bg-brand-50 dark:bg-brand/20 px-2 py-1 text-[11px] font-bold text-brand hover:bg-brand hover:text-white transition"
          @click="$emit('add-root-section')"
          :title="store.t('Añadir Sección')"
        >
          <i class="fa-solid fa-plus mr-1"></i>{{ store.t("+ Sec") }}
        </button>
        <button
          type="button"
          class="rounded-lg bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition"
          @click="$emit('add-section-end')"
          :title="store.t('Añadir Fin de Sección / Firmas')"
        >
          <i class="fa-solid fa-signature mr-1"></i>{{ store.t("+ Fin") }}
        </button>
      </div>
    </div>

    <!-- Tab 1: Letter Page Thumbnails Stream -->
    <div
      v-if="leftViewTab === 'thumbnails'"
      class="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin"
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
          <!-- Thumbnail Running Header (unless cover suppressed) -->
          <div
            v-if="!shouldSuppressHeaderFooter(page) && chromeForPage(page).headerEnabled"
            class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1 text-[8px] font-mono text-slate-400 flex-none"
          >
            <span class="truncate max-w-[130px] font-bold text-slate-600 dark:text-slate-300 uppercase">{{ chromeForPage(page).headerText }}</span>
            <span>{{ new Date().toLocaleDateString() }}</span>
          </div>

          <!-- Thumbnail Page Content Body with Vertical Positioning -->
          <div
            class="flex-1 overflow-hidden py-2 space-y-2 pointer-events-none flex flex-col"
            :class="page.sections[0]?.alignVertical === 'bottom' ? 'justify-end' : page.sections[0]?.alignVertical === 'top' ? 'justify-start' : page.sections[0]?.type === 'cover' ? 'justify-center text-center' : 'justify-start'"
          >
            <div
              v-for="sec in page.sections"
              :key="sec.id"
              class="space-y-1"
            >
              <div class="flex items-center gap-1" :class="sec.type === 'cover' && (!sec.alignVertical || sec.alignVertical === 'center') ? 'justify-center' : ''">
                <span
                  v-if="sec.type === 'cover'"
                  class="badge bg-purple-100 text-purple-800 text-[8px] py-0 px-1 dark:bg-purple-900/50 dark:text-purple-300"
                >
                  PORTADA
                </span>
                <span
                  v-else-if="sec.type === 'section_end'"
                  class="badge bg-emerald-100 text-emerald-800 text-[8px] py-0 px-1 dark:bg-emerald-900/50 dark:text-emerald-300"
                >
                  FIN SECCIÓN
                </span>
                <b
                  class="font-head font-bold text-slate-900 dark:text-white truncate"
                  :class="sec.level === 1 ? 'text-[10px] text-brand' : sec.level === 2 ? 'text-[9px]' : 'text-[8px] text-slate-600'"
                >
                  {{ sec.type === 'standard' ? getSectionNumber(sec) : '' }} {{ sec.title || store.t("Sin Título") }}
                </b>
              </div>
              <div v-if="sec.subtitle" class="text-[8px] font-semibold text-brand truncate">
                {{ sec.subtitle }}
              </div>
              <div class="text-[7.5px] leading-tight text-slate-500 dark:text-slate-400 line-clamp-4 font-sans">
                {{ sec.content || '...' }}
              </div>
              <div v-if="sec.type === 'cover' && sec.legalDisclaimer" class="text-[7px] text-amber-700 bg-amber-50 dark:bg-amber-950/30 p-1 rounded">
                🔒 {{ sec.legalDisclaimer }}
              </div>
              <div v-if="sec.type === 'section_end' && sec.showSignatures" class="text-[7px] text-slate-400 border-t border-dashed pt-1">
                ✍️ [Firmas Comprador / Proveedor]
              </div>
            </div>
          </div>

          <!-- Thumbnail Running Footer -->
          <div
            v-if="!shouldSuppressHeaderFooter(page) && chromeForPage(page).footerEnabled"
            class="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-1 text-[8px] font-mono text-slate-400 flex-none"
          >
            <span class="truncate max-w-[120px]">{{ chromeForPage(page).footerText }}</span>
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

    <!-- Tab 2: Hierarchical Tree Navigation -->
    <div
      v-else
      class="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin"
    >
      <div
        v-for="sec in flatNumberedSections"
        :key="sec.id"
        class="group flex items-center justify-between rounded-xl p-2 transition cursor-pointer"
        :class="activeSectionId === sec.id ? 'bg-brand/10 text-brand dark:bg-brand/20 font-bold' : 'hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'"
        :style="{ paddingLeft: sec.type !== 'standard' ? '0.5rem' : `${(sec.level - 1) * 0.85 + 0.5}rem` }"
        @click="$emit('select-section', sec)"
      >
        <div class="flex items-center gap-2 min-w-0">
          <i
            v-if="sec.type === 'cover'"
            class="fa-solid fa-file-shield text-purple-600 text-xs flex-none"
          ></i>
          <i
            v-else-if="sec.type === 'section_end'"
            class="fa-solid fa-signature text-emerald-600 text-xs flex-none"
          ></i>
          <span
            v-else
            class="font-mono text-[10px] font-bold opacity-60 flex-none"
          >
            {{ sec.numberStr }}
          </span>

          <span class="truncate text-xs">
            {{ sec.title || store.t("Sección Sin Título") }}
          </span>
        </div>

        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
          <button
            v-if="sec.type === 'standard' && sec.level < 3"
            type="button"
            class="p-1 text-slate-400 hover:text-brand"
            @click.stop="$emit('add-sub-section', sec)"
            :title="store.t('Añadir subsección')"
          >
            <i class="fa-solid fa-plus text-[10px]"></i>
          </button>
          <button
            type="button"
            class="p-1 text-slate-400 hover:text-rose-500"
            @click.stop="$emit('delete-section', sec.id)"
            :title="store.t('Eliminar sección')"
          >
            <i class="fa-solid fa-trash-can text-[10px]"></i>
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<script>
export default {
  name: "DocumentSidebarPanel",
  props: {
    store: Object,
    sections: Array,
    activeSectionId: String,
    flatNumberedSections: Array,
    estimatedPages: Array,
    leftViewTab: String,
    headerText: String,
    footerText: String,
    pageNumberFormat: String,
    docTitle: String,
    showRunningHeader: Boolean,
    suppressOnCover: { type: Boolean, default: true },
    resolveSectionChrome: Function,
  },
  emits: [
    "update:leftViewTab",
    "update:activeSectionId",
    "add-root-section",
    "add-sub-section",
    "add-cover",
    "add-section-end",
    "delete-section",
    "select-section",
  ],
  setup(props) {
    function isPageActive(page) {
      return page.sections.some((s) => s.id === props.activeSectionId);
    }

    function getSectionNumber(sec) {
      const match = props.flatNumberedSections.find((s) => s.id === sec.id);
      return match ? match.numberStr : "1.";
    }

    function shouldSuppressHeaderFooter(page) {
      if (!props.suppressOnCover) return false;
      return page.sections.some((s) => s.type === "cover");
    }

    function chromeForPage(page) {
      const firstSection = page?.sections?.[0];
      if (typeof props.resolveSectionChrome === "function") return props.resolveSectionChrome(firstSection);
      return {
        headerEnabled: props.showRunningHeader !== false,
        headerText: props.headerText || props.docTitle,
        footerEnabled: true,
        footerText: props.footerText || props.store.t("Confidential"),
      };
    }

    function formatPageNumber(num, total) {
      if (props.pageNumberFormat === "none") return "";
      if (props.pageNumberFormat === "X / Y") return `${num} / ${total}`;
      if (props.pageNumberFormat === "Page X") return `Página ${num}`;
      return `Página ${num} de ${total}`;
    }

    return {
      isPageActive,
      getSectionNumber,
      shouldSuppressHeaderFooter,
      chromeForPage,
      formatPageNumber,
    };
  },
};
</script>
