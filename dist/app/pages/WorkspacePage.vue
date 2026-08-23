<template>
  <section class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="premium-title mt-1 text-3xl font-bold">{{ config.title }}</h1>
        <p class="mt-2 text-slate-500">{{ config.copy }}</p>
      </div>
      <button v-if="config.action && config.action.mode === 'invoice'" class="btn-brand" @click="openNew">
        <i class="fa-solid fa-plus mr-2"></i>{{ config.action.label }}
      </button>
      <RouterLink v-else-if="config.action" :to="config.action.to" class="btn-brand">
        <i class="fa-solid fa-plus mr-2"></i>{{ config.action.label }}
      </RouterLink>
    </div>

    <!-- Messages Workspace -->
    <WorkspaceMessagesView
      v-if="kind === 'messages'"
      :conversations="conversations"
      :active-conversation="activeConversation"
      :selected="selected"
      :conversation-title="conversationTitle"
      :context-label="conversationContextLabel"
      :format-date="store.date"
      @select-conversation="selectConversation"
    />

    <!-- Generic Data Workspace -->
    <DataTable
      v-else
      :items="items"
      :columns="tableColumns"
      :title="config.title"
      :table-id="`workspace-${kind}`"
      :group-by="config.groupBy"
      :initial-views="config.initialViews"
      :users="freelancers"
      :format="display"
      :link-for="linkFor"
      @update-cell="updateCell"
      @edit="openItem"
      @delete="deleteItem"
      @archive="archiveItems"
    />

    <!-- Invoice Creation Modal -->
    <WorkspaceNewInvoiceModal :open="newInvoiceOpen" :draft="invoiceDraft" @close="newInvoiceOpen = false" @create="createInvoice" />
  </section>
</template>
<script>
const text = { type: "text" }, number = { type: "number" }, tags = { type: "tags" }, select = (options) => ({ type: "select", options });
const configs = {
  clients: { title: "Clients", copy: "Companies and individual buyers registered on the platform.", groupBy: "location", columns: [{ key: "name", label: "Client", edit: text }, { key: "company", label: "Company", edit: text }, { key: "location", label: "Location", edit: text }, { key: "totalSpend", label: "Total spend", edit: number }] },
  suppliers: { title: "Suppliers", copy: "Vetted suppliers and providers across all categories.", groupBy: "category", columns: [{ key: "name", label: "Supplier", edit: text }, { key: "category", label: "Category", edit: text }, { key: "score", label: "Score", edit: number }, { key: "risk", label: "Risk", edit: number }, { key: "status", label: "Status", edit: select(["Active", "Preferred", "In review"]) }] },
  leads: { title: "Commercial leads", copy: "Track and convert pipeline opportunities.", groupBy: "status", columns: [{ key: "title", label: "Lead", edit: text }, { key: "clientName", label: "Company", edit: text }, { key: "status", label: "Status", edit: select(["New", "Contacted", "Proposal Sent", "Negotiation", "Won", "Lost"]) }, { key: "value", label: "Estimated value", edit: number }, { key: "assignedTo", label: "Owner", edit: { type: "users" } }] },
  projects: {
    title: "Projects",
    copy: "Active project delivery, milestones and contracts.",
    action: { to: "/post-job/new", label: "Post project" },
    groupBy: "status",
    initialViews: [
      {
        id: "demo-active-delivery",
        name: "Active delivery",
        rules: [{ field: "status", op: "eq", value: "IN_PROGRESS" }],
        sortField: "budget",
        sortDirection: "desc",
        groupBy: "status",
      },
    ],
    columns: [
      { key: "title", label: "Project", edit: text },
      { key: "category", label: "Category", edit: text },
      { key: "status", label: "Status", edit: select(["DRAFT", "OPEN", "IN_PROGRESS", "COMPLETED"]) },
      { key: "budget", label: "Budget", edit: number },
      { key: "progress", label: "Progress", edit: number },
      { key: "operationalScope", label: "Applies to" },
    ],
  },
  invoices: { title: "Invoices", copy: "Issued and received invoices with fiscal status.", action: { mode: "invoice", label: "Create invoice" }, groupBy: "status", columns: [{ key: "id", label: "Invoice #" }, { key: "projectTitle", label: "Project", edit: text }, { key: "status", label: "Status", edit: select(["DRAFT", "ISSUED", "PAID", "CANCELLED"]) }, { key: "total", label: "Amount", edit: number }, { key: "dueDate", label: "Due date", edit: { type: "date" } }, { key: "operationalScope", label: "Applies to" }] },
  estimates: { title: "Estimates & proposals", copy: "Commercial proposals sent to clients.", groupBy: "status", columns: [{ key: "title", label: "Estimate", edit: text }, { key: "status", label: "Status", edit: select(["Draft", "Sent", "Accepted", "Declined"]) }, { key: "total", label: "Amount", edit: number }, { key: "validUntil", label: "Valid until", edit: { type: "date" } }] },
  payments: { title: "Payment receipts", copy: "Confirmed financial transactions and escrow releases.", groupBy: "status", columns: [{ key: "id", label: "Receipt #" }, { key: "invoiceId", label: "Invoice" }, { key: "amount", label: "Amount", edit: number }, { key: "paidAt", label: "Paid date" }, { key: "method", label: "Method", edit: select(["Escrow Release", "Bank Transfer", "Credit Card", "SPEI"]) }] },
  products: { title: "Product catalog", copy: "Standardized products and goods for procurement.", groupBy: "category", columns: [{ key: "name", label: "Product", edit: text }, { key: "sku", label: "SKU", edit: text }, { key: "category", label: "Category", edit: text }, { key: "price", label: "Unit price", edit: number }, { key: "stock", label: "Stock", edit: number }] },
  expenses: { title: "Project expenses", copy: "Track billable and operating expenses per project.", groupBy: "category", columns: [{ key: "title", label: "Expense", edit: text }, { key: "projectId", label: "Project" }, { key: "category", label: "Category", edit: text }, { key: "amount", label: "Amount", edit: number }, { key: "billable", label: "Billable", edit: select(["Yes", "No"]) }] },
  saved: { title: "Saved jobs", copy: "Opportunities bookmarked for later proposal submission.", groupBy: "category", columns: [{ key: "title", label: "Job" }, { key: "category", label: "Category" }, { key: "budget", label: "Budget" }, { key: "dueDate", label: "Due date" }] },
  issuers: { title: "Fiscal issuers", copy: "Administration available to the Admin role.", groupBy: "regime", columns: [{ key: "name", label: "Issuer", edit: text }, { key: "rfc", label: "RFC", edit: text }, { key: "regime", label: "Regime", edit: select(["601", "612", "626"]) }, { key: "branches", label: "Branches", edit: tags }] },
};

const { inject, computed, ref, watch } = Vue;
const { useRoute, useRouter } = VueRouter;
const load = (p) => Vue.defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(p, window.sfcOptions));
const DataTable = load("./app/components/DataTable.vue?v=53");
const WorkspaceMessagesView = load("./app/pages/workspace/WorkspaceMessagesView.vue?v=1");
const WorkspaceNewInvoiceModal = load("./app/pages/workspace/WorkspaceNewInvoiceModal.vue?v=1");

export default {
  components: { DataTable, WorkspaceMessagesView, WorkspaceNewInvoiceModal },
  setup() {
    const store = inject("store"), route = useRoute(), router = useRouter();
    const kind = computed(() => route.meta.kind);
    const user = computed(() => store.currentUser.value);
    const isAdmin = computed(() => user.value.type === "Admin");
    const canCreateInvoice = computed(() => ["Admin", "Freelancer"].includes(user.value.type));

    const config = computed(() => {
      const base = configs[kind.value] || { title: "Messages", copy: "Project conversations.", columns: [] };
      const canUseAction = base.action?.mode === "invoice" ? canCreateInvoice.value : ["Admin", "Client"].includes(user.value.type);
      return canUseAction ? base : { ...base, action: null };
    });

    const selected = ref(store.state.conversations[0]?.id), newInvoiceOpen = ref(false);
    const invoiceDraft = ref({ projectTitle: "", total: null, currency: "USD", dueDate: "" });

    const operationalJobs = computed(() => store.scopedRecords(store.state.jobs));
    const operationalInvoices = computed(() => store.scopedRecords(store.state.invoices));
    const accessibleJobs = computed(() => {
      if (isAdmin.value) return operationalJobs.value;
      if (user.value.type === "Client") return operationalJobs.value.filter((j) => j.clientId === user.value.id);
      const contractJobs = new Set(store.scopedRecords(store.state.contracts).filter((c) => c.providerId === user.value.id).map((c) => c.sourceId));
      return operationalJobs.value.filter((j) => contractJobs.has(j.id) || (j.proposals || []).some((p) => p.freelancerId === user.value.id));
    });

    const accessibleInvoices = computed(() => isAdmin.value ? operationalInvoices.value : operationalInvoices.value.filter((i) => i.clientId === user.value.id || i.providerId === user.value.id));
    const clientIds = computed(() => new Set(accessibleJobs.value.map((j) => j.clientId)));

    const collections = () => ({
      clients: store.state.users, suppliers: store.state.suppliers, leads: store.state.leads,
      projects: operationalJobs.value, invoices: operationalInvoices.value, estimates: store.scopedRecords(store.state.estimates),
      payments: store.scopedRecords(store.state.paymentReceipts), products: store.state.products, expenses: store.scopedRecords(store.state.expenses),
      saved: operationalJobs.value, issuers: store.state.issuers,
    });

    const items = computed(() => {
      switch (kind.value) {
        case "clients": return store.state.users.filter((i) => i.type === "Client" && (isAdmin.value || i.id === user.value.id || clientIds.value.has(i.id)));
        case "suppliers":
        case "products": return ["Admin", "Client"].includes(user.value.type) ? collections()[kind.value] : [];
        case "expenses": return isAdmin.value ? collections().expenses : user.value.type === "Client" ? collections().expenses.filter((i) => accessibleJobs.value.some((j) => j.id === i.projectId)) : [];
        case "leads": return isAdmin.value || user.value.type === "Client" ? store.state.leads : store.state.leads.filter((i) => (i.assignedTo || []).includes(user.value.id));
        case "projects": return accessibleJobs.value;
        case "invoices": return accessibleInvoices.value;
        case "estimates": return isAdmin.value ? collections().estimates : collections().estimates.filter((i) => i.companyId === user.value.id || i.createdById === user.value.id);
        case "payments": return isAdmin.value ? collections().payments : collections().payments.filter((i) => i.receiverId === user.value.id || accessibleInvoices.value.some((inv) => inv.id === i.invoiceId));
        case "saved": return operationalJobs.value.filter((i) => i.status === "OPEN" && store.state.savedJobIds?.includes(i.id));
        case "issuers": return isAdmin.value ? store.state.issuers : [];
        default: return [];
      }
    });

    const canEditWorkspace = computed(() => {
      if (isAdmin.value) return !["saved"].includes(kind.value);
      if (user.value.type === "Client") return ["suppliers", "leads", "projects", "products", "expenses"].includes(kind.value);
      return ["leads", "estimates", "invoices"].includes(kind.value);
    });

    const tableColumns = computed(() => canEditWorkspace.value ? config.value.columns : config.value.columns.map(({ edit, ...col }) => col));

    const canMutate = (item) => {
      if (!item) return false;
      if (isAdmin.value) return kind.value !== "saved";
      if (user.value.type === "Client") {
        if (kind.value === "projects") return item.clientId === user.value.id;
        if (kind.value === "leads" || ["suppliers", "products"].includes(kind.value)) return true;
        if (kind.value === "expenses") return accessibleJobs.value.some((j) => j.id === item.projectId);
        return false;
      }
      if (kind.value === "leads") return (item.assignedTo || []).includes(user.value.id);
      if (kind.value === "estimates") return item.createdById === user.value.id;
      if (kind.value === "invoices") return item.providerId === user.value.id;
      return false;
    };

    const freelancers = computed(() => store.state.users.filter((i) => i.type === "Freelancer"));
    const conversations = computed(() => store.state.conversations.filter((i) => i.participants.includes(user.value.id)).slice().sort((a, b) => new Date(b.messages.at(-1)?.at || 0) - new Date(a.messages.at(-1)?.at || 0)));
    const activeConversation = computed(() => conversations.value.find((i) => i.id === selected.value) || conversations.value[0]);

    const selectConversation = (conv) => {
      if (!conversations.value.includes(conv)) return;
      selected.value = conv.id;
      router.push({ path: "/messages", query: window.WebCommon.mergeRouteQuery(route.query, { conversation: conv.id }) });
    };

    watch([kind, conversations, () => route.query.conversation], () => {
      if (kind.value !== "messages") return;
      const conv = conversations.value.find((e) => e.id === route.query.conversation) || conversations.value[0];
      selected.value = conv?.id;
      if (conv && route.query.conversation !== conv.id) router.replace({ path: "/messages", query: window.WebCommon.mergeRouteQuery(route.query, { conversation: conv.id }) });
    }, { immediate: true });

    const jobName = (id) => store.job(id)?.title || "Conversation";
    const conversationTitle = (conversation) => {
      if (conversation?.contextType === "project") return jobName(conversation.contextId);
      if (conversation?.contextType === "sourcing")
        return store.sourcingEvent(conversation.contextId)?.title || conversation.contextId;
      if (conversation?.contextType === "auction")
        return store.state.auctions.find((item) => item.id === conversation.contextId)?.title || conversation.contextId;
      return conversation?.subject || "Conversation";
    };
    const conversationContextLabel = (conversation) =>
      ({ project: "Project", sourcing: "RFX", auction: "Auction" })[
        conversation?.contextType
      ] || "Messages";

    const display = (item, key) => {
      const v = item?.[key];
      if (["totalSpend", "value", "budget", "total", "amount", "rate"].includes(key)) return store.money(v, item.currency);
      if (key === "billable") return v === true || v === "true" ? "Yes" : "No";
      if (key === "projectId") return store.job(v)?.title || "—";
      if (key === "invoiceId") { const inv = store.invoice(v); return inv ? `${inv.id} · ${inv.projectTitle}` : "—"; }
      if (key === "assignedTo") return Array.isArray(v) ? v.map((id) => store.user(id)?.name || id).join(", ") : "—";
      if (key === "branches") return Array.isArray(v) ? v.join(", ") : "—";
      if (["paidAt", "dueDate", "validUntil"].includes(key) && v) return store.date(v);
      if (key === "operationalScope") return store.scopeLabel(item);
      return v ?? "—";
    };

    const linkFor = (item, key) => {
      if (kind.value === "clients" && key === "name") return `/profile/${item.id}`;
      if (kind.value === "suppliers" && key === "name") return `/suppliers?supplier=${item.id}`;
      if (kind.value === "projects" && key === "title") return `/project/${item.id}`;
      if (kind.value === "invoices" && (key === "id" || key === "projectTitle")) return `/invoices/${item.id}`;
      if (kind.value === "saved" && key === "title") return `/job/${item.id}`;
      return null;
    };

    const updateCell = ({ id, key, value }) => {
      const item = items.value.find((e) => e.id === id);
      if (!canMutate(item)) return store.notice("Field modification denied", "fa-shield-halved");
      if (["budget", "total", "amount", "value", "price", "stock", "score", "risk", "progress", "totalSpend"].includes(key)) {
        const max = ["score", "risk", "progress"].includes(key) ? 100 : undefined;
        value = Number(value);
        if (!window.WebCommon.isSafeAmount(value, 0, max))
          return store.notice("Enter a value within the permitted range", "fa-triangle-exclamation");
      }
      if (key === "assignedTo" && typeof value === "string") value = value.split(",").map((s) => s.trim()).filter(Boolean);
      if (key === "branches" && typeof value === "string") value = value.split(",").map((s) => s.trim()).filter(Boolean);
      if (typeof value === "string") value = window.WebCommon.sanitizeText(value, 300).trim();
      item[key] = value;
      store.notice("Item updated");
    };

    const openItem = (item) => {
      const dest = linkFor(item, kind.value === "invoices" ? "id" : kind.value === "clients" ? "name" : "title");
      if (dest) router.push(dest);
    };

    const deleteItem = async (item) => {
      if (!canMutate(item)) return store.notice("Deletion denied", "fa-shield-halved");
      if (await store.confirm({ title: "Delete entry?", message: "This operation cannot be undone.", confirmText: "Delete", danger: true })) {
        item.archived = true;
        store.notice("Item removed");
      }
    };

    const archiveItems = (ids) => {
      let c = 0;
      ids.slice(0, 50).forEach((id) => {
        const item = items.value.find((e) => e.id === id);
        if (canMutate(item)) { item.archived = true; c++; }
      });
      store.notice(`${c} items archived`);
    };

    const openNew = () => {
      if (config.value.action?.mode === "invoice") {
        newInvoiceOpen.value = true;
        router.replace({ path: "/invoices", query: window.WebCommon.mergeRouteQuery(route.query, { new: "invoice" }) });
      }
    };

    watch(() => route.query.new, (v) => { if (v === "invoice") newInvoiceOpen.value = true; }, { immediate: true });
    watch(newInvoiceOpen, (open) => {
      if (!open && route.query.new === "invoice") router.replace({ path: "/invoices", query: window.WebCommon.mergeRouteQuery(route.query, { new: null }) });
    });

    const createInvoice = () => {
      if (!canCreateInvoice.value) return store.notice("Invoice creation denied", "fa-shield-halved");
      const client = store.state.users.find((u) => u.type === "Client") || store.state.users[0];
      const inv = store.scopeRecord({
        id: `INV-${Date.now().toString().slice(-6)}`,
        clientId: client.id, providerId: user.value.id,
        projectTitle: invoiceDraft.value.projectTitle || "Consulting Services",
        total: invoiceDraft.value.total || 1000,
        currency: invoiceDraft.value.currency || "USD",
        status: "ISSUED", dueDate: invoiceDraft.value.dueDate || new Date().toISOString().slice(0, 10),
        items: [{ description: invoiceDraft.value.projectTitle || "Delivery Milestone", amount: invoiceDraft.value.total || 1000 }],
        taxLines: [{ name: "VAT (IVA 16%)", rate: 0.16, amount: (invoiceDraft.value.total || 1000) * 0.16 }],
        fiscalStatus: { isStamped: true, uuid: `FISC-${Date.now().toString().slice(-8)}`, stampDate: new Date().toISOString() },
        subtotal: invoiceDraft.value.total || 1000,
        taxes: (invoiceDraft.value.total || 1000) * 0.16,
      });
      store.state.invoices.unshift(inv);
      newInvoiceOpen.value = false;
      store.notice("Invoice created successfully");
      router.push(`/invoices/${inv.id}`);
    };

    return {
      store, kind, config, items, tableColumns, display, linkFor, updateCell, openItem, deleteItem, archiveItems,
      conversations, activeConversation, selected, selectConversation, jobName, conversationTitle, conversationContextLabel,
      newInvoiceOpen, invoiceDraft, openNew, createInvoice, freelancers,
    };
  },
};
</script>
