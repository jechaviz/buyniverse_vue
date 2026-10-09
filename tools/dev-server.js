// Minimal static dev server with SPA fallback, for machines without Python.
//   bun tools/dev-server.js [port] [--allow-save] [--production] [--providers=google,microsoft]
// --allow-save enables POST /__save {path, b64}, used only by the asset
// renderers under tools/ to write generated files into the repository. It is
// off by default and refuses any path outside assets/.
// --production answers the runtime policy as production (no demo), and
// --providers=... simulates configured sign-in providers, so the public
// access states can be exercised without the PHP backend.
const path = require("path");
const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const port = Number(args.find((a) => /^\d+$/.test(a)) || 4178);
const allowSave = args.includes("--allow-save");
const production = args.includes("--production");
const providers = ((args.find((a) => a.startsWith("--providers=")) || "").split("=")[1] || "").split(",").filter(Boolean);
const providerNames = { google: "Google", microsoft: "Microsoft", linkedin: "LinkedIn", facebook: "Facebook" };

const types = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml",
  ".vue": "text/plain; charset=utf-8", ".mp4": "video/mp4", ".webm": "video/webm", ".xml": "application/xml", ".txt": "text/plain",
};

Bun.serve({
  port,
  maxRequestBodySize: 64 * 1024 * 1024,
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === "POST" && url.pathname === "/__save") {
      if (!allowSave) return new Response("saving disabled", { status: 403 });
      const { path: rel, b64 } = await req.json();
      const target = path.resolve(root, String(rel || ""));
      if (!target.startsWith(path.join(root, "assets") + path.sep)) return new Response("path outside assets/", { status: 400 });
      const bytes = Buffer.from(String(b64 || ""), "base64");
      await Bun.write(target, bytes);
      return Response.json({ ok: true, bytes: bytes.length });
    }
    // Like the real server: /demo/ is the same app with no API at all.
    if (url.pathname === "/demo") return new Response(null, { status: 301, headers: { location: "/demo/" } });
    const inDemo = url.pathname.startsWith("/demo/");
    const pathname = inDemo ? url.pathname.slice(5) : url.pathname;
    if (inDemo && (pathname === "/api" || pathname.startsWith("/api/"))) return new Response("The demo has no server", { status: 404 });
    if (production && url.pathname === "/api/v1/runtime") return Response.json({ mode: "production", serverAuth: true, demoAvailable: true });
    if (production && url.pathname === "/api/v1/auth/providers") return Response.json({ providers: providers.filter((id) => providerNames[id]).map((id) => ({ id, name: providerNames[id], audience: "individual" })) });
    if (production && url.pathname === "/api/v1/workspace-state") return Response.json({ authenticated: false, state: null, version: 0, csrf: "0".repeat(64), mode: "production", context: null });
    // No PHP here: the API is absent, exactly like a static host. The app
    // then falls back to its demo runtime instead of parsing HTML as JSON.
    if (pathname === "/api" || pathname.startsWith("/api/")) return Response.json({ error: "No backend in the dev server" }, { status: 404 });
    let p = decodeURIComponent(pathname);
    if (p.endsWith("/")) p += "index.html";
    const file = Bun.file(path.join(root, p));
    if (!(await file.exists())) {
      if (!path.extname(p)) return new Response(Bun.file(path.join(root, "index.html")), { headers: { "content-type": types[".html"] } });
      return new Response("not found", { status: 404 });
    }
    return new Response(file, { headers: { "content-type": types[path.extname(p)] || "application/octet-stream" } });
  },
});
console.log(`buyniverse dev server on http://127.0.0.1:${port}${allowSave ? " (asset saving enabled)" : ""}`);
