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
// The mode's groups keep their order and get stable numbers 1..3; Marketing is group 4 and Administración group 5.
assert.deepStrictEqual(buyer.map((g) => g.n), ["1", "2", "3"], "without administration or operator rights those groups are not shown");
assert.strictEqual(buyer[1].items[1].n, "2.2", "numbers are assigned in the order of the full menu");
assert.ok(!buyer.some((g) => g.key === "admin"), "no administration group without rights");

// company setup appears in Administración for whoever may administer the company
const admin = nav.sidebar({ mode: "buyer", can: (p) => p === "manageCompany" });
const adminGroup = admin.find((g) => g.key === "admin");
assert.ok(adminGroup && adminGroup.n === "5" && adminGroup.items[0].to === "/setup" && adminGroup.items[0].n === "5.1", "company setup is screen 5.1 for company administrators");
assert.ok(!adminGroup.items.some((i) => i.to === "/plataforma"), "platform stays hidden for company administrators");

// platform administration is for operators only, it sits in Administración and has its five numbered tabs
const operator = nav.sidebar({ mode: "supplier", can: (p) => p === "platform.operator" });
const opsAdmin = operator.find((g) => g.key === "admin");
assert.ok(opsAdmin && opsAdmin.n === "6" && opsAdmin.items.length === 1 && opsAdmin.items[0].to === "/plataforma" && opsAdmin.items[0].n === "6.2", "platform is screen 6.2 inside Administración");
assert.ok(!operator.some((g) => g.items.some((i) => i.to === "/setup")), "an operator who is not a company administrator sees no company setup");
const everything = nav.sidebar({ mode: "admin", can: yes });
assert.deepStrictEqual(everything.map((g) => g.title), ["Analysis", "Marketing", "Administration"], "admin mode: Análisis, Marketing and Administración, company and platform inside the last");

// Marketing is Buyniverse's own concept: operators only, with the campaigns and the public calculator
const marketingOps = operator.find((g) => g.key === "marketing");
assert.ok(marketingOps && marketingOps.n === "5", "marketing is group 5 for a supplier-mode operator");
assert.deepStrictEqual(marketingOps.items.map((i) => i.to), ["/marketing", "/ahorro"], "marketing lists the campaigns and the savings calculator");
assert.deepStrictEqual(marketingOps.items.map((i) => i.n), ["5.1", "5.2"], "marketing screens are numbered 5.1 and 5.2");
assert.ok(!nav.sidebar({ mode: "supplier", can: no }).some((g) => g.key === "marketing"), "marketing is hidden from everyone who is not an operator");

// breadcrumbs name the group, the screen and the tab in the same numbers
const trail = nav.crumbs("/plataforma", "auditoria", "supplier", yes);
assert.deepStrictEqual(trail.map((c) => c.n), ["6", "6.2", "6.2.5"]);
assert.strictEqual(nav.tabs("/plataforma").map((t) => t.key).join(","), "empresas,accesos,timbres,cobranza,auditoria");
assert.strictEqual(nav.tabs("/plataforma")[1].n, "6.2.2");
assert.strictEqual(nav.tabs("/plataforma")[4].n, "6.2.5");

// every mode's links are unique and point somewhere
for (const mode of nav.modes.concat(["unknown"])) {
  const links = nav.sidebar({ mode, can: yes }).flatMap((g) => g.items.map((i) => i.to));
  assert.strictEqual(new Set(links).size, links.length, `no duplicated link in ${mode}`);
  assert.ok(links.every((to) => to.startsWith("/")), `every link is a route in ${mode}`);
}

console.log("[PASS] Buyniverse navigation: numbering, company setup and platform visibility, tabs and breadcrumbs");
