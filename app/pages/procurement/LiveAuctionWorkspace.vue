<template>
  <div v-if="auction" class="space-y-4">
    <!-- Densified Top Metric Strip -->
    <section class="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      <article
        class="relative flex min-h-11 items-center gap-2 overflow-hidden rounded-xl bg-brand p-2.5 text-white shadow-soft"
        :title="`${auction.extensionCount}/${auction.maxExtensions} extensions`"
      >
        <span class="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-white/20 text-[11px]"><i class="fa-regular fa-clock"></i></span>
        <span class="min-w-0 truncate text-[10px] font-bold uppercase tracking-wider text-white/80">Remaining</span>
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

    <!-- Main Workspace Container -->
    <section class="panel overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-card dark:border-slate-800/80 dark:bg-slate-900/90">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2 text-[11px] dark:border-slate-800/80 dark:bg-slate-950/40">
        <div class="flex items-center gap-1.5 text-slate-500">
          <RouterLink to="/procurement" class="font-semibold hover:text-brand">Procurement</RouterLink>
          <span>/</span>
          <RouterLink to="/procurement/auction" class="font-semibold hover:text-brand">Live Auctions</RouterLink>
          <span>/</span>
          <span class="font-bold text-slate-900 dark:text-white">{{ auction.id }}</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-slate-400">Source:</span>
          <RouterLink :to="`/procurement/sourcing?event=${auction.eventId}`" class="font-bold text-brand hover:underline inline-flex items-center gap-1">
            <i class="fa-solid fa-file-signature text-[10px]"></i>{{ auction.eventId }}
          </RouterLink>
          <span v-if="auction.awardedSupplierId || auction.status === 'Awarded'" class="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
            <i class="fa-solid fa-trophy text-[10px]"></i>
            Winner:
            <RouterLink :to="`/suppliers?supplier=${auction.awardedSupplierId || leader?.supplierId}`" class="hover:underline font-extrabold ml-0.5">
              {{ store.supplier(auction.awardedSupplierId || leader?.supplierId)?.name || 'Awarded Supplier' }}
            </RouterLink>
          </span>
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
            <span class="badge rounded-lg bg-slate-100 px-2.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">Reverse Auction</span>
          </div>
          <h1 class="font-head text-xl font-800 tracking-tight text-slate-900 dark:text-white">{{ auction.title }}</h1>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <select v-model="selectedAuctionId" class="field w-auto min-w-44 text-xs font-semibold py-1.5 px-2.5" @change="selectAuction">
            <option v-for="item in accessibleAuctions" :key="item.id" :value="item.id">{{ item.id }} · {{ item.title }}</option>
          </select>
          <template v-if="isOrganizer">
            <button v-if="auction.status === 'Paused'" class="btn-brand text-xs py-1.5 px-3" @click="resume"><i class="fa-solid fa-play mr-1"></i>Resume</button>
            <button v-else-if="auction.status === 'Running'" class="btn-muted text-xs py-1.5 px-3" @click="pause"><i class="fa-solid fa-pause mr-1"></i>Pause</button>
            <button v-if="auction.status !== 'Awarded'" class="btn-brand text-xs py-1.5 px-3" @click="award"><i class="fa-solid fa-trophy mr-1"></i>Award</button>
            <button v-if="auction.status !== 'Awarded'" class="btn-muted text-xs py-1.5 px-3 text-rose-500 hover:text-rose-600" @click="cancel"><i class="fa-solid fa-ban mr-1"></i>Cancel</button>
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
          <i class="fa-solid mr-1.5" :class="item.icon"></i>{{ item.label }}
        </button>
      </nav>

      <!-- Live Tab -->
      <div v-if="tab === 'live'" class="grid gap-0 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <div class="border-b border-slate-200/70 p-5 dark:border-slate-700 2xl:border-b-0 2xl:border-r">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 class="text-sm font-800">Offer movement</h3>
              <p class="mt-1 text-xs text-slate-500">Lower valid offers lead this round.</p>
            </div>
            <div class="flex flex-wrap gap-3 text-[10px]">
              <span><i class="mr-1 inline-block h-0.5 w-3 bg-brand align-middle"></i>Market movement</span>
              <span><i class="mr-1 inline-block h-0.5 w-3 bg-amber-400 align-middle"></i>Reserve</span>
            </div>
          </div>
          <div v-if="isOrganizer" class="mt-3 flex flex-col gap-2 rounded-xl border border-slate-200/70 bg-slate-50/65 p-2.5 dark:border-slate-700 dark:bg-slate-900/25 sm:flex-row sm:items-center">
            <div class="flex items-center justify-between gap-2 sm:shrink-0">
              <span class="text-[10px] font-800 uppercase tracking-wide text-slate-400">Providers</span>
              <span class="text-[10px] text-slate-400">{{ visibleSupplierSeries.length }} of {{ supplierSeries.length }}</span>
            </div>
            <div class="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5 sm:pl-2" role="group" aria-label="Filter offer chart by supplier">
              <button class="min-w-max rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition" :class="allSuppliersSelected ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-white text-slate-500 hover:border-brand hover:text-brand dark:border-slate-700 dark:bg-slate-800'" :aria-pressed="allSuppliersSelected" title="Show all supplier lines" @click="showAllSuppliers">All suppliers</button>
              <button v-for="series in supplierSeries" :key="series.supplierId" class="flex min-w-max items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition" :class="isSupplierVisible(series.supplierId) ? 'border-slate-300 bg-white text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100' : 'border-transparent bg-slate-100/80 text-slate-400 opacity-60 hover:opacity-100 dark:bg-slate-800/50'" :aria-pressed="isSupplierVisible(series.supplierId)" :aria-label="series.name" @click="toggleSupplier(series.supplierId)">
                <i class="h-2 w-2 rounded-full" :style="{ background: series.color }"></i><span>{{ shortName(series.name) }}</span>
                <span v-if="series.improvement > 0" class="font-normal text-emerald-600 dark:text-emerald-400">↓ {{ store.money(series.improvement, auction.currency) }}</span>
              </button>
              <button v-if="visibleSupplierSeries.length" class="min-w-max rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-400 hover:text-brand" title="Hide all supplier lines" @click="clearSupplierFilters">Clear</button>
            </div>
          </div>
          <div v-else class="mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-slate-50/65 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/25">
            <span class="text-[10px] font-800 uppercase tracking-wide text-slate-400">Your company offer</span>
            <b class="text-xs">{{ bidder?.name }} · #{{ bidder?.rank || "—" }}</b>
          </div>

          <div class="mt-4 overflow-hidden rounded-xl border border-slate-200/70 bg-white/60 p-3 dark:border-slate-700 dark:bg-slate-900/35">
            <svg viewBox="0 0 900 330" class="h-auto w-full" role="img" aria-label="Live offer graph">
              <defs><linearGradient id="auction-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".18" /><stop offset="1" stop-color="var(--accent)" stop-opacity="0" /></linearGradient></defs>
              <g class="text-slate-300 dark:text-slate-700"><line v-for="y in [50, 110, 170, 230, 290]" :key="y" x1="55" :y1="y" x2="875" :y2="y" stroke="currentColor" stroke-width="1" /></g>
              <line x1="55" :y1="valueY(auction.reserve)" x2="875" :y2="valueY(auction.reserve)" stroke="#f59e0b" stroke-width="2" stroke-dasharray="8 6" />
              <text x="60" :y="valueY(auction.reserve) - 8" fill="#d97706" font-size="11">Reserve {{ store.money(auction.reserve, auction.currency) }}</text>
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
              <text v-for="tick in yTicks" :key="tick.value" x="48" :y="tick.y + 4" text-anchor="end" fill="#94a3b8" font-size="10">{{ compact(tick.value) }}</text>
            </svg>
          </div>

          <div class="mt-4 grid gap-3 sm:grid-cols-3">
            <article v-for="move in recentBids" :key="move.id" class="rounded-xl border border-slate-200/70 p-3 dark:border-slate-700">
              <div class="flex items-center justify-between">
                <b class="truncate text-xs">{{ store.supplier(move.supplierId)?.name }}</b>
                <span class="text-[9px] text-slate-400">{{ clock(move.at) }}</span>
              </div>
              <p class="mt-2 text-lg font-800">{{ store.money(move.amount, auction.currency) }}</p>
              <p class="mt-1 text-[10px]" :class="move.delta < 0 ? 'text-emerald-500' : 'text-slate-400'">
                {{ move.delta ? store.money(move.delta, auction.currency) : "Opening offer" }} · {{ sourceLabel(move.source) }}
              </p>
            </article>
          </div>
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
              <div class="mt-3 flex justify-between text-xs"><span class="text-slate-400">Next valid offer</span><b class="text-brand-100">{{ store.money(nextValidBid, auction.currency) }}</b></div>
            </div>
            <form class="mt-4" @submit.prevent="placeBid">
              <label>
                <span class="mb-1.5 block text-xs font-bold">Offer amount</span>
                <div class="relative">
                  <span class="absolute left-3 top-2.5 text-xs text-slate-400">{{ auction.currency }}</span>
                  <input v-model.number="bidAmount" type="number" :max="nextValidBid" :min="auction.floor" :step="auction.minStep" class="field pl-12 text-lg font-800" required />
                </div>
              </label>
              <p v-if="bidError" class="mt-2 text-xs font-semibold text-rose-500"><i class="fa-solid fa-circle-exclamation mr-1"></i>{{ bidError }}</p>
              <button class="btn-brand mt-3 w-full" :disabled="auction.status !== 'Running'"><i class="fa-solid fa-gavel mr-1"></i>Send offer</button>
            </form>
            <label class="mt-4 flex items-center gap-3 rounded-xl border border-slate-200/70 p-3 dark:border-slate-700">
              <input v-model="bidder.autoBid" type="checkbox" class="accent-[var(--accent)]" />
              <span class="min-w-0 flex-1"><b class="block text-xs">Auto-bid</b><small class="text-[10px] text-slate-500">Automatically respond down to limit.</small></span>
            </label>
            <label v-if="bidder.autoBid" class="mt-3 block">
              <span class="mb-1.5 block text-xs font-bold">Lowest auto-bid</span>
              <input v-model.number="bidder.cap" class="field" type="number" :min="auction.floor" :max="auction.currentBid" />
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
      />

      <!-- Rank Tab -->
      <AuctionRankTable
        v-else-if="tab === 'rank'"
        :ranked-participants="rankedParticipants"
        :leader="leader"
        :is-organizer="isOrganizer"
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
const AuctionRankTable = load("./app/pages/procurement/auction/AuctionRankTable.vue?v=1");
const AuctionHistoryTab = load("./app/pages/procurement/auction/AuctionHistoryTab.vue?v=1");
const AuctionAuditTab = load("./app/pages/procurement/auction/AuctionAuditTab.vue?v=1");
const CommunicationThread = load("./app/components/CommunicationThread.vue?v=1");

const COLOR_PALETTE = ["#0ea5e9", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#14b8a6", "#6366f1", "#f97316"];

export default {
  components: { AuctionRankTable, AuctionHistoryTab, AuctionAuditTab, CommunicationThread },
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
    const bidAmount = ref(0), bidError = ref(""), visibleSuppliers = ref([]);
    let timer = null;

    const accessibleAuctions = computed(() => {
      const scopedAuctions = store.scopedRecords(store.state.auctions);
      const list = scopedAuctions.filter((item) => {
        if (store.isAdmin.value) return true;
        if (store.marketplaceMode.value === "supplier") {
          const supplierId = store.currentSupplierId?.value || store.userSupplierId(store.currentUser.value.id);
          if (supplierId) return item.participants.some((p) => p.supplierId === supplierId);
        }
        const event = store.sourcingEvent(item.eventId);
        return item.hostId === store.currentUser.value.id || event?.ownerId === store.currentUser.value.id || store.isBuyer.value;
      });
      return store.marketplaceMode.value === "supplier"
        ? list
        : (list.length ? list : scopedAuctions);
    });

    const auction = computed(() => accessibleAuctions.value.find((item) => item.id === selectedAuctionId.value) || accessibleAuctions.value[0]);
    const isOrganizer = computed(() => store.isAdmin.value || store.isBuyer.value || auction.value?.hostId === store.currentUser.value.id);
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
      { key: "rank", label: "Supplier Standings", icon: "fa-users-gear" },
      { key: "history", label: "Bid Stream", icon: "fa-list-ol" },
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
    const nextValidBid = computed(() => auction.value ? Math.max(auction.value.floor, auction.value.currentBid - auction.value.minStep) : 0);

    const kpis = computed(() => {
      if (!auction.value) return [];
      const savings = Math.max(0, auction.value.reserve - auction.value.currentBid);
      const savingsPct = auction.value.reserve ? Math.round((savings / auction.value.reserve) * 100) : 0;
      return [
        { label: "Current best", value: store.money(auction.value.currentBid, auction.value.currency), icon: "fa-trophy", note: "Leading lowest quote" },
        { label: "Reserve", value: store.money(auction.value.reserve, auction.value.currency), icon: "fa-vault", note: "Target ceiling" },
        { label: "Total savings", value: `${store.money(savings, auction.value.currency)} (${savingsPct}%)`, icon: "fa-piggy-bank", note: "Below target ceiling" },
        { label: "Total offers", value: String(auction.value.bids.length), icon: "fa-gavel", note: "Verified bid records" },
        { label: "Active suppliers", value: `${auction.value.participants.length} invited`, icon: "fa-users", note: "Qualified suppliers" },
      ];
    });

    const statusClass = computed(() => ({
      Running: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
      Paused: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
      Awarded: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
      Closed: "bg-slate-100 text-slate-600 dark:bg-slate-700",
    })[auction.value?.status] || "bg-slate-100 text-slate-600");

    const statusLabel = (s) => ({ Running: "Live Bidding", Paused: "Paused", Awarded: "Awarded", Closed: "Completed" })[s] || s;
    const timeLeft = computed(() => {
      if (!auction.value?.closingAt) return "—";
      const diff = Math.max(0, new Date(auction.value.closingAt).getTime() - Date.now());
      const m = Math.floor(diff / 60000), s = Math.floor((diff % 60000) / 1000);
      return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    });

    const health = computed(() => {
      if (!auction.value) return { label: "Unknown", tone: "bg-slate-100" };
      if (auction.value.bids.length >= 8) return { label: "High Competition", tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10" };
      if (auction.value.bids.length >= 3) return { label: "Active Bidding", tone: "bg-sky-50 text-sky-700 dark:bg-sky-500/10" };
      return { label: "Low Activity", tone: "bg-amber-50 text-amber-700 dark:bg-amber-500/10" };
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

    const minAmount = computed(() => auction.value ? Math.min(auction.value.floor, ...auction.value.bids.map((b) => b.amount)) * 0.95 : 0);
    const maxAmount = computed(() => auction.value ? Math.max(auction.value.reserve, ...auction.value.bids.map((b) => b.amount)) * 1.05 : 1000);
    const valueY = (v) => 290 - ((v - minAmount.value) / Math.max(1, maxAmount.value - minAmount.value)) * 240;
    const pointX = (idx) => 55 + (idx / Math.max(1, (auction.value?.bids.length || 1) - 1)) * 820;

    const overallPoints = computed(() => {
      if (!auction.value?.bids.length) return "";
      return auction.value.bids.map((b, i) => `${pointX(i)},${valueY(b.amount)}`).join(" ");
    });

    const areaPath = computed(() => {
      if (!overallPoints.value) return "";
      const pts = overallPoints.value.split(" ");
      const firstX = pts[0].split(",")[0], lastX = pts[pts.length - 1].split(",")[0];
      return `M ${firstX},290 L ${overallPoints.value.replace(/ /g, " L ")} L ${lastX},290 Z`;
    });

    const chartSupplierSeries = computed(() => {
      if (!auction.value || (isOrganizer.value && allSuppliersSelected.value)) return [];
      return visibleSupplierSeries.value.map((s) => {
        const points = auction.value.bids.map((b, i) => ({ ...b, idx: i })).filter((b) => b.supplierId === s.supplierId).map((b) => ({ id: b.id, amount: b.amount, at: b.at, x: pointX(b.idx), y: valueY(b.amount) }));
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
    const recentBids = computed(() => auction.value ? [...auction.value.bids].reverse().slice(0, 3) : []);
    const historyBids = computed(() => auction.value ? [...auction.value.bids].reverse() : []);
    const clock = (iso) => iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";
    const sourceLabel = (src) => ({ manual: "Manual operator", auto: "Auto-bid algorithm", system: "Floor calibration" })[src] || src;
    const actionLabel = (act) => act;

    const selectAuction = () => { router.push({ path: "/procurement/auction", query: window.WebCommon.mergeRouteQuery(route.query, { auction: selectedAuctionId.value }) }); };
    const pause = () => { if (auction.value) { auction.value.status = "Paused"; store.procurementEvent(auction.value, "Auction paused", "Organizer intervention"); } };
    const resume = () => { if (auction.value) { auction.value.status = "Running"; store.procurementEvent(auction.value, "Auction resumed", "Bidding live"); } };
    const extend = () => {
      if (auction.value) {
        auction.value.closingAt = new Date(new Date(auction.value.closingAt).getTime() + 60000).toISOString();
        auction.value.extensionCount++;
        store.procurementEvent(auction.value, "Time extended", "+60s manual extension");
      }
    };
    const sendAlert = () => { tab.value = "communications"; };
    const cancel = async () => {
      if (await store.confirm({ title: "Cancel live auction?", message: "This stops bidding and closes the room.", confirmText: "Cancel auction", danger: true })) {
        auction.value.status = "Closed";
        store.procurementEvent(auction.value, "Auction cancelled", "Round terminated early");
      }
    };
    const award = async () => {
      if (!leader.value) return;
      if (await store.confirm({ title: "Award auction to leading supplier?", message: `Award to ${leader.value.name} for ${store.money(auction.value.currentBid, auction.value.currency)}?`, confirmText: "Award contract" })) {
        auction.value.status = "Awarded";
        auction.value.awardedSupplierId = leader.value.supplierId;
        store.procurementEvent(auction.value, "Auction awarded", `Won by ${leader.value.name}`);
        store.notice("Auction awarded successfully!", "fa-trophy");
      }
    };

    const toggleDisqualified = (p) => {
      p.disqualified = !p.disqualified;
      store.procurementEvent(auction.value, p.disqualified ? "Supplier disqualified" : "Supplier reinstated", p.name);
    };

    const placeBid = () => {
      bidError.value = "";
      if (!auction.value || auction.value.status !== 'Running') return;
      const amount = Number(bidAmount.value);
      if (amount > nextValidBid.value) { bidError.value = `Bid must be at most ${store.money(nextValidBid.value, auction.value.currency)}`; return; }
      if (amount < auction.value.floor) { bidError.value = `Bid cannot be lower than floor of ${store.money(auction.value.floor, auction.value.currency)}`; return; }
      const delta = amount - auction.value.currentBid;
      const newBid = { id: window.ProcurementCommon.uid("bid"), supplierId: currentSupplierId.value, amount, delta, at: new Date().toISOString(), source: "manual" };
      auction.value.bids.push(newBid);
      auction.value.currentBid = amount;
      bidAmount.value = Math.max(auction.value.floor, amount - auction.value.minStep);
      store.procurementEvent(auction.value, "Bid placed", `${bidder.value?.name || 'Supplier'} placed ${store.money(amount, auction.value.currency)}`);
      store.notice("Bid placed successfully!", "fa-gavel");
    };

    watch(() => route.query.auction, (v) => { if (v && v !== selectedAuctionId.value) selectedAuctionId.value = v; }, { immediate: true });
    watch(nextValidBid, (v) => { if (!bidAmount.value || bidAmount.value > v) bidAmount.value = v; }, { immediate: true });

    onMounted(() => {
      timer = setInterval(() => {
        if (auction.value?.status === "Running" && Math.random() < 0.08) {
          const others = auction.value.participants.filter((p) => p.supplierId !== currentSupplierId.value && !p.disqualified && p.autoBid);
          if (others.length) {
            const bot = others[Math.floor(Math.random() * others.length)];
            const target = Math.max(bot.cap || auction.value.floor, auction.value.currentBid - auction.value.minStep);
            if (target < auction.value.currentBid && target >= (bot.cap || auction.value.floor)) {
              const delta = target - auction.value.currentBid;
              auction.value.bids.push({ id: window.ProcurementCommon.uid("bid"), supplierId: bot.supplierId, amount: target, delta, at: new Date().toISOString(), source: "auto" });
              auction.value.currentBid = target;
            }
          }
        }
      }, 3000);
    });

    onBeforeUnmount(() => { if (timer) clearInterval(timer); });

    return {
      store, router, auction, selectedAuctionId, accessibleAuctions, isOrganizer, canAnnounce, isSupplier, bidder,
      tabs, tab, rankedParticipants, leader, nextValidBid, kpis, statusClass, statusLabel, timeLeft,
      health, supplierSeries, allSuppliersSelected, visibleSupplierSeries, isSupplierVisible, showAllSuppliers,
      clearSupplierFilters, toggleSupplier, shortName, supplierColor, valueY, pointX, overallPoints,
      areaPath, chartSupplierSeries, yTicks, compact, recentBids, historyBids, clock, sourceLabel,
      actionLabel, selectAuction, pause, resume, extend, sendAlert, cancel, award, toggleDisqualified,
      placeBid, bidAmount, bidError,
    };
  },
};
</script>
