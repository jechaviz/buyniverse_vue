<template>
  <article class="panel p-6 rounded-3xl border border-slate-200/80 bg-white/95 dark:border-slate-800/80 dark:bg-slate-900/90 shadow-card space-y-5">
    <!-- Header & Controls -->
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
      <div>
        <div class="flex items-center gap-2">
          <span class="grid h-7 w-7 place-items-center rounded-lg bg-brand-50 text-brand text-xs dark:bg-brand/20">
            <i class="fa-solid fa-gavel"></i>
          </span>
          <h2 class="font-head text-base font-800 text-slate-900 dark:text-white">{{ store.t("Live Bidding Room & Proposals") }}</h2>
          <span class="rounded-full bg-brand px-2 py-0.2 text-[10px] font-bold text-white">{{ proposals.length }}</span>
        </div>
        <p class="mt-0.5 text-xs text-slate-400">
          {{ store.t("Multi-factor comparison, reverse auction controls and escrow contract award.") }}
        </p>
      </div>

      <!-- Controls: Blind Evaluation & Reverse Auction Request -->
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="btn-muted text-xs py-1.5 px-3"
          :class="blindReview ? 'border-brand text-brand font-bold bg-brand-50/40' : ''"
          @click="blindReview = !blindReview"
        >
          <i class="fa-solid fa-eye-slash mr-1.5"></i>{{ blindReview ? store.t("Blind review: ON") : store.t("Blind review") }}
        </button>
        <button
          type="button"
          class="btn-brand text-xs py-1.5 px-3"
          :disabled="proposals.length < 2 || bafoRequested"
          @click="triggerBafo"
        >
          <i class="fa-solid fa-bolt mr-1.5"></i>{{ bafoRequested ? store.t("BAFO Requested") : store.t("Request BAFO Round") }}
        </button>
      </div>
    </div>

    <!-- Auction Mode Notice -->
    <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40">
      <div class="flex items-center gap-2">
        <span class="badge rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300 font-bold text-[10px]">
          <i class="fa-solid fa-scale-balanced mr-1"></i>{{ job.auctionType === 'OPEN' ? store.t('Open Live Auction') : store.t('Sealed Bid Sourcing') }}
        </span>
        <span class="text-slate-500 dark:text-slate-400">
          {{ job.auctionType === 'OPEN' ? store.t('Bidders can view the leading price and counter-bid.') : store.t('Offers remain private until evaluation.') }}
        </span>
      </div>
      <div class="flex items-center gap-3 font-mono font-bold text-slate-700 dark:text-slate-200">
        <span>{{ store.t("Budget") }}: {{ store.money(job.budget, job.currency) }}</span>
        <span v-if="bestBid" class="text-emerald-600 dark:text-emerald-400">
          {{ store.t("Lowest Bid") }}: {{ store.money(bestBid, job.currency) }}
        </span>
      </div>
    </div>

    <!-- Ranked Bidders Matrix -->
    <div v-if="rankedProposals.length" class="divide-y divide-slate-100 dark:divide-slate-800">
      <div
        v-for="p in rankedProposals"
        :key="p.id"
        class="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 transition hover:bg-slate-50/50 dark:hover:bg-slate-800/30 rounded-xl px-2"
      >
        <!-- Freelancer Identity / Blind Mask -->
        <div class="flex items-start gap-3.5 min-w-0 flex-1">
          <!-- Rank Badge -->
          <span
            class="grid h-7 w-7 flex-none place-items-center rounded-lg text-xs font-800 shadow-xs mt-1"
            :class="p.rank === 1 ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-400/40' : p.rank === 2 ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-500'"
          >
            #{{ p.rank }}
          </span>

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span v-if="!blindReview" class="font-head font-800 text-xs text-slate-900 dark:text-white">
                {{ store.user(p.freelancerId)?.name || 'Freelancer' }}
              </span>
              <span v-else class="font-mono text-xs font-bold text-slate-500">
                {{ store.t("Candidate") }} {{ p.blindCode }}
              </span>

              <!-- Reputation Badges (Upwork/Workana/Fiverr/PPH) -->
              <span v-if="p.boosted" class="badge bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-bold dark:bg-amber-500/10">
                <i class="fa-solid fa-bolt text-amber-500 mr-1"></i>{{ store.t("Boosted") }}
              </span>
              <span v-if="p.tier" class="badge bg-purple-50 text-purple-700 border border-purple-200 text-[9px] font-bold dark:bg-purple-500/10">
                {{ p.tier }}
              </span>
              <span v-if="p.jss" class="badge bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold dark:bg-emerald-500/10">
                {{ p.jss }}% JSS
              </span>
              <span v-if="p.certLevel" class="badge bg-sky-50 text-sky-700 border border-sky-200 text-[9px] font-bold dark:bg-sky-500/10">
                CERT {{ p.certLevel }}
              </span>
            </div>

            <!-- Proposal Details -->
            <p class="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
              {{ p.coverLetter || store.t("Comprehensive proposal submitted with milestone schedule.") }}
            </p>

            <!-- Milestones & Extras Badges -->
            <div class="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
              <span class="flex items-center gap-1 font-semibold">
                <i class="fa-regular fa-clock text-slate-400"></i>{{ p.completionTime || '3 weeks' }}
              </span>
              <span v-if="p.milestones?.length" class="flex items-center gap-1 font-semibold text-brand">
                <i class="fa-solid fa-layer-group"></i>{{ p.milestones.length }} {{ store.t("Milestones") }}
              </span>
              <span v-if="p.extras?.length" class="flex items-center gap-1 font-semibold text-emerald-600">
                <i class="fa-solid fa-plus-circle"></i>{{ p.extras.length }} {{ store.t("Extras included") }}
              </span>
            </div>
          </div>
        </div>

        <!-- Pricing & Awarding Actions -->
        <div class="flex items-center justify-between md:justify-end gap-3 flex-none pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
          <div class="text-right">
            <span class="font-mono text-sm font-800 text-slate-900 dark:text-white block">
              {{ store.money(p.bid, job.currency) }}
            </span>
            <span class="text-[10px] font-semibold" :class="p.savings >= 0 ? 'text-emerald-600' : 'text-slate-400'">
              {{ p.savings >= 0 ? `${store.money(p.savings, job.currency)} under budget` : 'Standard' }}
            </span>
          </div>

          <div class="flex items-center gap-1.5">
            <button
              v-if="p.status !== 'Accepted'"
              type="button"
              class="btn-brand text-xs py-1.5 px-3"
              @click="$emit('award', p)"
            >
              <i class="fa-solid fa-handshake mr-1.5"></i>{{ store.t("Award & Escrow") }}
            </button>
            <span v-else class="badge bg-emerald-500 text-white text-xs px-3 py-1 font-bold">
              <i class="fa-solid fa-check mr-1"></i>{{ store.t("Awarded") }}
            </span>
          </div>
        </div>
      </div>
    </div>
    <p v-else class="py-8 text-center text-xs text-slate-400">{{ store.t("No proposals or bids received yet.") }}</p>
  </article>
</template>
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

    const bestBid = computed(() => {
      const bids = (props.proposals || []).map((p) => Number(p.bid)).filter((b) => b > 0);
      return bids.length ? Math.min(...bids) : null;
    });

    const rankedProposals = computed(() => {
      const budget = Number(props.job.budget) || 1;
      const list = (props.proposals || []).map((p, idx) => {
        const bid = Number(p.bid) || budget;
        const savings = budget - bid;
        const user = store.user(p.freelancerId) || {};
        const jss = user.jss || 95;
        const certLevel = user.certLevel || 4;
        const tier = user.tier || "Platinum";
        const boosted = Boolean(p.boosted);

        // Multi-factor score: Price (40%), JSS (30%), CERT (20%), Boost (10%)
        const priceScore = Math.max(0, Math.min(100, (1 - bid / (budget * 1.2)) * 100));
        const totalScore = (priceScore * 0.4) + (jss * 0.3) + (certLevel * 20 * 0.2) + (boosted ? 10 : 0);

        return {
          ...p,
          bid,
          savings,
          jss,
          certLevel,
          tier,
          boosted,
          score: Math.round(totalScore),
          blindCode: `BID-${String(idx + 1).padStart(2, "0")}`,
        };
      });

      list.sort((a, b) => b.score - a.score || a.bid - b.bid);
      return list.map((item, index) => ({ ...item, rank: index + 1 }));
    });

    const triggerBafo = () => {
      bafoRequested.value = true;
      store.notice("BAFO final price-drop round requested from top bidders", "fa-bolt");
    };

    return { store, blindReview, bafoRequested, bestBid, rankedProposals, triggerBafo };
  },
};
</script>
