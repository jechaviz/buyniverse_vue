<template>
  <div v-if="open && document" class="fixed inset-0 z-60 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" :aria-label="store.t('Document acknowledgment')" @click.self="$emit('close')">
    <section class="glass flex max-h-[min(46rem,calc(100vh-2rem))] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 shadow-elevated dark:border-slate-700/80 dark:bg-slate-900/95">
      <header class="flex items-start justify-between gap-3 border-b border-slate-200/80 p-5 dark:border-slate-800"><div><p class="premium-kicker text-[10px] font-bold uppercase text-brand">{{ document.kind === 'nda' ? store.t('Confidentiality') : store.t('Required document') }}</p><h2 class="mt-1 text-xl font-800">{{ document.name }}</h2><p class="mt-1 text-[11px] text-slate-500">{{ store.t('Version') }} {{ document.versionHash }} · {{ document.sections.length }} {{ store.t('sections') }}</p></div><button class="h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white" :aria-label="store.t('Close')" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button></header>
      <div class="min-h-0 flex-1 overflow-y-auto p-5"><article v-for="section in document.sections" :key="section.id" class="border-b border-slate-100 py-4 first:pt-0 last:border-0 dark:border-slate-800"><h3 v-if="section.title" class="font-800" :class="section.type === 'cover' ? 'text-xl' : 'text-base'">{{ section.title }}</h3><p v-if="section.subtitle" class="mt-1 text-sm text-brand">{{ section.subtitle }}</p><p v-if="section.content" class="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-300">{{ section.content }}</p><p v-if="section.legalDisclaimer" class="mt-3 rounded-lg border border-amber-300/70 bg-amber-50 p-3 text-xs font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"><i class="fa-solid fa-shield-halved mr-1"></i>{{ section.legalDisclaimer }}</p></article></div>
      <form class="border-t border-slate-200/80 p-5 dark:border-slate-800" @submit.prevent="accept"><label class="flex cursor-pointer items-start gap-2 text-xs font-semibold"><input v-model="acknowledged" class="mt-0.5" type="checkbox" required /><span>{{ store.t('I have reviewed this version and agree to be bound by it for this proposal.') }}</span></label><label class="mt-3 block text-xs font-bold">{{ store.t('Type your full name to acknowledge') }}<input v-model.trim="typedName" class="field mt-1 h-10" required maxlength="120" autocomplete="name" :placeholder="signer?.name" /></label><p class="mt-2 text-[10px] text-slate-400"><i class="fa-solid fa-circle-info mr-1"></i>{{ store.t('This records a platform clickwrap acknowledgment. Regulated signatures require the configured identity and signature service.') }}</p><div class="mt-4 flex justify-end gap-2"><button type="button" class="btn-muted" @click="$emit('close')">{{ store.t('Cancel') }}</button><button class="btn-brand" :disabled="!canAccept"><i class="fa-solid fa-signature mr-1.5"></i>{{ store.t('Acknowledge and continue') }}</button></div></form>
    </section>
  </div>
</template>
<script>
const { inject, ref, computed, watch } = Vue;
export default {
  props: { open: Boolean, document: Object, signer: Object }, emits: ['close', 'accepted'],
  setup(props, { emit }) {
    const store = inject('store'), acknowledged = ref(false), typedName = ref('');
    const normaliseName = (value) => String(value || '').trim().toLocaleLowerCase().replace(/\s+/g, ' ');
    watch(() => [props.open, props.document?.id], () => { acknowledged.value = false; typedName.value = ''; }, { immediate: true });
    const canAccept = computed(() => acknowledged.value && normaliseName(typedName.value) === normaliseName(props.signer?.name));
    const accept = () => {
      if (!props.document || !canAccept.value) return;
      emit('accepted', { documentId: props.document.id, sourceId: props.document.sourceId, versionHash: props.document.versionHash, signerId: props.signer?.id, signerName: props.signer?.name, acceptedAt: new Date().toISOString(), method: 'clickwrap' });
    };
    return { store, acknowledged, typedName, canAccept, accept };
  },
};
</script>
