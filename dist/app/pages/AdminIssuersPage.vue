<template><section v-if="allowed" class="space-y-6"><header class="flex flex-wrap justify-between gap-4"><div><p class="premium-kicker text-xs font-bold uppercase text-brand">Administration</p><h1 class="premium-title mt-2 text-3xl font-800">Fiscal issuers</h1><p class="mt-2 text-slate-500">RFC, tax regime, branches and PAC configuration.</p></div><button class="btn-brand" @click="start()"><i class="fa-solid fa-plus mr-2"></i>New issuer</button></header><div class="grid gap-5 lg:grid-cols-2"><article v-for="issuer in store.state.issuers" :key="issuer.id" class="panel p-5"><div class="flex justify-between"><div><h2 class="font-800">{{ issuer.name }}</h2><p class="mt-1 font-mono text-sm text-slate-500">{{ issuer.rfc }} · {{ issuer.regime }}</p></div><button class="btn-muted" @click="start(issuer)">Edit</button></div><div class="mt-4 flex flex-wrap gap-2"><span v-for="branch in issuer.branches" :key="branch" class="badge bg-slate-100 text-slate-600 dark:bg-slate-700">{{ branch }}</span></div></article></div><div v-if="draft" class="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4" @click.self="draft=null"><form class="panel w-full max-w-xl space-y-4 p-6" @submit.prevent="save"><div class="flex items-center justify-between"><h2 class="text-xl font-800">Issuer configuration</h2><span class="required-note">Required fields</span></div><label class="block text-sm font-semibold">Legal name<input v-model.trim="draft.name" class="field mt-2" required></label><div class="grid gap-4 sm:grid-cols-2"><label class="text-sm font-semibold">RFC<input v-model.trim="draft.rfc" class="field mt-2 uppercase" pattern="[A-Z&amp;Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}" minlength="12" maxlength="13" required></label><label class="text-sm font-semibold">Tax regime<select v-model="draft.regime" class="field mt-2" required><option>601</option><option>612</option><option>626</option></select></label></div><label class="block text-sm font-semibold">Branches<input v-model.trim="branches" class="field mt-2" required placeholder="Main office, CDMX"></label><label class="block text-sm font-semibold">PAC provider<select v-model="draft.pacProvider" class="field mt-2" required><option>Demo PAC</option><option>Finkok</option><option>SW Sapien</option></select></label><p class="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Certificates and PAC secrets are write-only and are excluded from browser storage.</p><div class="flex justify-end gap-2"><button type="button" class="btn-muted" @click="draft=null">Cancel</button><button class="btn-brand">Save issuer</button></div></form></div></section><section v-else class="panel p-10 text-center"><i class="fa-solid fa-lock text-3xl text-rose-500"></i><h1 class="mt-4 text-2xl font-800">Admin access required</h1><RouterLink class="btn-brand mt-4" to="/dashboard">Return to dashboard</RouterLink></section></template>
<script>
const { inject, computed, ref } = Vue;
export default {
setup() {
const store = inject('store');
const allowed = computed(() => store.currentUser.value.type === 'Admin');
const draft = ref(null);
const branches = ref('');
function start(issuer) {
if (!allowed.value) return;
draft.value = issuer ? JSON.parse(JSON.stringify(issuer)) : { id: window.ProcurementCommon.uid('issuer'), name: '', rfc: '', regime: '612', branches: [], pacProvider: 'Demo PAC' };
branches.value = (draft.value.branches || []).join(', ');
}
function save() {
if (!allowed.value || !draft.value) return;
const rfc = draft.value.rfc.trim().toUpperCase();
if (!/^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/.test(rfc)) return store.notice('Enter a valid RFC', 'fa-triangle-exclamation');
draft.value.name = window.WebCommon.sanitizeText(draft.value.name, 180).trim();
draft.value.rfc = rfc;
draft.value.branches = branches.value.split(',').map(value => window.WebCommon.sanitizeText(value, 80).trim()).filter(Boolean).slice(0, 20);
if (!draft.value.name || !draft.value.branches.length) return store.notice('Complete the required issuer fields', 'fa-triangle-exclamation');
const index = store.state.issuers.findIndex(item => item.id === draft.value.id);
if (index < 0) store.state.issuers.push(draft.value); else Object.assign(store.state.issuers[index], draft.value);
draft.value = null;
store.notice('Issuer saved');
}
return { store, allowed, draft, branches, start, save };
}
};
</script>