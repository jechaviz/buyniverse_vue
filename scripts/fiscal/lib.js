// Authoring helpers for the fiscal jurisdiction registry.
//
// The registry describes who may be a formal supplier in each jurisdiction:
// the tax identity, the e-invoicing regime, and the registrations, documents
// and declarations a buyer can rely on. It deliberately does not carry tax
// rates: rates are decided per transaction by a tax engine and change far
// more often than the obligations described here.

"use strict";

const L = (es, en) => ({ es, en });

/**
 * A supplier requirement.
 *   kind       taxId | field | document | declaration | info
 *   phase      enrollment   - must be valid before the supplier profile exists
 *              verification - needed for the "formal supplier" status
 *   blocking   counts against formal status when unmet
 *   when       condition object evaluated by fiscal-rules (see there)
 */
function req(id, kind, label, detail, options = {}) {
  return {
    id,
    kind,
    label,
    detail,
    phase: options.phase || (kind === "document" ? "verification" : "enrollment"),
    blocking: options.blocking !== false && kind !== "info",
    accountKinds: options.accountKinds || ["business", "individual"],
    ...(options.field ? { field: options.field } : {}),
    ...(options.when ? { when: options.when } : {}),
    ...(options.input ? { input: options.input } : {}),
    ...(options.maxAgeDays ? { maxAgeDays: options.maxAgeDays } : {}),
    ...(options.severity ? { severity: options.severity } : {}),
  };
}

const info = (id, label, detail, options = {}) => req(id, "info", label, detail, { ...options, blocking: false });

/** A yes/no or select question whose answer drives conditional requirements. */
function question(id, label, detail, options = {}) {
  return { id, label, detail, type: options.type || "boolean", ...(options.options ? { options: options.options } : {}) };
}

function source(title, url) { return { title, url }; }

module.exports = { L, req, info, question, source };
