<template>
  <div class="mx-auto max-w-2xl">
    <div>
      <p class="premium-kicker text-[11px] font-bold uppercase tracking-widest text-brand">Collaboration</p>
      <h2 class="font-head mt-1 text-2xl font-800 tracking-tight text-slate-900 dark:text-white">Project team</h2>
      <p class="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">Add workspace members and define what they can do.</p>
    </div>
    <div class="mt-6 space-y-2">
      <article
        v-for="member in project.team"
        :key="member.userId"
        class="grid items-center gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1fr_9rem_7rem_auto] dark:bg-slate-800/60"
      >
        <b>{{ userName(member.userId) }}</b>
        <label>
          <span class="mb-1 block text-[10px] font-bold">Role</span>
          <input v-model="member.role" class="field py-1.5" placeholder="Role" required />
        </label>
        <label>
          <span class="mb-1 block text-[10px] font-bold">Access</span>
          <select v-model="member.permission" class="field py-1.5" required>
            <option value="view">View</option>
            <option value="edit">Edit</option>
          </select>
        </label>
        <button class="text-red-500" aria-label="Remove team member" @click="$emit('remove-team', member.userId)">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </article>
    </div>
    <select class="field mt-4" value="" @change="$emit('add-team', $event.target.value); $event.target.value = '';">
      <option value="">Add a team member</option>
      <option v-for="person in availableTeam" :key="person.id" :value="person.id">
        {{ person.name }} · {{ person.type }}
      </option>
    </select>
  </div>
</template>
<script>
export default {
  props: {
    project: Object,
    availableTeam: Array,
    userName: Function,
  },
  emits: ["add-team", "remove-team"],
};
</script>
