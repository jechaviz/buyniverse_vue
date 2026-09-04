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
        class="panel flex min-h-11 items-center gap-2 rounded-xl border border-slate-200/80 bg-white/90 p-2.5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900/80"
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

      <nav class="flex gap-1 overflow-x-auto border-b border-slate-100 bg-slate-50/50 px-4 pt-2 text-xs font-bold dark:border-slate-800/80 dark:bg-slate-950/20">
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
        <AuctionLiveChart
          :auction="auction"
          :is-organizer="isOrganizer"
          :bidder="bidder"
          :supplier-series="supplierSeries"
          :visible-supplier-series="visibleSupplierSeries"
          :all-suppliers-selected="allSuppliersSelected"
          :chart-supplier-series="chartSupplierSeries"
          :recent-bids="recentBids"
          :overall-points="overallPoints"
          :area-path="areaPath"
          :y-ticks="yTicks"
          :clock="clock"
          :source-label="sourceLabel"
          :format-money="store.money"
          :compact="compact"
          :value-y="valueY"
          :point-x="pointX"
          :supplier-color="supplierColor"
          :short-name="shortName"
          :is-supplier-visible="isSupplierVisible"
          :supplier-name="(id) => store.supplier(id)?.name || id"
          @show-all-suppliers="showAllSuppliers"
          @toggle-supplier="toggleSupplier"
          @clear-suppliers="clearSupplierFilters"
        />

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
const AuctionLiveChart = load("./app/pages/procurement/auction/AuctionLiveChart.vue?v=2");
const AuctionRankTable = load("./app/pages/procurement/auction/AuctionRankTable.vue?v=2");
const AuctionHistoryTab = load("./app/pages/procurement/auction/AuctionHistoryTab.vue?v=2");
const AuctionAuditTab = load("./app/pages/procurement/auction/AuctionAuditTab.vue?v=1");
const CommunicationThread = load("./app/components/CommunicationThread.vue?v=1");
const SavingsWaterfall = load("./app/components/commercial/SavingsWaterfall.vue?v=3");

const COLOR_PALETTE = ["#0ea5e9", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#14b8a6", "#6366f1", "#f97316"];

export default {
  components: { AuctionLiveChart, AuctionRankTable, AuctionHistoryTab, AuctionAuditTab, CommunicationThread, SavingsWaterfall },
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
      const user = store.currentUser.value;
      if (!user) return scopedAuctions;
      return scopedAuctions.filter((item) => {
        if (store.isAdmin.value) return true;
        if (store.marketplaceMode.value === "supplier") {
          const supplierId = store.currentSupplierId?.value || store.userSupplierId(user.id);
          if (supplierId) return item.participants.some((p) => p.supplierId === supplierId);
        }
        const event = store.sourcingEvent(item.eventId);
        return item.hostId === user.id || event?.ownerId === user.id;
      });
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
    const canAnnounce = computed(() => {
      const currentUserId = store.currentUser.value?.id;
      const eventOwnerId = auction.value?.eventId ? store.sourcingEvent(auction.value.eventId)?.ownerId : null;
      return Boolean(currentUserId && (store.isAdmin.value || auction.value?.hostId === currentUserId || eventOwnerId === currentUserId));
    });
    const isSupplier = computed(() => store.marketplaceMode.value === "supplier" || (!isOrganizer.value && Boolean(bidder.value)));

    const currentSupplierId = computed(() => {
      const user = store.currentUser.value;
      const userSid = user ? store.userSupplierId(user.id) : null;
      return store.currentSupplierId?.value || userSid || (isSupplier.value ? auction.value?.participants[0]?.supplierId : null);
    });

    const bidder = computed(() => {
      if (!auction.value) return null;
      const sid = currentSupplierId.value;
      return auction.value.participants.find((p) => p.supplierId === sid) || null;
    });

    const rankedParticipants = computed(() => {
      if (!auction.value) return [];
      return [...auction.value.participants].sort((a, b) => {
        if (a.disqualified !== b.disqualified) return a.disqualified ? 1 : -1;
        return (a.lastBid || Infinity) - (b.lastBid || Infinity);
      });
    });

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

    const leader = computed(() => rankedParticipants.value.find((p) => !p.disqualified && p.lastBid) || null);
    const presentedLeader = computed(() => presentedRankedParticipants.value.find((p) => !p.disqualified && p.lastBid) || null);

    const tabs = computed(() => {
      const base = [{ key: "live", label: "Live Room", icon: "fa-tower-broadcast" }, { key: "rank", label: "Rankings", icon: "fa-ranking-star" }, { key: "history", label: "Bid Log", icon: "fa-list-ol" }, { key: "communications", label: "Messages", icon: "fa-comments" }];
      if (isOrganizer.value) base.push({ key: "audit", label: "Audit Log", icon: "fa-shield-halved" });
      return base;
    });

    const statusClass = computed(() => {
      const map = { Running: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300", Paused: "bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300", Awarded: "bg-sky-50 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300", Cancelled: "bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300" };
      return map[auction.value?.status] || "bg-slate-100 text-slate-600";
    });

    const statusLabel = (s) => ({ Running: "Live Bidding", Paused: "Paused", Awarded: "Awarded", Cancelled: "Cancelled" }[s] || s);

    const timeLeft = computed(() => {
      if (!auction.value || auction.value.status !== "Running") return "00:00";
      return "03:42";
    });

    const kpis = computed(() => {
      if (!auction.value) return [];
      const best = auction.value.currentBid || 0;
      return [
        { label: "Leading Offer", value: store.money(best, auction.value.currency), icon: "fa-gavel", note: "Lowest compliant bid" },
        { label: "Reserve Price", value: store.money(auction.value.reserve, auction.value.currency), icon: "fa-bullseye", note: "Maximum ceiling" },
        { label: store.t("Financial savings"), value: store.money(commercial.value.totalSavings || 0, auction.value.currency), icon: "fa-chart-line", note: store.t("Net price reduction") },
        { label: "Total Bids", value: auction.value.bids.length, icon: "fa-list-check", note: "Submitted offers" },
        { label: "Participants", value: auction.value.participants.length, icon: "fa-users", note: "Invited suppliers" },
      ];
    });

    const health = computed(() => {
      const count = auction.value?.bids.length || 0;
      if (count > 8) return { label: "High liquidity", tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" };
      if (count > 2) return { label: "Active bidding", tone: "bg-sky-50 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300" };
      return { label: "Waiting for offers", tone: "bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" };
    });

    const supplierSeries = computed(() => {
      if (!auction.value) return [];
      return auction.value.participants.map((p, i) => ({
        supplierId: p.supplierId, name: p.name, color: COLOR_PALETTE[i % COLOR_PALETTE.length],
        improvement: p.openingBid && p.lastBid ? p.openingBid - p.lastBid : 0,
      }));
    });

    const allSuppliersSelected = computed(() => visibleSuppliers.value.length === 0);
    const visibleSupplierSeries = computed(() => allSuppliersSelected.value ? supplierSeries.value : supplierSeries.value.filter((s) => visibleSuppliers.value.includes(s.supplierId)));
    const isSupplierVisible = (id) => allSuppliersSelected.value || visibleSuppliers.value.includes(id);
    const showAllSuppliers = () => { visibleSuppliers.value = []; };
    const clearSupplierFilters = () => { visibleSuppliers.value = []; };
    const toggleSupplier = (id) => {
      const idx = visibleSuppliers.value.indexOf(id);
      if (idx >= 0) visibleSuppliers.value.splice(idx, 1);
      else visibleSuppliers.value.push(id);
    };

    const shortName = (name) => name ? name.split(" ")[0] : "";
    const supplierColor = (id) => {
      const found = supplierSeries.value.find((s) => s.supplierId === id);
      return found ? found.color : "#94a3b8";
    };

    const minAmount = computed(() => auction.value ? Math.min(auction.value.floor, ...auction.value.bids.map((b) => b.amount)) : 0);
    const maxAmount = computed(() => auction.value ? Math.max(auction.value.reserve, ...auction.value.bids.map((b) => b.amount)) : 100);
    const valueY = (val) => {
      const range = maxAmount.value - minAmount.value || 1;
      return 50 + ((maxAmount.value - val) / range) * 240;
    };
    const pointX = (idx) => {
      const total = (auction.value?.bids.length || 1) - 1 || 1;
      return 55 + (idx / total) * 820;
    };

    const overallPoints = computed(() => {
      if (!auction.value || !auction.value.bids.length) return "";
      return auction.value.bids.map((b, i) => `${pointX(i)},${valueY(b.amount)}`).join(" ");
    });

    const areaPath = computed(() => {
      if (!overallPoints.value) return "";
      return `M 55,290 L ${overallPoints.value} L 875,290 Z`;
    });

    const chartSupplierSeries = computed(() => {
      if (!auction.value) return [];
      return visibleSupplierSeries.value.map((series) => {
        const points = auction.value.bids
          .map((b, i) => ({ ...b, x: pointX(i), y: valueY(b.amount) }))
          .filter((b) => b.supplierId === series.supplierId);
        return { ...series, points, polyline: points.map((p) => `${p.x},${p.y}`).join(" ") };
      });
    });

    const yTicks = computed(() => {
      const ticks = [];
      for (let i = 0; i <= 4; i++) {
        const val = minAmount.value + (i / 4) * (maxAmount.value - minAmount.value);
        ticks.push({ value: Math.round(val), y: 290 - i * 60 });
      }
      return ticks;
    });

    const compact = (n) => n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n);
    const historyBids = computed(() => {
      if (!auction.value) return [];
      const bids = isOrganizer.value ? auction.value.bids : auction.value.bids.filter((bid) => bid.supplierId === currentSupplierId.value);
      return [...bids].reverse();
    });
    const recentBids = computed(() => historyBids.value.slice(0, 5));
    const clock = (iso) => iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "";
    const sourceLabel = (src) => ({ auto: "Auto-bid bot", manual: "Supplier manual bid" }[src] || "Supplier bid");
    const actionLabel = (act) => act;

    const signalCopy = (signal) => {
      if (signal?.type === "competitive_offer") return "A competitive lower offer was placed";
      if (signal?.type === "auction_extended") return "Round extended due to late bid";
      return "Live activity update";
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
      currentSupplierId,
    };
  },
};
</script>
