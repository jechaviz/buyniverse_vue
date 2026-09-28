<template>
  <div class="bn-ob__fields">
    <div class="bn-ob__country">
      <label class="bn-field">
        <span>{{ t("Country of tax residence") }} <b>*</b></span>
        <select v-model="form.countryCode" class="bn-select" @change="onCountry">
          <option v-for="item in countries" :key="item.code" :value="item.code">{{ lang(item.name) }}</option>
        </select>
      </label>
      <p v-if="detected.code && detected.code === form.countryCode" class="bn-ob__hint"><i class="fa-solid fa-location-crosshairs"></i>{{ t(detected.source === "timezone" ? "Suggested from your time zone." : "Suggested from your browser language.") }} {{ t("Your obligations depend on where you are a tax resident, so change it if needed.") }}</p>
    </div>

    <div v-if="country" class="bn-ob__regime">
      <i class="fa-solid fa-file-invoice"></i>
      <div><b>{{ lang(country.invoicing.system) }} · {{ lang(country.invoicing.authority) }}</b><span>{{ lang(country.invoicing.mandate) }}</span></div>
    </div>

    <label v-if="form.countryCode === 'ZZ'" class="bn-field">
      <span>{{ t("Country code (ISO, two letters)") }} <b>*</b></span>
      <input v-model.trim="form.residenceCountry" class="bn-input bn-ob__mono" maxlength="2" placeholder="PE" @input="form.residenceCountry = form.residenceCountry.toUpperCase()" />
    </label>

    <div class="bn-ob__grid">
      <label class="bn-field">
        <span>{{ taxLabel }} <b>*</b></span>
        <input v-model.trim="form.taxIdentifier" class="bn-input bn-ob__mono" maxlength="40" :placeholder="country && country.taxId.example" :aria-invalid="taxCheck.state === 'error'" autocomplete="off" />
        <small v-if="taxCheck.message" :class="'bn-ob__check bn-ob__check--' + taxCheck.state"><i class="fa-solid" :class="taxCheck.state === 'ok' ? 'fa-circle-check' : taxCheck.state === 'warn' ? 'fa-triangle-exclamation' : 'fa-circle-xmark'"></i>{{ taxCheck.message }}</small>
        <small v-else class="bn-ob__help">{{ country && lang(country.taxId.hint) }}</small>
      </label>
      <label class="bn-field">
        <span>{{ form.accountKind === "business" ? t("Legal name") : t("Full legal name") }} <b>*</b></span>
        <input v-model.trim="form.legalName" class="bn-input" maxlength="220" autocomplete="organization" />
        <small v-if="nameSuggestion" class="bn-ob__check bn-ob__check--warn"><i class="fa-solid fa-triangle-exclamation"></i>{{ t("CFDI 4.0 uses the name without the corporate suffix.") }} <button type="button" class="bn-ob__link" @click="form.legalName = nameSuggestion">{{ t("Use") }} “{{ nameSuggestion }}”</button></small>
      </label>
    </div>

    <label v-if="form.countryCode === 'MX'" class="bn-field">
      <span>{{ t("Tax regime (SAT)") }} <b>*</b></span>
      <select v-model="form.taxRegime" class="bn-select">
        <option value="" disabled>{{ t("Choose the regime on your tax certificate") }}</option>
        <option v-for="regime in regimes" :key="regime.code" :value="regime.code">{{ regime.code }} · {{ regime.name }}</option>
      </select>
      <small class="bn-ob__help">{{ personType ? t(personType === "moral" ? "Showing regimes for companies (12-character RFC)." : "Showing regimes for individuals (13-character RFC).") : t("Enter the RFC first to see the regimes that apply.") }}</small>
    </label>

    <fieldset class="bn-ob__box">
      <legend>{{ t("Fiscal address") }}</legend>
      <div class="bn-ob__grid">
        <label v-if="form.countryCode === 'MX'" class="bn-field">
          <span>{{ t("Postal code") }} <b>*</b></span>
          <input v-model.trim="form.address.postalCode" class="bn-input bn-ob__mono" inputmode="numeric" maxlength="5" placeholder="06300" />
          <small v-if="postal.state === 'unknown'" class="bn-ob__check bn-ob__check--error"><i class="fa-solid fa-circle-xmark"></i>{{ t("This postal code is not in the SAT catalogue.") }}</small>
          <small v-else-if="postal.info" class="bn-ob__check bn-ob__check--ok"><i class="fa-solid fa-circle-check"></i>{{ postal.info.municipality || postal.info.city }}, {{ postal.info.stateName }}</small>
        </label>
        <label v-if="subdivisions.length" class="bn-field">
          <span>{{ lang(country.subdivisions.label) }} <b>*</b></span>
          <select v-model="form.subdivision" class="bn-select" :disabled="form.countryCode === 'MX' && !!postal.info" @change="onSubdivision">
            <option value="" disabled>{{ t("Choose") }}</option>
            <option v-for="item in subdivisions" :key="item.code" :value="item.code">{{ item.name }}</option>
          </select>
        </label>
        <label v-if="form.countryCode === 'US' && form.subdivision" class="bn-field">
          <span>{{ t("County") }} <b v-if="countyRequired">*</b></span>
          <select v-model="form.county" class="bn-select" :disabled="!counties.length">
            <option value="">{{ counties.length ? t("Choose") : t("Loading…") }}</option>
            <option v-for="item in counties" :key="item[0]" :value="item[0]">{{ item[1] }}</option>
          </select>
        </label>
        <label v-if="form.countryCode === 'MX' && postal.info && postal.info.neighborhoods.length" class="bn-field">
          <span>{{ t("Neighbourhood (colonia)") }}</span>
          <select v-model="form.neighborhood" class="bn-select">
            <option value="">{{ t("Choose") }}</option>
            <option v-for="item in postal.info.neighborhoods" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>
        <label class="bn-field bn-ob__wide">
          <span>{{ t("Street and number") }} <b>*</b></span>
          <input v-model.trim="form.address.street" class="bn-input" maxlength="200" autocomplete="street-address" />
        </label>
        <label class="bn-field">
          <span>{{ t("City") }} <b>*</b></span>
          <input v-model.trim="form.address.city" class="bn-input" maxlength="120" autocomplete="address-level2" />
        </label>
        <label v-if="!subdivisions.length" class="bn-field">
          <span>{{ t("State / region") }} <b>*</b></span>
          <input v-model.trim="form.address.region" class="bn-input" maxlength="120" autocomplete="address-level1" />
        </label>
        <label v-if="form.countryCode !== 'MX'" class="bn-field">
          <span>{{ t("Postal code") }} <b>*</b></span>
          <input v-model.trim="form.address.postalCode" class="bn-input bn-ob__mono" maxlength="24" autocomplete="postal-code" />
        </label>
        <label class="bn-field">
          <span>{{ t("Billing email") }} <b>*</b></span>
          <input v-model.trim="form.billingEmail" class="bn-input" type="email" maxlength="254" autocomplete="email" />
        </label>
      </div>
    </fieldset>

    <fieldset v-if="isSupplier && questions.length" class="bn-ob__box">
      <legend>{{ t("About your operation") }}</legend>
      <div v-for="question in questions" :key="question.id" class="bn-ob__question">
        <div><b>{{ lang(question.label) }}</b><span v-if="lang(question.detail)">{{ lang(question.detail) }}</span></div>
        <div v-if="question.type === 'select'" class="bn-ob__choices">
          <button v-for="option in question.options" :key="option[0]" type="button" class="bn-chip" :class="{ 'bn-chip--active': form.answers[question.id] === option[0] }" @click="form.answers[question.id] = option[0]">{{ lang(option[1]) }}</button>
        </div>
        <div v-else class="bn-ob__choices">
          <button type="button" class="bn-chip" :class="{ 'bn-chip--active': form.answers[question.id] === true }" @click="form.answers[question.id] = true">{{ t("Yes") }}</button>
          <button type="button" class="bn-chip" :class="{ 'bn-chip--active': form.answers[question.id] === false }" @click="form.answers[question.id] = false">{{ t("No") }}</button>
        </div>
      </div>
    </fieldset>

    <fieldset v-if="isSupplier && declarations.length" class="bn-ob__box">
      <legend>{{ t("Registrations for your jurisdiction") }}</legend>
      <div v-for="item in declarations" :key="item.id" class="bn-ob__declaration">
        <label v-if="(item.input || {}).type !== 'boolean'" class="bn-field">
          <span>{{ lang(item.label) }} <b v-if="item.blocking">*</b></span>
          <input v-model.trim="form.declarations[item.id]" class="bn-input bn-ob__mono" maxlength="80" />
          <small class="bn-ob__help">{{ lang(item.detail) }}</small>
        </label>
        <label v-else class="bn-ob__confirm">
          <input v-model="form.declarations[item.id]" type="checkbox" />
          <span><b>{{ lang(item.label) }}</b>{{ lang(item.detail) }}</span>
        </label>
      </div>
    </fieldset>
  </div>
</template>

<script>
const { inject, computed, reactive, ref, watch } = Vue;

export default {
  props: {
    form: { type: Object, required: true },
    registry: { type: Object, required: true },
    isSupplier: { type: Boolean, default: false },
  },
  setup(props) {
    const store = inject("store");
    const t = (text) => store.t(text);
    const lang = (value) => (value && typeof value === "object" ? value[store.locale.value] || value.es || "" : value || "");
    const fiscal = window.BuyniverseFiscal;
    const detected = ref({ code: "", source: "none" });
    const counties = ref([]);
    const postal = reactive({ state: "idle", info: null });

    const countries = computed(() => props.registry.countries);
    const country = computed(() => fiscal.findCountry(props.registry, props.form.countryCode));
    const subdivisions = computed(() => (country.value && country.value.subdivisions ? country.value.subdivisions.items : []));
    const subdivision = computed(() => fiscal.subdivisionOf(country.value, props.form.subdivision));
    const countyRequired = computed(() => !!subdivision.value && (subdivision.value.flags || []).includes("localTax"));
    const questions = computed(() => (country.value ? country.value.questions || [] : []));
    const taxLabel = computed(() => (country.value ? lang(country.value.taxId.label) : t("Tax ID")));

    const taxResult = computed(() => (country.value && props.form.taxIdentifier ? fiscal.validateTaxId(country.value.taxId.validator, props.form.taxIdentifier) : null));
    const message = (code) => lang((props.registry.messages || {})[code]) || code;
    const taxCheck = computed(() => {
      const result = taxResult.value;
      if (!result) return { state: "idle", message: "" };
      if (!result.valid) return { state: "error", message: message(result.code) };
      if (result.warnings.length) return { state: "warn", message: message(result.warnings[0]) };
      return { state: "ok", message: t("Valid") + " · " + result.normalized };
    });
    const personType = computed(() => (taxResult.value && taxResult.value.valid ? taxResult.value.person || "" : ""));
    const regimes = computed(() => (country.value && country.value.regimes || []).filter((regime) =>
      (!personType.value || regime.person === "both" || regime.person === personType.value) && (!props.isSupplier || regime.supplier)));
    const nameSuggestion = computed(() => {
      if (props.form.countryCode !== "MX" || !props.form.legalName) return "";
      const clean = fiscal.mxLegalNameWithoutSuffix(props.form.legalName);
      return clean && clean !== props.form.legalName.trim() ? clean : "";
    });

    // Conditional registrations: the declarations the registry says apply now.
    const declarations = computed(() => {
      if (!country.value) return [];
      const evaluation = fiscal.evaluate(props.registry, props.form.countryCode, { ...profile(), declarations: {} });
      const applicable = new Set(evaluation.requirements.map((item) => item.id));
      return country.value.requirements.filter((item) => item.kind === "declaration" && applicable.has(item.id));
    });
    function profile() {
      return { accountKind: "business", taxId: props.form.taxIdentifier, legalName: props.form.legalName, taxRegime: props.form.taxRegime,
        subdivision: props.form.subdivision, county: props.form.county, postalCode: props.form.address.postalCode,
        residenceCountry: props.form.residenceCountry, answers: props.form.answers, declarations: props.form.declarations };
    }

    const onCountry = () => {
      Object.assign(props.form, { subdivision: "", county: "", taxRegime: "", neighborhood: "" });
      props.form.answers = {}; props.form.declarations = {};
      postal.state = "idle"; postal.info = null;
    };
    const onSubdivision = () => {
      props.form.county = "";
      if (subdivision.value) props.form.address.region = subdivision.value.name;
    };

    // Mexico: the SAT postal code fills state, city and neighbourhoods.
    let postalToken = 0;
    watch(() => [props.form.countryCode, props.form.address.postalCode], async ([code, value]) => {
      if (code !== "MX" || !/^\d{5}$/.test(value || "")) { postal.state = "idle"; postal.info = null; return; }
      const token = ++postalToken;
      const info = await window.BuyniverseOnboarding.postalInfo(value);
      if (token !== postalToken) return;
      postal.info = info; postal.state = info ? "ok" : "unknown";
      if (!info) return;
      props.form.subdivision = info.state;
      props.form.address.region = info.stateName;
      if (!props.form.address.city) props.form.address.city = info.city || info.municipality;
      if (!info.neighborhoods.includes(props.form.neighborhood)) props.form.neighborhood = info.neighborhoods.length === 1 ? info.neighborhoods[0] : "";
    }, { immediate: true });

    // United States: counties load with the state.
    watch(() => [props.form.countryCode, props.form.subdivision], async ([code, state]) => {
      counties.value = [];
      if (code !== "US" || !state) return;
      const all = await window.BuyniverseOnboarding.usCounties().catch(() => ({}));
      if (props.form.subdivision === state) counties.value = all[state] || [];
    }, { immediate: true });

    // Country suggestion from the browser; never overrides a choice.
    if (!props.form.countryCode) {
      let timeZone = "";
      try { timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (_) {}
      detected.value = fiscal.detectCountry(props.registry, { timeZone, languages: navigator.languages || [navigator.language] });
      props.form.countryCode = detected.value.code || "MX";
    }

    return { t, lang, detected, countries, country, subdivisions, countyRequired, counties, questions, taxLabel, taxCheck, personType, regimes,
      nameSuggestion, declarations, postal, onCountry, onSubdivision };
  },
};
</script>
