const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");

console.log("=== BUILDING OPTIMIZED PRODUCTION DIST BUNDLE ===");
console.log(`Source Root: ${rootDir}`);
console.log(`Target Dist: ${distDir}`);

// 1. Clean & recreate dist/
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// 2. High-performance, robust JS Minifier (string-aware tokenizer)
function minifyJs(code) {
  let out = "";
  let i = 0;
  const len = code.length;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inTemplateString = false;
  let inLineComment = false;
  let inBlockComment = false;
  let inRegex = false;

  while (i < len) {
    const ch = code[i];
    const next = i + 1 < len ? code[i + 1] : "";
    const prev = i > 0 ? code[i - 1] : "";

    // Escape handling inside strings/regex
    if ((inSingleQuote || inDoubleQuote || inTemplateString || inRegex) && ch === "\\") {
      out += ch + next;
      i += 2;
      continue;
    }

    // Inside single quote string
    if (inSingleQuote) {
      out += ch;
      if (ch === "'") inSingleQuote = false;
      i++;
      continue;
    }

    // Inside double quote string
    if (inDoubleQuote) {
      out += ch;
      if (ch === '"') inDoubleQuote = false;
      i++;
      continue;
    }

    // Inside template string (backticks)
    if (inTemplateString) {
      out += ch;
      if (ch === "`") inTemplateString = false;
      i++;
      continue;
    }

    // Inside line comment
    if (inLineComment) {
      if (ch === "\n" || ch === "\r") {
        inLineComment = false;
        out += "\n";
      }
      i++;
      continue;
    }

    // Inside block comment
    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i += 2;
        continue;
      }
      i++;
      continue;
    }

    // Inside regex literal
    if (inRegex) {
      out += ch;
      if (ch === "/") inRegex = false;
      i++;
      continue;
    }

    // Start of line comment
    if (ch === "/" && next === "/") {
      inLineComment = true;
      i += 2;
      continue;
    }

    // Start of block comment
    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i += 2;
      continue;
    }

    // Start of strings
    if (ch === "'") {
      inSingleQuote = true;
      out += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inDoubleQuote = true;
      out += ch;
      i++;
      continue;
    }
    if (ch === "`") {
      inTemplateString = true;
      out += ch;
      i++;
      continue;
    }

    out += ch;
    i++;
  }

  // Second pass: collapse redundant whitespace outside string literals
  return out
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

// 3. Vue SFC Minifier
function minifyVue(content) {
  // Extract template, script, and style
  const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/);
  const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/);
  const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/);

  let result = "";

  if (templateMatch) {
    let tpl = templateMatch[1]
      // remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, "")
      // collapse multiple whitespace between tags
      .replace(/>\s+</g, "><")
      .trim();
    result += `<template>${tpl}</template>\n`;
  }

  if (scriptMatch) {
    let sc = minifyJs(scriptMatch[1].trim());
    result += `<script>\n${sc}\n</script>\n`;
  }

  if (styleMatch) {
    let st = styleMatch[1]
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\s*([{}:;,])\s*/g, "$1")
      .trim();
    result += `<style scoped>${st}</style>\n`;
  }

  return result.trim();
}

// 4. HTML Minifier
function minifyHtml(content) {
  return content
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/>\s+</g, "><")
    .trim();
}

// 5. CSS Minifier
function minifyCss(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s*([{}:;,])\s*/g, "$1")
    .replace(/\n+/g, " ")
    .trim();
}

// 6. JSON Minifier
function minifyJson(content) {
  try {
    return JSON.stringify(JSON.parse(content));
  } catch (e) {
    return content;
  }
}

// 7. Recursive directory processor
let fileCount = 0;
let rawBytes = 0;
let minBytes = 0;

function processDirectory(srcDir, destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") {
      continue;
    }

    if (entry.isDirectory()) {
      processDirectory(srcPath, destPath);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      const content = fs.readFileSync(srcPath, "utf8");
      const stat = fs.statSync(srcPath);
      rawBytes += stat.size;
      fileCount++;

      let minified = content;

      if (ext === ".vue") {
        minified = minifyVue(content);
      } else if (ext === ".js") {
        minified = minifyJs(content);
      } else if (ext === ".html") {
        minified = minifyHtml(content);
      } else if (ext === ".css") {
        minified = minifyCss(content);
      } else if (ext === ".json") {
        minified = minifyJson(content);
      } else {
        // Binary / SQL / C / V / SVG
        fs.copyFileSync(srcPath, destPath);
        minBytes += stat.size;
        continue;
      }

      fs.writeFileSync(destPath, minified, "utf8");
      minBytes += Buffer.byteLength(minified, "utf8");
    }
  }
}

// Process app, assets, and root files
console.log("Minifying and bundling frontend assets...");
processDirectory(path.join(rootDir, "app"), path.join(distDir, "app"));

if (fs.existsSync(path.join(rootDir, "assets"))) {
  processDirectory(path.join(rootDir, "assets"), path.join(distDir, "assets"));
}

// Copy & minify root index.html
if (fs.existsSync(path.join(rootDir, "index.html"))) {
  const htmlRaw = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");
  fs.writeFileSync(path.join(distDir, "index.html"), minifyHtml(htmlRaw), "utf8");
}

// Copy backend and configuration files to dist/
const backendFiles = [
  "index.php",
  "db_schema.sql",
  "db_seed.sql",
  "buyniverse.c",
  "buyniverse.v",
  ".htaccess",
  "manifest.json",
  "favicon.ico"
];

for (const file of backendFiles) {
  const filePath = path.join(rootDir, file);
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, path.join(distDir, file));
    console.log(`[DIST] Included backend file: ${file}`);
  }
}

// Check backend c file from v_projects if needed
const vCPath = "C:\\git\\v_projects\\domains\\web_platform\\websites\\buyniverse\\buyniverse.c";
const vVPath = "C:\\git\\v_projects\\domains\\web_platform\\websites\\buyniverse\\buyniverse.v";
if (fs.existsSync(vCPath) && !fs.existsSync(path.join(distDir, "buyniverse.c"))) {
  fs.copyFileSync(vCPath, path.join(distDir, "buyniverse.c"));
}
if (fs.existsSync(vVPath) && !fs.existsSync(path.join(distDir, "buyniverse.v"))) {
  fs.copyFileSync(vVPath, path.join(distDir, "buyniverse.v"));
}

const savedPct = (((rawBytes - minBytes) / (rawBytes || 1)) * 100).toFixed(1);
console.log("\n=== BUILD COMPLETE ===");
console.log(`Total Files Processed: ${fileCount}`);
console.log(`Original Size: ${(rawBytes / 1024).toFixed(1)} KB`);
console.log(`Minified Dist Size: ${(minBytes / 1024).toFixed(1)} KB`);
console.log(`Savings: ${savedPct}% compression ratio achieved`);
console.log(`Dist Directory Ready at: ${distDir}\n`);
