<template><div v-if="auction" class="space-y-4"><section class="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6"><article
        class="relative flex min-h-11 items-center gap-2 overflow-hidden rounded-xl bg-brand p-2.5 text-white shadow-soft"
        :title="`${auction.extensionCount}/${auction.maxExtensions} extensions`"
      ><span class="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-white/20 text-[11px]"><i class="fa-regular fa-clock"></i></span><span class="min-w-0 truncate text-[10px] font-bold uppercase tracking-wider text-white/80">Remaining</span><b class="ml-auto font-head font-mono text-xs tracking-tight">{{ timeLeft }}</b></article><article
        v-for="kpi in kpis"
        :key="kpi.label"
        class="premium-card flex min-h-11 items-center gap-2 rounded-xl border border-slate-200/80 bg-white/90 p-2.5 shadow-card dark:border-slate-800/80 dark:bg-slate-900/80"
        :title="kpi.note"
      ><span class="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-brand-50 text-[11px] text-brand dark:bg-brand/20"><i class="fa-solid" :class="kpi.icon"></i></span><span class="min-w-0 truncate text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{{ kpi.label }}</span><b class="ml-auto truncate font-mono text-xs font-800 text-slate-900 dark:text-white">{{ kpi.value }}</b></article></section><section class="panel overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-card dark:border-slate-800/80 dark:bg-slate-900/90"><div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2 text-[11px] dark:border-slate-800/80 dark:bg-slate-950/40"><div class="flex items-center gap-1.5 text-slate-500"><RouterLink to="/procurement" class="font-semibold hover:text-brand">Procurement</RouterLink><span>/</span><RouterLink to="/procurement/auction" class="font-semibold hover:text-brand">Live Auctions</RouterLink><span>/</span><span class="font-bold text-slate-900 dark:text-white">{{ auction.id }}</span></div><div class="flex items-center gap-3"><span class="text-slate-400">Source:</span><RouterLink :to="`/procurement/sourcing?event=${auction.eventId}`" class="font-bold text-brand hover:underline inline-flex items-center gap-1"><i class="fa-solid fa-file-signature text-[10px]"></i>{{ auction.eventId }}
          </RouterLink><span v-if="auction.awardedSupplierId || auction.status === 'Awarded'" class="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400"><i class="fa-solid fa-trophy text-[10px]"></i>
            Winner:
            <RouterLink :to="`/suppliers?supplier=${auction.awardedSupplierId || leader?.supplierId}`" class="hover:underline font-extrabold ml-0.5">
              {{ store.supplier(auction.awardedSupplierId || leader?.supplierId)?.name || 'Awarded Supplier' }}
            </RouterLink></span></div></div><header class="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 xl:flex-row xl:items-center xl:justify-between"><div class="space-y-1"><div class="flex flex-wrap items-center gap-2"><span class="rounded-lg bg-brand-50 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-brand dark:bg-brand/20">{{ auction.id }}</span><span class="badge rounded-lg px-2.5 py-0.5 text-[10px]" :class="statusClass"><span class="mr-1.5 h-1.5 w-1.5 rounded-full" :class="auction.status === 'Running' ? 'animate-pulse bg-emerald-500' : 'bg-current'"></span>
              {{ statusLabel(auction.status) }}
            </span><span class="badge rounded-lg bg-slate-100 px-2.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">Reverse Auction</span></div><h1 class="font-head text-xl font-800 tracking-tight text-slate-900 dark:text-white">{{ auction.title }}</h1></div><div class="flex flex-wrap items-center gap-2"><select v-model="selectedAuctionId" class="field w-auto min-w-44 text-xs font-semibold py-1.5 px-2.5" @change="selectAuction"><option v-for="item in accessibleAuctions" :key="item.id" :value="item.id">{{ item.id }} · {{ item.title }}</option></select><template v-if="isOrganizer"><button v-if="auction.status === 'Paused'" class="btn-brand text-xs py-1.5 px-3" @click="resume"><i class="fa-solid fa-play mr-1"></i>Resume</button><button v-else-if="auction.status === 'Running'" class="btn-muted text-xs py-1.5 px-3" @click="pause"><i class="fa-solid fa-pause mr-1"></i>Pause</button><button v-if="auction.status !== 'Awarded'" class="btn-brand text-xs py-1.5 px-3" @click="award"><i class="fa-solid fa-trophy mr-1"></i>Award</button><button v-if="auction.status !== 'Awarded'" class="btn-muted text-xs py-1.5 px-3 text-rose-500 hover:text-rose-600" @click="cancel"><i class="fa-solid fa-ban mr-1"></i>Cancel</button></template>
<script>
const { inject, computed, ref, onMounted, onBeforeUnmount, watch } = Vue;
const { useRoute, useRouter } = VueRouter;
const load = (p) => Vue.defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(p, window.sfcOptions));
const AuctionRankTable = load("./app/pages/procurement/auction/AuctionRankTable.vue?v=1");
const AuctionHistoryTab = load("./app/pages/procurement/auction/AuctionHistoryTab.vue?v=1");
const AuctionAuditTab = load("./app/pages/procurement/auction/AuctionAuditTab.vue?v=1");
const COLOR_PALETTE = ["#0ea5e9", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#14b8a6", "#6366f1", "#f97316"];
export default {
components: { AuctionRankTable, AuctionHistoryTab, AuctionAuditTab },
setup() {
const store = inject("store"), route = useRoute(), router = useRouter();
const tab = computed({
get: () => {
const allowed = store.marketplaceMode.value === "supplier" ? ["live", "rank", "history"] : ["live", "history", "rank", "audit"];
return allowed.includes(route.query.tab) ? route.query.tab : "live";
},
set: (key) => router.push({ path: "/procurement/auction", query: window.WebCommon.mergeRouteQuery(route.query, { tab: key }) }),
});
const selectedAuctionId = ref(route.query.auction || "");
const bidAmount = ref(0), bidError = ref(""), visibleSuppliers = ref([]);
let timer = null;
const accessibleAuctions = computed(() => {
const list = store.state.liveAuctions.filter((item) => {
if (store.currentUser.value.type === "Admin" || store.isAdmin.value) return true;
if (store.marketplaceMode.value === "supplier") {
const supplierId = store.currentSupplierId?.value || store.userSupplierId(store.currentUser.value.id);
if (supplierId) return item.participants.some((p) => p.supplierId === supplierId);
}
const event = store.sourcingEvent(item.eventId);
return item.hostId === store.currentUser.value.id || event?.ownerId === store.currentUser.value.id || store.isBuyer.value;
});
return list.length ? list : store.state.liveAuctions;
});
const auction = computed(() => accessibleAuctions.value.find((item) => item.id === selectedAuctionId.value) || accessibleAuctions.value[0]);
const isOrganizer = computed(() => store.currentUser.value.type === "Admin" || store.isAdmin.value || store.isBuyer.value || auction.value?.hostId === store.currentUser.value.id);
const isSupplier = computed(() => store.marketplaceMode.value === "supplier" || (!isOrganizer.value && Boolean(bidder.value)));
const currentSupplierId = computed(() => {
return store.currentSupplierId?.value || store.userSupplierId(store.currentUser.value.id) || (isSupplier.value ? auction.value?.participants[0]?.supplierId : null);
});
const bidder = computed(() => auction.value?.participants.find((p) => p.supplierId === currentSupplierId.value) || null);
const tabs = computed(() => [
{ key: "live", label: "Live Room", icon: "fa-tower-broadcast" },
{ key: "rank", label: "Supplier Standings", icon: "fa-users-gear" },
{ key: "history", label: "Bid Stream", icon: "fa-list-ol" },
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
if (!auction.value) return [];
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
const sendAlert = () => { store.notice("Market broadcast alert dispatched to all active bidders", "fa-bullhorn"); };
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
store, router, auction, selectedAuctionId, accessibleAuctions, isOrganizer, isSupplier, bidder,
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