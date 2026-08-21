<template>
  <div>
    <section v-if="contract && allowed" class="space-y-6">
      <header class="flex flex-wrap justify-between gap-4">
        <div>
          <p class="premium-kicker text-xs font-bold uppercase text-brand">Contract · {{ contract.status }}</p>
          <h1 class="premium-title mt-2 text-3xl font-800">{{ job?.title }}</h1>
          <p class="mt-2 text-slate-500">{{ store.user(contract.clientId)?.name }} ↔ {{ store.user(contract.providerId)?.name }} · {{ store.money(contract.amount) }}</p>
        </div>
        <RouterLink class="btn-muted" to="/messages"><i class="fa-solid fa-comments mr-2"></i>Open messages</RouterLink>
      </header>

      <div class="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <main class="space-y-5">
          <article class="panel p-6">
            <h2 class="font-800">Milestones</h2>
            <div class="mt-4 divide-y divide-slate-100 dark:divide-slate-700">
              <div v-for="milestone in contract.milestones" :key="milestone.id" class="py-4">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div><b>{{ milestone.title }}</b><p class="text-sm text-slate-500">Due {{ store.date(milestone.dueDate) }} · {{ store.money(milestone.amount) }}</p></div>
                  <div class="flex items-center gap-2"><span class="badge bg-slate-100 text-slate-600 dark:bg-slate-700">{{ milestone.status }}</span><button v-if="milestone.status==='Funded' && isClient" class="btn-brand" @click="store.release(contract,milestone)">Release</button></div>
                </div>
                <ul v-if="milestone.tasks?.length" class="mt-3 space-y-2"><li v-for="task in milestone.tasks" :key="task.id" class="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800"><span>{{ task.title }}</span><b>{{ task.status }}</b></li></ul>
              </div>
            </div>
          </article>

          <article class="panel p-6">
            <div class="flex justify-between"><h2 class="font-800">Timesheet</h2><b>{{ totalHours }} h</b></div>
            <div class="mt-4 space-y-2"><div v-for="entry in entries" :key="entry.id" class="grid grid-cols-[7rem_1fr_4rem] gap-3 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800"><span>{{ store.date(entry.date) }}</span><span>{{ entry.memo }}</span><b>{{ entry.hours }} h</b></div></div>
            <form v-if="isProvider" class="mt-4 grid items-end gap-3 sm:grid-cols-[8rem_1fr_auto]" @submit.prevent="logTime">
              <label><span class="mb-1 block text-xs font-bold">Hours</span><input v-model.number="time.hours" type="number" min="0.25" max="24" step="0.25" class="field" required></label>
              <label><span class="mb-1 block text-xs font-bold">Work performed</span><input v-model.trim="time.memo" class="field" required></label>
              <button class="btn-muted">Log time</button>
            </form>
          </article>
        </main>
        <aside><article class="panel p-5"><h2 class="font-800">Contract summary</h2><dl class="mt-4 space-y-3 text-sm"><div class="flex justify-between"><dt class="text-slate-500">Released</dt><dd class="font-bold">{{ store.money(released) }}</dd></div><div class="flex justify-between"><dt class="text-slate-500">Funded</dt><dd class="font-bold">{{ store.money(funded) }}</dd></div><div class="flex justify-between"><dt class="text-slate-500">Hours</dt><dd class="font-bold">{{ totalHours }}</dd></div></dl></article></aside>
      </div>
    </section>
    <section v-else class="panel p-8 text-center"><i class="fa-solid fa-lock text-3xl text-slate-400"></i><h1 class="mt-4 text-xl font-800">Contract unavailable</h1><RouterLink to="/projects" class="btn-brand mt-5">Return to projects</RouterLink></section>
  </div>
</template>

<script>
const { inject, computed, reactive } = Vue;
const { useRoute } = VueRouter;

export default {
  setup() {
    const store = inject('store');
    const route = useRoute();
    const contract = computed(() => store.contract(route.params.contractId));
    const allowed = computed(() => Boolean(contract.value) && (store.isAdmin.value || [contract.value.clientId, contract.value.providerId].includes(store.currentUser.value.id)));
    const job = computed(() => store.job(contract.value?.sourceId));
    const entries = computed(() => allowed.value ? store.state.timeEntries.filter(entry => entry.contractId === contract.value?.id) : []);
    const totalHours = computed(() => entries.value.reduce((sum, entry) => sum + Number(entry.hours || 0), 0));
    const released = computed(() => contract.value?.milestones.filter(item => item.status === 'Released').reduce((sum, item) => sum + item.amount, 0) || 0);
    const funded = computed(() => contract.value?.milestones.filter(item => item.status === 'Funded').reduce((sum, item) => sum + item.amount, 0) || 0);
    const isClient = computed(() => contract.value?.clientId === store.currentUser.value.id && (store.isBuyer.value || store.isAdmin.value));
    const isProvider = computed(() => contract.value?.providerId === store.currentUser.value.id);
    const time = reactive({ hours: 1, memo: '' });

    function logTime() {
      const hours = Number(time.hours);
      const memo = window.WebCommon.sanitizeText(time.memo, 500).trim();
      if (!isProvider.value || !Number.isFinite(hours) || hours < 0.25 || hours > 24 || !memo) return store.notice('Enter valid hours and work performed', 'fa-triangle-exclamation');
      store.state.timeEntries.unshift({ id: window.ProcurementCommon.uid('time'), contractId: contract.value.id, userId: store.currentUser.value.id, date: new Date().toISOString(), hours, memo });
      time.memo = '';
      store.notice('Time logged');
    }

    return { store, contract, allowed, job, entries, totalHours, released, funded, isClient, isProvider, time, logTime };
  }
};
</script>
