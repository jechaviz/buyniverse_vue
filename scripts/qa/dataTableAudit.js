const fs = require("fs");
const path = require("path");

function runDataTableAudit(root, read, vueFiles) {
  const dataTableSource = read("app/components/DataTable.vue")
    .match(/<script>([\s\S]*?)<\/script>/)[1]
    .replace("export default", "return");
  const dataTable = new Function("Vue", dataTableSource)({
    defineAsyncComponent: (value) => value,
  });
  const dataTableFile = read("app/components/DataTable.vue");
  const paginationSource = read("app/components/DataTablePagination.vue");
  const tableQuerySource = read("app/services/tableQuery.js");
  const tableQueryScope = { WebCommon: { sanitizeText: (value, limit) => String(value == null ? "" : value).slice(0, limit), safeInternalPath: (value) => value } };
  new Function("window", tableQuerySource)(tableQueryScope);
  const normalizedRemoteQuery = tableQueryScope.BuyniverseTableQuery.normalize({ query: "x".repeat(300), page: { size: 100000, cursor: "cursor" }, filters: [{ field: "status", operator: "equals", value: "OPEN" }] });
  if (normalizedRemoteQuery.query.length !== 160 || normalizedRemoteQuery.page.size !== 200 || normalizedRemoteQuery.filters.length !== 1)
    throw new Error("Remote cursor query normalization failed");
  for (const token of ["AbortController", "dataSource", "remoteMode", "nextCursor", "loadRemote", "cursorMode", "maxPageSize"]) {
    if (!dataTableFile.includes(token) && !tableQuerySource.includes(token) && !paginationSource.includes(token))
      throw new Error(`Scalable remote-table behavior is missing ${token}`);
  }
  if (!read("SCALABLE_TABLES.md").includes("search_after") || !read("SCALABLE_TABLES.md").includes("point in time"))
    throw new Error("Search backend contract documentation is incomplete");
  for (const token of [
    "initialViews",
    "normalizeView",
    "filterRules",
    "activeGroup",
    "activeView",
  ]) {
    if (!dataTableFile.includes(token))
      throw new Error(`Saved view coverage is missing ${token}`);
  }

  if (!read("app/pages/WorkspacePage.vue").includes("demo-active-delivery"))
    throw new Error("Projects demo saved view is missing");

  const textInputDialogSource = read("app/components/TextInputDialog.vue");
  if (
    dataTableSource.includes("window.prompt") ||
    !dataTableSource.includes("TextInputDialog") ||
    !textInputDialogSource.includes('role="dialog"') ||
    !textInputDialogSource.includes(':required="required"')
  )
    throw new Error("Saved views must use the accessible reusable input dialog");

  for (const token of [
    "currentViewLabel",
    "isViewDirty",
    "updateSavedView",
    "Save as new view",
    ':aria-label="t(\'Save New View\')"',
    ':aria-label="t(\'Search records\')"',
    "searchOpen",
    "openSearch",
    "openSearch(false)",
    "closeSearchIfIdle",
    "closeSearch",
    "Save New View",
    "openSaveViewDialog",
    ':aria-label="t(\'Columns\')"',
    "column-drag-handle",
    "safeLinkFor",
    "sanitizeQuery",
    "aria-sort",
    "resultSummary",
    'maxlength="160"',
    'class="truncate">{{ t(column.label) }}',
  ]) {
    if (!dataTableFile.includes(token))
      throw new Error(`Dense saved-view toolbar is missing ${token}`);
  }

  if (dataTableFile.includes("saveViewFromMenu"))
    throw new Error("New saved views must use the adjacent split-button action");
  if (dataTableFile.includes('<span class="hidden sm:inline">Columns</span>'))
    throw new Error("The dense column manager must rely on its icon and tooltip");

  const filterDrawerSource = read("app/components/DataTableFilterDrawer.vue");
  const sideDrawerSource = read("app/components/SideDrawer.vue");
  const collapsibleSectionSource = read("app/components/CollapsibleSection.vue");
  for (const token of [
    "update:filters",
    "update:rules",
    "update:mode",
    "focusKey",
    "activeCount",
  ]) {
    if (!filterDrawerSource.includes(token))
      throw new Error(`Reusable data-table filter drawer is missing ${token}`);
  }

  if (
    /Projects|Invoices|Payments/.test(filterDrawerSource) ||
    !sideDrawerSource.includes('role="dialog"') ||
    dataTableFile.includes("advancedOpen") ||
    dataTableFile.includes("filterOpen")
  )
    throw new Error("Data-table filters must use the generic pluggable drawer");

  if (
    !filterDrawerSource.includes('v-model="rulesOpen"') ||
    !filterDrawerSource.includes('v-model="columnsOpen"') ||
    !collapsibleSectionSource.includes("defaultOpen") ||
    !collapsibleSectionSource.includes(':aria-expanded="isOpen"')
  )
    throw new Error("Drawer sections must be reusable and collapsed by default");

  const rowActionSource = read("app/components/RowActionMenu.vue");
  const bulkActionSource = read("app/components/BulkActionBar.vue");
  for (const token of [
    "ACTION_COLUMN_KEY",
    "configurableColumns",
    "visibleTableColumns",
    "RowActionMenu",
    "BulkActionBar",
    "selectAllFiltered",
    "exportSelected",
    "startColumnDrag",
    "moveColumn",
  ]) {
    if (!dataTableFile.includes(token))
      throw new Error(`Movable action-column coverage is missing ${token}`);
  }

  if (
    !rowActionSource.includes("group-hover:opacity-100") ||
    !rowActionSource.includes('v-for="action in actions"') ||
    rowActionSource.includes("More actions") ||
    !bulkActionSource.includes("{{ t(`Select all ${totalCount} matching`) }}") ||
    !bulkActionSource.includes("{{ t('Bulk actions') }}")
  )
    throw new Error("Contextual row actions or bulk actions are incomplete");

  const actionReorderContext = {
    dragColumn: "__actions",
    order: ["title", "status", "__actions"],
  };
  dataTable.methods.dropColumn.call(actionReorderContext, "title");
  if (
    actionReorderContext.order[0] !== "__actions" ||
    actionReorderContext.dragColumn !== ""
  )
    throw new Error("Actions virtual column cannot be reordered");

  const accessibleMoveContext = {
    order: ["title", "status", "__actions"],
  };
  dataTable.methods.moveColumn.call(accessibleMoveContext, "__actions", -1);
  if (accessibleMoveContext.order.join(",") !== "title,__actions,status")
    throw new Error("Actions column accessible movement failed");

  if (
    !dataTableFile.includes('v-for="(column, index) in configurableColumns"') ||
    !dataTableFile.includes('v-model="visibility[column.key]"')
  )
    throw new Error("Actions must appear in the visible-column manager");

  const context = {
    query: "",
    columns: [{ key: "title" }, { key: "budget" }, { key: "status" }],
    items: [
      { title: "Small", budget: 1200, status: "OPEN" },
      { title: "Large", budget: 8000, status: "OPEN" },
      { title: "Draft", budget: 25000, status: "DRAFT" },
    ],
    filters: {},
    filterMode: "all",
    display: (item, key) => item[key],
    filterRules: [
      { key: "budget", operator: "gt", value: "5000" },
      { key: "status", operator: "equals", value: "OPEN" },
    ],
  };
  const andRows = dataTable.computed.baseFiltered
    .call(context)
    .map((item) => item.title);
  context.filterMode = "any";
  const anyRows = dataTable.computed.baseFiltered
    .call(context)
    .map((item) => item.title);
  if (JSON.stringify(andRows) !== JSON.stringify(["Large"]))
    throw new Error(`AND filter failed: ${andRows}`);
  if (JSON.stringify(anyRows) !== JSON.stringify(["Small", "Large", "Draft"]))
    throw new Error(`OR filter failed: ${anyRows}`);

  const breadcrumbSource = read("app/components/Breadcrumbs.vue");
  const appShellSource = read("app/App.vue");
  const sharedBrowserSource = read("../lib/web-common/browser.js");
  const breadcrumbMarker = ':aria-label="store.t(\'Breadcrumb\')"';
  const breadcrumbHosts = vueFiles.filter((file) =>
    read(file).includes(breadcrumbMarker),
  );
  if (
    breadcrumbHosts.length !== 1 ||
    breadcrumbHosts[0].replaceAll("\\", "/") !== "app/components/Breadcrumbs.vue"
  )
    throw new Error(`Breadcrumb must have one global owner: ${breadcrumbHosts}`);

  for (const token of [
    breadcrumbMarker,
    "PROJECT_TABS",
    "PROCUREMENT",
    "Contract",
    "conversation",
    "milestone",
    "New receipt",
  ]) {
    if (!breadcrumbSource.includes(token))
      throw new Error(`Nested breadcrumb coverage is missing ${token}`);
  }

  if (
    !appShellSource.includes("<Breadcrumbs />") ||
    !appShellSource.includes(':key="route.path"') ||
    appShellSource.includes(':key="route.fullPath"')
  )
    throw new Error(
      "The app shell must preserve nested views across query changes",
    );

  if (!sharedBrowserSource.includes("mergeRouteQuery"))
    throw new Error("Shared route-query normalization is missing");

  for (const [file, tokens] of Object.entries({
    "app/pages/ProjectPage.vue": [
      "openProjectTab",
      "openProviderTab",
      "openMilestone",
      "syncRouteState",
    ],
    "app/pages/WorkspacePage.vue": ["selectConversation", 'new: "invoice"'],
    "app/pages/HomePage.vue": ["openTab", 'view: key === "saved"'],
    "app/pages/PostJobWizard.vue": ["route.query.step", "mergeRouteQuery"],
    "app/pages/DashboardPage.vue": [
      'to: "/dashboard/timesheets"',
      'to: "/dashboard/transactions"',
      'to: "/dashboard/my-agency"',
    ],
    "app/pages/procurement/SourcingWorkspace.vue": [
      'path: "/procurement/sourcing"',
      "wizardStep",
      "route.query.step",
    ],
    "app/pages/procurement/LiveAuctionWorkspace.vue": [
      'path: "/procurement/auction"',
      '["live", "history", "rank", "communications", "audit"]',
    ],
    "app/pages/procurement/ProcurementExecution.vue": [
      'path: "/procurement/execution"',
      'view: value ? "receipt"',
    ],
    "app/pages/procurement/ProcurementIntelligence.vue": [
      "openSupplierView",
      "selectedEventId",
      "scenarioId",
    ],
    "app/pages/procurement/ProcurementGovernance.vue": [
      "openTab",
      'path: "/procurement/governance"',
      "route.query.tab",
    ],
  })) {
    const source = read(file);
    for (const token of tokens)
      if (!source.includes(token))
        throw new Error(`${file} route-view coverage is missing ${token}`);
  }

  const liveAuctionSource = read("app/pages/procurement/LiveAuctionWorkspace.vue");
  if (/bidError\.value = "";\s*tab\.value = "live"/.test(liveAuctionSource))
    throw new Error("Auction data refresh must not reset the selected nested tab");
}

module.exports = { runDataTableAudit };
