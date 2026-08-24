<template>
  <div class="p-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 class="text-sm font-800">Offers</h3>
        <p class="mt-1 text-xs text-slate-500">All supplier offers use the same items.</p>
      </div>
      <div class="flex gap-2">
        <button class="btn-muted" @click="$emit('export')">
          <i class="fa-solid fa-file-csv mr-1.5"></i>Export CSV
        </button>
        <button v-if="allowSimulation" class="btn-brand" @click="$emit('simulate')">
          <i class="fa-solid fa-flask mr-1.5"></i>Add demo offer
        </button>
      </div>
    </div>
    <div class="mt-4 overflow-x-auto rounded-xl border border-slate-200/70 dark:border-slate-700">
      <table class="w-full min-w-230 text-left text-xs">
        <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 dark:bg-slate-800">
          <tr>
            <th class="px-4 py-3">Supplier</th>
            <th v-for="lot in event.lots" :key="lot.id" class="px-4 py-3">{{ lot.description }}</th>
            <th class="px-4 py-3 text-right">Total</th>
            <th class="px-4 py-3">Lead</th>
            <th class="px-4 py-3">Terms</th>
            <th class="px-4 py-3">Compliance</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
          <tr v-for="quote in event.quotes" :key="quote.id">
            <td class="px-4 py-3">
              <b>{{ supplierName(quote.supplierId) }}</b>
              <p class="mt-1 text-[10px] text-slate-400">{{ quote.submittedAt ? formatDate(quote.submittedAt) : 'Draft' }}</p>
            </td>
            <td v-for="lot in event.lots" :key="lot.id" class="px-4 py-3">
              {{ formatMoney(quote.price / event.lots.length, event.currency) }}
            </td>
            <td class="px-4 py-3 text-right font-bold">{{ formatMoney(quote.price, event.currency) }}</td>
            <td class="px-4 py-3">{{ quote.leadDays }}d</td>
            <td class="px-4 py-3">{{ quote.terms }}</td>
            <td class="px-4 py-3">
              <span
                class="badge"
                :class="quote.compliant ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'"
              >
                {{ quote.compliant ? 'Compliant' : 'Exception' }}
              </span>
            </td>
          </tr>
          <tr v-if="!event.quotes.length">
            <td :colspan="event.lots.length + 5" class="p-12 text-center text-slate-400">
              <i class="fa-solid fa-file-circle-question text-2xl"></i>
              <p class="mt-2 text-sm font-bold">No supplier responses yet</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
<script>
export default {
  props: {
    event: Object,
    supplierName: Function,
    formatMoney: Function,
    formatDate: Function,
    allowSimulation: Boolean,
  },
  emits: ["export", "simulate"],
};
</script>
