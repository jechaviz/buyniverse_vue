<template>
  <section class="panel overflow-hidden">
    <div class="border-b border-slate-100 p-5 dark:border-slate-700">
      <h2 class="font-800">Milestones</h2>
    </div>
    <div v-if="milestones.length" class="divide-y divide-slate-100 dark:divide-slate-700">
      <article v-for="milestone in milestones" :key="milestone.id" class="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <b>{{ milestone.title }}</b>
          <p class="mt-1 text-sm text-slate-500">
            Due {{ formatDate(milestone.dueDate) }} · {{ formatMoney(milestone.amount, job.currency) }}
          </p>
        </div>
        <div class="flex items-center gap-3">
          <span class="badge bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">{{ milestone.status }}</span>
          <button class="btn-muted" @click="$emit('open-milestone', milestone)">
            View tasks <i class="fa-solid fa-arrow-right ml-1 text-xs"></i>
          </button>
          <button
            v-if="isOwner && milestone.status === 'Funded'"
            class="btn-brand"
            @click="$emit('release', milestone)"
          >
            Release funds
          </button>
        </div>
      </article>
    </div>
    <p v-else class="p-10 text-center text-sm text-slate-500">No milestones yet.</p>
  </section>
</template>
<script>
export default {
  props: {
    job: Object,
    milestones: Array,
    isOwner: Boolean,
    formatDate: Function,
    formatMoney: Function,
  },
  emits: ["open-milestone", "release"],
};
</script>
