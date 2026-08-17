<template>
  <section class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="premium-title mt-1 text-3xl font-bold">
          {{ config.title }}
        </h1>
        <p class="mt-2 text-slate-500">{{ config.copy }}</p>
      </div>
      <button
        v-if="config.action && config.action.mode === 'invoice'"
        class="btn-brand"
        @click="openNew"
      >
        <i class="fa-solid fa-plus mr-2"></i>{{ config.action.label }}</button
      ><RouterLink
        v-else-if="config.action"
        :to="config.action.to"
        class="btn-brand"
        ><i class="fa-solid fa-plus mr-2"></i
        >{{ config.action.label }}</RouterLink
      >
    </div>
    <div
      v-if="kind === 'messages'"
      class="grid min-h-[60vh] gap-4 lg:grid-cols-[.8fr_1.2fr]"
    >
      <div
        class="panel overflow-hidden divide-y divide-slate-100 dark:divide-slate-700"
      >
        <div class="border-b border-slate-100 px-4 py-4 dark:border-slate-700">
          <h2 class="font-bold">Messages</h2>
          <p class="mt-1 text-xs text-slate-500">Project conversations</p>
        </div>
        <button
          v-for="conversation in conversations"
          :key="conversation.id"
          class="w-full border-l-2 p-4 text-left transition hover:bg-brand-50"
          :class="
            selected === conversation.id
              ? 'border-brand bg-brand-50 dark:bg-slate-700/40'
              : 'border-transparent'
          "
          @click="selectConversation(conversation)"
        >
          <p class="font-bold">
            {{ otherParticipant(conversation)?.name || "Project team" }}
          </p>
          <p class="mt-1 truncate text-sm text-brand">
            {{ jobName(conversation.jobId) }}
          </p>
          <p class="mt-1 truncate text-xs text-slate-500">
            {{
              conversation.messages.at(-1)?.text ||
              "No messages yet — start the conversation."
            }}
          </p>
        </button>
      </div>
      <div class="panel flex min-h-[60vh] flex-col overflow-hidden">
        <template v-if="activeConversation"
          ><div class="border-b border-slate-100 p-5 dark:border-slate-700">
            <div class="flex items-center gap-3">
              <span
                class="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand dark:bg-brand/20"
                >{{
                  otherParticipant(activeConversation)?.avatar || "PT"
                }}</span
              >
              <div>
                <h2 class="font-bold">
                  {{
                    otherParticipant(activeConversation)?.name || "Project team"
                  }}
                </h2>
                <RouterLink
                  :to="`/job/${activeConversation.jobId}`"
                  class="mt-0.5 block text-xs font-semibold text-brand hover:underline"
                  >{{ jobName(activeConversation.jobId) }}</RouterLink
                >
              </div>
            </div>
          </div>
          <div
            class="flex-1 space-y-3 overflow-auto bg-slate-50 p-5 dark:bg-slate-800/40"
          >
            <div
              v-for="message in activeConversation.messages"
              :key="message.id"
              class="max-w-[80%] rounded-xl p-3 shadow-sm"
              :class="
                message.senderId === store.currentUser.value.id
                  ? 'ml-auto bg-brand text-white'
                  : 'bg-white dark:bg-slate-700'
              "
            >
              <p>{{ message.text }}</p>
              <small class="mt-1 block opacity-70">{{
                store.date(message.at)
              }}</small>
            </div>
          </div>
          <form
            class="flex gap-2 border-t border-slate-100 p-4 dark:border-slate-700"
            @submit.prevent="send"
          >
            <input
              v-model="message"
              class="field"
              placeholder="Write a message…"
            /><button class="btn-brand">
              <i class="fa-solid fa-paper-plane"></i>
            </button></form
        ></template>
        <div v-else class="grid flex-1 place-items-center text-slate-500">
          Select a conversation.
        </div>
      </div>
    </div>
    <div
      v-else-if="kind === 'talent'"
      class="grid gap-6 md:grid-cols-2 xl:grid-cols-4"
    >
      <RouterLink
        v-for="person in freelancers"
        :key="person.id"
        :to="`/profile/${person.id}`"
        class="premium-card rounded-xl p-5"
        ><div class="flex items-center gap-3">
          <span
            class="grid h-12 w-12 place-items-center rounded-full bg-slate-200 font-800 text-slate-600 dark:bg-slate-700"
            >{{ person.avatar }}</span
          >
          <div>
            <h2 class="font-bold">{{ person.name }}</h2>
            <p class="text-sm text-slate-500">{{ person.headline }}</p>
          </div>
        </div>
        <div class="mt-4 flex flex-wrap gap-1">
          <span
            v-for="skill in person.skills"
            :key="skill"
            class="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-700"
            >{{ skill }}</span
          >
        </div></RouterLink
      >
    </div>
    <div v-else-if="kind === 'gigs'" class="grid gap-6 md:grid-cols-2">
      <RouterLink
        v-for="gig in store.state.gigs"
        :key="gig.id"
        :to="`/gig/${gig.id}`"
        class="premium-card rounded-xl p-6"
        ><p class="text-sm font-bold text-brand">{{ gig.category }}</p>
        <h2 class="mt-2 text-xl font-bold">{{ gig.title }}</h2>
        <p class="mt-2 text-slate-500">{{ gig.description }}</p>
        <div
          class="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-700"
        >
          <span class="text-sm text-slate-500"
            >{{ gig.deliveryDays }} days · {{ gig.revisions }} revisions</span
          ><b>{{ store.money(gig.price) }}</b>
        </div></RouterLink
      >
    </div>
    <DataTable
      v-else
      :key="`workspace-${kind}`"
      :items="items"
      :columns="tableColumns"
      :title="config.title"
      :table-id="`workspace-${kind}`"
      :format="display"
      :link-for="linkFor"
      :users="store.state.users"
      :group-by="config.groupBy"
      :initial-views="config.savedViews || []"
      :editable="canEditWorkspace"
      @update-cell="updateCell"
      @delete="deleteRow"
    />
    <Teleport to="body"
      ><Transition name="toast"
        ><div
          v-if="newInvoiceOpen"
          class="fixed inset-0 z-60 grid place-items-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="New invoice"
        >
          <button
            class="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            aria-label="Close new invoice"
            @click="closeNew"
          ></button>
          <form
            class="glass relative w-full max-w-lg rounded-2xl p-6 shadow-2xl"
            @submit.prevent="createInvoice"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <p
                  class="premium-kicker text-xs font-bold uppercase text-brand"
                >
                  CFDI 4.0
                </p>
                <h2 class="premium-title mt-2 text-2xl font-800">New</h2>
                <p class="mt-2 text-sm text-slate-500">
                  Create a record without leaving this table.
                </p>
              </div>
              <button
                type="button"
                class="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
                aria-label="Close"
                @click="closeNew"
              >
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div class="mt-6 space-y-4">
              <label class="block text-sm font-semibold"
                >Concept or project<input
                  v-model.trim="invoiceDraft.projectTitle"
                  class="field mt-2"
                  required
                  autofocus
                  placeholder="Project delivery"
              /></label>
              <div class="grid gap-4 sm:grid-cols-2">
                <label class="block text-sm font-semibold"
                  >Total<input
                    v-model.number="invoiceDraft.total"
                    class="field mt-2"
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    placeholder="0.00" /></label
                ><label class="block text-sm font-semibold"
                  >Currency<select
                    v-model="invoiceDraft.currency"
                    class="field mt-2"
                  >
                    <option>USD</option>
                    <option>MXN</option>
                  </select></label
                >
              </div>
              <label class="block text-sm font-semibold"
                >Due date<input
                  v-model="invoiceDraft.dueDate"
                  class="field mt-2"
                  type="date"
              /></label>
            </div>
            <div
              class="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-700"
            >
              <button type="button" class="btn-muted" @click="closeNew">
                Cancel</button
              ><button class="btn-brand">
                <i class="fa-solid fa-check mr-2"></i>Create record
              </button>
            </div>
          </form>
        </div></Transition
      ></Teleport
    >
  </section>
</template>
<script>
const { inject, ref, computed, watch } = Vue;
const { useRoute, useRouter } = VueRouter;
const load = (p) =>
  Vue.defineAsyncComponent(() =>
    window["vue3-sfc-loader"].loadModule(p, window.sfcOptions),
  );
const text = { type: "text" },
  number = { type: "number" },
  email = { type: "email" },
  date = { type: "date" },
  tags = { type: "tags" },
  slider = { type: "slider" },
  rating = { type: "rating" },
  user = { type: "user" },
  multi = { type: "multi-user" };
const select = (options) => ({
  type: "select",
  options: options.map((value) => ({
    value,
    label: value.replaceAll("_", " "),
  })),
});
const configs = {
  clients: {
    title: "Clients",
    copy: "Companies and contacts that originate projects.",
    action: { label: "Post a job", to: "/post-job/new" },
    groupBy: "location",
    columns: [
      { key: "name", label: "Client", edit: text },
      { key: "email", label: "Email", edit: email },
      { key: "companyName", label: "Company", edit: text },
      { key: "location", label: "Location", edit: text },
    ],
  },
  suppliers: {
    title: "Suppliers",
    copy: "Supplier directory for expenses and purchasing.",
    groupBy: "category",
    columns: [
      { key: "name", label: "Supplier", edit: text },
      {
        key: "category",
        label: "Category",
        edit: select(["Hardware", "Office", "Software", "Services"]),
      },
      { key: "contact", label: "Contact", edit: text },
      { key: "totalSpend", label: "Total spend", edit: number },
      { key: "rating", label: "Rating", edit: rating },
    ],
  },
  leads: {
    title: "Sales pipeline",
    copy: "Prioritized opportunities and assignments.",
    groupBy: "status",
    columns: [
      { key: "contactName", label: "Contact", edit: text },
      { key: "title", label: "Opportunity", edit: text },
      {
        key: "status",
        label: "Stage",
        edit: select(["New", "Qualified", "Proposal", "Won", "Lost"]),
      },
      { key: "value", label: "Value", edit: number },
      { key: "assignedTo", label: "Assigned", edit: multi },
    ],
  },
  projects: {
    title: "Projects",
    copy: "Work, contests and delivery progress.",
    action: { label: "Post a job", to: "/post-job/new" },
    groupBy: "status",
    savedViews: [
      {
        id: "demo-active-delivery",
        name: "Active delivery",
        demo: true,
        default: true,
        query: "",
        filters: {},
        filterRules: [
          {
            id: "demo-status-draft",
            key: "status",
            operator: "not_equals",
            value: "DRAFT",
          },
          {
            id: "demo-status-complete",
            key: "status",
            operator: "not_equals",
            value: "COMPLETED",
          },
        ],
        filterMode: "all",
        activeGroup: "all",
        sortState: { key: "progress", desc: true },
        visibility: {
          title: true,
          category: true,
          status: true,
          skills: false,
          progress: true,
          budget: true,
        },
        order: ["status", "title", "progress", "budget", "category", "skills"],
        widths: {
          status: 140,
          title: 280,
          progress: 120,
          budget: 140,
          category: 150,
        },
        mode: "table",
        pageSize: 10,
      },
    ],
    columns: [
      { key: "title", label: "Project", edit: text },
      {
        key: "category",
        label: "Category",
        edit: select(["Development", "Design", "Marketing"]),
      },
      {
        key: "status",
        label: "Status",
        edit: select(["OPEN", "IN_PROGRESS", "DRAFT", "COMPLETED"]),
      },
      { key: "skills", label: "Skills", edit: tags },
      { key: "progress", label: "Progress", edit: slider },
      { key: "budget", label: "Budget", edit: number },
    ],
  },
  invoices: {
    title: "CFDI invoices",
    copy: "Documents, fiscal status and related payments.",
    action: { label: "New", mode: "invoice" },
    groupBy: "paymentStatus",
    columns: [
      { key: "folio", label: "Folio", edit: text },
      { key: "projectTitle", label: "Project", edit: text },
      {
        key: "paymentStatus",
        label: "Payment",
        edit: select(["Paid", "Unpaid", "Overdue"]),
      },
      { key: "total", label: "Total", edit: number },
      { key: "issuedDate", label: "Issued", edit: date },
      { key: "providerId", label: "Provider", edit: user },
    ],
  },
  estimates: {
    title: "Estimates",
    copy: "Active commercial proposals.",
    groupBy: "status",
    columns: [
      { key: "id", label: "ID", edit: text },
      {
        key: "status",
        label: "Status",
        edit: select(["Pending", "Accepted", "Rejected"]),
      },
      { key: "amount", label: "Amount", edit: number },
    ],
  },
  payments: {
    title: "Payment complements",
    copy: "Payments applied to active invoices.",
    groupBy: "status",
    columns: [
      { key: "folio", label: "Folio", edit: text },
      { key: "invoiceId", label: "Invoice", edit: text },
      {
        key: "status",
        label: "Status",
        edit: select(["Vigente", "Cancelado"]),
      },
      { key: "amount", label: "Amount", edit: number },
      { key: "date", label: "Date", edit: date },
    ],
  },
  products: {
    title: "Products & services",
    copy: "Reusable billing concepts.",
    groupBy: "category",
    columns: [
      { key: "description", label: "Description", edit: text },
      { key: "category", label: "Category", edit: text },
      { key: "unit", label: "Unit", edit: select(["Hour", "Each", "Service"]) },
      { key: "rate", label: "Rate", edit: number },
    ],
  },
  expenses: {
    title: "Expenses",
    copy: "Costs tied to projects and operations.",
    groupBy: "status",
    columns: [
      { key: "description", label: "Description", edit: text },
      {
        key: "status",
        label: "Status",
        edit: select(["Pending", "Approved", "Invoiced"]),
      },
      { key: "billable", label: "Billable", edit: select(["true", "false"]) },
      { key: "amount", label: "Amount", edit: number },
    ],
  },
  talent: {
    title: "Find talent",
    copy: "Discover verified independent professionals and agency members.",
  },
  gigs: {
    title: "Service marketplace",
    copy: "Compact, fixed-scope offers ready to request.",
  },
  saved: {
    title: "Saved jobs",
    copy: "Open opportunities saved for later.",
    groupBy: "category",
    columns: [
      { key: "title", label: "Project", edit: text },
      {
        key: "category",
        label: "Category",
        edit: select(["Development", "Design", "Marketing"]),
      },
      { key: "skills", label: "Skills", edit: tags },
      { key: "budget", label: "Budget", edit: number },
    ],
  },
  issuers: {
    title: "Fiscal issuers",
    copy: "Administration available to the Admin role.",
    groupBy: "regime",
    columns: [
      { key: "name", label: "Issuer", edit: text },
      { key: "rfc", label: "RFC", edit: text },
      { key: "regime", label: "Regime", edit: select(["601", "612", "626"]) },
      { key: "branches", label: "Branches", edit: tags },
    ],
  },
};
export default {
  components: { DataTable: load("./app/components/DataTable.vue?v=50") },
  setup() {
    const store = inject("store"),
      route = useRoute(),
      router = useRouter(),
      kind = computed(() => route.meta.kind);
    const user = computed(() => store.currentUser.value);
    const isAdmin = computed(() => user.value.type === "Admin");
    const canCreateInvoice = computed(() =>
      ["Admin", "Freelancer"].includes(user.value.type),
    );
    const config = computed(() => {
      const base = configs[kind.value] || {
        title: "Messages",
        copy: "Project conversations.",
        columns: [],
      };
      const canUseAction =
        base.action?.mode === "invoice"
          ? canCreateInvoice.value
          : ["Admin", "Client"].includes(user.value.type);
      return canUseAction ? base : { ...base, action: null };
    });
    const selected = ref(store.state.conversations[0]?.id),
      message = ref(""),
      newInvoiceOpen = ref(false);
    const invoiceDraft = ref({
      projectTitle: "",
      total: null,
      currency: "USD",
      dueDate: "",
    });
    const accessibleJobs = computed(() => {
      if (isAdmin.value) return store.state.jobs;
      if (user.value.type === "Client")
        return store.state.jobs.filter((job) => job.clientId === user.value.id);
      const contractJobs = new Set(
        store.state.contracts
          .filter((contract) => contract.providerId === user.value.id)
          .map((contract) => contract.sourceId),
      );
      return store.state.jobs.filter(
        (job) =>
          contractJobs.has(job.id) ||
          (job.proposals || []).some(
            (proposal) => proposal.freelancerId === user.value.id,
          ),
      );
    });
    const accessibleInvoices = computed(() =>
      isAdmin.value
        ? store.state.invoices
        : store.state.invoices.filter(
            (invoice) =>
              invoice.clientId === user.value.id ||
              invoice.providerId === user.value.id,
          ),
    );
    const clientIds = computed(
      () => new Set(accessibleJobs.value.map((job) => job.clientId)),
    );
    const collections = () => ({
      clients: store.state.users,
      suppliers: store.state.suppliers,
      leads: store.state.leads,
      projects: store.state.jobs,
      invoices: store.state.invoices,
      estimates: store.state.estimates,
      payments: store.state.paymentReceipts,
      products: store.state.products,
      expenses: store.state.expenses,
      saved: store.state.jobs,
      issuers: store.state.issuers,
    });
    const items = computed(() => {
      switch (kind.value) {
        case "clients":
          return store.state.users.filter(
            (item) =>
              item.type === "Client" &&
              (isAdmin.value ||
                item.id === user.value.id ||
                clientIds.value.has(item.id)),
          );
        case "suppliers":
        case "products":
          return ["Admin", "Client"].includes(user.value.type)
            ? collections()[kind.value]
            : [];
        case "expenses":
          return isAdmin.value
            ? store.state.expenses
            : user.value.type === "Client"
              ? store.state.expenses.filter((item) =>
                  accessibleJobs.value.some((job) => job.id === item.projectId),
                )
              : [];
        case "leads":
          return isAdmin.value || user.value.type === "Client"
            ? store.state.leads
            : store.state.leads.filter((item) =>
                (item.assignedTo || []).includes(user.value.id),
              );
        case "projects":
          return accessibleJobs.value;
        case "invoices":
          return accessibleInvoices.value;
        case "estimates":
          return isAdmin.value
            ? store.state.estimates
            : store.state.estimates.filter(
                (item) =>
                  item.companyId === user.value.id ||
                  item.createdById === user.value.id,
              );
        case "payments":
          return isAdmin.value
            ? store.state.paymentReceipts
            : store.state.paymentReceipts.filter(
                (item) =>
                  item.receiverId === user.value.id ||
                  accessibleInvoices.value.some(
                    (invoice) => invoice.id === item.invoiceId,
                  ),
              );
        case "saved":
          return store.state.jobs.filter(
            (item) =>
              item.status === "OPEN" &&
              store.state.savedJobIds?.includes(item.id),
          );
        case "issuers":
          return isAdmin.value ? store.state.issuers : [];
        default:
          return [];
      }
    });
    const canEditWorkspace = computed(() => {
      if (isAdmin.value) return !["saved"].includes(kind.value);
      if (user.value.type === "Client")
        return [
          "suppliers",
          "leads",
          "projects",
          "products",
          "expenses",
        ].includes(kind.value);
      return ["leads", "estimates", "invoices"].includes(kind.value);
    });
    const tableColumns = computed(() =>
      canEditWorkspace.value
        ? config.value.columns
        : config.value.columns.map(({ edit, ...column }) => column),
    );
    const canMutate = (item) => {
      if (!item) return false;
      if (isAdmin.value) return kind.value !== "saved";
      if (user.value.type === "Client") {
        if (kind.value === "projects") return item.clientId === user.value.id;
        if (kind.value === "leads") return true;
        if (["suppliers", "products"].includes(kind.value)) return true;
        if (kind.value === "expenses")
          return accessibleJobs.value.some((job) => job.id === item.projectId);
        return false;
      }
      if (kind.value === "leads")
        return (item.assignedTo || []).includes(user.value.id);
      if (kind.value === "estimates") return item.createdById === user.value.id;
      if (kind.value === "invoices") return item.providerId === user.value.id;
      return false;
    };
    const freelancers = computed(() =>
      store.state.users.filter((item) => item.type === "Freelancer"),
    );
    const conversations = computed(() =>
      store.state.conversations
        .filter((item) => item.participants.includes(user.value.id))
        .slice()
        .sort(
          (a, b) =>
            new Date(b.messages.at(-1)?.at || 0) -
            new Date(a.messages.at(-1)?.at || 0),
        ),
    );
    const activeConversation = computed(
      () =>
        conversations.value.find((item) => item.id === selected.value) ||
        conversations.value[0],
    );
    const selectConversation = (conversation) => {
      if (!conversations.value.includes(conversation)) return;
      selected.value = conversation.id;
      router.push({
        path: "/messages",
        query: window.WebCommon.mergeRouteQuery(route.query, {
          conversation: conversation.id,
        }),
      });
    };
    watch(
      [kind, conversations, () => route.query.conversation],
      () => {
        if (kind.value !== "messages") return;
        const conversation =
          conversations.value.find(
            (entry) => entry.id === route.query.conversation,
          ) || conversations.value[0];
        selected.value = conversation?.id;
        if (conversation && route.query.conversation !== conversation.id)
          router.replace({
            path: "/messages",
            query: window.WebCommon.mergeRouteQuery(route.query, {
              conversation: conversation.id,
            }),
          });
      },
      { immediate: true },
    );
    const jobName = (id) => store.job(id)?.title || "Conversation";
    const otherParticipant = (conversation) =>
      store.user(conversation?.participants.find((id) => id !== user.value.id));
    const display = (item, key) => {
      const value = item?.[key];
      if (
        ["totalSpend", "value", "budget", "total", "amount", "rate"].includes(
          key,
        )
      )
        return store.money(value, item.currency);
      if (key === "billable")
        return value === true || value === "true" ? "Yes" : "No";
      if (key === "projectId") return store.job(value)?.title || "—";
      if (key === "invoiceId") {
        const invoice = store.state.invoices.find(
          (entry) => entry.id === value,
        );
        return invoice ? invoice.serie + "-" + invoice.folio : "—";
      }
      if (key === "companyId" || key === "providerId")
        return store.user(value)?.name || "—";
      if (key === "assignedTo")
        return (Array.isArray(value) ? value : [])
          .map((id) => store.user(id)?.name || id)
          .join(", ");
      if (Array.isArray(value)) return value.join(", ");
      return value ?? "—";
    };
    const linkFor = (item, key) =>
      key === "title" && kind.value === "projects"
        ? `/project/${item.id}`
        : key === "folio" && kind.value === "invoices"
          ? `/invoices/${item.id}`
          : null;
    const openNew = () => {
      if (!canCreateInvoice.value)
        return store.notice("Invoice creation denied", "fa-shield-halved");
      invoiceDraft.value = {
        projectTitle: "",
        total: null,
        currency: "USD",
        dueDate: "",
      };
      newInvoiceOpen.value = true;
      router.push({
        path: route.path,
        query: window.WebCommon.mergeRouteQuery(route.query, {
          new: "invoice",
        }),
      });
    };
    const closeNew = () => {
      newInvoiceOpen.value = false;
      router.replace({
        path: route.path,
        query: window.WebCommon.mergeRouteQuery(route.query, { new: null }),
      });
    };
    watch(
      () => route.query.new,
      (value) => {
        if (kind.value === "invoices")
          newInvoiceOpen.value = value === "invoice";
      },
      { immediate: true },
    );
    const createInvoice = async () => {
      const title = window.WebCommon.sanitizeText(
          invoiceDraft.value.projectTitle,
          240,
        ).trim(),
        total = Number(invoiceDraft.value.total);
      if (
        !canCreateInvoice.value ||
        !title ||
        !Number.isFinite(total) ||
        total <= 0
      )
        return store.notice(
          "Complete the required invoice fields",
          "fa-triangle-exclamation",
        );
      const invoice = await store.run("Creating invoice…", async () =>
        store.addInvoice({ ...invoiceDraft.value, projectTitle: title, total }),
      );
      if (invoice) closeNew();
    };
    const updateCell = ({ id, key, value }) => {
      const item = items.value.find((row) => row.id === id),
        column = config.value.columns.find((entry) => entry.key === key);
      if (
        !item ||
        !column?.edit ||
        !canMutate(item) ||
        [
          "id",
          "providerId",
          "clientId",
          "receiverId",
          "companyId",
          "createdById",
        ].includes(key)
      )
        return store.notice("Record update denied", "fa-shield-halved");
      if (
        [
          "totalSpend",
          "value",
          "budget",
          "total",
          "amount",
          "rate",
          "rating",
          "progress",
        ].includes(key)
      ) {
        value = Number(value);
        if (
          !Number.isFinite(value) ||
          value < 0 ||
          (key === "total" && value === 0) ||
          (key === "progress" && value > 100)
        )
          return store.notice(
            "Enter a valid numeric value",
            "fa-triangle-exclamation",
          );
      } else if (column.edit.type === "date") {
        const parsed = new Date(`${value}T12:00:00Z`);
        if (!value || Number.isNaN(parsed.getTime()))
          return store.notice("Enter a valid date", "fa-triangle-exclamation");
        value = parsed.toISOString();
      } else if (column.edit.type === "tags") {
        value = (Array.isArray(value) ? value : String(value).split(","))
          .map((entry) => window.WebCommon.sanitizeText(entry, 80).trim())
          .filter(Boolean)
          .slice(0, 30);
      } else if (column.edit.type === "multi-user") {
        const allowedIds = new Set(store.state.users.map((entry) => entry.id));
        value = (Array.isArray(value) ? value : [])
          .filter((id) => allowedIds.has(id))
          .slice(0, 20);
      } else if (key === "billable") value = value === true || value === "true";
      else value = window.WebCommon.sanitizeText(value, 500).trim();
      item[key] = value;
      store.notice(`${config.value.title}: ${key} updated`, "fa-pen");
    };
    const canDelete = (item) => {
      if (!canMutate(item)) return false;
      if (kind.value === "projects") return item.status === "DRAFT";
      if (kind.value === "estimates") return item.status === "Pending";
      if (["invoices", "payments", "clients", "issuers"].includes(kind.value))
        return false;
      return true;
    };
    const deleteRow = async (item) => {
      if (!canDelete(item))
        return store.notice(
          "This record cannot be deleted",
          "fa-shield-halved",
        );
      const confirmed = await store.confirm({
        title: "Delete record?",
        message: "The selected demo record will be removed from this table.",
        confirmText: "Delete",
        danger: true,
      });
      if (!confirmed) return;
      const source = collections()[kind.value],
        index = source?.findIndex((row) => row.id === item.id) ?? -1;
      if (index >= 0) source.splice(index, 1);
      store.notice("Record deleted");
    };
    const send = () => {
      if (activeConversation.value) {
        store.sendMessage(activeConversation.value.jobId, message.value);
        message.value = "";
      }
    };
    return {
      store,
      kind,
      config,
      items,
      tableColumns,
      canEditWorkspace,
      freelancers,
      conversations,
      selected,
      selectConversation,
      message,
      activeConversation,
      jobName,
      otherParticipant,
      display,
      linkFor,
      updateCell,
      deleteRow,
      send,
      newInvoiceOpen,
      invoiceDraft,
      openNew,
      closeNew,
      createInvoice,
    };
  },
};
</script>
