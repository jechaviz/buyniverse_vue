<template>
  <div class="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_360px]">
    <section v-if="event.type !== 'Auction' && !event.awardedSupplierId" class="rounded-xl border border-brand/20 bg-brand-50/40 p-4 xl:col-span-2 dark:bg-brand/10">
      <p class="text-[10px] font-800 uppercase tracking-wider text-brand">{{ t("Recommended") }}</p>
      <h3 class="mt-1 text-base font-800">{{ t("Let the approved suppliers compete") }}</h3>
      <p class="mt-1 max-w-3xl text-xs leading-5 text-slate-600 dark:text-slate-300">{{ t("They start from their own prices and bid down in a live round. The lowest price when time ends wins. Only suppliers you approved can take part.") }}</p>
      <div class="mt-3 flex flex-wrap items-center gap-3">
        <button class="btn-brand" :disabled="roundOpen || approvedCount < 2" @click="$emit('contest')"><i class="fa-solid fa-gavel mr-1.5"></i>{{ t(roundOpen ? "Live round running" : "Start live round") }}</button>
        <span class="text-xs text-slate-500">{{ approvedCount }} {{ t("approved") }} · {{ t("You need at least two. Approve them in the Proposals tab.") }}</span>
      </div>
    </section>
    <div>
      <h3 class="text-sm font-800">{{ event.type !== 'Auction' ? t("Or choose a supplier directly") : t("Choose supplier") }}</h3>
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
    approvedCount: { type: Number, default: 0 },
    roundOpen: Boolean,
    supplierName: Function,
    formatMoney: Function,
  },
  emits: ["update:awardSupplierId", "update:awardReason", "award", "contest"],
  computed: {
    // The fee the server settled for this award, once it has answered.
    settled() { const fee = this.event?.commercialSettlement?.serviceFee; return fee && fee.serverSettlementId ? fee : null; },
  },
  methods: { t(text) { return this.store.t(text); } },
};
</script>
