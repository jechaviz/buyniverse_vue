/**
 * Buyniverse supplier marketplace catalog.
 *
 * Framework-free projection of the supplier master into a browsable market,
 * plus the dependent-filter engine behind the supplier finder. Everything here
 * is a pure function of (state, filters) so the same rules run in the browser,
 * in QA under Node, and could run server-side unchanged.
 *
 * Dependent combos follow two rules:
 *   1. Hierarchy. Category needs a sector, capability needs a category; region
 *      needs a country, city needs a region. Changing a parent clears its
 *      descendants (normalizeFilters), so a stale child can never survive.
 *   2. Faceting. Each combo's options are counted against every *other* active
 *      filter, never against itself. Picking "Monterrey" therefore narrows the
 *      sector counts, and a sector shows zero only when choosing it would
 *      really return nothing.
 */
(function (global) {
  "use strict";

  var TAXONOMY = [
    { value: "technology", label: "Technology", icon: "fa-microchip", children: [
      { value: "software", label: "Software & SaaS", children: [
        { value: "saas-licensing", label: "SaaS licensing" },
        { value: "custom-development", label: "Custom development" },
        { value: "erp-integration", label: "ERP integration" },
      ] },
      { value: "hardware", label: "Hardware & IT", children: [
        { value: "computing", label: "Computing equipment" },
        { value: "networking", label: "Networking & telecom" },
        { value: "electronic-components", label: "Electronic components" },
      ] },
      { value: "cybersecurity", label: "Cybersecurity", children: [
        { value: "security-audit", label: "Security audit" },
        { value: "managed-soc", label: "Managed SOC" },
      ] },
    ] },
    { value: "services", label: "Professional services", icon: "fa-briefcase", children: [
      { value: "design", label: "Design & creative", children: [
        { value: "ux-ui", label: "UX/UI design" },
        { value: "branding", label: "Branding" },
        { value: "motion", label: "Animation & video" },
      ] },
      { value: "consulting", label: "Consulting", children: [
        { value: "procurement-consulting", label: "Procurement & sourcing" },
        { value: "accessibility", label: "Accessibility" },
        { value: "finance", label: "Finance & tax" },
      ] },
      { value: "marketing", label: "Marketing", children: [
        { value: "digital-campaigns", label: "Digital campaigns" },
        { value: "seo", label: "SEO" },
      ] },
    ] },
    { value: "operations", label: "Operations & industry", icon: "fa-industry", children: [
      { value: "mro", label: "MRO & supplies", children: [
        { value: "spare-parts", label: "Spare parts" },
        { value: "tools", label: "Tools" },
        { value: "ppe", label: "Safety & PPE" },
      ] },
      { value: "office", label: "Office", children: [
        { value: "stationery", label: "Stationery" },
        { value: "furniture", label: "Furniture" },
      ] },
      { value: "packaging", label: "Packaging", children: [
        { value: "labels", label: "Labels" },
        { value: "sustainable-packaging", label: "Sustainable packaging" },
        { value: "print", label: "Commercial print" },
      ] },
    ] },
    { value: "logistics", label: "Logistics", icon: "fa-truck-fast", children: [
      { value: "transport", label: "Transport", children: [
        { value: "ground-freight", label: "Ground freight" },
        { value: "last-mile", label: "Last mile" },
      ] },
      { value: "trade", label: "Foreign trade", children: [
        { value: "customs-broker", label: "Customs brokerage" },
        { value: "bonded-warehouse", label: "Bonded warehousing" },
      ] },
    ] },
  ];

  var GEOGRAPHY = [
    { value: "MX", label: "Mexico", children: [
      { value: "CDMX", label: "Mexico City", children: [{ value: "cdmx", label: "Mexico City" }] },
      { value: "NL", label: "Nuevo León", children: [{ value: "monterrey", label: "Monterrey" }, { value: "san-pedro", label: "San Pedro Garza García" }] },
      { value: "JAL", label: "Jalisco", children: [{ value: "guadalajara", label: "Guadalajara" }, { value: "zapopan", label: "Zapopan" }] },
      { value: "QRO", label: "Querétaro", children: [{ value: "queretaro", label: "Querétaro" }] },
    ] },
    { value: "US", label: "United States", children: [
      { value: "TX", label: "Texas", children: [{ value: "austin", label: "Austin" }, { value: "houston", label: "Houston" }] },
      { value: "CA", label: "California", children: [{ value: "san-francisco", label: "San Francisco" }, { value: "los-angeles", label: "Los Angeles" }] },
      { value: "NY", label: "New York", children: [{ value: "new-york", label: "New York" }] },
    ] },
    { value: "ES", label: "Spain", children: [
      { value: "MD", label: "Madrid", children: [{ value: "madrid", label: "Madrid" }] },
      { value: "CT", label: "Catalonia", children: [{ value: "barcelona", label: "Barcelona" }] },
    ] },
    { value: "CO", label: "Colombia", children: [
      { value: "ANT", label: "Antioquia", children: [{ value: "medellin", label: "Medellín" }] },
      { value: "DC", label: "Bogotá D.C.", children: [{ value: "bogota", label: "Bogotá" }] },
    ] },
  ];

  // Parent -> child chains. Order matters: a parent always precedes its child.
  var CHAINS = [["sector", "category", "capability"], ["country", "region", "city"]];
  var FILTER_KEYS = ["q", "sector", "category", "capability", "country", "region", "city", "certification", "status", "minScore", "maxLead", "verified"];
  var SORTS = ["relevance", "score", "rating", "lead", "esg"];

  function findNode(tree, value) {
    for (var i = 0; i < tree.length; i++) if (tree[i].value === value) return tree[i];
    return null;
  }

  function childrenOf(tree, path) {
    var level = tree;
    for (var i = 0; i < path.length; i++) {
      var node = findNode(level, path[i]);
      if (!node) return [];
      level = node.children || [];
    }
    return level;
  }

  function labelOf(tree, path) {
    var level = tree, node = null;
    for (var i = 0; i < path.length; i++) {
      node = findNode(level, path[i]);
      if (!node) return path[path.length - 1] || "";
      level = node.children || [];
    }
    return node ? node.label : "";
  }

  /** Merge supplier master data with its public marketplace profile. */
  function profiles(state) {
    var source = state || {};
    var suppliers = Array.isArray(source.suppliers) ? source.suppliers : [];
    var products = Array.isArray(source.products) ? source.products : [];
    var events = Array.isArray(source.sourcingEvents) ? source.sourcingEvents : [];

    return suppliers
      .filter(function (supplier) { return supplier && supplier.marketplace && supplier.marketplace.listed !== false; })
      .map(function (supplier) {
        var m = supplier.marketplace;
        var offers = [];
        products.forEach(function (product) {
          (product.offers || []).forEach(function (offer) {
            if (offer.supplierId === supplier.id) offers.push({ product: product, offer: offer });
          });
        });
        var quotes = 0, awards = 0;
        events.forEach(function (event) {
          if ((event.quotes || []).some(function (quote) { return quote.supplierId === supplier.id; })) quotes += 1;
          if (event.awardedSupplierId === supplier.id) awards += 1;
        });
        return {
          id: supplier.id,
          name: supplier.name,
          status: supplier.status,
          rating: Number(supplier.rating) || 0,
          reviews: Number(m.reviews) || 0,
          score: Number(supplier.score) || 0,
          risk: Number(supplier.risk) || 0,
          esg: Number(supplier.esg) || 0,
          onTime: Number(supplier.onTime) || 0,
          responseRate: Number(supplier.responseRate) || 0,
          certifications: Array.isArray(supplier.certifications) ? supplier.certifications.slice() : [],
          sector: m.sector,
          category: m.category,
          capabilities: Array.isArray(m.capabilities) ? m.capabilities.slice() : [],
          country: m.country,
          region: m.region,
          city: m.city,
          headline: m.headline || "",
          about: m.about || "",
          founded: m.founded || null,
          employees: m.employees || "",
          leadDays: Number(m.leadDays) || 0,
          minOrder: Number(m.minOrder) || 0,
          currency: m.currency || "USD",
          languages: Array.isArray(m.languages) ? m.languages.slice() : [],
          coverage: m.coverage || "",
          responseHours: Number(m.responseHours) || 0,
          verified: m.verified === true,
          accent: m.accent || "violet",
          offers: offers,
          quoteCount: quotes,
          awardCount: awards,
          sectorLabel: labelOf(TAXONOMY, [m.sector]),
          categoryLabel: labelOf(TAXONOMY, [m.sector, m.category]),
          countryLabel: labelOf(GEOGRAPHY, [m.country]),
          regionLabel: labelOf(GEOGRAPHY, [m.country, m.region]),
          cityLabel: labelOf(GEOGRAPHY, [m.country, m.region, m.city]),
        };
      });
  }

  function emptyFilters() {
    return { q: "", sector: "", category: "", capability: "", country: "", region: "", city: "", certification: "", status: "", minScore: 0, maxLead: 0, verified: false };
  }

  /**
   * Drop any child whose parent is missing or no longer contains it. This is
   * what makes the combos genuinely dependent rather than merely nested.
   */
  function normalizeFilters(input) {
    var f = emptyFilters();
    var raw = input || {};
    FILTER_KEYS.forEach(function (key) { if (raw[key] !== undefined && raw[key] !== null) f[key] = raw[key]; });
    f.q = String(f.q || "").slice(0, 80);
    f.minScore = Math.max(0, Math.min(100, Number(f.minScore) || 0));
    f.maxLead = Math.max(0, Math.min(90, Number(f.maxLead) || 0));
    f.verified = f.verified === true || f.verified === "1" || f.verified === "true";

    [[TAXONOMY, CHAINS[0]], [GEOGRAPHY, CHAINS[1]]].forEach(function (pair) {
      var tree = pair[0], chain = pair[1], path = [];
      for (var i = 0; i < chain.length; i++) {
        var key = chain[i], value = String(f[key] || "");
        var valid = value && childrenOf(tree, path).some(function (node) { return node.value === value; });
        if (!valid) {
          for (var j = i; j < chain.length; j++) f[chain[j]] = "";
          break;
        }
        path.push(value);
      }
    });
    return f;
  }

  /** When a parent changes, every descendant is cleared. */
  function setFilter(filters, key, value) {
    var next = Object.assign({}, filters);
    next[key] = value;
    CHAINS.forEach(function (chain) {
      var index = chain.indexOf(key);
      if (index === -1) return;
      for (var i = index + 1; i < chain.length; i++) next[chain[i]] = "";
    });
    return normalizeFilters(next);
  }

  function matches(profile, f, skip) {
    var s = skip || {};
    if (f.q && !s.q) {
      var needle = f.q.toLowerCase();
      var hay = [profile.name, profile.headline, profile.categoryLabel, profile.cityLabel].concat(profile.capabilities, profile.certifications).join(" ").toLowerCase();
      if (hay.indexOf(needle) === -1) return false;
    }
    if (f.sector && !s.sector && profile.sector !== f.sector) return false;
    if (f.category && !s.category && profile.category !== f.category) return false;
    if (f.capability && !s.capability && profile.capabilities.indexOf(f.capability) === -1) return false;
    if (f.country && !s.country && profile.country !== f.country) return false;
    if (f.region && !s.region && profile.region !== f.region) return false;
    if (f.city && !s.city && profile.city !== f.city) return false;
    if (f.certification && !s.certification && profile.certifications.indexOf(f.certification) === -1) return false;
    if (f.status && !s.status && profile.status !== f.status) return false;
    if (f.minScore && !s.minScore && profile.score < f.minScore) return false;
    if (f.maxLead && !s.maxLead && profile.leadDays > f.maxLead) return false;
    if (f.verified && !s.verified && !profile.verified) return false;
    return true;
  }

  function applyFilters(list, filters) {
    var f = normalizeFilters(filters);
    return (list || []).filter(function (profile) { return matches(profile, f); });
  }

  // Filters a level must ignore when counting its own options: itself and its
  // descendants, since those are about to change with the choice.
  function skipFor(key) {
    var skip = {};
    skip[key] = true;
    CHAINS.forEach(function (chain) {
      var index = chain.indexOf(key);
      if (index === -1) return;
      for (var i = index; i < chain.length; i++) skip[chain[i]] = true;
    });
    return skip;
  }

  function countBy(list, f, key, read) {
    var skip = skipFor(key), counts = {};
    list.forEach(function (profile) {
      if (!matches(profile, f, skip)) return;
      [].concat(read(profile)).forEach(function (value) {
        if (value) counts[value] = (counts[value] || 0) + 1;
      });
    });
    return counts;
  }

  function treeOptions(nodes, counts) {
    return nodes.map(function (node) {
      return { value: node.value, label: node.label, icon: node.icon || "", count: counts[node.value] || 0 };
    });
  }

  /** Options and counts for every combo under the current filters. */
  function cascade(list, filters) {
    var f = normalizeFilters(filters);
    var all = list || [];
    var certs = {}, statuses = {};
    all.forEach(function (profile) {
      profile.certifications.forEach(function (cert) { certs[cert] = true; });
      if (profile.status) statuses[profile.status] = true;
    });
    var certCounts = countBy(all, f, "certification", function (p) { return p.certifications; });
    var statusCounts = countBy(all, f, "status", function (p) { return p.status; });

    return {
      sector: treeOptions(TAXONOMY, countBy(all, f, "sector", function (p) { return p.sector; })),
      category: f.sector ? treeOptions(childrenOf(TAXONOMY, [f.sector]), countBy(all, f, "category", function (p) { return p.category; })) : [],
      capability: f.category ? treeOptions(childrenOf(TAXONOMY, [f.sector, f.category]), countBy(all, f, "capability", function (p) { return p.capabilities; })) : [],
      country: treeOptions(GEOGRAPHY, countBy(all, f, "country", function (p) { return p.country; })),
      region: f.country ? treeOptions(childrenOf(GEOGRAPHY, [f.country]), countBy(all, f, "region", function (p) { return p.region; })) : [],
      city: f.region ? treeOptions(childrenOf(GEOGRAPHY, [f.country, f.region]), countBy(all, f, "city", function (p) { return p.city; })) : [],
      certification: Object.keys(certs).sort().map(function (cert) { return { value: cert, label: cert, count: certCounts[cert] || 0 }; }),
      status: Object.keys(statuses).sort().map(function (status) { return { value: status, label: status, count: statusCounts[status] || 0 }; }),
    };
  }

  function sortProfiles(list, key) {
    var sort = SORTS.indexOf(key) === -1 ? "relevance" : key;
    var copy = (list || []).slice();
    var by = {
      relevance: function (a, b) { return (b.verified - a.verified) || (b.score * 0.6 + b.rating * 8) - (a.score * 0.6 + a.rating * 8); },
      score: function (a, b) { return b.score - a.score; },
      rating: function (a, b) { return (b.rating - a.rating) || (b.reviews - a.reviews); },
      lead: function (a, b) { return a.leadDays - b.leadDays; },
      esg: function (a, b) { return b.esg - a.esg; },
    };
    return copy.sort(function (a, b) { return by[sort](a, b) || a.name.localeCompare(b.name); });
  }

  /** Route query <-> filters, so every result set is linkable and survives reload. */
  function fromQuery(query) {
    var q = query || {};
    var raw = {};
    FILTER_KEYS.forEach(function (key) { if (q[key] !== undefined) raw[key] = Array.isArray(q[key]) ? q[key][0] : q[key]; });
    return normalizeFilters(raw);
  }

  function toQuery(filters, extra) {
    var f = normalizeFilters(filters), out = {};
    FILTER_KEYS.forEach(function (key) {
      var value = f[key];
      if (value === "" || value === 0 || value === false) return;
      out[key] = value === true ? "1" : String(value);
    });
    return Object.assign(out, extra || {});
  }

  function activeChips(filters) {
    var f = normalizeFilters(filters), chips = [];
    if (f.q) chips.push({ key: "q", label: "“" + f.q + "”" });
    if (f.sector) chips.push({ key: "sector", label: labelOf(TAXONOMY, [f.sector]) });
    if (f.category) chips.push({ key: "category", label: labelOf(TAXONOMY, [f.sector, f.category]) });
    if (f.capability) chips.push({ key: "capability", label: labelOf(TAXONOMY, [f.sector, f.category, f.capability]) });
    if (f.country) chips.push({ key: "country", label: labelOf(GEOGRAPHY, [f.country]) });
    if (f.region) chips.push({ key: "region", label: labelOf(GEOGRAPHY, [f.country, f.region]) });
    if (f.city) chips.push({ key: "city", label: labelOf(GEOGRAPHY, [f.country, f.region, f.city]) });
    if (f.certification) chips.push({ key: "certification", label: f.certification });
    if (f.status) chips.push({ key: "status", label: f.status });
    if (f.minScore) chips.push({ key: "minScore", label: "Score ≥ " + f.minScore });
    if (f.maxLead) chips.push({ key: "maxLead", label: "≤ " + f.maxLead + " d" });
    if (f.verified) chips.push({ key: "verified", label: "Verified" });
    return chips;
  }

  // ---- Public catalog ------------------------------------------------------
  // A signed-in workspace carries its own supplier master. A production guest
  // starts from a deliberately empty, private workspace, so the public finder
  // falls back to the published catalog (scripts/build_marketplace_catalog.js),
  // which holds listing fields only.
  var publicCatalog = null;
  var publicLoading = null;

  function loadPublicCatalog(url) {
    if (publicCatalog) return Promise.resolve(publicCatalog);
    if (!publicLoading) {
      publicLoading = fetch(url || "assets/data/marketplace-catalog.json", { credentials: "same-origin" })
        .then(function (response) { return response.ok ? response.json() : null; })
        .then(function (json) {
          publicCatalog = json && Array.isArray(json.suppliers) ? { sample: json.sample === true, suppliers: json.suppliers } : { sample: false, suppliers: [] };
          return publicCatalog;
        })
        .catch(function () {
          publicLoading = null;
          return { sample: false, suppliers: [] };
        });
    }
    return publicLoading;
  }

  function hasListedSuppliers(state) {
    return ((state && state.suppliers) || []).some(function (supplier) { return supplier && supplier.marketplace && supplier.marketplace.listed !== false; });
  }

  /** The state the marketplace should read, and whether it is the sample catalog. */
  function marketState(state) {
    if (hasListedSuppliers(state)) return { state: state, sample: false, source: "workspace" };
    return {
      state: { suppliers: (publicCatalog && publicCatalog.suppliers) || [], products: [], sourcingEvents: [] },
      sample: Boolean(publicCatalog && publicCatalog.sample),
      source: "public",
    };
  }

  function capabilityLabel(profile, value) {
    return labelOf(TAXONOMY, [profile.sector, profile.category, value]) || value;
  }

  global.BuyniverseMarketplace = {
    TAXONOMY: TAXONOMY,
    GEOGRAPHY: GEOGRAPHY,
    SORTS: SORTS,
    profiles: profiles,
    emptyFilters: emptyFilters,
    normalizeFilters: normalizeFilters,
    setFilter: setFilter,
    applyFilters: applyFilters,
    cascade: cascade,
    sortProfiles: sortProfiles,
    fromQuery: fromQuery,
    toQuery: toQuery,
    activeChips: activeChips,
    capabilityLabel: capabilityLabel,
    labelOf: labelOf,
    loadPublicCatalog: loadPublicCatalog,
    hasListedSuppliers: hasListedSuppliers,
    marketState: marketState,
  };
})(typeof window !== "undefined" ? window : globalThis);
