<template>
  <div class="space-y-5">
    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <button v-for="metric in metrics" :key="metric.label" class="premium-card rounded-xl border p-4 text-left" @click="metric.action">
        <div class="flex items-center justify-between">
          <span class="grid h-9 w-9 place-items-center rounded-lg" :class="metric.tone"><i class="fa-solid" :class="metric.icon"></i></span>
          <b class="text-2xl">{{ metric.value }}</b>
        </div>
        <p class="mt-3 text-xs font-semibold text-slate-500">{{ metric.label }}</p>
        <p class="mt-1 text-[11px] text-slate-400">{{ metric.note }}</p>
      </button>
    </section>

    <section class="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_380px]">
      <DataTable
        :items="scopedRequests"
        :columns="columns"
        title="Requests"
        table-id="procurement-requests"
        group-by="status"
        :group-label="simpleStatus"
        :users="store.state.users"
        :format="format"
        :link-for="linkFor"
        @update-cell="updateCell"
        @delete="removeRequest"
        @archive="archiveRequests"
      />

      <QueueDetailPanel
        :selected="selected"
        :can-own="canOwn"
        :can-approve="canApprove"
        :detail-metrics="detailMetrics"
        :status-class="statusClass"
        :simple-status="simpleStatus"
        :format-money="store.money"
        @submit="submitRequest"
        @approve="approve"
        @request-info="requestInfo"
        @reject="reject"
        @create-rfx="createRfx"
      />
    </section>

    <QueueCreateModal :open="formOpen" :draft="draft" @close="closeForm" @save="saveRequest" />
  </div>
</template>
<script>
const { inject, computed, ref, watch } = Vue;
const { useRoute, useRouter } = VueRouter;
const load = (p) => Vue.defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(p, window.sfcOptions));
const DataTable = load("./app/components/DataTable.vue?v=24");
const QueueDetailPanel = load("./app/pages/procurement/queue/QueueDetailPanel.vue?v=1");
const QueueCreateModal = load("./app/pages/procurement/queue/QueueCreateModal.vue?v=1");

export default {
  components: { DataTable, QueueDetailPanel, QueueCreateModal },
  setup() {
    const store = inject("store"), route = useRoute(), router = useRouter();
    const columns = [
      { key: "id", label: "Request", width: 110 },
      { key: "title", label: "Title", width: 220, edit: { type: "text" } },
      { key: "department", label: "Department", width: 140, edit: { type: "text" } },
      { key: "amount", label: "Amount", width: 120, edit: { type: "number" } },
      { key: "status", label: "Status", width: 160 },
      { key: "priority", label: "Priority", width: 100, edit: { type: "select", options: ["Low", "Medium", "High"] } },
      { key: "dueDate", label: "Needed by", width: 125, edit: { type: "date" } },
      { key: "operationalScope", label: "Applies to", width: 210 },
    ];

    const scopedRequests = computed(() => store.scopedRecords(store.state.purchaseRequests));
    const selected = computed(() => scopedRequests.value.find((item) => item.id === route.query.request) || scopedRequests.value[0]);
    const canOwn = computed(() => Boolean(selected.value) && (store.isAdmin.value || selected.value.ownerId === store.currentUser.value.id));
    const canApprove = computed(() => Boolean(selected.value) && (store.isAdmin.value || selected.value.approverId === store.currentUser.value.id));

    const metrics = computed(() => [
      { label: "New request", value: "+", note: "Create purchase request", icon: "fa-plus", tone: "bg-brand text-white", action: () => { formOpen.value = true; } },
      { label: "Pending approval", value: scopedRequests.value.filter((i) => i.status === "Pending approval").length, note: "Awaiting sign-off", icon: "fa-clock", tone: "bg-amber-50 text-amber-600 dark:bg-amber-500/10", action: () => {} },
      { label: "Ready for quotes", value: scopedRequests.value.filter((i) => i.status === "Approved" && !i.sourcingEventId).length, note: "Start sourcing round", icon: "fa-file-signature", tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10", action: () => {} },
      { label: "Active RFQs", value: scopedRequests.value.filter((i) => Boolean(i.sourcingEventId)).length, note: "Suppliers bidding", icon: "fa-comments-dollar", tone: "bg-violet-50 text-violet-600 dark:bg-violet-500/10", action: () => {} },
    ]);

    const detailMetrics = computed(() => selected.value ? [
      { label: "Total amount", value: store.money(selected.value.amount, selected.value.currency) },
      { label: "Requester", value: store.user(selected.value.requesterId)?.name || selected.value.department },
      { label: "Priority", value: selected.value.priority },
      { label: "Budget", value: selected.value.budgetCode || "Unassigned" },
      { label: "Approver", value: store.user(selected.value.approverId)?.name || "—" },
      { label: "Needed by", value: store.date(selected.value.dueDate) },
    ] : []);

    const simpleStatus = (s) => s === "RFQ in progress" ? "Quotes in progress" : s;
    const format = (item, key) => key === "amount" ? store.money(item.amount, item.currency) : key === "dueDate" ? store.date(item.dueDate) : key === "status" ? simpleStatus(item.status) : key === "operationalScope" ? store.scopeLabel(item) : (item[key] ?? "—");
    const linkFor = (item, key) => ["id", "title"].includes(key) ? `/procurement/queue?request=${item.id}` : null;

    const updateCell = ({ id, key, value }) => {
      const item = store.purchaseRequest(id);
      if (!item || (!store.isAdmin.value && item.ownerId !== store.currentUser.value.id)) return store.notice("Request update denied", "fa-shield-halved");
      if (key === "amount") {
        value = Number(value);
        if (!window.WebCommon.isSafeAmount(value, 0) || value <= 0)
          return store.notice("Enter a valid request amount", "fa-triangle-exclamation");
      }
      item[key] = typeof value === "string" ? window.WebCommon.sanitizeText(value, 500) : value;
      store.procurementEvent(item, "Field updated", key, "info");
    };

    const statusClass = (status) => ({
      Draft: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200",
      "Pending approval": "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
      Approved: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
      "RFQ in progress": "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
      Rejected: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
    })[status] || "bg-sky-50 text-sky-700";

    const formOpen = ref(false);
    const freshDraft = () => ({
      title: "", department: "Engineering", category: "Technology", priority: "Medium",
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      amount: 15000, itemDescription: "", quantity: 1, unitPrice: 15000, budgetCode: "CAPEX-2026", notes: "",
    });
    const draft = ref(freshDraft());

    const closeForm = () => {
      formOpen.value = false; draft.value = freshDraft();
      router.replace({ path: "/procurement/queue", query: route.query.request ? { request: route.query.request } : {} });
    };

    const saveRequest = () => {
      const d = draft.value, amt = Number(d.amount), qty = Number(d.quantity), up = Number(d.unitPrice);
      const title = window.WebCommon.sanitizeText(d.title, 160).trim();
      const dept = window.WebCommon.sanitizeText(d.department, 80).trim();
      const desc = window.WebCommon.sanitizeText(d.itemDescription, 300).trim();
      const dueDate = new Date(`${d.dueDate}T18:00:00Z`);
      if (
        !title || !dept || !desc ||
        !window.WebCommon.isSafeAmount(amt, 0) || amt <= 0 ||
        !window.WebCommon.isSafeAmount(qty, 1, 1000000) || !Number.isInteger(qty) ||
        !window.WebCommon.isSafeAmount(up, 0) || up <= 0 || Number.isNaN(dueDate.getTime())
      ) return store.notice("Complete required fields with valid values", "fa-triangle-exclamation");
      const id = "PR-" + String(2410 + store.state.purchaseRequests.length);
      const req = store.scopeRecord({
        id, title, requesterId: store.currentUser.value.id, department: dept, amount: amt, currency: "USD",
        status: "Draft", approverId: "user-admin-admin", ownerId: store.currentUser.value.id,
        priority: ["Low", "Medium", "High"].includes(d.priority) ? d.priority : "Medium",
        category: window.WebCommon.sanitizeText(d.category, 80).trim(), dueDate: dueDate.toISOString(),
        budgetCode: window.WebCommon.sanitizeText(d.budgetCode, 30).trim(), notes: window.WebCommon.sanitizeText(d.notes, 2000).trim(),
        nextAction: "Submit for approval",
        items: [{ id: window.ProcurementCommon.uid("pr-line"), description: desc, quantity: qty, unitPrice: up }],
        audit: [],
      });
      store.state.purchaseRequests.unshift(req);
      store.procurementEvent(req, "Request created", "Draft saved", "success");
      store.notice("Purchase request created");
      closeForm();
      router.replace(`/procurement/queue?request=${req.id}`);
    };

    const submitRequest = () => {
      if (!canOwn.value || selected.value.status !== "Draft") return store.notice("Request submission denied", "fa-shield-halved");
      store.procurementTransition(selected.value, "Pending approval", "Submitted to " + (store.user(selected.value.approverId)?.name || "approver"));
      selected.value.nextAction = "Approval decision";
    };

    const approve = () => {
      if (!canApprove.value || selected.value.status !== "Pending approval") return store.notice("Approval denied", "fa-shield-halved");
      store.procurementTransition(selected.value, "Approved", "Budget and policy checks passed");
      selected.value.nextAction = "Request quotes";
      store.addNotification({ userId: selected.value.requesterId, title: "Request approved", text: `${selected.value.id} is ready for quotes.`, link: `/procurement/queue?request=${selected.value.id}`, icon: "fa-circle-check" });
    };

    const reject = async () => {
      if (!canApprove.value) return store.notice("Rejection denied", "fa-shield-halved");
      if (await store.confirm({ title: "Reject request?", message: "The request will remain traceable.", confirmText: "Reject", danger: true })) {
        store.procurementTransition(selected.value, "Rejected", "Decision recorded by " + store.currentUser.value.name);
        selected.value.nextAction = "Revise request";
      }
    };

    const requestInfo = () => {
      if (!canApprove.value) return store.notice("Action denied", "fa-shield-halved");
      selected.value.nextAction = "Requester clarification";
      store.procurementEvent(selected.value, "Information requested", "Business justification needs more detail", "warning");
      store.notice("Clarification requested", "fa-comment-dots");
    };

    const createRfx = () => {
      const req = selected.value;
      if (!req || !canOwn.value || req.status !== "Approved" || req.sourcingEventId) return store.notice("Quote request creation denied", "fa-shield-halved");
      const ev = store.scopeRecord({
        id: "RFQ-" + new Date().getFullYear() + "-" + String(100 + store.state.sourcingEvents.length),
        title: window.WebCommon.sanitizeText(req.title, 160).trim(), type: "RFQ", status: "Draft",
        requestId: req.id, projectId: req.projectId || null, ownerId: store.currentUser.value.id,
        budget: Number(req.amount), currency: req.currency, round: 1,
        deadline: new Date(Date.now() + 7 * 86400000).toISOString(), visibility: "Private", autoExtend: false,
        publishedAt: null, invitedSupplierIds: [], messagesOpen: 0, savingsTarget: 8, awardReason: "", awardedSupplierId: null,
        weights: { price: 40, quality: 25, delivery: 15, risk: 15, esg: 5 },
        lots: req.items.map((i) => ({ id: window.ProcurementCommon.uid("lot"), description: i.description, quantity: i.quantity, targetPrice: i.unitPrice })),
        quotes: [], audit: [],
      });
      store.state.sourcingEvents.unshift(ev);
      req.sourcingEventId = ev.id;
      req.status = "RFQ in progress";
      req.nextAction = "Collect supplier quotes";
      store.procurementEvent(req, "RFX launched", ev.id, "success");
      store.notice("RFX created from purchase request");
      router.push(`/procurement/sourcing?event=${ev.id}`);
    };

    const removeRequest = async (item) => {
      if (item.ownerId !== store.currentUser.value.id && !store.isAdmin.value) return store.notice("Request deletion denied", "fa-shield-halved");
      if (await store.confirm({ title: "Remove request?", message: "The request will be archived.", confirmText: "Remove", danger: true })) {
        item.archived = true; store.notice("Request removed");
      }
    };

    const archiveRequests = (ids) => {
      let count = 0;
      ids.slice(0, 50).forEach((id) => {
        const item = store.purchaseRequest(id);
        if (item && (item.ownerId === store.currentUser.value.id || store.isAdmin.value)) { item.archived = true; count++; }
      });
      store.notice(`${count} requests archived`);
    };

    return {
      store, columns, scopedRequests, selected, canOwn, canApprove, metrics, detailMetrics, simpleStatus, format, linkFor,
      updateCell, statusClass, formOpen, draft, closeForm, saveRequest, submitRequest, approve, reject,
      requestInfo, createRfx, removeRequest, archiveRequests,
    };
  },
};
</script>
