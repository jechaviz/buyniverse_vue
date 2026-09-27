// Builds the public supplier catalog the marketplace reads when the visitor has
// no workspace (production guests start from a deliberately empty, private
// workspace, so the finder would otherwise be empty).
//
//   node scripts/build_marketplace_catalog.js          write the file
//   node scripts/build_marketplace_catalog.js --check  fail if it is stale
//
// Only public listing fields leave the private supplier master: contact names,
// e-mails and spend never do. scripts/qa/marketplaceCascade.js asserts it.
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const target = path.join(root, "assets", "data", "marketplace-catalog.json");
const PUBLIC_FIELDS = ["id", "name", "status", "rating", "score", "risk", "esg", "onTime", "responseRate", "certifications", "marketplace"];

function build() {
  const scope = {};
  new Function("window", fs.readFileSync(path.join(root, "app/data/demo.js"), "utf8"))(scope);
  const suppliers = scope.BuyniverseDemo.seed.suppliers
    .filter((supplier) => supplier.marketplace && supplier.marketplace.listed !== false)
    .map((supplier) => Object.fromEntries(PUBLIC_FIELDS.filter((key) => key in supplier).map((key) => [key, supplier[key]])));
  // `sample` tells the finder to say so: these are example profiles until real
  // suppliers are onboarded and a server-side catalog replaces this file.
  return JSON.stringify({ sample: true, source: "app/data/demo.js", suppliers }, null, 1) + "\n";
}

const next = build();
if (process.argv.includes("--check")) {
  const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
  if (current.replace(/\r\n/g, "\n") !== next) {
    console.error("[FAIL] assets/data/marketplace-catalog.json is stale: run node scripts/build_marketplace_catalog.js");
    process.exit(1);
  }
  console.log("[PASS] public marketplace catalog is in sync with the supplier master");
} else {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, next);
  console.log(`wrote ${path.relative(root, target)} (${JSON.parse(next).suppliers.length} suppliers)`);
}

module.exports = { PUBLIC_FIELDS };
