/**
 * ElectroPrice's catalog in the demo: about 20,000 real products, loaded on demand.
 *
 * The data are shards under app/data/electroprice/ (written by scripts/extract_electroprice_catalog.js). The index is small and says
 * which groups exist; each group is one file. Rows are kept as plain, non-reactive objects: a page that shows twenty of them
 * turns only those twenty into full product records (`toProduct`), and a product that goes on a shopping list is added to the
 * workspace's products (`ensure`) so the rest of the app sees it like any other.
 *
 * Prices in the shards already carry ElectroPrice's markup over its cost; the cost is not here.
 */
(function (global) {
  "use strict";

  var SUPPLIER = "sup-31";             // ElectroPrice in app/data/demo.js
  var VERSION = "3";
  var cache = { index: null, groups: {}, pending: {}, listeners: [], list: null };

  function url(name) { return "app/data/electroprice/" + name + ".json?v=" + VERSION; }
  function getJson(name) {
    return fetch(url(name), { credentials: "same-origin" }).then(function (response) {
      if (!response.ok) throw new Error("Catalog unavailable");
      return response.json();
    });
  }
  function notify() { cache.list = null; cache.listeners.slice().forEach(function (fn) { try { fn(api.progress()); } catch (error) { /* a listener never breaks loading */ } }); }

  // A photo token is "t<path>" (the seller's main image host, which refuses a foreign Referer) or "v<id>" (its second source, which wants the origin).
  function photoUrl(token) {
    if (!token) return "";
    if (token.charAt(0) === "t") return "https://static.ctonline.mx/imagenes/" + token.slice(1);
    if (token.charAt(0) === "v") return "https://me2.grupocva.com/me/imagen/imagen_art_detalles.php?fProd=" + token.slice(1);
    return "";
  }
  function photoReferrer(token) { return token && token.charAt(0) === "v" ? "origin" : "no-referrer"; }

  function lightRow(row, group, label) {
    var specs = row[6] || {};
    var text = [row[1], row[0], row[2], Object.keys(specs).map(function (k) { return specs[k]; }).join(" ")].join(" ").toLowerCase();
    return {
      id: "ep-" + row[0], sku: row[0], description: row[1], brand: row[2], price: row[3], reference: Math.max(row[3], row[4]), stock: row[5], specs: specs,
      image: photoUrl(row[7]), imageReferrer: photoReferrer(row[7]), category: label, group: group, hay: text, savingsPercent: row[4] > row[3] ? Math.round((1 - row[3] / row[4]) * 100) : 0, source: "catalog",
    };
  }

  /** The offer ElectroPrice makes for a row: in stock it ships in three days; on order it takes longer. */
  function offerOf(row) {
    return { id: "offer-" + row.id, supplierId: SUPPLIER, price: row.price, leadDays: row.stock > 0 ? 3 : 12, stock: row.stock, terms: "Prepaid", compliant: true };
  }

  function toProduct(row) {
    return {
      id: row.id, sku: row.sku, description: row.description, brand: row.brand, model: (row.specs && row.specs.model) || row.sku, rate: row.price, referencePrice: row.reference, unit: "Each", currency: "MXN",
      category: row.category, preferredSupplierId: SUPPLIER, procurementRule: "Approved catalog item", specs: row.specs, offers: [offerOf(row)],
    };
  }

  var api = {
    SUPPLIER: SUPPLIER,
    index: function () { return cache.index; },
    loadIndex: function () {
      if (cache.index) return Promise.resolve(cache.index);
      if (!cache.pending.index) cache.pending.index = getJson("index").then(function (index) { cache.index = index; notify(); return index; }).catch(function (error) { cache.pending.index = null; throw error; });
      return cache.pending.index;
    },
    loadGroup: function (key) {
      if (cache.groups[key]) return Promise.resolve(cache.groups[key]);
      if (!cache.pending[key]) {
        cache.pending[key] = api.loadIndex().then(function (index) {
          var group = index.groups.filter(function (g) { return g.key === key; })[0];
          if (!group) return [];
          return getJson(key).then(function (rows) { cache.groups[key] = rows.map(function (row) { return lightRow(row, key, group.label); }); notify(); return cache.groups[key]; });
        }).catch(function (error) { cache.pending[key] = null; throw error; });
      }
      return cache.pending[key];
    },
    /** Loads every group, smaller ones first so the page is usable early. Resolves when all are in. */
    loadAll: function () {
      return api.loadIndex().then(function (index) {
        var keys = index.groups.slice().sort(function (a, b) { return a.count - b.count; }).map(function (g) { return g.key; });
        return keys.reduce(function (chain, key) { return chain.then(function () { return api.loadGroup(key); }); }, Promise.resolve()).then(function () { return api.progress(); });
      });
    },
    /** Every row loaded so far (a new array only when something new arrived). */
    all: function () {
      if (!cache.list) cache.list = [].concat.apply([], Object.keys(cache.groups).map(function (k) { return cache.groups[k]; }));
      return cache.list;
    },
    progress: function () {
      var total = cache.index ? cache.index.groups.length : 0;
      return { loaded: Object.keys(cache.groups).length, total: total, done: total > 0 && Object.keys(cache.groups).length >= total, products: cache.index ? cache.index.total : 0 };
    },
    subscribe: function (fn) { cache.listeners.push(fn); return function () { cache.listeners = cache.listeners.filter(function (x) { return x !== fn; }); }; },
    photoUrl: photoUrl,
    offerOf: offerOf,
    row: lightRow,
    toProduct: toProduct,
    /** Makes a catalog row a product of the workspace (once) and returns it. */
    ensure: function (state, row) {
      var found = state.products.filter(function (p) { return p.id === row.id; })[0];
      if (found) return found;
      state.products.push(toProduct(row));
      return state.products[state.products.length - 1];
    },
  };
  global.BuyniverseCatalog = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
