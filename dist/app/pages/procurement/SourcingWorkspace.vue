<template>
  <div class="space-y-5">
    <DataTable
      :items="accessibleEvents"
      :columns="columns"
      title="Quote rounds"
      table-id="procurement-events"
      group-by="status"
      :group-label="statusLabel"
      :users="store.state.users"
      :format="format"
      :link-for="linkFor"
      @update-cell="updateCell"
      @edit="openEvent"
      @delete="archiveEvent"
      @archive="archiveEvents"
    />

    <section v-if="event" class="panel overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-card dark:border-slate-800/80 dark:bg-slate-900/90">
      <!-- Breadcrumb Bar -->
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2 text-[11px] dark:border-slate-800/80 dark:bg-slate-950/40">
        <div class="flex items-center gap-1.5 text-slate-500">
          <RouterLink to="/procurement" class="font-semibold hover:text-brand">Procurement</RouterLink>
          <span>/</span>
          <RouterLink to="/procurement/sourcing" class="font-semibold hover:text-brand">Sourcing RFX</RouterLink>
          <span>/</span>
          <span class="font-bold text-slate-900 dark:text-white">{{ event.id }}</span>
        </div>
        <div class="flex items-center gap-3">
          <RouterLink
            v-if="event.requestId"
            :to="`/procurement/queue?request=${event.requestId}`"
            class="font-bold text-brand hover:underline inline-flex items-center gap-1"
          >
            <i class="fa-solid fa-link text-[10px]"></i>PR: {{ event.requestId }}
          </RouterLink>
          <span v-if="event.awardedSupplierId" class="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
            <i class="fa-solid fa-trophy text-[10px]"></i>
            Awarded:
            <RouterLink :to="`/suppliers?supplier=${event.awardedSupplierId}`" class="hover:underline font-extrabold ml-0.5">
              {{ store.supplier(event.awardedSupplierId)?.name || event.awardedSupplierId }}
            </RouterLink>
          </span>
        </div>
      </div>

      <header class="border-b border-slate-100 p-4 sm:p-5 dark:border-slate-800">
        <div class="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="rounded-lg bg-brand-50 px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-brand dark:bg-brand/20">{{ event.id }}</span>
              <span class="badge rounded-lg bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{{ typeLabel(event.type) }}</span>
              <span class="badge rounded-lg px-2.5 py-0.5 text-[10px] font-bold" :class="statusClass(event.status)">
                <i class="fa-solid mr-1 text-xs" :class="window.ProcurementCommon.statusMeta(event.status).icon"></i>{{ statusLabel(event.status) }}
              </span>
              <span v-if="event.round > 1" class="badge rounded-lg bg-violet-50 px-2.5 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">Version {{ event.round }}</span>
            </div>
            <h2 class="font-head mt-1.5 text-xl sm:text-2xl font-800 tracking-tight text-slate-900 dark:text-white">{{ event.title }}</h2>
            <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
              <span class="flex items-center gap-1.5"><i class="fa-solid fa-wallet text-slate-400"></i><b class="font-mono text-slate-700 dark:text-slate-300">{{ store.money(event.budget, event.currency) }}</b></span>
              <span class="flex items-center gap-1.5"><i class="fa-regular fa-calendar text-slate-400"></i>{{ store.date(event.deadline) }}</span>
              <span class="flex items-center gap-1.5"><i class="fa-solid fa-users text-slate-400"></i>{{ event.invitedSupplierIds.length }} invited</span>
              <span class="flex items-center gap-1.5"><i class="fa-solid fa-file-arrow-up text-slate-400"></i>{{ event.quotes.length }} offers</span>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <button class="btn-muted text-xs py-2 px-3.5" @click="cloneEvent">
              <i class="fa-regular fa-copy mr-1.5 text-xs"></i>Copy
            </button>
            <button v-if="event.status === 'Draft'" class="btn-brand text-xs py-2 px-3.5" @click="publish">
              <i class="fa-solid fa-tower-broadcast mr-1.5 text-xs"></i>Publish
            </button>
            <button v-if="event.type === 'Auction'" class="btn-brand text-xs py-2 px-3.5" @click="router.push(`/procurement/auction?auction=${event.id}`)">
              <i class="fa-solid fa-gavel mr-1.5 text-xs"></i>Live bids
            </button>
            <button v-if="['Published', 'Sent'].includes(event.status) && event.quotes.length" class="btn-brand text-xs py-2 px-3.5" @click="event.status = 'Comparing'; tab = 'comparison';">
              <i class="fa-solid fa-scale-balanced mr-1.5 text-xs"></i>Compare
            </button>
          </div>
        </div>
      </header>

      <nav class="flex gap-1 overflow-x-auto border-b border-slate-200/70 bg-slate-50/50 px-4 pt-2 dark:border-slate-700 dark:bg-slate-800/35">
        <button
          v-for="item in tabs"
          :key="item.key"
          class="min-w-max border-b-2 px-3 py-3 text-xs font-bold"
          :class="tab === item.key ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'"
          @click="tab = item.key"
        >
          <i class="fa-solid mr-1.5" :class="item.icon"></i>{{ item.label }}
          <span v-if="item.count" class="ml-1 rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] dark:bg-slate-700">{{ item.count }}</span>
        </button>
      </nav>

      <SourcingLotsTab
        v-if="tab === 'overview'"
        :event="event"
        :deadline-date="deadlineDate"
        :readiness="readiness"
        :next-action="nextAction"
        @update:deadline="saveDeadline"
        @record="record"
        @add-lot="addLot"
        @remove-lot="removeLot"
        @next="goNext"
      />

      <SourcingSuppliersTab
        v-else-if="tab === 'suppliers'"
        :event="event"
        :suppliers="filteredSuppliers"
        :search="supplierSearch"
        :initials="initials"
        :supplier-name="(id) => store.supplier(id)?.name || id"
        @update:search="supplierSearch = $event"
        @toggle-supplier="toggleSupplier"
        @send-invites="sendInvites"
      />

      <SourcingBidSheetTab
        v-else-if="tab === 'bidsheet'"
        :event="event"
        :supplier-name="(id) => store.supplier(id)?.name || id"
        :format-money="store.money"
        :format-date="store.date"
        @export="exportBidSheet"
        @simulate="simulateQuote"
      />

      <SourcingComparisonTab
        v-else-if="tab === 'comparison'"
        :event="event"
        :criteria="criteria"
        :scenarios="store.state.procurementAnalytics?.scenarios || []"
        :ranked-quotes="rankedQuotes"
        :award-supplier-id="awardSupplierId"
        :supplier-name="(id) => store.supplier(id)?.name || id"
        :format-money="store.money"
        @apply-scenario="applyScenario"
        @update:award-supplier-id="awardSupplierId = $event"
      />

      <SourcingAwardTab
        v-else-if="tab === 'award'"
        :event="event"
        :ranked-quotes="rankedQuotes"
        :award-supplier-id="awardSupplierId"
        :award-reason="awardReason"
        :selected-award-quote="selectedAwardQuote"
        :selected-award-supplier="selectedAwardSupplier"
        :supplier-name="(id) => store.supplier(id)?.name || id"
        :format-money="store.money"
        @update:award-supplier-id="awardSupplierId = $event"
        @update:award-reason="awardReason = $event"
        @award="award"
      />

      <SourcingTimelineTab
        v-else
        :audit="event.audit"
        :format-date="store.date"
      />
    </section>

    <SourcingWizardModal
      :open="wizardOpen"
      :current-step="wizardStep"
      :steps="wizardSteps"
      :model-value="wizard"
      :suppliers="store.state.suppliers"
      :requests="store.state.purchaseRequests"
      :error="wizardError"
      :type-label="typeLabel"
      :format-money="store.money"
      @close="closeWizard"
      @prev="wizardStep--; wizardError = '';"
      @next="nextWizard"
      @submit="saveWizard"
      @toggle-supplier="toggleWizardSupplier"
    />
  </div>
</template>
<script>
const { inject, computed, ref, watch } = Vue;
const { useRoute, useRouter } = VueRouter;
const load = (p) => Vue.defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(p, window.sfcOptions));
const DataTable = load("./app/components/DataTable.vue?v=24");
const SourcingWizardModal = load("./app/pages/procurement/sourcing/SourcingWizardModal.vue?v=1");
const SourcingLotsTab = load("./app/pages/procurement/sourcing/SourcingLotsTab.vue?v=1");
const SourcingSuppliersTab = load("./app/pages/procurement/sourcing/SourcingSuppliersTab.vue?v=1");
const SourcingBidSheetTab = load("./app/pages/procurement/sourcing/SourcingBidSheetTab.vue?v=1");
const SourcingComparisonTab = load("./app/pages/procurement/sourcing/SourcingComparisonTab.vue?v=1");
const SourcingAwardTab = load("./app/pages/procurement/sourcing/SourcingAwardTab.vue?v=1");
const SourcingTimelineTab = load("./app/pages/procurement/sourcing/SourcingTimelineTab.vue?v=1");

const freshWizard = () => ({
  title: "", type: "RFQ", requestId: "", budget: 10000, deadline: "2026-07-31",
  description: "", suppliers: [], visibility: "Private", autoExtend: false,
});

export default {
  components: {
    DataTable,
    SourcingWizardModal,
    SourcingLotsTab,
    SourcingSuppliersTab,
    SourcingBidSheetTab,
    SourcingComparisonTab,
    SourcingAwardTab,
    SourcingTimelineTab,
  },
  setup() {
    const store = inject("store"), route = useRoute(), router = useRouter();
    const tab = computed({
      get: () => ["overview", "suppliers", "bidsheet", "comparison", "award", "timeline"].includes(route.query.tab) ? route.query.tab : "overview",
      set: (key) => router.push({ path: "/procurement/sourcing", query: window.WebCommon.mergeRouteQuery(route.query, { tab: key }) }),
    });
    const supplierSearch = ref(""), awardSupplierId = ref(""), awardReason = ref("");
    const wizardOpen = ref(route.query.new === "1");
    const wizardStep = ref(route.query.new === "1" && [0, 1, 2].includes(Number(route.query.step)) ? Number(route.query.step) : 0);
    const wizard = ref(freshWizard()), wizardForm = ref(null), wizardError = ref("");

    const columns = [
      { key: "id", label: "Round", width: 135 },
      { key: "title", label: "Quote round", width: 250, edit: { type: "text" } },
      { key: "type", label: "Type", width: 100 },
      { key: "status", label: "Status", width: 120 },
      { key: "round", label: "Version", width: 75, edit: { type: "number" } },
      { key: "responseCount", label: "Offers", width: 105 },
      { key: "deadline", label: "Deadline", width: 130, edit: { type: "date" } },
      { key: "budget", label: "Budget", width: 130, edit: { type: "number" } },
      { key: "savingsTarget", label: "Savings %", width: 105, edit: { type: "number" } },
      { key: "ownerId", label: "Owner", width: 130, edit: { type: "user" } },
    ];

    const accessibleEvents = computed(() => {
      const list = store.state.sourcingEvents.filter((item) => {
        if (store.isAdmin.value) return true;
        if (store.marketplaceMode.value === "supplier") {
          const supplierId = store.currentSupplierId?.value || store.userSupplierId(store.currentUser.value.id);
          if (supplierId) return item.invitedSupplierIds.includes(supplierId) || (item.quotes || []).some((q) => q.supplierId === supplierId);
        }
        const request = store.purchaseRequest(item.requestId);
        return item.ownerId === store.currentUser.value.id || request?.ownerId === store.currentUser.value.id || request?.requesterId === store.currentUser.value.id || store.isBuyer.value;
      });
      return list.length ? list : store.state.sourcingEvents;
    });

    const canManage = (item) => Boolean(item) && (store.isAdmin.value || store.isBuyer.value || item.ownerId === store.currentUser.value.id);
    const event = computed(() => accessibleEvents.value.find((item) => item.id === route.query.event) || accessibleEvents.value[0]);

    const tabs = computed(() => event.value ? [
      { key: "overview", label: "Setup", icon: "fa-layer-group" },
      { key: "suppliers", label: "Suppliers", icon: "fa-users", count: event.value.invitedSupplierIds.length },
      { key: "bidsheet", label: "Offers", icon: "fa-table-cells", count: event.value.quotes.length },
      { key: "comparison", label: "Compare", icon: "fa-scale-balanced" },
      { key: "award", label: "Choose", icon: "fa-trophy" },
      { key: "timeline", label: "History", icon: "fa-clock-rotate-left", count: event.value.audit.length },
    ] : []);

    const rankedQuotes = computed(() => event.value ? window.ProcurementCommon.rankQuotes(event.value.quotes, event.value.weights) : []);
    const selectedAwardQuote = computed(() => rankedQuotes.value.find((item) => item.supplierId === awardSupplierId.value));
    const selectedAwardSupplier = computed(() => store.supplier(awardSupplierId.value));
    const criteria = [
      { key: "price", label: "Price" }, { key: "quality", label: "Quality" }, { key: "delivery", label: "Delivery" }, { key: "risk", label: "Risk" }, { key: "esg", label: "ESG" },
    ];
    const typeLabel = (type) => ({ RFI: "Information request", RFQ: "Quote request", RFP: "Proposal request", Auction: "Live bid", Negotiation: "Negotiation" })[type] || type;
    const statusLabel = (status) => ({ Published: "Open", Sent: "Sent", Comparing: "Comparing", Running: "Live", Awarded: "Supplier selected" })[status] || status;

    const deadlineDate = computed({
      get: () => event.value?.deadline?.slice(0, 10) || "",
      set: (value) => { if (event.value && value) event.value.deadline = new Date(value + "T17:00:00Z").toISOString(); },
    });

    const readiness = computed(() => event.value ? [
      { label: "Items complete", detail: `${event.value.lots.length} item group(s)`, done: event.value.lots.length > 0 },
      { label: "Suppliers selected", detail: `${event.value.invitedSupplierIds.length} qualified supplier(s)`, done: event.value.invitedSupplierIds.length >= 2 },
      { label: "Scoring ready", detail: `Weights total ${Object.values(event.value.weights).reduce((a, b) => a + Number(b), 0)}%`, done: Object.values(event.value.weights).some(Boolean) },
      { label: "Send settings ready", detail: `${event.value.visibility} · ${store.date(event.value.deadline)}`, done: Boolean(event.value.deadline) },
    ] : []);

    const nextAction = computed(() => {
      if (!event.value.lots.length) return "Add the first item";
      if (event.value.invitedSupplierIds.length < 2) return "Select at least two suppliers";
      if (event.value.status === "Draft") return "Send the quote request";
      if (!event.value.quotes.length) return "Wait for supplier offers";
      return "Compare the offers";
    });

    const filteredSuppliers = computed(() => {
      const q = supplierSearch.value.toLowerCase();
      return store.state.suppliers.filter((item) => !q || [item.name, item.category, item.status].join(" ").toLowerCase().includes(q));
    });

    const format = (item, key) => {
      if (key === "deadline") return store.date(item.deadline);
      if (key === "budget") return store.money(item.budget, item.currency);
      if (key === "responseCount") return `${item.quotes?.length || 0}/${item.invitedSupplierIds?.length || 0}`;
      if (key === "ownerId") return store.user(item.ownerId)?.name || "—";
      if (key === "type") return typeLabel(item.type);
      if (key === "status") return statusLabel(item.status);
      return item[key] ?? "—";
    };

    const linkFor = (item, key) => ["id", "title"].includes(key) ? `/procurement/sourcing?event=${item.id}` : null;
    const openEvent = (item) => router.push(`/procurement/sourcing?event=${item.id}`);

    const updateCell = ({ id, key, value }) => {
      const item = accessibleEvents.value.find((entry) => entry.id === id);
      if (!canManage(item)) return store.notice("Quote round update denied", "fa-shield-halved");
      if (["budget", "round", "savingsTarget"].includes(key)) {
        const max = key === "savingsTarget" ? 100 : key === "round" ? 1000 : undefined;
        value = Number(value);
        if (!window.WebCommon.isSafeAmount(value, 0, max) || (key === "round" && !Number.isInteger(value)))
          return store.notice("Enter a value within the permitted range", "fa-triangle-exclamation");
      }
      if (key === "deadline") { const d = new Date(value + "T17:00:00Z"); if (Number.isNaN(d.getTime())) return; value = d.toISOString(); }
      if (typeof value === "string" && key !== "deadline") value = window.WebCommon.sanitizeText(value, 500).trim();
      item[key] = value;
      store.procurementEvent(item, "Quote round updated", key);
    };

    const statusClass = (status) => ({
      Draft: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200",
      Published: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
      Sent: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
      Comparing: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
      Running: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
      Awarded: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
      Closed: "bg-slate-100 text-slate-600 dark:bg-slate-700",
    })[status] || "bg-amber-50 text-amber-700";

    const saveDeadline = (val) => {
      if (!canManage(event.value) || !val) return;
      const d = new Date(val + "T17:00:00Z");
      if (Number.isNaN(d.getTime())) return;
      event.value.deadline = d.toISOString();
      record("Deadline updated", store.date(event.value.deadline));
    };

    const record = (action, detail) => {
      if (canManage(event.value)) return store.procurementEvent(event.value, window.WebCommon.sanitizeText(action, 120), window.WebCommon.sanitizeText(detail, 500));
    };

    const addLot = () => {
      if (!canManage(event.value)) return store.notice("Quote round update denied", "fa-shield-halved");
      event.value.lots.push({ id: window.ProcurementCommon.uid("lot"), description: "New item group", quantity: 1, unit: "unit", ceiling: 0 });
      record("Item group added", "New item group");
    };

    const removeLot = (id) => {
      if (!canManage(event.value)) return store.notice("Quote round update denied", "fa-shield-halved");
      event.value.lots = event.value.lots.filter((item) => item.id !== id);
      record("Item group removed", id);
    };

    const goNext = () => {
      if (event.value.invitedSupplierIds.length < 2) tab.value = "suppliers";
      else if (event.value.status === "Draft") publish();
      else if (event.value.quotes.length) tab.value = "comparison";
      else tab.value = "bidsheet";
    };

    const initials = (name) => name.split(" ").map((item) => item[0]).slice(0, 2).join("").toUpperCase();

    const toggleSupplier = (id) => {
      if (!canManage(event.value) || !store.supplier(id)) return store.notice("Supplier update denied", "fa-shield-halved");
      const list = event.value.invitedSupplierIds, index = list.indexOf(id);
      if (index >= 0) list.splice(index, 1); else list.push(id);
      record(index >= 0 ? "Supplier removed" : "Supplier invited", store.supplier(id)?.name);
    };

    const sendInvites = () => {
      if (!canManage(event.value)) return store.notice("Invitation action denied", "fa-shield-halved");
      if (event.value.invitedSupplierIds.length < 2) return store.notice("Select at least two suppliers", "fa-triangle-exclamation");
      if (event.value.status === "Draft") event.value.status = "Sent";
      record("Invitations sent", event.value.invitedSupplierIds.length + " suppliers", "success");
      store.notice("Supplier invitations sent", "fa-paper-plane");
    };

    const publish = () => {
      if (!canManage(event.value)) return store.notice("Publishing denied", "fa-shield-halved");
      if (!event.value.lots.length || event.value.invitedSupplierIds.length < 2 || !event.value.deadline)
        return store.notice("Complete items, deadline and at least two suppliers", "fa-triangle-exclamation");
      store.procurementTransition(event.value, "Published", `${event.value.invitedSupplierIds.length} suppliers invited`);
      event.value.publishedAt = new Date().toISOString();
      tab.value = "suppliers";
    };

    const cloneEvent = () => {
      if (!canManage(event.value)) return store.notice("Copy denied", "fa-shield-halved");
      const clone = window.ProcurementCommon.cloneRecord(event.value, "RFX", store.currentUser.value.name);
      clone.id = "RFX-" + new Date().getFullYear() + "-" + String(120 + store.state.sourcingEvents.length);
      clone.ownerId = store.currentUser.value.id;
      clone.title = event.value.title + " · copy";
      store.state.sourcingEvents.unshift(clone);
      store.state.procurementAudit.unshift(...clone.audit.map((item) => ({ ...item, objectId: clone.id })));
      router.push(`/procurement/sourcing?event=${clone.id}`);
      store.notice("Quote round copied as a draft");
    };

    const archiveEvent = async (item) => {
      if (!canManage(item)) return store.notice("Archive denied", "fa-shield-halved");
      if (await store.confirm({ title: "Archive quote round?", message: "The record and its audit trail remain available in persisted demo data.", confirmText: "Archive", danger: true })) {
        item.archived = true; item.status = "Closed";
        store.procurementEvent(item, "Quote round archived", item.id);
      }
    };

    const archiveEvents = (ids) => {
      let count = 0;
      ids.slice(0, 100).forEach((id) => {
        const item = accessibleEvents.value.find((entry) => entry.id === id);
        if (canManage(item)) { item.archived = true; item.status = "Closed"; count++; store.procurementEvent(item, "Quote round archived", "Bulk archive"); }
      });
      store.notice(`${count} quote rounds archived`);
    };

    const exportBidSheet = () => {
      const rows = event.value.quotes.map((quote) => ({
        event: event.value.id, supplier: store.supplier(quote.supplierId)?.name, price: quote.price, leadDays: quote.leadDays, terms: quote.terms, quality: quote.quality, risk: quote.risk, esg: quote.esg, compliant: quote.compliant,
      }));
      window.ProcurementCommon.download(`${event.value.id}-bid-sheet.csv`, window.ProcurementCommon.csv(rows), "text/csv");
      store.notice("Offers exported");
    };

    const simulateQuote = () => {
      if (!canManage(event.value)) return store.notice("Offer simulation denied", "fa-shield-halved");
      const supplier = store.state.suppliers.find((item) => event.value.invitedSupplierIds.includes(item.id) && !event.value.quotes.some((quote) => quote.supplierId === item.id));
      if (!supplier) return store.notice("All invited suppliers already responded", "fa-circle-info");
      event.value.quotes.push({
        id: window.ProcurementCommon.uid("quote"), supplierId: supplier.id, price: Math.round(event.value.budget * (0.78 + Math.random() * 0.16)), leadDays: 7 + Math.round(Math.random() * 12), quality: supplier.score, risk: supplier.risk, esg: supplier.esg, terms: "Net 30", compliant: supplier.risk < 40, submittedAt: new Date().toISOString(),
      });
      record("Offer submitted", supplier.name, "success");
      store.notice("Demo supplier offer added");
    };

    const applyScenario = (scenario) => { event.value.weights = { ...scenario.weights }; record("Scoring preset applied", scenario.name); };

    const award = async () => {
      const reason = window.WebCommon.sanitizeText(awardReason.value, 1000).trim();
      if (!canManage(event.value) || !selectedAwardQuote.value || !reason || event.value.awardedSupplierId)
        return store.notice("Supplier selection denied or incomplete", "fa-shield-halved");
      if (!(await store.confirm({ title: "Choose this supplier?", message: "This saves the decision and creates the order. The quote round remains available in history.", confirmText: "Choose supplier" }))) return;
      event.value.awardedSupplierId = awardSupplierId.value;
      event.value.awardReason = reason;
      store.procurementTransition(event.value, "Awarded", `${selectedAwardSupplier.value.name} · ${reason}`);
      const request = store.purchaseRequest(event.value.requestId);
      if (request && (store.isAdmin.value || request.ownerId === store.currentUser.value.id || request.requesterId === store.currentUser.value.id)) {
        request.status = "Approved"; request.nextAction = "Purchase order issued";
      }
      let order = store.state.purchaseOrders.find((item) => item.eventId === event.value.id);
      if (!order) {
        const qty = Math.max(1, event.value.lots.reduce((sum, item) => sum + Number(item.quantity || 0), 0));
        order = {
          id: "PO-" + String(7720 + store.state.purchaseOrders.length), title: event.value.title, requestId: event.value.requestId, eventId: event.value.id, projectId: event.value.projectId, supplierId: awardSupplierId.value, buyerId: store.currentUser.value.id, status: "Ordered", total: selectedAwardQuote.value.price, currency: event.value.currency, receivedPercent: 0, matchStatus: "3-way match", shipTo: "Main warehouse", incoterm: "DAP", paymentTerms: selectedAwardQuote.value.terms, eta: new Date(Date.now() + selectedAwardQuote.value.leadDays * 86400000).toISOString(), warehouse: "WH-01", invoiceId: null, exceptions: [], lines: event.value.lots.map((lot) => ({ id: window.ProcurementCommon.uid("po-line"), description: window.WebCommon.sanitizeText(lot.description, 300), ordered: Number(lot.quantity), received: 0, unitPrice: selectedAwardQuote.value.price / qty })), receipts: [], audit: [],
        };
        store.state.purchaseOrders.unshift(order);
        store.procurementEvent(order, "Purchase order created", "Generated from " + event.value.id, "success");
      }
      store.notice("Supplier selected and order created", "fa-trophy");
      router.push(`/procurement/execution?order=${order.id}`);
    };

    const closeWizard = () => { wizardOpen.value = false; wizardStep.value = 0; wizardError.value = ""; wizard.value = freshWizard(); router.replace("/procurement/sourcing"); };
    const toggleWizardSupplier = (id) => { const idx = wizard.value.suppliers.indexOf(id); if (idx >= 0) wizard.value.suppliers.splice(idx, 1); else wizard.value.suppliers.push(id); wizardError.value = ""; };
    const nextWizard = () => {
      wizardError.value = "";
      if (wizardStep.value === 0 && wizardForm.value?.querySelector(":invalid")) { wizardError.value = "Complete the required fields."; return; }
      if (wizardStep.value === 1 && wizard.value.suppliers.length < 2) { wizardError.value = "Select at least two suppliers."; return; }
      wizardStep.value++;
    };

    const saveWizard = () => {
      if (!(store.isBuyer.value || store.isAdmin.value)) return store.notice("Quote round creation denied", "fa-shield-halved");
      if (wizard.value.suppliers.length < 2) { wizardStep.value = 1; wizardError.value = "Select at least two suppliers."; return; }
      const data = wizard.value, request = store.purchaseRequest(data.requestId);
      const title = window.WebCommon.sanitizeText(data.title, 160).trim(), description = window.WebCommon.sanitizeText(data.description, 2000).trim(), budget = Number(data.budget), deadline = new Date(data.deadline + "T17:00:00Z");
      const supplierIds = new Set(store.state.suppliers.map((item) => item.id));
      const item = {
        id: (data.type === "Auction" ? "AUC" : "RFX") + "-" + new Date().getFullYear() + "-" + String(130 + store.state.sourcingEvents.length),
        title, type: data.type, status: "Draft", requestId: request?.id || null, projectId: request?.projectId || null, ownerId: store.currentUser.value.id, budget, currency: "USD", round: 1, deadline: deadline.toISOString(), visibility: data.visibility, autoExtend: Boolean(data.autoExtend), publishedAt: null, invitedSupplierIds: [...new Set(data.suppliers)].filter((id) => supplierIds.has(id)).slice(0, 50), messagesOpen: 0, savingsTarget: 8, awardReason: "", awardedSupplierId: null, weights: { price: 40, quality: 25, delivery: 15, risk: 15, esg: 5 }, lots: [{ id: window.ProcurementCommon.uid("lot"), description, quantity: 1, unit: "lot", ceiling: budget }], quotes: [], files: [], audit: [],
      };
      store.state.sourcingEvents.unshift(item);
      store.procurementEvent(item, "Quote round created", typeLabel(data.type) + " draft", "success");
      if (request) { request.sourcingEventId = item.id; request.status = "RFQ in progress"; request.nextAction = "Complete quote setup"; }
      wizardOpen.value = false; wizardStep.value = 0; wizardError.value = ""; wizard.value = freshWizard();
      router.replace(`/procurement/sourcing?event=${item.id}`);
      store.notice("Quote round created");
    };

    watch(() => route.query.event, () => {
      tab.value = route.query.tab || "overview";
      awardSupplierId.value = rankedQuotes.value[0]?.supplierId || "";
      awardReason.value = event.value?.awardReason || "";
    }, { immediate: true });
    watch(() => route.query.new, (v) => { wizardOpen.value = v === "1"; });
    watch(() => route.query.step, (v) => { const n = Number(v); if (route.query.new === "1" && [0, 1, 2].includes(n) && n !== wizardStep.value) wizardStep.value = n; });
    watch(event, (item) => {
      if (!item || route.query.new === "1" || route.query.event === item.id) return;
      router.replace({ path: "/procurement/sourcing", query: window.WebCommon.mergeRouteQuery(route.query, { event: item.id }) });
    }, { immediate: true });

    return {
      window, store, router, event, accessibleEvents, columns, tabs, tab, criteria, typeLabel, statusLabel,
      deadlineDate, readiness, nextAction, filteredSuppliers, supplierSearch, rankedQuotes, awardSupplierId,
      awardReason, selectedAwardQuote, selectedAwardSupplier, wizardOpen, wizardStep, wizardSteps: ["Setup", "Suppliers", "Send"],
      wizard, wizardForm, wizardError, format, linkFor, openEvent, updateCell, statusClass, saveDeadline, record,
      addLot, removeLot, goNext, initials, toggleSupplier, sendInvites, publish, cloneEvent, archiveEvent,
      archiveEvents, exportBidSheet, simulateQuote, applyScenario, award, closeWizard, toggleWizardSupplier,
      nextWizard, saveWizard,
    };
  },
};
</script>
