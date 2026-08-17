const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const vueFiles = [];
const walk = (directory) => {
  for (const entry of fs.readdirSync(path.join(root, directory), {
    withFileTypes: true,
  })) {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(relative);
    else if (entry.name.endsWith(".vue")) vueFiles.push(relative);
  }
};
walk("app");

for (const file of vueFiles) {
  const match = read(file).match(/<script>([\s\S]*?)<\/script>/);
  if (match) {
    try {
      new Function(
        "Vue",
        "VueRouter",
        match[1].replace("export default", "return"),
      );
    } catch (error) {
      throw new Error(`${file}: ${error.message}`);
    }
  }
}
new Function(read("app/main.js"));
new Function(read("app/i18n.js"));

const localeStorage = new Map();
const i18nScope = {
  navigator: { language: "en-US" },
  localStorage: {
    getItem: (key) => localeStorage.get(key) || null,
    setItem: (key, value) => localeStorage.set(key, String(value)),
  },
  dispatchEvent: () => {},
  CustomEvent: function (type, init) {
    this.type = type;
    this.detail = init?.detail;
  },
};
new Function("window", read("../lib/web-common/browser.js"))(i18nScope);
new Function("window", read("app/i18n.js"))(i18nScope);
if (
  !i18nScope.BuyniverseI18n.setLocale("es") ||
  i18nScope.BuyniverseI18n.t("Projects") !== "Proyectos" ||
  i18nScope.BuyniverseI18n.t("12 records") !== "12 registros" ||
  i18nScope.BuyniverseI18n.t("Commercial summary") !== "Resumen comercial" ||
  i18nScope.BuyniverseI18n.t("1 provider proposal") !== "1 propuesta de proveedor" ||
  i18nScope.BuyniverseI18n.t("2 provider proposals") !== "2 propuestas de proveedores" ||
  i18nScope.BuyniverseI18n.t("Step 3 of 5") !== "Paso 3 de 5" ||
  i18nScope.BuyniverseI18n.t("Drag Status") !== "Arrastrar Estado" ||
  i18nScope.BuyniverseI18n.t("Filter Status") !== "Filtrar Estado" ||
  i18nScope.BuyniverseI18n.t("ACTIVE") !== "ACTIVO" ||
  i18nScope.BuyniverseI18n.t("Owner: Risk Office") !==
    "Responsable: Oficina de Riesgos" ||
  i18nScope.BuyniverseI18n.t("· 3 invited suppliers.") !==
    "· 3 proveedores invitados." ||
  i18nScope.BuyniverseI18n.intlLocale() !== "es-MX" ||
  localeStorage.get("buyniverse-vue-locale") !== "es"
)
  throw new Error("Bilingual runtime translation or persistence failed");
const localeInvariantCopy = new Set([
  "Buyniverse",
  "Finkok",
  "SW Sapien",
  "Total",
  "Subtotal",
  "CFDI 4.0",
  "Marketing",
  "Brief",
  "+60 sec",
  "Incoterm",
  "Net 15",
  "Net 30",
  "Net 45",
  "Net 60",
  "Control",
]);
const staticCopy = [
  ...new Set(
    vueFiles.flatMap((file) => {
      const template = read(file).match(/<template>([\s\S]*?)<\/template>/)?.[1];
      return [...(template || "").matchAll(/>([^<{][^<]*)</g)]
        .map((match) => match[1].replace(/\s+/g, " ").trim())
        .filter(
          (value) =>
            value.length > 1 &&
            value.length <= 180 &&
            /[A-Za-z]/.test(value) &&
            !/[{}=<>]/.test(value) &&
            !/^(Ctrl K|ESC|[A-Z]{2,6}|[A-Z0-9-]+)$/.test(value) &&
            !localeInvariantCopy.has(value),
        );
    }),
  ),
];
const translatedStaticCopy = staticCopy.filter(
  (value) => i18nScope.BuyniverseI18n.t(value) !== value,
);
const translationCoverage = Math.round(
  (translatedStaticCopy.length / staticCopy.length) * 100,
);
if (translationCoverage < 80)
  throw new Error(
    `Static bilingual coverage is too low: ${translationCoverage}%\n${staticCopy
      .filter((value) => i18nScope.BuyniverseI18n.t(value) === value)
      .slice(0, 140)
      .join("\n")}`,
  );
const indexSource = read("index.html");
if (
  !indexSource.includes("app/i18n.js") ||
  indexSource.indexOf("app/i18n.js") > indexSource.indexOf("app/main.js")
)
  throw new Error("The bilingual catalogue must load before the application");
const appSource = read("app/App.vue");
for (const token of [
  'aria-label="Language"',
  "buyniverse-vue-locale",
  "setLocale(code)",
  "BuyniverseI18n.install",
  'aria-labelledby="user-preferences-title"',
])
  if (!`${appSource}\n${read("app/i18n.js")}`.includes(token))
    throw new Error(`Bilingual UI coverage is missing ${token}`);
if (
  appSource.indexOf('aria-label="Language"') <
    appSource.indexOf('aria-label="Account menu"') ||
  appSource.includes("paletteOpen") ||
  appSource.includes('aria-label="Toggle theme"') ||
  appSource.includes('aria-label="Change accent color"')
)
  throw new Error("Language, theme and accent must live in the account menu");

const main = read("app/main.js");
const liveAuctionSource = read(
  "app/pages/procurement/LiveAuctionWorkspace.vue",
);
for (const token of [
  "supplierSeries",
  "visibleSupplierSeries",
  "chartSupplierSeries",
  "toggleSupplier",
  "showAllSuppliers",
  "clearSupplierFilters",
  'v-for="series in chartSupplierSeries"',
  'class="premium-card flex min-h-11 items-center',
])
  if (!liveAuctionSource.includes(token))
    throw new Error(`Live offer supplier chart is missing ${token}`);
const requiredRoutes = [
  "/",
  "/dashboard/:section?",
  "/clients",
  "/suppliers",
  "/leads",
  "/projects",
  "/project/:id",
  "/project/:id/contest",
  "/invoices",
  "/invoices/new",
  "/invoices/:invoiceId/edit",
  "/invoices/:invoiceId",
  "/estimates",
  "/payments",
  "/payments/new",
  "/payments/:paymentId/edit",
  "/products",
  "/expenses",
  "/messages",
  "/post-job/:id?",
  "/job/:jobId",
  "/client/job/:jobId",
  "/profile/billing",
  "/profile/:userId",
  "/agency/:agencyId",
  "/contract/:contractId",
  "/find-talent",
  "/saved-jobs",
  "/browse-services",
  "/gig/:gigId",
  "/admin/issuers",
  "/procurement/:section?",
];
const missingRoutes = requiredRoutes.filter(
  (route) => !main.includes(`r("${route}"`) && !main.includes(`r('${route}'`),
);
if (missingRoutes.length)
  throw new Error(`Missing routes: ${missingRoutes.join(", ")}`);

const index = read("index.html");
for (const dependency of [
  "vue.global.prod.js",
  "vue-router.global.prod.js",
  "vue3-sfc-loader",
  "unocss",
]) {
  if (!index.toLowerCase().includes(dependency))
    throw new Error(`Missing CDN dependency: ${dependency}`);
}
if (!index.includes("../lib/procurement-common/browser.js"))
  throw new Error("Missing shared procurement browser library");
if (/node_modules|\/dist\/assets\//i.test(index))
  throw new Error("Production HTML depends on a Node build artifact");
if (
  !index.includes("Content-Security-Policy") ||
  !index.includes('integrity="sha384-')
)
  throw new Error("CSP or subresource integrity is missing");
if (
  /vue@3\/|vue-router@4\/|npm\/@unocss\/runtime["']|npm\/vue3-sfc-loader\/dist/.test(
    index,
  )
)
  throw new Error("A security-sensitive CDN dependency is not pinned");
const server = read("serve.py");
if (
  !server.includes("X-Content-Type-Options") ||
  !server.includes("frame-ancestors") ||
  !server.includes("def _allowed") ||
  !server.includes("def list_directory") ||
  !server.includes("do_TRACE") ||
  !server.includes("X-Permitted-Cross-Domain-Policies")
)
  throw new Error(
    "Secure static server headers, methods or path allowlist are incomplete",
  );
if (
  server.includes(
    'raw_path.startswith("/buyniverse_vue/"):\n            return True',
  )
)
  throw new Error("Static server exposes the full project directory");

const unsafeSink =
  /v-html|\.innerHTML\s*=|\.outerHTML\s*=|document\.write\s*\(|javascript:/i;
for (const file of [...vueFiles, "app/main.js"])
  if (unsafeSink.test(read(file)))
    throw new Error(`Unsafe DOM sink in ${file}`);
const uploadFiles = vueFiles.filter((file) =>
  /type=["']file["']/.test(read(file)),
);
for (const file of uploadFiles)
  if (!/type=["']file["'][^>]*accept=/.test(read(file)))
    throw new Error(`File input lacks an allowlist in ${file}`);

const visualManifest = JSON.parse(read("assets/procurement/manifest.json"));
const visualFiles = visualManifest.assets.map((asset) => asset.file);
if (new Set(visualFiles).size !== visualFiles.length)
  throw new Error("Duplicate canonical procurement assets");
for (const file of visualFiles)
  if (!fs.existsSync(path.join(root, "assets", "procurement", file)))
    throw new Error(`Missing procurement asset: ${file}`);

const browserScope = {};
new Function("window", read("app/data/demo.js"))(browserScope);
const seed = browserScope.BuyniverseDemo.seed;
const procurementScope = {};
new Function(
  "window",
  fs.readFileSync(
    path.resolve(root, "../lib/procurement-common/browser.js"),
    "utf8",
  ),
)(procurementScope);
if (
  !procurementScope.ProcurementCommon ||
  typeof procurementScope.ProcurementCommon.rankQuotes !== "function"
)
  throw new Error("Missing shared ProcurementCommon browser API");
const csvProbe = procurementScope.ProcurementCommon.csv([
  { value: '=HYPERLINK("https://example.invalid")' },
]);
if (!csvProbe.includes("\t=HYPERLINK"))
  throw new Error("CSV formula injection protection failed");

const storageValues = {};
const webScope = {
  localStorage: {
    getItem: (key) => storageValues[key] || null,
    setItem: (key, value) => {
      storageValues[key] = value;
    },
    removeItem: (key) => {
      delete storageValues[key];
    },
  },
};
new Function(
  "window",
  fs.readFileSync(path.resolve(root, "../lib/web-common/browser.js"), "utf8"),
)(webScope);
const secureStorage = webScope.WebCommon.createVersionedStorage("qa", 1);
secureStorage.write({
  safe: "kept",
  password: "remove-me",
  nested: { apiKey: "remove-me-too", myAccessToken: "remove-me-three" },
});
if (
  /remove-me|password|apiKey|myAccessToken/.test(storageValues.qa) ||
  secureStorage.read().value.safe !== "kept"
)
  throw new Error("Sensitive storage redaction failed");
if (webScope.WebCommon.sanitizeText("safe\u202Etxt", 40) !== "safetxt")
  throw new Error("Bidi control sanitization failed");
storageValues.poisoned =
  '{"version":1,"data":{"safe":true,"__proto__":{"polluted":true}}}';
const poisoned = webScope.WebCommon.createVersionedStorage("poisoned", 1).read()
  .value;
if (!poisoned.safe || Object.prototype.polluted)
  throw new Error("Prototype pollution storage guard failed");
const draftValues = {};
webScope.sessionStorage = {
  getItem: (key) => draftValues[key] || null,
  setItem: (key, value) => {
    draftValues[key] = value;
  },
  removeItem: (key) => {
    delete draftValues[key];
  },
};
new Function(
  "window",
  fs.readFileSync(path.resolve(root, "../lib/web-common/browser.js"), "utf8"),
)(webScope);
const secureDraft = webScope.WebCommon.createSessionDraft("draft-qa", {
  ttlMs: 60000,
});
secureDraft.write({ title: "kept", apiKey: "remove-me" });
if (
  draftValues["draft-qa"].includes("remove-me") ||
  secureDraft.read().title !== "kept"
)
  throw new Error("Ephemeral draft redaction failed");

const forms = vueFiles.flatMap((file) =>
  [...read(file).matchAll(/<form\b[\s\S]*?<\/form>/g)].map((match) => ({
    file,
    source: match[0],
  })),
);
if (!forms.length || !forms.some((form) => /\brequired\b/.test(form.source)))
  throw new Error("No interactive required form coverage found");
if (
  !fs
    .readFileSync(path.resolve(root, "../lib/web-common/browser.js"), "utf8")
    .includes("installFormValidation")
)
  throw new Error("Shared accessible form validation is missing");
for (const form of forms) {
  if (!/<(?:input|select|textarea)\b/.test(form.source))
    throw new Error(`Form without an interactive control: ${form.file}`);
  if (!/@submit(?:\.prevent)?=/.test(form.source))
    throw new Error(`Form without an explicit submit flow: ${form.file}`);
}
const validationRuntime = fs.readFileSync(
  path.resolve(root, "../lib/web-common/browser.js"),
  "utf8",
);
for (const token of [
  "aria-required",
  "aria-invalid",
  "aria-describedby",
  "role",
  "MutationObserver",
  "scrollIntoView",
])
  if (!validationRuntime.includes(token))
    throw new Error(`Accessible validation is missing ${token}`);
for (const token of [
  'roles: ["Client", "Admin"]',
  'roles: ["Freelancer", "Admin"]',
  "jobAccess: true",
  "projectAccess: true",
  "invoiceAccess: true",
  "contractAccess: true",
  "paymentAccess: true",
  "to.meta.roles",
  "to.meta.jobAccess",
  "to.meta.projectAccess",
  "to.meta.invoiceAccess",
  "to.meta.contractAccess",
  "to.meta.paymentAccess",
])
  if (!main.includes(token))
    throw new Error(`Route/object access guard is missing: ${token}`);
const byId = (collection) => new Set(collection.map((item) => item.id));
const users = byId(seed.users),
  jobs = byId(seed.jobs),
  contracts = byId(seed.contracts);
const agencies = byId(seed.agencies),
  invoices = byId(seed.invoices);
for (const [name, collection] of Object.entries(seed).filter(([, value]) =>
  Array.isArray(value),
)) {
  if (byId(collection).size !== collection.length)
    throw new Error(`Duplicate IDs in ${name}`);
}
for (const job of seed.jobs) {
  if (!users.has(job.clientId))
    throw new Error(`Job ${job.id} has missing client ${job.clientId}`);
  for (const proposal of job.proposals || [])
    if (!users.has(proposal.freelancerId))
      throw new Error(`Proposal ${proposal.id} has missing freelancer`);
  if (job.contractId && !contracts.has(job.contractId))
    throw new Error(`Job ${job.id} has missing contract`);
}
for (const contract of seed.contracts) {
  if (
    !jobs.has(contract.sourceId) ||
    !users.has(contract.clientId) ||
    !users.has(contract.providerId)
  )
    throw new Error(`Broken contract relation: ${contract.id}`);
}
for (const invoice of seed.invoices) {
  if (!users.has(invoice.clientId) || !users.has(invoice.providerId))
    throw new Error(`Broken invoice relation: ${invoice.id}`);
}
for (const conversation of seed.conversations) {
  if (
    !jobs.has(conversation.jobId) ||
    conversation.participants.some((id) => !users.has(id))
  )
    throw new Error(`Broken conversation relation: ${conversation.id}`);
}
for (const agency of seed.agencies) {
  if (
    !users.has(agency.ownerId) ||
    agency.members.some((member) => !users.has(member.userId))
  )
    throw new Error(`Broken agency relation: ${agency.id}`);
}
for (const gig of seed.gigs) {
  const creators = gig.creatorType === "agency" ? agencies : users;
  if (!creators.has(gig.creatorId))
    throw new Error(`Broken gig creator: ${gig.id}`);
}

const suppliers = byId(seed.suppliers),
  products = byId(seed.products);
const requests = byId(seed.purchaseRequests),
  events = byId(seed.sourcingEvents);
const auctions = byId(seed.auctions),
  orders = byId(seed.purchaseOrders);
for (const request of seed.purchaseRequests) {
  if (
    !users.has(request.requesterId) ||
    !users.has(request.approverId) ||
    !users.has(request.ownerId)
  )
    throw new Error(`Broken request people: ${request.id}`);
  if (request.projectId && !jobs.has(request.projectId))
    throw new Error(`Broken request project: ${request.id}`);
  if (request.sourcingEventId && !events.has(request.sourcingEventId))
    throw new Error(`Broken request sourcing event: ${request.id}`);
  for (const line of request.items || [])
    if (line.productId && !products.has(line.productId))
      throw new Error(`Broken request product: ${request.id}`);
}
for (const event of seed.sourcingEvents) {
  if (event.requestId && !requests.has(event.requestId))
    throw new Error(`Broken event request: ${event.id}`);
  if (event.projectId && !jobs.has(event.projectId))
    throw new Error(`Broken event project: ${event.id}`);
  if (!users.has(event.ownerId))
    throw new Error(`Broken event owner: ${event.id}`);
  if ((event.invitedSupplierIds || []).some((id) => !suppliers.has(id)))
    throw new Error(`Broken event invitation: ${event.id}`);
  if ((event.quotes || []).some((quote) => !suppliers.has(quote.supplierId)))
    throw new Error(`Broken event quote: ${event.id}`);
  if (event.awardedSupplierId && !suppliers.has(event.awardedSupplierId))
    throw new Error(`Broken event award: ${event.id}`);
}
for (const auction of seed.auctions) {
  if (!events.has(auction.eventId) || !suppliers.has(auction.leadingSupplierId))
    throw new Error(`Broken auction relation: ${auction.id}`);
  if (
    auction.participants.some((item) => !suppliers.has(item.supplierId)) ||
    auction.bids.some((item) => !suppliers.has(item.supplierId))
  )
    throw new Error(`Broken auction supplier: ${auction.id}`);
}
const auctionProbe = JSON.parse(
  JSON.stringify(seed.auctions.find((item) => item.status === "Running")),
);
const auditCount = auctionProbe.audit.length;
const bidResult = procurementScope.ProcurementCommon.placeReverseBid(
  auctionProbe,
  auctionProbe.participants[0].supplierId,
  auctionProbe.currentBid - auctionProbe.minStep,
  "QA bidder",
);
if (
  !bidResult.ok ||
  auctionProbe.audit.length !== auditCount + 1 ||
  auctionProbe.bids.at(-1).amount !== auctionProbe.currentBid
)
  throw new Error("Reverse auction bid/audit flow failed");
for (const order of seed.purchaseOrders) {
  if (order.requestId && !requests.has(order.requestId))
    throw new Error(`Broken order request: ${order.id}`);
  if (order.eventId && !events.has(order.eventId))
    throw new Error(`Broken order event: ${order.id}`);
  if (order.projectId && !jobs.has(order.projectId))
    throw new Error(`Broken order project: ${order.id}`);
  if (!suppliers.has(order.supplierId) || !users.has(order.buyerId))
    throw new Error(`Broken order party: ${order.id}`);
  if (order.invoiceId && !invoices.has(order.invoiceId))
    throw new Error(`Broken order invoice: ${order.id}`);
  if (order.exceptions.some((item) => !users.has(item.ownerId)))
    throw new Error(`Broken order exception owner: ${order.id}`);
  if (
    order.lines.some((line) => line.productId && !products.has(line.productId))
  )
    throw new Error(`Broken order product: ${order.id}`);
}
const ranked = procurementScope.ProcurementCommon.rankQuotes(
  seed.sourcingEvents[0].quotes,
  seed.sourcingEvents[0].weights,
);
if (
  !ranked.length ||
  ranked.some((row, index) => row.rank !== index + 1) ||
  ranked.some((row) => !Number.isFinite(row.score))
)
  throw new Error("Procurement quote ranking failed");

const dataTableSource = read("app/components/DataTable.vue")
  .match(/<script>([\s\S]*?)<\/script>/)[1]
  .replace("export default", "return");
const dataTable = new Function("Vue", dataTableSource)({
  defineAsyncComponent: (value) => value,
});
const dataTableFile = read("app/components/DataTable.vue");
for (const token of [
  "initialViews",
  "normalizeView",
  "filterRules",
  "activeGroup",
  "activeView",
])
  if (!dataTableFile.includes(token))
    throw new Error(`Saved view coverage is missing ${token}`);
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
  'aria-label="Save New View"',
  'aria-label="Search records"',
  "searchOpen",
  "openSearch",
  "openSearch(false)",
  "closeSearchIfIdle",
  "closeSearch",
  "Save New View",
  "openSaveViewDialog",
  'aria-label="Columns"',
  "column-drag-handle",
  'class="truncate">{{ column.label }}',
])
  if (!dataTableFile.includes(token))
    throw new Error(`Dense saved-view toolbar is missing ${token}`);
if (dataTableFile.includes("saveViewFromMenu"))
  throw new Error("New saved views must use the adjacent split-button action");
const filterDrawerSource = read("app/components/DataTableFilterDrawer.vue");
const sideDrawerSource = read("app/components/SideDrawer.vue");
const collapsibleSectionSource = read("app/components/CollapsibleSection.vue");
for (const token of [
  "update:filters",
  "update:rules",
  "update:mode",
  "focusKey",
  "activeCount",
])
  if (!filterDrawerSource.includes(token))
    throw new Error(`Reusable data-table filter drawer is missing ${token}`);
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
])
  if (!dataTableFile.includes(token))
    throw new Error(`Movable action-column coverage is missing ${token}`);
if (
  !rowActionSource.includes("group-hover:opacity-100") ||
  !rowActionSource.includes('v-for="action in actions"') ||
  rowActionSource.includes("More actions") ||
  !bulkActionSource.includes("Select all {{ totalCount }} matching") ||
  !bulkActionSource.includes("Bulk actions")
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
const breadcrumbHosts = vueFiles.filter((file) =>
  read(file).includes('aria-label="Breadcrumb"'),
);
if (
  breadcrumbHosts.length !== 1 ||
  breadcrumbHosts[0].replaceAll("\\", "/") !==
    "app/components/Breadcrumbs.vue"
)
  throw new Error(`Breadcrumb must have one global owner: ${breadcrumbHosts}`);
for (const token of [
  'aria-label="Breadcrumb"',
  "PROJECT_TABS",
  "PROCUREMENT",
  "Contract",
  "conversation",
  "milestone",
  "New receipt",
])
  if (!breadcrumbSource.includes(token))
    throw new Error(`Nested breadcrumb coverage is missing ${token}`);
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
    '["live", "history", "rank", "audit"]',
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
if (/bidError\.value = "";\s*tab\.value = "live"/.test(liveAuctionSource))
  throw new Error("Auction data refresh must not reset the selected nested tab");

console.log(
  JSON.stringify(
    {
      vueFiles: vueFiles.length,
      routes: requiredRoutes.length,
      runtime: "CDN/SFC",
      security: "CSP/SRI + access + storage + CSV + DOM sinks pass",
      forms: `${forms.length} interactive forms audited`,
      compoundFilters: "AND/OR pass",
      demoRelations: "all references resolve",
      procurementFlow: "ranking + reverse bid/audit pass",
      nestedNavigation: "breadcrumbs + route-backed views pass",
      bilingual: `EN/ES runtime + ${translationCoverage}% static copy coverage`,
      canonicalImages: visualFiles.length,
    },
    null,
    2,
  ),
);
