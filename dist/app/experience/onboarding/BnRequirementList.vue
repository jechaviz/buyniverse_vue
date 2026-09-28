<template>
  <div class="bn-req">
    <section v-for="group in groups" :key="group.key" class="bn-req__group">
      <h4>{{ t(group.title) }}</h4>
      <ul>
        <li v-for="item in group.items" :key="item.id" :class="'bn-req__item bn-req__item--' + item.tone">
          <i class="fa-solid" :class="item.icon" aria-hidden="true"></i>
          <div class="bn-req__body">
            <b>{{ lang(item.definition.label) }}</b>
            <span>{{ item.note || lang(item.definition.detail) }}</span>
            <form v-if="uploads && item.kind === 'document' && item.status !== 'met'" class="bn-req__upload" @submit.prevent="upload(item)">
              <label><span>{{ t("Issue date") }}</span><input v-model="dates[item.id]" type="date" class="bn-input" :max="today" required /></label>
              <label><span>PDF</span><input type="file" accept="application/pdf,.pdf" class="bn-input" required @change="files[item.id] = $event.target.files[0] || null" /></label>
              <button class="bn-btn bn-btn--primary bn-btn--sm" :disabled="busy === item.id"><i class="fa-solid" :class="busy === item.id ? 'fa-circle-notch fa-spin' : 'fa-upload'"></i>{{ t("Upload") }}</button>
            </form>
          </div>
          <em v-if="item.statusLabel" class="bn-req__status">{{ item.statusLabel }}</em>
        </li>
      </ul>
    </section>
  </div>
</template>

<script>
const { inject, computed, reactive, ref } = Vue;

const TONES = {
  met: { tone: "ok", icon: "fa-circle-check", label: "Ready" },
  missing: { tone: "todo", icon: "fa-circle", label: "" },
  invalid: { tone: "error", icon: "fa-circle-xmark", label: "Check" },
  pending: { tone: "todo", icon: "fa-file-arrow-up", label: "Pending" },
  expired: { tone: "error", icon: "fa-clock-rotate-left", label: "Expired" },
  info: { tone: "info", icon: "fa-circle-info", label: "" },
};

export default {
  props: {
    registry: { type: Object, required: true },
    countryCode: { type: String, required: true },
    evaluation: { type: Object, default: null },
    serverFailures: { type: Array, default: () => [] },
    uploads: { type: Boolean, default: false },
    companyId: { type: String, default: "" },
  },
  emits: ["updated"],
  setup(props, { emit }) {
    const store = inject("store");
    const t = (text) => store.t(text);
    const lang = (value) => (value && typeof value === "object" ? value[store.locale.value] || value.es || "" : value || "");
    const country = computed(() => window.BuyniverseFiscal.findCountry(props.registry, props.countryCode));
    const message = (code) => lang((props.registry.messages || {})[code]) || "";
    const dates = reactive({}), files = reactive({}), busy = ref("");
    const today = new Date().toISOString().slice(0, 10);

    const items = computed(() => {
      if (!country.value || !props.evaluation) return [];
      const definitions = Object.fromEntries(country.value.requirements.map((item) => [item.id, item]));
      const server = Object.fromEntries(props.serverFailures.map((item) => [item.id, item]));
      return props.evaluation.requirements.map((item) => {
        const merged = server[item.id] ? { ...item, ...server[item.id] } : item;
        const tone = TONES[merged.status] || TONES.missing;
        const warning = (merged.warnings || [])[0];
        const note = merged.code ? message(merged.code) : warning ? message(warning) : merged.status === "expired" ? message("expired") : "";
        return { ...merged, definition: definitions[item.id] || { label: item.id, detail: "" }, tone: warning && merged.status === "met" ? "warn" : tone.tone,
          icon: warning && merged.status === "met" ? "fa-triangle-exclamation" : tone.icon, statusLabel: tone.label ? t(tone.label) : "", note };
      });
    });
    const groups = computed(() => [
      { key: "enrollment", title: "To enrol as a supplier", items: items.value.filter((item) => item.kind !== "info" && item.phase === "enrollment") },
      { key: "verification", title: "To become a formal supplier", items: items.value.filter((item) => item.kind !== "info" && item.phase === "verification") },
      { key: "info", title: "Good to know", items: items.value.filter((item) => item.kind === "info") },
    ].filter((group) => group.items.length));

    const upload = async (item) => {
      if (!files[item.id] || !dates[item.id]) return;
      busy.value = item.id;
      try {
        const result = await window.BuyniverseOnboarding.uploadComplianceDocument(props.companyId, item.id, dates[item.id], files[item.id]);
        store.notice(t("Document received and verified by the server."), "fa-file-circle-check");
        emit("updated", result);
      } catch (error) {
        store.notice(t(error && error.message ? error.message : "The document could not be uploaded."), "fa-triangle-exclamation");
      } finally { busy.value = ""; }
    };

    return { t, lang, groups, dates, files, busy, today, upload };
  },
};
</script>
