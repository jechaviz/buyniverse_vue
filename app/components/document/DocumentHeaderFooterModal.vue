<template>
  <div class="fixed inset-0 z-[1000000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" :aria-label="store.t('Section header and footer')">
    <div class="w-full max-w-xl space-y-4 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
      <header class="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div class="flex items-center gap-2.5">
          <span class="grid h-8 w-8 place-items-center rounded-xl bg-brand/10 text-brand text-sm"><i class="fa-solid fa-heading"></i></span>
          <div>
            <h3 class="font-head text-sm font-800 text-slate-900 dark:text-white">{{ store.t('Section header and footer') }}</h3>
            <p class="text-[11px] text-slate-400">{{ store.t('This page chrome belongs to the active section.') }}</p>
          </div>
        </div>
        <button type="button" class="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800" :aria-label="store.t('Close')" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
      </header>

      <div class="grid gap-3 sm:grid-cols-2">
        <section class="space-y-2 rounded-2xl border border-slate-200/80 p-3 dark:border-slate-700/80">
          <div class="flex items-center justify-between gap-2">
            <label class="font-bold text-slate-700 dark:text-slate-200"><i class="fa-solid fa-heading mr-1.5 text-brand"></i>{{ store.t('Running header') }}</label>
            <label class="flex cursor-pointer items-center gap-1 text-[11px] text-slate-400"><input type="checkbox" class="accent-brand" :checked="chrome.headerEnabled" @change="patch({ headerEnabled: $event.target.checked })" />{{ store.t('Show') }}</label>
          </div>
          <select class="field py-1.5 text-xs" :value="chrome.headerMode" :disabled="!chrome.headerEnabled" @change="patch({ headerMode: $event.target.value })">
            <option value="section_title">{{ store.t('Section title · dynamic') }}</option>
            <option value="document_title">{{ store.t('Document title') }}</option>
            <option value="custom">{{ store.t('Custom text') }}</option>
          </select>
          <DocumentInlineRichText v-if="chrome.headerMode === 'custom'" :store="store" :model-value="chrome.headerText" :label="store.t('Header text')" :placeholder="store.t('Header text')" @update:model-value="patch({ headerText: $event })" />
          <p class="text-[10px] leading-snug text-slate-400">{{ chrome.headerMode === 'section_title' ? store.t('It updates when this section title changes.') : store.t('Only this section uses this header.') }}</p>
        </section>

        <section class="space-y-2 rounded-2xl border border-slate-200/80 p-3 dark:border-slate-700/80">
          <div class="flex items-center justify-between gap-2">
            <label class="font-bold text-slate-700 dark:text-slate-200"><i class="fa-solid fa-shoe-prints mr-1.5 text-brand"></i>{{ store.t('Running footer') }}</label>
            <label class="flex cursor-pointer items-center gap-1 text-[11px] text-slate-400"><input type="checkbox" class="accent-brand" :checked="chrome.footerEnabled" @change="patch({ footerEnabled: $event.target.checked })" />{{ store.t('Show') }}</label>
          </div>
          <select class="field py-1.5 text-xs" :value="chrome.footerMode" :disabled="!chrome.footerEnabled" @change="patch({ footerMode: $event.target.value })">
            <option value="section_title">{{ store.t('Section title · dynamic') }}</option>
            <option value="document_title">{{ store.t('Document title') }}</option>
            <option value="custom">{{ store.t('Custom text') }}</option>
          </select>
          <DocumentInlineRichText v-if="chrome.footerMode === 'custom'" :store="store" :model-value="chrome.footerText" :label="store.t('Footer text')" :placeholder="store.t('Footer text')" @update:model-value="patch({ footerText: $event })" />
          <p class="text-[10px] leading-snug text-slate-400">{{ chrome.footerMode === 'section_title' ? store.t('It updates when this section title changes.') : store.t('Only this section uses this footer.') }}</p>
        </section>
      </div>

      <section class="rounded-2xl border border-slate-200/80 p-3 dark:border-slate-700/80">
        <div class="mb-2 flex items-center justify-between gap-3"><b class="text-xs text-slate-700 dark:text-slate-200">{{ store.t('Document page settings') }}</b><span class="text-[10px] text-slate-400">{{ store.t('Shared across the document') }}</span></div>
        <div class="grid grid-cols-2 gap-3">
          <label class="space-y-1 text-xs font-bold text-slate-700 dark:text-slate-300"><span>{{ store.t('Pagination style') }}</span><select class="field py-1.5 text-xs font-normal" :value="pageNumberFormat" @change="$emit('update:pageNumberFormat', $event.target.value)"><option value="Page X of Y">{{ store.t('Page X of Y') }}</option><option value="X / Y">{{ store.t('X / Y') }}</option><option value="Page X">{{ store.t('Page X') }}</option><option value="none">{{ store.t('No pagination') }}</option></select></label>
          <label class="space-y-1 text-xs font-bold text-slate-700 dark:text-slate-300"><span>{{ store.t('Watermark') }}</span><select class="field py-1.5 text-xs font-normal" :value="watermarkText" @change="$emit('update:watermarkText', $event.target.value)"><option value="">{{ store.t('None') }}</option><option value="CONFIDENCIAL">{{ store.t('CONFIDENTIAL') }}</option><option value="BORRADOR">{{ store.t('DRAFT') }}</option><option value="BAFO 2026">BAFO 2026</option><option value="PROTEGIDO NDA">{{ store.t('NDA PROTECTED') }}</option></select></label>
        </div>
        <label class="mt-3 flex cursor-pointer items-start gap-2 text-xs font-bold text-slate-700 dark:text-slate-200"><input type="checkbox" class="mt-0.5 accent-brand" :checked="suppressOnCover" @change="$emit('update:suppressOnCover', $event.target.checked)" /><span>{{ store.t('Hide header and footer on covers') }}<small class="mt-0.5 block font-normal text-slate-400">{{ store.t('Covers retain a clean full-page layout.') }}</small></span></label>
      </section>

      <footer class="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <button type="button" class="btn-muted px-3 py-1.5 text-xs font-bold" @click="$emit('apply-to-all', chrome)"><i class="fa-solid fa-arrows-rotate mr-1 text-brand"></i>{{ store.t('Apply this format to all sections') }}</button>
        <button type="button" class="btn-brand px-4 py-1.5 text-xs font-bold" @click="$emit('close')"><i class="fa-solid fa-check mr-1"></i>{{ store.t('Done') }}</button>
      </footer>
    </div>
  </div>
</template>

<script>
const { computed, defineAsyncComponent } = Vue;
const load = (p) => defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(p, window.sfcOptions));
const DocumentInlineRichText = load("./app/components/document/DocumentInlineRichText.vue?v=2");

export default {
  name: "DocumentHeaderFooterModal",
  components: { DocumentInlineRichText },
  props: {
    store: Object,
    activeSection: Object,
    docTitle: String,
    defaultHeaderText: String,
    defaultFooterText: String,
    pageNumberFormat: String,
    showRunningHeader: Boolean,
    watermarkText: String,
    suppressOnCover: Boolean,
  },
  emits: ["close", "update:sectionChrome", "apply-to-all", "update:pageNumberFormat", "update:watermarkText", "update:suppressOnCover"],
  setup(props, { emit }) {
    const fallback = computed(() => ({
      headerEnabled: props.showRunningHeader !== false,
      headerMode: "section_title",
      headerText: props.defaultHeaderText || props.docTitle || "",
      footerEnabled: true,
      footerMode: "custom",
      footerText: props.defaultFooterText || "",
    }));
    const chrome = computed(() => ({ ...fallback.value, ...(props.activeSection?.headerFooter || {}) }));
    const patch = (next) => emit("update:sectionChrome", { ...chrome.value, ...next });
    return { chrome, patch };
  },
};
</script>
