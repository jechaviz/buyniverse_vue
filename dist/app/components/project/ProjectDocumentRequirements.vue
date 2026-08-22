<template>
  <section class="rounded-2xl border border-brand/20 bg-brand-50/35 p-4 dark:bg-brand/8">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div><p class="text-xs font-800 text-brand"><i class="fa-solid fa-file-shield mr-1.5"></i>{{ store.t('Candidate documents') }}</p><p class="mt-1 text-[11px] text-slate-500">{{ store.t('Attach a reusable brief, NDA or policy. You can require acknowledgment before a proposal.') }}</p></div>
      <div class="flex gap-2"><select v-model="sourceKey" class="field h-8 min-w-52 text-xs"><option value="">{{ store.t('Choose a document') }}</option><optgroup :label="store.t('Templates')"><option v-for="item in templates" :key="`template-${item.id}`" :value="`template:${item.id}`">{{ item.name }}</option></optgroup><optgroup v-if="libraryDocuments.length" :label="store.t('Library')"><option v-for="item in libraryDocuments" :key="`library-${item.id}`" :value="`library:${item.id}`">{{ item.name }}</option></optgroup></select><button type="button" class="btn-brand h-8 px-3 text-xs" :disabled="!sourceKey" @click="addDocument"><i class="fa-solid fa-plus mr-1"></i>{{ store.t('Add') }}</button></div>
    </div>
    <div v-if="!documents.length" class="mt-3 rounded-xl border border-dashed border-brand/25 bg-white/60 px-3 py-3 text-xs text-slate-500 dark:bg-slate-900/35"><i class="fa-solid fa-circle-info mr-1 text-brand"></i>{{ store.t('No candidate document is required yet. Add the NDA template to try the signing flow.') }}</div>
    <div v-else class="mt-3 space-y-2">
      <article v-for="document in documents" :key="document.id" class="rounded-xl border border-white/80 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/80">
        <div class="flex flex-wrap items-start justify-between gap-3"><div class="min-w-0"><p class="truncate text-xs font-800"><i class="fa-solid mr-1 text-brand" :class="document.kind === 'nda' ? 'fa-user-shield' : 'fa-file-lines'"></i>{{ document.name }}</p><p class="mt-0.5 text-[10px] text-slate-400">{{ document.sourceLabel }} · {{ document.sections.length }} {{ store.t('sections') }} · {{ document.versionHash }}</p></div><button type="button" class="h-7 w-7 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600" :aria-label="store.t('Remove')" @click="removeDocument(document.id)"><i class="fa-solid fa-trash-can text-xs"></i></button></div>
        <div class="mt-2 flex flex-wrap gap-4 text-[11px] font-semibold text-slate-600 dark:text-slate-300"><label class="inline-flex cursor-pointer items-center gap-2"><input v-model="document.requiredForProposal" type="checkbox" />{{ store.t('Required for proposal') }}</label><label class="inline-flex cursor-pointer items-center gap-2"><input v-model="document.signatureRequired" type="checkbox" />{{ store.t('Require online acknowledgment') }}</label></div>
      </article>
    </div>
  </section>
</template>
<script>
const { inject, computed, ref, watch } = Vue;

export default {
  props: { project: { type: Object, required: true } },
  setup(props) {
    const store = inject('store'), sourceKey = ref('');
    const clean = (value, limit = 180) => window.WebCommon.sanitizeText(value, limit).trim();
    const templates = computed(() => Array.isArray(window.DocumentTemplates?.documentTemplates) ? window.DocumentTemplates.documentTemplates : []);
    const libraryDocuments = computed(() => window.DocumentLibrary?.list(store.currentUser.value.id) || []);
    const documents = computed(() => {
      if (!Array.isArray(props.project.requiredDocuments)) props.project.requiredDocuments = [];
      return props.project.requiredDocuments;
    });
    const source = computed(() => {
      const [kind, id] = String(sourceKey.value || '').split(':');
      if (kind === 'template') return templates.value.find((item) => item.id === id) || null;
      if (kind === 'library') return libraryDocuments.value.find((item) => item.id === id) || null;
      return null;
    });
    const addDocument = () => {
      const item = source.value;
      if (!item) return;
      const rawSections = Array.isArray(item.sections) ? item.sections : typeof item.build === 'function' ? item.build() : [];
      const sections = rawSections.slice(0, 60).map((section, index) => ({ id: clean(section?.id, 80) || `section-${index + 1}`, title: clean(section?.title, 220), content: clean(section?.content, 50000), subtitle: clean(section?.subtitle, 400), legalDisclaimer: clean(section?.legalDisclaimer, 3000), type: ['cover', 'section_end'].includes(section?.type) ? section.type : 'standard', level: Math.min(3, Math.max(1, Number(section?.level) || 1)) }));
      if (!sections.length || documents.value.length >= 12) return store.notice(store.t('Document cannot be added'), 'fa-triangle-exclamation');
      const sourceId = clean(item.id, 120), name = clean(item.name || item.title, 180) || store.t('Untitled document');
      if (documents.value.some((document) => document.sourceId === sourceId)) return store.notice(store.t('This document is already required'), 'fa-circle-info');
      const versionHash = String(window.DocumentLibrary?.fingerprint(JSON.stringify({ name, sections })) || Date.now().toString(36)).slice(0, 20);
      documents.value.push({ id: `requirement-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, sourceId, sourceLabel: sourceKey.value.startsWith('template:') ? store.t('Template') : store.t('Library'), name, kind: sourceId === 'nda_b2b' ? 'nda' : 'document', versionHash, sections, signatureRequired: true, requiredForProposal: true });
      sourceKey.value = '';
      store.notice(store.t('Candidate document added'));
    };
    const removeDocument = (id) => { props.project.requiredDocuments = documents.value.filter((document) => document.id !== id); };
    watch(() => props.project.requiredDocuments, () => { if (!Array.isArray(props.project.requiredDocuments)) props.project.requiredDocuments = []; }, { immediate: true });
    return { store, sourceKey, templates, libraryDocuments, documents, addDocument, removeDocument };
  },
};
</script>
