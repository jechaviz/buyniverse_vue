<template>
  <div class="space-y-5">
    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <article v-for="metric in metrics" :key="metric.label" class="premium-card rounded-xl border p-4">
        <div class="flex items-center justify-between">
          <span class="grid h-9 w-9 place-items-center rounded-lg" :class="metric.tone"><i class="fa-solid" :class="metric.icon"></i></span>
          <b class="text-2xl">{{ metric.value }}</b>
        </div>
        <p class="mt-3 text-xs font-semibold text-slate-500">{{ metric.label }}</p>
        <p class="mt-1 text-[10px] text-slate-400">{{ metric.note }}</p>
      </article>
    </section>

    <DataTable
      :items="accessibleOrders"
      :columns="columns"
      title="Orders"
      table-id="procurement-orders"
      group-by="status"
      :group-label="statusLabel"
      :users="store.state.users"
      :format="format"
      :link-for="linkFor"
      @update-cell="updateCell"
      @edit="openOrder"
      @delete="archiveOrder"
      @archive="archiveOrders"
    />

    <section v-if="order" class="panel overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-card dark:border-slate-800/80 dark:bg-slate-900/90">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2 text-[11px] dark:border-slate-800/80 dark:bg-slate-950/40">
        <div class="flex items-center gap-1.5 text-slate-500">
          <RouterLink to="/procurement" class="font-semibold hover:text-brand">Procurement</RouterLink>
          <span>/</span>
          <RouterLink to="/procurement/execution" class="font-semibold hover:text-brand">Orders</RouterLink>
          <span>/</span>
          <span class="font-bold text-slate-900 dark:text-white">{{ order.id }}</span>
        </div>
        <div class="flex items-center gap-3">
          <RouterLink v-if="order.eventId" :to="`/procurement/sourcing?event=${order.eventId}`" class="font-bold text-brand hover:underline inline-flex items-center gap-1">
            <i class="fa-solid fa-file-signature text-[10px]"></i>RFX: {{ order.eventId }}
          </RouterLink>
          <RouterLink v-if="order.invoiceId" :to="`/invoices/${order.invoiceId}`" class="font-bold text-violet-600 dark:text-violet-400 hover:underline inline-flex items-center gap-1">
            <i class="fa-solid fa-file-invoice text-[10px]"></i>Invoice: {{ order.invoiceId }}
          </RouterLink>
        </div>
      </div>

      <header class="border-b border-slate-100 p-4 sm:p-5 dark:border-slate-800">
        <div class="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="rounded-lg bg-brand-50 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-brand dark:bg-brand/20">{{ order.id }}</span>
              <span class="badge rounded-lg px-2.5 py-0.5 text-[10px]" :class="statusClass(order.status)">{{ statusLabel(order.status) }}</span>
              <span v-if="openExceptions.length" class="badge rounded-lg px-2.5 py-0.5 text-[10px] bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                <i class="fa-solid fa-triangle-exclamation mr-1 text-[10px]"></i>{{ openExceptions.length }} issue
              </span>
            </div>
            <h2 class="font-head mt-1.5 text-xl sm:text-2xl font-800 tracking-tight text-slate-900 dark:text-white">{{ order.title }}</h2>
            <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
              <RouterLink :to="`/suppliers?supplier=${order.supplierId}`" class="flex items-center gap-1.5 font-bold text-slate-700 hover:text-brand dark:text-slate-300">
                <i class="fa-solid fa-building text-slate-400"></i>{{ supplier?.name || order.supplierId }}
              </RouterLink>
              <span class="flex items-center gap-1.5"><i class="fa-solid fa-wallet text-slate-400"></i><b class="font-mono text-slate-700 dark:text-slate-300">{{ store.money(order.total, order.currency) }}</b></span>
              <span class="flex items-center gap-1.5"><i class="fa-solid fa-warehouse text-slate-400"></i>{{ order.warehouse }}</span>
              <span class="flex items-center gap-1.5"><i class="fa-regular fa-calendar text-slate-400"></i>{{ order.eta === 'Delivered' ? 'Delivered' : store.date(order.eta) }}</span>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <button class="btn-muted text-xs py-2 px-3.5" @click="printOrder"><i class="fa-solid fa-print mr-1.5"></i>Print</button>
            <button v-if="order.receivedPercent < 100" class="btn-brand text-xs py-2 px-3.5" @click="receiveOpen = true">
              <i class="fa-solid fa-box mr-1.5"></i>Receive
            </button>
            <button v-if="order.status !== 'Closed'" class="btn-muted text-xs py-2 px-3.5" @click="closeOrder">
              <i class="fa-solid fa-check mr-1.5"></i>Close
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

      <!-- Overview Tab -->
      <div v-if="tab === 'overview'" class="grid gap-0 xl:grid-cols-[minmax(0,1.25fr)_360px]">
        <div class="border-b border-slate-200/70 p-5 dark:border-slate-700 xl:border-b-0 xl:border-r">
          <h3 class="text-sm font-800">Milestones</h3>
          <p class="mt-1 text-xs text-slate-500">Track progress through full receipt and reconciliation.</p>
          <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article v-for="stg in executionStages" :key="stg.label" class="rounded-xl border p-3.5" :class="stg.done ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-500/30' : stg.current ? 'border-brand bg-brand-50/50 dark:bg-brand/10' : 'border-slate-200/70 dark:border-slate-700'">
              <div class="flex items-center justify-between">
                <span class="grid h-7 w-7 place-items-center rounded-lg text-xs" :class="stg.done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'"><i class="fa-solid" :class="stg.icon"></i></span>
                <i class="fa-solid" :class="stg.done ? 'fa-circle-check text-emerald-500' : 'fa-circle text-slate-300'"></i>
              </div>
              <b class="mt-3 block text-xs">{{ stg.label }}</b>
              <p class="mt-1 text-[10px] text-slate-500">{{ stg.detail }}</p>
            </article>
          </div>
          <div class="mt-6">
            <div class="flex justify-between text-xs"><b>Fulfillment</b><span class="font-bold text-brand">{{ order.receivedPercent }}%</span></div>
            <div class="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-700"><div class="h-full rounded-full bg-brand" :style="{ width: order.receivedPercent + '%' }"></div></div>
          </div>
        </div>
        <aside class="p-5">
          <h3 class="text-sm font-800">Quick facts</h3>
          <div class="mt-4 space-y-2">
            <div v-for="b in smartButtons" :key="b.label" class="flex justify-between items-center rounded-lg bg-slate-50 p-2.5 text-xs dark:bg-slate-800">
              <span class="flex items-center gap-2"><i class="fa-solid text-slate-400" :class="b.icon"></i>{{ b.label }}</span>
              <b class="font-mono">{{ b.value }}</b>
            </div>
          </div>
        </aside>
      </div>

      <OrderLinesTab v-else-if="tab === 'lines'" :order="order" :format-money="store.money" />
      <OrderMatchingTab v-else-if="tab === 'matching'" :match-documents="matchDocuments" :match-ready="matchReady" @run-match="runMatch" />
      <OrderExceptionsTab v-else-if="tab === 'exceptions'" :order="order" :user-name="(id) => store.user(id)?.name" @add="addException" @resolve="resolveException" />
      <div v-else-if="tab === 'documents'" class="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">
        <RouterLink v-if="order.invoiceId" :to="`/invoices/${order.invoiceId}`" class="rounded-xl border border-slate-200/70 p-4 hover:border-brand dark:border-slate-700">
          <i class="fa-solid fa-file-invoice-dollar text-xl text-brand"></i><b class="mt-3 block text-sm">Invoice</b><p class="mt-1 text-[10px] text-slate-500">{{ order.invoiceId }} · fiscal document</p>
        </RouterLink>
        <article class="rounded-xl border border-slate-200/70 p-4 dark:border-slate-700">
          <i class="fa-solid fa-file-contract text-xl text-brand"></i><b class="mt-3 block text-sm">Order</b><p class="mt-1 text-[10px] text-slate-500">{{ order.id }} · commercial terms</p>
        </article>
      </div>
      <div v-else class="p-5">
        <div class="mx-auto max-w-4xl space-y-3">
          <div v-for="entry in order.audit" :key="entry.id" class="rounded-xl border border-slate-200/70 p-3 text-xs dark:border-slate-700">
            <div class="flex justify-between"><b class="text-xs">{{ entry.action }}</b><span class="text-[10px] text-slate-400">{{ store.date(entry.at) }}</span></div>
            <p class="mt-1 text-slate-500">{{ entry.detail }}</p>
          </div>
          <p v-if="!order.audit.length" class="py-12 text-center text-slate-400">No activity recorded.</p>
        </div>
      </div>
    </section>

    <OrderReceiptModal :open="receiveOpen" :lines="receiptLines" @close="receiveOpen = false" @submit="saveReceipt" />
  </div>
</template>
<script>
const { inject, computed, ref, watch } = Vue;
const { useRoute, useRouter } = VueRouter;
const load = (p) => Vue.defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(p, window.sfcOptions));
const DataTable = load("./app/components/DataTable.vue?v=24");
const OrderReceiptModal = load("./app/pages/procurement/execution/OrderReceiptModal.vue?v=1");
const OrderLinesTab = load("./app/pages/procurement/execution/OrderLinesTab.vue?v=1");
const OrderMatchingTab = load("./app/pages/procurement/execution/OrderMatchingTab.vue?v=1");
const OrderExceptionsTab = load("./app/pages/procurement/execution/OrderExceptionsTab.vue?v=1");

export default {
  components: { DataTable, OrderReceiptModal, OrderLinesTab, OrderMatchingTab, OrderExceptionsTab },
  setup() {
    const store = inject("store"), route = useRoute(), router = useRouter();
    const tab = computed({
      get: () => ["overview", "lines", "receipts", "matching", "exceptions", "documents", "audit"].includes(route.query.tab) ? route.query.tab : "overview",
      set: (key) => router.push({ path: "/procurement/execution", query: window.WebCommon.mergeRouteQuery(route.query, { tab: key }) }),
    });
    const receiveOpen = ref(route.query.view === "receipt"), receiptLines = ref([]);

    const columns = [
      { key: "id", label: "Order", width: 115 },
      { key: "title", label: "Description", width: 240, edit: { type: "text" } },
      { key: "supplierId", label: "Supplier", width: 175, edit: { type: "select", options: store.state.suppliers.map((i) => ({ value: i.id, label: i.name })) } },
      { key: "status", label: "Status", width: 150 },
      { key: "total", label: "Total", width: 125, edit: { type: "number" } },
      { key: "receivedPercent", label: "Received %", width: 110 },
      { key: "matchStatus", label: "Invoice check", width: 130 },
      { key: "eta", label: "ETA", width: 125, edit: { type: "date" } },
      { key: "exceptionCount", label: "Issues", width: 105 },
      { key: "operationalScope", label: "Applies to", width: 210 },
    ];

    const accessibleOrders = computed(() => {
      const scopedOrders = store.scopedRecords(store.state.purchaseOrders);
      const list = scopedOrders.filter((item) => {
        if (store.isAdmin.value) return true;
        if (store.marketplaceMode.value === "supplier") {
          const supplierId = store.currentSupplierId?.value || store.userSupplierId(store.currentUser.value.id);
          if (supplierId) return item.supplierId === supplierId;
        }
        return item.buyerId === store.currentUser.value.id || store.isBuyer.value;
      });
      return list.length ? list : scopedOrders;
    });

    const canManage = (item) => Boolean(item) && (store.isAdmin.value || (store.isBuyer.value && item.buyerId === store.currentUser.value.id) || store.isBuyer.value);
    const order = computed(() => accessibleOrders.value.find((item) => item.id === route.query.order) || accessibleOrders.value[0]);
    const supplier = computed(() => store.supplier(order.value?.supplierId));
    const openExceptions = computed(() => order.value?.exceptions.filter((item) => item.status !== "Resolved") || []);

    const metrics = computed(() => [
      { label: "Open orders", value: accessibleOrders.value.filter((i) => !["Matched", "Closed"].includes(i.status)).length, note: "Active commitments", icon: "fa-cart-shopping", tone: "bg-sky-50 text-sky-600 dark:bg-sky-500/10" },
      { label: "Pending receipt", value: accessibleOrders.value.filter((i) => i.receivedPercent < 100).length, note: "Warehouse follow-up", icon: "fa-box-open", tone: "bg-amber-50 text-amber-600 dark:bg-amber-500/10" },
      { label: "Partially received", value: accessibleOrders.value.filter((i) => i.receivedPercent > 0 && i.receivedPercent < 100).length, note: "Incomplete fulfillment", icon: "fa-truck-ramp-box", tone: "bg-violet-50 text-violet-600 dark:bg-violet-500/10" },
      { label: "Invoice issues", value: accessibleOrders.value.reduce((s, i) => s + i.exceptions.filter((e) => e.status !== "Resolved").length, 0), note: "Need attention", icon: "fa-triangle-exclamation", tone: "bg-rose-50 text-rose-600 dark:bg-rose-500/10" },
      { label: "Checked value", value: store.money(accessibleOrders.value.filter((i) => i.status === "Matched").reduce((s, i) => s + i.total, 0), "MXN"), note: "Ready for close", icon: "fa-circle-check", tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10" },
    ]);

    const tabs = computed(() => order.value ? [
      { key: "overview", label: "Overview", icon: "fa-layer-group" },
      { key: "lines", label: "Order lines", icon: "fa-list", count: order.value.lines.length },
      { key: "matching", label: "Invoice check", icon: "fa-link" },
      { key: "exceptions", label: "Issues", icon: "fa-triangle-exclamation", count: openExceptions.value.length },
      { key: "documents", label: "Documents", icon: "fa-folder-open" },
      { key: "audit", label: "History", icon: "fa-clock-rotate-left", count: order.value.audit.length },
    ] : []);

    const smartButtons = computed(() => order.value ? [
      { label: "Order lines", value: order.value.lines.length, icon: "fa-list" },
      { label: "Receipts", value: order.value.receipts.length, icon: "fa-box" },
      { label: "Invoices", value: order.value.invoiceId ? 1 : 0, icon: "fa-file-invoice-dollar" },
      { label: "Issues", value: openExceptions.value.length, icon: "fa-triangle-exclamation" },
      { label: "Completion", value: order.value.receivedPercent + "%", icon: "fa-chart-pie" },
    ] : []);

    const statusIndex = computed(() => ({ Ordered: 0, "Awaiting receipt": 0, "Partially received": 1, Received: 2, Matched: 3, Closed: 3 })[order.value?.status] ?? 0);
    const executionStages = computed(() => [
      { label: "Issued", detail: "Supplier commitment", icon: "fa-paper-plane" },
      { label: "In transit", detail: "Receipt tracking", icon: "fa-truck-fast" },
      { label: "Received", detail: "Warehouse evidence", icon: "fa-box" },
      { label: "Matched", detail: "Invoice reconciliation", icon: "fa-link" },
    ].map((item, index) => ({ ...item, done: index < statusIndex.value, current: index === statusIndex.value })));

    const matchReady = computed(() => order.value?.receivedPercent === 100 && Boolean(order.value.invoiceId) && openExceptions.value.length === 0);
    const matchDocuments = computed(() => order.value ? [
      { label: "Order", detail: `${order.value.id} · ${store.money(order.value.total, order.value.currency)}`, icon: "fa-file-contract", ready: true },
      { label: "Receipt", detail: order.value.receivedPercent === 100 ? "All lines received" : `${order.value.receivedPercent}% received`, icon: "fa-box", ready: order.value.receivedPercent === 100 },
      { label: "Invoice", detail: order.value.invoiceId || "Waiting for supplier invoice", icon: "fa-file-invoice-dollar", ready: Boolean(order.value.invoiceId) },
    ] : []);

    const matchLabel = (v) => v === "3-way match" ? "Standard check" : v === "2-way match" ? "Basic check" : v;
    const statusLabel = (s) => ({ Matched: "Checked", "Awaiting receipt": "Waiting for delivery", "Partially received": "Partially delivered", Received: "Delivered" })[s] || s;

    const format = (item, key) => {
      if (key === "supplierId") return store.supplier(item.supplierId)?.name || "—";
      if (key === "total") return store.money(item.total, item.currency);
      if (key === "eta") return item.eta === "Delivered" ? "Delivered" : store.date(item.eta);
      if (key === "exceptionCount") return item.exceptions.filter((e) => e.status !== "Resolved").length;
      if (key === "matchStatus") return matchLabel(item.matchStatus);
      if (key === "operationalScope") return store.scopeLabel(item);
      if (key === "status") return statusLabel(item.status);
      return item[key] ?? "—";
    };

    const linkFor = (item, key) => ["id", "title"].includes(key) ? `/procurement/execution?order=${item.id}` : null;
    const openOrder = (item) => router.push(`/procurement/execution?order=${item.id}`);

    const updateCell = ({ id, key, value }) => {
      const item = accessibleOrders.value.find((entry) => entry.id === id);
      if (!canManage(item)) return store.notice("Order update denied", "fa-shield-halved");
      if (key === "total") {
        value = Number(value);
        if (!window.WebCommon.isSafeAmount(value, 0) || value <= 0)
          return store.notice("Enter a valid order total", "fa-triangle-exclamation");
      }
      if (key === "eta") { const d = new Date(value + "T18:00:00Z"); if (Number.isNaN(d.getTime())) return; value = d.toISOString(); }
      if (key === "supplierId" && !store.supplier(value)) return;
      if (typeof value === "string" && !["eta", "supplierId"].includes(key)) value = window.WebCommon.sanitizeText(value, 500).trim();
      item[key] = value;
      store.procurementEvent(item, "Order field updated", key);
    };

    const statusClass = (status) => status === "Matched" || status === "Closed" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : status === "Partially received" ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" : "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300";

    const record = (action, detail, level) => { if (canManage(order.value)) return store.procurementEvent(order.value, action, detail, level); };
    const setupReceipt = () => { receiptLines.value = order.value.lines.map((l) => ({ ...l, receiveNow: Math.max(0, l.ordered - l.received) })); };

    watch(receiveOpen, (value) => {
      if (value) setupReceipt();
      router.replace({ path: "/procurement/execution", query: window.WebCommon.mergeRouteQuery(route.query, { view: value ? "receipt" : null }) });
    });
    watch(() => route.query.view, (v) => { receiveOpen.value = v === "receipt"; });

    const saveReceipt = () => {
      if (!canManage(order.value)) return store.notice("Receipt action denied", "fa-shield-halved");
      let receivedAny = false;
      receiptLines.value.forEach((input) => {
        const line = order.value.lines.find((i) => i.id === input.id);
        const rem = line ? Math.max(0, Number(line.ordered) - Number(line.received)) : 0;
        const qty = Math.min(rem, Math.max(0, Number(input.receiveNow) || 0));
        if (line && qty) { line.received += qty; receivedAny = true; }
      });
      if (!receivedAny) return store.notice("Enter a receipt quantity", "fa-circle-info");
      const ord = order.value.lines.reduce((s, l) => s + Number(l.ordered), 0), rec = order.value.lines.reduce((s, l) => s + Number(l.received), 0);
      order.value.receivedPercent = ord ? Math.round((rec / ord) * 100) : 0;
      order.value.receipts.push({ id: window.ProcurementCommon.uid("receipt"), at: new Date().toISOString(), warehouse: window.WebCommon.sanitizeText(order.value.warehouse, 80), status: "Posted", lines: receiptLines.value.filter((l) => Number(l.receiveNow) > 0).length });
      order.value.status = order.value.receivedPercent === 100 ? "Received" : "Partially received";
      record(order.value.receivedPercent === 100 ? "Receipt completed" : "Partial receipt", order.value.receivedPercent + "% received", order.value.receivedPercent === 100 ? "success" : "warning");
      receiveOpen.value = false;
      store.notice("Goods receipt posted", "fa-box");
    };

    const runMatch = () => {
      if (!canManage(order.value)) return store.notice("Invoice check denied", "fa-shield-halved");
      if (openExceptions.value.length) return store.notice("Resolve open issues first", "fa-triangle-exclamation");
      if (order.value.receivedPercent < 100) return store.notice("All lines must be received", "fa-triangle-exclamation");
      const inv = store.state.invoices.find((i) => i.id === order.value.invoiceId);
      if (!inv || Number(inv.total) !== Number(order.value.total)) return store.notice("Attach a matching invoice before confirming", "fa-triangle-exclamation");
      order.value.matchStatus = "3-way match";
      store.procurementTransition(order.value, "Matched", `PO, receipt and ${order.value.invoiceId} reconciled`);
      tab.value = "matching";
    };

    const resolveException = (exc) => {
      if (!canManage(order.value) || !order.value.exceptions.includes(exc)) return store.notice("Issue update denied", "fa-shield-halved");
      exc.status = "Resolved"; exc.resolvedAt = new Date().toISOString();
      record("Issue resolved", `${exc.type} · ${exc.detail}`, "success");
      store.notice("Issue resolved");
    };

    const addException = () => {
      if (!canManage(order.value)) return store.notice("Issue creation denied", "fa-shield-halved");
      order.value.exceptions.push({ id: window.ProcurementCommon.uid("exc"), type: "Manual review", ownerId: store.currentUser.value.id, status: "Open", severity: "Medium", detail: "Operational evidence requires review." });
      record("Issue added", "Manual review", "warning");
    };

    const printOrder = () => { if (order.value) { window.print(); record("Print requested", "Order"); } };
    const closeOrder = () => {
      if (!canManage(order.value)) return store.notice("Order closure denied", "fa-shield-halved");
      if (openExceptions.value.length) return store.notice("Resolve open issues first", "fa-triangle-exclamation");
      store.procurementTransition(order.value, "Closed", "Execution complete");
    };

    const archiveOrder = async (item) => {
      if (!canManage(item)) return store.notice("Archive denied", "fa-shield-halved");
      if (await store.confirm({ title: "Archive order?", message: "The order remains available in the audit data.", confirmText: "Archive", danger: true })) {
        item.archived = true; store.procurementEvent(item, "Archived", "Order archived");
      }
    };

    const archiveOrders = (ids) => {
      let count = 0;
      ids.slice(0, 100).forEach((id) => {
        const item = accessibleOrders.value.find((entry) => entry.id === id);
        if (canManage(item)) { item.archived = true; count++; }
      });
      store.notice(`${count} orders archived`);
    };

    watch(() => route.query.order, () => { tab.value = "overview"; });
    watch(order, (item) => {
      if (!item || route.query.order === item.id) return;
      router.replace({ path: "/procurement/execution", query: window.WebCommon.mergeRouteQuery(route.query, { order: item.id }) });
    }, { immediate: true });

    return {
      store, order, accessibleOrders, supplier, columns, matchLabel, statusLabel, metrics, tabs, tab,
      smartButtons, executionStages, openExceptions, matchReady, matchDocuments, format, linkFor, openOrder,
      updateCell, statusClass, record, receiveOpen, receiptLines, saveReceipt, runMatch, resolveException,
      addException, printOrder, closeOrder, archiveOrder, archiveOrders,
    };
  },
};
</script>
