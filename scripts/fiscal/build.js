// Assemble the fiscal jurisdiction registry into the JSON consumed by the
// browser (app/lib/fiscal-rules.js) and the server (fiscal_rules.php).
//   node scripts/fiscal/build.js
"use strict";

const fs = require("fs");
const path = require("path");
const rules = require("../../app/lib/fiscal-rules.js");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "app/data/fiscal");
const VERIFIED_AT = "2026-09-28";

const countries = [...require("./north-america"), ...require("./latam"), ...require("./europe-asia")];

// Messages for validator and evaluation codes, shared by client and server.
const messages = {
  format: { es: "El formato no es válido.", en: "The format is not valid." },
  checksum: { es: "El dígito verificador no coincide.", en: "The check digit does not match." },
  date: { es: "La fecha contenida en el identificador no existe.", en: "The date inside the identifier does not exist." },
  generic: { es: "Los RFC genéricos no identifican a un proveedor.", en: "Generic RFCs do not identify a supplier." },
  prefix: { es: "El prefijo no fue emitido por la autoridad.", en: "The prefix was not issued by the authority." },
  pattern: { es: "El dato no tiene el formato esperado.", en: "The value does not have the expected format." },
  subdivision: { es: "Selecciona una opción de la lista.", en: "Select an option from the list." },
  county: { es: "El condado no pertenece al estado.", en: "The county does not belong to the state." },
  regime_unknown: { es: "Régimen fiscal desconocido.", en: "Unknown tax regime." },
  regime_not_supplier: { es: "Este régimen no permite facturar como proveedor.", en: "This regime cannot invoice as a supplier." },
  regime_person_mismatch: { es: "El régimen no corresponde al tipo de persona del RFC.", en: "The regime does not match the RFC person type." },
  postal_format: { es: "El código postal debe tener 5 dígitos.", en: "The postal code must have 5 digits." },
  postal_state_mismatch: { es: "El código postal no parece pertenecer al estado seleccionado.", en: "The postal code does not appear to belong to the selected state." },
  mx_corporate_suffix: { es: "Para CFDI 4.0 el nombre va sin régimen societario.", en: "For CFDI 4.0 the name must omit the corporate suffix." },
  gstin_state_mismatch: { es: "El código de estado del GSTIN no coincide con el estado seleccionado.", en: "The GSTIN state code does not match the selected state." },
  missing: { es: "Pendiente de capturar.", en: "Not provided yet." },
  pending: { es: "Pendiente de cargar.", en: "Not uploaded yet." },
  expired: { es: "El documento superó su vigencia.", en: "The document is past its validity." },
};

function assert(condition, message) { if (!condition) throw new Error(message); }

const seen = new Set();
for (const country of countries) {
  assert(/^[A-Z]{2}$/.test(country.code) && !seen.has(country.code), `country code ${country.code}`);
  seen.add(country.code);
  assert(rules.validators.includes(country.taxId.validator), `${country.code}: unknown validator ${country.taxId.validator}`);
  if (country.taxId.example) {
    const check = rules.validateTaxId(country.taxId.validator, country.taxId.example);
    assert(check.valid, `${country.code}: example ${country.taxId.example} fails ${country.taxId.validator} (${check.code})`);
  }
  const ids = new Set();
  for (const requirement of country.requirements) {
    assert(!ids.has(requirement.id), `${country.code}: duplicate requirement ${requirement.id}`);
    ids.add(requirement.id);
    if (requirement.input && requirement.input.pattern) new RegExp(requirement.input.pattern);
    const when = requirement.when || {};
    for (const flag of [when.flag, ...(when.anyFlag || [])].filter(Boolean)) {
      assert(country.subdivisionFlags && country.subdivisionFlags[flag], `${country.code}: ${requirement.id} uses undefined flag ${flag}`);
    }
    for (const answer of [when.answer, when.answerNot].filter(Boolean)) {
      assert((country.questions || []).some((q) => q.id === answer), `${country.code}: ${requirement.id} uses undefined question ${answer}`);
    }
  }
  for (const item of (country.subdivisions && country.subdivisions.items) || []) {
    for (const flag of item.flags || []) assert(country.subdivisionFlags && country.subdivisionFlags[flag], `${country.code}/${item.code}: undefined flag ${flag}`);
  }
}

// U.S. counties and county-equivalents from the Census Bureau reference file.
// Functional status F covers independent cities (Virginia, Baltimore, St. Louis,
// Carson City, DC), which are real local-tax jurisdictions, so every row is kept.
const usStates = new Set(countries.find((c) => c.code === "US").subdivisions.items.map((s) => s.code));
const counties = {};
fs.readFileSync(path.join(__dirname, "data/national_county2020.txt"), "utf8").split(/\r?\n/).slice(1).forEach((line) => {
  const [state, , countyFp, , name, , status] = line.split("|");
  if (!state || !status || !usStates.has(state)) return;
  (counties[state] = counties[state] || []).push([countyFp, name]);
});
for (const state of usStates) assert(counties[state] && counties[state].length, `no counties for ${state}`);

fs.mkdirSync(OUT, { recursive: true });
const registry = { version: `fiscal-${VERIFIED_AT}`, verifiedAt: VERIFIED_AT, messages, countries };
fs.writeFileSync(path.join(OUT, "jurisdictions.json"), JSON.stringify(registry) + "\n");
fs.writeFileSync(path.join(OUT, "us-counties.json"), JSON.stringify({ source: "U.S. Census Bureau national_county2020.txt", counties }) + "\n");

const total = Object.values(counties).reduce((sum, list) => sum + list.length, 0);
console.log(`fiscal registry: ${countries.length} jurisdictions, ${countries.reduce((s, c) => s + c.requirements.length, 0)} requirements, ${total} U.S. counties`);
