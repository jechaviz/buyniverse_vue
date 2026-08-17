<template>
  <div class="space-y-5">
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
        @click="openTab(item.key)"
      >
        <i class="fa-solid mr-1.5" :class="item.icon"></i>{{ item.label
        }}<span
          v-if="item.count"
          class="ml-1 rounded-full bg-white/15 px-1.5 py-0.5 text-[9px]"
          >{{ item.count }}</span
        >
      </button>
    </nav>

    <div
      v-if="tab === 'automation'"
      class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]"
    >
      <article class="panel overflow-hidden">
        <header
          class="flex items-center justify-between border-b border-slate-200/70 p-5 dark:border-slate-700"
        >
          <div>
            <h2 class="text-lg font-800">Automations</h2>
            <p class="mt-1 text-xs text-slate-500">
              Simple triggers and clear steps.
            </p>
          </div>
          <button class="btn-brand" @click="workflowOpen = true">
            <i class="fa-solid fa-plus"></i>New workflow
          </button>
        </header>
        <div class="divide-y divide-slate-100 dark:divide-slate-700">
          <article
            v-for="workflow in store.state.procurementWorkflows"
            :key="workflow.id"
            class="p-5"
          >
            <div
              class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div>
                <div class="flex items-center gap-2">
                  <span
                    class="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand"
                    ><i class="fa-solid fa-bolt"></i></span
                  ><b class="text-sm">{{ workflow.name }}</b
                  ><span
                    class="badge"
                    :class="
                      workflow.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-700'
                    "
                    >{{ workflow.status }}</span
                  >
                </div>
                <p class="ml-10 mt-1 text-[10px] text-slate-500">
                  When {{ workflow.trigger }}
                </p>
              </div>
              <div class="flex gap-4 text-center">
                <div>
                  <b class="block text-sm">{{ workflow.runs }}</b
                  ><small class="text-[9px] text-slate-400">Runs</small>
                </div>
                <div>
                  <b class="block text-sm">{{ workflow.successRate }}%</b
                  ><small class="text-[9px] text-slate-400">Success</small>
                </div>
                <button
                  class="text-slate-400 hover:text-brand"
                  @click="toggleWorkflow(workflow)"
                >
                  <i
                    class="fa-solid"
                    :class="
                      workflow.status === 'Active'
                        ? 'fa-toggle-on text-emerald-500'
                        : 'fa-toggle-off'
                    "
                  ></i>
                </button>
              </div>
            </div>
            <div class="mt-4 flex gap-2 overflow-x-auto">
              <div
                v-for="(step, index) in workflow.steps"
                :key="step"
                class="flex min-w-max items-center gap-2"
              >
                <span
                  class="rounded-lg border border-slate-200/70 px-3 py-2 text-[10px] font-bold dark:border-slate-700"
                  ><span class="mr-1 text-brand">{{ index + 1 }}</span
                  >{{ step }}</span
                ><i
                  v-if="index < workflow.steps.length - 1"
                  class="fa-solid fa-chevron-right text-[9px] text-slate-300"
                ></i>
              </div>
            </div>
          </article>
        </div>
      </article>
      <aside class="space-y-5">
        <article class="panel p-5">
          <span class="text-[10px] font-800 uppercase tracking-wide text-brand"
            >Automation health</span
          >
          <div class="mt-4 grid grid-cols-2 gap-2">
            <div
              class="rounded-lg bg-slate-50 p-3 text-center dark:bg-slate-800"
            >
              <b class="block text-2xl">36</b
              ><small class="text-[9px] text-slate-400">Total runs</small>
            </div>
            <div
              class="rounded-lg bg-slate-50 p-3 text-center dark:bg-slate-800"
            >
              <b class="block text-2xl text-emerald-500">94%</b
              ><small class="text-[9px] text-slate-400">Success</small>
            </div>
          </div>
          <p class="mt-4 text-xs leading-5 text-slate-500">
            Automation routes routine work; people approve important decisions.
          </p>
        </article>
        <article class="rounded-xl bg-slate-950 p-5 text-white">
          <span
            class="text-[10px] font-800 uppercase tracking-wide text-brand-100"
            >Safety</span
          >
          <h3 class="mt-2 text-lg font-800">Always actionable</h3>
          <p class="mt-2 text-xs leading-5 text-slate-400">
            Every state has an owner and a next action. Important decisions
            always require a person.
          </p>
        </article>
      </aside>
    </div>

    <div
      v-else-if="tab === 'rules'"
      class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"
    >
      <article class="panel overflow-hidden">
        <header class="border-b border-slate-200/70 p-5 dark:border-slate-700">
          <h2 class="text-lg font-800">Rules</h2>
          <p class="mt-1 text-xs text-slate-500">
            Approval, quote, live bid and invoice rules.
          </p>
        </header>
        <div class="divide-y divide-slate-100 dark:divide-slate-700">
          <article
            v-for="rule in store.state.procurementRules"
            :key="rule.id"
            class="grid gap-4 p-5 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center"
          >
            <span
              class="grid h-10 w-10 place-items-center rounded-xl"
              :class="
                rule.enabled
                  ? 'bg-brand-50 text-brand'
                  : 'bg-slate-100 text-slate-400 dark:bg-slate-700'
              "
              ><i class="fa-solid" :class="ruleIcon(rule.type)"></i
            ></span>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <b class="text-sm">{{ rule.name }}</b
                ><span
                  class="badge bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200"
                  >{{ ruleTypeLabel(rule.type) }}</span
                ><span class="text-[10px] text-slate-400"
                  >Owner: {{ rule.owner }}</span
                >
              </div>
              <div class="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                <span
                  class="rounded bg-slate-100 px-2 py-1 font-semibold dark:bg-slate-700"
                  >IF {{ rule.condition }}</span
                ><i class="fa-solid fa-arrow-right text-slate-300"></i
                ><span
                  class="rounded bg-brand-50 px-2 py-1 font-semibold text-brand"
                  >THEN {{ rule.action }}</span
                >
              </div>
            </div>
            <button
              class="text-xl"
              :class="rule.enabled ? 'text-emerald-500' : 'text-slate-300'"
              @click="toggleRule(rule)"
            >
              <i
                class="fa-solid"
                :class="rule.enabled ? 'fa-toggle-on' : 'fa-toggle-off'"
              ></i>
            </button>
          </article>
        </div>
      </article>
      <aside class="panel p-5">
        <span class="text-[10px] font-800 uppercase tracking-wide text-brand"
          >New rule</span
        >
        <h3 class="mt-1 text-lg font-800">Add rule</h3>
        <form class="mt-4 space-y-3" @submit.prevent="addRule">
          <label
            ><span class="mb-1 block text-xs font-bold">Name</span
            ><input
              v-model.trim="ruleDraft.name"
              class="field"
              required /></label
          ><label
            ><span class="mb-1 block text-xs font-bold">Type</span
            ><select v-model="ruleDraft.type" class="field">
              <option>Approval</option>
              <option>Exclusion</option>
              <option value="Auction">Live bid</option>
              <option value="Matching">Invoice check</option>
              <option>Supplier limit</option>
              <option>Price threshold</option>
            </select></label
          ><label
            ><span class="mb-1 block text-xs font-bold">IF condition</span
            ><input
              v-model.trim="ruleDraft.condition"
              class="field"
              required
              placeholder="Amount > 25,000" /></label
          ><label
            ><span class="mb-1 block text-xs font-bold">THEN action</span
            ><input
              v-model.trim="ruleDraft.action"
              class="field"
              required
              placeholder="Require CFO approval" /></label
          ><button class="btn-brand w-full">
            <i class="fa-solid fa-plus"></i>Add rule
          </button>
        </form>
      </aside>
    </div>

    <div v-else-if="tab === 'roles'" class="space-y-5">
      <section class="panel overflow-hidden">
        <header class="border-b border-slate-200/70 p-5 dark:border-slate-700">
          <h2 class="text-lg font-800">Access by role</h2>
          <p class="mt-1 text-xs text-slate-500">
            Each role sees only the work and controls it needs.
          </p>
        </header>
        <div class="overflow-x-auto">
          <table class="w-full min-w-230 text-left text-xs">
            <thead
              class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 dark:bg-slate-800"
            >
              <tr>
                <th class="px-4 py-3">Role</th>
                <th
                  v-for="surface in roleSurfaces"
                  :key="surface"
                  class="px-4 py-3 text-center"
                >
                  {{ surface }}
                </th>
                <th class="px-4 py-3">Main task</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
              <tr v-for="role in roles" :key="role.name">
                <td class="px-4 py-4">
                  <b>{{ role.name }}</b>
                  <p class="mt-1 text-[10px] text-slate-400">
                    {{ role.productRole }}
                  </p>
                </td>
                <td
                  v-for="surface in roleSurfaces"
                  :key="surface"
                  class="px-4 py-4 text-center"
                >
                  <i
                    class="fa-solid"
                    :class="
                      role.surfaces.includes(surface)
                        ? 'fa-circle-check text-emerald-500'
                        : 'fa-minus text-slate-300'
                    "
                  ></i>
                </td>
                <td class="px-4 py-4 text-[11px] leading-5 text-slate-500">
                  {{ role.job }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article
          v-for="principle in rolePrinciples"
          :key="principle.title"
          class="premium-card rounded-xl border p-4"
        >
          <span
            class="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand"
            ><i class="fa-solid" :class="principle.icon"></i
          ></span>
          <h3 class="mt-4 text-sm font-800">{{ principle.title }}</h3>
          <p class="mt-2 text-xs leading-5 text-slate-500">
            {{ principle.detail }}
          </p>
        </article>
      </section>
    </div>

    <div
      v-else-if="tab === 'configuration'"
      class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"
    >
      <section class="grid gap-4 md:grid-cols-2">
        <article
          v-for="group in configGroups"
          :key="group.title"
          class="panel p-5"
        >
          <div class="flex items-center gap-3">
            <span
              class="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand"
              ><i class="fa-solid" :class="group.icon"></i
            ></span>
            <div>
              <h2 class="text-sm font-800">{{ group.title }}</h2>
              <p class="mt-1 text-[10px] text-slate-500">
                {{ group.description }}
              </p>
            </div>
          </div>
          <div class="mt-4 space-y-3">
            <label
              v-for="field in group.fields"
              :key="field.key"
              class="flex items-center justify-between gap-3 rounded-lg border border-slate-200/70 p-3 dark:border-slate-700"
              ><span
                ><b class="block text-xs">{{ field.label }}</b
                ><small class="mt-1 block text-[9px] text-slate-400">{{
                  field.note
                }}</small></span
              ><input
                v-if="field.type === 'toggle'"
                v-model="configuration[field.key]"
                type="checkbox"
                class="h-4 w-4 accent-[var(--accent)]"
                @change="configChanged(field)"
              /><select
                v-else
                v-model="configuration[field.key]"
                class="field w-32 py-1.5 text-xs"
                @change="configChanged(field)"
              >
                <option v-for="option in field.options" :key="option">
                  {{ option }}
                </option>
              </select></label
            >
          </div>
        </article>
      </section>
      <aside class="space-y-5">
        <article class="panel p-5">
          <span class="text-[10px] font-800 uppercase tracking-wide text-brand"
            >Shared data</span
          >
          <h2 class="mt-2 text-lg font-800">One connected flow</h2>
          <ul class="mt-4 space-y-3 text-xs text-slate-500">
            <li v-for="item in nativeChecks" :key="item" class="flex gap-2">
              <i class="fa-solid fa-circle-check mt-0.5 text-emerald-500"></i
              ><span>{{ item }}</span>
            </li>
          </ul>
        </article>
        <article class="panel p-5">
          <h2 class="text-sm font-800">Demo data</h2>
          <p class="mt-2 text-xs leading-5 text-slate-500">
            All state is local, versioned and resettable. No credentials or
            operational secrets are stored.
          </p>
          <button class="btn-muted mt-4 w-full" @click="store.reset">
            <i class="fa-solid fa-rotate-left"></i>Reset demo data
          </button>
        </article>
      </aside>
    </div>

    <div v-else-if="tab === 'audit'" class="panel overflow-hidden">
      <header
        class="flex flex-col gap-3 border-b border-slate-200/70 p-5 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 class="text-lg font-800">History</h2>
          <p class="mt-1 text-xs text-slate-500">
            Requests, decisions, offers, receipts, issues and rule changes.
          </p>
        </div>
        <div class="flex gap-2">
          <div class="relative">
            <i
              class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400"
            ></i
            ><input
              v-model="auditSearch"
              class="field w-64 pl-9"
              placeholder="Search history"
            />
          </div>
          <button class="btn-muted" @click="exportAudit">
            <i class="fa-solid fa-download"></i>Export
          </button>
        </div>
      </header>
      <div class="overflow-x-auto">
        <table class="w-full min-w-210 text-left text-xs">
          <thead
            class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 dark:bg-slate-800"
          >
            <tr>
              <th class="px-4 py-3">Timestamp</th>
              <th class="px-4 py-3">Object</th>
              <th class="px-4 py-3">Action</th>
              <th class="px-4 py-3">Actor</th>
              <th class="px-4 py-3">Detail</th>
              <th class="px-4 py-3">Level</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
            <tr v-for="entry in filteredAudit" :key="entry.id">
              <td class="px-4 py-3 whitespace-nowrap">
                {{ store.date(entry.at) }}
              </td>
              <td class="px-4 py-3">
                <span
                  class="rounded bg-slate-100 px-2 py-1 font-bold dark:bg-slate-700"
                  >{{ entry.objectId }}</span
                >
              </td>
              <td class="px-4 py-3 font-bold">{{ entry.action }}</td>
              <td class="px-4 py-3">{{ entry.actor }}</td>
              <td class="max-w-lg px-4 py-3 text-slate-500">
                {{ entry.detail }}
              </td>
              <td class="px-4 py-3">
                <span
                  class="badge"
                  :class="
                    entry.level === 'warning'
                      ? 'bg-amber-50 text-amber-700'
                      : entry.level === 'danger'
                        ? 'bg-rose-50 text-rose-700'
                        : entry.level === 'success'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-sky-50 text-sky-700'
                  "
                  >{{ entry.level }}</span
                >
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div
      v-if="workflowOpen"
      class="fixed inset-0 z-60 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm"
    >
      <button class="absolute inset-0" @click="workflowOpen = false"></button>
      <form
        class="glass relative w-full max-w-xl rounded-2xl p-5"
        @submit.prevent="addWorkflow"
      >
        <div class="flex justify-between">
          <div>
            <span
              class="text-[10px] font-800 uppercase tracking-wide text-brand"
              >Workflow builder</span
            >
            <h2 class="mt-1 text-xl font-800">New automation</h2>
          </div>
          <button type="button" @click="workflowOpen = false">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="mt-5 space-y-3">
          <label
            ><span class="mb-1 block text-xs font-bold">Name</span
            ><input
              v-model.trim="workflowDraft.name"
              class="field"
              required /></label
          ><label
            ><span class="mb-1 block text-xs font-bold">Trigger</span
            ><input
              v-model.trim="workflowDraft.trigger"
              class="field"
              required
              placeholder="Request approved" /></label
          ><label
            ><span class="mb-1 block text-xs font-bold"
              >Steps, one per line</span
            ><textarea
              v-model="workflowDraft.steps"
              class="field min-h-32"
              required
            ></textarea>
          </label>
        </div>
        <div class="mt-5 flex justify-end gap-2">
          <button type="button" class="btn-muted" @click="workflowOpen = false">
            Cancel</button
          ><button class="btn-brand">
            <i class="fa-solid fa-plus"></i>Create workflow
          </button>
        </div>
      </form>
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
      validTabs = ["automation", "rules", "roles", "configuration", "audit"],
      tab = ref(
        validTabs.includes(route.query.tab) ? route.query.tab : "automation",
      ),
      workflowOpen = ref(false),
      workflowDraft = reactive({
        name: "",
        trigger: "",
        steps: "Classify record\nAssign owner\nNotify next actor",
      }),
      ruleDraft = reactive({
        name: "",
        type: "Approval",
        condition: "",
        action: "",
      }),
      auditSearch = ref("");
    const canConfigure = computed(
      () => store.currentUser.value.type === "Admin",
    );
    const openTab = (key) => {
      tab.value = key;
      router.push({
        path: "/procurement/governance",
        query: window.WebCommon.mergeRouteQuery(route.query, {
          tab: key === "automation" ? null : key,
        }),
      });
    };
    watch(
      () => route.query.tab,
      (value) => {
        tab.value = validTabs.includes(value) ? value : "automation";
      },
    );
    const tabs = computed(() => [
      {
        key: "automation",
        label: "Automation",
        icon: "fa-bolt",
        count: store.state.procurementWorkflows.length,
      },
      {
        key: "rules",
        label: "Rules",
        icon: "fa-diagram-project",
        count: store.state.procurementRules.length,
      },
      { key: "roles", label: "Roles", icon: "fa-users-gear" },
      { key: "configuration", label: "Settings", icon: "fa-sliders" },
      {
        key: "audit",
        label: "History",
        icon: "fa-shield-halved",
        count: store.state.procurementAudit.length,
      },
    ]);
    const requireAdmin = () => {
      if (canConfigure.value) return true;
      store.notice("Admin role required", "fa-shield-halved");
      return false;
    };
    const toggleWorkflow = (workflow) => {
      if (!requireAdmin()) return;
      workflow.status = workflow.status === "Active" ? "Paused" : "Active";
      store.procurementEvent(
        workflow,
        "Workflow " + workflow.status.toLowerCase(),
        workflow.name,
        workflow.status === "Active" ? "success" : "warning",
      );
    };
    const addWorkflow = () => {
      if (!requireAdmin()) return;
      const item = {
        id: window.ProcurementCommon.uid("wf"),
        name: workflowDraft.name,
        trigger: workflowDraft.trigger,
        status: "Active",
        runs: 0,
        successRate: 100,
        steps: workflowDraft.steps
          .split(/\n/)
          .map((item) => item.trim())
          .filter(Boolean),
      };
      store.state.procurementWorkflows.unshift(item);
      store.procurementEvent(item, "Workflow created", item.name, "success");
      Object.assign(workflowDraft, {
        name: "",
        trigger: "",
        steps: "Classify record\nAssign owner\nNotify next actor",
      });
      workflowOpen.value = false;
      store.notice("Workflow created");
    };
    const ruleIcon = (type) =>
      ({
        Approval: "fa-stamp",
        Exclusion: "fa-ban",
        Auction: "fa-gavel",
        Matching: "fa-link",
        "Supplier limit": "fa-users-slash",
        "Price threshold": "fa-dollar-sign",
      })[type] || "fa-diagram-project";
    const ruleTypeLabel = (type) =>
      ({ Auction: "Live bid", Matching: "Invoice check" })[type] || type;
    const toggleRule = (rule) => {
      if (!requireAdmin()) return;
      rule.enabled = !rule.enabled;
      store.procurementEvent(
        rule,
        rule.enabled ? "Rule enabled" : "Rule disabled",
        rule.name,
        rule.enabled ? "success" : "warning",
      );
    };
    const addRule = () => {
      if (!requireAdmin()) return;
      const item = {
        id: window.ProcurementCommon.uid("rule"),
        name: ruleDraft.name,
        type: ruleDraft.type,
        condition: ruleDraft.condition,
        action: ruleDraft.action,
        enabled: true,
        owner: store.currentUser.value.name,
      };
      store.state.procurementRules.unshift(item);
      store.procurementEvent(item, "Rule created", item.name, "success");
      Object.assign(ruleDraft, {
        name: "",
        type: "Approval",
        condition: "",
        action: "",
      });
      store.notice("Rule added");
    };
    const roleSurfaces = [
      "Overview",
      "Requests",
      "Quotes",
      "Orders",
      "Reports",
      "Settings",
    ];
    const roles = [
      {
        name: "Buyer",
        productRole: "Client",
        surfaces: ["Overview", "Requests", "Quotes", "Orders", "Reports"],
        job: "Turn a request into quotes, a supplier choice and an order.",
      },
      {
        name: "Approver",
        productRole: "Client / delegated",
        surfaces: ["Overview", "Requests", "Reports"],
        job: "Clear or escalate decisions with budget and policy context.",
      },
      {
        name: "Manager",
        productRole: "Admin",
        surfaces: [
          "Overview",
          "Requests",
          "Quotes",
          "Orders",
          "Reports",
          "Settings",
        ],
        job: "Manage rules, performance, risk and history.",
      },
      {
        name: "Supplier",
        productRole: "Freelancer / vendor",
        surfaces: ["Overview", "Quotes"],
        job: "Review invitations, submit offers and join live bid rounds.",
      },
    ];
    const rolePrinciples = [
      {
        title: "State before detail",
        detail: "The business stage is visible before a record is opened.",
        icon: "fa-eye",
      },
      {
        title: "One source of truth",
        detail: "Request, quotes, supplier choice and order remain linked.",
        icon: "fa-link",
      },
      {
        title: "Safe decisions",
        detail: "Important actions require confirmation and save the reason.",
        icon: "fa-shield-halved",
      },
      {
        title: "Focused controls",
        detail: "Each role sees only the actions needed for its work.",
        icon: "fa-user-shield",
      },
    ];
    const configuration = reactive({
      threeQuotes: true,
      approvalRouting: "3 levels",
      auctionExtension: true,
      matchTolerance: "2%",
      supplierReview: "Quarterly",
      defaultTerms: "Net 30",
      esgRequired: true,
      auditRetention: "7 years",
    });
    const configGroups = [
      {
        title: "Approval policy",
        description: "Budget and decision routing",
        icon: "fa-stamp",
        fields: [
          {
            key: "threeQuotes",
            label: "Competitive quote policy",
            note: "Require three quotes above threshold",
            type: "toggle",
          },
          {
            key: "approvalRouting",
            label: "Approval routing",
            note: "Amount-based decision levels",
            type: "select",
            options: ["2 levels", "3 levels", "4 levels"],
          },
        ],
      },
      {
        title: "Quote defaults",
        description: "Quote and supplier behavior",
        icon: "fa-file-signature",
        fields: [
          {
            key: "auctionExtension",
            label: "Last-minute extension",
            note: "Protect the final bidding window",
            type: "toggle",
          },
          {
            key: "defaultTerms",
            label: "Default payment terms",
            note: "Applied to new events",
            type: "select",
            options: ["Net 15", "Net 30", "Net 45", "Net 60"],
          },
        ],
      },
      {
        title: "Invoices & orders",
        description: "Receipt and invoice controls",
        icon: "fa-link",
        fields: [
          {
            key: "matchTolerance",
            label: "Invoice tolerance",
            note: "Creates an issue above this difference",
            type: "select",
            options: ["0%", "1%", "2%", "5%"],
          },
          {
            key: "auditRetention",
            label: "History retention",
            note: "How long activity is kept",
            type: "select",
            options: ["3 years", "5 years", "7 years", "10 years"],
          },
        ],
      },
      {
        title: "Suppliers",
        description: "Qualification, risk and sustainability",
        icon: "fa-building-circle-check",
        fields: [
          {
            key: "supplierReview",
            label: "Qualification review",
            note: "Preferred supplier cadence",
            type: "select",
            options: ["Monthly", "Quarterly", "Semiannual", "Annual"],
          },
          {
            key: "esgRequired",
            label: "Sustainability score",
            note: "Include it when comparing offers",
            type: "toggle",
          },
        ],
      },
    ];
    const configChanged = (field) => {
      const target = { id: "CONFIG", audit: [] };
      store.procurementEvent(
        target,
        "Configuration changed",
        `${field.label}: ${configuration[field.key]}`,
        "info",
      );
      store.notice("Configuration saved");
    };
    const nativeChecks = [
      "Requests, suppliers, products, orders and invoices use the same shared records.",
      "Every step links to the next without another menu.",
      "Copy creates an editable draft and keeps its source.",
      "Every flow preserves owner, next action and history.",
    ];
    const filteredAudit = computed(() => {
      const q = auditSearch.value.toLowerCase();
      return store.state.procurementAudit.filter(
        (item) =>
          !q ||
          [item.objectId, item.action, item.actor, item.detail, item.level]
            .join(" ")
            .toLowerCase()
            .includes(q),
      );
    });
    const exportAudit = () => {
      window.ProcurementCommon.download(
        "buyniverse-purchase-history.csv",
        window.ProcurementCommon.csv(filteredAudit.value, [
          "at",
          "objectId",
          "action",
          "actor",
          "detail",
          "level",
        ]),
        "text/csv",
      );
      store.notice("History exported");
    };
    return {
      store,
      tab,
      tabs,
      openTab,
      canConfigure,
      workflowOpen,
      workflowDraft,
      toggleWorkflow,
      addWorkflow,
      ruleDraft,
      ruleIcon,
      ruleTypeLabel,
      toggleRule,
      addRule,
      roleSurfaces,
      roles,
      rolePrinciples,
      configuration,
      configGroups,
      configChanged,
      nativeChecks,
      auditSearch,
      filteredAudit,
      exportAudit,
    };
  },
};
</script>
