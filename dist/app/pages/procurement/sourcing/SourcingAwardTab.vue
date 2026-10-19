<template>
  <div class="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_360px]">
    <div>
      <h3 class="text-sm font-800">Choose supplier</h3>
      <p class="mt-1 text-xs text-slate-500">The supplier and reason are saved in history.</p>
      <div class="mt-4 grid gap-3 md:grid-cols-2">
        <button
          v-for="quote in rankedQuotes"
          :key="quote.id"
          class="rounded-xl border p-4 text-left"
          :class="awardSupplierId === quote.supplierId ? 'border-brand bg-brand-50/60 dark:bg-brand/10' : 'border-slate-200/70 dark:border-slate-700'"
          @click="$emit('update:awardSupplierId', quote.supplierId)"
        >
          <div class="flex justify-between gap-3">
            <div>
              <b class="text-sm">{{ supplierName(quote.supplierId) }}</b>
              <p class="mt-1 text-[10px] text-slate-500">
                {{ formatMoney(quote.price, event.currency) }} · {{ quote.leadDays }} days
              </p>
            </div>
            <span class="text-xl font-800 text-brand">{{ quote.score }}</span>
          </div>
        </button>
      </div>
      <label class="mt-5 block">
        <span class="mb-1.5 block text-xs font-bold">Why this supplier?</span>
        <textarea
          :value="awardReason"
          class="field min-h-32"
          placeholder="Why does this supplier represent the best total value?"
          @input="$emit('update:awardReason', $event.target.value)"
        ></textarea>
      </label>
    </div>
    <aside class="rounded-xl border border-slate-200/70 p-4 dark:border-slate-700">
      <span class="text-[10px] font-800 uppercase tracking-wide text-brand">Selection</span>
      <h3 class="mt-2 text-lg font-800">{{ selectedAwardSupplier?.name || "Select a supplier" }}</h3>
      <dl class="mt-4 divide-y divide-slate-100 text-xs dark:divide-slate-700">
        <div class="flex justify-between py-3">
          <dt class="text-slate-500">Offer total</dt>
          <dd class="font-bold">{{ selectedAwardQuote ? formatMoney(selectedAwardQuote.price, event.currency) : "—" }}</dd>
        </div>
        <div class="flex justify-between py-3">
          <dt class="text-slate-500">Overall score</dt>
          <dd class="font-bold">{{ selectedAwardQuote?.score || "—" }}</dd>
        </div>
        <div class="flex justify-between py-3">
          <dt class="text-slate-500">Request</dt>
          <dd class="font-bold">{{ event.requestId || "—" }}</dd>
        </div>
        <div class="flex justify-between py-3">
          <dt class="text-slate-500">Creates</dt>
          <dd class="font-bold">Order</dd>
        </div>
      </dl>
      <button
        class="btn-brand mt-4 w-full"
        :disabled="!awardSupplierId || !awardReason.trim()"
        @click="$emit('award')"
      >
        <i class="fa-solid fa-trophy mr-1.5"></i>Choose supplier
      </button>
      <div v-if="settled" class="mt-3 rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
        <div class="flex justify-between"><span class="text-slate-500">{{ t("Service fee") }}</span><b>{{ formatMoney(settled.amount, event.commercialSettlement.currency) }}</b></div>
        <p class="mt-1 text-[10px] text-slate-500">{{ settled.baselineSource === "market" ? t("Saving measured against the market: the median of the quotes.") : t("Saving measured against your budget.") }}</p>
      </div>
      <p v-if="event.awardedSupplierId" class="mt-3 text-center text-[10px] font-bold text-emerald-500">
        <i class="fa-solid fa-circle-check mr-1"></i>Supplier already selected
      </p>
    </aside>
  </div>
</template>
<script>
export default {
  inject: ["store"],
  props: {
    event: Object,
    rankedQuotes: Array,
    awardSupplierId: String,
    awardReason: String,
    selectedAwardQuote: Object,
    selectedAwardSupplier: Object,
    supplierName: Function,
    formatMoney: Function,
  },
  emits: ["update:awardSupplierId", "update:awardReason", "award"],
  computed: {
    // The fee the server settled for this award, once it has answered.
    settled() { const fee = this.event?.commercialSettlement?.serviceFee; return fee && fee.serverSettlementId ? fee : null; },
  },
  methods: { t(text) { return this.store.t(text); } },
};
</script>
