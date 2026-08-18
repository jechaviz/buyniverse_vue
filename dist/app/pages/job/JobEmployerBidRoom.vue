<template><article class="panel p-6 rounded-3xl border border-slate-200/80 bg-white/95 dark:border-slate-800/80 dark:bg-slate-900/90 shadow-card space-y-5"><div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800"><div><div class="flex items-center gap-2"><span class="grid h-7 w-7 place-items-center rounded-lg bg-brand-50 text-brand text-xs dark:bg-brand/20"><i class="fa-solid fa-gavel"></i></span><h2 class="font-head text-base font-800 text-slate-900 dark:text-white">{{ store.t("Live Bidding Room & ATS Pipeline") }}</h2><span class="rounded-full bg-brand px-2 py-0.2 text-[10px] font-bold text-white">{{ proposals.length }}</span></div><p class="mt-0.5 text-xs text-slate-400">
          {{ store.t("Multi-factor comparison, rate benchmark, reverse auction and escrow contract award.") }}
        </p></div><div class="flex flex-wrap items-center gap-2"><button
          type="button"
          class="btn-muted text-xs py-1.5 px-3"
          :class="blindReview ? 'border-brand text-brand font-bold bg-brand-50/40' : ''"
          @click="blindReview = !blindReview"
        ><i class="fa-solid fa-eye-slash mr-1.5"></i>{{ blindReview ? store.t("Blind review: ON") : store.t("Blind review") }}
        </button><button
          type="button"
          class="btn-brand text-xs py-1.5 px-3"
          :disabled="proposals.length < 2 || bafoRequested"
          @click="triggerBafo"
        ><i class="fa-solid fa-bolt mr-1.5"></i>{{ bafoRequested ? store.t("BAFO Requested") : store.t("Request BAFO Round") }}
        </button></div></div><div class="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-800/40 space-y-2"><div class="flex flex-wrap items-center justify-between gap-2 text-xs"><div class="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200"><i class="fa-solid fa-chart-simple text-brand"></i><span>{{ store.t("Market Rate Benchmark (JobStreet / Foundit)") }}</span></div><span class="text-[11px] text-slate-400">Category: <b>{{ store.t(job.category) }}</b></span></div><div class="space-y-1"><div class="relative h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div class="absolute inset-y-0 left-0 w-1/3 bg-emerald-400/70" title="Low range"></div><div class="absolute inset-y-0 left-1/3 w-1/3 bg-sky-400/80" title="Market median"></div><div class="absolute inset-y-0 left-2/3 w-1/3 bg-amber-400/70" title="High range"></div><div class="absolute top-0 bottom-0 w-1 bg-brand ring-2 ring-brand/40 shadow-xs" :style="{ left: '48%' }" title="Your project budget"></div></div><div class="flex justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 pt-0.5"><span>Min: {{ store.money(Math.round(job.budget * 0.6), job.currency) }}</span><span class="font-bold text-slate-900 dark:text-white">Median: {{ store.money(job.budget, job.currency) }}</span><span>Max: {{ store.money(Math.round(job.budget * 1.4), job.currency) }}</span></div></div></div><div class="flex flex-wrap gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2"><button
        v-for="stage in pipelineStages"
        :key="stage.key"
        type="button"
        class="rounded-xl px-3 py-1.5 text-xs font-semibold transition"
        :class="currentStage === stage.key ? 'bg-brand text-white shadow-xs font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'"
        @click="currentStage = stage.key"
      >
        {{ store.t(stage.label) }}
        <span class="ml-1 rounded-full px-1.5 py-0.2 text-[10px]" :class="currentStage === stage.key ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700'">
          {{ countForStage(stage.key) }}
        </span></button></div><div v-if="filteredProposals.length" class="divide-y divide-slate-100 dark:divide-slate-800"><div
        v-for="p in filteredProposals"
        :key="p.id"
        class="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 transition hover:bg-slate-50/50 dark:hover:bg-slate-800/30 rounded-xl px-2"
      ><div class="flex items-start gap-3.5 min-w-0 flex-1"><span
            class="grid h-7 w-7 flex-none place-items-center rounded-lg text-xs font-800 shadow-xs mt-1"
            :class="p.rank === 1 ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-400/40' : p.rank === 2 ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-500'"
          >
            #{{ p.rank }}
          </span><div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2"><span v-if="!blindReview" class="font-head font-800 text-xs text-slate-900 dark:text-white">
                {{ store.user(p.freelancerId)?.name || 'Freelancer' }}
              </span><span v-else class="font-mono text-xs font-bold text-slate-500">
                {{ store.t("Candidate") }} {{ p.blindCode }}
              </span><span class="badge bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold dark:bg-emerald-500/10"><i class="fa-solid fa-bullseye text-emerald-500 mr-1"></i>{{ p.matchScore }}% Match
              </span><span class="badge bg-violet-50 text-violet-700 border border-violet-200 text-[9px] font-bold dark:bg-violet-500/10"><i class="fa-solid fa-shield-halved mr-1"></i>Contra 0% Fee
              </span><span v-if="p.boosted" class="badge bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-bold dark:bg-amber-500/10"><i class="fa-solid fa-bolt text-amber-500 mr-1"></i>{{ store.t("Boosted") }}
              </span><span v-if="p.tier" class="badge bg-purple-50 text-purple-700 border border-purple-200 text-[9px] font-bold dark:bg-purple-500/10">
                {{ p.tier }}
              </span></div><p class="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
              {{ p.coverLetter || store.t("Comprehensive proposal submitted with milestone schedule.") }}
            </p><div class="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-500"><span class="flex items-center gap-1 font-semibold"><i class="fa-regular fa-clock text-slate-400"></i>{{ p.completionTime || '3 weeks' }}
              </span><span v-if="p.milestones?.length" class="flex items-center gap-1 font-semibold text-brand"><i class="fa-solid fa-layer-group"></i>{{ p.milestones.length }} {{ store.t("Milestones") }}
              </span><span v-if="p.extras?.length" class="flex items-center gap-1 font-semibold text-emerald-600"><i class="fa-solid fa-plus-circle"></i>{{ p.extras.length }} {{ store.t("Extras included") }}
              </span><span class="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400"><i class="fa-regular fa-hourglass-half"></i>{{ store.t("Quote valid 7 days (Addlance)") }}
              </span></div></div></div><div class="flex items-center justify-between md:justify-end gap-3 flex-none pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800"><div class="text-right"><span class="font-mono text-sm font-800 text-slate-900 dark:text-white block">
              {{ store.money(p.bid, job.currency) }}
            </span><span class="text-[10px] font-semibold" :class="p.savings >= 0 ? 'text-emerald-600' : 'text-slate-400'">
              {{ p.savings >= 0 ? `${store.money(p.savings, job.currency)} under budget` : 'Standard' }}
            </span></div><div class="flex items-center gap-1.5"><select
              v-model="p.stage"
              class="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              @change="store.notice('Candidate moved to ' + p.stage)"
            ><option value="applied">Applied</option><option value="shortlisted">Shortlisted</option><option value="interview">Interview</option><option value="bafo">BAFO Round</option></select><button
              v-if="p.status !== 'Accepted'"
              type="button"
              class="btn-brand text-xs py-1.5 px-3"
              @click="$emit('award', p)"
            ><i class="fa-solid fa-handshake mr-1.5"></i>{{ store.t("Award & Escrow") }}
            </button><span v-else class="badge bg-emerald-500 text-white text-xs px-3 py-1 font-bold"><i class="fa-solid fa-check mr-1"></i>{{ store.t("Awarded") }}
            </span></div></div></div></div><p v-else class="py-8 text-center text-xs text-slate-400">{{ store.t("No proposals in this pipeline stage.") }}</p></article></template>
<script>
const { inject, ref, computed } = Vue;
export default {
props: {
job: Object,
proposals: Array,
},
emits: ["award"],
setup(props) {
const store = inject("store");
const blindReview = ref(false);
const bafoRequested = ref(false);
const currentStage = ref("all");
const pipelineStages = [
{ key: "all", label: "All Applicants" },
{ key: "shortlisted", label: "Shortlisted" },
{ key: "interview", label: "Interview / Q&A" },
{ key: "bafo", label: "BAFO / Auction" },
];
const rankedProposals = computed(() => {
const budget = Number(props.job.budget) || 1;
const list = (props.proposals || []).map((p, idx) => {
const bid = Number(p.bid) || budget;
const savings = budget - bid;
const user = store.user(p.freelancerId) || {};
const jss = user.jss || 96;
const tier = user.tier || "Platinum";
const boosted = Boolean(p.boosted);
const matchScore = 90 + ((idx * 3) % 9);
p.stage ||= (idx === 0 ? "shortlisted" : "applied");
const priceScore = Math.max(0, Math.min(100, (1 - bid / (budget * 1.2)) * 100));
const totalScore = (priceScore * 0.4) + (jss * 0.3) + (matchScore * 0.2) + (boosted ? 10 : 0);
return {
...p,
bid,
savings,
jss,
tier,
matchScore,
boosted,
score: Math.round(totalScore),
blindCode: `BID-${String(idx + 1).padStart(2, "0")}`,
};
});
list.sort((a, b) => b.score - a.score || a.bid - b.bid);
return list.map((item, index) => ({ ...item, rank: index + 1 }));
});
const filteredProposals = computed(() => {
if (currentStage.value === "all") return rankedProposals.value;
return rankedProposals.value.filter((p) => p.stage === currentStage.value);
});
const countForStage = (stageKey) => {
if (stageKey === "all") return rankedProposals.value.length;
return rankedProposals.value.filter((p) => p.stage === stageKey).length;
};
const triggerBafo = () => {
bafoRequested.value = true;
rankedProposals.value.forEach((p) => { p.stage = "bafo"; });
store.notice("BAFO final price-drop round requested from candidates", "fa-bolt");
};
return {
store,
blindReview,
bafoRequested,
currentStage,
pipelineStages,
rankedProposals,
filteredProposals,
countForStage,
triggerBafo,
};
},
};
</script>