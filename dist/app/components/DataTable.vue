<template>
  <section class="premium-card overflow-hidden rounded-2xl border border-slate-200/80 shadow-card dark:border-slate-800/80 dark:bg-slate-900/90">
    <div class="flex items-center justify-between gap-3 border-b border-slate-200/70 p-3 sm:p-4 dark:border-slate-800 flex-wrap">
      <div class="flex min-w-0 flex-1 items-center gap-2 flex-wrap">
        <div
          class="relative flex h-9 items-center transition-all duration-200"
          :class="searchOpen || query ? 'min-w-52 flex-1 sm:max-w-sm' : 'w-9 flex-none'"
          @mouseenter="openSearch(false)"
          @mouseleave="closeSearchIfIdle"
        >
          <button v-if="!searchOpen && !query" type="button" class="btn-muted h-9 w-9 p-0" aria-label="Search records" title="Search" @click="openSearch">
            <i class="fa-solid fa-search"></i>
          </button>
          <template v-else>
            <i class="fa-solid fa-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input ref="searchInput" v-model="query" class="field h-9 pl-9 pr-9" :placeholder="`Search ${title.toLowerCase()}…`" @blur="closeSearchIfIdle" @keydown.esc="closeSearch" />
            <button type="button" class="absolute right-1 grid h-7 w-7 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-white" aria-label="Close search" title="Close search" @click="closeSearch">
              <i class="fa-solid fa-xmark text-xs"></i>
            </button>
          </template>
        </div>
        <div class="relative flex">
          <button
            class="btn-muted rounded-r-none"
            :class="searchOpen || query ? 'h-9 w-9 p-0' : 'h-9 max-w-56 px-3'"
            :aria-expanded="viewsOpen"
            aria-haspopup="menu"
            :title="isViewDirty ? `${currentViewLabel} · Unsaved changes` : `Saved views · ${currentViewLabel}`"
            @click="viewsOpen = !viewsOpen; columnsOpen = false;"
          >
            <i class="fa-solid" :class="activeSavedView ? 'fa-bookmark text-brand' : 'fa-table-list'"></i>
            <span v-if="!searchOpen && !query" class="min-w-0 flex-1 truncate">{{ currentViewLabel }}</span>
            <span v-if="isViewDirty && !searchOpen && !query" class="h-2 w-2 flex-none rounded-full bg-amber-400" title="Unsaved changes" aria-label="Unsaved changes"></span>
            <i v-if="!searchOpen && !query" class="fa-solid fa-chevron-down text-[9px] opacity-60"></i>
          </button>
          <div v-if="viewsOpen" class="glass absolute left-0 top-11 z-40 w-72 rounded-xl p-2 shadow-xl" role="menu">
            <div class="flex items-center justify-between px-2 py-1.5">
              <p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Saved views</p>
              <span class="text-[10px] text-slate-400">{{ savedViews.length }}/12</span>
            </div>
            <button class="w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700" :class="!activeView ? 'text-brand font-bold' : 'text-slate-700 dark:text-slate-200'" @click="selectSavedView('')">
              <i class="fa-solid fa-table-list mr-2 text-[10px]"></i>All records
            </button>
            <div class="my-1 max-h-48 overflow-y-auto space-y-0.5">
              <button v-for="v in savedViews" :key="v.id" class="w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700" :class="activeView === v.id ? 'text-brand font-bold bg-brand-50/50' : 'text-slate-700 dark:text-slate-200'" @click="selectSavedView(v.id)">
                <i class="fa-solid fa-bookmark mr-2 text-[10px]"></i>{{ v.name }}
              </button>
            </div>
            <div class="mt-1 border-t border-slate-200/70 pt-1 dark:border-slate-700">
              <button v-if="isViewDirty" class="w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-bold text-brand hover:bg-brand-50" @click="updateSavedView">
                <i class="fa-solid fa-floppy-disk mr-2 text-[10px]"></i>Update saved view
              </button>
              <button class="w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700" @click="openSaveViewDialog">
                <i class="fa-solid fa-plus mr-2 text-[10px]"></i>Save as new view
              </button>
            </div>
          </div>
          <button class="btn-muted -ml-px h-9 rounded-l-none px-2" aria-label="Save New View" title="Save current view as new" @click="openSaveViewDialog">
            <i class="fa-solid fa-plus text-[10px]"></i>
          </button>
        </div>
        <button class="btn-muted h-9 px-3" :class="activeFilterCount ? 'border-brand text-brand font-bold' : ''" @click="openFilters('')">
          <i class="fa-solid fa-filter text-xs"></i>
          <span class="hidden sm:inline">Filters</span>
          <span v-if="activeFilterCount" class="ml-1 rounded-full bg-brand px-1.5 py-0.2 text-[10px] text-white">{{ activeFilterCount }}</span>
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <div class="flex rounded-lg border border-slate-200/80 p-0.5 dark:border-slate-700">
          <button v-for="m in viewModes" :key="m.key" class="h-7 px-2.5 rounded-md text-xs font-semibold transition" :class="mode === m.key ? 'bg-brand text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'" :title="m.label" @click="mode = m.key">
            <i class="fa-solid" :class="m.icon"></i>
          </button>
        </div>
        <div class="relative">
          <button class="btn-muted h-9 px-3" aria-label="Columns" :aria-expanded="columnsOpen" title="Visible columns" @click="columnsOpen = !columnsOpen; viewsOpen = false;">
            <i class="fa-solid fa-sliders text-xs"></i>
            <span class="hidden sm:inline">Columns</span>
          </button>
          <div v-if="columnsOpen" class="glass absolute right-0 top-11 z-40 w-64 rounded-xl p-3 shadow-xl">
            <p class="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2">Visible columns</p>
            <div class="max-h-60 overflow-y-auto space-y-1.5">
              <div v-for="(column, index) in configurableColumns" :key="column.key" class="flex items-center justify-between gap-2 rounded-lg px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs">
                <label class="flex items-center gap-2 flex-1 cursor-pointer truncate">
                  <input v-model="visibility[column.key]" type="checkbox" />
                  <span class="truncate">{{ column.label }}</span>
                </label>
                <span class="flex items-center gap-0.5">
                  <button type="button" class="h-6 w-6 grid place-items-center text-slate-400 hover:text-brand" :disabled="index === 0" @click="moveColumn(column.key, -1)">
                    <i class="fa-solid fa-arrow-left text-[9px]"></i>
                  </button>
                  <button type="button" class="h-6 w-6 grid place-items-center text-slate-400 hover:text-brand" :disabled="index === configurableColumns.length - 1" @click="moveColumn(column.key, 1)">
                    <i class="fa-solid fa-arrow-right text-[9px]"></i>
                  </button>
                </span>
              </div>
            </div>
            <button class="mt-2 w-full rounded-lg px-2 py-1.5 text-left text-xs font-bold text-brand hover:bg-brand-50" @click="resetView">Reset view</button>
          </div>
        </div>
      </div>
    </div>

    <BulkActionBar v-if="selectedCount" :selected-count="selectedCount" :total-count="bulkTotalCount" :actions="resolvedBulkActions" @action="handleBulkAction" @select-all="selectAllFiltered" @clear="selection = {}" />

    <div v-if="groupBy" class="flex gap-2 overflow-x-auto border-b border-slate-200/70 px-4 pt-3 dark:border-slate-700">
      <button v-for="group in groups" :key="group.value" class="whitespace-nowrap border-b-2 px-2 pb-3 text-sm font-semibold" :class="activeGroup === group.value ? 'border-brand text-brand' : 'border-transparent text-slate-500'" @click="activeGroup = group.value">
        <span>{{ group.label }}</span>
        <span class="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] dark:bg-slate-700">{{ group.count }}</span>
      </button>
    </div>

    <!-- Table View -->
    <div v-if="mode === 'table'" class="overflow-x-auto">
      <table class="w-full min-w-200 table-fixed text-left text-sm">
        <thead class="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/50">
          <tr>
            <th class="w-12 px-4 py-3"><input :checked="allPageSelected" type="checkbox" aria-label="Select page" @change="togglePage" /></th>
            <th v-for="column in visibleTableColumns" :key="column.key" :style="{ width: `${widths[column.key] || column.width || 160}px` }" class="table-column-header relative whitespace-nowrap px-4 py-3 font-semibold" @dragover.prevent @drop="dropColumn(column.key)">
              <div class="flex min-w-0 items-center gap-1">
                <button class="column-control column-drag-handle grid h-5 flex-none cursor-grab place-items-center rounded text-slate-300 hover:bg-slate-200 hover:text-slate-500 dark:hover:bg-slate-700" :title="`Drag ${column.label}`" :aria-label="`Drag ${column.label}`" draggable="true" @dragstart.stop="startColumnDrag($event, column.key)" @dragend="dragColumn = ''">
                  <i class="fa-solid fa-grip-vertical text-[10px]"></i>
                </button>
                <button v-if="!column.isActions" class="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden text-left hover:text-brand" @click="sort(column.key)">
                  <span class="truncate">{{ column.label }}</span>
                  <i class="fa-solid column-control flex-none text-[10px]" :class="sortState.key === column.key ? sortState.desc ? 'is-active fa-sort-down text-brand' : 'is-active fa-sort-up text-brand' : 'fa-sort text-slate-300'"></i>
                </button>
                <span v-else class="min-w-0 flex-1 truncate">{{ column.label }}</span>
                <button v-if="!column.isActions" class="column-control grid h-5 w-5 place-items-center rounded hover:bg-slate-200 dark:hover:bg-slate-700" :class="filters[column.key] ? 'is-active text-brand' : 'text-slate-400'" :title="`Filter ${column.label}`" :aria-label="`Filter ${column.label}`" @click="openFilters(column.key)">
                  <i class="fa-solid fa-filter text-[10px]"></i>
                </button>
              </div>
              <span class="resizer" @mousedown.prevent="startResize($event, column.key)"></span>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
          <tr v-for="item in paged" :key="item.id" class="group transition hover:bg-brand-50/45 dark:hover:bg-brand/8">
            <td class="px-4 py-3"><input v-model="selection[item.id]" type="checkbox" :aria-label="`Select ${item.id}`" /></td>
            <td v-for="column in visibleTableColumns" :key="column.key" class="relative px-4 py-3" @dblclick="!column.isActions && openEditor(item, column)">
              <RowActionMenu v-if="column.isActions" :actions="actionsFor(item)" :item-label="String(item.title || item.name || item.id)" :align="actionMenuAlign" @action="handleRowAction(item, $event)" />
              <InlineCellEditor v-else-if="editing?.id === item.id && editing?.key === column.key" :value="item[column.key]" :type="column.edit?.type || 'text'" :options="column.edit?.options || []" :users="users" @save="saveEdit(item, column, $event)" @cancel="editing = null" />
              <RouterLink v-else-if="linkFor && linkFor(item, column.key)" :to="linkFor(item, column.key)" class="font-medium text-sky-600 hover:underline">{{ display(item, column.key) }}</RouterLink>
              <span v-else :class="isStatus(column.key) ? 'rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-200' : ''">
                {{ display(item, column.key) }}
                <i v-if="column.edit" class="fa-solid fa-pen ml-2 inline-edit-affordance text-[9px] text-slate-300" aria-hidden="true"></i>
              </span>
            </td>
          </tr>
          <tr v-if="!paged.length">
            <td :colspan="visibleTableColumns.length + 1" class="px-5 py-14 text-center text-slate-500">
              <i class="fa-solid fa-magnifying-glass text-2xl"></i>
              <p class="mt-3 font-semibold">No matching records</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <DataTableCardView v-else-if="mode === 'cards'" :items="paged" :visible-columns="visibleColumns" :selection="selection" :display="display" @toggle-select="selection[$event] = !selection[$event]" />
    <DataTableKanbanView v-else-if="mode === 'kanban'" :groups="groups" :visible-columns="visibleColumns" :grouped-items="groupedItems" :display="display" />
    <div v-else class="grid gap-4 p-5 sm:grid-cols-3">
      <article class="rounded-xl bg-brand-50 p-5 text-brand"><p class="text-xs font-bold uppercase">Visible records</p><p class="mt-2 text-3xl font-800">{{ filtered.length }}</p></article>
      <article class="rounded-xl bg-slate-100 p-5 dark:bg-slate-700"><p class="text-xs font-bold uppercase text-slate-500">Selected</p><p class="mt-2 text-3xl font-800">{{ selectedCount }}</p></article>
      <article class="rounded-xl bg-slate-100 p-5 dark:bg-slate-700"><p class="text-xs font-bold uppercase text-slate-500">Groups</p><p class="mt-2 text-3xl font-800">{{ groups.length }}</p></article>
    </div>

    <DataTablePagination :page="page" :page-count="pageCount" :page-size="pageSize" :range-label="rangeLabel" @update:page="page = $event" @update:page-size="pageSize = $event" />

    <TextInputDialog :open="saveDialogOpen" :title="activeSavedView ? 'Save as new view' : 'Save current view'" description="Save the current search, filters, sorting, columns and display mode for quick access later." label="View name" placeholder="e.g. Open projects by budget" hint="Use a short, recognizable name." :confirm-label="activeSavedView ? 'Save as new' : 'Save view'" icon="fa-bookmark" :max-length="40" :error="saveViewError" @input="saveViewError = ''" @close="closeSaveViewDialog" @submit="saveView" />
    <DataTableFilterDrawer :open="filterDrawerOpen" :columns="columns" :filters="filters" :rules="filterRules" :mode="filterMode" :active-count="activeFilterCount" :focus-key="filterFocusKey" :dirty="isViewDirty" :view-name="activeSavedView?.name || ''" @update:filters="filters = $event" @update:rules="filterRules = $event" @update:mode="filterMode = $event" @clear="clearDrawerFilters" @close="closeFilters" />
  </section>
</template>
<script>
const load = (p) => Vue.defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(p, window.sfcOptions));
const VIEW_MODES = ["table", "cards", "kanban", "dashboard"];
const FILTER_OPERATORS = ["contains", "equals", "not_equals", "gt", "lt"];
const ACTION_COLUMN_KEY = "__actions";
const layoutKeys = (columns, editable) => [...columns.map((c) => c.key), ...(editable ? [ACTION_COLUMN_KEY] : [])];
const normalizeView = (raw, columns, editable = true) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const dataKeys = columns.map((c) => c.key), keys = layoutKeys(columns, editable), id = String(raw.id || "").trim(), name = String(raw.name || "").trim();
  if (!id || !name) return null;
  const order = Array.isArray(raw.order) ? [...new Set(raw.order.filter((k) => keys.includes(k)))] : [];
  const filters = raw.filters && typeof raw.filters === "object" ? Object.fromEntries(Object.entries(raw.filters).filter(([k]) => dataKeys.includes(k)).map(([k, v]) => [k, String(v)])) : {};
  return {
    id, name, query: String(raw.query || "").trim(), filters,
    filterRules: Array.isArray(raw.filterRules) ? raw.filterRules.filter((r) => r && dataKeys.includes(r.key) && FILTER_OPERATORS.includes(r.operator)).map((r, i) => ({ id: r.id || `${id}-rule-${i}`, key: r.key, operator: r.operator, value: String(r.value || "") })) : [],
    filterMode: raw.filterMode === "any" ? "any" : "all", activeGroup: String(raw.activeGroup || "all"),
    sortState: raw.sortState && dataKeys.includes(raw.sortState.key) ? { key: raw.sortState.key, desc: Boolean(raw.sortState.desc) } : { key: "", desc: false },
    visibility: Object.fromEntries(keys.map((k) => [k, raw.visibility?.[k] !== false])),
    order: [...order, ...keys.filter((k) => !order.includes(k))],
    widths: raw.widths && typeof raw.widths === "object" ? Object.fromEntries(Object.entries(raw.widths).filter(([k, v]) => keys.includes(k) && Number.isFinite(Number(v))).map(([k, v]) => [k, Math.max(80, Math.min(800, Number(v)))])) : {},
    mode: VIEW_MODES.includes(raw.mode) ? raw.mode : "table", pageSize: [5, 10, 20, 50].includes(Number(raw.pageSize)) ? Number(raw.pageSize) : 10,
    demo: Boolean(raw.demo), default: Boolean(raw.default),
  };
};
const mergeViews = (seeded, stored) => [...seeded.map((s) => stored.find((v) => v.id === s.id) || s), ...stored.filter((v) => !seeded.some((s) => s.id === v.id))].slice(0, 12);

export default {
  components: {
    InlineCellEditor: load("./app/components/InlineCellEditor.vue?v=20"),
    TextInputDialog: load("./app/components/TextInputDialog.vue?v=1"),
    RowActionMenu: load("./app/components/RowActionMenu.vue?v=2"),
    BulkActionBar: load("./app/components/BulkActionBar.vue?v=1"),
    DataTableFilterDrawer: load("./app/components/DataTableFilterDrawer.vue?v=2"),
    DataTablePagination: load("./app/components/DataTablePagination.vue?v=1"),
    DataTableCardView: load("./app/components/DataTableCardView.vue?v=1"),
    DataTableKanbanView: load("./app/components/DataTableKanbanView.vue?v=1"),
  },
  props: {
    items: { type: Array, default: () => [] },
    columns: { type: Array, default: () => [] },
    title: { type: String, default: "Records" },
    format: { type: Function, default: (item, key) => item?.[key] ?? "—" },
    groupLabel: { type: Function, default: (v) => String(v).replaceAll("_", " ") },
    linkFor: { type: Function, default: null },
    tableId: { type: String, default: "data-table" },
    users: { type: Array, default: () => [] },
    groupBy: { type: String, default: "" },
    editable: { type: Boolean, default: true },
    initialViews: { type: Array, default: () => [] },
    rowActions: { type: Array, default: () => [{ key: "delete", label: "Delete record", icon: "fa-trash-can", tone: "danger" }, { key: "edit", label: "Edit record", icon: "fa-pen" }] },
    bulkActions: { type: Array, default: () => [{ key: "archive", label: "Archive selected", icon: "fa-box-archive" }, { key: "export", label: "Export selected", icon: "fa-file-csv" }] },
  },
  emits: ["update-cell", "edit", "delete", "archive", "row-action", "bulk-action"],
  data() {
    const saved = this.readStore(),
      seededViews = this.initialViews.map((v) => normalizeView(v, this.columns, this.editable)).filter(Boolean),
      storedViews = saved?.views || [], savedViews = mergeViews(seededViews, storedViews),
      activeView = storedViews.length > 0 ? (saved?.activeView && savedViews.some((v) => v.id === saved.activeView) ? saved.activeView : "") : (savedViews.find((v) => v.default)?.id || "");
    return {
      query: "", searchOpen: false, filters: {}, filterRules: [], filterMode: "all", filterDrawerOpen: false, filterFocusKey: "",
      columnsOpen: false, viewsOpen: false, saveDialogOpen: false, saveViewError: "",
      sortState: saved?.sortState || { key: "", desc: false },
      visibility: saved?.visibility || Object.fromEntries(layoutKeys(this.columns, this.editable).map((k) => [k, true])),
      order: saved?.order || layoutKeys(this.columns, this.editable), widths: saved?.widths || {},
      page: 1, pageSize: saved?.pageSize || 10, selection: {}, mode: saved?.mode || "table", editing: null, dragColumn: "", activeGroup: "all",
      savedViews, activeView,
    };
  },
  mounted() { if (this.activeView) this.applyView(); else this.persist(); },
  computed: {
    activeSavedView() { return this.savedViews.find((v) => v.id === this.activeView) || null; },
    currentViewLabel() { return this.activeSavedView?.name || "All records"; },
    isViewDirty() { return Boolean(this.activeSavedView && this.viewSignature(this.currentViewState()) !== this.viewSignature(this.activeSavedView)); },
    activeFilterCount() {
      const c = Object.values(this.filters).filter((v) => String(v ?? "").trim()).length;
      const r = this.filterRules.filter((rule) => String(rule.value ?? "").trim()).length;
      return c + r + (this.activeGroup !== "all" ? 1 : 0);
    },
    viewModes() {
      return [{ key: "table", label: "Table view", icon: "fa-table" }, { key: "cards", label: "Card view", icon: "fa-grip" }, { key: "kanban", label: "Kanban view", icon: "fa-table-columns" }, { key: "dashboard", label: "Dashboard view", icon: "fa-chart-pie" }];
    },
    orderedColumns() { return this.order.map((k) => this.columns.find((c) => c.key === k)).filter(Boolean); },
    visibleColumns() { return this.orderedColumns.filter((c) => this.visibility[c.key] !== false); },
    configurableColumns() {
      return this.order.map((k) => k === ACTION_COLUMN_KEY ? { key: ACTION_COLUMN_KEY, label: "Actions", width: 104, isActions: true } : this.columns.find((c) => c.key === k)).filter(Boolean);
    },
    visibleTableColumns() { return this.configurableColumns.filter((col) => this.visibility[col.key] !== false); },
    actionMenuAlign() { const i = this.visibleTableColumns.findIndex((c) => c.key === ACTION_COLUMN_KEY); return i >= 0 && i < this.visibleTableColumns.length / 2 ? "left" : "right"; },
    baseFiltered() {
      const q = this.query.trim().toLowerCase();
      return this.items.filter((item) => {
        const global = !q || this.columns.some((c) => String(this.display(item, c.key)).toLowerCase().includes(q));
        const colMatch = Object.entries(this.filters).every(([k, v]) => !v || String(this.display(item, k)).toLowerCase().includes(String(v).toLowerCase()));
        const test = (r) => {
          if (!r.value) return true;
          const left = String(item[r.key] ?? "").toLowerCase(), right = String(r.value).toLowerCase();
          if (r.operator === "equals") return left === right;
          if (r.operator === "not_equals") return left !== right;
          if (r.operator === "gt") return Number(item[r.key]) > Number(r.value);
          if (r.operator === "lt") return Number(item[r.key]) < Number(r.value);
          return left.includes(right);
        };
        const compound = !this.filterRules.length || (this.filterMode === "all" ? this.filterRules.every(test) : this.filterRules.some(test));
        return global && colMatch && compound;
      });
    },
    groups() {
      if (!this.groupBy) return [{ value: "all", label: "All", count: this.baseFiltered.length }];
      const vals = [...new Set(this.baseFiltered.map((i) => String(i[this.groupBy] ?? "Unassigned")))];
      return [{ value: "all", label: "All", count: this.baseFiltered.length }, ...vals.map((v) => ({ value: v, label: this.groupLabel(v), count: this.baseFiltered.filter((i) => String(i[this.groupBy] ?? "Unassigned") === v).length }))];
    },
    filtered() { return this.activeGroup === "all" ? this.baseFiltered : this.baseFiltered.filter((i) => String(i[this.groupBy] ?? "Unassigned") === this.activeGroup); },
    sorted() {
      const { key, desc } = this.sortState;
      if (!key) return this.filtered;
      return [...this.filtered].sort((a, b) => String(this.display(a, key)).localeCompare(String(this.display(b, key)), undefined, { numeric: true }) * (desc ? -1 : 1));
    },
    pageCount() { return Math.max(1, Math.ceil(this.sorted.length / this.pageSize)); },
    paged() { const s = Math.min(this.page, this.pageCount); return this.sorted.slice((s - 1) * this.pageSize, s * this.pageSize); },
    selectedCount() { return Object.values(this.selection).filter(Boolean).length; },
    selectedIds() { return Object.entries(this.selection).filter(([, v]) => v).map(([id]) => id); },
    selectedItems() { const ids = new Set(this.selectedIds.map(String)); return this.items.filter((i) => ids.has(String(i.id))); },
    bulkTotalCount() { return new Set([...this.selectedIds.map(String), ...this.filtered.map((i) => String(i.id))]).size; },
    resolvedBulkActions() {
      return this.bulkActions.filter((a) => !a.when || a.when(this.selectedItems, this.selectedIds)).map((a) => ({ ...a, disabled: typeof a.disabled === "function" ? a.disabled(this.selectedItems, this.selectedIds) : Boolean(a.disabled) }));
    },
    allPageSelected() { return this.paged.length > 0 && this.paged.every((i) => this.selection[i.id]); },
    rangeLabel() {
      if (!this.sorted.length) return "0 records";
      const s = (Math.min(this.page, this.pageCount) - 1) * this.pageSize + 1;
      return `${s}–${Math.min(s + this.pageSize - 1, this.sorted.length)} of ${this.sorted.length}`;
    },
  },
  watch: {
    tableId() { this.resetForTable(); },
    pageSize() { this.page = 1; this.persist(); },
    query(v) { this.page = 1; if (v) this.searchOpen = true; },
    filters: { deep: true, handler() { this.page = 1; } },
    filterRules: { deep: true, handler() { this.page = 1; } },
    page() { if (this.page > this.pageCount) this.page = this.pageCount; },
    sortState: { deep: true, handler() { this.persist(); } },
    visibility: { deep: true, handler() { this.persist(); } },
    order: { deep: true, handler() { this.persist(); } },
    widths: { deep: true, handler() { this.persist(); } },
    mode() { this.persist(); },
  },
  methods: {
    resetForTable() {
      const saved = this.readStore(), keys = layoutKeys(this.columns, this.editable), stored = (saved?.order || []).filter((k) => keys.includes(k)), order = [...stored, ...keys.filter((k) => !stored.includes(k))];
      this.query = ""; this.searchOpen = false; this.filters = {}; this.filterRules = []; this.filterDrawerOpen = false; this.filterFocusKey = ""; this.columnsOpen = false; this.viewsOpen = false;
      this.sortState = saved?.sortState || { key: "", desc: false }; this.visibility = Object.fromEntries(keys.map((k) => [k, saved?.visibility?.[k] !== false]));
      this.order = order; this.widths = saved?.widths || {}; this.page = 1; this.pageSize = saved?.pageSize || 10; this.selection = {}; this.mode = saved?.mode || "table"; this.editing = null; this.activeGroup = "all";
      const seeded = this.initialViews.map((v) => normalizeView(v, this.columns, this.editable)).filter(Boolean);
      const st = saved?.views || []; this.savedViews = mergeViews(seeded, st);
      this.activeView = st.length > 0 ? (saved?.activeView && this.savedViews.some((v) => v.id === saved.activeView) ? saved.activeView : "") : (this.savedViews.find((v) => v.default)?.id || "");
      if (this.activeView) this.$nextTick(() => this.applyView()); else this.$nextTick(() => this.persist());
    },
    display(item, key) { return this.format(item, key); },
    openSearch(focus = true) { this.searchOpen = true; this.viewsOpen = false; this.columnsOpen = false; if (focus) this.$nextTick(() => this.$refs.searchInput?.focus()); },
    closeSearchIfIdle() { this.$nextTick(() => { if (!this.query && document.activeElement !== this.$refs.searchInput) this.searchOpen = false; }); },
    closeSearch() { this.query = ""; this.searchOpen = false; },
    isStatus(key) { return ["status", "paymentStatus"].includes(key); },
    sort(key) { this.sortState = this.sortState.key === key ? { key, desc: !this.sortState.desc } : { key, desc: false }; },
    togglePage() { const n = !this.allPageSelected; this.paged.forEach((i) => (this.selection[i.id] = n)); },
    selectAllFiltered() { this.filtered.forEach((i) => (this.selection[i.id] = true)); },
    clearFilters() { this.query = ""; this.searchOpen = false; this.clearDrawerFilters(); },
    clearDrawerFilters() { this.filters = {}; this.filterRules = []; this.activeGroup = "all"; },
    openFilters(focusKey = "") { this.filterFocusKey = focusKey; this.filterDrawerOpen = true; this.viewsOpen = false; this.columnsOpen = false; },
    closeFilters() { this.filterDrawerOpen = false; this.filterFocusKey = ""; },
    openEditor(item, column) { if (column.edit) this.editing = { id: item.id, key: column.key }; },
    saveEdit(item, column, value) { this.$emit("update-cell", { id: item.id, key: column.key, value }); this.editing = null; },
    requestDelete(item) { this.$emit("delete", item); },
    actionsFor(item) { return this.rowActions.filter((a) => !a.when || a.when(item)).map((a) => ({ ...a, disabled: typeof a.disabled === "function" ? a.disabled(item) : Boolean(a.disabled) })); },
    handleRowAction(item, action) {
      if (typeof action.handler === "function") action.handler(item); else if (action.key === "edit") this.$emit("edit", item); else if (action.key === "delete") this.requestDelete(item); else this.$emit("row-action", { key: action.key, action, item });
    },
    handleBulkAction(action) {
      if (typeof action.handler === "function") action.handler(this.selectedItems, this.selectedIds); else if (action.key === "archive") this.$emit("archive", this.selectedIds); else if (action.key === "export") this.exportSelected(); else this.$emit("bulk-action", { key: action.key, action, ids: this.selectedIds, items: this.selectedItems });
      if (action.clearSelection) this.selection = {};
    },
    exportSelected() {
      if (!this.selectedItems.length) return;
      const keys = this.columns.map((c) => c.key), rows = this.selectedItems.map((i) => Object.fromEntries(keys.map((k) => [k, this.display(i, k)])));
      window.ProcurementCommon?.download(`${this.tableId}-selection.csv`, window.ProcurementCommon.csv(rows, keys), "text/csv");
    },
    startColumnDrag(event, key) { this.dragColumn = key; if (event.dataTransfer) { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", key); } },
    dropColumn(target) {
      if (!this.dragColumn || this.dragColumn === target) return;
      const next = [...this.order], from = next.indexOf(this.dragColumn), to = next.indexOf(target);
      if (from < 0 || to < 0) return;
      next.splice(to, 0, next.splice(from, 1)[0]);
      this.order = next; this.dragColumn = "";
    },
    moveColumn(key, delta) {
      const from = this.order.indexOf(key), to = Math.max(0, Math.min(this.order.length - 1, from + delta));
      if (from < 0 || from === to) return;
      const next = [...this.order];
      next.splice(to, 0, next.splice(from, 1)[0]);
      this.order = next;
    },
    startResize(event, key) {
      const startX = event.clientX, start = this.widths[key] || event.target.parentElement.offsetWidth;
      const move = (e) => (this.widths[key] = Math.max(80, start + e.clientX - startX));
      const end = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", end); };
      window.addEventListener("mousemove", move); window.addEventListener("mouseup", end);
    },
    groupedItems(value) { return value === "all" ? this.baseFiltered : this.baseFiltered.filter((i) => String(i[this.groupBy] ?? "Unassigned") === value); },
    resetView() {
      this.visibility = Object.fromEntries(layoutKeys(this.columns, this.editable).map((k) => [k, true]));
      this.order = layoutKeys(this.columns, this.editable); this.widths = {}; this.sortState = { key: "", desc: false }; this.mode = "table";
      this.activeView = ""; this.viewsOpen = false; this.clearFilters(); this.columnsOpen = false;
    },
    readStore() {
      return (typeof window !== "undefined" && window.DataTableStorage) ? window.DataTableStorage.readStore(this.tableId, this.columns, this.editable, normalizeView, layoutKeys, VIEW_MODES) : null;
    },
    persist() {
      if (typeof window !== "undefined" && window.DataTableStorage) {
        window.DataTableStorage.persistStore(this.tableId, { sortState: this.sortState, visibility: this.visibility, order: this.order, widths: this.widths, mode: this.mode, pageSize: this.pageSize, views: this.savedViews, activeView: this.activeView });
      }
    },
    currentViewState() {
      return { query: this.query, filters: { ...this.filters }, filterRules: this.filterRules.map((r) => ({ ...r })), filterMode: this.filterMode, activeGroup: this.activeGroup, sortState: { ...this.sortState }, visibility: { ...this.visibility }, order: [...this.order], widths: { ...this.widths }, mode: this.mode, pageSize: this.pageSize };
    },
    viewSignature(view) {
      return (typeof window !== "undefined" && window.DataTableStorage) ? window.DataTableStorage.computeSignature(view, this.columns, this.editable, layoutKeys) : JSON.stringify(view);
    },
    saveView(input) {
      const name = String(input || "").trim();
      if (!name) return;
      if (this.savedViews.some((v) => v.name.toLocaleLowerCase() === name.toLocaleLowerCase())) { this.saveViewError = "A saved view with this name already exists."; return; }
      const view = { id: window.ProcurementCommon ? window.ProcurementCommon.uid("view") : `view-${Date.now()}`, name, ...this.currentViewState() };
      this.savedViews.push(view); this.savedViews = this.savedViews.slice(-12); this.activeView = view.id; this.saveDialogOpen = false; this.saveViewError = ""; this.persist();
    },
    openSaveViewDialog() { this.viewsOpen = false; this.columnsOpen = false; this.saveViewError = ""; this.saveDialogOpen = true; },
    closeSaveViewDialog() { this.saveDialogOpen = false; this.saveViewError = ""; },
    updateSavedView() {
      const idx = this.savedViews.findIndex((v) => v.id === this.activeView);
      if (idx < 0) return;
      const orig = this.savedViews[idx];
      this.savedViews.splice(idx, 1, { ...orig, ...this.currentViewState(), id: orig.id, name: orig.name });
      this.viewsOpen = false; this.persist();
    },
    selectSavedView(id) { this.activeView = id; this.viewsOpen = false; this.applyView(); },
    applyView() {
      const view = this.savedViews.find((v) => v.id === this.activeView);
      if (!view) { this.clearFilters(); this.persist(); return; }
      this.query = view.query || ""; this.filters = { ...(view.filters || {}) }; this.filterRules = (view.filterRules || []).map((r) => ({ ...r })); this.filterMode = view.filterMode === "any" ? "any" : "all"; this.activeGroup = view.activeGroup || "all"; this.sortState = { ...view.sortState }; this.visibility = { ...view.visibility }; this.order = [...view.order]; this.widths = { ...view.widths }; this.mode = view.mode; this.pageSize = view.pageSize; this.page = 1; this.persist();
    },
  },
};
</script>
