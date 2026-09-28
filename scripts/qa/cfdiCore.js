// CFDI core: runs scripts/qa/cfdi_core_test.php (XSD validation, SAT
// catalogue rules, CSD inspection). The live SW stamp is opt-in:
//   BUYNIVERSE_SW_TEST_ENV_FILE=/path/to/.env php scripts/qa/cfdi_core_test.php --live
"use strict";

const path = require("path");
const { execFileSync } = require("child_process");

let status = "skipped (no PHP CLI)";
try {
  const out = execFileSync("php", ["-d", "display_startup_errors=0", path.join(__dirname, "cfdi_core_test.php")], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const result = JSON.parse(out.trim().split(/\r?\n/).pop());
  if (result.failures.length) { console.error(result.failures.join("\n")); process.exit(1); }
  status = "verified";
} catch (error) {
  if (error.code !== "ENOENT") {
    const out = String(error.stdout || "").trim().split(/\r?\n/).pop();
    console.error(out || error.message);
    process.exit(1);
  }
}
console.log(JSON.stringify({ cfdiCore: status }, null, 2));
