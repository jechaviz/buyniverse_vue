const fs = require("fs");
const path = require("path");
const { runBilingualAudit } = require("./qa/bilingualAudit");
const { runSecurityAudit } = require("./qa/securityAudit");
const { runRelationsAudit } = require("./qa/relationsAudit");
const { runDataTableAudit } = require("./qa/dataTableAudit");
const { runSeoAudit } = require("./qa/seoAudit");
const { runCommunicationsAudit } = require("./qa/communicationsAudit");
const { runDocumentLibraryAudit } = require("./qa/documentLibraryAudit");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const vueFiles = [];
const walk = (directory) => {
  for (const entry of fs.readdirSync(path.join(root, directory), { withFileTypes: true })) {
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
      new Function("Vue", "VueRouter", match[1].replace("export default", "return"));
    } catch (error) {
      throw new Error(`${file}: ${error.message}`);
    }
  }
}
new Function(read("app/main.js"));
new Function(read("app/i18n.js"));

const index = read("index.html");
const criticalCss = read("app/critical.css");
if (!index.includes('src="app/boot.js') || !fs.existsSync(path.join(root, "app", "boot.js")))
  throw new Error("Missing synchronous visual-preference bootstrap");
if (!criticalCss.includes('data-app-ready="false"') || !criticalCss.includes("#app-boot"))
  throw new Error("Missing anti-FOUC boot layer");
if (!read("app/main.js").includes("buyniverse:app-shell-ready") || !read("app/App.vue").includes("buyniverse:app-shell-ready"))
  throw new Error("App reveal is not coordinated with the mounted shell");

const bilingualSummary = runBilingualAudit(root, read, vueFiles);

const main = read("app/main.js");
const liveAuctionSource = read("app/pages/procurement/LiveAuctionWorkspace.vue");
const homeHeroSource = read("app/pages/home/HomeHeroSection.vue");
const homeIntelligenceSource = read("app/pages/home/HomeIntelligenceSection.vue");
for (const token of [
  "supplierSeries", "visibleSupplierSeries", "chartSupplierSeries", "toggleSupplier",
  "showAllSuppliers", "clearSupplierFilters", 'v-for="series in chartSupplierSeries"',
  'v-for="(bid, index) in auction.bids"',
  'class="premium-card flex min-h-11 items-center',
]) {
  if (!liveAuctionSource.includes(token)) throw new Error(`Live offer supplier chart is missing ${token}`);
}

for (const token of ["lg:grid-cols-5", "lg:col-span-3", "lg:col-span-2"]) {
  if (!homeHeroSource.includes(token)) throw new Error(`Home hero responsive grid is missing ${token}`);
}
for (const token of ["lg:grid-cols-4", "lg:col-span-3", "lg:col-span-1"]) {
  if (!homeIntelligenceSource.includes(token)) throw new Error(`Opportunity layout responsive grid is missing ${token}`);
}
if (/lg:w-\[420px\]|lg:w-80/.test(homeHeroSource + homeIntelligenceSource))
  throw new Error("Home still relies on broken fixed-width responsive utilities");

for (const token of [
  "activeMarketplaceMode",
  "marketplaceModes",
  "setMarketplaceMode",
  'modes: ["buyer", "admin"]',
  'modes: ["supplier", "admin"]',
  "to.meta.modes",
  "Workspace route denied",
]) {
  if (!main.includes(token)) throw new Error(`Company workspace context is missing ${token}`);
}

const requiredRoutes = [
  "/", "/find-work", "/dashboard/:section?", "/clients", "/suppliers", "/leads", "/projects", "/project/:id",
  "/project/:id/contest", "/invoices", "/invoices/new", "/invoices/:invoiceId/edit",
  "/invoices/:invoiceId", "/estimates", "/payments", "/payments/new", "/payments/:paymentId/edit",
  "/products", "/expenses", "/messages", "/post-job/:id?", "/job/:jobId", "/client/job/:jobId",
  "/profile/billing", "/profile/:userId", "/agency/:agencyId", "/contract/:contractId",
  "/find-talent", "/saved-jobs", "/browse-services", "/gig/:gigId", "/admin/issuers",
  "/procurement/:section?",
];
const missingRoutes = requiredRoutes.filter((r) => !main.includes(`r("${r}"`) && !main.includes(`r('${r}'`));
if (missingRoutes.length) throw new Error(`Missing routes: ${missingRoutes.join(", ")}`);

const secResult = runSecurityAudit(root, read, vueFiles);

const browserScope = {};
new Function("window", read("app/data/demo.js"))(browserScope);
const seed = browserScope.BuyniverseDemo.seed;

runRelationsAudit(root, read, seed, main);
runDataTableAudit(root, read, vueFiles);
const seoResult = runSeoAudit(read);
const communicationsResult = runCommunicationsAudit(root, read);
const documentLibraryResult = runDocumentLibraryAudit(root, read);

console.log(
  JSON.stringify(
    {
      vueFiles: vueFiles.length,
      routes: requiredRoutes.length + 2,
      runtime: "CDN/SFC",
      security: "CSP/SRI + access + storage + CSV + DOM sinks pass",
      forms: `${secResult.formCount} interactive forms audited`,
      compoundFilters: "AND/OR pass",
      demoRelations: "all references resolve",
      procurementFlow: "ranking + reverse bid/audit pass",
      nestedNavigation: "breadcrumbs + route-backed views pass",
      bilingual: `EN/ES runtime + ${bilingualSummary}`,
      seo: `${seoResult.origin} (${seoResult.files} canonical sources checked)`,
      communications: `${communicationsResult.threads} threads / ${communicationsResult.templates} templates / ${communicationsResult.localDrafts} local drafts`,
      documentLibrary: `${documentLibraryResult.reusableDocuments} reusable document / ${documentLibraryResult.sectionLimit} section safety cap`,
      canonicalImages: secResult.assetCount,
    },
    null,
    2,
  ),
);
