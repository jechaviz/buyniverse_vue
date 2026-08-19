(function (global) {
  "use strict";

  function readStore(tableId, columns, editable, normalizeView, layoutKeys, VIEW_MODES) {
    const data = window.WebCommon.safeJsonParse(
      localStorage.getItem(`buyniverse-table:${tableId}`) || "",
      null,
    );
    if (!data || typeof data !== "object" || Array.isArray(data)) return null;
    const dataKeys = columns.map((c) => c.key),
      keys = layoutKeys(columns, editable),
      views = Array.isArray(data.views)
        ? data.views
            .map((v) => normalizeView(v, columns, editable))
            .filter(Boolean)
            .slice(0, 12)
        : [];
    return {
      sortState:
        data.sortState && dataKeys.includes(data.sortState.key)
          ? { key: data.sortState.key, desc: Boolean(data.sortState.desc) }
          : { key: "", desc: false },
      visibility:
        data.visibility && typeof data.visibility === "object"
          ? data.visibility
          : {},
      order: Array.isArray(data.order)
        ? [
            ...data.order.filter((k) => keys.includes(k)),
            ...keys.filter((k) => !data.order.includes(k)),
          ]
        : keys,
      widths:
        data.widths && typeof data.widths === "object"
          ? Object.fromEntries(
              Object.entries(data.widths)
                .filter(([k, v]) => keys.includes(k) && Number.isFinite(Number(v)))
                .map(([k, v]) => [k, Math.max(80, Math.min(800, Number(v)))]),
            )
          : {},
      mode: VIEW_MODES.includes(data.mode) ? data.mode : "table",
      pageSize: [5, 10, 20, 50].includes(Number(data.pageSize))
        ? Number(data.pageSize)
        : 10,
      views,
      activeView: views.some((v) => v.id === data.activeView) ? data.activeView : "",
    };
  }

  function persistStore(tableId, data) {
    try {
      localStorage.setItem(
        `buyniverse-table:${tableId}`,
        window.WebCommon.storageJson(data),
      );
    } catch (_) {}
  }

  function computeSignature(view, columns, editable, layoutKeys) {
    const cleanFilters = Object.fromEntries(
      Object.entries(view.filters || {})
        .filter(([, v]) => String(v ?? "").trim())
        .sort(([a], [b]) => a.localeCompare(b)),
    );
    const cleanWidths = Object.fromEntries(
      Object.entries(view.widths || {})
        .filter(([, v]) => Number.isFinite(Number(v)))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, Number(v)]),
    );
    return JSON.stringify({
      query: String(view.query || "").trim(),
      filters: cleanFilters,
      filterRules: (view.filterRules || [])
        .filter((r) => String(r.value ?? "").trim())
        .map((r) => ({ key: r.key, operator: r.operator, value: String(r.value) })),
      filterMode: view.filterMode === "any" ? "any" : "all",
      activeGroup: view.activeGroup || "all",
      sortState: { key: view.sortState?.key || "", desc: Boolean(view.sortState?.desc) },
      visibility: Object.fromEntries(
        layoutKeys(columns, editable).map((k) => [k, view.visibility?.[k] !== false]),
      ),
      order: (view.order || []).filter((k) => layoutKeys(columns, editable).includes(k)),
      widths: cleanWidths,
      mode: view.mode || "table",
      pageSize: Number(view.pageSize) || 10,
    });
  }

  global.DataTableStorage = {
    readStore,
    persistStore,
    computeSignature,
  };
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
