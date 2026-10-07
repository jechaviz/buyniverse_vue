<template>
  <section class="np" :style="{ '--c': category.color }">
    <header class="np__head">
      <p class="np__eyebrow"><i class="fa-solid fa-bolt"></i>{{ store.t("Publish a need") }}</p>
      <h1 class="np__h1">{{ store.t("I need") }} <span class="np__tx">{{ form.text || store.t("…") }}</span></h1>
      <p class="np__lead">{{ store.t("Publish once and the offers compete for you.") }}</p>
    </header>

    <form class="np__form" novalidate data-no-validate="true" @submit.prevent="publish">
      <label class="np__field np__field--wide">
        <span>{{ store.t("What do you need?") }}</span>
        <input v-model="form.text" class="field" type="text" maxlength="160" required :placeholder="store.t('E.g. 50 laptops, a Monterrey–CDMX freight…')" @input="retag" />
      </label>

      <div class="np__cats" role="group" :aria-label="store.t('Category')">
        <button v-for="c in cats" :key="c.key" type="button" class="np__cat" :class="{ on: form.category === c.key }" :style="{ '--c': c.color }" :aria-pressed="form.category === c.key" @click="form.category = c.key; touched = true">
          <i class="fa-solid" :class="c.icon"></i>{{ store.t(c.label) }}
        </button>
      </div>

      <div class="np__row">
        <label class="np__field"><span>{{ store.t("Quantity") }}</span><input v-model.number="form.quantity" class="field" type="number" min="1" step="1" /></label>
        <label class="np__field"><span>{{ store.t("Maximum budget") }}</span><input v-model.number="form.budget" class="field" type="number" min="1" step="any" required /></label>
        <label class="np__field"><span>{{ store.t("Currency") }}</span><select v-model="form.currency" class="field"><option v-for="c in ['MXN', 'USD', 'EUR']" :key="c" :value="c">{{ c }}</option></select></label>
      </div>

      <fieldset class="np__modes">
        <legend>{{ store.t("How should suppliers compete?") }}</legend>
        <label class="np__mode" :class="{ on: form.mode === 'rfq' }">
          <input v-model="form.mode" type="radio" value="rfq" />
          <i class="fa-solid fa-file-signature"></i>
          <span><b>{{ store.t("Quote round") }}</b><small>{{ store.t("Each supplier sends one offer before the deadline. Best for comparing more than price.") }}</small></span>
          <select v-if="form.mode === 'rfq'" v-model.number="form.days" class="field np__when" :aria-label="store.t('Needed by')"><option v-for="d in [3, 7, 14, 30]" :key="d" :value="d">{{ d }} {{ store.t("days") }}</option></select>
        </label>
        <label class="np__mode" :class="{ on: form.mode === 'auction' }">
          <input v-model="form.mode" type="radio" value="auction" />
          <i class="fa-solid fa-gavel"></i>
          <span><b>{{ store.t("Live reverse auction") }}</b><small>{{ store.t("Suppliers bid each other down in real time, with anti-sniping. Best for commodities.") }}</small></span>
          <select v-if="form.mode === 'auction'" v-model.number="form.minutes" class="field np__when" :aria-label="store.t('Duration')"><option v-for="m in [30, 60, 240, 1440]" :key="m" :value="m">{{ m >= 1440 ? "24 h" : m >= 60 ? m / 60 + " h" : m + " min" }}</option></select>
        </label>
      </fieldset>

      <aside class="np__who" aria-live="polite">
        <h2>{{ store.t("We will invite") }} <b>{{ invited.length }}</b> {{ store.t("verified suppliers") }}</h2>
        <ul>
          <li v-for="s in invited" :key="s.id"><span class="np__av">{{ s.name[0] }}</span><b>{{ s.name }}</b><small>{{ store.t("Score") }} {{ s.score }} · {{ store.t("on time") }} {{ s.onTime }}%</small></li>
        </ul>
        <p v-if="invited.length < 2" class="np__warn"><i class="fa-solid fa-triangle-exclamation"></i>{{ store.t("Fewer than two suppliers fit this need yet") }}</p>
      </aside>

      <footer class="np__foot">
        <p class="np__gov"><i class="fa-solid fa-shield-halved"></i>{{ approves ? store.t("You approve your own needs, so the offers start right away.") : store.t("Your approver will review it first; the offers start as soon as they approve.") }}</p>
        <button type="submit" class="np__go" :disabled="busy || invited.length < 2">{{ store.t("Publish need") }} →</button>
      </footer>
      <p class="np__alt">{{ store.t("Need milestones and escrow for a service project?") }} <RouterLink to="/post-job/new">{{ store.t("Post a project") }}</RouterLink></p>
    </form>
    <NeedLaunch :open="launch.open" :color="category.color" :focus="catIndex" :lines="launch.lines" @done="goTo" />
  </section>
</template>

<script>
const { inject, reactive, ref, computed, watch, onBeforeUnmount } = Vue;
const { useRoute, useRouter } = VueRouter;
const NeedLaunch = Vue.defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule("./app/components/NeedLaunch.vue?v=2", window.sfcOptions));

export default {
  components: { NeedLaunch },
  setup() {
    const store = inject("store"), route = useRoute(), router = useRouter();
    const Need = window.BuyniverseNeed, cats = Need.CATEGORIES;
    const initial = Need.byKey(String(route.query.cat || "")) || Need.byKey(Need.guess(String(route.query.q || ""))) || cats[0];
    const form = reactive({ text: String(route.query.q || "").slice(0, 160), category: initial.key, quantity: 1, budget: null, currency: store.locale.value === "en" ? "USD" : "MXN", mode: "rfq", days: 7, minutes: 60 });
    const touched = ref(Boolean(route.query.cat)), busy = ref(false);
    const category = computed(() => Need.byKey(form.category) || cats[0]);
    // Until the person picks a category, the text decides it.
    const retag = () => { if (!touched.value) { const g = Need.guess(form.text); if (g) form.category = g; } };
    const invited = computed(() => Need.matchSuppliers(store.state, form.category, 4));
    const approves = computed(() => store.canApproveRequest({ approverId: "user-admin-admin" }));
    watch(category, (c) => { store.ui.ambient = c.color; }, { immediate: true });
    onBeforeUnmount(() => { store.ui.ambient = ""; });
    // Publishing is a short, honest moment: the mark orbits, the suppliers are named, then you land where the offers arrive.
    const launch = reactive({ open: false, lines: [], target: null });
    const catIndex = computed(() => cats.findIndex((c) => c.key === form.category));
    const reduced = Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const goTo = () => { const target = launch.target; launch.open = false; if (target) router.push(target); };
    const publish = () => {
      if (busy.value) return;
      busy.value = true;
      const result = store.publishNeed({ ...form });
      busy.value = false;
      if (!result) return;
      const created = `${store.t("Need created")} · ${result.request.id}`;
      if (result.pending) {
        launch.target = `/procurement/queue?request=${result.request.id}`;
        launch.lines = [created, store.t("Sent to your approver"), store.t("Offers start when it is approved")];
      } else {
        const names = (result.event?.invitedSupplierIds || []).map((id) => store.state.suppliers.find((s) => s.id === id)?.name).filter(Boolean);
        launch.target = result.auction ? `/procurement/auction?auction=${encodeURIComponent(result.auction.id)}` : `/procurement/sourcing?event=${encodeURIComponent(result.event.id)}&tab=bidsheet`;
        launch.lines = [created, `${store.t("Inviting suppliers")}: ${names.join(", ")}`, store.t(form.mode === "auction" ? "The live auction is open" : "Quote round sent to the suppliers")];
      }
      if (reduced) return goTo();
      launch.open = true;
    };
    return { store, cats, form, category, touched, busy, retag, invited, approves, publish, launch, catIndex, goTo };
  },
};
</script>
