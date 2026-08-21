(function (global) {
  "use strict";

  var MAX_PAGE_SIZE = 200;
  var MAX_QUERY_LENGTH = 160;

  function clean(value, limit) {
    return global.WebCommon.sanitizeText(value, limit || MAX_QUERY_LENGTH).trim();
  }
  function normalize(request) {
    var page = request && request.page || {};
    var size = Math.max(10, Math.min(MAX_PAGE_SIZE, Number(page.size) || 50));
    var filters = Array.isArray(request && request.filters) ? request.filters.slice(0, 20).map(function (rule) {
      return { field: clean(rule.field, 80), operator: clean(rule.operator, 32), value: clean(rule.value, MAX_QUERY_LENGTH) };
    }).filter(function (rule) { return rule.field && rule.operator && rule.value; }) : [];
    var sort = Array.isArray(request && request.sort) ? request.sort.slice(0, 4).map(function (rule) {
      return { field: clean(rule.field, 80), direction: rule.direction === "desc" ? "desc" : "asc" };
    }).filter(function (rule) { return rule.field; }) : [];
    return {
      query: clean(request && request.query), filters: filters,
      logic: request && request.logic === "or" ? "or" : "and", sort: sort,
      page: { size: size, cursor: clean(page.cursor, 512) || null },
      fields: Array.isArray(request && request.fields) ? request.fields.slice(0, 80).map(function (field) { return clean(field, 80); }).filter(Boolean) : [],
      facets: Array.isArray(request && request.facets) ? request.facets.slice(0, 8).map(function (field) { return clean(field, 80); }).filter(Boolean) : [],
    };
  }
  function createCursorDataSource(options) {
    var settings = options || {};
    var endpoint = global.WebCommon.safeInternalPath(settings.endpoint || "/api/v1/search", "");
    if (!endpoint) throw new Error("A same-origin search endpoint is required");
    var ttl = Math.max(1000, Math.min(300000, Number(settings.cacheTtlMs) || 30000));
    var maxEntries = Math.max(10, Math.min(200, Number(settings.maxCacheEntries) || 80));
    var cache = new Map();
    var pending = new Map();
    function evict() { while (cache.size > maxEntries) cache.delete(cache.keys().next().value); }
    async function search(request, signal) {
      var body = normalize(request), key = JSON.stringify(body), now = Date.now(), cached = cache.get(key);
      if (cached && now - cached.at < ttl) return Object.assign({ cached: true }, cached.value);
      // A caller with its own AbortSignal must own its fetch. Reusing an
      // in-flight promise here would let a stale keystroke abort a newer query.
      if (!signal && pending.has(key)) return pending.get(key);
      var task = fetch(endpoint, {
        method: "POST", credentials: "same-origin", signal: signal,
        headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(body),
      }).then(function (response) {
        if (!response.ok) throw new Error("Search request failed");
        return response.json();
      }).then(function (payload) {
        var page = payload && payload.page || {};
        var value = {
          items: Array.isArray(payload && payload.hits) ? payload.hits.slice(0, body.page.size) : [],
          total: Number.isFinite(Number(page.total)) ? Number(page.total) : null,
          totalRelation: page.totalRelation === "gte" ? "gte" : "eq",
          nextCursor: clean(page.nextCursor, 512) || null,
          previousCursor: clean(page.previousCursor, 512) || null,
          facets: payload && typeof payload.facets === "object" ? payload.facets : {},
          tookMs: Math.max(0, Math.min(60000, Number(payload && payload.tookMs) || 0)),
        };
        cache.set(key, { at: Date.now(), value: value }); evict(); return value;
      }).finally(function () { pending.delete(key); });
      if (!signal) pending.set(key, task); return task;
    }
    return { search: search, clearCache: function () { cache.clear(); }, maxPageSize: MAX_PAGE_SIZE };
  }
  global.BuyniverseTableQuery = Object.freeze({ createCursorDataSource: createCursorDataSource, normalize: normalize, MAX_PAGE_SIZE: MAX_PAGE_SIZE });
})(window);
