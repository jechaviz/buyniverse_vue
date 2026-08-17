<template>
  <div class="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_330px]">
    <div class="overflow-x-auto rounded-xl border border-slate-200/70 dark:border-slate-700">
      <table class="w-full min-w-170 text-left text-xs">
        <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 dark:bg-slate-800">
          <tr>
            <th class="px-4 py-3">Rank</th>
            <th class="px-4 py-3">Supplier</th>
            <th class="px-4 py-3 text-right">Current offer</th>
            <th class="px-4 py-3 text-right">Bids</th>
            <th class="px-4 py-3">Risk</th>
            <th class="px-4 py-3">Auto-bid</th>
            <th v-if="isOrganizer" class="px-4 py-3">Control</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
          <tr
            v-for="participant in rankedParticipants"
            :key="participant.supplierId"
            :class="participant.disqualified ? 'opacity-50' : ''"
          >
            <td class="px-4 py-3">
              <span
                class="grid h-7 w-7 place-items-center rounded-lg font-800"
                :class="participant.rank === 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 dark:bg-slate-700'"
              >
                {{ participant.rank }}
              </span>
            </td>
            <td class="px-4 py-3">
              <b>{{ participant.name }}</b>
              <p class="mt-1 text-[10px] text-slate-400">{{ supplierStatus(participant.supplierId) }}</p>
            </td>
            <td class="px-4 py-3 text-right font-800">
              {{ participant.lastBid ? formatMoney(participant.lastBid, currency) : "—" }}
            </td>
            <td class="px-4 py-3 text-right">{{ participant.bidCount }}</td>
            <td class="px-4 py-3">
              <span :class="participant.risk > 35 ? 'text-rose-500' : 'text-emerald-500'">{{ participant.risk }}</span>
            </td>
            <td class="px-4 py-3">{{ participant.autoBid ? "On" : "Off" }}</td>
            <td v-if="isOrganizer" class="px-4 py-3">
              <button
                class="text-[10px] font-bold"
                :class="participant.disqualified ? 'text-emerald-500' : 'text-rose-500'"
                @click="$emit('toggle-disqualified', participant)"
              >
                {{ participant.disqualified ? "Reinstate" : "Disqualify" }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <aside class="rounded-xl border border-slate-200/70 p-4 dark:border-slate-700">
      <span class="text-[10px] font-800 uppercase tracking-wide text-brand">Leading supplier</span>
      <h3 class="mt-2 text-lg font-800">{{ leader?.name }}</h3>
      <div class="mt-4 grid grid-cols-2 gap-2 text-center">
        <div class="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
          <b class="block text-lg">{{ leader?.bidCount }}</b>
          <small class="text-[9px] text-slate-400">Bids</small>
        </div>
        <div class="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
          <b class="block text-lg">{{ leader?.risk }}</b>
          <small class="text-[9px] text-slate-400">Risk</small>
        </div>
      </div>
      <p class="mt-4 text-xs leading-5 text-slate-500">Ranking remains provisional until the round ends.</p>
    </aside>
  </div>
</template>
<script>
export default {
  props: {
    rankedParticipants: Array,
    leader: Object,
    isOrganizer: Boolean,
    currency: String,
    formatMoney: Function,
    supplierStatus: Function,
  },
  emits: ["toggle-disqualified"],
};
</script>
