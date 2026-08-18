<template><article class="panel p-6 rounded-3xl border border-slate-200/80 bg-white/95 dark:border-slate-800/80 dark:bg-slate-900/90 shadow-card space-y-6"><div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800"><div><div class="flex items-center gap-2"><span class="grid h-7 w-7 place-items-center rounded-lg bg-brand-50 text-brand text-xs dark:bg-brand/20"><i class="fa-solid fa-file-signature"></i></span><h2 class="font-head text-base font-800 text-slate-900 dark:text-white">
            {{ myProposal ? store.t("Your Active Bid & Proposal") : store.t("Submit Proposal & Place Bid") }}
          </h2></div><p class="mt-0.5 text-xs text-slate-400">
          {{ store.t("Milestone breakdown, net earnings calculator and competitive counter-bidding.") }}
        </p></div><div v-if="job.auctionType === 'OPEN' && lowestBid" class="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-1 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-300 font-semibold border border-amber-200/80"><i class="fa-solid fa-gavel text-amber-600"></i><span>{{ store.t("Leading Bid") }}: <b>{{ store.money(lowestBid, job.currency) }}</b></span></div></div><div v-if="myProposal" class="rounded-2xl border border-emerald-200/90 bg-emerald-50/60 p-4 dark:border-emerald-500/30 dark:bg-emerald-950/30 space-y-3"><div class="flex flex-wrap items-center justify-between gap-2"><div class="flex items-center gap-2"><i class="fa-solid fa-circle-check text-emerald-600 text-base"></i><span class="text-xs font-bold text-emerald-900 dark:text-emerald-300">{{ store.t("Your proposal is active and under review.") }}</span></div><span class="badge bg-emerald-600 text-white font-bold text-xs">{{ myProposal.status }}</span></div><div v-if="job.auctionType === 'OPEN' && lowestBid && Number(myProposal.bid) > lowestBid" class="flex flex-wrap items-center justify-between gap-2 border-t border-emerald-200/60 pt-3 dark:border-emerald-700/60"><span class="text-xs text-emerald-800 dark:text-emerald-300">
          {{ store.t("You are") }} <b>{{ store.money(Number(myProposal.bid) - lowestBid, job.currency) }}</b> {{ store.t("above the leading bid.") }}
        </span><div class="flex items-center gap-2"><input v-model.number="counterBidAmount" type="number" min="1" class="field text-xs py-1 px-2.5 w-28 bg-white font-mono font-bold" :placeholder="store.money(lowestBid - 50, job.currency)" /><button type="button" class="btn-brand text-xs py-1 px-3" @click="submitCounterBid"><i class="fa-solid fa-bolt mr-1"></i>{{ store.t("Counter-bid") }}
          </button></div></div></div><form v-else class="space-y-5" @submit.prevent="beginProposal"><div class="grid gap-4 sm:grid-cols-2"><label class="block text-xs font-bold"><div class="flex items-center justify-between mb-1.5"><span>{{ store.t("Your Bid Amount") }} <span class="text-rose-500">*</span></span><span class="text-[10px] font-normal text-slate-400">{{ store.t("Client Budget") }}: {{ store.money(job.budget, job.currency) }}</span></div><input v-model.number="form.bid" type="number" min="1" class="field font-mono font-bold text-sm" required /></label><label class="block text-xs font-bold"><span class="mb-1.5 block">{{ store.t("Estimated Delivery Time") }} <span class="text-rose-500">*</span></span><input v-model="form.completionTime" class="field text-xs" required :placeholder="store.t('e.g. 3 weeks')" /></label></div><div class="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 text-xs dark:border-slate-800 dark:bg-slate-800/40"><div class="flex items-center justify-between border-b border-slate-200/60 pb-2 dark:border-slate-700/60 font-semibold text-slate-500"><span>{{ store.t("Fee Breakdown") }}</span><span>{{ store.t("10% Platform Escrow Fee") }}</span></div><div class="mt-2.5 grid grid-cols-3 gap-2 text-center"><div class="rounded-xl bg-white p-2.5 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-700/60"><span class="text-[10px] text-slate-400 uppercase block font-bold">{{ store.t("Gross Bid") }}</span><b class="font-mono text-xs font-bold text-slate-900 dark:text-white">{{ store.money(form.bid || 0, job.currency) }}</b></div><div class="rounded-xl bg-white p-2.5 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-700/60"><span class="text-[10px] text-slate-400 uppercase block font-bold">{{ store.t("Platform Fee (10%)") }}</span><b class="font-mono text-xs font-bold text-rose-500">-{{ store.money(feeAmount, job.currency) }}</b></div><div class="rounded-xl bg-brand-50/60 p-2.5 dark:bg-brand/10 border border-brand/20"><span class="text-[10px] text-brand uppercase block font-bold">{{ store.t("Net Earnings") }}</span><b class="font-mono text-xs font-800 text-brand">{{ store.money(netEarnings, job.currency) }}</b></div></div></div><div class="space-y-3"><div class="flex items-center justify-between"><label class="text-xs font-bold text-slate-900 dark:text-white"><i class="fa-solid fa-layer-group text-brand mr-1"></i>{{ store.t("Milestone Schedule (Optional)") }}
          </label><button type="button" class="text-xs font-bold text-brand hover:underline" @click="addMilestone">
            + {{ store.t("Add Milestone") }}
          </button></div><div v-for="(m, idx) in form.milestones" :key="idx" class="grid grid-cols-1 sm:grid-cols-[1fr_120px_auto] gap-2 items-center"><input v-model="m.title" class="field text-xs" :placeholder="store.t('Milestone title / deliverable')" /><input v-model.number="m.amount" type="number" min="1" class="field font-mono text-xs font-bold" :placeholder="store.t('Amount')" /><button type="button" class="h-8 w-8 grid place-items-center rounded-lg text-slate-400 hover:text-rose-500" @click="removeMilestone(idx)"><i class="fa-solid fa-trash text-xs"></i></button></div></div><div class="space-y-2 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-800/30"><p class="text-xs font-bold text-slate-900 dark:text-white mb-2"><i class="fa-solid fa-gift text-emerald-500 mr-1"></i>{{ store.t("Value-Add Extras & Guarantees") }}
        </p><label v-for="extra in availableExtras" :key="extra.id" class="flex items-center justify-between gap-2 text-xs cursor-pointer p-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-slate-700/40"><span class="flex items-center gap-2"><input v-model="form.selectedExtras" type="checkbox" :value="extra.id" class="rounded text-brand" /><span class="font-semibold text-slate-700 dark:text-slate-200">{{ store.t(extra.name) }}</span></span><span class="font-mono font-bold text-emerald-600 dark:text-emerald-400">+{{ store.money(extra.price, job.currency) }}</span></label></div><div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/50 p-3.5 dark:border-amber-500/30 dark:bg-amber-950/20 text-xs"><div class="flex items-center gap-2"><span class="grid h-6 w-6 place-items-center rounded bg-amber-400 text-amber-950 font-bold text-[10px]"><i class="fa-solid fa-bolt"></i></span><div><b class="text-amber-950 dark:text-amber-300">{{ store.t("Boost Proposal (Connects)") }}</b><p class="text-[10px] text-amber-800/80 dark:text-amber-400">{{ store.t("Bid 6 tokens to appear in the top 3 sponsored spots.") }}</p></div></div><label class="flex items-center gap-2 font-semibold cursor-pointer"><input v-model="form.boosted" type="checkbox" class="rounded text-amber-500" /><span>{{ store.t("Boost with 6 Connects") }}</span></label></div><label class="block text-xs font-bold"><div class="flex items-center justify-between mb-1.5"><span>{{ store.t("Cover Letter") }} <span class="text-rose-500">*</span></span><span class="text-[10px] font-normal text-slate-400">{{ (form.coverLetter || '').length }} / 4000</span></div><textarea v-model="form.coverLetter" class="field min-h-32 text-xs leading-relaxed" required :placeholder="store.t('Explain your technical approach, timeline and past accomplishments.')"></textarea></label><div class="flex justify-end gap-3 pt-2"><button type="submit" class="btn-brand text-xs py-2.5 px-5"><i class="fa-solid fa-paper-plane mr-2"></i>{{ store.t("Submit Proposal & Guarantee Escrow") }}
        </button></div></form></article></template>
<script>
const { inject, ref, reactive, computed } = Vue;
export default {
props: {
job: Object,
myProposal: Object,
},
emits: ["submit-proposal", "counter-bid"],
setup(props, { emit }) {
const store = inject("store");
const counterBidAmount = ref(null);
const form = reactive({
bid: props.job?.budget || 1000,
completionTime: "3 weeks",
coverLetter: "",
boosted: false,
milestones: [
{ title: "Discovery, architecture & wireframes", amount: Math.round((props.job?.budget || 1000) * 0.4) },
{ title: "Implementation, testing & final handoff", amount: Math.round((props.job?.budget || 1000) * 0.6) },
],
selectedExtras: [],
});
const availableExtras = [
{ id: "rush", name: "Expedited 48-Hour Priority Delivery", price: 250 },
{ id: "source", name: "Full Source Code & Architecture Spec", price: 150 },
{ id: "warranty", name: "30-Day Post-Launch Support & Warranty", price: 300 },
];
const feeAmount = computed(() => Math.round((Number(form.bid) || 0) * 0.1));
const netEarnings = computed(() => (Number(form.bid) || 0) - feeAmount.value);
const lowestBid = computed(() => {
const bids = (props.job.proposals || []).map((p) => Number(p.bid)).filter((b) => b > 0);
return bids.length ? Math.min(...bids) : null;
});
const addMilestone = () => {
form.milestones.push({ title: "", amount: 500 });
};
const removeMilestone = (idx) => {
form.milestones.splice(idx, 1);
};
const beginProposal = () => {
emit("submit-proposal", {
...form,
extras: availableExtras.filter((e) => form.selectedExtras.includes(e.id)),
});
};
const submitCounterBid = () => {
if (!counterBidAmount.value || counterBidAmount.value <= 0) return;
emit("counter-bid", counterBidAmount.value);
counterBidAmount.value = null;
};
return {
store,
form,
counterBidAmount,
availableExtras,
feeAmount,
netEarnings,
lowestBid,
addMilestone,
removeMilestone,
beginProposal,
submitCounterBid,
};
},
};
</script>