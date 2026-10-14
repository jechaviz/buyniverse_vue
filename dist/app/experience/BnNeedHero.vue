<template>
  <section class="nh" :style="{ '--c': accent }">
    <div class="nh__grain" aria-hidden="true"></div>
    <div class="bn-wrap nh__stage">
      <!-- Left Column: Value Prop, Input & Category Pills -->
      <div class="nh__col">
        <div class="nh__eyebrow">
          <span class="nh__eyebrow-dot"></span>
          <span>{{ store.t("B2B Procurement & Reverse Auction Platform") }}</span>
        </div>

        <div class="nh__ttl">
          <h1 class="nh__h1">{{ store.t("I need") }}<em aria-hidden="true"><span class="nh__tx">{{ typed }}</span><span class="nh__caret"></span></em></h1>
        </div>

        <p class="nh__intro">{{ store.t("Publish once and the offers compete for you.") }}</p>

        <!-- Search / Request Box -->
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

        <!-- Clean, Lightweight Category Pills (Single horizontal row) -->
        <div class="nh__pills" role="tablist" :aria-label="store.t('Category')">
          <button type="button" class="nh__pill" :class="{ on: sel < 0 }" :aria-pressed="sel < 0" @click="choose(-1)">
            <i class="fa-solid fa-layer-group" aria-hidden="true"></i>
            <span>{{ store.t("All") }}</span>
          </button>
          <button v-for="(c, i) in cats" :key="c.key" type="button" class="nh__pill" :class="{ on: sel === i }" :style="{ '--c': c.color }" :aria-pressed="sel === i" @click="choose(i)" @pointerenter="hov = i" @pointerleave="hov = -1">
            <i class="fa-solid" :class="c.icon" aria-hidden="true"></i>
            <span>{{ store.t(c.label) }}</span>
          </button>
        </div>

        <!-- Trust Badges Strip -->
        <div class="nh__trust">
          <span><i class="fa-solid fa-shield-halved" aria-hidden="true"></i> {{ store.t("Escrow Protected") }}</span>
          <span><i class="fa-solid fa-file-invoice-dollar" aria-hidden="true"></i> {{ store.t("Automated CFDI 4.0") }}</span>
          <span><i class="fa-solid fa-percent" aria-hidden="true"></i> {{ store.t("0% fee without savings") }}</span>
        </div>
      </div>

      <!-- Right Column: Crystal-Clear Live Reverse Auction Card -->
      <aside class="nh__card" aria-live="polite">
        <!-- Card Header: Live pulse & timer -->
        <div class="nh__card-top">
          <div class="nh__card-live">
            <span class="nh__card-beacon"></span>
            <span>{{ store.t("Live reverse auction") }}</span>
          </div>
          <div class="nh__card-meta">
            <span class="nh__card-folio">#RFQ-{{ folioId }}</span>
            <span class="nh__card-timer"><i class="fa-regular fa-clock" aria-hidden="true"></i> {{ timerDisplay }}</span>
          </div>
        </div>

        <!-- Requisition Item Title & Specs -->
        <div class="nh__card-item">
          <span class="nh__card-cat">{{ store.t(activeCat.label) }}</span>
          <h2 class="nh__card-title">{{ rfqData.title[lang()] }}</h2>
          <p class="nh__card-specs">{{ rfqData.specs[lang()] }}</p>
        </div>

        <!-- Price Descent Hero: Initial Budget vs Winning Offer -->
        <div class="nh__card-pricing">
          <div class="nh__card-budget">
            <span class="nh__card-lbl">{{ store.t("Maximum budget") }}</span>
            <div class="nh__card-budget-val">{{ formatMoney(rfqData.budget[lang()]) }}</div>
          </div>
          <div class="nh__card-divider" aria-hidden="true">→</div>
          <div class="nh__card-winner">
            <span class="nh__card-lbl">{{ store.t("Current best offer") }}</span>
            <div class="nh__card-winner-val">{{ formatMoney(bestBidAmount) }}</div>
            <div class="nh__card-savings">
              <i class="fa-solid fa-arrow-trend-down" aria-hidden="true"></i>
              <span>-{{ rfqData.bids[0].pct }}% ({{ formatMoney(savingsAmount) }} {{ store.t("saved") }})</span>
            </div>
          </div>
        </div>

        <!-- Competing Suppliers Live (2 clean, highly readable rows) -->
        <div class="nh__card-bids">
          <div class="nh__card-bids-head">
            <span>{{ store.t("Live competing offers") }}</span>
            <em>{{ rfqData.poolCount }} {{ store.t("verified-ready suppliers") }}</em>
          </div>

          <!-- Leader Bid (#1 BAFO) -->
          <div class="nh__bid is-leader">
            <div class="nh__bid-badge">#1 BAFO</div>
            <div class="nh__bid-info">
              <b class="nh__bid-name">{{ rfqData.bids[0].name }}</b>
              <span class="nh__bid-meta"><i class="fa-solid fa-check" aria-hidden="true"></i> {{ rfqData.bids[0].badge }}</span>
            </div>
            <div class="nh__bid-price">
              <b>{{ formatMoney(bestBidAmount) }}</b>
              <small class="nh__bid-green">-{{ rfqData.bids[0].pct }}%</small>
            </div>
          </div>

          <!-- Runner-up Bid (#2) -->
          <div class="nh__bid is-runner">
            <div class="nh__bid-badge">#2</div>
            <div class="nh__bid-info">
              <b class="nh__bid-name">{{ rfqData.bids[1].name }}</b>
              <span class="nh__bid-meta">{{ store.t("Delivery in") }} {{ rfqData.bids[1].days }} {{ store.t("days") }}</span>
            </div>
            <div class="nh__bid-price">
              <b>{{ formatMoney(bidAmount(rfqData.bids[1].pct)) }}</b>
              <small>-{{ rfqData.bids[1].pct }}%</small>
            </div>
          </div>
        </div>

        <!-- Footer Action -->
        <div class="nh__card-foot">
          <RouterLink to="/procurement/auction" class="nh__card-action">
            <span>{{ store.t("Watch live auction") }}</span>
            <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </RouterLink>
        </div>
      </aside>
    </div>
  </section>
</template>

<script>
const { inject, ref, computed, watch, onMounted, onBeforeUnmount } = Vue;
const { useRouter } = VueRouter;

let instanceId = 0;

const SAMPLES = {
  products: [{ es: "50 laptops para mi oficina", en: "50 laptops for my office" }, { es: "Mobiliario de oficina", en: "Office furniture" }, { es: "Equipo de cómputo y redes", en: "Computing and network equipment" }],
  talent: [{ es: "un desarrollador senior full-stack", en: "a senior full-stack developer" }, { es: "Diseñador UX/UI", en: "UX/UI designer" }, { es: "Analista de datos", en: "Data analyst" }],
  services: [{ es: "mantenimiento para mi planta", en: "maintenance for my plant" }, { es: "Auditoría y consultoría fiscal", en: "Tax audit and consulting" }, { es: "Limpieza corporativa", en: "Corporate cleaning" }],
  projects: [{ es: "la remodelación de mis oficinas", en: "my office renovation" }, { es: "Implementación de ERP", en: "ERP implementation" }, { es: "Construcción de nave industrial", en: "Industrial warehouse build" }],
  freight: [{ es: "un flete Monterrey – CDMX, 20 t", en: "a Monterrey – CDMX freight, 20 t" }, { es: "Transporte refrigerado", en: "Refrigerated transport" }, { es: "Logística internacional", en: "International logistics" }],
  supplies: [{ es: "material eléctrico y EPP para obra", en: "electrical supplies and PPE for a site" }, { es: "Papelería y cafetería", en: "Stationery and pantry" }, { es: "Equipo de protección personal", en: "Personal protective equipment" }],
};

const AUCTION_PRESETS = {
  products: {
    title: { es: "50 Laptops Dell Latitude 5540 Core i7 / 32GB", en: "50 Dell Latitude 5540 Laptops Core i7 / 32GB" },
    specs: { es: "i7-1365U · 32GB DDR5 · 512GB SSD NVMe · Garantía ProSupport 3 años", en: "i7-1365U · 32GB DDR5 · 512GB NVMe SSD · 3-Yr ProSupport Warranty" },
    budget: { es: 1250000, en: 68500 },
    currency: { es: "MXN", en: "USD" },
    poolCount: 18,
    bids: [
      { name: "Compusistemas de México, S.A. de C.V.", badge: "SAT 69-B Negativo · 3-Way Match", days: 3, pct: 21.0, win: true },
      { name: "TechSupply Corporation Latam", badge: "Verificado SAT · ISO-9001", days: 5, pct: 15.2, win: false },
      { name: "Distribuidora Central IT", badge: "Proveedor Homologado", days: 7, pct: 8.0, win: false },
    ],
  },
  talent: {
    title: { es: "Desarrollador Senior Full-Stack (Vue + Node / 6 meses)", en: "Senior Full-Stack Developer (Vue + Node / 6 months)" },
    specs: { es: "Dedicación 100% remota · Horario CST · Experiencia B2B SaaS · Inglés C1", en: "Full-time remote · CST timezone · B2B SaaS · C1 English" },
    budget: { es: 480000, en: 32000 },
    currency: { es: "MXN", en: "USD" },
    poolCount: 24,
    bids: [
      { name: "DevStudio Latam Specialists", badge: "Top Rated Plus · Escrow Protegido", days: 1, pct: 22.0, win: true },
      { name: "CloudTalent Solutions", badge: "Entrevista Técnica Aprobada", days: 3, pct: 15.0, win: false },
      { name: "CodeCraft Staffing Agency", badge: "Talento Certificado", days: 5, pct: 8.0, win: false },
    ],
  },
  services: {
    title: { es: "Auditoría Financiera y Dictamen Fiscal Anual", en: "Annual Financial Audit & Corporate Tax Filing" },
    specs: { es: "Dictamen fiscal SAT · Normas NIIF · Revisión de control interno", en: "Official tax filing · IFRS Standards · Internal controls audit" },
    budget: { es: 350000, en: 19500 },
    currency: { es: "MXN", en: "USD" },
    poolCount: 14,
    bids: [
      { name: "Mancera, Castillo & Asociados S.C.", badge: "Firma Certificada IMCP · Conforme SAT", days: 10, pct: 19.0, win: true },
      { name: "Consultoría Fiscal del Norte", badge: "Despacho Homologado", days: 15, pct: 12.0, win: false },
      { name: "Servicios Contables Corporativos", badge: "Proveedor Verificado", days: 20, pct: 6.0, win: false },
    ],
  },
  projects: {
    title: { es: "Remodelación de Oficinas Corporativas (800 m²)", en: "Corporate Office Renovation (8,500 sq ft)" },
    specs: { es: "Llave en mano: cancelería, climatización, cableado estructurado Cat6A", en: "Turnkey: glass partitions, HVAC, Cat6A structured cabling" },
    budget: { es: 2100000, en: 115000 },
    currency: { es: "MXN", en: "USD" },
    poolCount: 11,
    bids: [
      { name: "Constructora Espacios S.A.", badge: "Fianza de Cumplimiento · REPSE Vigente", days: 30, pct: 21.0, win: true },
      { name: "Diseño & Obra Civil Metropolitana", badge: "Arquitectura Corporativa", days: 40, pct: 13.0, win: false },
      { name: "Grupo Constructor Urbano", badge: "Proveedor Registrado", days: 50, pct: 7.0, win: false },
    ],
  },
  freight: {
    title: { es: "Flete Monterrey – CDMX (Caja Seca 20 t / 53 ft)", en: "Freight Monterrey – CDMX (53ft Dry Van / 20 tons)" },
    specs: { es: "Seguro de mercancía · GPS 24/7 · Carta Porte SAT complementada", en: "Transit insurance · 24/7 GPS · SAT Carta Porte validated" },
    budget: { es: 58000, en: 3200 },
    currency: { es: "MXN", en: "USD" },
    poolCount: 16,
    bids: [
      { name: "Transportes Rápidos del Norte S.A.", badge: "Certificación C-TPAT · GPS Satelital", days: 1, pct: 23.0, win: true },
      { name: "Logística y Carga Nacional MX", badge: "Carta Porte Validada · Flota Reciente", days: 2, pct: 15.0, win: false },
      { name: "Fletes y Enlaces Consolidados", badge: "Línea Verificada", days: 2, pct: 8.0, win: false },
    ],
  },
  supplies: {
    title: { es: "Lote de Material Eléctrico y Equipo EPP Industrial", en: "Industrial Electrical Supplies & Safety PPE Batch" },
    specs: { es: "300 cascos Clase E, 500 pares guantes dieléctricos, 120 arneses NOM", en: "300 Class E hard hats, 500 dielectric gloves, 120 safety harnesses" },
    budget: { es: 420000, en: 23000 },
    currency: { es: "MXN", en: "USD" },
    poolCount: 22,
    bids: [
      { name: "Distribuidora Industrial del Golfo", badge: "Distribuidor Master 3M · NOM Certificado", days: 2, pct: 21.0, win: true },
      { name: "Ferretera y Eléctrica Nacional", badge: "Entrega en Sitio · ISO-9001", days: 4, pct: 14.0, win: false },
      { name: "Suministros Industriales Centrales", badge: "Proveedor Homologado", days: 5, pct: 7.0, win: false },
    ],
  },
};

export default {
  props: { suppliers: { type: Array, default: () => [] } },
  setup(props) {
    const store = inject("store"), router = useRouter();
    const Need = window.BuyniverseNeed, cats = Need.CATEGORIES;
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const uid = ++instanceId;
    const lang = () => (store.locale.value === "en" ? "en" : "es");

    const input = ref(null);
    const query = ref(""), typed = ref(""), sel = ref(-1), hov = ref(-1), guessed = ref(-1), demoCat = ref(-1);
    const showSug = ref(false), hl = ref(-1), running = ref(false);
    const timerSeconds = ref(104);
    const folioId = ref("8942");

    const focusIndex = () => (hov.value >= 0 ? hov.value : sel.value >= 0 ? sel.value : guessed.value >= 0 ? guessed.value : demoCat.value >= 0 ? demoCat.value : 0);
    const activeCat = computed(() => cats[focusIndex()] || cats[0]);
    const rfqData = computed(() => AUCTION_PRESETS[activeCat.value.key] || AUCTION_PRESETS.products);
    const accent = computed(() => activeCat.value.color || "#36e3c0");

    const view = () => ({ suppliers: props.suppliers });
    const totals = computed(() => cats.map((c) => Need.matchSuppliers(view(), c.key, 999).length));
    const placeholder = computed(() => sel.value >= 0 ? store.t("Search") + " " + store.t(cats[sel.value].ph) + "…" : store.t("E.g. 50 laptops, a Monterrey–CDMX freight…"));

    const samples = (i) => SAMPLES[cats[i].key].map((s) => s[lang()]);
    const sample = (k, n) => ({ text: SAMPLES[k][n][lang()], color: cats[cats.findIndex((c) => c.key === k)].color, cat: k, count: Need.matchSuppliers(view(), k, 999).length });
    const quick = computed(() => ["products", "talent", "services"].map((k) => sample(k, 0)));
    const suggestions = computed(() => {
      const v = query.value.trim().toLowerCase(), pool = [];
      cats.forEach((c, i) => { if (sel.value >= 0 && sel.value !== i) return; samples(i).forEach((_, n) => pool.push(sample(c.key, n))); });
      return pool.filter((s) => !v || s.text.toLowerCase().includes(v) || v.split(/\s+/).some((w) => w.length > 2 && s.text.toLowerCase().includes(w))).slice(0, 5);
    });

    const formatMoney = (val) => {
      const curr = rfqData.value.currency[lang()];
      const sym = curr === "USD" ? "USD $" : "$";
      return `${sym}${Math.round(val).toLocaleString(lang() === "es" ? "es-MX" : "en-US")} ${curr}`;
    };

    const bidAmount = (pct) => {
      const b = rfqData.value.budget[lang()];
      return b * (1 - pct / 100);
    };

    const bestBidAmount = computed(() => bidAmount(rfqData.value.bids[0].pct));
    const savingsAmount = computed(() => rfqData.value.budget[lang()] - bestBidAmount.value);

    const timerDisplay = computed(() => {
      const m = Math.floor(timerSeconds.value / 60);
      const s = timerSeconds.value % 60;
      return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}s`;
    });

    let paused = false, alive = true, timers = [], lastAct = Date.now(), timerInterval = 0;
    const act = () => { lastAct = Date.now(); };
    const sleep = (ms) => new Promise((res) => timers.push(setTimeout(res, ms)));
    const pause = () => { paused = true; act(); };

    const choose = (i) => {
      sel.value = sel.value === i ? -1 : i;
      pause();
      folioId.value = String(8900 + Math.floor(Math.random() * 99));
      if (!query.value.trim()) {
        typed.value = "";
        running.value = false;
      } else if (sel.value >= 0) {
        guessed.value = -1;
      }
    };

    const onInput = () => {
      pause();
      typed.value = query.value;
      const g = Need.guess(query.value);
      guessed.value = g ? cats.findIndex((c) => c.key === g) : -1;
      showSug.value = true;
      hl.value = -1;
    };

    const onFocus = () => {
      pause();
      if (!query.value.trim()) {
        typed.value = "";
        running.value = false;
      }
      showSug.value = suggestions.value.length > 0;
    };

    const onBlur = () => {
      setTimeout(() => { showSug.value = false; }, 140);
      act();
    };

    const onKey = (e) => {
      if (!showSug.value || !suggestions.value.length) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        hl.value = (hl.value + (e.key === "ArrowDown" ? 1 : -1) + suggestions.value.length) % suggestions.value.length;
      } else if (e.key === "Enter" && hl.value >= 0) {
        e.preventDefault();
        pick(suggestions.value[hl.value]);
      } else if (e.key === "Escape") {
        showSug.value = false;
      }
    };

    const pick = (s) => {
      query.value = s.text;
      sel.value = cats.findIndex((c) => c.key === s.cat);
      showSug.value = false;
      submit();
    };

    const submit = () => {
      const text = query.value.trim();
      if (text.length < 3) {
        input.value && input.value.focus();
        return store.notice(store.t("Write what you need or pick a suggestion."), "fa-circle-info");
      }
      const key = sel.value >= 0 ? cats[sel.value].key : Need.guess(text);
      pause();
      typed.value = text;
      router.push({ path: "/necesito", query: { q: text, ...(key ? { cat: key } : {}) } });
    };

    // The hero types dynamically and cycles live auction scenarios
    const demo = async () => {
      if (reduced) {
        typed.value = SAMPLES.products[0][lang()];
        demoCat.value = 0;
        return;
      }
      await sleep(1400);
      let n = 0;
      while (alive) {
        if (paused) { await sleep(500); continue; }
        const k = n++ % cats.length;
        const text = SAMPLES[cats[k].key][0][lang()];
        demoCat.value = k;
        folioId.value = String(8900 + k * 14 + (n % 7));
        for (let c = 1; c <= text.length && !paused && alive; c++) {
          typed.value = text.slice(0, c);
          await sleep(46 + Math.random() * 55);
        }
        if (!paused && alive) {
          running.value = true;
          await sleep(4200);
        }
        while (typed.value.length && !paused && alive) {
          typed.value = typed.value.slice(0, -1);
          await sleep(16);
        }
        if (!paused) { running.value = false; }
        demoCat.value = -1;
        await sleep(1100);
      }
    };

    let idle = 0;
    onMounted(() => {
      demo();
      timerInterval = setInterval(() => {
        if (timerSeconds.value > 12) timerSeconds.value--;
        else timerSeconds.value = 118;
      }, 1000);
      idle = setInterval(() => {
        if (paused && !reduced && Date.now() - lastAct > 14000 && !query.value.trim() && sel.value < 0 && document.activeElement !== input.value) {
          paused = false;
          guessed.value = -1;
          running.value = false;
          typed.value = "";
        }
      }, 2000);
    });

    onBeforeUnmount(() => {
      alive = false;
      clearInterval(idle);
      clearInterval(timerInterval);
      timers.forEach(clearTimeout);
    });

    return {
      store, cats, input, query, typed, sel, hov, totals, accent, placeholder, quick, suggestions, showSug, hl, running,
      uid, lang, folioId, timerDisplay, activeCat, rfqData, bestBidAmount, savingsAmount, formatMoney, bidAmount,
      choose, onInput, onFocus, onBlur, onKey, pick, submit
    };
  },
};
</script>
