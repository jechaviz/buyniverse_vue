<template>
  <nav v-if="items.length > 1" class="mb-4 min-w-0" aria-label="Breadcrumb">
    <ol
      class="flex min-w-0 flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-400"
    >
      <li
        v-for="(item, index) in items"
        :key="`${item.label}-${index}`"
        class="flex min-w-0 items-center gap-1.5"
      >
        <i
          v-if="index"
          class="fa-solid fa-chevron-right flex-none text-[8px] text-slate-300 dark:text-slate-600"
          aria-hidden="true"
        ></i>
        <RouterLink
          v-if="item.to && index < items.length - 1"
          :to="item.to"
          class="max-w-52 truncate transition hover:text-brand"
          >{{ item.label }}</RouterLink
        >
        <span
          v-else
          class="max-w-64 truncate rounded-md bg-brand-50 px-2 py-1 text-brand dark:bg-brand/10"
          :aria-current="index === items.length - 1 ? 'page' : undefined"
          >{{ item.label }}</span
        >
      </li>
    </ol>
  </nav>
</template>

<script>
const { inject, computed } = Vue;
const { useRoute } = VueRouter;

const PROJECT_TABS = {
  details: "Details",
  providers: "Providers",
  milestones: "Milestones",
  files: "Files",
  comments: "Comments",
};
const PROCUREMENT = {
  cockpit: { label: "Overview" },
  queue: { label: "Requests", record: "request" },
  sourcing: {
    label: "Quotes",
    record: "event",
    tabs: {
      overview: "Setup",
      suppliers: "Suppliers",
      bidsheet: "Offers",
      comparison: "Compare",
      award: "Choose",
      timeline: "History",
    },
    fallbackTab: "overview",
  },
  auction: {
    label: "Live bids",
    record: "auction",
    tabs: {
      live: "Live",
      history: "History",
      rank: "Ranking",
      audit: "Activity",
    },
    fallbackTab: "live",
  },
  execution: {
    label: "Orders",
    record: "order",
    tabs: {
      overview: "Overview",
      lines: "Order lines",
      receipts: "Receipts",
      matching: "Invoice check",
      exceptions: "Issues",
      documents: "Documents",
      audit: "History",
    },
    fallbackTab: "overview",
  },
  intelligence: {
    label: "Insights",
    tabs: {
      portfolio: "Overview",
      scenarios: "Compare offers",
      suppliers: "Suppliers",
      risk: "Risk",
      reports: "Reports",
    },
    fallbackTab: "portfolio",
  },
  governance: {
    label: "Settings & history",
    tabs: {
      automation: "Automation",
      rules: "Rules",
      roles: "Roles",
      configuration: "Settings",
      audit: "History",
    },
    fallbackTab: "automation",
  },
};
const DASHBOARD = {
  overview: "Overview",
  timesheets: "Timesheets",
  transactions: "Transactions",
  "my-agency": "My agency",
};

export default {
  setup() {
    const store = inject("store");
    const route = useRoute();
    const query = (patch = {}) =>
      window.WebCommon.mergeRouteQuery(route.query, patch);
    const item = (label, to = null) => ({
      label: window.WebCommon.sanitizeText(label || "View", 120),
      to,
    });
    const project = (id) => store.job(id);
    const invoice = (id) =>
      store.state.invoices.find((entry) => entry.id === id);
    const payment = (id) =>
      store.state.paymentReceipts.find((entry) => entry.id === id);
    const procurementRecord = (section, id) => {
      if (!id) return null;
      if (section === "queue") return store.purchaseRequest(id);
      if (section === "sourcing")
        return store.state.sourcingEvents.find((entry) => entry.id === id);
      if (section === "auction")
        return store.state.auctions.find((entry) => entry.id === id);
      if (section === "execution")
        return store.state.purchaseOrders.find((entry) => entry.id === id);
      return null;
    };
    const items = computed(() => {
      const path = route.path;
      const crumbs = [];
      if (path.startsWith("/dashboard")) {
        const section = route.params.section || "overview";
        crumbs.push(item("Dashboard", "/dashboard"));
        if (section !== "overview")
          crumbs.push(item(DASHBOARD[section] || section));
        return crumbs;
      }
      if (path.startsWith("/project/") && route.params.id) {
        const job = project(route.params.id);
        crumbs.push(item("Projects", "/projects"));
        crumbs.push(
          item(
            job?.title || "Project",
            path.endsWith("/contest")
              ? `/project/${route.params.id}?tab=details`
              : {
                  path: `/project/${route.params.id}`,
                  query: query({
                    tab: null,
                    subtab: null,
                    file: null,
                    milestone: null,
                    mode: null,
                  }),
                },
          ),
        );
        if (path.endsWith("/contest")) {
          crumbs.push(item("Contest"));
          return crumbs;
        }
        const tab = PROJECT_TABS[route.query.tab] ? route.query.tab : "details";
        crumbs.push(
          item(PROJECT_TABS[tab], {
            path,
            query: query({
              tab: tab === "details" ? null : tab,
              subtab: null,
              file: null,
              milestone: null,
              mode: null,
            }),
          }),
        );
        if (tab === "providers" && route.query.subtab === "proposals")
          crumbs.push(item("Proposals"));
        if (tab === "files" && route.query.file) {
          const file = job?.files?.find(
            (entry) => entry.id === route.query.file,
          );
          if (file) crumbs.push(item(file.name));
        }
        if (tab === "milestones" && route.query.milestone) {
          const contract = job?.contractId
            ? store.contract(job.contractId)
            : null;
          const milestone = contract?.milestones?.find(
            (entry) => entry.id === route.query.milestone,
          );
          if (milestone) crumbs.push(item(milestone.title));
        }
        if (route.query.mode === "edit") crumbs.push(item("Edit"));
        return crumbs;
      }
      if (path.startsWith("/contract/")) {
        const contract = store.contract(route.params.contractId);
        const job = project(contract?.sourceId);
        crumbs.push(item("Projects", "/projects"));
        if (job)
          crumbs.push(
            item(job.title, `/project/${job.id}?tab=details`),
            item("Details", `/project/${job.id}?tab=details`),
          );
        crumbs.push(item(contract ? `Contract ${contract.id}` : "Contract"));
        return crumbs;
      }
      if (path.startsWith("/procurement")) {
        const section = route.params.section || "cockpit";
        const meta = PROCUREMENT[section] || PROCUREMENT.cockpit;
        crumbs.push(item("Purchases", "/procurement/cockpit"));
        if (section !== "cockpit")
          crumbs.push(
            item(meta.label, {
              path: `/procurement/${section}`,
              query: {},
            }),
          );
        if (route.query.new === "1") {
          const wizardLabels =
            section === "sourcing" ? ["Setup", "Suppliers", "Send"] : [];
          const wizardStep = Number(route.query.step);
          crumbs.push(
            item(
              section === "sourcing" ? "New quote round" : "New request",
              Number.isInteger(wizardStep)
                ? { path, query: query({ step: null }) }
                : null,
            ),
          );
          if (Number.isInteger(wizardStep) && wizardLabels[wizardStep])
            crumbs.push(item(wizardLabels[wizardStep]));
          return crumbs;
        }
        const recordId = meta.record ? route.query[meta.record] : null;
        const record = procurementRecord(section, recordId);
        if (record)
          crumbs.push(
            item(record.title || record.id, {
              path,
              query: query({ tab: null }),
            }),
          );
        if (
          meta.tabs &&
          (record ||
            route.query.tab ||
            ["intelligence", "governance"].includes(section))
        ) {
          const tab = meta.tabs[route.query.tab]
            ? route.query.tab
            : meta.fallbackTab;
          crumbs.push(item(meta.tabs[tab]));
        }
        if (section === "intelligence" && route.query.tab === "scenarios") {
          const event = store.state.sourcingEvents.find(
            (entry) => entry.id === route.query.event,
          );
          const scenario = store.state.procurementAnalytics?.scenarios?.find(
            (entry) => entry.id === route.query.scenario,
          );
          if (event) crumbs.push(item(event.title));
          if (scenario) crumbs.push(item(scenario.name));
        }
        if (section === "intelligence" && route.query.tab === "suppliers") {
          const supplier = store.supplier(route.query.supplier);
          if (supplier) crumbs.push(item(supplier.name));
        }
        if (section === "execution" && route.query.view === "receipt")
          crumbs.push(item("New receipt"));
        return crumbs;
      }
      if (path.startsWith("/invoices")) {
        crumbs.push(item("Invoices", "/invoices"));
        if (path === "/invoices/new") crumbs.push(item("New invoice"));
        else if (route.params.invoiceId) {
          const current = invoice(route.params.invoiceId);
          crumbs.push(
            item(
              current
                ? `${current.serie}-${current.folio}`
                : route.params.invoiceId,
              path.endsWith("/edit")
                ? `/invoices/${route.params.invoiceId}`
                : null,
            ),
          );
          if (path.endsWith("/edit")) crumbs.push(item("Edit"));
        } else if (route.query.new === "invoice")
          crumbs.push(item("New invoice"));
        return crumbs;
      }
      if (path.startsWith("/payments")) {
        crumbs.push(item("Payments", "/payments"));
        if (path === "/payments/new") crumbs.push(item("New payment"));
        else if (route.params.paymentId) {
          const current = payment(route.params.paymentId);
          crumbs.push(item(current?.folio || route.params.paymentId));
          if (path.endsWith("/edit")) crumbs.push(item("Edit"));
        }
        return crumbs;
      }
      if (path === "/messages") {
        crumbs.push(item("Messages", "/messages"));
        const conversation = store.state.conversations.find(
          (entry) => entry.id === route.query.conversation,
        );
        if (conversation) {
          const other = conversation.participants.find(
            (id) => id !== store.currentUser.value.id,
          );
          crumbs.push(
            item(
              store.user(other)?.name ||
                project(conversation.jobId)?.title ||
                "Conversation",
            ),
          );
        }
        return crumbs;
      }
      if (path.startsWith("/post-job/")) {
        crumbs.push(item("Projects", "/projects"));
        crumbs.push(
          item(
            route.params.id === "new" ? "New project" : "Edit project",
            route.query.step ? { path, query: query({ step: null }) } : null,
          ),
        );
        const labels = ["Strategy", "Brief", "Scope", "Commercials", "Review"];
        const step = Number(route.query.step);
        if (Number.isInteger(step) && labels[step])
          crumbs.push(item(labels[step]));
        return crumbs;
      }
      if (path.startsWith("/client/job/")) {
        const job = project(route.params.jobId);
        return [
          item("Projects", "/projects"),
          item(job?.title || "Project", `/project/${route.params.jobId}`),
          item("Proposals"),
        ];
      }
      if (path.startsWith("/job/")) {
        const job = project(route.params.jobId);
        return [item("Find work", "/"), item(job?.title || "Opportunity")];
      }
      if (path.startsWith("/gig/")) {
        const gig = store.state.gigs.find(
          (entry) => entry.id === route.params.gigId,
        );
        return [
          item("Services", "/browse-services"),
          item(gig?.title || "Service"),
        ];
      }
      if (path.startsWith("/profile/") && path !== "/profile/billing") {
        const user = store.user(route.params.userId);
        return [item("People", "/find-talent"), item(user?.name || "Profile")];
      }
      if (path.startsWith("/agency/")) {
        const agency = store.state.agencies.find(
          (entry) => entry.id === route.params.agencyId,
        );
        return [
          item("Agencies", "/find-talent"),
          item(agency?.name || "Agency"),
        ];
      }
      if (path === "/" && route.query.view === "saved")
        return [item("Find work", "/"), item("Saved jobs")];
      return crumbs;
    });
    return { items };
  },
};
</script>
