(function (global) {
  "use strict";

  // The library is scoped to the active user, bounded and normalised before
  // every read/write. Its backing workspace state is encrypted server-side.
  var MAX_DOCUMENTS = 50;
  var MAX_SECTIONS = 60;

  function clean(value, length) {
    var fallback = String(value == null ? "" : value);
    return global.WebCommon && global.WebCommon.sanitizeText
      ? global.WebCommon.sanitizeText(fallback, length)
      : fallback.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, length || 4000);
  }

  function cleanId(value, fallback) {
    var id = clean(value, 120).replace(/[^A-Za-z0-9_-]/g, "");
    return id || fallback;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function now() {
    return new Date().toISOString();
  }

  // The main workspace state is server-synchronised. Keeping documents and
  // drafts inside that state makes them subject to the same encrypted remote
  // persistence, versioning and integrity checks as the rest of the project.
  function workspaceBucket() {
    var state = global.BuyniverseWorkspaceRuntimeState;
    if (!state || typeof state !== "object") return null;
    if (!state.documentLibrary || typeof state.documentLibrary !== "object")
      state.documentLibrary = { documents: {}, drafts: {} };
    if (!state.documentLibrary.documents || typeof state.documentLibrary.documents !== "object")
      state.documentLibrary.documents = {};
    if (!state.documentLibrary.drafts || typeof state.documentLibrary.drafts !== "object")
      state.documentLibrary.drafts = {};
    return state.documentLibrary;
  }

  function blockStyle(raw, key) {
    raw = raw && typeof raw === "object" ? raw : {};
    var defaults = {
      title: { align: "center", vertical: "center", size: "lg", tone: "default", surface: "plain" },
      subtitle: { align: "center", vertical: "center", size: "md", tone: "brand", surface: "plain" },
      body: { align: "left", vertical: "top", size: "md", tone: "default", surface: "plain" },
      legal: { align: "left", vertical: "top", size: "md", tone: "legal", surface: "legal" },
      version: { align: "center", vertical: "bottom", size: "sm", tone: "muted", surface: "plain" },
    };
    var fallback = defaults[key] || defaults.body;
    return {
      align: ["left", "center", "right"].includes(raw.align) ? raw.align : fallback.align,
      vertical: ["top", "center", "bottom"].includes(raw.vertical) ? raw.vertical : fallback.vertical,
      size: ["sm", "md", "lg"].includes(raw.size) ? raw.size : fallback.size,
      tone: ["default", "brand", "muted", "legal"].includes(raw.tone) ? raw.tone : fallback.tone,
      surface: ["plain", "legal", "brand"].includes(raw.surface) ? raw.surface : fallback.surface,
    };
  }

  function sectionChrome(raw) {
    raw = raw && typeof raw === "object" ? raw : {};
    return {
      headerEnabled: raw.headerEnabled !== false,
      headerMode: ["section_title", "document_title", "custom"].includes(raw.headerMode) ? raw.headerMode : "section_title",
      headerText: clean(raw.headerText, 240),
      footerEnabled: raw.footerEnabled !== false,
      footerMode: ["section_title", "document_title", "custom"].includes(raw.footerMode) ? raw.footerMode : "custom",
      footerText: clean(raw.footerText, 240),
    };
  }

  function section(raw, index) {
    var type = ["standard", "cover", "section_end"].includes(raw && raw.type)
      ? raw.type
      : "standard";
    var level = Math.min(3, Math.max(1, Number(raw && raw.level) || 1));
    return {
      id: cleanId(raw && raw.id, "sec-" + index),
      type: type,
      title: clean(raw && raw.title, 220).trim(),
      subtitle: clean(raw && raw.subtitle, 400).trim(),
      content: clean(raw && raw.content, 50000),
      legalDisclaimer: clean(raw && raw.legalDisclaimer, 3000),
      versionText: clean(raw && raw.versionText, 300).trim(),
      level: level,
      pageBreakBefore: Boolean(raw && raw.pageBreakBefore),
      alignVertical: ["top", "center", "bottom"].includes(raw && raw.alignVertical)
        ? raw.alignVertical
        : "center",
      showSignatures: Boolean(raw && raw.showSignatures),
      styles: {
        title: blockStyle(raw && raw.styles && raw.styles.title, "title"),
        subtitle: blockStyle(raw && raw.styles && raw.styles.subtitle, "subtitle"),
        body: blockStyle(raw && raw.styles && raw.styles.body, "body"),
        legal: blockStyle(raw && raw.styles && raw.styles.legal, "legal"),
        version: blockStyle(raw && raw.styles && raw.styles.version, "version"),
      },
      headerFooter: sectionChrome(raw && raw.headerFooter),
    };
  }

  function normalize(payload, options) {
    options = options || {};
    var rawSections = Array.isArray(payload && payload.sections) ? payload.sections : [];
    var sections = rawSections.slice(0, MAX_SECTIONS).map(section);
    if (!sections.length) return null;
    var stamp = now();
    var name = clean(payload && (payload.name || payload.title), 120).trim();
    var title = clean(payload && (payload.title || payload.name), 180).trim();
    if (!name || !title) return null;
    var tags = Array.isArray(payload && payload.tags) ? payload.tags : [];
    return {
      id: cleanId(payload && payload.id, "doc-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7)),
      name: name,
      title: title,
      tags: Array.from(new Set(tags.map(function (tag) { return clean(tag, 32).trim(); }).filter(Boolean))).slice(0, 8),
      sections: sections,
      headerText: clean(payload && payload.headerText, 240),
      footerText: clean(payload && payload.footerText, 240),
      pageNumberFormat: ["none", "X / Y", "Page X", "Page X of Y"].includes(payload && payload.pageNumberFormat)
        ? payload.pageNumberFormat
        : "Page X of Y",
      watermarkText: clean(payload && payload.watermarkText, 120),
      suppressOnCover: payload && payload.suppressOnCover !== false,
      showRunningHeader: payload && payload.showRunningHeader !== false,
      source: options.source || (payload && payload.source === "template" ? "template" : "custom"),
      createdAt: clean(payload && payload.createdAt, 40) || stamp,
      updatedAt: options.refresh ? stamp : (clean(payload && payload.updatedAt, 40) || stamp),
    };
  }

  function rawLibrary(userId) {
    var bucket = workspaceBucket();
    if (!bucket) return [];
    var user = cleanId(userId, "anonymous");
    if (!Array.isArray(bucket.documents[user])) bucket.documents[user] = [];
    return bucket.documents[user];
  }

  function writeLibrary(userId, records) {
    var bucket = workspaceBucket();
    if (!bucket || !Array.isArray(records)) return false;
    bucket.documents[cleanId(userId, "anonymous")] = clone(records.slice(0, MAX_DOCUMENTS));
    return true;
  }

  function list(userId) {
    return rawLibrary(userId)
      .map(function (item) { return normalize(item, { source: item && item.source }); })
      .filter(Boolean)
      .sort(function (a, b) { return String(b.updatedAt).localeCompare(String(a.updatedAt)); });
  }

  function save(userId, payload) {
    var document = normalize(payload, { source: "custom", refresh: true });
    if (!document) return null;
    var records = list(userId);
    var existing = records.find(function (item) { return item.id === document.id; });
    if (existing) document.createdAt = existing.createdAt;
    records = [document].concat(records.filter(function (item) { return item.id !== document.id; })).slice(0, MAX_DOCUMENTS);
    if (!writeLibrary(userId, records)) return null;
    return clone(document);
  }

  function remove(userId, id) {
    var safeId = cleanId(id, "");
    if (!safeId) return false;
    var records = list(userId).filter(function (item) { return item.id !== safeId; });
    return writeLibrary(userId, records);
  }

  function fingerprint(value) {
    var text = clean(value, 100000);
    var hash = 2166136261;
    for (var i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function loadDraft(userId, identity) {
    var bucket = workspaceBucket();
    if (!bucket) return null;
    var user = cleanId(userId, "anonymous"), draftId = cleanId(identity, "default");
    var draft = bucket.drafts[user] && bucket.drafts[user][draftId];
    return draft ? normalize(draft, { source: "draft" }) : null;
  }

  function saveDraft(userId, identity, payload) {
    var draft = normalize(payload, { source: "draft" });
    var bucket = workspaceBucket();
    if (!draft || !bucket) return false;
    var user = cleanId(userId, "anonymous"), draftId = cleanId(identity, "default");
    if (!bucket.drafts[user] || typeof bucket.drafts[user] !== "object") bucket.drafts[user] = {};
    bucket.drafts[user][draftId] = clone(draft);
    return true;
  }

  function clearDraft(userId, identity) {
    var bucket = workspaceBucket();
    if (!bucket) return false;
    var user = cleanId(userId, "anonymous"), draftId = cleanId(identity, "default");
    if (bucket.drafts[user]) delete bucket.drafts[user][draftId];
    return true;
  }

  global.DocumentLibrary = {
    list: list,
    save: save,
    remove: remove,
    loadDraft: loadDraft,
    saveDraft: saveDraft,
    clearDraft: clearDraft,
    fingerprint: fingerprint,
    normalize: normalize,
  };
})(typeof window !== "undefined" ? window : globalThis);
