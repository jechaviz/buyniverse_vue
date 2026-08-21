(function (global) {
  "use strict";

  const VIEW_MODES = ["table", "cards", "kanban", "dashboard"];
  const FILTER_OPERATORS = ["contains", "equals", "not_equals", "gt", "lt"];
  const ACTION_COLUMN_KEY = "__actions";

  const layoutKeys = (columns, editable) => [
    ...columns.map((column) => column.key),
    ...(editable ? [ACTION_COLUMN_KEY] : []),
  ];

  const normalizeView = (raw, columns, editable = true) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const dataKeys = columns.map((column) => column.key),
      keys = layoutKeys(columns, editable),
      id = window.WebCommon.sanitizeText(raw.id, 80).trim(),
      name = window.WebCommon.sanitizeText(raw.name, 40).trim();
    if (!id || !name) return null;
    const order = Array.isArray(raw.order)
        ? [...new Set(raw.order.filter((key) => keys.includes(key)))]
        : [],
      filters =
        raw.filters && typeof raw.filters === "object"
          ? Object.fromEntries(
              Object.entries(raw.filters)
                .filter(([key]) => dataKeys.includes(key))
                .map(([key, value]) => [
                  key,
                  window.WebCommon.sanitizeText(value, 240),
                ]),
            )
          : {};
    return {
      id,
      name,
      query: window.WebCommon.sanitizeText(raw.query, 120).trim(),
      mode: VIEW_MODES.includes(raw.mode) ? raw.mode : "table",
      sort:
        raw.sort && dataKeys.includes(raw.sort.key)
          ? { key: raw.sort.key, desc: Boolean(raw.sort.desc) }
          : null,
      pageSize: [5, 10, 20, 50, 100, 200].includes(Number(raw.pageSize))
        ? Number(raw.pageSize)
        : 10,
      visible:
        raw.visible && typeof raw.visible === "object"
          ? Object.fromEntries(
              Object.entries(raw.visible)
                .filter(([key]) => keys.includes(key))
                .map(([key, value]) => [key, Boolean(value)]),
            )
          : {},
      order: order.length ? order : keys,
      filters,
      filterRules: Array.isArray(raw.filterRules)
        ? raw.filterRules
            .filter(
              (rule) =>
                rule &&
                dataKeys.includes(rule.key) &&
                FILTER_OPERATORS.includes(rule.operator),
            )
            .map((rule) => ({
              id:
                window.WebCommon.sanitizeText(rule.id, 40) ||
                `rule-${Date.now()}`,
              key: rule.key,
              operator: rule.operator,
              value: window.WebCommon.sanitizeText(rule.value, 240),
            }))
        : [],
      filterMode: raw.filterMode === "any" ? "any" : "all",
      groupBy:
        typeof raw.groupBy === "string" && dataKeys.includes(raw.groupBy)
          ? raw.groupBy
          : "",
      widths:
        raw.widths && typeof raw.widths === "object"
          ? Object.fromEntries(
              Object.entries(raw.widths)
                .filter(([key]) => dataKeys.includes(key))
                .map(([key, value]) => [
                  key,
                  Math.min(600, Math.max(90, Number(value) || 160)),
                ]),
            )
          : {},
    };
  };

  global.DataTableCore = {
    VIEW_MODES,
    FILTER_OPERATORS,
    ACTION_COLUMN_KEY,
    layoutKeys,
    normalizeView,
  };
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
