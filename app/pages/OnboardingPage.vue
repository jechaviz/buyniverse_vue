<template>
  <main class="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:py-10" aria-labelledby="onboarding-title">
    <section class="mx-auto max-w-5xl">
      <header class="mb-5 flex items-center justify-between gap-4">
        <RouterLink to="/" class="inline-flex items-center gap-2.5 font-head text-lg font-800 tracking-tight text-white">
          <span class="grid h-9 w-9 place-items-center rounded-xl bg-brand text-sm shadow-lg shadow-brand/30">B</span>
          Buyniverse
        </RouterLink>
        <span class="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold text-emerald-300"><i class="fa-solid fa-shield-halved mr-1.5"></i>{{ store.t('Server-secured onboarding') }}</span>
      </header>

      <section v-if="loading" class="panel mx-auto max-w-xl p-8 text-center dark:border-slate-800 dark:bg-slate-900/80">
        <i class="fa-solid fa-circle-notch fa-spin text-2xl text-brand"></i>
        <p class="mt-3 text-sm font-bold">{{ store.t('Checking your secure identity…') }}</p>
      </section>

      <section v-else-if="error" class="panel mx-auto max-w-xl border-rose-500/30 p-7 text-center dark:bg-slate-900/80">
        <i class="fa-solid fa-shield-halved text-2xl text-rose-400"></i>
        <h1 id="onboarding-title" class="mt-3 font-head text-xl font-800">{{ store.t('Secure sign-in required') }}</h1>
        <p class="mt-2 text-sm leading-6 text-slate-400">{{ error }}</p>
        <RouterLink to="/?auth=login" class="btn-brand mt-5 text-xs">{{ store.t('Back to sign in') }}</RouterLink>
      </section>

      <section v-else-if="completed && !needsFiscalCredentials" class="panel mx-auto max-w-xl p-8 text-center dark:border-slate-800 dark:bg-slate-900/80">
        <span class="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-400/15 text-emerald-300"><i class="fa-solid fa-circle-check text-xl"></i></span>
        <h1 id="onboarding-title" class="mt-4 font-head text-2xl font-800">{{ store.t('Your workspace is ready') }}</h1>
        <p class="mt-2 text-sm text-slate-400">{{ store.t('Your organization and access profile have been verified by the server.') }}</p>
        <RouterLink to="/dashboard" class="btn-brand mt-5 text-xs">{{ store.t('Open workspace') }}</RouterLink>
      </section>

      <section v-else class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <form class="rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl shadow-black/25" @submit.prevent="submit">
          <div class="border-b border-slate-800 px-5 py-5 sm:px-7">
            <p class="text-[10px] font-800 uppercase tracking-[0.18em] text-brand">{{ store.t('Account setup') }}</p>
            <h1 id="onboarding-title" class="mt-1 font-head text-2xl font-800 tracking-tight text-white">{{ needsFiscalCredentials ? store.t('Complete fiscal security') : store.t('Set up your operating profile') }}</h1>
            <p class="mt-1.5 max-w-2xl text-xs leading-5 text-slate-400">{{ needsFiscalCredentials ? store.t('Your company was created. Upload the Mexican CSD only in this protected step to enable Buyniverse invoicing.') : store.t('Choose how you participate, then define the legal and fiscal scope that will own your operations.') }}</p>
          </div>

          <div v-if="needsFiscalCredentials" class="space-y-4 px-5 py-5 sm:px-7">
            <div class="rounded-2xl border border-amber-300/20 bg-amber-300/7 p-3 text-xs leading-5 text-amber-100">
              <i class="fa-solid fa-lock mr-1.5 text-amber-300"></i>{{ store.t('The .cer, .key and password are encrypted at rest, never returned by the API, never stored in browser storage and are not sent to Odoo until an operator enables the connector.') }}
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="text-xs font-bold text-slate-300">{{ store.t('CSD certificate (.cer)') }} <span class="text-brand">*</span>
                <input class="field mt-1 py-2 text-xs dark:border-slate-700 dark:bg-slate-950" type="file" accept=".cer,application/pkix-cert,application/x-x509-ca-cert" required @change="setFile('certificate', $event)" />
              </label>
              <label class="text-xs font-bold text-slate-300">{{ store.t('CSD private key (.key)') }} <span class="text-brand">*</span>
                <input class="field mt-1 py-2 text-xs dark:border-slate-700 dark:bg-slate-950" type="file" accept=".key,application/octet-stream" required @change="setFile('privateKey', $event)" />
              </label>
            </div>
            <label class="block text-xs font-bold text-slate-300">{{ store.t('Private-key password') }} <span class="text-brand">*</span>
              <input v-model="fiscalPassword" class="field mt-1 py-2 text-xs dark:border-slate-700 dark:bg-slate-950" type="password" minlength="1" maxlength="512" autocomplete="new-password" required />
            </label>
            <button class="btn-brand w-full py-3 text-xs" :disabled="busy"><i class="fa-solid fa-shield-halved mr-1.5"></i>{{ busy ? store.t('Protecting fiscal credentials…') : store.t('Secure credentials and continue') }}</button>
          </div>

          <template v-else>
            <div class="grid grid-cols-3 border-b border-slate-800 px-5 py-3 sm:px-7">
              <button v-for="item in steps" :key="item.id" type="button" class="flex items-center gap-2 text-left text-[10px] font-bold" :class="step >= item.id ? 'text-white' : 'text-slate-600'" @click="goTo(item.id)">
                <span class="grid h-5 w-5 place-items-center rounded-full text-[9px]" :class="step >= item.id ? 'bg-brand text-white' : 'bg-slate-800 text-slate-500'">{{ item.id }}</span>{{ store.t(item.label) }}
              </button>
            </div>

            <div class="space-y-5 px-5 py-5 sm:px-7">
              <template v-if="step === 1">
                <fieldset>
                  <legend class="text-xs font-800 text-slate-200">{{ store.t('How will you use Buyniverse?') }}</legend>
                  <p class="mt-1 text-[11px] leading-5 text-slate-400">{{ store.t('One legal entity can purchase, provide, or do both. Permissions remain separately auditable.') }}</p>
                  <div class="mt-3 grid gap-2 sm:grid-cols-2">
                    <button type="button" class="rounded-2xl border p-3 text-left transition" :class="hasRole('buyer') ? 'border-brand bg-brand/10' : 'border-slate-700 hover:border-slate-500'" @click="toggleRole('buyer')"><i class="fa-solid fa-cart-shopping text-brand"></i><b class="ml-2 text-xs">{{ store.t('Buyer') }}</b><span class="mt-1 block text-[10px] text-slate-400">{{ store.t('Create requests, source and buy.') }}</span></button>
                    <button type="button" class="rounded-2xl border p-3 text-left transition" :class="hasRole('supplier') ? 'border-brand bg-brand/10' : 'border-slate-700 hover:border-slate-500'" @click="toggleRole('supplier')"><i class="fa-solid fa-store text-brand"></i><b class="ml-2 text-xs">{{ store.t('Provider') }}</b><span class="mt-1 block text-[10px] text-slate-400">{{ store.t('Offer products, services or talent.') }}</span></button>
                  </div>
                </fieldset>
                <fieldset>
                  <legend class="text-xs font-800 text-slate-200">{{ store.t('Who is the account for?') }}</legend>
                  <div class="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" class="rounded-2xl border p-3 text-left transition" :class="form.accountKind === 'individual' ? 'border-brand bg-brand/10' : 'border-slate-700 hover:border-slate-500'" @click="selectAccountKind('individual')"><i class="fa-solid fa-user text-brand"></i><b class="ml-2 text-xs">{{ store.t('Individual') }}</b><span class="mt-1 block text-[10px] text-slate-400">{{ store.t('Personal marketplace workspace.') }}</span></button>
                    <button type="button" class="rounded-2xl border p-3 text-left transition" :class="form.accountKind === 'business' ? 'border-brand bg-brand/10' : 'border-slate-700 hover:border-slate-500'" @click="selectAccountKind('business')"><i class="fa-solid fa-building text-brand"></i><b class="ml-2 text-xs">{{ store.t('Company') }}</b><span class="mt-1 block text-[10px] text-slate-400">{{ store.t('Legal entity, branches and warehouses.') }}</span></button>
                  </div>
                </fieldset>
                <label class="block text-xs font-bold text-slate-300">{{ store.t('Workspace name') }} <span class="text-brand">*</span><input v-model.trim="form.workspaceName" class="field mt-1 py-2 text-xs dark:border-slate-700 dark:bg-slate-950" required maxlength="180" :placeholder="identityName" /></label>
              </template>

              <template v-else-if="step === 2">
                <div class="grid gap-3 sm:grid-cols-[8rem_1fr]">
                  <label class="text-xs font-bold text-slate-300">{{ store.t('Country') }} <span class="text-brand">*</span><select v-model="form.countryCode" class="field mt-1 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"><option value="MX">México</option><option value="US">{{ store.t('United States') }}</option><option value="CA">{{ store.t('Canada') }}</option><option value="ES">España</option><option value="OTHER">{{ store.t('Other') }}</option></select></label>
                  <label class="text-xs font-bold text-slate-300">{{ form.accountKind === 'business' ? store.t('Legal name') : store.t('Display name') }} <span class="text-brand">*</span><input v-model.trim="form.legalName" class="field mt-1 py-2 text-xs dark:border-slate-700 dark:bg-slate-950" required maxlength="220" /></label>
                </div>
                <template v-if="form.accountKind === 'business'">
                  <div class="grid gap-3 sm:grid-cols-2">
                    <label class="text-xs font-bold text-slate-300">{{ taxIdLabel }} <span class="text-brand">*</span><input v-model.trim="form.taxIdentifier" class="field mt-1 py-2 font-mono text-xs uppercase dark:border-slate-700 dark:bg-slate-950" required maxlength="40" :placeholder="form.countryCode === 'MX' ? 'XAXX010101000' : 'Tax identifier'" /></label>
                    <label class="text-xs font-bold text-slate-300">{{ store.t('Billing email') }} <span class="text-brand">*</span><input v-model.trim="form.billingEmail" class="field mt-1 py-2 text-xs dark:border-slate-700 dark:bg-slate-950" type="email" required maxlength="254" autocomplete="email" /></label>
                  </div>
                  <label v-if="form.countryCode === 'MX'" class="block text-xs font-bold text-slate-300">{{ store.t('Tax regime') }} <span class="text-brand">*</span><select v-model="form.taxRegime" class="field mt-1 py-2 text-xs dark:border-slate-700 dark:bg-slate-950" required><option value="" disabled>{{ store.t('Select tax regime') }}</option><option value="601">601 · General de Ley Personas Morales</option><option value="603">603 · Personas Morales con Fines no Lucrativos</option><option value="612">612 · Personas Físicas con Actividades Empresariales</option><option value="626">626 · Régimen Simplificado de Confianza</option></select></label>
                  <fieldset class="rounded-2xl border border-slate-800 p-3"><legend class="px-1 text-xs font-800 text-slate-200">{{ store.t('Fiscal address') }}</legend><div class="mt-1 grid gap-2 sm:grid-cols-2"><label class="text-[10px] font-bold text-slate-400 sm:col-span-2">{{ store.t('Street and number') }} <span class="text-brand">*</span><input v-model.trim="form.address.street" class="field mt-1 py-2 text-xs dark:border-slate-700 dark:bg-slate-950" required maxlength="240" /></label><label class="text-[10px] font-bold text-slate-400">{{ store.t('City') }} <span class="text-brand">*</span><input v-model.trim="form.address.city" class="field mt-1 py-2 text-xs dark:border-slate-700 dark:bg-slate-950" required maxlength="120" /></label><label class="text-[10px] font-bold text-slate-400">{{ store.t('State / region') }} <span class="text-brand">*</span><input v-model.trim="form.address.region" class="field mt-1 py-2 text-xs dark:border-slate-700 dark:bg-slate-950" required maxlength="120" /></label><label class="text-[10px] font-bold text-slate-400">{{ store.t('Postal code') }} <span class="text-brand">*</span><input v-model.trim="form.address.postalCode" class="field mt-1 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-950" required maxlength="24" /></label></div></fieldset>
                  <section class="rounded-2xl border border-slate-800 p-3"><div class="flex items-center justify-between gap-3"><div><h2 class="text-xs font-800 text-slate-200">{{ store.t('Branches and warehouses') }}</h2><p class="mt-0.5 text-[10px] text-slate-400">{{ store.t('Optional now; each one becomes an authorized operational scope.') }}</p></div><button type="button" class="btn-muted px-2.5 py-1.5 text-[10px] dark:border-slate-700 dark:bg-slate-800" @click="addLocation"><i class="fa-solid fa-plus mr-1"></i>{{ store.t('Add') }}</button></div><div v-if="form.locations.length" class="mt-3 space-y-2"><div v-for="(location, index) in form.locations" :key="location.id" class="grid gap-2 rounded-xl bg-slate-950/60 p-2 sm:grid-cols-[7rem_7rem_1fr_auto]"><select v-model="location.kind" class="field py-1.5 text-[10px] dark:border-slate-700 dark:bg-slate-950"><option value="branch">{{ store.t('Branch') }}</option><option value="warehouse">{{ store.t('Warehouse') }}</option></select><input v-model.trim="location.code" class="field py-1.5 font-mono text-[10px] uppercase dark:border-slate-700 dark:bg-slate-950" :placeholder="store.t('Code')" maxlength="40" /><input v-model.trim="location.name" class="field py-1.5 text-[10px] dark:border-slate-700 dark:bg-slate-950" :placeholder="store.t('Name')" maxlength="160" /><button type="button" class="grid h-8 w-8 place-items-center rounded-lg text-rose-300 hover:bg-rose-500/10" :aria-label="store.t('Remove location')" @click="form.locations.splice(index, 1)"><i class="fa-solid fa-trash-can text-xs"></i></button></div></div></section>
                </template>
                <p v-else class="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-[11px] leading-5 text-slate-400"><i class="fa-solid fa-user-shield mr-1.5 text-brand"></i>{{ store.t('An individual can start without a tax identifier. Add a legal entity later before issuing from Buyniverse.') }}</p>
              </template>

              <template v-else>
                <fieldset>
                  <legend class="text-xs font-800 text-slate-200">{{ store.t('How will invoices and payment receipts be handled?') }}</legend>
                  <div v-if="form.accountKind === 'business'" class="mt-3 grid gap-2 sm:grid-cols-2">
                    <button type="button" class="rounded-2xl border p-3 text-left transition" :class="form.invoiceMode === 'external' ? 'border-brand bg-brand/10' : 'border-slate-700 hover:border-slate-500'" @click="form.invoiceMode = 'external'"><i class="fa-solid fa-arrow-up-right-from-square text-brand"></i><b class="ml-2 text-xs">{{ store.t('External invoicing') }}</b><span class="mt-1 block text-[10px] text-slate-400">{{ store.t('Manage tax invoices and payment receipts outside Buyniverse.') }}</span></button>
                    <button type="button" class="rounded-2xl border p-3 text-left transition" :class="form.invoiceMode === 'buyniverse' ? 'border-brand bg-brand/10' : 'border-slate-700 hover:border-slate-500'" @click="form.invoiceMode = 'buyniverse'"><i class="fa-solid fa-file-invoice-dollar text-brand"></i><b class="ml-2 text-xs">{{ store.t('Invoice with Buyniverse') }}</b><span class="mt-1 block text-[10px] text-slate-400">{{ store.t('Company-scoped fiscal profile and controlled Odoo FIAx connector.') }}</span></button>
                  </div>
                  <p v-else class="mt-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-3 text-[11px] leading-5 text-slate-400"><i class="fa-solid fa-user-shield mr-1.5 text-brand"></i>{{ store.t('Individual accounts use external invoicing until they add a legal entity.') }}</p>
                </fieldset>
                <div v-if="form.invoiceMode === 'buyniverse'" class="rounded-2xl border border-amber-300/20 bg-amber-300/7 p-3 text-[11px] leading-5 text-amber-100"><i class="fa-solid fa-lock mr-1.5 text-amber-300"></i><span v-if="form.countryCode === 'MX'">{{ store.t('Mexico requires the RFC, tax regime, .cer, .key and private-key password. The CSD files are requested only after the company record is created.') }}</span><span v-else>{{ store.t('Your country tax profile is stored now; country-specific e-invoicing activation is completed by the controlled connector.') }}</span></div>
                <label class="flex items-start gap-2 rounded-2xl border border-slate-800 bg-slate-950/50 p-3 text-[11px] leading-5 text-slate-300"><input v-model="form.acknowledge" type="checkbox" required class="mt-0.5 accent-brand" /><span>{{ store.t('I confirm that I am authorized to create this workspace and, if selected, to configure its invoicing profile.') }}</span></label>
              </template>
            </div>

            <footer class="flex items-center justify-between gap-3 border-t border-slate-800 px-5 py-4 sm:px-7">
              <button v-if="step > 1" type="button" class="btn-muted px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800" @click="step--"><i class="fa-solid fa-arrow-left mr-1.5"></i>{{ store.t('Back') }}</button><span v-else></span>
              <button v-if="step < 3" type="button" class="btn-brand px-4 py-2 text-xs" @click="next"><span>{{ store.t('Continue') }}</span><i class="fa-solid fa-arrow-right ml-1.5"></i></button>
              <button v-else class="btn-brand px-4 py-2 text-xs" :disabled="busy"><i class="fa-solid fa-shield-halved mr-1.5"></i>{{ busy ? store.t('Creating secure workspace…') : store.t('Create workspace') }}</button>
            </footer>
          </template>
        </form>

        <aside class="space-y-3">
          <section class="rounded-3xl border border-slate-800 bg-slate-900/75 p-4"><p class="text-[10px] font-800 uppercase tracking-wider text-slate-500">{{ store.t('Signed in with') }}</p><p class="mt-2 flex items-center gap-2 text-xs font-bold text-slate-100"><i class="fa-solid fa-user-check text-emerald-400"></i>{{ identityName }}</p><p class="mt-1 text-[10px] text-slate-500">{{ providerLabel }}</p></section>
          <section class="rounded-3xl border border-slate-800 bg-slate-900/75 p-4"><p class="text-[10px] font-800 uppercase tracking-wider text-slate-500">{{ store.t('Privacy by design') }}</p><ul class="mt-3 space-y-2 text-[10px] leading-4 text-slate-400"><li><i class="fa-solid fa-check mr-1.5 text-emerald-400"></i>{{ store.t('Each company and location receives a separate authorization scope.') }}</li><li><i class="fa-solid fa-check mr-1.5 text-emerald-400"></i>{{ store.t('Fiscal credentials are write-only and encrypted server-side.') }}</li><li><i class="fa-solid fa-check mr-1.5 text-emerald-400"></i>{{ store.t('Odoo FIAx and PAC secrets stay outside the browser and database records.') }}</li></ul></section>
        </aside>
      </section>
    </section>
  </main>
</template>

<script>
const { inject, reactive, ref, computed, onMounted } = Vue;
const { useRouter } = VueRouter;

export default {
  setup() {
    const store = inject("store"), router = useRouter();
    const loading = ref(true), busy = ref(false), error = ref("");
    const completed = ref(false), needsFiscalCredentials = ref(false), companyId = ref("");
    const identityName = ref(""), providerLabel = ref("");
    const step = ref(1), fiscalPassword = ref("");
    const files = reactive({ certificate: null, privateKey: null });
    const form = reactive({
      accountKind: "individual", marketplaceRoles: ["buyer"], workspaceName: "", countryCode: "MX", legalName: "",
      taxIdentifier: "", taxRegime: "", billingEmail: "", address: { street: "", city: "", region: "", postalCode: "" },
      locations: [], invoiceMode: "external", acknowledge: false,
    });
    const steps = [{ id: 1, label: "Profile" }, { id: 2, label: "Legal scope" }, { id: 3, label: "Billing" }];
    const taxIdLabel = computed(() => form.countryCode === "MX" ? "RFC" : form.countryCode === "US" ? "EIN / TIN" : store.t("Tax ID"));
    const hasRole = (role) => form.marketplaceRoles.includes(role);
    const toggleRole = (role) => {
      if (hasRole(role)) { if (form.marketplaceRoles.length > 1) form.marketplaceRoles = form.marketplaceRoles.filter((item) => item !== role); }
      else form.marketplaceRoles.push(role);
    };
    const addLocation = () => form.locations.push({ id: `${Date.now()}-${Math.random()}`, kind: "branch", code: "", name: "" });
    const setFile = (key, event) => { files[key] = event.target?.files?.[0] || null; };
    const normalizedLocations = () => form.locations.map((location) => ({ kind: location.kind, code: String(location.code || "").trim().toUpperCase(), name: String(location.name || "").trim() }));
    const validStep = (target) => {
      if (target >= 1 && (!form.workspaceName || !form.marketplaceRoles.length)) return false;
      if (target >= 2 && form.accountKind === "business") {
        const address = form.address;
        if (!form.legalName || !form.taxIdentifier || !form.billingEmail || !address.street || !address.city || !address.region || !address.postalCode || (form.countryCode === "MX" && !form.taxRegime)) return false;
        if (normalizedLocations().some((location) => !location.code || !location.name)) return false;
      }
      return target < 3 || form.acknowledge;
    };
    const goTo = (target) => { if (target <= step.value || validStep(target - 1)) step.value = target; };
    const next = () => {
      if (!validStep(step.value)) { store.notice(store.t("Complete the required fields before continuing."), "fa-triangle-exclamation"); return; }
      step.value = Math.min(3, step.value + 1);
    };
    const selectAccountKind = (kind) => {
      form.accountKind = kind;
      if (kind === "individual") form.invoiceMode = "external";
    };
    const load = async () => {
      loading.value = true; error.value = "";
      try {
        const status = await window.BuyniverseOnboarding.load();
        completed.value = Boolean(status.complete);
        needsFiscalCredentials.value = Boolean(status.needsFiscalCredentials);
        companyId.value = typeof status.companyId === "string" ? status.companyId : "";
        identityName.value = status.identity?.displayName || store.t("Verified identity");
        if (!form.workspaceName) form.workspaceName = identityName.value;
        providerLabel.value = status.identity?.provider === "google_oidc" ? "Google" : status.identity?.provider === "facebook_oauth" ? "Facebook" : store.t("Federated identity");
        if (status.complete && !status.needsFiscalCredentials) router.replace("/dashboard");
      } catch (cause) { error.value = store.t(cause?.message || "Your identity session is unavailable. Sign in again to continue."); }
      finally { loading.value = false; }
    };
    const finishCredentials = async () => {
      if (!files.certificate || !files.privateKey || fiscalPassword.value.length < 1) { store.notice(store.t("Select the .cer, .key and password to continue."), "fa-triangle-exclamation"); return; }
      busy.value = true;
      try {
        await window.BuyniverseOnboarding.uploadFiscalCredentials(companyId.value, files.certificate, files.privateKey, fiscalPassword.value);
        fiscalPassword.value = ""; files.certificate = null; files.privateKey = null;
        store.notice(store.t("Fiscal credentials were secured."), "fa-shield-halved");
        router.replace("/dashboard");
      } catch (cause) { store.notice(store.t(cause?.message || "Fiscal credentials could not be secured."), "fa-triangle-exclamation"); }
      finally { busy.value = false; }
    };
    const submit = async () => {
      if (needsFiscalCredentials.value) return finishCredentials();
      if (!validStep(3)) { store.notice(store.t("Complete the required fields before creating the workspace."), "fa-triangle-exclamation"); return; }
      busy.value = true;
      try {
        const result = await window.BuyniverseOnboarding.enroll({
          accountKind: form.accountKind, marketplaceRoles: [...form.marketplaceRoles], workspaceName: form.workspaceName,
          countryCode: form.countryCode, legalName: form.accountKind === "business" ? form.legalName : identityName.value,
          taxIdentifier: form.accountKind === "business" ? form.taxIdentifier : "", taxRegime: form.accountKind === "business" ? form.taxRegime : "",
          billingEmail: form.accountKind === "business" ? form.billingEmail : "", address: form.accountKind === "business" ? { ...form.address } : {},
          locations: form.accountKind === "business" ? normalizedLocations() : [], invoiceMode: form.invoiceMode,
        });
        companyId.value = result.companyId || "";
        needsFiscalCredentials.value = Boolean(result.needsFiscalCredentials);
        completed.value = !needsFiscalCredentials.value;
        if (needsFiscalCredentials.value) { step.value = 3; store.notice(store.t("Company created. Complete the protected CSD step."), "fa-lock"); }
        else { store.notice(store.t("Workspace created securely."), "fa-circle-check"); router.replace("/dashboard"); }
      } catch (cause) { store.notice(store.t(cause?.message || "Workspace could not be created."), "fa-triangle-exclamation"); }
      finally { busy.value = false; }
    };
    onMounted(load);
    return { store, loading, busy, error, completed, needsFiscalCredentials, identityName, providerLabel, step, steps, form, files, fiscalPassword, taxIdLabel, hasRole, toggleRole, selectAccountKind, addLocation, setFile, goTo, next, submit };
  },
};
</script>
