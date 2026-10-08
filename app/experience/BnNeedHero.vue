<template>
  <section class="nh" :style="{ '--c': accent }">
    <div class="nh__grain" aria-hidden="true"></div>
    <div class="bn-wrap nh__stage">
      <div class="nh__col">
        <div class="nh__ttl">
          <h1 class="nh__h1">{{ store.t("I need") }}<em aria-hidden="true"><span class="nh__tx">{{ typed }}</span><span class="nh__caret"></span></em></h1>
        </div>
        <p class="nh__intro">{{ store.t("Publish once and the offers compete for you.") }}</p>

        <div class="nh__sbox">
          <form class="nh__search" role="search" novalidate data-no-validate="true" @submit.prevent="submit">
            <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
            <input id="nh-q" ref="input" v-model="query" class="ws-bare" type="text" maxlength="120" data-optional="true" autocomplete="off" :aria-label="store.t('What do you need?')" :placeholder="placeholder"
              aria-autocomplete="list" :aria-expanded="showSug" aria-controls="nh-sug" @input="onInput" @focus="onFocus" @blur="onBlur" @keydown="onKey" />
            <button type="submit" class="nh__go">{{ store.t("Find offers") }} →</button>
          </form>
          <div v-if="showSug" id="nh-sug" class="nh__sug" role="listbox">
            <button v-for="(s, k) in suggestions" :key="s.text" type="button" role="option" :aria-selected="k === hl" :class="{ hl: k === hl }" :style="{ '--c': s.color }" @mousedown.prevent="pick(s)">
              <i></i>{{ s.text }}<small>{{ s.count }} {{ store.t("suppliers") }}</small>
            </button>
          </div>
        </div>
        <div v-if="!running" class="nh__quick"><span>{{ store.t("Try") }}:</span><button v-for="p in quick" :key="p.text" type="button" @click="pick(p)">{{ p.text }}</button></div>

        <div class="nh__cards" role="group" :aria-label="store.t('Category')">
          <button type="button" class="nh__cc nh__cc--all" :class="{ on: sel < 0 }" :aria-pressed="sel < 0" @click="choose(-1)">
            <i class="fa-solid fa-table-cells-large" aria-hidden="true"></i>
            <span><b>{{ store.t("All") }}</b><small>{{ suppliers.length }} {{ store.t("suppliers") }} · {{ store.t("every category") }}</small></span>
          </button>
          <button v-for="(c, i) in cats" :key="c.key" type="button" class="nh__cc" :class="{ on: sel === i }" :style="{ '--c': c.color }" :aria-pressed="sel === i" @click="choose(i)" @pointerenter="hov = i" @pointerleave="hov = -1">
            <i class="fa-solid" :class="c.icon" aria-hidden="true"></i>
            <span><b>{{ store.t(c.label) }}</b><small>{{ totals[i] }} {{ store.t("suppliers") }}</small></span>
          </button>
        </div>
      </div>

      <aside class="nh__auc" aria-live="polite">
        <div class="nh__lh"><span>{{ store.t("Reverse auction") }} · {{ store.t("sample demo") }}</span><em>{{ shown.length }}/3 {{ store.t("offers") }}</em></div>
        <canvas ref="canvas" class="nh__orbit" role="img" :aria-label="store.t('The logo in motion: the dot is your need, the ring is the market, and the offers fall toward it. The closer to the dot, the better the price.')" @pointerdown="scene && scene.call()"></canvas>
        <small class="nh__k">{{ store.t("Your request") }}</small>
        <h3 class="nh__lt">{{ auctionTitle || store.t("Waiting for your request…") }}</h3>
        <div class="nh__meta">{{ auctionMeta }}</div>
        <div class="nh__off">
          <div v-for="(o, k) in shown" :key="o.name" class="nh__offer" :class="{ best: k === 0 && shown.length === 3 }"><span class="nh__dot">{{ o.name[0] }}</span><div><b>{{ o.name }}</b><small>{{ store.t("Delivery in") }} {{ o.days }} {{ store.t("days") }}</small></div><span class="nh__pct">−{{ o.pct }}%</span></div>
          <div v-for="n in 3 - shown.length" :key="'sk' + n" class="nh__offer nh__offer--sk" aria-hidden="true"><span class="nh__dot"></span><div><i></i><u></u></div><span class="nh__pct"></span></div>
        </div>
        <div class="nh__steps"><div><b>1 · {{ store.t("You publish") }}</b>{{ store.t("just once") }}</div><div><b>2 · {{ store.t("They compete") }}</b>{{ store.t("prices go down") }}</div><div><b>3 · {{ store.t("You choose") }}</b>{{ store.t("the best offer") }}</div></div>
      </aside>
    </div>
  </section>
</template>

<script>
const { inject, ref, computed, watch, onMounted, onBeforeUnmount } = Vue;
const { useRouter } = VueRouter;

// What people actually ask for, per kind of purchase (the typewriter and the suggestions).
const SAMPLES = {
  products: [{ es: "50 laptops para mi oficina", en: "50 laptops for my office" }, { es: "Mobiliario de oficina", en: "Office furniture" }, { es: "Equipo de cómputo y redes", en: "Computing and network equipment" }],
  talent: [{ es: "un desarrollador senior full-stack", en: "a senior full-stack developer" }, { es: "Diseñador UX/UI", en: "UX/UI designer" }, { es: "Analista de datos", en: "Data analyst" }],
  services: [{ es: "mantenimiento para mi planta", en: "maintenance for my plant" }, { es: "Auditoría y consultoría fiscal", en: "Tax audit and consulting" }, { es: "Limpieza corporativa", en: "Corporate cleaning" }],
  projects: [{ es: "la remodelación de mis oficinas", en: "my office renovation" }, { es: "Implementación de ERP", en: "ERP implementation" }, { es: "Construcción de nave industrial", en: "Industrial warehouse build" }],
  freight: [{ es: "un flete Monterrey – CDMX, 20 t", en: "a Monterrey – CDMX freight, 20 t" }, { es: "Transporte refrigerado", en: "Refrigerated transport" }, { es: "Logística internacional", en: "International logistics" }],
  supplies: [{ es: "material eléctrico y EPP para obra", en: "electrical supplies and PPE for a site" }, { es: "Papelería y cafetería", en: "Stationery and pantry" }, { es: "Equipo de protección personal", en: "Personal protective equipment" }],
};

export default {
  props: { suppliers: { type: Array, default: () => [] } },
  setup(props) {
    const store = inject("store"), router = useRouter();
    const Need = window.BuyniverseNeed, cats = Need.CATEGORIES;
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lang = () => (store.locale.value === "en" ? "en" : "es");
    const canvas = ref(null), input = ref(null), scene = ref(null);
    const query = ref(""), typed = ref(""), sel = ref(-1), hov = ref(-1), guessed = ref(-1), demoCat = ref(-1);
    const showSug = ref(false), hl = ref(-1), running = ref(false);
    const auctionTitle = ref(""), auctionMeta = ref(""), shown = ref([]);
    const focusIndex = () => (hov.value >= 0 ? hov.value : sel.value >= 0 ? sel.value : guessed.value >= 0 ? guessed.value : demoCat.value);
    const view = () => ({ suppliers: props.suppliers });
    const totals = computed(() => cats.map((c) => Need.matchSuppliers(view(), c.key, 999).length));
    const accent = computed(() => (focusIndex() >= 0 ? cats[focusIndex()].color : "#36e3c0"));
    const placeholder = computed(() => sel.value >= 0 ? store.t("Search") + " " + store.t(cats[sel.value].ph) + "…" : store.t("E.g. 50 laptops, a Monterrey–CDMX freight…"));
    const samples = (i) => SAMPLES[cats[i].key].map((s) => s[lang()]);
    const sample = (k, n) => ({ text: SAMPLES[k][n][lang()], color: cats[cats.findIndex((c) => c.key === k)].color, cat: k, count: Need.matchSuppliers(view(), k, 999).length });
    const quick = computed(() => ["products", "talent", "services"].map((k) => sample(k, 0)));
    const suggestions = computed(() => {
      const v = query.value.trim().toLowerCase(), pool = [];
      cats.forEach((c, i) => { if (sel.value >= 0 && sel.value !== i) return; samples(i).forEach((_, n) => pool.push(sample(c.key, n))); });
      return pool.filter((s) => !v || s.text.toLowerCase().includes(v) || v.split(/\s+/).some((w) => w.length > 2 && s.text.toLowerCase().includes(w))).slice(0, 5);
    });
    let paused = false, alive = true, timers = [], lastAct = Date.now();
    const ping = () => scene.value && scene.value.ping();
    const act = () => { lastAct = Date.now(); };
    const sleep = (ms) => new Promise((res) => timers.push(setTimeout(res, ms)));
    const pause = () => { paused = true; act(); };
    const clear = () => { timers.splice(0).forEach(clearTimeout); shown.value = []; auctionTitle.value = ""; auctionMeta.value = sel.value >= 0 ? `${store.t(cats[sel.value].label)} · ${totals.value[sel.value]} ${store.t("suppliers ready")}` : store.t("Pick a category or type what you need"); };
    const pct = [3, 8, 14], dayList = [5, 3, 2];
    const runAuction = (title, catIndex) => {
      timers.splice(0).forEach(clearTimeout); shown.value = []; running.value = true;
      const key = cats[catIndex].key, chosen = Need.matchSuppliers(view(), key, 3);
      auctionTitle.value = title; auctionMeta.value = `${store.t(cats[catIndex].label)} · ${store.t("notifying")} ${totals.value[catIndex]} ${store.t("suppliers")}`;
      if (scene.value) { scene.value.clear(); scene.value.call(); }
      chosen.forEach((s, k) => timers.push(setTimeout(() => { shown.value = [{ name: s.name, pct: pct[k], days: dayList[k] }, ...shown.value].sort((a, b) => b.pct - a.pct); if (scene.value) scene.value.addOrb({ id: s.id, label: "−" + pct[k] + "%", level: [0.12, 0.52, 1][k], win: k === chosen.length - 1 }); }, 700 + k * 900)));
    };
    const choose = (i) => { sel.value = sel.value === i ? -1 : i; pause(); ping(); if (!query.value.trim()) { typed.value = ""; running.value = false; clear(); } else if (sel.value >= 0) guessed.value = -1; };
    const onInput = () => { pause(); typed.value = query.value; const g = Need.guess(query.value); guessed.value = g ? cats.findIndex((c) => c.key === g) : -1; showSug.value = true; hl.value = -1; ping(); };
    const onFocus = () => { pause(); if (!query.value.trim()) { typed.value = ""; running.value = false; clear(); } showSug.value = suggestions.value.length > 0; };
    const onBlur = () => { setTimeout(() => { showSug.value = false; }, 120); act(); };
    const onKey = (e) => {
      if (!showSug.value || !suggestions.value.length) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); hl.value = (hl.value + (e.key === "ArrowDown" ? 1 : -1) + suggestions.value.length) % suggestions.value.length; }
      else if (e.key === "Enter" && hl.value >= 0) { e.preventDefault(); pick(suggestions.value[hl.value]); }
      else if (e.key === "Escape") showSug.value = false;
    };
    const pick = (s) => { query.value = s.text; sel.value = cats.findIndex((c) => c.key === s.cat); showSug.value = false; submit(); };
    const submit = () => {
      const text = query.value.trim();
      if (text.length < 3) { input.value && input.value.focus(); return store.notice(store.t("Write what you need or pick a suggestion."), "fa-circle-info"); }
      const key = sel.value >= 0 ? cats[sel.value].key : Need.guess(text);
      pause(); typed.value = text;
      router.push({ path: "/necesito", query: { q: text, ...(key ? { cat: key } : {}) } });
    };

    // The hero types by itself until the visitor takes over.
    const demo = async () => {
      clear();
      if (reduced) { typed.value = SAMPLES.products[0][lang()]; demoCat.value = 0; return; }
      await sleep(1400);
      let n = 0;
      while (alive) {
        if (paused) { await sleep(500); continue; }
        const k = n++ % cats.length, text = SAMPLES[cats[k].key][0][lang()];
        demoCat.value = k; ping();
        for (let c = 1; c <= text.length && !paused && alive; c++) { typed.value = text.slice(0, c); await sleep(46 + Math.random() * 55); }
        if (!paused && alive) { runAuction(text.charAt(0).toUpperCase() + text.slice(1), k); await sleep(4200); }
        while (typed.value.length && !paused && alive) { typed.value = typed.value.slice(0, -1); await sleep(16); }
        if (!paused) { running.value = false; clear(); }
        demoCat.value = -1;
        await sleep(1100);
      }
    };
    let idle = 0;
    onMounted(() => {
      demo();
      idle = setInterval(() => { if (paused && !reduced && Date.now() - lastAct > 12000 && !query.value.trim() && sel.value < 0 && document.activeElement !== input.value) { paused = false; guessed.value = -1; running.value = false; clear(); typed.value = ""; } }, 2000);
      if (window.BnOrbit && canvas.value) scene.value = window.BnOrbit.mount(canvas.value, { reduced, color: accent.value });
    });
    watch(accent, (c) => { if (scene.value) scene.value.setColor(c); });
    onBeforeUnmount(() => { alive = false; clearInterval(idle); timers.forEach(clearTimeout); if (scene.value) scene.value.dispose(); });

    return { store, cats, canvas, input, scene, query, typed, sel, hov, totals, accent, placeholder, quick, suggestions, showSug, hl, running, auctionTitle, auctionMeta, shown,
      choose, onInput, onFocus, onBlur, onKey, pick, submit };
  },
};
</script>
