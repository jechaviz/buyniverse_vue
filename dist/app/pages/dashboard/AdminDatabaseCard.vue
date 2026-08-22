<template>
  <article class="panel space-y-5 rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-card dark:border-slate-800/80 dark:bg-slate-900/90">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
      <div class="flex items-center gap-3">
        <span class="grid h-10 w-10 place-items-center rounded-2xl bg-brand-50 text-brand font-bold text-sm dark:bg-brand/20">
          <i class="fa-solid fa-flask"></i>
        </span>
        <div>
          <div class="flex items-center gap-2">
            <h2 class="font-head text-base font-800 text-slate-900 dark:text-white">{{ store.t("Workspace state") }}</h2>
            <span class="badge border border-sky-200 bg-sky-50 text-[10px] font-bold text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300">
              <i class="fa-solid fa-shield-halved mr-1"></i>{{ store.t("SERVER") }}
            </span>
          </div>
          <p class="text-xs text-slate-400">{{ store.t("Workspace changes are encrypted and saved on the server.") }} {{ store.t("Last refreshed") }}: {{ store.date(refreshedAt) }}</p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button type="button" class="btn-muted px-3.5 py-2 text-xs" @click="refreshSummary">
          <i class="fa-solid fa-arrows-rotate mr-1.5"></i>{{ store.t("Refresh summary") }}
        </button>
        <button type="button" class="btn-brand px-4 py-2 text-xs" @click="restoreDemo">
          <i class="fa-solid fa-rotate-left mr-1.5"></i>{{ store.t("Restore demo data") }}
        </button>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3 text-center sm:grid-cols-3 lg:grid-cols-6">
      <div v-for="item in summary" :key="item.label" class="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
        <span class="block text-[10px] font-bold uppercase tracking-wider text-slate-400">{{ store.t(item.label) }}</span>
        <b class="font-mono text-lg font-800 text-slate-900 dark:text-white">{{ item.count }}</b>
      </div>
    </div>
  </article>
</template>
<script>
const { computed, inject, ref } = Vue;

export default {
  setup() {
    const store = inject("store");
    const refreshedAt = ref(new Date().toISOString());
    const summary = computed(() => {
      const jobs = Array.isArray(store.state.jobs) ? store.state.jobs : [];
      const contracts = Array.isArray(store.state.contracts) ? store.state.contracts : [];
      return [
        { label: "Users", count: store.state.users?.length || 0 },
        { label: "Jobs", count: jobs.length },
        { label: "Proposals", count: jobs.reduce((total, job) => total + (Array.isArray(job.proposals) ? job.proposals.length : 0), 0) },
        { label: "Contracts", count: contracts.length },
        { label: "Milestones", count: contracts.reduce((total, contract) => total + (Array.isArray(contract.milestones) ? contract.milestones.length : 0), 0) },
        { label: "Invoices", count: store.state.invoices?.length || 0 },
      ];
    });

    const refreshSummary = () => {
      refreshedAt.value = new Date().toISOString();
      store.notice("Demo summary refreshed", "fa-laptop");
    };

    const restoreDemo = async () => {
      await store.reset();
      refreshedAt.value = new Date().toISOString();
    };

    return { store, refreshedAt, summary, refreshSummary, restoreDemo };
  },
};
</script>
