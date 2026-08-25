<template>
  <section class="p-5">
    <div class="mx-auto max-w-4xl">
      <div class="flex flex-col gap-3 border-b border-slate-200/70 pb-4 sm:flex-row sm:items-start sm:justify-between dark:border-slate-700">
        <div>
          <p class="text-[10px] font-800 uppercase tracking-wider text-brand">{{ store.t("Confidential response") }}</p>
          <h3 class="mt-1 text-base font-800">{{ store.t("Your commercial response") }}</h3>
          <p class="mt-1 max-w-2xl text-xs leading-5 text-slate-500">{{ store.t("Only the buying organization can review this response. Competitor pricing, identities and evaluation details remain unavailable to you.") }}</p>
        </div>
        <span class="badge self-start bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><i class="fa-regular fa-calendar mr-1"></i>{{ store.t("Due") }} {{ deadlineLabel }}</span>
      </div>

      <div v-if="closed" class="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
        <i class="fa-solid fa-lock mr-2"></i>{{ store.t("This response window is closed. Your last submitted response remains available for your records.") }}
      </div>

      <form class="mt-5 grid gap-4 md:grid-cols-2" @submit.prevent="submit">
        <label>
          <span class="mb-1.5 flex items-center justify-between text-xs font-bold">{{ store.t("Total response") }} <b class="text-brand">{{ invitation.currency }}</b></span>
          <div class="relative">
            <input v-model.number="form.price" type="number" min="0.01" max="999999999" step="0.01" required class="field pr-16 font-mono" :disabled="closed" aria-describedby="response-price-help" />
            <span class="pointer-events-none absolute right-3 top-2.5 text-[10px] font-bold text-slate-400">{{ invitation.currency }}</span>
          </div>
          <small id="response-price-help" class="mt-1.5 block text-[10px] text-slate-400">{{ store.t("Enter your total commercial response for the approved scope.") }}</small>
        </label>
        <label>
          <span class="mb-1.5 block text-xs font-bold">{{ store.t("Lead time (days)") }}</span>
          <input v-model.number="form.leadDays" type="number" min="1" max="3650" step="1" required class="field" :disabled="closed" />
          <small class="mt-1.5 block text-[10px] text-slate-400">{{ store.t("Calendar days from purchase order confirmation.") }}</small>
        </label>
        <label>
          <span class="mb-1.5 block text-xs font-bold">{{ store.t("Payment terms") }}</span>
          <select v-model="form.terms" class="field" required :disabled="closed">
            <option value="" disabled>{{ store.t("Select terms") }}</option>
            <option>Net 15</option>
            <option>Net 30</option>
            <option>Net 45</option>
            <option>Net 60</option>
            <option>Prepaid</option>
          </select>
        </label>
        <label>
          <span class="mb-1.5 block text-xs font-bold">{{ store.t("Response status") }}</span>
          <div class="field flex h-[42px] items-center gap-2 bg-slate-50 text-xs dark:bg-slate-800/60">
            <i class="fa-solid" :class="invitation.ownQuote ? 'fa-circle-check text-emerald-500' : 'fa-clock text-amber-500'"></i>
            <span>{{ invitation.ownQuote ? `${store.t("Submitted")} ${submittedLabel}` : store.t("Not submitted yet") }}</span>
          </div>
        </label>
        <label class="md:col-span-2">
          <span class="mb-1.5 block text-xs font-bold">{{ store.t("Clarifying note") }} <span class="font-normal text-slate-400">({{ store.t("optional") }})</span></span>
          <textarea v-model.trim="form.notes" class="field min-h-25 resize-y text-xs leading-relaxed" maxlength="1200" :disabled="closed" :placeholder="store.t('Delivery assumptions, inclusions or a short commercial clarification…')"></textarea>
          <small class="mt-1.5 block text-[10px] text-slate-400">{{ form.notes.length }}/1200 · {{ store.t("Share only information intended for the buyer.") }}</small>
        </label>
        <div class="md:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/15 bg-brand-50/35 px-4 py-3 dark:bg-brand/10">
          <p class="text-[11px] leading-5 text-slate-600 dark:text-slate-300"><i class="fa-solid fa-shield-halved mr-1.5 text-brand"></i>{{ store.t("Your revision replaces only your own response; it never reveals market position or competitor data.") }}</p>
          <button class="btn-brand shrink-0 px-4 py-2.5 text-xs" :disabled="closed || !valid">
            <i class="fa-solid fa-paper-plane mr-1.5"></i>{{ store.t(invitation.ownQuote ? "Update response" : "Submit response") }}
          </button>
        </div>
      </form>
    </div>
  </section>
</template>
<script>
const { computed, inject, ref, watch } = Vue;

const blank = (quote) => ({
  price: Number(quote?.price) || null,
  leadDays: Number(quote?.leadDays) || null,
  terms: quote?.terms || "",
  notes: quote?.notes || "",
});

export default {
  props: {
    invitation: { type: Object, required: true },
    formatDate: { type: Function, required: true },
  },
  emits: ["submit"],
  setup(props, { emit }) {
    const store = inject("store");
    const form = ref(blank(props.invitation.ownQuote));
    const deadline = computed(() => Date.parse(props.invitation.deadline));
    const closed = computed(() => !["Published", "Sent"].includes(props.invitation.status) || !Number.isFinite(deadline.value) || deadline.value <= Date.now());
    const deadlineLabel = computed(() => props.formatDate(props.invitation.deadline));
    const submittedLabel = computed(() => props.invitation.ownQuote?.updatedAt || props.invitation.ownQuote?.submittedAt ? props.formatDate(props.invitation.ownQuote.updatedAt || props.invitation.ownQuote.submittedAt) : "");
    const valid = computed(() => Number.isFinite(Number(form.value.price)) && Number(form.value.price) > 0 && Number(form.value.price) <= 1000000000 && Number.isInteger(Number(form.value.leadDays)) && Number(form.value.leadDays) >= 1 && Number(form.value.leadDays) <= 3650 && Boolean(form.value.terms));
    watch(() => props.invitation.ownQuote, (quote) => { form.value = blank(quote); }, { immediate: true });
    const submit = () => { if (valid.value && !closed.value) emit("submit", { ...form.value }); };
    return { store, form, closed, deadlineLabel, submittedLabel, valid, submit };
  },
};
</script>
