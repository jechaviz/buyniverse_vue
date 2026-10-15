<template>
  <section class="bn-platform" aria-labelledby="platform-title">
    <nav class="bn-platform__crumbs" aria-label="breadcrumb">
      <template v-for="(c, k) in crumbs" :key="k"><span v-if="k" aria-hidden="true">›</span><span><b>{{ c.n }}</b> {{ t(c.label) }}</span></template>
    </nav>
    <header class="bn-platform__head">
      <h1 id="platform-title">{{ t("Platform administration") }}</h1>
      <p class="muted">{{ t("Companies, stamps, demo access and the audit trail. Only platform operators see this screen.") }}</p>
    </header>

    <div v-if="phase === 'loading'" class="bn-setup__list"><div>{{ t("Loading…") }}</div></div>
    <div v-else-if="phase === 'denied'" class="bn-ob__alert bn-ob__alert--error" role="alert"><i class="fa-solid fa-shield-halved"></i><div><b>{{ t("Platform operators only") }}</b>{{ t("Your account is not a platform operator.") }}</div></div>
    <template v-else>
      <nav class="bn-platform__tabs" :aria-label="t('Platform sections')">
        <button v-for="tab in tabs" :key="tab.key" type="button" :aria-current="current === tab.key ? 'page' : null" @click="open(tab.key)"><b>{{ tab.n }}</b> {{ t(tab.label) }}</button>
      </nav>
      <div v-if="error" class="bn-ob__alert bn-ob__alert--error" role="alert"><i class="fa-solid fa-circle-exclamation"></i><div>{{ error }}</div></div>
      <div v-if="notice" class="bn-ob__alert bn-ob__alert--ok" role="status"><i class="fa-solid fa-circle-check"></i><div>{{ notice }}</div></div>
      <div v-if="shownCode" class="bn-ob__alert bn-ob__alert--info" role="status"><i class="fa-solid fa-key"></i><div><b>{{ t("Access code") }}</b>{{ t("Send it to the person now. It is shown only once and is not stored.") }}<br /><span class="bn-ob__mono bn-platform__code">{{ shownCode }}</span></div></div>

      <!-- 6.1 companies -->
      <section v-if="current === 'empresas'" class="bn-ob__box">
        <legend>{{ t("Companies") }} · {{ data.companies.length }}</legend>
        <table class="bn-platform__table"><thead><tr><th>{{ t("Workspace") }}</th><th>{{ t("Company") }}</th><th>RFC</th><th>{{ t("Invoicing") }}</th><th>{{ t("Stamps") }}</th><th>{{ t("Team") }}</th></tr></thead>
          <tbody><tr v-for="c in data.companies" :key="c.id"><td>{{ c.workspace }}</td><td>{{ c.legalName }}</td><td class="bn-ob__mono">{{ c.rfc || "—" }}</td><td>{{ c.issuance === "buyniverse" ? t("Buyniverse") : t("External") }} · {{ c.profileStatus }}</td><td class="bn-ob__mono">{{ c.stampsBalance }}</td><td>{{ c.members }} · {{ t("pending") }} {{ c.pendingInvitations }}</td></tr>
            <tr v-if="!data.companies.length"><td colspan="6">{{ t("No companies yet.") }}</td></tr></tbody></table>
      </section>

      <!-- 6.2 demo access -->
      <section v-else-if="current === 'accesos'" class="bn-ob__fields">
        <div class="bn-ob__box">
          <legend>{{ t("Requests") }}</legend>
          <ul class="bn-setup__list">
            <li v-for="r in data.demoRequests" :key="r.id"><div><b>{{ r.name }}</b> <small>{{ r.company }}</small><br /><small class="bn-ob__mono">{{ r.email }} · {{ day(r.createdAt) }}</small><br /><small>{{ r.note }}</small></div>
              <div v-if="r.status === 'pending'" class="bn-setup__inline">
                <input v-model.number="days" class="bn-input bn-ob__mono" type="number" min="1" max="90" :aria-label="t('Days')" />
                <button type="button" class="bn-btn bn-btn--primary bn-btn--sm" :disabled="busy" @click="decide(r, 'approve')">{{ t("Approve") }}</button>
                <button type="button" class="bn-btn bn-btn--ghost bn-btn--sm" :disabled="busy" @click="decide(r, 'decline')">{{ t("Decline") }}</button></div>
              <span v-else class="bn-platform__state">{{ t(STATUS_LABEL[r.status] || r.status) }}</span></li>
            <li v-if="!data.demoRequests.length"><div>{{ t("No requests yet.") }}</div></li>
          </ul>
        </div>
        <div class="bn-ob__box">
          <legend>{{ t("Codes") }}</legend>
          <ul class="bn-setup__list">
            <li v-for="c in data.demoCodes" :key="c.id"><div><b>{{ c.label }}</b><br /><small>{{ t("expires") }} {{ day(c.expiresAt) }} · {{ c.useCount }} {{ t("uses") }}</small></div>
              <div class="bn-setup__inline"><span class="bn-platform__state">{{ t(CODE_LABEL[c.state]) }}</span><button v-if="c.state === 'active'" type="button" class="bn-btn bn-btn--ghost bn-btn--sm" :disabled="busy" @click="revoke(c)">{{ t("Revoke") }}</button></div></li>
            <li v-if="!data.demoCodes.length"><div>{{ t("No codes yet.") }}</div></li>
          </ul>
        </div>
      </section>

      <!-- 6.3 stamps -->
      <section v-else-if="current === 'timbres'" class="bn-ob__fields">
        <div class="bn-ob__box">
          <legend>{{ t("Adjust stamps") }}</legend>
          <div class="bn-ob__grid">
            <label class="bn-field bn-ob__wide"><span>{{ t("Company") }}</span><select v-model="adj.companyId" class="bn-select"><option value="">{{ t("Choose…") }}</option><option v-for="c in data.companies" :key="c.id" :value="c.id">{{ c.legalName }} · {{ c.stampsBalance }}</option></select></label>
            <label class="bn-field"><span>{{ t("Change (negative to take back)") }}</span><input v-model.number="adj.delta" class="bn-input bn-ob__mono" type="number" step="1" /></label>
            <label class="bn-field bn-ob__wide"><span>{{ t("Why") }}</span><input v-model.trim="adj.note" class="bn-input" maxlength="200" /></label>
          </div>
          <div class="bn-ob__foot" style="padding: 0; border: 0"><span></span><button type="button" class="bn-btn bn-btn--primary" :disabled="busy || !adj.companyId || !adj.delta || !adj.note" @click="adjust"><i class="fa-solid fa-stamp"></i>{{ t("Record change") }}</button></div>
        </div>
      </section>

      <!-- 6.4 audit -->
      <section v-else-if="current === 'auditoria'" class="bn-ob__fields">
        <div class="bn-ob__box"><legend>{{ t("Platform decisions") }}</legend>
          <ul class="bn-setup__list"><li v-for="(e, i) in data.audit.platform" :key="'p' + i"><div><b>{{ e.action }}</b><br /><small class="bn-ob__mono">{{ e.subject }}</small></div><small>{{ day(e.at) }}</small></li></ul></div>
        <div class="bn-ob__box"><legend>{{ t("Company activity") }}</legend>
          <ul class="bn-setup__list"><li v-for="(e, i) in data.audit.company" :key="'c' + i"><div><b>{{ e.action }}</b><br /><small>{{ e.workspace }} · {{ e.resource }}</small></div><small>{{ day(e.at) }}</small></li></ul></div>
      </section>
    </template>
  </section>
</template>

<script>
const { inject, reactive, ref, computed, onMounted } = Vue;
const { useRoute, useRouter } = VueRouter;

const STATUS_LABEL = { pending: "Pending", approved: "Approved", declined: "Declined" };
const CODE_LABEL = { active: "Active", expired: "Expired", revoked: "Revoked" };

export default {
  setup() {
    const store = inject("store"), route = useRoute(), router = useRouter();
    const t = (text) => store.t(text);
    const phase = ref("loading"), busy = ref(false), error = ref(""), notice = ref(""), shownCode = ref("");
    const data = reactive({ companies: [], demoRequests: [], demoCodes: [], audit: { company: [], platform: [] } });
    const days = ref(7);
    const adj = reactive({ companyId: "", delta: null, note: "" });
    const tabs = computed(() => window.BuyniverseNavigation.tabs("/plataforma"));
    const current = computed(() => {
      const wanted = String(route.params.tab || "empresas");
      return tabs.value.some((tab) => tab.key === wanted) ? wanted : "empresas";
    });
    const crumbs = computed(() => window.BuyniverseNavigation.crumbs("/plataforma", current.value, "supplier", () => true));
    const day = (iso) => (iso ? new Date(String(iso).replace(" ", "T") + (String(iso).includes("T") ? "" : "Z")).toLocaleString(store.locale.value === "es" ? "es-MX" : "en-US", { dateStyle: "medium", timeStyle: "short" }) : "—");

    const load = async () => {
      error.value = "";
      try {
        const payload = await window.BuyniverseAdmin.overview();
        Object.assign(data, { companies: payload.companies, demoRequests: payload.demoRequests, demoCodes: payload.demoCodes, audit: payload.audit });
        phase.value = "ready";
      } catch (cause) {
        if (cause && cause.status === 403) phase.value = "denied";
        else { phase.value = "ready"; error.value = t("Platform administration is unavailable."); }
      }
    };
    const run = async (action, message) => {
      busy.value = true; error.value = ""; notice.value = "";
      try { const result = await action(); if (message) notice.value = t(message); await load(); return result; }
      catch (cause) { error.value = t(cause && cause.message ? cause.message : "The change could not be saved."); return null; }
      finally { busy.value = false; }
    };
    const decide = (request, action) => run(async () => {
      const result = await window.BuyniverseAdmin.decideRequest(request.id, action, days.value);
      shownCode.value = result.code || ""; return result;
    }, action === "approve" ? "Request approved." : "Request declined.");
    const revoke = (code) => run(() => window.BuyniverseAdmin.revokeCode(code.id), "Code revoked.");
    const adjust = () => run(async () => {
      await window.BuyniverseAdmin.adjustStamps(adj.companyId, Number(adj.delta), adj.note);
      Object.assign(adj, { companyId: "", delta: null, note: "" });
    }, "Stamps adjusted.");
    const open = (key) => router.push(`/plataforma/${key}`);

    onMounted(load);
    return { t, phase, busy, error, notice, shownCode, data, days, adj, tabs, current, crumbs, day, decide, revoke, adjust, open, STATUS_LABEL, CODE_LABEL };
  },
};
</script>
