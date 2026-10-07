<template>
  <main class="bn bn-ob" aria-labelledby="onboarding-title">
    <div class="bn-ob__wrap">
      <header class="bn-ob__top">
        <RouterLink to="/" class="bn-logo" :aria-label="t('Buyniverse home')"><img src="assets/brand/buyniverse-ring.svg?v=1" alt="" width="42" height="42" /><span class="bn-logo__word">buy<b>niverse</b></span></RouterLink>
        <span class="bn-ob__secure"><i class="fa-solid fa-shield-halved"></i>{{ t("Validated on the server") }}</span>
      </header>

      <section v-if="phase === 'loading'" class="bn-ob__card bn-ob__body" role="status"><p class="bn-ob__lead"><i class="fa-solid fa-circle-notch fa-spin"></i> {{ t("Checking your secure identity…") }}</p></section>

      <section v-else-if="phase === 'signin'" class="bn-ob__card">
        <div class="bn-ob__head"><h1 id="onboarding-title" class="bn-ob__title">{{ t("Sign in to continue") }}</h1><p class="bn-ob__lead">{{ error }}</p></div>
        <div class="bn-ob__foot"><span></span><RouterLink to="/?auth=login" class="bn-btn bn-btn--primary">{{ t("Sign in") }}</RouterLink></div>
      </section>

      <div v-else class="bn-ob__layout" :class="{ 'bn-ob__layout--split': showSide }">
        <section class="bn-ob__card">
          <div class="bn-ob__head">
            <p class="bn-ob__eyebrow">{{ t(phaseEyebrow) }}</p>
            <h1 id="onboarding-title" class="bn-ob__title">{{ t(phaseTitle) }}</h1>
            <p class="bn-ob__lead">{{ t(phaseLead) }}</p>
          </div>

          <template v-if="phase === 'form'">
            <nav class="bn-ob__steps" :aria-label="t('Steps')">
              <button v-for="item in steps" :key="item.id" type="button" :aria-current="step === item.id ? 'step' : null" :class="{ 'is-done': step > item.id }" @click="goTo(item.id)"><span>{{ step > item.id ? "✓" : item.id }}</span>{{ t(item.label) }}</button>
            </nav>
            <div class="bn-ob__body">
              <div v-if="serverError" class="bn-ob__alert bn-ob__alert--error" role="alert"><i class="fa-solid fa-circle-exclamation"></i><div><b>{{ t("Review your details") }}</b>{{ serverError }}</div></div>

              <template v-if="step === 1">
                <div>
                  <p class="bn-ob__legend">{{ t("How will you use Buyniverse?") }}</p>
                  <div class="bn-ob__options">
                    <button type="button" class="bn-ob__option" :aria-pressed="hasRole('buyer')" @click="toggleRole('buyer')"><i class="fa-solid fa-cart-shopping"></i><div><b>{{ t("Buy") }}</b><span>{{ t("Request quotes, run reverse auctions and pay through escrow.") }}</span></div></button>
                    <button type="button" class="bn-ob__option" :aria-pressed="hasRole('supplier')" @click="toggleRole('supplier')"><i class="fa-solid fa-store"></i><div><b>{{ t("Sell") }}</b><span>{{ t("Offer products, services or talent. Requires your tax identity.") }}</span></div></button>
                  </div>
                </div>
                <div>
                  <p class="bn-ob__legend">{{ t("Who is the account for?") }}</p>
                  <div class="bn-ob__options">
                    <button type="button" class="bn-ob__option" :aria-pressed="form.accountKind === 'business'" @click="form.accountKind = 'business'"><i class="fa-solid fa-building"></i><div><b>{{ t("A company") }}</b><span>{{ t("Legal entity with branches and warehouses.") }}</span></div></button>
                    <button type="button" class="bn-ob__option" :aria-pressed="form.accountKind === 'individual'" @click="form.accountKind = 'individual'"><i class="fa-solid fa-user"></i><div><b>{{ t("A person") }}</b><span>{{ t("Freelancer or sole trader. To sell you still need your tax ID.") }}</span></div></button>
                  </div>
                </div>
                <label class="bn-field"><span>{{ t("Workspace name") }} <b>*</b></span><input v-model.trim="form.workspaceName" class="bn-input" maxlength="180" :placeholder="identityName" /></label>
              </template>

              <template v-else-if="step === 2">
                <BnFiscalForm v-if="needsFiscal" :form="form" :registry="registry" :is-supplier="isSupplier" />
                <div v-else class="bn-ob__alert bn-ob__alert--info"><i class="fa-solid fa-user-shield"></i><div><b>{{ t("No tax data needed to buy as a person") }}</b>{{ t("Add a legal entity later if you want company invoices or decide to sell.") }}</div></div>
              </template>

              <template v-else>
                <div v-if="needsFiscal">
                  <p class="bn-ob__legend">{{ t("How will you invoice?") }}</p>
                  <div class="bn-ob__options">
                    <button type="button" class="bn-ob__option" :aria-pressed="form.invoiceMode === 'external'" @click="form.invoiceMode = 'external'"><i class="fa-solid fa-arrow-up-right-from-square"></i><div><b>{{ t("With my current system") }}</b><span>{{ t("You issue your electronic invoices as you do today and attach them in Buyniverse.") }}</span></div></button>
                    <button v-if="buyniverseIssuance" type="button" class="bn-ob__option" :aria-pressed="form.invoiceMode === 'buyniverse'" @click="form.invoiceMode = 'buyniverse'"><i class="fa-solid fa-file-invoice-dollar"></i><div><b>{{ t("Stamp CFDI with Buyniverse") }}</b><span>{{ t("CFDI 4.0 through our PAC, with series, folios, payment complements and cancellations.") }}</span></div></button>
                  </div>
                  <p v-if="!buyniverseIssuance" class="bn-ob__hint"><i class="fa-solid fa-circle-info"></i>{{ t("Buyniverse stamps electronic invoices in Mexico today; in your country you keep invoicing with your current provider.") }}</p>
                </div>
                <label class="bn-ob__confirm"><input v-model="form.acknowledge" type="checkbox" /><span><b>{{ t("I am authorized to register this workspace.") }}</b>{{ t("The information is validated on the server and every change is recorded in the audit trail.") }}</span></label>
              </template>
            </div>
            <footer class="bn-ob__foot">
              <button v-if="step > 1" type="button" class="bn-btn bn-btn--ghost" @click="step--"><i class="fa-solid fa-arrow-left"></i>{{ t("Back") }}</button><span v-else></span>
              <button v-if="step < 3" type="button" class="bn-btn bn-btn--primary" @click="next">{{ t("Continue") }}<i class="fa-solid fa-arrow-right"></i></button>
              <button v-else type="button" class="bn-btn bn-btn--primary" :disabled="busy || !form.acknowledge" @click="submit"><i class="fa-solid" :class="busy ? 'fa-circle-notch fa-spin' : 'fa-shield-halved'"></i>{{ t(busy ? "Creating your workspace…" : "Create workspace") }}</button>
            </footer>
          </template>

          <form v-else-if="phase === 'csd'" class="bn-ob__body" @submit.prevent="uploadCsd">
            <div class="bn-ob__alert bn-ob__alert--info"><i class="fa-solid fa-lock"></i><div><b>{{ t("Your CSD, not your e.firma") }}</b>{{ t("We check that the key opens with the password, matches the certificate, belongs to your RFC and is current. It is encrypted and never returned by the API.") }}</div></div>
            <div class="bn-ob__grid">
              <label class="bn-field"><span>{{ t("Certificate (.cer)") }} <b>*</b></span><input class="bn-input" type="file" accept=".cer" required @change="csd.certificate = $event.target.files[0] || null" /></label>
              <label class="bn-field"><span>{{ t("Private key (.key)") }} <b>*</b></span><input class="bn-input" type="file" accept=".key" required @change="csd.privateKey = $event.target.files[0] || null" /></label>
              <label class="bn-field bn-ob__wide"><span>{{ t("Private key password") }} <b>*</b></span><input v-model="csd.password" class="bn-input" type="password" maxlength="512" autocomplete="new-password" required /></label>
            </div>
            <div class="bn-ob__foot" style="padding: 0; border: 0"><button type="button" class="bn-btn bn-btn--ghost" @click="afterCsd">{{ t("Do it later") }}</button><button class="bn-btn bn-btn--primary" :disabled="busy"><i class="fa-solid" :class="busy ? 'fa-circle-notch fa-spin' : 'fa-shield-halved'"></i>{{ t("Protect and continue") }}</button></div>
          </form>

          <div v-else-if="phase === 'documents'" class="bn-ob__body">
            <div v-if="pacPending" class="bn-ob__alert bn-ob__alert--info"><i class="fa-solid fa-hourglass-half"></i><div><b>{{ t("CSD protected") }}</b>{{ t("Stamping activates as soon as the PAC confirms your certificate.") }}</div></div>
            <BnRequirementList :registry="registry" :country-code="complianceCountry" :evaluation="compliance" :uploads="true" :company-id="companyId" @updated="onCompliance" />
            <div class="bn-ob__foot" style="padding: 0; border: 0"><span></span><RouterLink to="/dashboard" class="bn-btn bn-btn--primary">{{ t(supplierStatus === "formal" ? "Go to my workspace" : "Continue and finish later") }}<i class="fa-solid fa-arrow-right"></i></RouterLink></div>
          </div>
        </section>

        <aside v-if="showSide" class="bn-ob__side">
          <section class="bn-ob__card" aria-live="polite">
            <h3>{{ t("Supplier requirements") }} · {{ countryName }}</h3>
            <p>{{ t("Updated as you type, with the same rules the server applies.") }}</p>
            <div class="bn-ob__summary"><span :class="{ 'is-ready': liveEvaluation && liveEvaluation.summary.enrollmentReady }">{{ liveEvaluation && liveEvaluation.summary.enrollmentReady ? t("Ready to enrol") : t("Missing") + " " + (liveEvaluation ? liveEvaluation.summary.enrollmentBlocking : 0) }}</span></div>
            <BnRequirementList :registry="registry" :country-code="form.countryCode" :evaluation="liveEvaluation" :server-failures="serverFailures" />
          </section>
        </aside>
      </div>
    </div>
  </main>
</template>

<script>
const { inject, reactive, ref, computed, onMounted, defineAsyncComponent } = Vue;
const { useRouter, useRoute } = VueRouter;
const load = (p) => defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(p, window.sfcOptions));
const BnFiscalForm = load("./app/experience/onboarding/BnFiscalForm.vue?v=1");
const BnRequirementList = load("./app/experience/onboarding/BnRequirementList.vue?v=1");

const PHASE_COPY = {
  form: ["Account setup", "Set up how you take part", "Choose your role; if you sell, we validate your tax identity with the rules of your country."],
  csd: ["Electronic invoicing", "Protect your digital seal (CSD)", "Needed to stamp CFDI 4.0 in your name through Buyniverse."],
  documents: ["Formal supplier", "Documents for buyers", "Corporate buyers ask for them before contracting. Upload them now or later."],
};

export default {
  components: { BnFiscalForm, BnRequirementList },
  setup() {
    const store = inject("store"), router = useRouter(), route = useRoute();
    const t = (text) => store.t(text);
    const lang = (value) => (value && typeof value === "object" ? value[store.locale.value] || value.es || "" : value || "");
    const phase = ref("loading"), step = ref(1), busy = ref(false), error = ref(""), serverError = ref(""), serverFailures = ref([]);
    const registry = ref({ countries: [], messages: {} });
    const identityName = ref(""), companyId = ref(""), compliance = ref(null), complianceCountry = ref(""), supplierStatus = ref(null), pacPending = ref(false);
    const csd = reactive({ certificate: null, privateKey: null, password: "" });
    const form = reactive({
      accountKind: "business", marketplaceRoles: ["buyer"], workspaceName: "", countryCode: "", residenceCountry: "", subdivision: "", county: "",
      legalName: "", taxIdentifier: "", taxRegime: "", billingEmail: "", neighborhood: "",
      address: { street: "", city: "", region: "", postalCode: "" }, answers: {}, declarations: {}, invoiceMode: "external", acknowledge: false,
    });
    const steps = [{ id: 1, label: "Role" }, { id: 2, label: "Tax identity" }, { id: 3, label: "Invoicing" }];

    const hasRole = (role) => form.marketplaceRoles.includes(role);
    const toggleRole = (role) => {
      if (hasRole(role)) { if (form.marketplaceRoles.length > 1) form.marketplaceRoles = form.marketplaceRoles.filter((item) => item !== role); }
      else form.marketplaceRoles = [...form.marketplaceRoles, role];
    };
    const isSupplier = computed(() => hasRole("supplier"));
    const needsFiscal = computed(() => form.accountKind === "business" || isSupplier.value);
    const country = computed(() => window.BuyniverseFiscal.findCountry(registry.value, form.countryCode));
    const countryName = computed(() => (country.value ? lang(country.value.name) : ""));
    const buyniverseIssuance = computed(() => !!(country.value && country.value.invoicing.buyniverseIssuance));
    const liveEvaluation = computed(() => (country.value ? window.BuyniverseFiscal.evaluate(registry.value, form.countryCode, {
      accountKind: "business", taxId: form.taxIdentifier, legalName: form.legalName, taxRegime: form.taxRegime, subdivision: form.subdivision, county: form.county,
      postalCode: form.address.postalCode, residenceCountry: form.residenceCountry, answers: form.answers, declarations: form.declarations,
    }) : null));
    const showSide = computed(() => phase.value === "form" && isSupplier.value && needsFiscal.value && step.value >= 2);
    const copy = computed(() => PHASE_COPY[phase.value] || PHASE_COPY.form);
    const phaseEyebrow = computed(() => copy.value[0]), phaseTitle = computed(() => copy.value[1]), phaseLead = computed(() => copy.value[2]);

    const fiscalComplete = () => {
      if (!needsFiscal.value) return true;
      const tax = country.value && window.BuyniverseFiscal.validateTaxId(country.value.taxId.validator, form.taxIdentifier);
      const a = form.address;
      if (!tax || !tax.valid || !form.legalName || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.billingEmail) || !a.street || !a.city || !a.postalCode) return false;
      if (country.value.subdivisions && country.value.subdivisions.required && !form.subdivision) return false;
      if (form.countryCode === "MX" && !form.taxRegime) return false;
      return !isSupplier.value || liveEvaluation.value.summary.enrollmentReady;
    };
    const valid = (target) => {
      if (target >= 1 && (!form.workspaceName || !form.marketplaceRoles.length)) return false;
      if (target >= 2 && !fiscalComplete()) return false;
      return true;
    };
    const goTo = (target) => { if (target <= step.value || valid(target - 1)) step.value = target; };
    const next = () => {
      if (!valid(step.value)) { store.notice(t(step.value === 2 ? "Complete the requirements marked for your country." : "Complete the required fields before continuing."), "fa-triangle-exclamation"); return; }
      if (step.value === 2 && !buyniverseIssuance.value) form.invoiceMode = "external";
      step.value += 1;
    };

    const payload = () => {
      const street = form.neighborhood ? `${form.address.street}, Col. ${form.neighborhood}` : form.address.street;
      const fiscal = needsFiscal.value;
      return {
        accountKind: form.accountKind, marketplaceRoles: [...form.marketplaceRoles], workspaceName: form.workspaceName, countryCode: form.countryCode || "MX",
        legalName: fiscal ? form.legalName : identityName.value, taxIdentifier: fiscal ? form.taxIdentifier : "", taxRegime: fiscal ? form.taxRegime : "",
        billingEmail: fiscal ? form.billingEmail : "", address: fiscal ? { ...form.address, street } : {}, subdivision: fiscal ? form.subdivision : "",
        county: fiscal ? form.county : "", residenceCountry: form.residenceCountry, answers: isSupplier.value ? { ...form.answers } : {},
        declarations: isSupplier.value ? { ...form.declarations } : {}, locations: [], invoiceMode: fiscal ? form.invoiceMode : "external",
      };
    };
    const openCompliance = async () => {
      const result = await window.BuyniverseOnboarding.loadCompliance().catch(() => null);
      if (!result || !result.evaluation) { router.replace("/dashboard"); return; }
      compliance.value = result.evaluation; complianceCountry.value = result.evaluation.country; supplierStatus.value = result.status; phase.value = "documents";
    };
    const afterCsd = () => (isSupplier.value || supplierStatus.value ? openCompliance() : router.replace("/dashboard"));
    const submit = async () => {
      busy.value = true; serverError.value = ""; serverFailures.value = [];
      try {
        const result = await window.BuyniverseOnboarding.enroll(payload());
        companyId.value = result.companyId || ""; supplierStatus.value = result.supplierStatus || null;
        store.notice(t("Workspace created securely."), "fa-circle-check");
        if (result.needsFiscalCredentials) phase.value = "csd";
        else if (result.supplierStatus) await openCompliance();
        else router.replace("/dashboard");
      } catch (cause) {
        const body = cause && cause.body || {};
        serverFailures.value = Array.isArray(body.requirements) ? body.requirements : [];
        serverError.value = t(body.error || (cause && cause.message) || "The workspace could not be created.");
        if (serverFailures.value.length) step.value = 2;
      } finally { busy.value = false; }
    };
    const uploadCsd = async () => {
      if (!csd.certificate || !csd.privateKey || !csd.password) return;
      busy.value = true;
      try {
        const result = await window.BuyniverseOnboarding.uploadFiscalCredentials(companyId.value, csd.certificate, csd.privateKey, csd.password);
        csd.password = ""; pacPending.value = !!result.pacPending;
        store.notice(t("Your CSD is protected."), "fa-shield-halved");
        await afterCsd();
      } catch (cause) {
        store.notice(t(cause && cause.message ? cause.message : "The CSD could not be protected."), "fa-triangle-exclamation");
      } finally { busy.value = false; }
    };
    const onCompliance = (result) => { compliance.value = result.evaluation; supplierStatus.value = result.status; };

    onMounted(async () => {
      try {
        registry.value = await window.BuyniverseOnboarding.registry();
        const status = await window.BuyniverseOnboarding.load();
        identityName.value = status.identity && status.identity.displayName || t("Verified identity");
        if (!form.workspaceName) form.workspaceName = identityName.value;
        companyId.value = status.companyId || ""; supplierStatus.value = status.supplierStatus || null; pacPending.value = !!status.pacPending;
        if (!status.complete) { phase.value = "form"; return; }
        if (status.needsFiscalCredentials) { phase.value = "csd"; return; }
        if (status.supplierStatus && status.supplierStatus !== "formal") { await openCompliance(); return; }
        router.replace(route.query.returnTo ? String(route.query.returnTo) : "/dashboard");
      } catch (cause) {
        error.value = t(cause && cause.status === 401 ? "Sign in with your account to set up your workspace." : "Your identity session is unavailable. Sign in again to continue.");
        phase.value = "signin";
      }
    });

    return { t, phase, step, steps, busy, error, serverError, serverFailures, registry, identityName, companyId, compliance, complianceCountry, supplierStatus, pacPending,
      csd, form, hasRole, toggleRole, isSupplier, needsFiscal, countryName, buyniverseIssuance, liveEvaluation, phaseEyebrow, phaseTitle, phaseLead,
      goTo, next, submit, uploadCsd, afterCsd, onCompliance, showSide };
  },
};
</script>
