<template>
  <div class="space-y-5">
    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      <article
        v-for="metric in metrics"
        :key="metric.label"
        class="premium-card rounded-xl border p-4"
      >
        <div class="flex items-start justify-between">
          <span
            class="grid h-9 w-9 place-items-center rounded-lg"
            :class="metric.tone"
            ><i class="fa-solid" :class="metric.icon"></i></span
          ><span
            class="text-[10px] font-bold"
            :class="
              metric.delta.startsWith('+')
                ? 'text-emerald-500'
                : 'text-slate-400'
            "
            >{{ metric.delta }}</span
          >
        </div>
        <p class="mt-4 text-xs font-semibold text-slate-500">
          {{ metric.label }}
        </p>
        <p class="mt-1 text-2xl font-800">{{ metric.value }}</p>
      </article>
    </section>

    <nav class="glass flex gap-1 overflow-x-auto rounded-xl p-1.5">
      <button
        v-for="item in tabs"
        :key="item.key"
        class="min-w-max rounded-lg px-3 py-2 text-xs font-bold"
        :class="
          tab === item.key
            ? 'bg-brand text-white'
            : 'text-slate-500 hover:bg-white/60 dark:hover:bg-slate-700'
        "
        @click="tab = item.key"
      >
        <i class="fa-solid mr-1.5" :class="item.icon"></i>{{ item.label }}
      </button>
    </nav>

    <div
      v-if="tab === 'portfolio'"
      class="grid gap-5 2xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,.8fr)]"
    >
      <article class="panel p-5">
        <div
          class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h2 class="text-lg font-800">Spend and savings</h2>
            <p class="mt-1 text-xs text-slate-500">
              Current purchase activity and savings over time.
            </p>
          </div>
          <button class="btn-muted" @click="exportReport('portfolio')">
            <i class="fa-solid fa-file-arrow-down"></i>Export
          </button>
        </div>
        <div class="mt-6 flex h-72 items-end gap-3 sm:gap-6">
          <div
            v-for="point in analytics.monthly"
            :key="point.month"
            class="group flex h-full min-w-0 flex-1 flex-col justify-end"
          >
            <div class="relative flex flex-1 items-end justify-center gap-1">
              <div
                class="w-2/5 rounded-t-md bg-slate-300 transition group-hover:bg-slate-400 dark:bg-slate-600"
                :style="{ height: height(point.spend, maxSpend) }"
              >
                <span class="sr-only">{{ store.money(point.spend) }}</span>
              </div>
              <div
                class="w-2/5 rounded-t-md bg-brand transition"
                :style="{ height: height(point.savings, maxSavings) }"
              >
                <span class="sr-only">{{ store.money(point.savings) }}</span>
              </div>
            </div>
            <div class="mt-2 text-center">
              <b class="block text-[10px]">{{ point.month }}</b
              ><span class="text-[9px] text-slate-400"
                >{{ point.events }} rounds</span
              >
            </div>
          </div>
        </div>
        <div class="mt-4 flex flex-wrap gap-4 text-[10px] text-slate-500">
          <span
            ><i class="mr-1 inline-block h-2 w-2 rounded-sm bg-slate-400"></i
            >Spend</span
          ><span
            ><i class="mr-1 inline-block h-2 w-2 rounded-sm bg-brand"></i
            >Savings</span
          >
        </div>
      </article>
      <article class="panel p-5">
        <div>
          <h2 class="text-lg font-800">Savings by category</h2>
          <p class="mt-1 text-xs text-slate-500">
            Spend, savings and supplier risk by category.
          </p>
        </div>
        <div class="mt-5 space-y-5">
          <div v-for="category in analytics.categories" :key="category.name">
            <div class="flex items-end justify-between gap-3">
              <div>
                <b class="text-sm">{{ category.name }}</b>
                <p class="mt-1 text-[10px] text-slate-400">
                  {{ store.money(category.savings) }} saved
                </p>
              </div>
              <div class="text-right">
                <b class="block text-sm">{{ store.money(category.spend) }}</b
                ><span
                  class="text-[10px]"
                  :class="
                    category.risk > 35 ? 'text-rose-500' : 'text-emerald-500'
                  "
                  >Risk {{ category.risk }}</span
                >
              </div>
            </div>
            <div
              class="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"
            >
              <div
                class="h-full rounded-full bg-brand"
                :style="{ width: height(category.spend, maxCategorySpend) }"
              ></div>
            </div>
          </div>
        </div>
      </article>
    </div>

    <div
      v-else-if="tab === 'scenarios'"
      class="grid gap-5 2xl:grid-cols-[320px_minmax(0,1fr)]"
    >
      <aside class="panel p-5">
        <label
          ><span class="mb-1.5 block text-xs font-bold">Quote round</span
          ><select v-model="selectedEventId" class="field">
            <option
              v-for="item in comparableEvents"
              :key="item.id"
              :value="item.id"
            >
              {{ item.id }} · {{ item.title }}
            </option>
          </select></label
        >
        <div class="mt-5">
          <h3 class="text-xs font-800 uppercase tracking-wide text-slate-500">
            Priorities
          </h3>
          <div class="mt-3 space-y-2">
            <button
              v-for="scenario in analytics.scenarios"
              :key="scenario.id"
              class="w-full rounded-xl border p-3 text-left"
              :class="
                scenarioId === scenario.id
                  ? 'border-brand bg-brand-50/60 dark:bg-brand/10'
                  : 'border-slate-200/70 hover:border-brand/35 dark:border-slate-700'
              "
              @click="selectScenario(scenario)"
            >
              <div class="flex items-center justify-between">
                <b class="text-xs">{{ scenario.name }}</b
                ><i
                  v-if="scenarioId === scenario.id"
                  class="fa-solid fa-circle-check text-brand"
                ></i>
              </div>
              <p class="mt-1 text-[10px] leading-4 text-slate-500">
                {{ scenario.description }}
              </p>
            </button>
          </div>
        </div>
        <div class="mt-5 space-y-3">
          <label
            v-for="criterion in criteria"
            :key="criterion.key"
            class="block"
            ><span class="flex justify-between text-[11px]"
              ><b>{{ criterion.label }}</b
              ><span class="font-bold text-brand"
                >{{ weights[criterion.key] }}%</span
              ></span
            ><input
              v-model.number="weights[criterion.key]"
              type="range"
              min="0"
              max="70"
              step="5"
              class="mt-1 w-full accent-[var(--accent)]"
              @input="scenarioId = 'custom'"
          /></label>
        </div>
      </aside>
      <article class="panel overflow-hidden">
        <header class="border-b border-slate-200/70 p-5 dark:border-slate-700">
          <div
            class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
          >
            <div>
              <span
                class="text-[10px] font-800 uppercase tracking-wide text-brand"
                >Offer comparison</span
              >
              <h2 class="mt-1 text-xl font-800">{{ selectedEvent?.title }}</h2>
              <p class="mt-1 text-xs text-slate-500">
                Compare offers with clear, adjustable weights.
              </p>
            </div>
            <span
              class="badge bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200"
              >{{
                scenarioId === "custom"
                  ? "Custom weights"
                  : analytics.scenarios.find((item) => item.id === scenarioId)
                      ?.name
              }}</span
            >
          </div>
        </header>
        <div class="p-5">
          <div v-if="scenarioRanking.length" class="grid gap-3 md:grid-cols-3">
            <article
              v-for="quote in scenarioRanking.slice(0, 3)"
              :key="quote.id"
              class="relative overflow-hidden rounded-xl border p-4"
              :class="
                quote.rank === 1
                  ? 'border-brand bg-brand-50/45 dark:bg-brand/8'
                  : 'border-slate-200/70 dark:border-slate-700'
              "
            >
              <span class="absolute right-3 top-3 text-4xl font-800 opacity-8"
                >#{{ quote.rank }}</span
              ><span
                class="grid h-8 w-8 place-items-center rounded-lg"
                :class="
                  quote.rank === 1
                    ? 'bg-brand text-white'
                    : 'bg-slate-100 dark:bg-slate-700'
                "
                >{{ quote.rank }}</span
              >
              <h3 class="mt-4 text-sm font-800">
                {{ store.supplier(quote.supplierId)?.name }}
              </h3>
              <p class="mt-1 text-lg font-800">
                {{ store.money(quote.price, selectedEvent.currency) }}
              </p>
              <div class="mt-4 flex items-end justify-between">
                <span class="text-[10px] text-slate-500">Overall score</span
                ><b class="text-2xl text-brand">{{ quote.score }}</b>
              </div>
              <div
                class="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"
              >
                <div
                  class="h-full rounded-full bg-brand"
                  :style="{ width: quote.score + '%' }"
                ></div>
              </div>
            </article>
          </div>
          <div v-else class="py-20 text-center text-slate-400">
            <i class="fa-solid fa-scale-balanced text-3xl"></i>
            <p class="mt-3 text-sm font-bold">
              This quote round has no comparable offers yet.
            </p>
          </div>
          <div
            v-if="recommendation"
            class="mt-5 grid gap-4 rounded-xl bg-slate-950 p-5 text-white md:grid-cols-[minmax(0,1fr)_auto]"
          >
            <div>
              <span
                class="text-[10px] font-800 uppercase tracking-wide text-brand-100"
                >Suggested choice</span
              >
              <h3 class="mt-2 text-lg font-800">
                {{ recommendation.name }} ranks first
              </h3>
              <p class="mt-2 text-xs leading-5 text-slate-400">
                Score {{ recommendation.quote.score }} with
                {{
                  store.money(
                    recommendation.quote.price,
                    selectedEvent.currency,
                  )
                }}, {{ recommendation.quote.leadDays }}-day lead time and risk
                {{ recommendation.quote.risk }}. The buyer makes the final
                choice.
              </p>
            </div>
            <RouterLink
              :to="`/procurement/sourcing?event=${selectedEvent.id}&tab=award`"
              class="btn-brand self-center"
              ><i class="fa-solid fa-arrow-up-right-from-square"></i>Choose
              supplier</RouterLink
            >
          </div>
        </div>
      </article>
    </div>

    <div
      v-else-if="tab === 'suppliers'"
      class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"
    >
      <article class="panel overflow-hidden">
        <header
          class="flex flex-col gap-3 border-b border-slate-200/70 p-5 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h2 class="text-lg font-800">Supplier performance</h2>
            <p class="mt-1 text-xs text-slate-500">
              Delivery, response, risk and sustainability in one view.
            </p>
          </div>
          <div class="relative">
            <i
              class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400"
            ></i
            ><input
              v-model="supplierSearch"
              class="field w-64 pl-9"
              placeholder="Search suppliers"
            />
          </div>
        </header>
        <div class="divide-y divide-slate-100 dark:divide-slate-700">
          <button
            v-for="supplier in filteredSuppliers"
            :key="supplier.id"
            class="grid w-full gap-4 p-4 text-left transition hover:bg-brand-50/40 dark:hover:bg-brand/8 md:grid-cols-[minmax(180px,1fr)_repeat(5,minmax(65px,.5fr))] md:items-center"
            :class="
              selectedSupplierId === supplier.id
                ? 'bg-brand-50/60 dark:bg-brand/10'
                : ''
            "
            @click="selectSupplier(supplier.id)"
          >
            <div class="flex items-center gap-3">
              <span
                class="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-xs font-800 text-brand"
                >{{ initials(supplier.name) }}</span
              ><span
                ><b class="block text-sm">{{ supplier.name }}</b
                ><small class="mt-1 block text-[10px] text-slate-400"
                  >{{ supplier.category }} · {{ supplier.status }}</small
                ></span
              >
            </div>
            <div
              v-for="metric in supplierMetrics(supplier)"
              :key="metric.label"
              class="text-center"
            >
              <b class="block text-sm" :class="metric.tone">{{
                metric.value
              }}</b
              ><small class="text-[9px] text-slate-400">{{
                metric.label
              }}</small>
            </div>
          </button>
        </div>
      </article>
      <aside
        v-if="selectedSupplier"
        class="panel self-start p-5 xl:sticky xl:top-15"
      >
        <div class="flex items-center gap-3">
          <span
            class="grid h-12 w-12 place-items-center rounded-xl bg-brand text-sm font-800 text-white"
            >{{ initials(selectedSupplier.name) }}</span
          >
          <div>
            <h2 class="text-lg font-800">{{ selectedSupplier.name }}</h2>
            <p class="mt-1 text-[10px] text-slate-500">
              {{ selectedSupplier.contact }} · {{ selectedSupplier.email }}
            </p>
          </div>
        </div>
        <div class="mt-5 grid grid-cols-2 gap-2">
          <div class="rounded-lg bg-slate-50 p-3 text-center dark:bg-slate-800">
            <b class="block text-xl">{{ selectedSupplier.score }}</b
            ><small class="text-[9px] text-slate-400">Score</small>
          </div>
          <div class="rounded-lg bg-slate-50 p-3 text-center dark:bg-slate-800">
            <b
              class="block text-xl"
              :class="
                selectedSupplier.risk > 35
                  ? 'text-rose-500'
                  : 'text-emerald-500'
              "
              >{{ selectedSupplier.risk }}</b
            ><small class="text-[9px] text-slate-400">Risk</small>
          </div>
        </div>
        <h3
          class="mt-5 text-xs font-800 uppercase tracking-wide text-slate-500"
        >
          Certifications
        </h3>
        <div class="mt-2 flex flex-wrap gap-2">
          <span
            v-for="cert in selectedSupplier.certifications"
            :key="cert"
            class="badge bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200"
            >{{ cert }}</span
          >
        </div>
        <h3
          class="mt-5 text-xs font-800 uppercase tracking-wide text-slate-500"
        >
          Status
        </h3>
        <p class="mt-2 text-xs leading-5 text-slate-500">
          Status changes are reversible and saved in history.
        </p>
        <div class="mt-3 grid grid-cols-2 gap-2">
          <button
            class="btn-muted px-2 text-xs"
            @click="setSupplierStatus('In review')"
          >
            Review</button
          ><button
            class="btn-muted px-2 text-xs"
            @click="setSupplierStatus('Preferred')"
          >
            Prefer
          </button>
        </div>
      </aside>
    </div>

    <div v-else-if="tab === 'risk'" class="grid gap-5 xl:grid-cols-2">
      <article class="panel p-5">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-800">Supplier risk</h2>
            <p class="mt-1 text-xs text-slate-500">
              Suppliers that may need attention.
            </p>
          </div>
          <span
            class="badge bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
            >{{ riskSuppliers.length }} watched</span
          >
        </div>
        <div class="mt-5 space-y-3">
          <div
            v-for="supplier in riskSuppliers"
            :key="supplier.id"
            class="rounded-xl border border-slate-200/70 p-4 dark:border-slate-700"
          >
            <div class="flex items-center justify-between">
              <div>
                <b class="text-sm">{{ supplier.name }}</b>
                <p class="mt-1 text-[10px] text-slate-500">
                  {{ supplier.category }} · {{ supplier.status }}
                </p>
              </div>
              <span
                class="text-xl font-800"
                :class="supplier.risk > 40 ? 'text-rose-500' : 'text-amber-500'"
                >{{ supplier.risk }}</span
              >
            </div>
            <div
              class="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"
            >
              <div
                class="h-full rounded-full"
                :class="supplier.risk > 40 ? 'bg-rose-500' : 'bg-amber-400'"
                :style="{ width: supplier.risk + '%' }"
              ></div>
            </div>
            <div class="mt-3 flex justify-between text-[10px] text-slate-500">
              <span>On-time {{ supplier.onTime }}%</span
              ><span>Response {{ supplier.responseRate }}%</span
              ><button
                class="font-bold text-brand"
                @click="openSupplierView(supplier.id)"
              >
                Open profile
              </button>
            </div>
          </div>
        </div>
      </article>
      <article class="panel p-5">
        <div>
          <h2 class="text-lg font-800">ESG performance</h2>
          <p class="mt-1 text-xs text-slate-500">
            Sustainability is included when offers are compared.
          </p>
        </div>
        <div class="mt-5 space-y-4">
          <div
            v-for="supplier in esgSuppliers"
            :key="supplier.id"
            class="grid grid-cols-[minmax(0,1fr)_4rem] items-center gap-4"
          >
            <div>
              <div class="flex justify-between text-xs">
                <b>{{ supplier.name }}</b
                ><span class="text-slate-400">{{ supplier.esg }}/100</span>
              </div>
              <div
                class="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"
              >
                <div
                  class="h-full rounded-full"
                  :class="
                    supplier.esg >= 85
                      ? 'bg-emerald-400'
                      : supplier.esg >= 75
                        ? 'bg-sky-400'
                        : 'bg-amber-400'
                  "
                  :style="{ width: supplier.esg + '%' }"
                ></div>
              </div>
            </div>
            <span
              class="grid h-12 w-12 place-items-center rounded-full text-sm font-800"
              :class="
                supplier.esg >= 85
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-700'
              "
              >{{ grade(supplier.esg) }}</span
            >
          </div>
        </div>
      </article>
    </div>

    <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="report in reports"
        :key="report.id"
        class="premium-card rounded-xl border p-5"
      >
        <div class="flex items-start justify-between">
          <span
            class="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand"
            ><i class="fa-solid" :class="report.icon"></i></span
          ><span
            class="badge bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
            >Ready</span
          >
        </div>
        <h2 class="mt-4 text-base font-800">{{ report.title }}</h2>
        <p class="mt-2 text-xs leading-5 text-slate-500">
          {{ report.description }}
        </p>
        <div class="mt-5 flex items-center justify-between">
          <span class="text-[10px] text-slate-400">Updated today</span
          ><button
            class="text-xs font-bold text-brand"
            @click="exportReport(report.id)"
          >
            Export {{ report.format }} <i class="fa-solid fa-download ml-1"></i>
          </button>
        </div>
      </article>
    </div>
  </div>
</template>
<script>
const { inject, computed, ref, reactive, watch } = Vue;
const { useRoute, useRouter } = VueRouter;
export default {
  setup() {
    const store = inject("store"),
      route = useRoute(),
      router = useRouter(),
      analytics = store.state.procurementAnalytics,
      tab = computed({
        get: () =>
          ["portfolio", "scenarios", "suppliers", "risk", "reports"].includes(
            route.query.tab,
          )
            ? route.query.tab
            : "portfolio",
        set: (key) =>
          router.push({
            path: "/procurement/intelligence",
            query: window.WebCommon.mergeRouteQuery(route.query, {
              tab: key,
              event: key === "scenarios" ? selectedEventId.value : null,
              scenario: key === "scenarios" ? scenarioId.value : null,
              supplier: key === "suppliers" ? selectedSupplierId.value : null,
            }),
          }),
      }),
      selectedEventId = ref(
        store.state.sourcingEvents.some(
          (item) => item.id === route.query.event && item.quotes?.length,
        )
          ? route.query.event
          : store.state.sourcingEvents.find((item) => item.quotes?.length)
              ?.id || "",
      ),
      scenarioId = ref(route.query.scenario || "scenario-balanced"),
      weights = reactive({ ...analytics.scenarios[0].weights }),
      supplierSearch = ref(""),
      selectedSupplierId = ref(
        store.supplier(route.query.supplier)?.id ||
          store.state.suppliers[0]?.id,
      );
    const tabs = [
      { key: "portfolio", label: "Overview", icon: "fa-chart-column" },
      { key: "scenarios", label: "Compare offers", icon: "fa-scale-balanced" },
      {
        key: "suppliers",
        label: "Suppliers",
        icon: "fa-building-circle-check",
      },
      { key: "risk", label: "Risk", icon: "fa-leaf" },
      { key: "reports", label: "Reports", icon: "fa-file-lines" },
    ];
    const metrics = computed(() => [
      {
        label: "Addressable spend",
        value: store.money(analytics.kpis.addressableSpend),
        delta: "+6.1%",
        icon: "fa-wallet",
        tone: "bg-violet-50 text-violet-600 dark:bg-violet-500/10",
      },
      {
        label: "Realized savings",
        value: store.money(analytics.kpis.realizedSavings),
        delta: "+12.4%",
        icon: "fa-piggy-bank",
        tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10",
      },
      {
        label: "Savings rate",
        value: analytics.kpis.savingsRate + "%",
        delta: "+1.2pp",
        icon: "fa-arrow-trend-up",
        tone: "bg-brand-50 text-brand",
      },
      {
        label: "Approval cycle",
        value: analytics.kpis.approvalCycleDays + "d",
        delta: "-0.8d",
        icon: "fa-stopwatch",
        tone: "bg-sky-50 text-sky-600 dark:bg-sky-500/10",
      },
      {
        label: "Supplier coverage",
        value: analytics.kpis.supplierCoverage + "%",
        delta: "+4pp",
        icon: "fa-building-circle-check",
        tone: "bg-amber-50 text-amber-600 dark:bg-amber-500/10",
      },
      {
        label: "Open issues",
        value: analytics.kpis.exceptionCount,
        delta: "1 critical",
        icon: "fa-triangle-exclamation",
        tone: "bg-rose-50 text-rose-600 dark:bg-rose-500/10",
      },
    ]);
    const maxSpend = Math.max(...analytics.monthly.map((item) => item.spend)),
      maxSavings = Math.max(...analytics.monthly.map((item) => item.savings)),
      maxCategorySpend = Math.max(
        ...analytics.categories.map((item) => item.spend),
      );
    const height = (value, max) =>
      `${Math.max(8, Math.round((value / max) * 100))}%`;
    const comparableEvents = computed(() =>
      store.state.sourcingEvents.filter((item) => item.quotes?.length),
    );
    const selectedEvent = computed(
      () =>
        store.sourcingEvent(selectedEventId.value) || comparableEvents.value[0],
    );
    const scenarioRanking = computed(() =>
      selectedEvent.value
        ? window.ProcurementCommon.rankQuotes(
            selectedEvent.value.quotes,
            weights,
          )
        : [],
    );
    const recommendation = computed(() =>
      scenarioRanking.value[0]
        ? {
            quote: scenarioRanking.value[0],
            name: store.supplier(scenarioRanking.value[0].supplierId)?.name,
          }
        : null,
    );
    const criteria = [
      { key: "price", label: "Price" },
      { key: "quality", label: "Quality" },
      { key: "delivery", label: "Delivery" },
      { key: "risk", label: "Risk" },
      { key: "esg", label: "ESG" },
    ];
    const selectScenario = (scenario) => {
      scenarioId.value = scenario.id;
      Object.assign(weights, scenario.weights);
      router.replace({
        path: "/procurement/intelligence",
        query: window.WebCommon.mergeRouteQuery(route.query, {
          tab: "scenarios",
          event: selectedEventId.value,
          scenario: scenario.id,
          supplier: null,
        }),
      });
    };
    const filteredSuppliers = computed(() => {
      const q = supplierSearch.value.toLowerCase();
      return [...store.state.suppliers]
        .filter(
          (item) =>
            !q ||
            [item.name, item.category, item.status]
              .join(" ")
              .toLowerCase()
              .includes(q),
        )
        .sort((a, b) => b.score - a.score);
    });
    const selectedSupplier = computed(() =>
      store.supplier(selectedSupplierId.value),
    );
    const selectSupplier = (id) => {
      if (!store.supplier(id)) return;
      selectedSupplierId.value = id;
      router.replace({
        path: "/procurement/intelligence",
        query: window.WebCommon.mergeRouteQuery(route.query, {
          tab: "suppliers",
          supplier: id,
          event: null,
          scenario: null,
        }),
      });
    };
    const openSupplierView = (id) => {
      if (!store.supplier(id)) return;
      selectedSupplierId.value = id;
      router.push({
        path: "/procurement/intelligence",
        query: window.WebCommon.mergeRouteQuery(route.query, {
          tab: "suppliers",
          supplier: id,
          event: null,
          scenario: null,
        }),
      });
    };
    watch(selectedEventId, (id) => {
      if (tab.value !== "scenarios" || route.query.event === id) return;
      router.replace({
        path: "/procurement/intelligence",
        query: window.WebCommon.mergeRouteQuery(route.query, {
          event: id,
        }),
      });
    });
    watch(
      () => route.query,
      (value) => {
        if (
          value.event &&
          comparableEvents.value.some((entry) => entry.id === value.event)
        )
          selectedEventId.value = value.event;
        if (value.supplier && store.supplier(value.supplier))
          selectedSupplierId.value = value.supplier;
        if (value.scenario) scenarioId.value = value.scenario;
      },
      { deep: true },
    );
    const supplierMetrics = (supplier) => [
      { label: "Score", value: supplier.score, tone: "text-brand" },
      {
        label: "On-time",
        value: supplier.onTime + "%",
        tone: "text-emerald-500",
      },
      {
        label: "Response",
        value: supplier.responseRate + "%",
        tone: "text-sky-500",
      },
      {
        label: "Risk",
        value: supplier.risk,
        tone: supplier.risk > 35 ? "text-rose-500" : "text-emerald-500",
      },
      { label: "ESG", value: supplier.esg, tone: "text-violet-500" },
    ];
    const initials = (name) =>
      name
        .split(" ")
        .map((item) => item[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
    const setSupplierStatus = (status) => {
      selectedSupplier.value.status = status;
      store.procurementEvent(
        selectedSupplier.value,
        "Supplier status changed",
        status,
        status === "In review" ? "warning" : "success",
      );
      store.notice(`Supplier moved to ${status}`);
    };
    const riskSuppliers = computed(() =>
      [...store.state.suppliers].sort((a, b) => b.risk - a.risk).slice(0, 4),
    );
    const esgSuppliers = computed(() =>
      [...store.state.suppliers].sort((a, b) => b.esg - a.esg),
    );
    const grade = (score) =>
      score >= 90
        ? "A+"
        : score >= 85
          ? "A"
          : score >= 80
            ? "B+"
            : score >= 75
              ? "B"
              : "C";
    const reports = [
      {
        id: "spend",
        title: "Spend by category",
        description: "Spend by category and quote coverage.",
        format: "CSV",
        icon: "fa-chart-pie",
      },
      {
        id: "savings",
        title: "Savings realization",
        description: "Baseline, negotiated, selected and realized value.",
        format: "CSV",
        icon: "fa-piggy-bank",
      },
      {
        id: "supplier-risk",
        title: "Supplier risk",
        description: "Supplier status, risk and open issues.",
        format: "JSON",
        icon: "fa-shield-halved",
      },
      {
        id: "cycle-time",
        title: "Purchase cycle time",
        description: "Time from request to completed order.",
        format: "CSV",
        icon: "fa-stopwatch",
      },
      {
        id: "esg",
        title: "Sustainability in supplier choices",
        description: "Sustainability scores used in comparisons.",
        format: "CSV",
        icon: "fa-leaf",
      },
      {
        id: "auction",
        title: "Live bid performance",
        description: "Offer changes, participation and results.",
        format: "JSON",
        icon: "fa-gavel",
      },
    ];
    const exportReport = (id) => {
      let rows;
      if (id === "supplier-risk" || id === "esg") rows = store.state.suppliers;
      else if (
        id === "portfolio" ||
        id === "spend" ||
        id === "savings" ||
        id === "cycle-time"
      )
        rows = analytics.monthly;
      else if (id === "auction") rows = store.state.auctions;
      else rows = analytics.categories;
      const json = id === "supplier-risk" || id === "auction";
      window.ProcurementCommon.download(
        `purchases-${id}.${json ? "json" : "csv"}`,
        json
          ? JSON.stringify(rows, null, 2)
          : window.ProcurementCommon.csv(rows),
        json ? "application/json" : "text/csv",
      );
      store.notice("Report exported", "fa-download");
    };
    return {
      store,
      analytics,
      tab,
      tabs,
      metrics,
      maxSpend,
      maxSavings,
      maxCategorySpend,
      height,
      selectedEventId,
      comparableEvents,
      selectedEvent,
      scenarioId,
      weights,
      criteria,
      selectScenario,
      scenarioRanking,
      recommendation,
      supplierSearch,
      filteredSuppliers,
      selectedSupplierId,
      selectSupplier,
      openSupplierView,
      selectedSupplier,
      supplierMetrics,
      initials,
      setSupplierStatus,
      riskSuppliers,
      esgSuppliers,
      grade,
      reports,
      exportReport,
    };
  },
};
</script>
