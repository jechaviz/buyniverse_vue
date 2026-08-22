function runSeoAudit(read) {
  const origin = "https://buyniverse.com";
  const files = ["index.html", "robots.txt", "sitemap.xml", "app/services/seo.js"];
  for (const file of files) {
    const source = read(file);
    if (source.includes("buyniverse.example.com"))
      throw new Error(`${file} still contains the placeholder public domain`);
  }

  const index = read("index.html");
  for (const token of [`<link rel="canonical" href="${origin}/"`, `property="og:url" content="${origin}/"`, `"url": "${origin}/"`]) {
    if (!index.includes(token)) throw new Error(`index.html is missing canonical production metadata: ${token}`);
  }

  const robots = read("robots.txt");
  if (!robots.includes(`Host: ${origin}`) || !robots.includes(`Sitemap: ${origin}/sitemap.xml`))
    throw new Error("robots.txt does not identify the production origin");

  const sitemap = read("sitemap.xml");
  if (!sitemap.includes(`<loc>${origin}/</loc>`) || !sitemap.includes(`${origin}/procurement`))
    throw new Error("sitemap.xml does not use the production origin");

  const seo = read("app/services/seo.js");
  if (!seo.includes(`PUBLIC_ORIGIN = "${origin}"`) || !seo.includes("const canonicalUrl = `${PUBLIC_ORIGIN}"))
    throw new Error("Dynamic SEO metadata is not bound to the canonical production origin");

  return { origin, files: files.length };
}

module.exports = { runSeoAudit };
