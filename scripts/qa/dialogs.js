// confirm() and prompt() must reach the components that show them: AppModals reads ui.modal and ui.inputDialog,
// and App.vue wires resolveConfirm / resolveInput. A refactor once renamed the state and left every await store.confirm() hanging.
"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const windowScope = {
  navigator: { language: "en-US" }, setTimeout, dispatchEvent: () => {}, CustomEvent: function () {},
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }, sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
};
new Function("window", read("../lib/web-common/browser.js"))(windowScope);
new Function("window", read("../lib/procurement-common/browser.js"))(windowScope);
new Function("window", read("app/store/domainActions.js"))(windowScope);

(async () => {
  const ui = { modal: null, inputDialog: null, locked: false };
  const helpers = { id: (p) => p + "-1", clean: (v) => String(v || ""), positive: Number, allowedMarketplaceModes: () => [], applyCurrentOperationalScope: (r) => r };
  const actions = windowScope.BuyniverseDomainActions.createDomainActions({ users: [], suppliers: [] }, ui, helpers);

  // confirm: shown through ui.modal, settled by resolveConfirm
  const yes = actions.confirm({ title: "Go?", confirmText: "Go" });
  assert.ok(ui.modal && ui.modal.title === "Go?" && ui.modal.confirmText === "Go", "confirm() opens the dialog in ui.modal, where AppModals reads it");
  actions.resolveConfirm(true);
  assert.strictEqual(await yes, true, "accepting resolves true");
  assert.strictEqual(ui.modal, null, "the dialog closes");
  const no = actions.confirm({ title: "Stop?" });
  actions.resolveConfirm(false);
  assert.strictEqual(await no, false, "declining resolves false");
  const first = actions.confirm({ title: "First" }); const second = actions.confirm({ title: "Second" });
  assert.strictEqual(await first, false, "a second dialog declines the first instead of leaving it hanging");
  actions.resolveConfirm(true); assert.strictEqual(await second, true);

  // prompt: shown through ui.inputDialog, settled by resolveInput
  const ask = actions.prompt({ title: "Why?", message: "Reason", confirmText: "Save" });
  assert.ok(ui.inputDialog && ui.inputDialog.title === "Why?", "prompt() opens the dialog in ui.inputDialog");
  actions.resolveInput("because");
  assert.strictEqual(await ask, "because", "submitting resolves with the text");
  assert.strictEqual(ui.inputDialog, null, "the prompt closes");
  const cancelled = actions.prompt({ title: "Why?" });
  actions.resolveInput(null);
  assert.strictEqual(await cancelled, null, "closing the prompt resolves null");

  // locking the session never leaves a caller waiting
  const pending = actions.confirm({ title: "Pending" }); const pendingText = actions.prompt({ title: "Pending text" });
  actions.lockSession("test");
  assert.strictEqual(await pending, false, "a locked session declines an open confirm");
  assert.strictEqual(await pendingText, null, "a locked session cancels an open prompt");

  // the components that show and settle them
  const modals = read("app/components/layout/AppModals.vue"), app = read("app/App.vue");
  assert.ok(modals.includes("ui.modal") && modals.includes("ui.inputDialog") && modals.includes("resolve-input") && modals.includes("TextInputDialog"), "AppModals shows both dialogs");
  assert.ok(app.includes('@resolve-confirm="store.resolveConfirm"') && app.includes('@resolve-input="store.resolveInput"'), "App.vue settles both dialogs");
  assert.ok(!/confirmDialog/.test(read("app/store/domainActions.js")), "no code writes a dialog that nothing reads");

  console.log("[PASS] confirm() and prompt() reach their dialogs and always settle");
})().catch((error) => { console.error(error); process.exit(1); });
