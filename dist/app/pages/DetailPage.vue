<template><div><section v-if="gig" class="space-y-6"><div class="grid gap-6 lg:grid-cols-[1fr_22rem]"><main class="space-y-6"><article class="panel p-7 rounded-3xl border border-slate-200/80 bg-white/95 dark:border-slate-800/80 dark:bg-slate-900/90 shadow-card"><div class="flex flex-wrap items-center gap-2"><span class="rounded-lg bg-brand-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand dark:bg-brand/20">
                {{ store.t(gig.category) }}
              </span><span class="badge rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold dark:bg-emerald-500/10"><i class="fa-solid fa-certificate mr-1"></i>Fiverr Pro & Certified
              </span><span class="badge rounded-lg bg-violet-50 text-violet-700 border border-violet-200 text-[10px] font-bold dark:bg-violet-500/10"><i class="fa-solid fa-shield-halved mr-1"></i>Contra 0% Freelancer Fee
              </span></div><h1 class="font-head mt-3 text-2xl sm:text-3xl font-800 tracking-tight text-slate-900 dark:text-white">{{ gig.title }}</h1><p class="mt-4 leading-relaxed text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              {{ gig.description }}
            </p><h2 class="font-head mt-7 font-800 text-sm tracking-tight text-slate-900 dark:text-white">{{ store.t("What is included") }}</h2><ul class="mt-3 grid gap-2.5 sm:grid-cols-2"><li
                v-for="line in gig.scope"
                :key="line"
                class="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40 font-semibold"
              ><i class="fa-solid fa-circle-check text-emerald-500 text-sm flex-none"></i><span class="text-slate-700 dark:text-slate-200">{{ line }}</span></li></ul><h2 class="font-head mt-7 font-800 text-sm tracking-tight text-slate-900 dark:text-white">{{ store.t("Delivery process") }}</h2><ol class="mt-3 grid gap-3 sm:grid-cols-3"><li
                v-for="(step, index) in ['Kickoff & inputs', 'Focused delivery', 'Review & handoff']"
                :key="step"
                class="rounded-2xl border border-slate-100 p-4 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs"
              ><b class="text-brand font-head text-sm">0{{ index + 1 }}</b><p class="mt-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">{{ store.t(step) }}</p></li></ol></article></main><aside class="space-y-4"><article class="panel p-5 rounded-3xl border border-slate-200/80 bg-white/95 dark:border-slate-800/80 dark:bg-slate-900/90 shadow-card space-y-4"><div class="grid grid-cols-3 gap-1 rounded-xl border border-slate-200/80 bg-slate-100/80 p-1 dark:border-slate-700 dark:bg-slate-800"><button
                v-for="tier in ['Basic', 'Standard', 'Premium']"
                :key="tier"
                type="button"
                class="rounded-lg py-1.5 text-xs font-bold transition"
                :class="selectedTier === tier ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'"
                @click="selectedTier = tier"
              >
                {{ tier }}
              </button></div><div><p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">{{ selectedTier }} {{ store.t("Package") }}</p><p class="font-head font-mono mt-1 text-3xl font-800 text-slate-900 dark:text-white">{{ store.money(tierPrice) }}</p><p class="mt-1 text-xs text-slate-500">{{ tierDescription }}</p></div><dl class="space-y-2.5 text-xs border-t border-slate-100 pt-3 dark:border-slate-800"><div class="flex justify-between items-center"><dt class="text-slate-400">{{ store.t("Delivery") }}</dt><dd class="font-bold">{{ tierDelivery }} {{ store.t("days") }}</dd></div><div class="flex justify-between items-center"><dt class="text-slate-400">{{ store.t("Revisions") }}</dt><dd class="font-bold">{{ tierRevisions }}</dd></div><div class="flex justify-between items-center"><dt class="text-slate-400">Source Files</dt><dd class="font-bold text-emerald-600"><i class="fa-solid fa-check"></i></dd></div><div class="flex justify-between items-center"><dt class="text-slate-400">Commercial License</dt><dd class="font-bold text-emerald-600"><i class="fa-solid fa-check"></i></dd></div></dl><button
              class="btn-brand w-full py-2.5 text-xs"
              :disabled="requested"
              @click="request"
            ><i class="fa-solid mr-2" :class="requested ? 'fa-check' : 'fa-paper-plane'"></i>
              {{ requested ? store.t("Request sent") : store.t("Request service") }}
            </button></article><article class="panel p-5 rounded-3xl border border-slate-200/80 bg-white/95 dark:border-slate-800/80 dark:bg-slate-900/90 shadow-card space-y-2"><p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">{{ store.t("Provided by") }}</p><RouterLink :to="creatorLink" class="font-head font-bold text-xs text-brand block">{{ creatorName }}</RouterLink><p class="text-[11px] text-slate-500">{{ store.t("Verified marketplace provider · 4.9") }}</p></article></aside></div></section><section v-else class="panel p-10 text-center rounded-2xl border border-slate-200/80 bg-white/90 shadow-card"><h1 class="font-head text-2xl font-800">{{ store.t("Service not found") }}</h1><RouterLink class="btn-brand mt-4 text-xs py-2 px-4" to="/browse-services">{{ store.t("Browse services") }}</RouterLink></section></div></template>
<script>
const { inject, computed, ref } = Vue;
const { useRoute } = VueRouter;
export default {
setup() {
const store = inject("store"), route = useRoute();
const selectedTier = ref("Basic");
const gig = computed(() => store.state.gigs.find((x) => x.id === route.params.gigId));
const requested = computed(() =>
store.state.serviceRequests?.some(
(x) => x.gigId === gig.value?.id && x.buyerId === store.currentUser.value.id
)
);
const creatorName = computed(() =>
gig.value?.creatorType === "agency"
? store.state.agencies.find((x) => x.id === gig.value.creatorId)?.name
: store.user(gig.value?.creatorId)?.name
);
const creatorLink = computed(() =>
gig.value?.creatorType === "agency"
? `/agency/${gig.value.creatorId}`
: `/profile/${gig.value?.creatorId}`
);
const tierPrice = computed(() => {
const base = gig.value?.price || 100;
if (selectedTier.value === "Standard") return Math.round(base * 1.8);
if (selectedTier.value === "Premium") return Math.round(base * 2.8);
return base;
});
const tierDelivery = computed(() => {
const base = gig.value?.deliveryDays || 3;
if (selectedTier.value === "Standard") return base + 2;
if (selectedTier.value === "Premium") return base + 4;
return base;
});
const tierRevisions = computed(() => {
if (selectedTier.value === "Standard") return 3;
if (selectedTier.value === "Premium") return "Unlimited";
return gig.value?.revisions || 1;
});
const tierDescription = computed(() => {
if (selectedTier.value === "Standard") return "Comprehensive complete package with extended revisions and documentation.";
if (selectedTier.value === "Premium") return "Enterprise turn-key solution with VIP priority delivery and unlimited revisions.";
return "Essential core deliverable package for fast turnaround.";
});
const request = () => {
if (!requested.value && gig.value) store.requestGig(gig.value);
};
return {
store,
gig,
selectedTier,
tierPrice,
tierDelivery,
tierRevisions,
tierDescription,
requested,
creatorName,
creatorLink,
request,
};
},
};
</script>