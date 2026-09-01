const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const required = [
  "backend/README.md",
  "backend/legacy-source-review.md",
  "backend/v-service/README.md",
  "backend/v-service/service.v",
  "backend/v-service/v.mod",
];

for (const relative of required) {
  if (!fs.existsSync(path.join(root, relative))) throw new Error(`Missing backend source: ${relative}`);
}

const service = read("backend/v-service/service.v");
for (const forbidden of ["document-domain=()", "/api/v1/jobs", "/api/v1/benchmarks", "mysql:", "shell_exec("]) {
  if (service.includes(forbidden)) throw new Error(`Unsafe legacy surface retained in V sidecar: ${forbidden}`);
}
for (const requiredMarker of ["127.0.0.1", "'/healthz'", "'verify'", "method_not_allowed"]) {
  if (!service.includes(requiredMarker)) throw new Error(`V sidecar control missing: ${requiredMarker}`);
}
for (const artifact of ["backend/v-service/buyniverse.exe", "backend/v-service/buyniverse.c", "backend/v-service/index.php"]) {
  if (fs.existsSync(path.join(root, artifact))) throw new Error(`Generated or unsafe legacy artifact was imported: ${artifact}`);
}

const build = read("scripts/build_dist.js");
if (build.includes('processDirectory(path.join(rootDir, "backend"))'))
  throw new Error("Backend sources must never be published in dist");

const htaccess = read(".htaccess");
if (!htaccess.includes("\\.(?:env|ini|sql|c|v|zip"))
  throw new Error("Webroot must deny backend source extensions");

console.log("[PASS] backend source import is documented, internal-only and excluded from dist");
