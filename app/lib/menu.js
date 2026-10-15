/* Synced from lib/js/menu/menu.js by scripts/sync-lib.js. Do not edit here: change the lib workspace and sync. */
/* lib/js/menu v1: didactic navigation model.
 *
 * The menu is numbered the way BestTorni's back-office teaches it: group = n,
 * screen = n.m, tab = n.m.k. Numbers are assigned over the FULL menu, not the
 * permitted subset, so "2.3" names the same screen for every person.
 *
 * spec = {
 *   groups: [{ key, title, screens: [{ key, label, to, icon, need, match, tabs: [[key, label, need?]] }] }],
 *   can:    function (permission) -> boolean   (need: [a, b] is satisfied when any passes)
 *   label:  function (text) -> text            (localisation hook, optional)
 * }
 */
(function (root) {
  "use strict";

  function createMenu(spec) {
    var can = typeof spec.can === "function" ? spec.can : function () { return true; };
    var localize = typeof spec.label === "function" ? spec.label : function (text) { return text; };

    var all = (spec.groups || []).map(function (group, gi) {
      var n = String(gi + 1), per = 0;
      return {
        key: group.key, n: n, title: localize(group.title),
        screens: (group.screens || []).map(function (screen) {
          per += 1;
          var sn = n + "." + per;
          return {
            key: screen.key, n: sn, label: localize(screen.label), to: screen.to, icon: screen.icon,
            need: screen.need, match: screen.match || [],
            tabs: (screen.tabs || []).map(function (tab, ti) {
              return { key: tab[0], n: sn + "." + (ti + 1), label: localize(tab[1]), need: tab[2] || null };
            }),
          };
        }),
      };
    });

    function allowed(need) {
      if (!need) return true;
      return Array.isArray(need) ? need.some(function (p) { return !!can(p); }) : !!can(need);
    }

    // What this person may see. Empty groups disappear; numbers never move.
    function visible() {
      return all.map(function (group) {
        var screens = group.screens.filter(function (s) { return allowed(s.need); }).map(function (s) {
          return Object.assign({}, s, { tabs: s.tabs.filter(function (t) { return allowed(t.need); }) });
        });
        return { key: group.key, n: group.n, title: group.title, screens: screens };
      }).filter(function (group) { return group.screens.length > 0; });
    }

    // The screen a path belongs to: the longest route that equals the path or
    // is a whole-segment prefix of it (so /inventarios does not match /inventario).
    function screenFor(path) {
      var best = null, bestLength = -1;
      all.forEach(function (group) {
        group.screens.forEach(function (screen) {
          [screen.to].concat(screen.match).forEach(function (route) {
            var whole = path === route || path.indexOf(route + "/") === 0 || path.indexOf(route + "?") === 0;
            if (whole && route.length > bestLength) { best = { group: group, screen: screen }; bestLength = route.length; }
          });
        });
      });
      return best;
    }

    // Breadcrumb trail: group, screen, and tab when the caller names one.
    function crumbs(path, tabKey) {
      var hit = screenFor(path);
      if (!hit) return [];
      var out = [{ n: hit.group.n, label: hit.group.title }, { n: hit.screen.n, label: hit.screen.label, to: hit.screen.to }];
      if (tabKey) {
        var tab = hit.screen.tabs.filter(function (t) { return t.key === tabKey; })[0];
        if (tab) out.push({ n: tab.n, label: tab.label });
      }
      return out;
    }

    return { visible: visible, all: all, screenFor: screenFor, crumbs: crumbs, allowed: allowed };
  }

  var api = { createMenu: createMenu, version: 1 };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.BuyniverseMenu = api;
})(typeof window !== "undefined" ? window : globalThis);
