<template>
  <aside v-if="selected" class="panel self-start overflow-hidden 2xl:sticky 2xl:top-15">
    <header class="border-b border-slate-200/70 p-5 dark:border-slate-700">
      <div class="flex items-start justify-between gap-3">
        <div>
          <span class="text-[10px] font-800 uppercase tracking-wider text-brand">{{ selected.id }}</span>
          <h2 class="mt-1 text-lg font-800">{{ selected.title }}</h2>
        </div>
        <span class="badge" :class="statusClass(selected.status)">{{ simpleStatus(selected.status) }}</span>
      </div>
      <p class="mt-2 text-xs leading-5 text-slate-500">{{ selected.notes }}</p>
    </header>
    <div class="grid grid-cols-2 gap-px bg-slate-200/70 dark:bg-slate-700">
      <div v-for="item in detailMetrics" :key="item.label" class="bg-white/90 p-3 dark:bg-slate-800/90">
        <span class="text-[10px] font-bold uppercase tracking-wide text-slate-400">{{ item.label }}</span>
        <b class="mt-1 block text-xs">{{ item.value }}</b>
      </div>
    </div>
    <div class="p-5">
      <h3 class="text-xs font-800 uppercase tracking-wide text-slate-500">Requested items</h3>
      <div class="mt-3 space-y-2">
        <div v-for="line in selected.items" :key="line.id" class="flex items-center justify-between gap-3 rounded-lg border border-slate-200/70 p-3 text-xs dark:border-slate-700">
          <div>
            <b>{{ line.description }}</b>
            <p class="mt-1 text-[10px] text-slate-500">{{ line.quantity }} × {{ formatMoney(line.unitPrice, selected.currency) }}</p>
          </div>
          <b>{{ formatMoney(line.quantity * line.unitPrice, selected.currency) }}</b>
        </div>
      </div>
    </div>
    <div class="border-t border-slate-200/70 p-4 dark:border-slate-700">
      <div class="flex flex-wrap gap-2">
        <button v-if="selected.status === 'Draft' && canOwn" class="btn-brand" @click="$emit('submit')">
          <i class="fa-solid fa-paper-plane mr-1.5"></i>Submit
        </button>
        <template v-if="selected.status === 'Pending approval' && canApprove">
          <button class="btn-brand" @click="$emit('approve')"><i class="fa-solid fa-check mr-1.5"></i>Approve</button>
          <button class="btn-muted" @click="$emit('request-info')"><i class="fa-solid fa-comment-dots mr-1.5"></i>Ask details</button>
          <button class="btn-muted text-rose-600 dark:text-rose-400" @click="$emit('reject')"><i class="fa-solid fa-xmark mr-1.5"></i>Reject</button>
        </template>
        <button v-if="selected.status === 'Approved' && !selected.sourcingEventId && canOwn" class="btn-brand" @click="$emit('create-rfx')">
          <i class="fa-solid fa-file-signature mr-1.5"></i>Request quotes
        </button>
        <RouterLink v-if="selected.sourcingEventId" :to="`/procurement/sourcing?event=${selected.sourcingEventId}`" class="btn-muted">
          <i class="fa-solid fa-file-signature mr-1.5"></i>View RFX
        </RouterLink>
      </div>
    </div>
  </aside>
</template>
<script>
export default {
  props: {
    selected: Object,
    canOwn: Boolean,
    canApprove: Boolean,
    detailMetrics: Array,
    statusClass: Function,
    simpleStatus: Function,
    formatMoney: Function,
  },
  emits: ["submit", "approve", "request-info", "reject", "create-rfx"],
};
</script>
