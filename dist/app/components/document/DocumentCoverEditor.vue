<template>
  <div class="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 overflow-hidden">
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/90 bg-slate-50/90 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900/90 flex-none">
      <div class="flex items-center gap-2">
        <span class="badge text-[11px] font-bold" :class="activeSection.type === 'cover' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'">
          <i :class="activeSection.type === 'cover' ? 'fa-solid fa-file-shield mr-1' : 'fa-solid fa-file-circle-check mr-1'"></i>
          {{ activeSection.type === 'cover' ? store.t('Section cover') : store.t('Section end / signatures') }}
        </span>
        <div class="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 text-xs dark:border-slate-700 dark:bg-slate-800">
          <span class="px-1.5 text-[10px] font-bold uppercase text-slate-400">{{ store.t('Page position') }}</span>
          <button v-for="placement in pagePlacements" :key="placement.value" type="button" class="rounded-lg px-2 py-0.5 text-[11px] font-bold transition" :class="activeSection.alignVertical === placement.value ? 'bg-brand text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'" :title="store.t(placement.title)" @click="activeSection.alignVertical = placement.value">
            <i class="fa-solid mr-1" :class="placement.icon"></i>{{ store.t(placement.label) }}
          </button>
        </div>
      </div>
      <div class="flex items-center gap-1.5">
        <button v-if="activeSection.type === 'cover'" type="button" class="btn-muted px-2.5 py-1 text-xs font-bold" @click="applyNdaCoverPreset">
          <i class="fa-solid fa-user-lock mr-1 text-brand"></i>{{ store.t('NDA full preset') }}
        </button>
        <button v-if="activeSection.type === 'section_end'" type="button" class="btn-muted px-2.5 py-1 text-xs font-bold" @click="activeSection.showSignatures = !activeSection.showSignatures">
          <i class="fa-solid fa-signature mr-1 text-brand"></i>{{ store.t('Signature block') }}
        </button>
      </div>
    </div>

    <div class="grid flex-1 grid-cols-1 gap-6 overflow-y-auto p-5 lg:grid-cols-2">
      <div class="space-y-4 text-xs">
        <section class="space-y-1.5">
          <label class="block font-bold text-slate-700 dark:text-slate-300">{{ activeSection.type === 'cover' ? store.t('Cover title') : store.t('Closing title') }}</label>
          <DocumentBlockStyleToolbar :store="store" :label="store.t('Title')" :model-value="blockStyle('title')" :presets="blockPresets.title" @update:model-value="setBlockStyle('title', $event)" />
          <input v-model="activeSection.title" class="field text-sm font-bold" :placeholder="activeSection.type === 'cover' ? store.t('TECHNICAL SPECIFICATION BRIEF') : store.t('SECTION CLOSE & ACCEPTANCE')" />
        </section>

        <section v-if="activeSection.type === 'cover'" class="space-y-1.5">
          <label class="block font-bold text-slate-700 dark:text-slate-300">{{ store.t('Subtitle / purchase modality') }}</label>
          <DocumentBlockStyleToolbar :store="store" :label="store.t('Subtitle')" :model-value="blockStyle('subtitle')" :presets="blockPresets.subtitle" @update:model-value="setBlockStyle('subtitle', $event)" />
          <input v-model="activeSection.subtitle" class="field text-xs" :placeholder="store.t('Reverse auction BAFO · RFQ-2026-042')" />
        </section>

        <section class="space-y-1.5">
          <label class="block font-bold text-slate-700 dark:text-slate-300">{{ store.t('Executive summary') }}</label>
          <DocumentBlockStyleToolbar :store="store" :label="store.t('Executive summary')" :model-value="blockStyle('body')" :presets="blockPresets.body" @update:model-value="setBlockStyle('body', $event)" />
          <textarea v-model="activeSection.content" rows="3" class="field text-xs font-mono" :placeholder="store.t('Executive summary, scope and mandatory requirements...')"></textarea>
        </section>

        <template v-if="activeSection.type === 'cover'">
          <section class="space-y-1.5">
            <label class="block font-bold text-slate-700 dark:text-slate-300"><i class="fa-solid fa-shield-halved mr-1 text-brand"></i>{{ store.t('Legal notice / NDA confidentiality') }}</label>
            <DocumentBlockStyleToolbar :store="store" :label="store.t('Legal notice')" :model-value="blockStyle('legal')" :presets="blockPresets.legal" @update:model-value="setBlockStyle('legal', $event)" />
            <textarea v-model="activeSection.legalDisclaimer" rows="2" class="field text-xs" :placeholder="store.t('This document contains trade secrets protected by NDA...')"></textarea>
          </section>
          <section class="space-y-1.5">
            <label class="block font-bold text-slate-700 dark:text-slate-300"><i class="fa-solid fa-code-branch mr-1 text-brand"></i>{{ store.t('Version control and metadata') }}</label>
            <DocumentBlockStyleToolbar :store="store" :label="store.t('Version metadata')" :model-value="blockStyle('version')" :presets="blockPresets.version" @update:model-value="setBlockStyle('version', $event)" />
            <input v-model="activeSection.versionText" class="field text-xs" :placeholder="store.t('v2.1 · 20/08/2026 · Approved by the sourcing committee')" />
          </section>
        </template>
      </div>

      <div class="flex flex-col items-center justify-center p-2">
        <div class="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400"><i class="fa-solid fa-eye text-brand"></i>{{ store.t('Letter-size live preview') }}</div>
        <div class="flex aspect-[8.5/11] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-300 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div v-if="sectionChrome?.headerEnabled && !suppressPageChrome" class="mb-3 flex items-center justify-between border-b border-slate-100 pb-1 text-[8px] font-mono text-slate-400 dark:border-slate-800"><span class="truncate font-bold uppercase">{{ sectionChrome.headerText }}</span><span>{{ previewDate }}</span></div>
          <div class="flex min-h-0 flex-1 flex-col" :class="pagePositionClass">
            <div v-if="activeSection.type === 'cover'" class="w-full space-y-2.5">
              <div :class="blockContainerClass('legal')"><span class="inline-block rounded-lg bg-brand/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-brand">{{ store.t('Confidential document · BAFO') }}</span></div>
              <div :class="blockContainerClass('title')"><h2 class="font-head font-800 leading-tight" :class="blockTextClass('title')">{{ activeSection.title || store.t('COVER TITLE') }}</h2></div>
              <div v-if="activeSection.subtitle" :class="blockContainerClass('subtitle')"><p class="font-semibold" :class="blockTextClass('subtitle')">{{ activeSection.subtitle }}</p></div>
              <div v-if="activeSection.content" :class="blockContainerClass('body')"><p class="leading-relaxed" :class="blockTextClass('body')">{{ activeSection.content }}</p></div>
              <div v-if="activeSection.legalDisclaimer" class="rounded-xl border p-2.5" :class="legalSurfaceClass"><div :class="blockContainerClass('legal')"><p class="leading-relaxed" :class="blockTextClass('legal')"><b class="mb-0.5 block"><i class="fa-solid fa-lock mr-1"></i>{{ store.t('NDA & confidentiality') }}</b>{{ activeSection.legalDisclaimer }}</p></div></div>
              <div v-if="activeSection.versionText" class="border-t border-slate-100 pt-2 dark:border-slate-800" :class="blockContainerClass('version')"><p class="font-mono" :class="blockTextClass('version')">{{ activeSection.versionText }}</p></div>
            </div>
            <div v-else class="w-full space-y-3">
              <div :class="blockContainerClass('title')"><span class="inline-block rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-emerald-600">{{ store.t('Section close') }}</span><h2 class="mt-2 font-head font-800" :class="blockTextClass('title')">{{ activeSection.title || store.t('Section end') }}</h2></div>
              <div v-if="activeSection.content" :class="blockContainerClass('body')"><p class="leading-relaxed" :class="blockTextClass('body')">{{ activeSection.content }}</p></div>
              <div v-if="activeSection.showSignatures" class="grid grid-cols-2 gap-2 border-t border-slate-200 pt-3 text-center font-mono text-[9px] text-slate-500 dark:border-slate-700"><div class="border-b border-dashed border-slate-400 pb-4">{{ store.t('Buyer signature') }}</div><div class="border-b border-dashed border-slate-400 pb-4">{{ store.t('Supplier signature') }}</div></div>
            </div>
          </div>
          <div v-if="sectionChrome?.footerEnabled && !suppressPageChrome" class="mt-3 flex items-center justify-between border-t border-slate-100 pt-1 text-[8px] font-mono text-slate-400 dark:border-slate-800"><span class="truncate">{{ sectionChrome.footerText }}</span><span>{{ store.t('Page 1') }}</span></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const { computed, defineAsyncComponent } = Vue;
const load = (p) => defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(p, window.sfcOptions));
const DocumentBlockStyleToolbar = load("./app/components/document/DocumentBlockStyleToolbar.vue?v=2");

export default {
  name: "DocumentCoverEditor",
  components: { DocumentBlockStyleToolbar },
  props: { store: Object, activeSection: Object, sectionChrome: Object, suppressPageChrome: Boolean },
  setup(props) {
    const baseStyle = { align: "left", vertical: "top", size: "md", tone: "default", surface: "plain" };
    const blockDefaults = {
      title: { align: "center", vertical: "center", size: "lg", tone: "default", surface: "plain" },
      subtitle: { align: "center", vertical: "center", size: "md", tone: "brand", surface: "plain" },
      body: { align: "left", vertical: "top", size: "md", tone: "default", surface: "plain" },
      legal: { align: "left", vertical: "top", size: "md", tone: "legal", surface: "legal" },
      version: { align: "center", vertical: "bottom", size: "sm", tone: "muted", surface: "plain" },
    };
    const blockPresets = {
      title: [{ key: "formal", label: "Formal", description: "Centered formal title", style: { align: "center", vertical: "center", size: "lg", tone: "default" } }, { key: "accent", label: "Accent", description: "Prominent brand title", style: { align: "center", vertical: "center", size: "lg", tone: "brand" } }],
      subtitle: [{ key: "quiet", label: "Quiet", description: "Muted supporting subtitle", style: { align: "center", vertical: "center", size: "md", tone: "muted" } }, { key: "accent", label: "Accent", description: "Brand supporting subtitle", style: { align: "center", vertical: "center", size: "md", tone: "brand" } }],
      body: [{ key: "brief", label: "Brief", description: "Compact body copy", style: { align: "left", vertical: "top", size: "sm", tone: "default" } }, { key: "lead", label: "Prominent", description: "Centered lead statement", style: { align: "center", vertical: "center", size: "lg", tone: "default" } }],
      legal: [{ key: "legal", label: "Legal", description: "High-visibility legal notice", style: { align: "left", vertical: "top", size: "md", tone: "legal", surface: "legal" } }, { key: "notice", label: "Notice", description: "Brand notice treatment", style: { align: "left", vertical: "top", size: "md", tone: "brand", surface: "brand" } }],
      version: [{ key: "metadata", label: "Metadata", description: "Quiet version metadata", style: { align: "center", vertical: "bottom", size: "sm", tone: "muted" } }, { key: "stamp", label: "Stamp", description: "Right-aligned document stamp", style: { align: "right", vertical: "bottom", size: "md", tone: "brand" } }],
    };
    const pagePlacements = [
      { value: "top", label: "Top", title: "Align to top of page", icon: "fa-align-left rotate-90" },
      { value: "center", label: "Center", title: "Center on page", icon: "fa-align-center" },
      { value: "bottom", label: "Bottom", title: "Align to bottom of page", icon: "fa-align-right rotate-90" },
    ];
    const previewDate = computed(() => new Date().toLocaleDateString());
    const pagePositionClass = computed(() => props.activeSection?.alignVertical === "top" ? "justify-start" : props.activeSection?.alignVertical === "bottom" ? "justify-end" : "justify-center");
    const blockStyle = (key) => ({ ...baseStyle, ...blockDefaults[key], ...(props.activeSection?.styles?.[key] || {}) });
    function setBlockStyle(key, value) {
      if (!props.activeSection) return;
      props.activeSection.styles = { ...(props.activeSection.styles || {}), [key]: { ...blockStyle(key), ...(value || {}) } };
    }
    const alignmentClass = { left: "items-start text-left", center: "items-center text-center", right: "items-end text-right" };
    const verticalClass = { top: "justify-start", center: "justify-center", bottom: "justify-end" };
    const heightClass = { title: "min-h-10", subtitle: "min-h-5", body: "min-h-8", legal: "min-h-5", version: "min-h-4" };
    const blockContainerClass = (key) => { const style = blockStyle(key); return ["flex flex-col", heightClass[key], alignmentClass[style.align], verticalClass[style.vertical]]; };
    const sizeClass = {
      title: { sm: "text-xl", md: "text-2xl", lg: "text-3xl" }, subtitle: { sm: "text-[10px]", md: "text-xs", lg: "text-sm" }, body: { sm: "text-[10px]", md: "text-[11px]", lg: "text-xs" }, legal: { sm: "text-[9px]", md: "text-[10px]", lg: "text-[11px]" }, version: { sm: "text-[9px]", md: "text-[10px]", lg: "text-[11px]" },
    };
    const toneClass = { default: "text-slate-700 dark:text-slate-200", brand: "text-brand", muted: "text-slate-400", legal: "text-amber-900 dark:text-amber-200" };
    const blockTextClass = (key) => { const style = blockStyle(key); return [sizeClass[key][style.size], toneClass[style.tone]]; };
    const legalSurfaceClass = computed(() => { const surface = blockStyle("legal").surface; return surface === "brand" ? "border-brand/30 bg-brand/8 dark:bg-brand/15" : surface === "plain" ? "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800" : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40"; });
    function applyNdaCoverPreset() {
      if (!props.activeSection) return;
      props.activeSection.subtitle = "Acuerdo de Confidencialidad y Secretos Industriales";
      props.activeSection.legalDisclaimer = "La información contenida en este pliego es de carácter estrictamente confidencial. Queda prohibida su reproducción o divulgación total o parcial sin autorización por escrito.";
      props.activeSection.versionText = `Versión 1.0 · ${new Date().toLocaleDateString()} · Buyniverse Escrow Protected`;
      setBlockStyle("title", blockPresets.title[1].style);
      setBlockStyle("subtitle", blockPresets.subtitle[1].style);
      setBlockStyle("legal", blockPresets.legal[0].style);
      setBlockStyle("version", blockPresets.version[0].style);
      props.store.notice(props.store.t("NDA cover preset applied"), "fa-shield-halved");
    }
    return { pagePlacements, previewDate, pagePositionClass, blockPresets, blockStyle, setBlockStyle, blockContainerClass, blockTextClass, legalSurfaceClass, applyNdaCoverPreset };
  },
};
</script>
