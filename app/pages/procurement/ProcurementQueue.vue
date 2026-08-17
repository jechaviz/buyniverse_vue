<template>
  <div class="space-y-5">
    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <button
        v-for="metric in metrics"
        :key="metric.label"
        class="premium-card rounded-xl border p-4 text-left"
        @click="metric.action"
      >
        <div class="flex items-center justify-between">
          <span
            class="grid h-9 w-9 place-items-center rounded-lg"
            :class="metric.tone"
            ><i class="fa-solid" :class="metric.icon"></i></span
          ><b class="text-2xl">{{ metric.value }}</b>
        </div>
        <p class="mt-3 text-xs font-semibold text-slate-500">
          {{ metric.label }}
        </p>
        <p class="mt-1 text-[11px] text-slate-400">{{ metric.note }}</p>
      </button>
    </section>

    <section class="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_380px]">
      <DataTable
        :items="store.state.purchaseRequests"
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

      <aside
        v-if="selected"
        class="panel self-start overflow-hidden 2xl:sticky 2xl:top-15"
      >
        <header class="border-b border-slate-200/70 p-5 dark:border-slate-700">
          <div class="flex items-start justify-between gap-3">
            <div>
              <span
                class="text-[10px] font-800 uppercase tracking-wider text-brand"
                >{{ selected.id }}</span
              >
              <h2 class="mt-1 text-lg font-800">{{ selected.title }}</h2>
            </div>
            <span class="badge" :class="statusClass(selected.status)">{{
              simpleStatus(selected.status)
            }}</span>
          </div>
          <p class="mt-2 text-xs leading-5 text-slate-500">
            {{ selected.notes }}
          </p>
        </header>
        <div class="grid grid-cols-2 gap-px bg-slate-200/70 dark:bg-slate-700">
          <div
            v-for="item in detailMetrics"
            :key="item.label"
            class="bg-white/90 p-3 dark:bg-slate-800/90"
          >
            <span
              class="text-[10px] font-bold uppercase tracking-wide text-slate-400"
              >{{ item.label }}</span
            ><b class="mt-1 block text-xs">{{ item.value }}</b>
          </div>
        </div>
        <div class="p-5">
          <h3 class="text-xs font-800 uppercase tracking-wide text-slate-500">
            Requested items
          </h3>
          <div class="mt-3 space-y-2">
            <div
              v-for="line in selected.items"
              :key="line.id"
              class="flex items-center justify-between gap-3 rounded-lg border border-slate-200/70 p-3 text-xs dark:border-slate-700"
            >
              <div>
                <b>{{ line.description }}</b>
                <p class="mt-1 text-[10px] text-slate-500">
                  {{ line.quantity }} ×
                  {{ store.money(line.unitPrice, selected.currency) }}
                </p>
              </div>
              <b>{{
                store.money(line.quantity * line.unitPrice, selected.currency)
              }}</b>
            </div>
          </div>
        </div>
        <div class="border-t border-slate-200/70 p-4 dark:border-slate-700">
          <div class="flex flex-wrap gap-2">
            <button
              v-if="selected.status === 'Draft' && canOwn"
              class="btn-brand"
              @click="submitRequest"
            >
              <i class="fa-solid fa-paper-plane"></i>Submit</button
            ><button
              v-if="selected.status === 'Pending approval' && canApprove"
              class="btn-brand !bg-emerald-600"
              @click="approve"
            >
              <i class="fa-solid fa-check"></i>Approve</button
            ><button
              v-if="selected.status === 'Pending approval' && canApprove"
              class="btn-muted"
              @click="requestInfo"
            >
              <i class="fa-solid fa-comment-dots"></i>Request info</button
            ><button
              v-if="selected.status === 'Pending approval' && canApprove"
              class="btn-muted !text-rose-600"
              @click="reject"
            >
              <i class="fa-solid fa-xmark"></i>Reject</button
            ><button
              v-if="selected.status === 'Approved' && canOwn"
              class="btn-brand"
              @click="createRfx"
            >
              <i class="fa-solid fa-wand-magic-sparkles"></i>Request quotes</button
            ><RouterLink
              v-if="selected.sourcingEventId"
              :to="`/procurement/sourcing?event=${selected.sourcingEventId}`"
              class="btn-brand"
              ><i class="fa-solid fa-arrow-right"></i>View quotes</RouterLink
            >
          </div>
        </div>
        <div class="border-t border-slate-200/70 p-5 dark:border-slate-700">
          <h3 class="text-xs font-800 uppercase tracking-wide text-slate-500">
            Decision trail
          </h3>
          <div class="mt-4 space-y-4">
            <div
              v-for="entry in selected.audit"
              :key="entry.id"
              class="relative pl-5 text-xs before:absolute before:left-[3px] before:top-1 before:h-full before:w-px before:bg-slate-200 last:before:hidden dark:before:bg-slate-700"
            >
              <span
                class="absolute left-0 top-1 h-2 w-2 rounded-full bg-brand"
              ></span
              ><b>{{ entry.action }}</b>
              <p class="mt-1 text-[11px] text-slate-500">{{ entry.detail }}</p>
              <time class="mt-1 block text-[10px] text-slate-400"
                >{{ entry.actor }} · {{ store.date(entry.at) }}</time
              >
            </div>
            <p v-if="!selected.audit?.length" class="text-xs text-slate-400">
              No decisions recorded yet.
            </p>
          </div>
        </div>
      </aside>
    </section>

    <div
      v-if="formOpen"
      class="fixed inset-0 z-60 grid place-items-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="New request"
    >
      <button
        class="absolute inset-0"
        aria-label="Close"
        @click="closeForm"
      ></button>
      <form
        class="glass relative my-8 w-full max-w-3xl overflow-hidden rounded-2xl"
        @submit.prevent="saveRequest"
      >
        <header
          class="flex items-center justify-between border-b border-slate-200/70 p-5 dark:border-slate-700"
        >
          <div>
            <span
              class="text-[10px] font-800 uppercase tracking-wider text-brand"
              >Request</span
            >
            <h2 class="mt-1 text-xl font-800">New request</h2>
            <p class="mt-1 text-xs text-slate-500">
              Describe what you need, the budget and when it is required.
            </p>
            <p
              v-if="draftRecovered"
              class="mt-2 text-[10px] font-bold text-amber-600"
            >
              <i class="fa-solid fa-clock-rotate-left mr-1"></i>Protected draft
              restored from this tab
            </p>
          </div>
          <button
            type="button"
            class="grid h-9 w-9 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            @click="closeForm"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </header>
        <div class="grid gap-4 p-5 md:grid-cols-2">
          <p class="required-note md:col-span-2">Required fields</p>
          <label class="md:col-span-2"
            ><span class="mb-1.5 block text-xs font-bold">Request title</span
            ><input
              v-model.trim="draft.title"
              class="field"
              required
              placeholder="What does the business need?" /></label
          ><label
            ><span class="mb-1.5 block text-xs font-bold">Category</span
            ><select v-model="draft.category" class="field" required>
              <option>Technology</option>
              <option>Operations</option>
              <option>Packaging</option>
              <option>Services</option>
              <option>Logistics</option>
            </select></label
          ><label
            ><span class="mb-1.5 block text-xs font-bold">Department</span
            ><input
              v-model.trim="draft.department"
              class="field"
              required /></label
          ><label
            ><span class="mb-1.5 block text-xs font-bold">Estimated amount</span
            ><input
              v-model.number="draft.amount"
              class="field"
              type="number"
              min="1"
              required /></label
          ><label
            ><span class="mb-1.5 block text-xs font-bold">Priority</span
            ><select v-model="draft.priority" class="field" required>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select></label
          ><label
            ><span class="mb-1.5 block text-xs font-bold">Needed by</span
            ><input
              v-model="draft.dueDate"
              class="field"
              type="date"
              required /></label
          ><label
            ><span class="mb-1.5 block text-xs font-bold">Budget code</span
            ><input
              v-model.trim="draft.budgetCode"
              class="field"
              pattern="[A-Za-z0-9_-]{0,30}"
              placeholder="DEPT-000" /></label
          ><label class="md:col-span-2"
            ><span class="mb-1.5 block text-xs font-bold"
              >Business justification</span
            ><textarea
              v-model.trim="draft.notes"
              class="field min-h-24 resize-y"
              required
            ></textarea>
          </label>
          <div
            class="md:col-span-2 rounded-xl border border-slate-200/70 p-4 dark:border-slate-700"
          >
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-800">First line item</h3>
                <p class="mt-1 text-[11px] text-slate-500">
                  Additional lines can be added after saving.
                </p>
              </div>
              <span class="badge bg-brand-50 text-brand">{{
                store.money(draft.quantity * draft.unitPrice)
              }}</span>
            </div>
            <div
              class="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_100px_130px]"
            >
              <label
                ><span class="mb-1 block text-[10px] font-bold"
                  >Item or service</span
                ><input
                  v-model.trim="draft.itemDescription"
                  class="field"
                  required /></label
              ><label
                ><span class="mb-1 block text-[10px] font-bold">Quantity</span
                ><input
                  v-model.number="draft.quantity"
                  class="field"
                  type="number"
                  min="1"
                  required /></label
              ><label
                ><span class="mb-1 block text-[10px] font-bold">Unit price</span
                ><input
                  v-model.number="draft.unitPrice"
                  class="field"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
              /></label>
            </div>
          </div>
        </div>
        <footer
          class="flex justify-end gap-2 border-t border-slate-200/70 p-4 dark:border-slate-700"
        >
          <button type="button" class="btn-muted" @click="closeForm">
            Cancel</button
          ><button type="submit" class="btn-brand">
            <i class="fa-solid fa-check"></i>Save request
          </button>
        </footer>
      </form>
    </div>
  </div>
</template>
<script>
const { inject, computed, ref, watch, onBeforeUnmount } = Vue;
const { useRoute, useRouter } = VueRouter;
const load = (p) =>
  Vue.defineAsyncComponent(() =>
    window["vue3-sfc-loader"].loadModule(p, window.sfcOptions),
  );
const DataTable = load("./app/components/DataTable.vue?v=21");
const freshDraft = () => ({
  title: "",
  category: "Technology",
  department: "Technology",
  amount: 5000,
  currency: "USD",
  priority: "Medium",
  dueDate: "2026-07-31",
  budgetCode: "",
  notes: "",
  itemDescription: "",
  quantity: 1,
  unitPrice: 5000,
});
export default {
  components: { DataTable },
  setup() {
    const store = inject("store"),
      route = useRoute(),
      router = useRouter(),
      draftStore = window.WebCommon.createSessionDraft(
        `buyniverse-request-${store.currentUser.value.id}`,
        { ttlMs: 4 * 60 * 60 * 1000, maxBytes: 128 * 1024 },
      ),
      recoveredDraft = draftStore.read(),
      formOpen = ref(route.query.new === "1"),
      draft = ref(recoveredDraft || freshDraft()),
      draftRecovered = ref(Boolean(recoveredDraft));
    let draftTimer = 0,
      draftEnabled = true;
    const persistDraft = () => {
      window.clearTimeout(draftTimer);
      if (draftEnabled && formOpen.value) draftStore.write(draft.value);
    };
    watch(
      draft,
      () => {
        draftRecovered.value = false;
        window.clearTimeout(draftTimer);
        draftTimer = window.setTimeout(persistDraft, 300);
      },
      { deep: true },
    );
    onBeforeUnmount(persistDraft);
    const columns = [
      { key: "id", label: "Request", width: 120 },
      {
        key: "title",
        label: "Business need",
        width: 240,
        edit: { type: "text" },
      },
      {
        key: "department",
        label: "Department",
        width: 130,
        edit: { type: "text" },
      },
      {
        key: "category",
        label: "Category",
        width: 130,
        edit: {
          type: "select",
          options: [
            "Technology",
            "Operations",
            "Packaging",
            "Services",
            "Logistics",
          ],
        },
      },
      {
        key: "priority",
        label: "Priority",
        width: 100,
        edit: { type: "select", options: ["Low", "Medium", "High"] },
      },
      { key: "amount", label: "Amount", width: 130, edit: { type: "number" } },
      { key: "status", label: "Stage", width: 150 },
      {
        key: "nextAction",
        label: "Next action",
        width: 150,
        edit: { type: "text" },
      },
      {
        key: "dueDate",
        label: "Needed by",
        width: 130,
        edit: { type: "date" },
      },
    ];
    const selected = computed(
      () =>
        store.purchaseRequest(route.query.request) ||
        store.state.purchaseRequests[0],
    );
    const canOwn = computed(
      () =>
        selected.value &&
        (store.currentUser.value.type === "Admin" ||
          selected.value.ownerId === store.currentUser.value.id ||
          selected.value.requesterId === store.currentUser.value.id),
    );
    const canApprove = computed(
      () =>
        selected.value &&
        (store.currentUser.value.type === "Admin" ||
          selected.value.approverId === store.currentUser.value.id),
    );
    const metrics = computed(() => [
      {
        label: "Open requests",
        value: store.state.purchaseRequests.filter(
          (item) => !["Closed", "Rejected"].includes(item.status),
        ).length,
        note: "Across all active stages",
        icon: "fa-inbox",
        tone: "bg-sky-50 text-sky-600 dark:bg-sky-500/10",
        action: () => router.push("/procurement/queue"),
      },
      {
        label: "Awaiting approval",
        value: store.state.purchaseRequests.filter(
          (item) => item.status === "Pending approval",
        ).length,
        note: "Decisions due now",
        icon: "fa-stamp",
        tone: "bg-amber-50 text-amber-600 dark:bg-amber-500/10",
        action: () => router.push("/procurement/queue"),
      },
      {
        label: "Ready for quotes",
        value: store.state.purchaseRequests.filter(
          (item) => item.status === "Approved",
        ).length,
        note: "Approved and ready to send",
        icon: "fa-circle-check",
        tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10",
        action: () => router.push("/procurement/queue"),
      },
      {
        label: "Approval time",
        value: store.state.procurementAnalytics.kpis.approvalCycleDays + "d",
        note: "Down from 2.6 days",
        icon: "fa-stopwatch",
        tone: "bg-violet-50 text-violet-600 dark:bg-violet-500/10",
        action: () => router.push("/procurement/intelligence"),
      },
    ]);
    const detailMetrics = computed(() =>
      selected.value
        ? [
            {
              label: "Amount",
              value: store.money(
                selected.value.amount,
                selected.value.currency,
              ),
            },
            { label: "Priority", value: selected.value.priority },
            { label: "Department", value: selected.value.department },
            {
              label: "Budget",
              value: selected.value.budgetCode || "Unassigned",
            },
            {
              label: "Approver",
              value: store.user(selected.value.approverId)?.name || "—",
            },
            { label: "Needed by", value: store.date(selected.value.dueDate) },
          ]
        : [],
    );
    const simpleStatus = (status) =>
      status === "RFQ in progress" ? "Quotes in progress" : status;
    const format = (item, key) =>
      key === "amount"
        ? store.money(item.amount, item.currency)
        : key === "dueDate"
          ? store.date(item.dueDate)
          : key === "status"
            ? simpleStatus(item.status)
            : (item[key] ?? "—");
    const linkFor = (item, key) =>
      ["id", "title"].includes(key)
        ? `/procurement/queue?request=${item.id}`
        : null;
    const updateCell = ({ id, key, value }) => {
      const item = store.purchaseRequest(id);
      if (
        !item ||
        (store.currentUser.value.type !== "Admin" &&
          item.ownerId !== store.currentUser.value.id)
      )
        return store.notice("Request update denied", "fa-shield-halved");
      if (key === "amount") {
        value = Number(value);
        if (!Number.isFinite(value) || value <= 0) return;
      }
      item[key] =
        typeof value === "string"
          ? window.WebCommon.sanitizeText(value, 500)
          : value;
      store.procurementEvent(item, "Field updated", key, "info");
    };
    const statusClass = (status) =>
      ({
        Draft:
          "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200",
        "Pending approval":
          "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
        Approved:
          "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
        "RFQ in progress":
          "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
        Rejected:
          "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
      })[status] || "bg-sky-50 text-sky-700";
    const closeForm = () => {
      draftEnabled = false;
      draftStore.clear();
      formOpen.value = false;
      draft.value = freshDraft();
      router.replace({
        path: "/procurement/queue",
        query: route.query.request ? { request: route.query.request } : {},
      });
    };
    const saveRequest = () => {
      const data = draft.value,
        amount = Number(data.amount),
        quantity = Number(data.quantity),
        unitPrice = Number(data.unitPrice),
        title = window.WebCommon.sanitizeText(data.title, 160).trim(),
        department = window.WebCommon.sanitizeText(data.department, 80).trim(),
        description = window.WebCommon.sanitizeText(
          data.itemDescription,
          300,
        ).trim(),
        dueDate = new Date(data.dueDate + "T18:00:00Z");
      if (
        !(store.isBuyer.value || store.isAdmin.value || ["Client", "Admin"].includes(store.currentUser.value.type)) ||
        !title ||
        !department ||
        !description ||
        !["Low", "Medium", "High"].includes(data.priority) ||
        ![
          "Technology",
          "Operations",
          "Packaging",
          "Services",
          "Logistics",
        ].includes(data.category) ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        !Number.isFinite(unitPrice) ||
        unitPrice <= 0 ||
        Number.isNaN(dueDate.getTime())
      )
        return store.notice(
          "Complete every required request field",
          "fa-triangle-exclamation",
        );
      const id = "PR-" + String(2410 + store.state.purchaseRequests.length),
        request = {
          id,
          title,
          requesterId: store.currentUser.value.id,
          department,
          amount,
          currency: "USD",
          status: "Draft",
          approverId: "user-admin-admin",
          ownerId: store.currentUser.value.id,
          priority: data.priority,
          category: data.category,
          dueDate: dueDate.toISOString(),
          budgetCode: window.WebCommon.sanitizeText(data.budgetCode, 30).trim(),
          notes: window.WebCommon.sanitizeText(data.notes, 2000).trim(),
          nextAction: "Submit for approval",
          items: [
            {
              id: window.ProcurementCommon.uid("pr-line"),
              description,
              quantity,
              unitPrice,
            },
          ],
          audit: [],
        };
      store.state.purchaseRequests.unshift(request);
      store.procurementEvent(
        request,
        "Request created",
        "Draft saved",
        "success",
      );
      store.notice("Purchase request created");
      draftEnabled = false;
      draftStore.clear();
      formOpen.value = false;
      draft.value = freshDraft();
      router.replace(`/procurement/queue?request=${request.id}`);
    };
    const submitRequest = () => {
      if (!canOwn.value || selected.value.status !== "Draft")
        return store.notice("Request submission denied", "fa-shield-halved");
      store.procurementTransition(
        selected.value,
        "Pending approval",
        "Submitted to " +
          (store.user(selected.value.approverId)?.name || "approver"),
      );
      selected.value.nextAction = "Approval decision";
    };
    const approve = () => {
      if (!canApprove.value || selected.value.status !== "Pending approval")
        return store.notice("Approval denied", "fa-shield-halved");
      store.procurementTransition(
        selected.value,
        "Approved",
        "Budget and policy checks passed",
      );
      selected.value.nextAction = "Request quotes";
      store.addNotification({
        userId: selected.value.requesterId,
        title: "Request approved",
        text: `${selected.value.id} is ready for quotes.`,
        link: `/procurement/queue?request=${selected.value.id}`,
        icon: "fa-circle-check",
      });
    };
    const reject = async () => {
      if (!canApprove.value)
        return store.notice("Rejection denied", "fa-shield-halved");
      if (
        await store.confirm({
          title: "Reject request?",
          message:
            "The request will remain traceable and can be revised before resubmission.",
          confirmText: "Reject",
          danger: true,
        })
      ) {
        store.procurementTransition(
          selected.value,
          "Rejected",
          "Decision recorded by " + store.currentUser.value.name,
        );
        selected.value.nextAction = "Revise request";
      }
    };
    const requestInfo = () => {
      if (!canApprove.value)
        return store.notice("Action denied", "fa-shield-halved");
      selected.value.nextAction = "Requester clarification";
      store.procurementEvent(
        selected.value,
        "Information requested",
        "Business justification needs more detail",
        "warning",
      );
      store.notice("Clarification requested", "fa-comment-dots");
    };
    const createRfx = () => {
      const request = selected.value;
      if (
        !request ||
        !canOwn.value ||
        request.status !== "Approved" ||
        request.sourcingEventId ||
        !request.items?.length ||
        request.items.some(
          (item) =>
            !item.description ||
            !Number.isFinite(Number(item.quantity)) ||
            Number(item.quantity) <= 0 ||
            !Number.isFinite(Number(item.unitPrice)) ||
            Number(item.unitPrice) < 0,
        )
      )
        return store.notice(
          "Quote request creation denied or incomplete",
          "fa-shield-halved",
        );
      const event = {
        id:
          "RFQ-" +
          new Date().getFullYear() +
          "-" +
          String(100 + store.state.sourcingEvents.length),
        title: window.WebCommon.sanitizeText(request.title, 160).trim(),
        type: "RFQ",
        status: "Draft",
        requestId: request.id,
        projectId: request.projectId || null,
        ownerId: store.currentUser.value.id,
        budget: Number(request.amount),
        currency: request.currency,
        round: 1,
        deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
        visibility: "Private",
        autoExtend: false,
        publishedAt: null,
        invitedSupplierIds: [],
        messagesOpen: 0,
        savingsTarget: 8,
        awardReason: "",
        awardedSupplierId: null,
        weights: { price: 40, quality: 25, delivery: 15, risk: 15, esg: 5 },
        lots: request.items.map((item) => ({
          id: window.ProcurementCommon.uid("lot"),
          description: window.WebCommon.sanitizeText(
            item.description,
            300,
          ).trim(),
          quantity: Number(item.quantity),
          unit: "unit",
          ceiling: Number(item.unitPrice),
        })),
        quotes: [],
        files: [],
        audit: [],
      };
      store.state.sourcingEvents.unshift(event);
      request.sourcingEventId = event.id;
      store.procurementTransition(
        request,
        "RFQ in progress",
        event.id + " created",
      );
      store.procurementEvent(
        event,
        "Quote round created",
        "From " + request.id,
        "success",
      );
      router.push(`/procurement/sourcing?event=${event.id}`);
    };
    const removeRequest = async (item) => {
      const owned =
        item &&
        (store.currentUser.value.type === "Admin" ||
          item.ownerId === store.currentUser.value.id);
      if (!owned || item.status !== "Draft")
        return store.notice(
          "Only your own draft requests can be deleted",
          "fa-shield-halved",
        );
      if (
        await store.confirm({
          title: "Delete draft request?",
          message: "Only draft requests can be deleted.",
          confirmText: "Delete",
          danger: true,
        })
      ) {
        const index = store.state.purchaseRequests.findIndex(
          (row) => row.id === item.id,
        );
        if (index >= 0) store.state.purchaseRequests.splice(index, 1);
        router.replace("/procurement/queue");
      }
    };
    const archiveRequests = (ids) => {
      let count = 0;
      ids.slice(0, 100).forEach((id) => {
        const item = store.purchaseRequest(id),
          owned =
            item &&
            (store.currentUser.value.type === "Admin" ||
              item.ownerId === store.currentUser.value.id);
        if (owned) {
          item.archived = true;
          count++;
          store.procurementEvent(item, "Archived", "Removed from active queue");
        }
      });
      store.notice(
        count
          ? `${count} requests archived`
          : "No requests were authorized for archive",
        count ? "fa-box-archive" : "fa-shield-halved",
      );
    };
    watch(
      () => route.query.new,
      (value) => {
        if (value === "1") {
          draftEnabled = true;
          formOpen.value = true;
        }
      },
    );
    watch(
      selected,
      (item) => {
        if (!item || route.query.new === "1" || route.query.request === item.id)
          return;
        router.replace({
          path: "/procurement/queue",
          query: window.WebCommon.mergeRouteQuery(route.query, {
            request: item.id,
          }),
        });
      },
      { immediate: true },
    );
    return {
      store,
      columns,
      selected,
      canOwn,
      canApprove,
      metrics,
      detailMetrics,
      simpleStatus,
      format,
      linkFor,
      updateCell,
      statusClass,
      formOpen,
      draft,
      draftRecovered,
      closeForm,
      saveRequest,
      submitRequest,
      approve,
      reject,
      requestInfo,
      createRfx,
      removeRequest,
      archiveRequests,
    };
  },
};
</script>
