// Support retrieval: realistic questions must reach the right guide, and the
// PHP port in support_service.php must rank exactly like the browser engine,
// because the AI assistant is grounded on what the server retrieves.
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const engine = require("../../app/lib/support-engine.js");

const ROOT = path.resolve(__dirname, "../..");
const kb = JSON.parse(fs.readFileSync(path.join(ROOT, "app/data/support/kb.json"), "utf8"));
const failures = [];

const expectations = [
  ["no puedo iniciar sesión con google", "access-sign-in"],
  ["¿qué necesito para vender si soy de Colombia?", "suppliers-requirements"],
  ["mi certificado dice que es e.firma", "invoicing-csd"],
  ["cómo cancelo una factura que salió mal", "invoicing-cancel"],
  ["mi código postal no coincide con el estado", "suppliers-postal"],
  ["cuánto cobra buyniverse", "payments-fee"],
  ["cómo invito a mi equipo", "access-team"],
  ["how do I upload the 32-D document", "suppliers-documents"],
  ["quiero hacer una subasta inversa", "buying-auction"],
  ["el rfc me marca dígito verificador", "suppliers-taxid"],
  ["el pago en custodia cuándo se libera", "payments-escrow"],
  ["quiero sustituir un cfdi", "invoicing-cancel"],
];

// Knowledge base integrity: every article belongs to an area, is bilingual
// and links only to real application routes.
const areas = new Set(kb.areas.map((area) => area.id));
const ids = new Set();
for (const article of kb.articles) {
  if (ids.has(article.id)) failures.push(`duplicate article ${article.id}`);
  ids.add(article.id);
  if (!areas.has(article.area)) failures.push(`${article.id}: unknown area ${article.area}`);
  for (const field of ["title", "summary"]) if (!article[field] || !article[field].es || !article[field].en) failures.push(`${article.id}: ${field} is not bilingual`);
  if (!article.steps || !article.steps.es || !article.steps.en || article.steps.es.length !== article.steps.en.length) failures.push(`${article.id}: steps are not bilingual`);
}
const router = fs.readFileSync(path.join(ROOT, "app/router.js"), "utf8");
for (const article of kb.articles) for (const link of article.links || []) {
  const route = link.to.split("?")[0];
  if (route !== "/" && !router.includes(`r("${route}"`)) failures.push(`${article.id}: link to unknown route ${link.to}`);
}

for (const [question, expected] of expectations) {
  const top = engine.search(kb, question)[0];
  if (!top || top.article.id !== expected) failures.push(`js "${question}": expected ${expected}, got ${top && top.article.id}`);
}

let php = "skipped (no PHP CLI)";
const runner = path.join(os.tmpdir(), `bnv-support-${process.pid}.php`);
fs.writeFileSync(runner, `<?php
function tenant_text($v, int $l): string { return is_string($v) ? mb_substr(trim($v), 0, $l) : ''; }
require ${JSON.stringify(path.join(ROOT, "support_service.php"))};
$questions = json_decode($argv[1], true); $out = [];
foreach ($questions as $q) $out[] = array_map(fn($h) => [$h['article']['id'], round($h['score'], 3)], support_search(support_kb(), $q));
echo json_encode($out);`);
try {
  const questions = expectations.map(([question]) => question);
  const out = execFileSync("php", ["-d", "display_startup_errors=0", runner, JSON.stringify(questions)], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const results = JSON.parse(out.trim().split(/\r?\n/).pop());
  questions.forEach((question, index) => {
    const js = engine.search(kb, question).map((hit) => [hit.article.id, Math.round(hit.score * 1000) / 1000]);
    if (JSON.stringify(js) !== JSON.stringify(results[index])) failures.push(`php parity "${question}": js ${JSON.stringify(js)} php ${JSON.stringify(results[index])}`);
  });
  php = "verified";
} catch (error) {
  if (error.code !== "ENOENT") failures.push(`php runner: ${String(error.stderr || error.message).split("\n")[0]}`);
} finally { fs.rmSync(runner, { force: true }); }

if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log(JSON.stringify({ supportEngine: "ok", articles: kb.articles.length, questions: expectations.length, php }, null, 2));
