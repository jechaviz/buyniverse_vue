<template>
  <section class="mx-auto max-w-6xl space-y-4">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="premium-kicker text-[10px] font-800 uppercase text-brand">{{ store.t('SaaS governance') }}</p>
        <h1 class="font-head mt-1 text-2xl font-800 tracking-tight">{{ store.t('Companies, branches and access') }}</h1>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ store.t('Server-enforced context for each legal entity, branch and warehouse.') }}</p>
      </div>
      <span v-if="context?.tenant" class="badge border border-brand/20 bg-brand/8 text-brand"><i class="fa-solid fa-shield-halved"></i>{{ context.tenant.name }}</span>
    </header>

    <div v-if="!context" class="panel p-7 text-center text-sm text-slate-500"><i class="fa-solid fa-arrows-rotate animate-spin mr-2 text-brand"></i>{{ store.t('Loading company context…') }}</div>
    <div v-else-if="!context.permissions?.manageTenant && !context.permissions?.manageCompany" class="panel p-8 text-center">
      <i class="fa-solid fa-lock text-xl text-amber-500"></i>
      <h2 class="mt-3 font-head text-lg font-800">{{ store.t('Read-only company access') }}</h2>
      <p class="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">{{ store.t('Your active membership may use the selected company, but cannot change its structure or invite people.') }}</p>
    </div>

    <template v-else>
      <section class="grid gap-3 lg:grid-cols-[1.25fr_.75fr]">
        <div class="panel overflow-hidden">
          <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <h2 class="text-xs font-800 uppercase tracking-wider text-slate-500">{{ store.t('Legal entities') }}</h2>
            <span class="text-[10px] font-bold text-slate-400">{{ context.companies.length }}</span>
          </div>
          <div class="divide-y divide-slate-100 dark:divide-slate-800">
            <article v-for="company in context.companies" :key="company.id" class="flex items-start gap-3 px-4 py-3" :class="company.id === context.company.id ? 'bg-brand/5' : ''">
              <span class="grid h-8 w-8 flex-none place-items-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800"><i class="fa-solid fa-building-columns text-xs"></i></span>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5"><b class="truncate text-xs text-slate-800 dark:text-slate-100">{{ company.legalName }}</b><span class="font-mono text-[10px] text-slate-400">{{ company.rfc }}</span></div>
                <div class="mt-1 flex flex-wrap gap-1.5"><span v-for="location in company.locations" :key="location.id" class="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300"><i class="fa-solid" :class="location.kind === 'warehouse' ? 'fa-warehouse' : 'fa-code-branch'"></i>{{ location.name }}</span><span v-if="!company.locations.length" class="text-[10px] text-slate-400">{{ store.t('No locations yet') }}</span></div>
              </div>
              <button class="btn-muted shrink-0 px-2.5 py-1.5 text-[10px]" :disabled="busy" @click="activate(company.id)">{{ company.id === context.company.id ? store.t('Active') : store.t('Open') }}</button>
            </article>
          </div>
        </div>

        <form v-if="context.permissions.manageTenant" class="panel p-4" @submit.prevent="createCompany">
          <h2 class="text-xs font-800 uppercase tracking-wider text-slate-500">{{ store.t('Add legal entity') }}</h2>
          <label class="mt-3 block text-[10px] font-bold text-slate-500">{{ store.t('Legal name') }} <span class="text-brand">*</span><input v-model.trim="companyForm.legalName" required maxlength="220" class="field mt-1 py-2 text-xs" /></label>
          <label class="mt-2 block text-[10px] font-bold text-slate-500">RFC <span class="text-brand">*</span><input v-model.trim="companyForm.rfc" required maxlength="13" class="field mt-1 py-2 font-mono text-xs uppercase" placeholder="XAXX010101000" /></label>
          <label class="mt-2 block text-[10px] font-bold text-slate-500">{{ store.t('Tax regime') }}<input v-model.trim="companyForm.taxRegime" maxlength="12" class="field mt-1 py-2 text-xs" placeholder="601" /></label>
          <button class="btn-brand mt-3 w-full py-2 text-xs" :disabled="busy"><i class="fa-solid fa-plus mr-1.5"></i>{{ store.t('Add company') }}</button>
        </form>
      </section>

      <section class="grid gap-3 lg:grid-cols-2">
        <form v-if="canManageActiveCompany" class="panel p-4" @submit.prevent="createLocation">
          <h2 class="text-xs font-800 uppercase tracking-wider text-slate-500">{{ store.t('Branch or warehouse') }}</h2>
          <div class="mt-3 grid grid-cols-2 gap-2">
            <label class="text-[10px] font-bold text-slate-500">{{ store.t('Type') }}<select v-model="locationForm.kind" class="field mt-1 py-2 text-xs"><option value="branch">{{ store.t('Branch') }}</option><option value="warehouse">{{ store.t('Warehouse') }}</option></select></label>
            <label class="text-[10px] font-bold text-slate-500">{{ store.t('Code') }} <span class="text-brand">*</span><input v-model.trim="locationForm.code" required maxlength="40" pattern="[A-Za-z0-9_-]{2,40}" class="field mt-1 py-2 font-mono text-xs uppercase" /></label>
          </div>
          <label class="mt-2 block text-[10px] font-bold text-slate-500">{{ store.t('Name') }} <span class="text-brand">*</span><input v-model.trim="locationForm.name" required maxlength="160" class="field mt-1 py-2 text-xs" /></label>
          <button class="btn-muted mt-3 w-full py-2 text-xs" :disabled="busy"><i class="fa-solid fa-warehouse mr-1.5"></i>{{ store.t('Add location') }}</button>
        </form>

        <form v-if="canManageActiveCompany" class="panel p-4" @submit.prevent="invite">
          <h2 class="text-xs font-800 uppercase tracking-wider text-slate-500">{{ store.t('Invite with scoped access') }}</h2>
          <label class="mt-3 block text-[10px] font-bold text-slate-500">{{ store.t('Work email') }} <span class="text-brand">*</span><input v-model.trim="inviteForm.email" required type="email" maxlength="254" class="field mt-1 py-2 text-xs" /></label>
          <div class="mt-2 grid grid-cols-2 gap-2">
            <label class="text-[10px] font-bold text-slate-500">{{ store.t('Role') }}<select v-model="inviteForm.role" class="field mt-1 py-2 text-xs"><option value="buyer">{{ store.t('Buyer') }}</option><option value="approver">{{ store.t('Approver') }}</option><option value="warehouse">{{ store.t('Warehouse') }}</option><option value="auditor">{{ store.t('Auditor') }}</option><option value="viewer">{{ store.t('Viewer') }}</option></select></label>
            <label class="text-[10px] font-bold text-slate-500">{{ store.t('Scope') }}<select v-model="inviteForm.scope" class="field mt-1 py-2 text-xs"><option value="legal_entity">{{ store.t('Company') }}</option><option value="location">{{ store.t('Location') }}</option><option v-if="context.permissions.manageTenant" value="tenant">{{ store.t('All companies') }}</option></select></label>
          </div>
          <label v-if="inviteForm.scope === 'location'" class="mt-2 block text-[10px] font-bold text-slate-500">{{ store.t('Location') }}<select v-model="inviteForm.locationId" required class="field mt-1 py-2 text-xs"><option value="" disabled>{{ store.t('Select') }}</option><option v-for="location in activeCompany.locations" :key="location.id" :value="location.id">{{ location.name }}</option></select></label>
          <button class="btn-muted mt-3 w-full py-2 text-xs" :disabled="busy"><i class="fa-solid fa-user-plus mr-1.5"></i>{{ store.t('Create invitation') }}</button>
          <p class="mt-2 text-[9px] leading-4 text-slate-400">{{ store.t('Invitation delivery and account binding occur after enterprise SSO is enabled.') }}</p>
        </form>
      </section>
    </template>
  </section>
</template>
<script>
const { inject, computed, reactive, ref } = Vue;
const { useRouter } = VueRouter;
export default {
  setup() {
    const store = inject('store'), router = useRouter(), busy = ref(false);
    const context = store.tenantContext;
    const companyForm = reactive({ legalName: '', rfc: '', taxRegime: '' });
    const locationForm = reactive({ kind: 'branch', code: '', name: '' });
    const inviteForm = reactive({ email: '', role: 'buyer', scope: 'legal_entity', locationId: '' });
    const activeCompany = computed(() => context.value?.companies?.find((company) => company.id === context.value?.company?.id) || { locations: [] });
    const canManageActiveCompany = computed(() => Boolean(context.value?.permissions?.manageCompany || context.value?.permissions?.manageTenant));
    const refresh = async () => { await store.refreshTenantContext(); };
    const activate = async (companyId) => {
      busy.value = true;
      try { if (await store.switchTenantContext(companyId, null)) router.replace('/dashboard'); }
      finally { busy.value = false; }
    };
    const createCompany = async () => {
      busy.value = true;
      try {
        const result = await window.BuyniverseTenantContext.createCompany(companyForm);
        await refresh(); Object.assign(companyForm, { legalName: '', rfc: '', taxRegime: '' });
        store.notice(store.t('Company created'), 'fa-building-circle-check');
        if (result.companyId) await store.switchTenantContext(result.companyId, null);
      } catch (_) { store.notice(store.t('Company could not be created'), 'fa-triangle-exclamation'); }
      finally { busy.value = false; }
    };
    const createLocation = async () => {
      busy.value = true;
      try { await window.BuyniverseTenantContext.createLocation(context.value.company.id, locationForm); await refresh(); Object.assign(locationForm, { kind: 'branch', code: '', name: '' }); store.notice(store.t('Location created'), 'fa-warehouse'); }
      catch (_) { store.notice(store.t('Location could not be created'), 'fa-triangle-exclamation'); }
      finally { busy.value = false; }
    };
    const invite = async () => {
      busy.value = true;
      try { await window.BuyniverseTenantContext.invite(context.value.company.id, inviteForm); Object.assign(inviteForm, { email: '', role: 'buyer', scope: 'legal_entity', locationId: '' }); store.notice(store.t('Secure invitation created'), 'fa-user-shield'); }
      catch (_) { store.notice(store.t('Invitation could not be created'), 'fa-triangle-exclamation'); }
      finally { busy.value = false; }
    };
    return { store, context, busy, companyForm, locationForm, inviteForm, activeCompany, canManageActiveCompany, activate, createCompany, createLocation, invite };
  },
};
</script>
