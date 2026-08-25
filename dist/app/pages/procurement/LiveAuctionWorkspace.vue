<template>
  <div v-if="auction" class="space-y-4">
    <!-- Densified Top Metric Strip -->
    <section class="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      <article
        class="relative flex min-h-11 items-center gap-2 overflow-hidden rounded-xl bg-brand p-2.5 text-white shadow-soft"
        :title="store.t(`${auction.extensionCount}/${auction.maxExtensions} extensions`)"
      >
        <span class="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-white/20 text-[11px]"><i class="fa-regular fa-clock"></i></span>
        <span class="min-w-0 truncate text-[10px] font-bold uppercase tracking-wider text-white/80">{{ store.t('Remaining') }}</span>
        <b class="ml-auto font-head font-mono text-xs tracking-tight">{{ timeLeft }}</b>
      </article>
      <article
        v-for="kpi in kpis"
        :key="kpi.label"
        class="premium-card flex min-h-11 items-center gap-2 rounded-xl border border-slate-200/80 bg-white/90 p-2.5 shadow-card dark:border-slate-800/80 dark:bg-slate-900/80"
        :title="kpi.note"
      >
        <span class="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-brand-50 text-[11px] text-brand dark:bg-brand/20">
          <i class="fa-solid" :class="kpi.icon"></i>
        </span>
        <span class="min-w-0 truncate text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{{ kpi.label }}</span>
        <b class="ml-auto truncate font-mono text-xs font-800 text-slate-900 dark:text-white">{{ kpi.value }}</b>
      </article>
    </section>

    <SavingsWaterfall v-if="isOrganizer" :model="commercial" :title="store.t('Savings waterfall')" :kicker="store.t('Live commercial value')" />

    <!-- Main Workspace Container -->
    <section class="panel overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-card dark:border-slate-800/80 dark:bg-slate-900/90">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2 text-[11px] dark:border-slate-800/80 dark:bg-slate-950/40">
        <div class="flex items-center gap-1.5 text-slate-500">
          <RouterLink to="/procurement" class="font-semibold hover:text-brand">{{ store.t('Procurement') }}</RouterLink>
          <span>/</span>
          <RouterLink to="/procurement/auction" class="font-semibold hover:text-brand">{{ store.t('Live Auctions') }}</RouterLink>
          <span>/</span>
          <span class="font-bold text-slate-900 dark:text-white">{{ auction.id }}</span>
        </div>
        <div v-if="isOrganizer" class="flex items-center gap-3">
          <span class="text-slate-400">{{ store.t('Source') }}:</span>
          <RouterLink :to="`/procurement/sourcing?event=${auction.eventId}`" class="font-bold text-brand hover:underline inline-flex items-center gap-1">
            <i class="fa-solid fa-file-signature text-[10px]"></i>{{ auction.eventId }}
          </RouterLink>
          <span v-if="auction.awardedSupplierId || auction.status === 'Awarded'" class="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
            <i class="fa-solid fa-trophy text-[10px]"></i>
            {{ store.t('Winner') }}:
            <RouterLink :to="`/suppliers?supplier=${auction.awardedSupplierId || leader?.supplierId}`" class="hover:underline font-extrabold ml-0.5">
              {{ store.supplier(auction.awardedSupplierId || leader?.supplierId)?.name || store.t('Awarded Supplier') }}
            </RouterLink>
          </span>
        </div>
        <div v-else class="flex items-center gap-2 font-semibold text-slate-500">
          <i class="fa-solid fa-shield-halved text-brand"></i>
          <span>{{ store.t('Blind-bid participant view') }}</span>
          <span v-if="auction.status === 'Awarded'" class="text-emerald-600 dark:text-emerald-400">· {{ store.t('Award decision recorded') }}</span>
        </div>
      </div>

      <header class="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 xl:flex-row xl:items-center xl:justify-between">
        <div class="space-y-1">
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-lg bg-brand-50 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-brand dark:bg-brand/20">{{ auction.id }}</span>
            <span class="badge rounded-lg px-2.5 py-0.5 text-[10px]" :class="statusClass">
              <span class="mr-1.5 h-1.5 w-1.5 rounded-full" :class="auction.status === 'Running' ? 'animate-pulse bg-emerald-500' : 'bg-current'"></span>
              {{ statusLabel(auction.status) }}
            </span>
            <span class="badge rounded-lg bg-slate-100 px-2.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">{{ store.t('Reverse Auction') }}</span>
          </div>
          <h1 class="font-head text-xl font-800 tracking-tight text-slate-900 dark:text-white">{{ auction.title }}</h1>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <select v-model="selectedAuctionId" class="field w-auto min-w-44 text-xs font-semibold py-1.5 px-2.5" @change="selectAuction">
            <option v-for="item in accessibleAuctions" :key="item.id" :value="item.id">{{ item.id }} · {{ item.title }}</option>
          </select>
          <template v-if="isOrganizer">
            <button v-if="auction.status === 'Paused'" class="btn-brand text-xs py-1.5 px-3" @click="resume"><i class="fa-solid fa-play mr-1"></i>{{ store.t('Resume') }}</button>
            <button v-else-if="auction.status === 'Running'" class="btn-muted text-xs py-1.5 px-3" @click="pause"><i class="fa-solid fa-pause mr-1"></i>{{ store.t('Pause') }}</button>
            <button v-if="auction.status !== 'Awarded'" class="btn-brand text-xs py-1.5 px-3" @click="award"><i class="fa-solid fa-trophy mr-1"></i>{{ store.t('Award') }}</button>
            <button v-if="auction.status !== 'Awarded'" class="btn-muted text-xs py-1.5 px-3 text-rose-500 hover:text-rose-600" @click="cancel"><i class="fa-solid fa-ban mr-1"></i>{{ store.t('Cancel') }}</button>
          </template>
        </div>
      </header>

      <nav class="flex gap-2 overflow-x-auto border-b border-slate-100 bg-slate-50/60 px-4 pt-1 dark:border-slate-800 dark:bg-slate-950/40">
        <button
          v-for="item in tabs"
          :key="item.key"
          class="min-w-max border-b-2 px-3 py-2.5 text-xs font-bold transition-all"
          :class="tab === item.key ? 'border-brand text-brand font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'"
          @click="tab = item.key"
        >
          <i class="fa-solid mr-1.5" :class="item.icon"></i>{{ store.t(item.label) }}
        </button>
      </nav>

      <!-- Live Tab -->
      <div v-if="tab === 'live'" class="grid gap-0 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <div class="border-b border-slate-200/70 p-5 dark:border-slate-700 2xl:border-b-0 2xl:border-r">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 class="text-sm font-800">{{ store.t('Offer movement') }}</h3>
              <p class="mt-1 text-xs text-slate-500">{{ store.t('Lower valid offers lead this round.') }}</p>
            </div>
            <div class="flex flex-wrap gap-3 text-[10px]">
              <span class="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400" :title="realtimeStatus.note"><i class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></i>{{ realtimeStatus.label }}</span>
              <span v-if="isOrganizer"><i class="mr-1 inline-block h-0.5 w-3 bg-brand align-middle"></i>{{ store.t('Market movement') }}</span>
              <span v-if="isOrganizer"><i class="mr-1 inline-block h-0.5 w-3 bg-amber-400 align-middle"></i>{{ store.t('Reserve') }}</span>
              <span v-else><i class="mr-1 inline-block h-0.5 w-3 bg-brand align-middle"></i>{{ store.t('Your offer history') }}</span>
            </div>
          </div>
          <div v-if="liveActivity" class="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-brand/25 bg-brand-50/60 px-3 py-2 text-[11px] shadow-sm dark:bg-brand/10" role="status" aria-live="polite">
            <span class="grid h-6 w-6 place-items-center rounded-lg bg-brand text-white"><i class="fa-solid fa-tower-broadcast text-[10px]"></i></span>
            <span class="font-800 text-slate-800 dark:text-slate-100">{{ store.t('Live auction activity') }}</span>
            <span class="min-w-0 flex-1 text-slate-600 dark:text-slate-300">{{ store.t(signalCopy(liveActivity)) }}</span>
            <button v-if="isSupplier && auction.status === 'Running' && liveActivity.type === 'competitive_offer'" class="btn-brand px-2.5 py-1 text-[10px]" @click="improveOffer"><i class="fa-solid fa-bolt mr-1"></i>{{ store.t('Improve offer') }}</button>
          </div>
          <div v-if="isOrganizer" class="mt-3 flex flex-col gap-2 rounded-xl border border-slate-200/70 bg-slate-50/65 p-2.5 dark:border-slate-700 dark:bg-slate-900/25 sm:flex-row sm:items-center">
            <div class="flex items-center justify-between gap-2 sm:shrink-0">
              <span class="text-[10px] font-800 uppercase tracking-wide text-slate-400">{{ store.t('Providers') }}</span>
              <span class="text-[10px] text-slate-400">{{ visibleSupplierSeries.length }} {{ store.t('of') }} {{ supplierSeries.length }}</span>
            </div>
            <div class="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5 sm:pl-2" role="group" aria-label="Filter offer chart by supplier">
              <button class="min-w-max rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition" :class="allSuppliersSelected ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-white text-slate-500 hover:border-brand hover:text-brand dark:border-slate-700 dark:bg-slate-800'" :aria-pressed="allSuppliersSelected" :title="store.t('Show all supplier lines')" @click="showAllSuppliers">{{ store.t('All suppliers') }}</button>
              <button v-for="series in supplierSeries" :key="series.supplierId" class="flex min-w-max items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition" :class="isSupplierVisible(series.supplierId) ? 'border-slate-300 bg-white text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100' : 'border-transparent bg-slate-100/80 text-slate-400 opacity-60 hover:opacity-100 dark:bg-slate-800/50'" :aria-pressed="isSupplierVisible(series.supplierId)" :aria-label="series.name" @click="toggleSupplier(series.supplierId)">
                <i class="h-2 w-2 rounded-full" :style="{ background: series.color }"></i><span>{{ shortName(series.name) }}</span>
                <span v-if="series.improvement > 0" class="font-normal text-emerald-600 dark:text-emerald-400">↓ {{ store.money(series.improvement, auction.currency) }}</span>
              </button>
              <button v-if="visibleSupplierSeries.length" class="min-w-max rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-400 hover:text-brand" :title="store.t('Hide all supplier lines')" @click="clearSupplierFilters">{{ store.t('Clear') }}</button>
            </div>
          </div>
          <div v-else class="mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-slate-50/65 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/25">
            <span class="text-[10px] font-800 uppercase tracking-wide text-slate-400">{{ store.t('Your company offer') }}</span>
            <b class="text-xs">{{ bidder?.name }} · #{{ bidder?.rank || "—" }}</b>
          </div>

          <div class="mt-4 overflow-hidden rounded-xl border border-slate-200/70 bg-white/60 p-3 dark:border-slate-700 dark:bg-slate-900/35">
            <svg viewBox="0 0 900 330" class="h-auto w-full" role="img" aria-label="Live offer graph">
              <defs><linearGradient id="auction-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".18" /><stop offset="1" stop-color="var(--accent)" stop-opacity="0" /></linearGradient></defs>
              <g class="text-slate-300 dark:text-slate-700"><line v-for="y in [50, 110, 170, 230, 290]" :key="y" x1="55" :y1="y" x2="875" :y2="y" stroke="currentColor" stroke-width="1" /></g>
              <line v-if="isOrganizer" x1="55" :y1="valueY(auction.reserve)" x2="875" :y2="valueY(auction.reserve)" stroke="#f59e0b" stroke-width="2" stroke-dasharray="8 6" />
              <text v-if="isOrganizer" x="60" :y="valueY(auction.reserve) - 8" fill="#d97706" font-size="11">Reserve {{ store.money(auction.reserve, auction.currency) }}</text>
              <path :d="areaPath" fill="url(#auction-area)" />
              <polyline :points="overallPoints" fill="none" stroke="var(--accent)" stroke-width="3.5" stroke-opacity=".42" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
              <g v-if="isOrganizer && allSuppliersSelected">
                <circle v-for="(bid, index) in auction.bids" :key="`market-${bid.id}`" :cx="pointX(index)" :cy="valueY(bid.amount)" r="4.5" :fill="supplierColor(bid.supplierId)" stroke="white" stroke-width="1.75">
                  <title>{{ store.supplier(bid.supplierId)?.name }} · {{ store.money(bid.amount, auction.currency) }} · {{ clock(bid.at) }}</title>
                </circle>
              </g>
              <g v-for="series in chartSupplierSeries" :key="series.supplierId">
                <polyline v-if="series.points.length > 1" :points="series.polyline" fill="none" :stroke="series.color" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
                <circle v-for="point in series.points" :key="point.id" :cx="point.x" :cy="point.y" r="5" :fill="series.color" stroke="white" stroke-width="2">
                  <title>{{ series.name }} · {{ store.money(point.amount, auction.currency) }} · {{ clock(point.at) }}</title>
                </circle>
              </g>
              <text v-if="isOrganizer" v-for="tick in yTicks" :key="tick.value" x="48" :y="tick.y + 4" text-anchor="end" fill="#94a3b8" font-size="10">{{ compact(tick.value) }}</text>
            </svg>
          </div>

          <div v-if="recentBids.length" class="mt-4 grid gap-3 sm:grid-cols-3">
            <article v-for="move in recentBids" :key="move.id" class="rounded-xl border border-slate-200/70 p-3 dark:border-slate-700">
              <div class="flex items-center justify-between">
                <b class="truncate text-xs">{{ isOrganizer ? store.supplier(move.supplierId)?.name : 'Your submitted offer' }}</b>
                <span class="text-[9px] text-slate-400">{{ clock(move.at) }}</span>
              </div>
              <p class="mt-2 text-lg font-800">{{ store.money(move.amount, auction.currency) }}</p>
              <p class="mt-1 text-[10px]" :class="move.delta < 0 ? 'text-emerald-500' : 'text-slate-400'">
                {{ move.delta ? store.money(move.delta, auction.currency) : "Opening offer" }}<template v-if="isOrganizer"> · {{ sourceLabel(move.source) }}</template>
              </p>
            </article>
          </div>
          <p v-else-if="isSupplier" class="mt-4 rounded-xl border border-dashed border-slate-200 px-3 py-2 text-[11px] text-slate-500 dark:border-slate-700">Your submitted offers will appear here. Competitor identities and commercial values are never disclosed.</p>
        </div>

        <!-- Side Controls -->
        <aside class="p-5">
          <div v-if="isSupplier">
            <div class="flex items-center justify-between">
              <div>
                <span class="text-[10px] font-800 uppercase tracking-wide text-brand">Your offer</span>
                <h3 class="mt-1 text-lg font-800">{{ bidder?.name }}</h3>
              </div>
              <span class="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand"><i class="fa-solid fa-hand-holding-dollar"></i></span>
            </div>
            <div class="mt-4 rounded-xl bg-slate-950 p-4 text-white">
              <div class="flex justify-between text-xs"><span class="text-slate-400">Your rank</span><b>#{{ bidder?.rank || "—" }}</b></div>
              <div class="mt-3 flex justify-between text-xs"><span class="text-slate-400">Your last offer</span><b>{{ bidder?.lastBid ? store.money(bidder.lastBid, auction.currency) : "No offer" }}</b></div>
              <div class="mt-3 flex justify-between text-xs"><span class="text-slate-400">Bid privacy</span><b class="text-brand-100">Blind ranking</b></div>
            </div>
            <form class="mt-4" @submit.prevent="placeBid">
              <label>
                <span class="mb-1.5 block text-xs font-bold">Offer amount</span>
                <div class="relative">
                  <span class="absolute left-3 top-2.5 text-xs text-slate-400">{{ auction.currency }}</span>
                  <input ref="bidInput" v-model.number="bidAmount" type="number" min="1" step="1" class="field pl-12 text-lg font-800" required aria-describedby="blind-bid-help" />
                </div>
              </label>
              <p id="blind-bid-help" class="mt-1.5 text-[10px] text-slate-500">Submit your best lower offer. The platform validates the permitted range without disclosing competitor pricing.</p>
              <p v-if="bidError" class="mt-2 text-xs font-semibold text-rose-500"><i class="fa-solid fa-circle-exclamation mr-1"></i>{{ bidError }}</p>
              <button class="btn-brand mt-3 w-full" :disabled="auction.status !== 'Running'"><i class="fa-solid fa-gavel mr-1"></i>Send offer</button>
            </form>
            <label class="mt-4 flex items-center gap-3 rounded-xl border border-slate-200/70 p-3 dark:border-slate-700">
              <input v-model="bidder.autoBid" type="checkbox" class="accent-[var(--accent)]" />
              <span class="min-w-0 flex-1"><b class="block text-xs">Auto-bid</b><small class="text-[10px] text-slate-500">Automatically respond down to limit.</small></span>
            </label>
            <label v-if="bidder.autoBid" class="mt-3 block">
              <span class="mb-1.5 block text-xs font-bold">Lowest auto-bid</span>
              <input v-model.number="bidder.cap" class="field" type="number" min="1" step="1" />
            </label>
          </div>
          <div v-else>
            <div class="flex items-center justify-between">
              <div><span class="text-[10px] font-800 uppercase tracking-wide text-brand">Controls</span><h3 class="mt-1 text-lg font-800">Round controls</h3></div>
              <span class="badge" :class="health.tone"><i class="fa-solid fa-heart-pulse mr-1"></i>{{ health.label }}</span>
            </div>
            <div class="mt-4 grid grid-cols-2 gap-2">
              <button class="btn-muted" @click="extend"><i class="fa-solid fa-clock mr-1"></i>+60 sec</button>
              <button class="btn-muted" @click="sendAlert"><i class="fa-solid fa-bullhorn mr-1"></i>Alert</button>
              <button class="btn-muted" @click="tab = 'rank'"><i class="fa-solid fa-users-gear mr-1"></i>Review</button>
              <button class="btn-muted" @click="tab = 'audit'"><i class="fa-solid fa-shield-halved mr-1"></i>Activity</button>
            </div>
            <div class="mt-5 rounded-xl border border-slate-200/70 p-4 dark:border-slate-700">
              <h4 class="text-xs font-800">Limits</h4>
              <div class="mt-3 space-y-3 text-[11px]">
                <div class="flex justify-between"><span class="text-slate-500">Minimum step</span><b>{{ store.money(auction.minStep, auction.currency) }}</b></div>
                <div class="flex justify-between"><span class="text-slate-500">Last-minute extension</span><b>{{ auction.antiSnipingSeconds }} sec</b></div>
                <div class="flex justify-between"><span class="text-slate-500">Lowest allowed</span><b>{{ store.money(auction.floor, auction.currency) }}</b></div>
                <div class="flex justify-between"><span class="text-slate-500">Reserve</span><b>{{ store.money(auction.reserve, auction.currency) }}</b></div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <!-- History Tab -->
      <AuctionHistoryTab
        v-else-if="tab === 'history'"
        :bids="historyBids"
        :currency="auction.currency"
        :clock="clock"
        :supplier-name="(id) => store.supplier(id)?.name || id"
        :format-money="store.money"
        :source-label="sourceLabel"
        :is-organizer="isOrganizer"
      />

      <!-- Rank Tab -->
      <AuctionRankTable
        v-else-if="tab === 'rank'"
        :ranked-participants="presentedRankedParticipants"
        :leader="presentedLeader"
        :is-organizer="isOrganizer"
        :viewer-supplier-id="currentSupplierId"
        :currency="auction.currency"
        :format-money="store.money"
        :supplier-status="(id) => store.supplier(id)?.status || 'Active'"
        @toggle-disqualified="toggleDisqualified"
      />

      <CommunicationThread
        v-else-if="tab === 'communications'"
        context-type="auction"
        :context-id="auction.id"
        :title="auction.title"
        :can-announce="canAnnounce"
      />

      <!-- Audit Tab -->
      <AuctionAuditTab
        v-else
        :audit="auction.audit"
        :action-label="actionLabel"
        :format-date="store.date"
      />
    </section>
  </div>
  <section v-else class="panel p-10 text-center">
    <i class="fa-solid fa-lock text-3xl text-slate-400"></i>
    <h2 class="mt-4 text-xl font-800">No invited live rounds</h2>
    <p class="mt-2 text-sm text-slate-500">Only organizers and invited suppliers can open auction details.</p>
  </section>
</template>
<script>
const { inject, computed, ref, onMounted, onBeforeUnmount, watch } = Vue;
const { useRoute, useRouter } = VueRouter;
const load = (p) => Vue.defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(p, window.sfcOptions));
const AuctionRankTable = load("./app/pages/procurement/auction/AuctionRankTable.vue?v=2");
const AuctionHistoryTab = load("./app/pages/procurement/auction/AuctionHistoryTab.vue?v=2");
const AuctionAuditTab = load("./app/pages/procurement/auction/AuctionAuditTab.vue?v=1");
const CommunicationThread = load("./app/components/CommunicationThread.vue?v=1");
const SavingsWaterfall = load("./app/components/commercial/SavingsWaterfall.vue?v=3");

const COLOR_PALETTE = ["#0ea5e9", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#14b8a6", "#6366f1", "#f97316"];

export default {
  components: { AuctionRankTable, AuctionHistoryTab, AuctionAuditTab, CommunicationThread, SavingsWaterfall },
  setup() {
    const store = inject("store"), route = useRoute(), router = useRouter();
    const tab = computed({
      get: () => {
        const allowed = store.marketplaceMode.value === "supplier" ? ["live", "rank", "history", "communications"] : ["live", "history", "rank", "communications", "audit"];
        return allowed.includes(route.query.tab) ? route.query.tab : "live";
      },
      set: (key) => router.push({ path: "/procurement/auction", query: window.WebCommon.mergeRouteQuery(route.query, { tab: key }) }),
    });

    const selectedAuctionId = ref(route.query.auction || "");
    const bidAmount = ref(0), bidError = ref(""), visibleSuppliers = ref([]), liveActivity = ref(null), bidInput = ref(null);
    let timer = null, unsubscribeRealtime = null;

    const accessibleAuctions = computed(() => {
      const scopedAuctions = store.scopedRecords(store.state.auctions);
      const list = scopedAuctions.filter((item) => {
        if (store.isAdmin.value) return true;
        if (store.marketplaceMode.value === "supplier") {
          const supplierId = store.currentSupplierId?.value || store.userSupplierId(store.currentUser.value.id);
          if (supplierId) return item.participants.some((p) => p.supplierId === supplierId);
        }
        const event = store.sourcingEvent(item.eventId);
        return item.hostId === store.currentUser.value.id || event?.ownerId === store.currentUser.value.id;
      });
      return store.marketplaceMode.value === "supplier"
        ? list
        : list;
    });

    const auction = computed(() => accessibleAuctions.value.find((item) => item.id === selectedAuctionId.value) || accessibleAuctions.value[0]);
    const commercial = computed(() => {
      const event = auction.value?.eventId ? store.sourcingEvent(auction.value.eventId) : null;
      return window.BuyniverseCommercialMetrics?.auction(auction.value, event, {
        successFeeRate: store.state.procurementAnalytics?.commercialModel?.gainShareRate ?? 40,
        successFeeBasis: store.state.procurementAnalytics?.commercialModel?.successFeeBasis,
      }) || {};
    });
    const isOrganizer = computed(() => store.canManageProcurement(auction.value ? store.sourcingEvent(auction.value.eventId) : null));
    const realtimeStatus = computed(() => {
      if (auction.value?.realtimeChannel === "server") return { label: store.t("Secure live channel"), note: store.t("Realtime activity is delivered through the secure auction channel.") };
      return { label: store.t("Live activity"), note: store.t("Activity updates instantly across your active workspace tabs.") };
    });
    // Announcements are a privileged outward-facing action. Keep this narrower than
    // the dashboard's organizer presentation mode; domainActions enforces it too.
    const canAnnounce = computed(() => {
      const currentUserId = store.currentUser.value?.id;
      const eventOwnerId = auction.value?.eventId ? store.sourcingEvent(auction.value.eventId)?.ownerId : null;
      return Boolean(currentUserId && (store.isAdmin.value || auction.value?.hostId === currentUserId || eventOwnerId === currentUserId));
    });
    const isSupplier = computed(() => store.marketplaceMode.value === "supplier" || (!isOrganizer.value && Boolean(bidder.value)));

    const currentSupplierId = computed(() => {
      return store.currentSupplierId?.value || store.userSupplierId(store.currentUser.value.id) || (isSupplier.value ? auction.value?.participants[0]?.supplierId : null);
    });

    const bidder = computed(() => auction.value?.participants.find((p) => p.supplierId === currentSupplierId.value) || null);

    const tabs = computed(() => [
      { key: "live", label: "Live Room", icon: "fa-tower-broadcast" },
      { key: "rank", label: isOrganizer.value ? "Supplier Standings" : "Your Position", icon: "fa-users-gear" },
      { key: "history", label: isOrganizer.value ? "Bid Stream" : "Your Offers", icon: "fa-list-ol" },
      { key: "communications", label: "Messages", icon: "fa-comments" },
      ...(isOrganizer.value ? [{ key: "audit", label: "Audit & Anti-Sniping", icon: "fa-shield-halved" }] : []),
    ]);

    const rankedParticipants = computed(() => {
      if (!auction.value) return [];
      const valid = auction.value.participants.map((p) => {
        const bids = auction.value.bids.filter((b) => b.supplierId === p.supplierId);
        const lastBid = bids.length ? bids[bids.length - 1].amount : null;
        return { ...p, lastBid, bidCount: bids.length };
      });
      valid.sort((a, b) => (a.lastBid || Infinity) - (b.lastBid || Infinity));
      return valid.map((p, i) => ({ ...p, rank: p.lastBid ? i + 1 : "—" }));
    });

    const leader = computed(() => rankedParticipants.value.find((p) => p.rank === 1) || rankedParticipants.value[0]);
    // Suppliers get a blind-bid projection.  Do not hand a child component a
    // rival's name, price, risk score or automated-bid setting and rely on CSS
    // to conceal it: this view model is safe by construction.
    const presentedRankedParticipants = computed(() => {
      if (isOrganizer.value) return rankedParticipants.value;
      return rankedParticipants.value.map((participant) => {
        if (participant.supplierId === currentSupplierId.value) return participant;
        return {
          supplierId: participant.supplierId,
          name: "Competing supplier",
          rank: participant.rank,
          disqualified: false,
          lastBid: null,
          bidCount: null,
          risk: null,
          autoBid: null,
        };
      });
    });
    const presentedLeader = computed(() => isOrganizer.value ? leader.value : bidder.value);

    const kpis = computed(() => {
      if (!auction.value) return [];
      if (!isOrganizer.value) return [
        { label: store.t("Your offer"), value: bidder.value?.lastBid ? store.money(bidder.value.lastBid, auction.value.currency) : store.t("Not submitted"), icon: "fa-hand-holding-dollar", note: store.t("Only your submitted amount is shown") },
        { label: store.t("Your rank"), value: bidder.value?.rank ? `#${bidder.value.rank}` : "—", icon: "fa-ranking-star", note: store.t("Rank updates after a valid offer") },
        { label: store.t("Competition"), value: auction.value.status === "Running" ? store.t("Live") : statusLabel(auction.value.status), icon: "fa-tower-broadcast", note: store.t("Competitor identities and prices are private") },
        { label: store.t("Round"), value: auction.value.id, icon: "fa-shield-halved", note: store.t("Blind-bid controls are active") },
      ];
      return [
        { label: store.t("Current best"), value: store.money(commercial.value.bestFinal || 0, auction.value.currency), icon: "fa-trophy", note: store.t("Leading lowest quote") },
        { label: store.t("Financial savings"), value: store.money(commercial.value.financialSavings || 0, auction.value.currency), icon: "fa-chart-line", note: store.t("Budget to best first offer") },
        { label: store.t("Buyniverse savings"), value: store.money(commercial.value.buyniverseSavings || 0, auction.value.currency), icon: "fa-gavel", note: store.t("Best first offer to current bid") },
        { label: store.t("Service fee"), value: store.money(commercial.value.outcomeShare || 0, auction.value.currency), icon: "fa-percent", note: store.t(`${commercial.value.successFeeRate || 40}% of validated savings`) },
        { label: store.t("Total offers"), value: String(auction.value.bids.length), icon: "fa-gavel", note: store.t("Verified bid records") },
        { label: store.t("Suppliers"), value: store.t(`${auction.value.participants.length} invited`), icon: "fa-users", note: store.t("Qualified suppliers") },
      ];
    });

    const statusClass = computed(() => ({
      Running: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
      Paused: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
      Awarded: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
      Closed: "bg-slate-100 text-slate-600 dark:bg-slate-700",
    })[auction.value?.status] || "bg-slate-100 text-slate-600");

    const statusLabel = (s) => store.t(({ Running: "Live Bidding", Paused: "Paused", Awarded: "Awarded", Closed: "Completed" })[s] || s);
    const timeLeft = computed(() => {
      const closingAt = auction.value?.closingAt || auction.value?.endAt;
      if (!closingAt) return "—";
      const diff = Math.max(0, new Date(closingAt).getTime() - Date.now());
      const m = Math.floor(diff / 60000), s = Math.floor((diff % 60000) / 1000);
      return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    });

    const health = computed(() => {
      if (!auction.value) return { label: store.t("Unknown"), tone: "bg-slate-100" };
      if (auction.value.bids.length >= 8) return { label: store.t("High Competition"), tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10" };
      if (auction.value.bids.length >= 3) return { label: store.t("Active Bidding"), tone: "bg-sky-50 text-sky-700 dark:bg-sky-500/10" };
      return { label: store.t("Low Activity"), tone: "bg-amber-50 text-amber-700 dark:bg-amber-500/10" };
    });

    const supplierSeries = computed(() => {
      if (!auction.value) return [];
      return auction.value.participants.map((p, i) => {
        const bids = auction.value.bids.filter((b) => b.supplierId === p.supplierId);
        const first = bids[0]?.amount || auction.value.reserve, last = bids[bids.length - 1]?.amount || first;
        return { supplierId: p.supplierId, name: p.name, color: COLOR_PALETTE[i % COLOR_PALETTE.length], improvement: Math.max(0, first - last) };
      });
    });

    const allSuppliersSelected = computed(() => !visibleSuppliers.value.length || visibleSuppliers.value.length === supplierSeries.value.length);
    const visibleSupplierSeries = computed(() => visibleSuppliers.value.length ? supplierSeries.value.filter((s) => visibleSuppliers.value.includes(s.supplierId)) : supplierSeries.value);
    const isSupplierVisible = (id) => allSuppliersSelected.value || visibleSuppliers.value.includes(id);
    const showAllSuppliers = () => { visibleSuppliers.value = []; };
    const clearSupplierFilters = () => { visibleSuppliers.value = [supplierSeries.value[0]?.supplierId].filter(Boolean); };
    const toggleSupplier = (id) => {
      if (allSuppliersSelected.value) { visibleSuppliers.value = [id]; return; }
      const idx = visibleSuppliers.value.indexOf(id);
      if (idx >= 0) visibleSuppliers.value.splice(idx, 1); else visibleSuppliers.value.push(id);
    };

    const shortName = (name) => name.replace(/ (LLC|Inc|Corp|S\.A\.|GmbH|Ltd)$/i, "");
    const supplierColor = (id) => {
      const idx = auction.value?.participants.findIndex((p) => p.supplierId === id) ?? -1;
      return idx >= 0 ? COLOR_PALETTE[idx % COLOR_PALETTE.length] : "#64748b";
    };

    const visibleBidValues = computed(() => {
      if (!auction.value) return [];
      return isOrganizer.value
        ? auction.value.bids.map((bid) => bid.amount)
        : auction.value.bids.filter((bid) => bid.supplierId === currentSupplierId.value).map((bid) => bid.amount);
    });
    const minAmount = computed(() => {
      const values = visibleBidValues.value;
      if (!values.length) return 0;
      const anchor = isOrganizer.value ? auction.value.floor : Math.min(...values);
      return Math.max(0, Math.min(anchor, ...values) * 0.95);
    });
    const maxAmount = computed(() => {
      const values = visibleBidValues.value;
      if (!values.length) return 1000;
      const anchor = isOrganizer.value ? auction.value.reserve : Math.max(...values);
      return Math.max(1, Math.max(anchor, ...values) * 1.05);
    });
    const valueY = (v) => 290 - ((v - minAmount.value) / Math.max(1, maxAmount.value - minAmount.value)) * 240;
    const pointX = (idx) => {
      const total = isOrganizer.value ? auction.value?.bids.length || 0 : visibleBidValues.value.length;
      return 55 + (idx / Math.max(1, total - 1)) * 820;
    };

    const overallPoints = computed(() => {
      if (!auction.value?.bids.length) return "";
      return auction.value.bids
        .filter((bid) => isOrganizer.value || bid.supplierId === currentSupplierId.value)
        .map((bid, index) => `${pointX(index)},${valueY(bid.amount)}`).join(" ");
    });

    const areaPath = computed(() => {
      if (!overallPoints.value) return "";
      const pts = overallPoints.value.split(" ");
      const firstX = pts[0].split(",")[0], lastX = pts[pts.length - 1].split(",")[0];
      return `M ${firstX},290 L ${overallPoints.value.replace(/ /g, " L ")} L ${lastX},290 Z`;
    });

    const chartSupplierSeries = computed(() => {
      if (!auction.value || (isOrganizer.value && allSuppliersSelected.value)) return [];
      const series = isOrganizer.value
        ? visibleSupplierSeries.value
        : supplierSeries.value.filter((item) => item.supplierId === currentSupplierId.value);
      return series.map((s) => {
        const points = auction.value.bids
          .map((bid, index) => ({ ...bid, idx: index }))
          .filter((bid) => bid.supplierId === s.supplierId)
          .map((bid, index) => ({ id: bid.id, amount: bid.amount, at: bid.at, x: pointX(isOrganizer.value ? bid.idx : index), y: valueY(bid.amount) }));
        return { ...s, points, polyline: points.map((p) => `${p.x},${p.y}`).join(" ") };
      });
    });

    const yTicks = computed(() => {
      const step = (maxAmount.value - minAmount.value) / 4;
      return [0, 1, 2, 3, 4].map((i) => {
        const val = minAmount.value + step * i;
        return { value: val, y: valueY(val) };
      });
    });

    const compact = (v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(Math.round(v));
    const recentBids = computed(() => {
      if (!auction.value) return [];
      const bids = isOrganizer.value ? auction.value.bids : auction.value.bids.filter((bid) => bid.supplierId === currentSupplierId.value);
      return [...bids].reverse().slice(0, 3);
    });
    const historyBids = computed(() => {
      if (!auction.value) return [];
      const bids = isOrganizer.value ? auction.value.bids : auction.value.bids.filter((bid) => bid.supplierId === currentSupplierId.value);
      return [...bids].reverse();
    });
    const clock = (iso) => iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";
    const sourceLabel = (src) => store.t(({ manual: "Manual operator", auto: "Auto-bid algorithm", system: "Floor calibration" })[src] || src);
    const actionLabel = (act) => act;
    const signalCopy = (signal) => {
      if (!signal) return "";
      if (signal.type === "bid_received") return "A new valid offer was registered.";
      if (signal.type === "offer_recorded") return "Your valid offer is recorded in this live round.";
      if (signal.type === "competitive_offer") return "A competing offer was recorded. Improve yours while the round is open.";
      if (signal.type === "auction_extended") return "A valid late offer extended the round by 60 seconds.";
      if (signal.type === "auction_paused") return "The organizer paused this live round.";
      if (signal.type === "auction_resumed") return "The organizer resumed this live round.";
      if (signal.type === "auction_closed") return "The organizer closed this live round.";
      return "Live auction activity was updated.";
    };
    const signalTitle = (signal) => {
      if (signal?.type === "competitive_offer") return "Live auction moved";
      if (signal?.type === "auction_extended") return "Auction extended";
      if (signal?.type === "offer_recorded") return "Offer recorded";
      return "Live auction activity";
    };

    const rememberLiveActivity = (signal) => {
      if (!auction.value || !signal || signal.roomId !== (auction.value.realtimeRoomRef || auction.value.id)) return;
      liveActivity.value = signal;
      if (signal.source !== "server") return;
      if (!Array.isArray(auction.value.realtimeEvents)) auction.value.realtimeEvents = [];
      const eventId = String(signal.id || "");
      if (eventId && !auction.value.realtimeEvents.some((item) => String(item.id) === eventId)) {
        auction.value.realtimeEvents.unshift({ id: eventId, type: signal.type, at: signal.at, actorId: null, supplierId: null, source: "server" });
        auction.value.realtimeEvents.splice(50);
      }
      const currentUserId = store.currentUser.value?.id;
      if (currentUserId) store.addNotification({
        userId: currentUserId, title: store.t(signalTitle(signal)), text: store.t(signalCopy(signal)),
        link: `/procurement/auction?auction=${auction.value.id}`, icon: signal.type === "auction_extended" ? "fa-clock-rotate-left" : "fa-tower-broadcast",
      });
      store.notice(store.t(signalCopy(signal)), signal.type === "competitive_offer" ? "fa-bolt" : "fa-tower-broadcast");
    };
    const attachRealtime = () => {
      if (unsubscribeRealtime) { unsubscribeRealtime(); unsubscribeRealtime = null; }
      const room = auction.value?.realtimeRoomRef || auction.value?.id;
      const serverEnabled = auction.value?.realtimeChannel === "server";
      if (room && (store.isDemo.value || serverEnabled) && window.BuyniverseAuctionRealtime?.subscribe)
        unsubscribeRealtime = window.BuyniverseAuctionRealtime.subscribe(room, rememberLiveActivity);
    };

    const selectAuction = () => { router.push({ path: "/procurement/auction", query: window.WebCommon.mergeRouteQuery(route.query, { auction: selectedAuctionId.value }) }); };
    const pause = () => { store.manageLiveAuction(auction.value, "pause"); };
    const resume = () => { store.manageLiveAuction(auction.value, "resume"); };
    const extend = () => { store.manageLiveAuction(auction.value, "extend"); };
    const sendAlert = () => { tab.value = "communications"; };
    const cancel = async () => {
      if (await store.confirm({ title: "Cancel live auction?", message: "This stops bidding and closes the room.", confirmText: "Cancel auction", danger: true })) store.manageLiveAuction(auction.value, "cancel");
    };
    const award = async () => {
      if (!leader.value) return;
      const reason = await store.prompt({ title: "Record award decision", message: `Award ${leader.value.name} for ${store.money(auction.value.currentBid, auction.value.currency)}.\n\nValidated savings: ${store.money(commercial.value.totalSavings || 0, auction.value.currency)}\nBuyniverse service fee (${commercial.value.successFeeRate || 40}%): ${store.money(commercial.value.outcomeShare || 0, auction.value.currency)}\nNet buyer savings: ${store.money(commercial.value.netSavings || 0, auction.value.currency)}\n\nCapture the auditable business reason.`, placeholder: "Best compliant value and delivery commitment", confirmText: "Award and create order", multiline: true });
      if (!reason) return;
      const order = store.awardLiveAuction(auction.value, reason);
      if (order) router.push(`/procurement/execution?order=${order.id}`);
    };

    const toggleDisqualified = (p) => {
      if (!isOrganizer.value) return store.notice("Supplier review is not allowed", "fa-shield-halved");
      p.disqualified = !p.disqualified;
      store.procurementEvent(auction.value, p.disqualified ? "Supplier disqualified" : "Supplier reinstated", p.name);
    };

    const placeBid = () => {
      bidError.value = "";
      if (!auction.value || auction.value.status !== 'Running') return;
      const bid = store.placeLiveAuctionBid(auction.value, Number(bidAmount.value));
      if (!bid) { bidError.value = "This offer is outside the permitted blind-bid range. Submit a lower valid amount."; return; }
      bidAmount.value = Math.max(auction.value.floor, bid.amount - auction.value.minStep);
    };
    const improveOffer = () => {
      if (!auction.value || auction.value.status !== "Running") return;
      bidAmount.value = bidder.value?.lastBid ? Math.max(1, Number(bidder.value.lastBid) - 1) : 0;
      requestAnimationFrame(() => bidInput.value?.focus?.());
    };

    watch(() => route.query.auction, (v) => { if (v && v !== selectedAuctionId.value) selectedAuctionId.value = v; }, { immediate: true });
    watch(() => bidder.value?.lastBid, (value) => {
      if (!bidAmount.value && Number.isFinite(Number(value))) bidAmount.value = Math.max(1, Number(value) - 1);
    }, { immediate: true });
    watch(() => auction.value?.realtimeRoomRef || auction.value?.id, () => { attachRealtime(); }, { immediate: true });

    onMounted(() => {
      timer = setInterval(() => {
        if (store.isDemo.value && auction.value?.status === "Running" && Math.random() < 0.08) {
          const others = auction.value.participants.filter((p) => p.supplierId !== currentSupplierId.value && !p.disqualified && p.autoBid);
          if (others.length) {
            const bot = others[Math.floor(Math.random() * others.length)];
            store.simulateLiveAuctionBid(auction.value, bot.supplierId);
          }
        }
      }, 3000);
    });

    onBeforeUnmount(() => { if (timer) clearInterval(timer); if (unsubscribeRealtime) unsubscribeRealtime(); });

    return {
      store, router, auction, commercial, selectedAuctionId, accessibleAuctions, isOrganizer, canAnnounce, isSupplier, bidder,
      tabs, tab, rankedParticipants, presentedRankedParticipants, leader, presentedLeader, kpis, statusClass, statusLabel, timeLeft,
      health, supplierSeries, allSuppliersSelected, visibleSupplierSeries, isSupplierVisible, showAllSuppliers,
      clearSupplierFilters, toggleSupplier, shortName, supplierColor, valueY, pointX, overallPoints,
      areaPath, chartSupplierSeries, yTicks, compact, recentBids, historyBids, clock, sourceLabel,
      actionLabel, selectAuction, pause, resume, extend, sendAlert, cancel, award, toggleDisqualified,
      placeBid, improveOffer, bidAmount, bidError, bidInput, liveActivity, signalCopy, realtimeStatus,
    };
  },
};
</script>
