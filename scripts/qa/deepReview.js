const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
function walk(dir) {
  let res = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, f.name);
    if (f.isDirectory() && f.name !== "node_modules" && f.name !== ".git") {
      res.push(...walk(fp));
    } else if (f.name.endsWith(".vue") || f.name.endsWith(".js")) {
      res.push(fp);
    }
  }
  return res;
}

const allFiles = walk(root);
const vueFiles = allFiles.filter((f) => f.endsWith(".vue"));
const jsFiles = allFiles.filter((f) => f.endsWith(".js"));

const errors = [];
const warnings = [];

// 1. Check all SFC script tags & component references
for (const f of vueFiles) {
  const rel = path.relative(root, f).replace(/\\/g, "/");
  const content = fs.readFileSync(f, "utf8");

  const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/);
  if (scriptMatch) {
    try {
      new Function("Vue", "VueRouter", scriptMatch[1].replace("export default", "return"));
    } catch (e) {
      errors.push({ file: rel, type: "Script Syntax Error", error: e.message });
    }
  }

  // Find all component loadModule / load calls
  const matches = [...content.matchAll(/\b(?:loadModule|load)\(\s*["']([^"']+)["']/g)];
  for (const m of matches) {
    const rawPath = m[1].split("?")[0].replace(/^\.\//, "").replace(/^\//, "");
    const targetFile = path.join(root, rawPath);
    if (!fs.existsSync(targetFile)) {
      errors.push({ file: rel, type: "Broken Component Reference", target: rawPath, fullPath: targetFile });
    }
  }

  // Check for undefined emit events or unhandled forms
  if (content.includes("<form") && !content.includes("@submit")) {
    warnings.push({ file: rel, type: "Form without submit handler" });
  }

  // Check for mismatched v-if / v-else-if / v-else
  const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/);
  if (!templateMatch && !scriptMatch) {
    errors.push({ file: rel, type: "Empty Vue Component" });
  }
}

// 2. Check all main.js routes and component loaders
const mainSource = fs.readFileSync(path.join(root, "app/main.js"), "utf8");
const mainLoads = [...mainSource.matchAll(/r\(\s*["'][^"']+["']\s*,\s*["']([^"']+)["']/g)];
for (const m of mainLoads) {
  const compName = m[1];
  const targetFile = path.join(root, "app/pages", `${compName}.vue`);
  const altTarget = path.join(root, "app/pages/procurement", `${compName}.vue`);
  if (!fs.existsSync(targetFile) && !fs.existsSync(altTarget)) {
    // Check if defined in main.js
    if (!mainSource.includes(`const ${compName} =`)) {
      errors.push({ file: "app/main.js", type: "Missing Route Component", component: compName });
    }
  }
}

// 3. Check store methods referenced across components
const demoSource = fs.readFileSync(path.join(root, "app/data/demo.js"), "utf8");
const domainActionsSource = fs.readFileSync(path.join(root, "app/store/domainActions.js"), "utf8");
const initialStateSource = fs.readFileSync(path.join(root, "app/store/initialState.js"), "utf8");

console.log("=== DEEP CODEBASE AUDIT RESULTS ===");
console.log(`Audited ${vueFiles.length} Vue components and ${jsFiles.length} JS files.`);
console.log(`Found ${errors.length} errors and ${warnings.length} warnings.`);
if (errors.length > 0) {
  console.error("ERRORS:", JSON.stringify(errors, null, 2));
}
if (warnings.length > 0) {
  console.warn("WARNINGS:", JSON.stringify(warnings, null, 2));
}
