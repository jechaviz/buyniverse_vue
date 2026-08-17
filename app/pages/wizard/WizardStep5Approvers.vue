<template>
  <div class="mx-auto max-w-2xl">
    <div>
      <p class="premium-kicker text-[11px] font-bold uppercase tracking-widest text-brand">Governance</p>
      <h2 class="font-head mt-1 text-2xl font-800 tracking-tight text-slate-900 dark:text-white">Approval chain</h2>
      <p class="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">Set the people who must approve the project before publication.</p>
    </div>
    <div class="mt-6 space-y-2">
      <article
        v-for="approver in orderedApprovers"
        :key="approver.userId"
        class="grid items-center gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-[5rem_1fr_9rem_auto] dark:bg-slate-800/60"
      >
        <label>
          <span class="mb-1 block text-[10px] font-bold">Level</span>
          <input v-model.number="approver.level" class="field py-1.5 text-center" type="number" min="1" required />
        </label>
        <b>{{ userName(approver.userId) }}</b>
        <label>
          <span class="mb-1 block text-[10px] font-bold">Role</span>
          <input v-model="approver.role" class="field py-1.5" placeholder="Approver role" required />
        </label>
        <button class="text-red-500" aria-label="Remove approver" @click="$emit('remove-approver', approver.userId)">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </article>
    </div>
    <select class="field mt-4" value="" @change="$emit('add-approver', $event.target.value); $event.target.value = '';">
      <option value="">Add an approver</option>
      <option v-for="person in availableApprovers" :key="person.id" :value="person.id">
        {{ person.name }} · {{ person.type }}
      </option>
    </select>
  </div>
</template>
<script>
export default {
  props: {
    orderedApprovers: Array,
    availableApprovers: Array,
    userName: Function,
  },
  emits: ["add-approver", "remove-approver"],
};
</script>
