(function (global) {
  "use strict";

  // Buyniverse's menu. The model (numbering, permission filter, crumbs) comes
  // from lib/menu.js, shared with BestTorni; this file only says what is in the
  // menu and which permission each screen needs. Permissions are decided by the
  // caller (App.vue) from server answers: a missing permission hides the screen.
  //
  // Group titles follow BestTorni's vocabulary where the content matches it:
  // "Operations", "Sales & clients", "Analysis", "Administration" (Spanish in app/i18n). Marketing does
  // not apply (Buyniverse has no marketing screens), and "Market", "Money" and
  // "Find" are marketplace concepts, so they keep their own names.

  var Model = global.BuyniverseMenu;
  if (!Model) throw new Error("lib/menu.js must load before app/navigation.js");

  function screen(to, icon, label, extra) {
    return Object.assign({ key: to, to: to, icon: "fa-solid " + icon, label: label }, extra || {});
  }

  var MODES = {
    buyer: [
      { key: "ops", title: "Operations", screens: [screen("/dashboard", "fa-bolt", "My needs", { match: ["/procurement", "/necesito"] }), screen("/projects", "fa-folder", "Projects"), screen("/messages", "fa-comments", "Messages")] },
      { key: "market", title: "Market", screens: [screen("/suppliers", "fa-building-circle-check", "Suppliers"), screen("/products", "fa-boxes-stacked", "Products"), screen("/find-talent", "fa-users", "Talent & services", { match: ["/browse-services"] })] },
      { key: "money", title: "Money", screens: [screen("/invoices", "fa-file-invoice-dollar", "Invoices"), screen("/payments", "fa-credit-card", "Payments"), screen("/expenses", "fa-money-bill-wave", "Expenses")] },
    ],
    admin: [
      { key: "analysis", title: "Analysis", screens: [screen("/dashboard", "fa-gauge", "Dashboard"), screen("/procurement/cockpit", "fa-binoculars", "Procurement oversight"), screen("/projects", "fa-folder-tree", "Project oversight"), screen("/invoices", "fa-receipt", "Invoice oversight")] },
      { key: "admin", title: "Administration", screens: [screen("/settings/organizations", "fa-building-shield", "Companies & access"), screen("/admin/issuers", "fa-file-invoice-dollar", "Fiscal issuers"), screen("/procurement/governance", "fa-scale-balanced", "Policies & audit")] },
    ],
    supplier: [
      { key: "analysis", title: "Analysis", screens: [screen("/dashboard", "fa-gauge", "Dashboard")] },
      { key: "ops", title: "Operations", screens: [screen("/projects", "fa-folder", "Projects"), screen("/procurement/auction", "fa-gavel", "Live Offers")] },
      { key: "sales", title: "Sales & clients", screens: [screen("/leads", "fa-bullseye", "Leads"), screen("/clients", "fa-user-tie", "Clients"), screen("/estimates", "fa-file-invoice", "Estimates"), screen("/invoices", "fa-file-invoice-dollar", "Invoices"), screen("/payments", "fa-credit-card", "Payments")] },
      { key: "find", title: "Find", screens: [screen("/find-work", "fa-briefcase", "Find Work"), screen("/saved-jobs", "fa-bookmark", "Saved Jobs")] },
    ],
  };

  // Shared by every mode and always under "Administración": the company's own setup, and the platform for operators.
  var ADMIN_TAIL = [
    screen("/setup", "fa-list-check", "Company setup", { need: "manageCompany" }),
    screen("/plataforma", "fa-cube", "Platform administration", {
      need: "platform.operator",
      tabs: [["empresas", "Companies"], ["accesos", "Demo access"], ["timbres", "Stamps"], ["cobranza", "Billing"], ["auditoria", "Audit"]],
    }),
  ];

  /** The groups of one mode, with the shared tail added to its "admin" group (created last if the mode has none). */
  function spec(mode) {
    var groups = (MODES[mode] || MODES.supplier).map(function (g) { return { key: g.key, title: g.title, screens: g.screens.slice() }; });
    var admin = groups.find(function (g) { return g.key === "admin"; });
    if (!admin) { admin = { key: "admin", title: "Administration", screens: [] }; groups.push(admin); }
    admin.screens = admin.screens.concat(ADMIN_TAIL);
    return groups;
  }

  /** Sections in the shape AppSidebar draws: { n, title, items: [{ to, icon, label, match, n }] }. */
  function sidebar(options) {
    var menu = Model.createMenu({ groups: spec(options.mode), can: options.can, label: function (text) { return text; } });
    return menu.visible().map(function (group) {
      return {
        key: group.key, n: group.n, title: group.title,
        items: group.screens.map(function (s) { return { to: s.to, icon: s.icon, label: s.label, match: s.match, n: s.n }; }),
      };
    });
  }

  /** Breadcrumb trail for the current route, numbered like the menu. */
  function crumbs(path, tab, mode, can) {
    return Model.createMenu({ groups: spec(mode), can: can, label: function (text) { return text; } }).crumbs(path, tab);
  }

  /** The numbered tabs of one screen (for the page's own tab bar), e.g. tabs("/plataforma"). */
  function tabs(route) {
    var hit = Model.createMenu({ groups: spec("supplier"), can: function () { return true; } }).screenFor(route);
    return hit ? hit.screen.tabs.map(function (tab) { return { key: tab.key, n: tab.n, label: tab.label }; }) : [];
  }

  global.BuyniverseNavigation = { sidebar: sidebar, crumbs: crumbs, tabs: tabs, modes: Object.keys(MODES) };
})(typeof window !== "undefined" ? window : globalThis);
