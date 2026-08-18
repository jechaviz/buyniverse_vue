<template>
  <section class="space-y-6">
    <header class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="premium-kicker text-[11px] font-bold uppercase tracking-widest text-brand">
          Dashboard
        </p>
        <h1 class="font-head mt-1 text-2xl sm:text-3xl font-800 tracking-tight text-slate-900 dark:text-white">
          {{ titles[section] }}
        </h1>
        <p class="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">{{ copies[section] }}</p>
      </div>
      <RouterLink
        v-if="store.isBuyer.value || store.isAdmin.value || user.type === 'Client'"
        class="btn-brand text-xs sm:text-sm py-2 px-4"
        to="/post-job/new"
        ><i class="fa-solid fa-plus mr-2"></i>Post a job</RouterLink
      >
      <RouterLink
        v-else
        class="btn-brand text-xs sm:text-sm py-2 px-4"
        to="/"
        ><i class="fa-solid fa-briefcase mr-2"></i>Find work</RouterLink
      >
    </header>
    <nav class="panel flex gap-1.5 overflow-x-auto p-1.5 bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl">
      <RouterLink
        v-for="x in tabs"
        :key="x.key"
        :to="x.to"
        class="whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold transition-all"
        :class="section === x.key ? 'bg-white text-brand shadow-xs dark:bg-slate-800 dark:text-brand-200' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'"
        >{{ x.label }}</RouterLink
      >
    </nav>
    <template v-if="section === 'overview'">
      <!-- 4 Metric Cards Row -->
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article
          v-for="card in cards"
          :key="card.label"
          class="premium-card rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/80"
        >
          <div class="flex items-center justify-between">
            <p class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{{ card.label }}</p>
            <span class="grid h-8 w-8 place-items-center rounded-xl bg-brand-50 text-brand dark:bg-brand/15 text-xs">
              <i class="fa-solid" :class="card.icon || 'fa-chart-simple'"></i>
            </span>
          </div>
          <p class="font-head mt-3 text-2xl sm:text-3xl font-800 tracking-tight text-slate-900 dark:text-white">{{ card.value }}</p>
          <p class="mt-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
            <span class="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            {{ card.note }}
          </p>
        </article>
      </div>

      <!-- Admin Database Management & MySQL Demo Seeder -->
      <AdminDatabaseCard v-if="store.isAdmin.value || user.type === 'Admin'" />

      <!-- Recent Workspaces -->
      <article
        class="panel grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center rounded-2xl border border-slate-200/80 dark:border-slate-800/80"
      >
        <div>
          <div class="flex items-center justify-between gap-3">
            <div>
              <p
                class="premium-kicker text-[10px] font-800 uppercase tracking-wider text-brand"
              >
                Continue working
              </p>
              <h2 class="font-head mt-0.5 font-800 text-base text-slate-900 dark:text-white">Recent workspaces</h2>
            </div>
            <span class="text-[10px] font-semibold text-slate-400 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full"
              ><i class="fa-solid fa-shield-halved mr-1 text-emerald-500"></i>15
              min privacy lock</span
            >
          </div>
          <div v-if="recent.length" class="mt-3.5 flex flex-wrap gap-2">
            <RouterLink
              v-for="item in recent"
              :key="item.path"
              :to="item.path"
              class="rounded-xl border border-slate-200/90 bg-slate-50/70 px-3 py-2 text-xs font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-slate-700/80 dark:bg-slate-800/60 dark:text-slate-200 shadow-xs transition"
              ><i
                class="fa-solid fa-clock-rotate-left mr-2 text-[10px] text-slate-400"
              ></i
              >{{ item.label }}</RouterLink
            >
          </div>
          <p v-else class="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Open a project, invoice or request and it will appear here.
          </p>
        </div>
        <div class="flex flex-wrap gap-2 lg:justify-end">
          <RouterLink
            v-for="action in quickActions"
            :key="action.to"
            :to="action.to"
            class="btn-muted whitespace-nowrap text-xs py-2 px-3.5"
            ><i class="fa-solid mr-1.5 text-xs" :class="action.icon"></i
            >{{ action.label }}</RouterLink
          >
        </div>
      </article>
      <div class="grid gap-6 lg:grid-cols-2">
        <article class="panel p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 class="font-head font-800 text-sm tracking-tight text-slate-900 dark:text-white">Active contracts</h2>
            <span class="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold text-slate-500">{{ contracts.length }} active</span>
          </div>
          <div class="mt-4 space-y-2.5">
            <RouterLink
              v-for="x in contracts"
              :key="x.id"
              :to="`/contract/${x.id}`"
              class="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 transition hover:border-slate-200 hover:bg-slate-100/70 dark:border-slate-800 dark:bg-slate-800/50 dark:hover:bg-slate-800"
              ><span class="min-w-0 pr-3"
                ><b class="block truncate text-xs font-bold text-slate-900 dark:text-white">{{ store.job(x.sourceId)?.title }}</b
                ><span class="mt-1 inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  {{ x.status }}
                </span></span
              ><b class="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">{{ store.money(x.amount) }}</b></RouterLink
            >
            <p v-if="!contracts.length" class="p-6 text-center text-xs text-slate-400">No active contracts.</p>
          </div>
        </article>
        <article class="panel p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 class="font-head font-800 text-sm tracking-tight text-slate-900 dark:text-white">Recent activity</h2>
            <RouterLink to="/dashboard/transactions" class="text-xs font-semibold text-brand hover:underline">View all</RouterLink>
          </div>
          <div class="mt-4 space-y-2.5">
            <div
              v-for="x in transactions.slice(0, 5)"
              :key="x.id"
              class="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/30"
            >
              <div class="min-w-0 pr-3">
                <span class="block truncate font-semibold text-slate-800 dark:text-slate-200">{{ x.description }}</span>
                <span class="text-[10px] text-slate-400">{{ store.date(x.date) }}</span>
              </div>
              <b class="font-mono font-bold" :class="x.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'">{{ store.money(x.amount) }}</b>
            </div>
            <p v-if="!transactions.length" class="p-6 text-center text-xs text-slate-400">No recent activity.</p>
          </div>
        </article>
      </div></template
    >
    <article v-else-if="section === 'timesheets'" class="panel overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
      <div
        class="grid grid-cols-[8rem_1fr_9rem_5rem] gap-3 bg-slate-50/80 p-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-800"
      >
        <span>Date</span><span>Work</span><span>Project</span><span class="text-right">Hours</span>
      </div>
      <div
        v-for="x in times"
        :key="x.id"
        class="grid grid-cols-[8rem_1fr_9rem_5rem] gap-3 border-b border-slate-100 p-4 text-xs dark:border-slate-800/80 items-center hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition"
      >
        <span class="text-slate-500 font-medium">{{ store.date(x.date) }}</span
        ><span class="font-semibold text-slate-800 dark:text-slate-200">{{ x.memo }}</span
        ><RouterLink class="text-brand font-semibold hover:underline" :to="`/contract/${x.contractId}`"
          >Contract</RouterLink
        ><b class="text-right font-mono font-bold">{{ x.hours }}</b>
      </div>
      <p v-if="!times.length" class="p-8 text-center text-xs text-slate-400">
        No time entries.
      </p>
    </article>
    <article
      v-else-if="section === 'transactions'"
      class="panel overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80"
    >
      <div
        v-for="x in transactions"
        :key="x.id"
        class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 text-xs dark:border-slate-800/80 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition"
      >
        <div>
          <b class="font-bold text-slate-800 dark:text-slate-100">{{ x.description }}</b>
          <p class="mt-0.5 text-[11px] text-slate-400">
            {{ x.type }} · {{ store.date(x.date) }}
          </p>
        </div>
        <b class="font-mono text-sm font-bold" :class="x.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'">{{
          store.money(x.amount)
        }}</b>
      </div>
      <p v-if="!transactions.length" class="p-8 text-center text-xs text-slate-400">
        No transactions.
      </p>
    </article>
    <article v-else-if="section === 'my-agency'" class="panel p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
      <template v-if="agency"
        ><div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p class="text-xs font-bold uppercase tracking-wider text-brand">Agency workspace</p>
            <h2 class="font-head mt-1 text-2xl font-800 tracking-tight text-slate-900 dark:text-white">{{ agency.name }}</h2>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ agency.tagline }}</p>
          </div>
          <RouterLink class="btn-brand text-xs py-2 px-4" :to="`/agency/${agency.id}`"
            >Manage agency</RouterLink
          >
        </div>
        <div class="mt-6 flex flex-wrap gap-2">
          <span
            v-for="m in agency.members"
            :key="m.userId"
            class="badge rounded-xl border border-slate-200/80 bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >{{ store.user(m.userId)?.name }} · {{ m.role }}</span
          >
        </div></template
      >
      <p v-else class="text-slate-400 text-xs">
        This account does not belong to an agency.
      </p>
    </article>
  </section>
</template>
<script>
const { inject, computed } = Vue;
const { useRoute } = VueRouter;
const load = (p) => Vue.defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(p, window.sfcOptions));
const AdminDatabaseCard = load("./app/pages/dashboard/AdminDatabaseCard.vue?v=1");

export default {
  components: { AdminDatabaseCard },
  setup() {
    const store = inject("store"),
      route = useRoute(),
      user = store.currentUser;
    const section = computed(() =>
      ["timesheets", "transactions", "my-agency"].includes(route.params.section)
        ? route.params.section
        : "overview",
    );
    const tabs = [
      { key: "overview", label: "Overview", to: "/dashboard" },
      { key: "timesheets", label: "Timesheets", to: "/dashboard/timesheets" },
      {
        key: "transactions",
        label: "Transactions",
        to: "/dashboard/transactions",
      },
      { key: "my-agency", label: "My agency", to: "/dashboard/my-agency" },
    ];
    const contracts = computed(() =>
      store.state.contracts.filter(
        (x) => x.clientId === user.value.id || x.providerId === user.value.id,
      ),
    );
    const times = computed(() =>
      store.state.timeEntries.filter(
        (x) =>
          x.userId === user.value.id ||
          contracts.value.some((c) => c.id === x.contractId),
      ),
    );
    const transactions = computed(() =>
      store.state.transactions.filter((x) => x.userId === user.value.id),
    );
    const agency = computed(() =>
      store.state.agencies.find((x) => x.id === user.value.agencyId),
    );
    const cards = computed(() => [
      {
        label: "Active contracts",
        value: contracts.value.length,
        note: "Current engagements",
      },
      {
        label: "Total value",
        value: store.money(contracts.value.reduce((n, x) => n + x.amount, 0)),
        note: "Contracted volume",
      },
      {
        label: "Hours logged",
        value: times.value.reduce((n, x) => n + x.hours, 0),
        note: "Across all projects",
      },
      {
        label: "Unread updates",
        value: store.unreadNotifications(user.value.id).length,
        note: "Notifications",
      },
    ]);
    const recent = computed(() => {
      const seen = new Set();
      return (store.state.recentViews || [])
        .filter(
          (item) => item.userId === user.value.id && item.path !== "/dashboard",
        )
        .map((item) => {
          const path = item.path.includes("?new=1")
            ? item.path.split("?")[0]
            : item.path;
          const label = path.startsWith("/procurement/queue")
            ? "Purchase requests"
            : path.startsWith("/procurement/sourcing")
              ? "Quote rounds"
              : item.label;
          return { ...item, path, label };
        })
        .filter((item) => {
          if (seen.has(item.path)) return false;
          seen.add(item.path);
          return true;
        })
        .slice(0, 4);
    });
    const quickActions = computed(() =>
      store.isSupplier.value
        ? [
            { to: "/", label: "Find work", icon: "fa-briefcase" },
            {
              to: "/procurement/auction",
              label: "Live offers",
              icon: "fa-gavel",
            },
            {
              to: "/invoices/new",
              label: "New invoice",
              icon: "fa-file-circle-plus",
            },
          ]
        : [
            { to: "/post-job/new", label: "New project", icon: "fa-plus" },
            {
              to: "/procurement/queue?new=1",
              label: "New request",
              icon: "fa-cart-plus",
            },
            {
              to: "/procurement/sourcing?new=1",
              label: "New quote round",
              icon: "fa-file-signature",
            },
          ],
    );
    return {
      store,
      user,
      section,
      tabs,
      contracts,
      times,
      transactions,
      agency,
      cards,
      recent,
      quickActions,
      titles: {
        overview: "Your workspace",
        timesheets: "Timesheets",
        transactions: "Transactions",
        "my-agency": "My agency",
      },
      copies: {
        overview: "A compact view of work, money and activity.",
        timesheets: "Recorded delivery time across contracts.",
        transactions: "A complete ledger of demo activity.",
        "my-agency": "Members, capabilities and shared delivery.",
      },
    };
  },
};
</script>
