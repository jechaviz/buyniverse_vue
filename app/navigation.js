(function (global) {
  "use strict";

  // Buyniverse's menu. The model (numbering, permission filter, crumbs) comes
  // from lib/menu.js, shared with BestTorni; this file only says what is in the
  // menu and which permission each screen needs. Permissions are decided by the
  // caller (App.vue) from server answers: a missing permission hides the screen.

  var Model = global.BuyniverseMenu;
  if (!Model) throw new Error("lib/menu.js must load before app/navigation.js");

  function screen(to, icon, label, extra) {
    return Object.assign({ key: to, to: to, icon: "fa-solid " + icon, label: label }, extra || {});
  }

  // The links each marketplace mode has always shown, grouped as before.
  var MODES = {
    buyer: [
      { key: "needs", title: "Needs", screens: [screen("/dashboard", "fa-bolt", "My needs", { match: ["/procurement", "/necesito"] })] },
      { key: "market", title: "Market", screens: [screen("/suppliers", "fa-building-circle-check", "Suppliers"), screen("/products", "fa-boxes-stacked", "Products"), screen("/find-talent", "fa-users", "Talent & services", { match: ["/browse-services"] })] },
      { key: "work", title: "Work", screens: [screen("/projects", "fa-folder", "Projects"), screen("/messages", "fa-comments", "Messages")] },
      { key: "money", title: "Money", screens: [screen("/invoices", "fa-file-invoice-dollar", "Invoices"), screen("/payments", "fa-credit-card", "Payments"), screen("/expenses", "fa-money-bill-wave", "Expenses")] },
    ],
    admin: [
      { key: "home", title: "Home", screens: [screen("/dashboard", "fa-gauge", "Dashboard")] },
      { key: "control", title: "Identity & Control", screens: [screen("/settings/organizations", "fa-building-shield", "Companies & access"), screen("/admin/issuers", "fa-file-invoice-dollar", "Fiscal issuers"), screen("/procurement/governance", "fa-scale-balanced", "Policies & audit")] },
      { key: "oversight", title: "Oversight", screens: [screen("/procurement/cockpit", "fa-binoculars", "Procurement oversight"), screen("/projects", "fa-folder-tree", "Project oversight"), screen("/invoices", "fa-receipt", "Invoice oversight")] },
    ],
    supplier: [
      { key: "home", title: "Home", screens: [screen("/dashboard", "fa-gauge", "Dashboard")] },
      { key: "deliver", title: "Deliver", screens: [screen("/projects", "fa-folder", "Projects"), screen("/procurement/auction", "fa-gavel", "Live Offers")] },
      { key: "find", title: "Find", screens: [screen("/find-work", "fa-briefcase", "Find Work"), screen("/saved-jobs", "fa-bookmark", "Saved Jobs")] },
      { key: "sell", title: "Sell", screens: [screen("/leads", "fa-bullseye", "Leads"), screen("/clients", "fa-user-tie", "Clients"), screen("/estimates", "fa-file-invoice", "Estimates"), screen("/invoices", "fa-file-invoice-dollar", "Invoices"), screen("/payments", "fa-credit-card", "Payments")] },
    ],
  };

  // Shared by every mode: the company's own setup, and the platform for operators.
  var COMMON_TAIL = [
    { key: "company", title: "Company", screens: [screen("/setup", "fa-list-check", "Company setup", { need: "manageCompany" })] },
    { key: "platform", title: "Platform (SaaS)", screens: [screen("/plataforma", "fa-cube", "Platform administration", {
      need: "platform.operator",
      tabs: [["empresas", "Companies"], ["accesos", "Demo access"], ["timbres", "Stamps"], ["cobranza", "Billing"], ["auditoria", "Audit"]],
    })] },
  ];

  function spec(mode) { return (MODES[mode] || MODES.supplier).concat(COMMON_TAIL); }

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
