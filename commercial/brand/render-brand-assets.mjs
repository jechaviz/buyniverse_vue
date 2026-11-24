/**
 * Renders Buyniverse master brand PNGs (32, 64, 192, 512, 1024) and
 * Open Graph social banner (1200x630) via headless Chrome, then syncs
 * assets/brand/ with the unified v2.0 Convergent Orbit mark.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const BRAND_SRC = path.join(ROOT, "commercial", "brand", "assets");
const BRAND_DEST = path.join(ROOT, "assets", "brand");
const TMP_DIR = path.join(ROOT, "commercial", "brand", ".tmp-render");

const CHROME = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
].find((p) => fs.existsSync(p));

if (!CHROME) {
  console.error("No headless Chromium/Edge binary found.");
  process.exit(1);
}

fs.mkdirSync(TMP_DIR, { recursive: true });
fs.mkdirSync(BRAND_DEST, { recursive: true });

const tileSvg = fs.readFileSync(path.join(BRAND_SRC, "logo-a-orbit-tile.svg"), "utf8");
const orbitSvg = fs.readFileSync(path.join(BRAND_SRC, "logo-a-orbit.svg"), "utf8");

function screenshotHtml(html, width, height, outPath) {
  const htmlFile = path.join(TMP_DIR, `shot-${width}x${height}.html`);
  fs.writeFileSync(htmlFile, html, "utf8");
  const fileUrl = "file:///" + htmlFile.replace(/\\/g, "/");
  execFileSync(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--default-background-color=00000000",
      "--force-device-scale-factor=1",
      `--window-size=${width},${height}`,
      `--screenshot=${outPath}`,
      fileUrl
    ],
    { stdio: "pipe" }
  );
}

// 1. Render square PNG marks
for (const size of [32, 64, 192, 512, 1024]) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;width:${size}px;height:${size}px;overflow:hidden;background:transparent;}
    svg{display:block;width:${size}px;height:${size}px;}
  </style></head><body>${tileSvg}</body></html>`;
  const destBrand = path.join(BRAND_DEST, `buyniverse-mark-${size}.png`);
  const destComm = path.join(BRAND_SRC, `buyniverse-mark-${size}.png`);
  screenshotHtml(html, size, size, destBrand);
  fs.copyFileSync(destBrand, destComm);
  console.log(`Rendered buyniverse-mark-${size}.png`);
}

// 2. Render 1200x630 Open Graph card
const ogHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;width:1200px;height:630px;overflow:hidden;font-family:"Segoe UI",Inter,Arial,sans-serif;color:#eef2fb;
    background:radial-gradient(640px 420px at 88% 12%,rgba(63,106,242,.36),transparent 65%),
    radial-gradient(560px 380px at 12% 92%,rgba(54,227,192,.2),transparent 65%),#05070d;}
  .grid{position:absolute;inset:0;opacity:.22;background-image:linear-gradient(rgba(148,176,232,.14) 1px,transparent 1px),linear-gradient(90deg,rgba(148,176,232,.14) 1px,transparent 1px);background-size:48px 48px;}
  .wrap{position:relative;z-index:1;height:100%;padding:64px 76px;display:flex;flex-direction:column;justify-content:space-between;}
  .top{display:flex;align-items:center;justify-content:space-between;}
  .brand{display:flex;align-items:center;gap:18px;font-size:34px;font-weight:800;letter-spacing:-0.04em;color:#fff;}
  .brand svg{width:54px;height:54px;}
  .pill{padding:10px 20px;border-radius:999px;background:rgba(54,227,192,.12);border:1px solid rgba(54,227,192,.35);color:#36e3c0;font-family:Consolas,monospace;font-size:17px;font-weight:700;letter-spacing:.08em;}
  h1{margin:0;font-size:66px;line-height:1.05;letter-spacing:-0.045em;max-width:920px;color:#fff;font-weight:800;}
  h1 span{background:linear-gradient(90deg,#36e3c0,#5e85ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
  p{margin:20px 0 0;font-size:25px;color:#9ba7c2;max-width:860px;line-height:1.4;}
  .foot{display:flex;align-items:center;justify-content:space-between;padding-top:24px;border-top:1px solid rgba(255,255,255,.1);font-family:Consolas,monospace;font-size:18px;color:#8c9bb8;}
  .tags{display:flex;gap:14px;}
  .tags span{padding:8px 14px;border-radius:10px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:#dce5f7;font-size:16px;}
</style></head><body>
  <div class="grid"></div>
  <div class="wrap">
    <div class="top">
      <div class="brand">${orbitSvg}<span>Buyniverse</span></div>
      <div class="pill">B2B PROCUREMENT · MX / LATAM</div>
    </div>
    <div>
      <h1>Publica una vez y haz que las ofertas <span>compitan por ti.</span></h1>
      <p>RFQ sellado con base de mercado, subastas inversas en vivo, conciliación 3-Way Match y facturación CFDI 4.0 con evidencia en servidor.</p>
    </div>
    <div class="foot">
      <span>buyniverse.com</span>
      <div class="tags">
        <span>RFQ Sellado</span>
        <span>Subasta Inversa</span>
        <span>CFDI 4.0</span>
        <span>0% Proveedores</span>
      </div>
    </div>
  </div>
</body></html>`;

const ogDest = path.join(BRAND_DEST, "og-buyniverse.png");
const ogComm = path.join(BRAND_SRC, "og-buyniverse.png");
screenshotHtml(ogHtml, 1200, 630, ogDest);
fs.copyFileSync(ogDest, ogComm);
console.log("Rendered og-buyniverse.png (1200x630)");

// 3. Update 32x32 SVG marks in assets/brand/ (compatible with existing viewBox 0 0 32 32)
const ring32 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><linearGradient id="g" x1="7" y1="5" x2="26" y2="27" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#36e3c0"/><stop offset="1" stop-color="#3f6af2"/></linearGradient></defs><path d="M9.5 6v12.5a7.5 7.5 0 1 0 13.65-4.3" stroke="url(#g)" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="18.3" cy="11.1" r="2.4" fill="#fff"/></svg>\n`;
const tile32 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><defs><linearGradient id="g" x1="7" y1="5" x2="26" y2="27" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#36e3c0"/><stop offset="1" stop-color="#3f6af2"/></linearGradient></defs><rect width="32" height="32" rx="9" fill="#070a14"/><path d="M10.25 7v11.25a6.75 6.75 0 1 0 12.3-3.85" stroke="url(#g)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="18.2" cy="11.6" r="2.15" fill="#fff"/></svg>\n`;

fs.writeFileSync(path.join(BRAND_DEST, "buyniverse-ring.svg"), ring32, "utf8");
fs.writeFileSync(path.join(BRAND_DEST, "buyniverse-tile.svg"), tile32, "utf8");
fs.rmSync(TMP_DIR, { recursive: true, force: true });
console.log("Synced assets/brand/ SVGs + PNGs + OG image successfully.");
