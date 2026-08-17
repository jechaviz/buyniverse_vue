const fs = require("fs");
const path = require("path");

function runSecurityAudit(root, read, vueFiles) {
  const index = read("index.html");
  for (const dep of ["vue.global.prod.js", "vue-router.global.prod.js", "vue3-sfc-loader", "unocss"]) {
    if (!index.toLowerCase().includes(dep)) throw new Error(`Missing CDN dependency: ${dep}`);
  }
  if (!index.includes("../lib/procurement-common/browser.js")) throw new Error("Missing shared procurement browser library");
  if (/node_modules|\/dist\/assets\//i.test(index)) throw new Error("Production HTML depends on a Node build artifact");
  if (!index.includes("Content-Security-Policy") || !index.includes('integrity="sha384-')) throw new Error("CSP or subresource integrity is missing");
  if (/vue@3\/|vue-router@4\/|npm\/@unocss\/runtime["']|npm\/vue3-sfc-loader\/dist/.test(index)) throw new Error("A security-sensitive CDN dependency is not pinned");

  const server = read("serve.py");
  if (!server.includes("X-Content-Type-Options") || !server.includes("frame-ancestors") || !server.includes("def _allowed") || !server.includes("def list_directory") || !server.includes("do_TRACE") || !server.includes("X-Permitted-Cross-Domain-Policies"))
    throw new Error("Secure static server headers, methods or path allowlist are incomplete");
  if (server.includes('raw_path.startswith("/buyniverse_vue/"):\n            return True')) throw new Error("Static server exposes the full project directory");

  const unsafeSink = /v-html|\.innerHTML\s*=|\.outerHTML\s*=|document\.write\s*\(|javascript:/i;
  for (const file of [...vueFiles, "app/main.js"]) {
    if (unsafeSink.test(read(file))) throw new Error(`Unsafe DOM sink in ${file}`);
  }

  const uploadFiles = vueFiles.filter((file) => /type=["']file["']/.test(read(file)));
  for (const file of uploadFiles) {
    if (!/type=["']file["'][^>]*accept=/.test(read(file))) throw new Error(`File input lacks an allowlist in ${file}`);
  }

  const visualManifest = JSON.parse(read("assets/procurement/manifest.json"));
  const visualFiles = visualManifest.assets.map((asset) => asset.file);
  if (new Set(visualFiles).size !== visualFiles.length) throw new Error("Duplicate canonical procurement assets");
  for (const file of visualFiles) {
    if (!fs.existsSync(path.join(root, "assets", "procurement", file))) throw new Error(`Missing procurement asset: ${file}`);
  }

  const procurementScope = {};
  new Function("window", fs.readFileSync(path.resolve(root, "../lib/procurement-common/browser.js"), "utf8"))(procurementScope);
  if (!procurementScope.ProcurementCommon || typeof procurementScope.ProcurementCommon.rankQuotes !== "function")
    throw new Error("Missing shared ProcurementCommon browser API");

  const csvProbe = procurementScope.ProcurementCommon.csv([{ value: '=HYPERLINK("https://example.invalid")' }]);
  if (!csvProbe.includes("\t=HYPERLINK")) throw new Error("CSV formula injection protection failed");

  const storageValues = {};
  const webScope = {
    localStorage: {
      getItem: (key) => storageValues[key] || null,
      setItem: (key, value) => { storageValues[key] = value; },
      removeItem: (key) => { delete storageValues[key]; },
    },
  };
  new Function("window", fs.readFileSync(path.resolve(root, "../lib/web-common/browser.js"), "utf8"))(webScope);
  const secureStorage = webScope.WebCommon.createVersionedStorage("qa", 1);
  secureStorage.write({ safe: "kept", password: "remove-me", nested: { apiKey: "remove-me-too", myAccessToken: "remove-me-three" } });
  if (/remove-me|password|apiKey|myAccessToken/.test(storageValues.qa) || secureStorage.read().value.safe !== "kept")
    throw new Error("Sensitive storage redaction failed");
  if (webScope.WebCommon.sanitizeText("safe\u202Etxt", 40) !== "safetxt") throw new Error("Bidi control sanitization failed");

  storageValues.poisoned = '{"version":1,"data":{"safe":true,"__proto__":{"polluted":true}}}';
  const poisoned = webScope.WebCommon.createVersionedStorage("poisoned", 1).read().value;
  if (!poisoned.safe || Object.prototype.polluted) throw new Error("Prototype pollution storage guard failed");

  const draftValues = {};
  webScope.sessionStorage = {
    getItem: (key) => draftValues[key] || null,
    setItem: (key, value) => { draftValues[key] = value; },
    removeItem: (key) => { delete draftValues[key]; },
  };
  new Function("window", fs.readFileSync(path.resolve(root, "../lib/web-common/browser.js"), "utf8"))(webScope);
  const secureDraft = webScope.WebCommon.createSessionDraft("draft-qa", { ttlMs: 60000 });
  secureDraft.write({ title: "kept", apiKey: "remove-me" });
  if (draftValues["draft-qa"].includes("remove-me") || secureDraft.read().title !== "kept") throw new Error("Ephemeral draft redaction failed");

  const forms = vueFiles.flatMap((file) => [...read(file).matchAll(/<form\b[\s\S]*?<\/form>/g)].map((match) => ({ file, source: match[0] })));
  if (!forms.length || !forms.some((form) => /\brequired\b/.test(form.source))) throw new Error("No interactive required form coverage found");
  if (!fs.readFileSync(path.resolve(root, "../lib/web-common/browser.js"), "utf8").includes("installFormValidation"))
    throw new Error("Shared accessible form validation is missing");

  for (const form of forms) {
    if (!/<(?:input|select|textarea)\b/.test(form.source)) throw new Error(`Form without an interactive control: ${form.file}`);
    if (!/@submit(?:\.prevent)?=/.test(form.source)) throw new Error(`Form without an explicit submit flow: ${form.file}`);
  }

  const validationRuntime = fs.readFileSync(path.resolve(root, "../lib/web-common/browser.js"), "utf8");
  for (const token of ["aria-required", "aria-invalid", "aria-describedby", "role", "MutationObserver", "scrollIntoView"]) {
    if (!validationRuntime.includes(token)) throw new Error(`Accessible validation is missing ${token}`);
  }

  return { formCount: forms.length, assetCount: visualFiles.length };
}

module.exports = { runSecurityAudit };
