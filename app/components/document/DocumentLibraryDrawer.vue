<template>
  <aside class="flex w-[23rem] max-w-[92vw] flex-none flex-col overflow-hidden border-l border-slate-200/85 bg-slate-50/95 shadow-2xl dark:border-slate-800 dark:bg-slate-950/95">
    <header class="flex items-start justify-between gap-3 border-b border-slate-200/80 bg-white/85 px-4 py-3.5 dark:border-slate-800 dark:bg-slate-900/85">
      <div class="flex min-w-0 items-center gap-2.5">
        <span class="grid h-8 w-8 flex-none place-items-center rounded-xl bg-brand-50 text-brand dark:bg-brand/15">
          <i class="fa-solid fa-books"></i>
        </span>
        <div class="min-w-0">
          <h2 class="text-sm font-800 text-slate-900 dark:text-white">{{ store.t("Document library") }}</h2>
          <p class="text-[10px] leading-4 text-slate-400">{{ store.t("Reusable copies are private to this local demo account.") }}</p>
        </div>
      </div>
      <button type="button" class="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" :aria-label="store.t('Close')" @click="$emit('close')">
        <i class="fa-solid fa-xmark text-xs"></i>
      </button>
    </header>

    <div class="border-b border-slate-200/75 bg-white/55 p-3 dark:border-slate-800 dark:bg-slate-900/45">
      <div class="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="tablist" :aria-label="store.t('Document library')">
        <button v-for="item in tabs" :key="item.key" type="button" role="tab" class="flex-1 rounded-lg px-2 py-1.5 text-[10px] font-bold transition" :class="activeTab === item.key ? 'bg-white text-brand shadow-xs dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'" @click="activeTab = item.key">
          <i class="fa-solid mr-1" :class="item.icon"></i>{{ store.t(item.label) }}
        </button>
      </div>
      <label class="relative mt-2.5 block">
        <i class="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400"></i>
        <input v-model.trim="query" class="field w-full py-2 pl-8 text-xs" :placeholder="store.t('Search documents and templates…')" />
      </label>
    </div>

    <div class="flex-1 overflow-y-auto p-3.5 scrollbar-thin">
      <section v-if="activeTab !== 'templates'" class="mb-4 rounded-2xl border border-brand/15 bg-brand-50/40 p-3 dark:bg-brand/8">
        <div class="mb-2 flex items-center gap-2">
          <i class="fa-solid fa-bookmark text-xs text-brand"></i>
          <h3 class="text-xs font-800 text-slate-800 dark:text-slate-100">{{ store.t("Save current document for reuse") }}</h3>
        </div>
        <div class="grid gap-2">
          <input v-model.trim="saveName" class="field py-1.5 text-xs" maxlength="120" :placeholder="store.t('Reusable document name')" />
          <input v-model.trim="saveTags" class="field py-1.5 text-xs" maxlength="200" :placeholder="store.t('Tags, separated by commas')" />
          <button type="button" class="btn-brand w-full py-1.5 text-xs" :disabled="!saveName || !sections?.length" @click="saveCurrent">
            <i class="fa-solid fa-floppy-disk mr-1.5"></i>{{ store.t("Save to library") }}
          </button>
        </div>
      </section>

      <section v-if="activeTab !== 'templates'" class="space-y-2">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-[10px] font-800 uppercase tracking-wider text-slate-400">{{ store.t("My reusable documents") }}</h3>
          <span class="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-bold text-slate-500 dark:bg-slate-800">{{ filteredDocuments.length }}</span>
        </div>
        <div v-if="!filteredDocuments.length" class="rounded-xl border border-dashed border-slate-300 px-4 py-7 text-center dark:border-slate-700">
          <i class="fa-regular fa-folder-open mb-2 block text-xl text-slate-300 dark:text-slate-600"></i>
          <p class="text-xs font-semibold text-slate-600 dark:text-slate-300">{{ store.t("No reusable documents yet") }}</p>
          <p class="mt-1 text-[10px] leading-4 text-slate-400">{{ store.t("Save the current document once, then use a copy in any future brief.") }}</p>
        </div>
        <article v-for="doc in filteredDocuments" :key="doc.id" class="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs transition hover:border-brand/35 dark:border-slate-800 dark:bg-slate-900">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <h4 class="truncate text-xs font-800 text-slate-800 dark:text-white">{{ doc.name }}</h4>
              <p class="mt-0.5 truncate text-[10px] text-slate-400">{{ doc.title }}</p>
            </div>
            <button type="button" class="grid h-6 w-6 flex-none place-items-center rounded-md text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10" :title="store.t('Delete reusable document')" @click="$emit('delete-document', doc.id)">
              <i class="fa-solid fa-trash-can text-[10px]"></i>
            </button>
          </div>
          <div class="mt-2 flex flex-wrap gap-1">
            <span v-for="tag in doc.tags" :key="tag" class="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 dark:bg-slate-800">{{ tag }}</span>
          </div>
          <div class="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-400">
            <span>{{ doc.sections.length }} {{ store.t("sections") }} · {{ wordCount(doc) }} {{ store.t("words") }}</span>
            <span>{{ formatDate(doc.updatedAt) }}</span>
          </div>
          <button type="button" class="btn-muted mt-2.5 w-full py-1.5 text-[11px] font-bold" @click="$emit('load-document', doc)">
            <i class="fa-solid fa-copy mr-1.5 text-brand"></i>{{ store.t("Use a copy") }}
          </button>
        </article>
      </section>

      <section v-if="activeTab !== 'saved'" :class="activeTab !== 'templates' ? 'mt-5 space-y-2' : 'space-y-2'">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-[10px] font-800 uppercase tracking-wider text-slate-400">{{ store.t("Starter templates") }}</h3>
          <span class="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-bold text-slate-500 dark:bg-slate-800">{{ filteredTemplates.length }}</span>
        </div>
        <article v-for="template in filteredTemplates" :key="template.id" class="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs transition hover:border-brand/35 dark:border-slate-800 dark:bg-slate-900">
          <div class="flex gap-2.5">
            <span class="grid h-7 w-7 flex-none place-items-center rounded-lg bg-brand-50 text-brand dark:bg-brand/15"><i :class="template.icon" class="text-xs"></i></span>
            <div class="min-w-0">
              <h4 class="text-xs font-800 leading-4 text-slate-800 dark:text-white">{{ template.name }}</h4>
              <p class="mt-0.5 text-[10px] leading-4 text-slate-500 dark:text-slate-400">{{ template.desc }}</p>
            </div>
          </div>
          <div class="mt-2.5 flex gap-2">
            <button type="button" class="btn-brand flex-1 py-1.5 text-[11px]" @click="$emit('load-template', template)">
              <i class="fa-solid fa-wand-magic-sparkles mr-1"></i>{{ store.t("Use template") }}
            </button>
            <button type="button" class="btn-muted px-2.5 py-1.5 text-[11px]" :title="store.t('Save a reusable copy')" @click="$emit('save-template-copy', template)">
              <i class="fa-solid fa-bookmark"></i>
            </button>
          </div>
        </article>
      </section>
    </div>

    <footer class="flex items-center justify-between gap-3 border-t border-slate-200/80 bg-white/75 px-4 py-2.5 text-[10px] text-slate-400 dark:border-slate-800 dark:bg-slate-900/75">
      <span><i class="fa-solid fa-lock mr-1 text-brand"></i>{{ store.t("Stored locally per user") }}</span>
      <button type="button" class="font-bold text-brand hover:underline" @click="$emit('new-document')">{{ store.t("New blank") }}</button>
    </footer>
  </aside>
</template>

<script>
const { computed, ref } = Vue;

export default {
  name: "DocumentLibraryDrawer",
  props: {
    store: Object,
    documents: { type: Array, default: () => [] },
    templates: { type: Array, default: () => [] },
    docTitle: { type: String, default: "" },
    sections: { type: Array, default: () => [] },
  },
  emits: ["close", "load-document", "load-template", "save-current", "save-template-copy", "delete-document", "new-document"],
  setup(props, { emit }) {
    const activeTab = ref("all");
    const query = ref("");
    const saveName = ref("");
    const saveTags = ref("");
    const tabs = [
      { key: "all", label: "Everything", icon: "fa-layer-group" },
      { key: "saved", label: "Mine", icon: "fa-bookmark" },
      { key: "templates", label: "Templates", icon: "fa-wand-magic-sparkles" },
    ];
    const matches = (item) => {
      const haystack = [item.name, item.title, item.desc, ...(item.tags || [])].join(" ").toLocaleLowerCase();
      return !query.value || haystack.includes(query.value.toLocaleLowerCase());
    };
    const filteredDocuments = computed(() => (props.documents || []).filter(matches));
    const filteredTemplates = computed(() => (props.templates || []).filter(matches));
    const wordCount = (doc) => (doc.sections || []).reduce((sum, section) => sum + `${section.title || ""} ${section.content || ""}`.trim().split(/\s+/).filter(Boolean).length, 0);
    const formatDate = (value) => props.store.date ? props.store.date(value) : value;
    const saveCurrent = () => {
      const tags = saveTags.value.split(",").map((tag) => tag.trim()).filter(Boolean);
      emit("save-current", { name: saveName.value, tags });
      saveName.value = "";
      saveTags.value = "";
    };
    return { activeTab, query, saveName, saveTags, tabs, filteredDocuments, filteredTemplates, wordCount, formatDate, saveCurrent };
  },
};
</script>
