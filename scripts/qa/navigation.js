// Buyniverse's menu: runs app/lib/menu.js (the synced copy of the shared lib) and
// app/navigation.js, and checks the didactic numbering and who sees what.
"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const sandbox = { window: {}, console };
sandbox.window = sandbox;
// lib/menu.js exports itself through module when it can; load both files in one scope.
const context = { window: {}, module: { exports: {} } };
context.window = context;
new Function("window", "module", fs.readFileSync(path.join(root, "app/lib/menu.js"), "utf8"))(context, context.module);
new Function("window", fs.readFileSync(path.join(root, "app/navigation.js"), "utf8"))(context);
const nav = context.BuyniverseNavigation;
assert.ok(nav && typeof nav.sidebar === "function", "navigation registers itself");

const yes = () => true, no = () => false;
const buyer = nav.sidebar({ mode: "buyer", can: no });
// The mode's groups keep their order and get stable numbers 1..4; the company and platform groups follow.
assert.deepStrictEqual(buyer.map((g) => g.n), ["1", "2", "3", "4"], "without company or platform rights those groups are not shown");
assert.strictEqual(buyer[1].items[1].n, "2.2", "numbers are assigned in the order of the full menu");
assert.ok(!buyer.some((g) => g.key === "company" || g.key === "platform"), "no company or platform group without rights");

// company setup appears for whoever may administer the company
const admin = nav.sidebar({ mode: "buyer", can: (p) => p === "manageCompany" });
const company = admin.find((g) => g.key === "company");
assert.ok(company && company.n === "5" && company.items[0].to === "/setup", "company setup is group 5 for company administrators");
assert.ok(!admin.some((g) => g.key === "platform"), "platform stays hidden for company administrators");

// platform administration is for operators only, and it has its four numbered tabs
const operator = nav.sidebar({ mode: "supplier", can: (p) => p === "platform.operator" });
const platform = operator.find((g) => g.key === "platform");
assert.ok(platform && platform.n === "6" && platform.items[0].to === "/plataforma" && platform.items[0].n === "6.1", "platform is group 6, screen 6.1");
assert.ok(!operator.some((g) => g.key === "company"), "an operator who is not a company administrator sees no company setup");
const everything = nav.sidebar({ mode: "admin", can: yes });
assert.strictEqual(everything.length, 5, "admin mode: three product groups plus company and platform");

// breadcrumbs name the group, the screen and the tab in the same numbers
const trail = nav.crumbs("/plataforma", "auditoria", "supplier", yes);
assert.deepStrictEqual(trail.map((c) => c.n), ["6", "6.1", "6.1.5"]);
assert.strictEqual(nav.tabs("/plataforma").map((t) => t.key).join(","), "empresas,accesos,timbres,cobranza,auditoria");
assert.strictEqual(nav.tabs("/plataforma")[1].n, "6.1.2");
assert.strictEqual(nav.tabs("/plataforma")[4].n, "6.1.5");

// every mode's links are unique and point somewhere
for (const mode of nav.modes.concat(["unknown"])) {
  const links = nav.sidebar({ mode, can: yes }).flatMap((g) => g.items.map((i) => i.to));
  assert.strictEqual(new Set(links).size, links.length, `no duplicated link in ${mode}`);
  assert.ok(links.every((to) => to.startsWith("/")), `every link is a route in ${mode}`);
}

console.log("[PASS] Buyniverse navigation: numbering, company setup and platform visibility, tabs and breadcrumbs");
