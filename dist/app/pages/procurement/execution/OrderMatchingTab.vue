<template>
  <div class="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_360px]">
    <div>
      <h3 class="text-sm font-800">Invoice check</h3>
      <p class="mt-1 text-xs text-slate-500">Order, receipt and invoice must agree before close.</p>
      <div class="mt-4 grid gap-3 md:grid-cols-3">
        <article
          v-for="document in matchDocuments"
          :key="document.label"
          class="rounded-xl border p-4"
          :class="document.ready ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-500/30 dark:bg-emerald-500/8' : 'border-amber-200 bg-amber-50/40 dark:border-amber-500/30 dark:bg-amber-500/8'"
        >
          <div class="flex items-center justify-between">
            <span
              class="grid h-9 w-9 place-items-center rounded-lg"
              :class="document.ready ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'"
            >
              <i class="fa-solid" :class="document.icon"></i>
            </span>
            <i class="fa-solid" :class="document.ready ? 'fa-circle-check text-emerald-500' : 'fa-clock text-amber-500'"></i>
          </div>
          <b class="mt-4 block text-sm">{{ document.label }}</b>
          <p class="mt-1 text-[10px] text-slate-500">{{ document.detail }}</p>
        </article>
      </div>
      <div class="mt-5 rounded-xl border border-slate-200/70 p-4 dark:border-slate-700">
        <div class="flex items-center justify-between">
          <h4 class="text-xs font-800">Allowed difference</h4>
          <span class="badge bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">±2%</span>
        </div>
        <p class="mt-2 text-[11px] leading-5 text-slate-500">Larger quantity or price differences create an issue for review.</p>
      </div>
      <div class="mt-4 rounded-xl border border-slate-200/70 p-4 dark:border-slate-700">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 class="text-xs font-800">Supplier invoice</h4>
            <p class="mt-1 text-[11px] text-slate-500">Attach the fiscal invoice before confirming the three-way match.</p>
          </div>
          <span class="text-[10px] font-bold text-slate-400">{{ invoices.length }} available</span>
        </div>
        <div class="mt-3 flex flex-col gap-2 sm:flex-row">
          <select :value="selectedInvoiceId" class="field min-w-0 flex-1 text-xs" @change="$emit('update:selected-invoice-id', $event.target.value)">
            <option value="">Select an invoice</option>
            <option v-for="invoice in invoices" :key="invoice.id" :value="invoice.id">{{ invoice.id }} · {{ formatMoney(invoice.total, invoice.currency) }}</option>
          </select>
          <button class="btn-muted whitespace-nowrap text-xs" :disabled="!selectedInvoiceId" @click="$emit('attach-invoice')"><i class="fa-solid fa-paperclip mr-1"></i>Attach</button>
        </div>
      </div>
    </div>
    <aside class="rounded-xl bg-slate-950 p-5 text-white">
      <span class="text-[10px] font-800 uppercase tracking-wide text-brand-100">Check result</span>
      <h3 class="mt-2 text-xl font-800">{{ matchReady ? "Ready to confirm" : "Information missing" }}</h3>
      <p class="mt-2 text-xs leading-5 text-slate-400">
        {{ matchReady ? "Order, receipt and invoice agree." : "Receive all items, attach the invoice and resolve open issues." }}
      </p>
      <button
        class="mt-5 w-full rounded-lg bg-white px-3 py-2.5 text-xs font-800 text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="!matchReady"
        @click="$emit('run-match')"
      >
        <i class="fa-solid fa-link mr-1"></i>Confirm
      </button>
    </aside>
  </div>
</template>
<script>
export default {
  props: {
    matchDocuments: Array,
    matchReady: Boolean,
    invoices: { type: Array, default: () => [] },
    selectedInvoiceId: String,
    formatMoney: Function,
  },
  emits: ["run-match", "attach-invoice", "update:selected-invoice-id"],
};
</script>
