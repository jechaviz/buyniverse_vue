<template>
  <section class="space-y-5">
    <header class="flex flex-col gap-4 border-b border-slate-200/80 pb-5 dark:border-slate-800/80 lg:flex-row lg:items-end lg:justify-between">
      <div class="max-w-3xl">
        <p class="premium-kicker text-[10px] font-800 uppercase tracking-[0.16em] text-brand">
          <i class="fa-solid fa-shield-halved mr-1.5"></i>{{ store.t("Administration") }}
        </p>
        <h1 class="font-head mt-1 text-2xl font-800 tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          {{ store.t("Control center") }}
        </h1>
        <p class="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400 sm:text-sm">
          {{ store.t("Govern companies, access, fiscal configuration and operational controls without entering a buyer or supplier workspace.") }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span class="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-800 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          <i class="fa-solid" :class="store.isDemo.value ? 'fa-flask' : 'fa-circle-check'"></i>{{ scopeStatus }}
        </span>
        <RouterLink to="/settings/organizations" class="btn-brand px-3.5 py-2 text-xs">
          <i class="fa-solid fa-building-shield mr-1.5"></i>{{ store.t("Manage organization") }}
        </RouterLink>
      </div>
    </header>

    <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" :aria-label="store.t('Administrative summary')">
      <article v-for="card in summaryCards" :key="card.label" class="premium-card min-w-0 rounded-2xl border border-slate-200/80 bg-white/90 p-4 dark:border-slate-800/80 dark:bg-slate-900/80">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="truncate text-[10px] font-800 uppercase tracking-wider text-slate-400">{{ store.t(card.label) }}</p>
            <p class="font-head mt-2 truncate text-2xl font-800 tracking-tight text-slate-900 dark:text-white">{{ card.value }}</p>
          </div>
          <span class="grid h-8 w-8 flex-none place-items-center rounded-xl bg-brand-50 text-xs text-brand dark:bg-brand/15"><i class="fa-solid" :class="card.icon"></i></span>
        </div>
        <p class="mt-2 flex items-center gap-1.5 text-[10px] font-medium text-slate-500 dark:text-slate-400"><span class="h-1.5 w-1.5 rounded-full" :class="card.tone"></span>{{ store.t(card.note) }}</p>
      </article>
    </section>

    <section class="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(19rem,.65fr)]">
      <article class="panel overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800">
          <div>
            <p class="text-[10px] font-800 uppercase tracking-wider text-brand">{{ store.t("Administrative surfaces") }}</p>
            <h2 class="font-head mt-0.5 text-sm font-800 text-slate-900 dark:text-white">{{ store.t("Governance workspace") }}</h2>
          </div>
          <span class="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500 dark:bg-slate-800">{{ adminActions.length }} {{ store.t("controls") }}</span>
        </div>
        <div class="grid divide-y divide-slate-100 dark:divide-slate-800 md:grid-cols-2 md:divide-x md:divide-y-0">
          <RouterLink v-for="action in adminActions" :key="action.to" :to="action.to" class="group flex gap-3 p-4 transition hover:bg-brand-50/45 dark:hover:bg-brand/8">
            <span class="grid h-9 w-9 flex-none place-items-center rounded-xl bg-slate-100 text-slate-500 transition group-hover:bg-brand group-hover:text-white dark:bg-slate-800"><i class="fa-solid text-sm" :class="action.icon"></i></span>
            <span class="min-w-0">
              <b class="block text-xs font-800 text-slate-800 dark:text-slate-100">{{ store.t(action.label) }}<i class="fa-solid fa-arrow-right ml-1.5 text-[9px] text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand"></i></b>
              <span class="mt-1 block text-[11px] leading-4 text-slate-500 dark:text-slate-400">{{ store.t(action.copy) }}</span>
            </span>
          </RouterLink>
        </div>
      </article>

      <article class="panel rounded-2xl border border-slate-200/80 p-4 dark:border-slate-800/80">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-[10px] font-800 uppercase tracking-wider text-brand">{{ store.t("Active scope") }}</p>
            <h2 class="font-head mt-0.5 text-sm font-800 text-slate-900 dark:text-white">{{ activeCompanyName }}</h2>
          </div>
          <i class="fa-solid fa-sitemap text-brand"></i>
        </div>
        <dl class="mt-3 space-y-2.5 text-xs">
          <div class="flex items-center justify-between gap-3"><dt class="text-slate-500 dark:text-slate-400">{{ store.t("Legal entity") }}</dt><dd class="max-w-[58%] truncate font-mono font-bold text-slate-800 dark:text-slate-200">{{ activeCompanyTaxId }}</dd></div>
          <div class="flex items-center justify-between gap-3"><dt class="text-slate-500 dark:text-slate-400">{{ store.t("Location coverage") }}</dt><dd class="font-bold text-slate-800 dark:text-slate-200">{{ activeLocationLabel }}</dd></div>
          <div class="flex items-center justify-between gap-3"><dt class="text-slate-500 dark:text-slate-400">{{ store.t("Administrative access") }}</dt><dd class="font-bold text-emerald-600 dark:text-emerald-400">{{ accessLevel }}</dd></div>
        </dl>
        <RouterLink to="/settings/organizations" class="btn-muted mt-4 flex w-full justify-center py-2 text-xs"><i class="fa-solid fa-sliders mr-1.5"></i>{{ store.t("Change company context") }}</RouterLink>
      </article>
    </section>

    <section class="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,.85fr)]">
      <article class="panel rounded-2xl border border-slate-200/80 p-4 dark:border-slate-800/80">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div>
            <p class="text-[10px] font-800 uppercase tracking-wider text-brand">{{ store.t("Operational oversight") }}</p>
            <h2 class="font-head mt-0.5 text-sm font-800 text-slate-900 dark:text-white">{{ store.t("Exceptions and workload") }}</h2>
          </div>
          <RouterLink to="/procurement/cockpit" class="text-[11px] font-bold text-brand hover:underline">{{ store.t("Open oversight") }}</RouterLink>
        </div>
        <div class="mt-3 grid gap-2 sm:grid-cols-3">
          <RouterLink v-for="item in oversight" :key="item.label" :to="item.to" class="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 transition hover:border-brand/50 hover:bg-brand-50/35 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-brand/8">
            <div class="flex items-center justify-between gap-2"><span class="text-[10px] font-800 uppercase tracking-wide text-slate-400">{{ store.t(item.label) }}</span><i class="fa-solid text-[10px]" :class="[item.icon, item.tone]"></i></div>
            <strong class="font-head mt-2 block text-xl font-800 text-slate-900 dark:text-white">{{ item.value }}</strong>
            <span class="mt-1 block text-[10px] leading-4 text-slate-500 dark:text-slate-400">{{ store.t(item.note) }}</span>
          </RouterLink>
        </div>
      </article>

      <article class="panel overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
        <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <div><p class="text-[10px] font-800 uppercase tracking-wider text-brand">{{ store.t("Audit trail") }}</p><h2 class="font-head mt-0.5 text-sm font-800 text-slate-900 dark:text-white">{{ store.t("Recent control events") }}</h2></div>
          <RouterLink to="/procurement/governance?tab=audit" class="text-[11px] font-bold text-brand hover:underline">{{ store.t("View all") }}</RouterLink>
        </div>
        <div v-if="auditEvents.length" class="divide-y divide-slate-100 dark:divide-slate-800">
          <div v-for="event in auditEvents" :key="event.id" class="flex gap-3 px-4 py-3">
            <span class="mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-lg bg-slate-100 text-[10px] text-slate-500 dark:bg-slate-800"><i class="fa-solid fa-shield-halved"></i></span>
            <div class="min-w-0"><b class="block truncate text-[11px] text-slate-800 dark:text-slate-200">{{ event.action }}</b><span v-if="event.detail" class="mt-0.5 block truncate text-[10px] text-slate-500 dark:text-slate-400">{{ event.detail }}</span><time class="mt-0.5 block text-[9px] text-slate-400">{{ store.date(event.at) }}</time></div>
          </div>
        </div>
        <p v-else class="p-6 text-center text-xs text-slate-400"><i class="fa-solid fa-clock-rotate-left mr-1.5"></i>{{ store.t("No control events yet.") }}</p>
      </article>
    </section>
  </section>
</template>

<script>
const { inject, computed } = Vue;

export default {
  setup() {
    const store = inject("store");
    const context = store.tenantContext;
    const companies = computed(() => context.value?.companies || []);
    const activeCompany = computed(() => context.value?.company || {});
    const activeLocations = computed(() => activeCompany.value?.locations?.length || 0);
    const allLocations = computed(() => companies.value.reduce((total, company) => total + (company.locations?.length || 0), 0));
    const scoped = (records) => store.scopedRecords(records || []);
    const activeRequests = computed(() => scoped(store.state.purchaseRequests).filter((item) => !["Closed", "Rejected", "Cancelled", "Completed"].includes(item.status)).length);
    const activeEvents = computed(() => scoped([...(store.state.sourcingEvents || []), ...(store.state.auctions || [])]).filter((item) => !["Closed", "Awarded", "Cancelled", "Completed"].includes(item.status)).length);
    const exceptions = computed(() => scoped(store.state.purchaseOrders).reduce((total, order) => total + (order.exceptions || []).filter((item) => item.status !== "Resolved").length, 0) + scoped(store.state.purchaseRequests).filter((item) => ["Pending approval", "Exception", "Escalated"].includes(item.status)).length);
    const accessLevel = computed(() => store.isDemo.value && !context.value
      ? store.t("Demo")
      : context.value?.permissions?.manageTenant
        ? store.t("Global")
        : store.t("Company scoped"));
    const auditEvents = computed(() => [
      ...(store.state.securityAudit || []),
      ...(store.state.procurementAudit || []),
    ].map((event, index) => ({
      id: event.id || `${event.action || "event"}-${index}`,
      action: event.action || store.t("Control updated"),
      detail: event.detail || event.entityId || "",
      at: event.at || event.createdAt || event.timestamp || event.date || new Date(0).toISOString(),
    })).sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 5));
    const summaryCards = computed(() => [
      { label: "Legal entities", value: context.value ? companies.value.length : "—", note: context.value ? "Available in this tenant" : "No company context in this demo", icon: "fa-building-columns", tone: "bg-emerald-500" },
      { label: "Locations", value: context.value ? allLocations.value : "—", note: context.value ? "Branches and warehouses" : "No company context in this demo", icon: "fa-warehouse", tone: "bg-sky-500" },
      { label: "Admin scope", value: accessLevel.value, note: store.isDemo.value && !context.value ? "Fictional demo authorization" : "Current authorization", icon: "fa-user-shield", tone: "bg-violet-500" },
      { label: "Open exceptions", value: exceptions.value, note: exceptions.value ? "Require review" : "No current exceptions", icon: "fa-triangle-exclamation", tone: exceptions.value ? "bg-amber-500" : "bg-emerald-500" },
    ]);
    const adminActions = [
      { to: "/settings/organizations", label: "Companies & access", copy: "Legal entities, branches, warehouses and scoped memberships.", icon: "fa-building-shield" },
      { to: "/admin/issuers", label: "Fiscal issuers", copy: "Tax issuers, regimes and invoice credentials policy.", icon: "fa-file-invoice-dollar" },
      { to: "/procurement/governance", label: "Policies & audit", copy: "Rules, approval controls, automations and immutable history.", icon: "fa-scale-balanced" },
      { to: "/procurement/intelligence", label: "Procurement intelligence", copy: "Spend, savings and supplier performance across the active scope.", icon: "fa-chart-line" },
    ];
    const oversight = computed(() => [
      { to: "/procurement/queue", label: "Active requests", value: activeRequests.value, note: "Requests under active processing", icon: "fa-cart-plus", tone: "text-brand" },
      { to: "/procurement/auction", label: "Competitive events", value: activeEvents.value, note: "Sourcing and live bid events", icon: "fa-gavel", tone: "text-violet-500" },
      { to: "/procurement/execution", label: "Exceptions", value: exceptions.value, note: exceptions.value ? "Approval or execution review needed" : "No operational escalation", icon: "fa-circle-exclamation", tone: exceptions.value ? "text-amber-500" : "text-emerald-500" },
    ]);
    return {
      store,
      scopeStatus: computed(() => store.t(store.isDemo.value ? "Demo data isolated" : "Server-enforced context")),
      activeCompanyName: computed(() => activeCompany.value.legalName || store.t(store.isDemo.value ? "Demo administration" : "No company selected")),
      activeCompanyTaxId: computed(() => activeCompany.value.rfc || (store.isDemo.value ? store.t("Fictional data") : "—")),
      activeLocationLabel: computed(() => context.value ? `${activeLocations.value} ${store.t("locations")}` : "—"),
      accessLevel,
      summaryCards,
      adminActions,
      oversight,
      auditEvents,
    };
  },
};
</script>
