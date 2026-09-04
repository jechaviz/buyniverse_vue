<template>
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
    <div
      v-if="isOrganizer"
      class="premium-card flex min-h-11 items-center mt-3 flex-col gap-2 rounded-xl border border-slate-200/70 bg-slate-50/65 p-2.5 dark:border-slate-700 dark:bg-slate-900/25 sm:flex-row"
    >
      <div class="flex items-center justify-between gap-2 sm:shrink-0">
        <span class="text-[10px] font-800 uppercase tracking-wide text-slate-400">Providers</span>
        <span class="text-[10px] text-slate-400">{{ visibleSupplierSeries.length }} of {{ supplierSeries.length }}</span>
      </div>
      <div class="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5 sm:pl-2" role="group" aria-label="Filter offer chart by supplier">
        <button
          class="min-w-max rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition"
          :class="allSuppliersSelected ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-white text-slate-500 hover:border-brand hover:text-brand dark:border-slate-700 dark:bg-slate-800'"
          :aria-pressed="allSuppliersSelected"
          title="Show all supplier lines"
          @click="$emit('show-all-suppliers')"
        >
          All suppliers
        </button>
        <button
          v-for="series in supplierSeries"
          :key="series.supplierId"
          class="flex min-w-max items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition"
          :class="isSupplierVisible(series.supplierId) ? 'border-slate-300 bg-white text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100' : 'border-transparent bg-slate-100/80 text-slate-400 opacity-60 hover:opacity-100 dark:bg-slate-800/50'"
          :aria-pressed="isSupplierVisible(series.supplierId)"
          :aria-label="series.name"
          @click="$emit('toggle-supplier', series.supplierId)"
        >
          <i class="h-2 w-2 rounded-full" :style="{ background: series.color }"></i>
          <span>{{ shortName(series.name) }}</span>
          <span v-if="series.improvement > 0" class="font-normal text-emerald-600 dark:text-emerald-400">
            ↓ {{ formatMoney(series.improvement, auction.currency) }}
          </span>
        </button>
        <button
          v-if="visibleSupplierSeries.length"
          class="min-w-max rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-400 hover:text-brand"
          title="Hide all supplier lines"
          @click="$emit('clear-suppliers')"
        >
          Clear
        </button>
      </div>
    </div>
    <div v-else class="mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-slate-50/65 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/25">
      <span class="text-[10px] font-800 uppercase tracking-wide text-slate-400">Your company offer</span>
      <b class="text-xs">{{ bidder?.name }} · #{{ bidder?.rank || "—" }}</b>
    </div>

    <!-- SVG Chart Area -->
    <div class="mt-4 overflow-hidden rounded-xl border border-slate-200/70 bg-white/60 p-3 dark:border-slate-700 dark:bg-slate-900/35">
      <svg viewBox="0 0 900 330" class="h-auto w-full" role="img" aria-label="Live offer graph">
        <defs>
          <linearGradient id="auction-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="var(--accent)" stop-opacity=".18" />
            <stop offset="1" stop-color="var(--accent)" stop-opacity="0" />
          </linearGradient>
        </defs>
        <g class="text-slate-300 dark:text-slate-700">
          <line v-for="y in [50, 110, 170, 230, 290]" :key="y" x1="55" :y1="y" x2="875" :y2="y" stroke="currentColor" stroke-width="1" />
        </g>
        <line x1="55" :y1="valueY(auction.reserve)" x2="875" :y2="valueY(auction.reserve)" stroke="#f59e0b" stroke-width="2" stroke-dasharray="8 6" />
        <text x="60" :y="valueY(auction.reserve) - 8" fill="#d97706" font-size="11">
          Reserve {{ formatMoney(auction.reserve, auction.currency) }}
        </text>
        <path :d="areaPath" fill="url(#auction-area)" />
        <polyline :points="overallPoints" fill="none" stroke="var(--accent)" stroke-width="3.5" stroke-opacity=".42" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
        <g v-if="isOrganizer && allSuppliersSelected">
          <circle
            v-for="(bid, index) in auction.bids"
            :key="`market-${bid.id}`"
            :cx="pointX(index)"
            :cy="valueY(bid.amount)"
            r="4.5"
            :fill="supplierColor(bid.supplierId)"
            stroke="white"
            stroke-width="1.75"
          >
            <title>{{ supplierName(bid.supplierId) }} · {{ formatMoney(bid.amount, auction.currency) }} · {{ clock(bid.at) }}</title>
          </circle>
        </g>
        <g v-for="series in chartSupplierSeries" :key="series.supplierId">
          <polyline v-if="series.points.length > 1" :points="series.polyline" fill="none" :stroke="series.color" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
          <circle v-for="point in series.points" :key="point.id" :cx="point.x" :cy="point.y" r="5" :fill="series.color" stroke="white" stroke-width="2">
            <title>{{ series.name }} · {{ formatMoney(point.amount, auction.currency) }} · {{ clock(point.at) }}</title>
          </circle>
        </g>
        <text v-for="tick in yTicks" :key="tick.value" x="48" :y="tick.y + 4" text-anchor="end" fill="#94a3b8" font-size="10">
          {{ compact(tick.value) }}
        </text>
      </svg>
    </div>

    <!-- Recent Bids Strip -->
    <div class="mt-4 grid gap-3 sm:grid-cols-3">
      <article v-for="move in recentBids" :key="move.id" class="rounded-xl border border-slate-200/70 p-3 dark:border-slate-700">
        <div class="flex items-center justify-between">
          <b class="truncate text-xs">{{ supplierName(move.supplierId) }}</b>
          <span class="text-[9px] text-slate-400">{{ clock(move.at) }}</span>
        </div>
        <p class="mt-2 text-lg font-800">{{ formatMoney(move.amount, auction.currency) }}</p>
        <p class="mt-1 text-[10px]" :class="move.delta < 0 ? 'text-emerald-500' : 'text-slate-400'">
          {{ move.delta ? formatMoney(move.delta, auction.currency) : "Opening offer" }} · {{ sourceLabel(move.source) }}
        </p>
      </article>
    </div>
  </div>
</template>
<script>
export default {
  props: {
    auction: Object,
    isOrganizer: Boolean,
    visibleSupplierSeries: Array,
    supplierSeries: Array,
    chartSupplierSeries: Array,
    allSuppliersSelected: Boolean,
    isSupplierVisible: Function,
    shortName: Function,
    supplierName: Function,
    supplierColor: Function,
    formatMoney: Function,
    bidder: Object,
    valueY: Function,
    pointX: Function,
    areaPath: String,
    overallPoints: String,
    yTicks: Array,
    compact: Function,
    recentBids: Array,
    clock: Function,
    sourceLabel: Function,
  },
  emits: ["show-all-suppliers", "toggle-supplier", "clear-suppliers"],
};
</script>
