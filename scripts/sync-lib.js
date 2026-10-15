// Copies the shared modules from the lib workspace into this product.
//   node scripts/sync-lib.js           copy the modules that changed
//   node scripts/sync-lib.js --check   exit 1 if a copy is missing or out of date (used by QA)
// The lib workspace is the source of truth. When it is not present on this
// machine (CI, a fresh clone) the check is skipped, never faked.
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const LIB = process.env.BUYNIVERSE_LIB || path.resolve(ROOT, "..", "lib");
const MODULES = [
  { from: "js/menu/menu.js", to: "app/lib/menu.js" },
];
const check = process.argv.includes("--check");

if (!fs.existsSync(LIB)) {
  console.log(`[sync-lib] lib workspace not found at ${LIB}; ${check ? "check skipped" : "nothing copied"}`);
  process.exit(0);
}
let stale = 0;
for (const module of MODULES) {
  const source = fs.readFileSync(path.join(LIB, module.from), "utf8");
  const header = `/* Synced from lib/${module.from} by scripts/sync-lib.js. Do not edit here: change the lib workspace and sync. */\n`;
  const wanted = header + source;
  const target = path.join(ROOT, module.to);
  const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : null;
  if (current === wanted) continue;
  stale += 1;
  if (check) console.error(`[sync-lib] out of date: ${module.to} (run node scripts/sync-lib.js)`);
  else { fs.writeFileSync(target, wanted); console.log(`[sync-lib] copied ${module.from} -> ${module.to}`); }
}
if (check && stale) process.exit(1);
console.log(check ? "[PASS] shared lib copies are up to date" : `[sync-lib] ${stale ? "done" : "already up to date"}`);
