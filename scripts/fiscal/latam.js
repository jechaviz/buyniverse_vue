// Latin America: clearance e-invoicing is the norm across the region.
"use strict";

const { L, req, info, question, source } = require("./lib");

// Shared shape for a country whose e-invoice is cleared by the tax authority.
function clearanceCountry({ code, name, currency, timezones, taxId, system, authority, mandate, requirements, questions = [], subdivisions, subdivisionFlags, sources = [] }) {
  return {
    code, name, currency, timezones, taxId,
    invoicing: { system, authority, model: "clearance", mandate, buyniverseIssuance: false },
    ...(subdivisions ? { subdivisions } : {}),
    ...(subdivisionFlags ? { subdivisionFlags } : {}),
    questions,
    requirements: [
      req(`${code.toLowerCase()}.taxId`, "taxId", L(`${taxId.label.es} válido`, `Valid ${taxId.label.en}`), taxId.hint),
      req(`${code.toLowerCase()}.legalName`, "field", L("Razón social registrada", "Registered legal name"),
        L(`Como aparece ante ${authority}.`, `As registered with ${authority}.`), { field: "legalName" }),
      ...requirements,
    ],
    sources,
  };
}

const eInvoicingEnabled = (code, system, authority) => req(`${code}.einvoicing`, "declaration",
  L(`Habilitado para emitir ${system}`, `Enabled to issue ${system}`),
  L(`Confirma que emites comprobantes electrónicos válidos ante ${authority}.`, `Confirm you issue valid electronic invoices with ${authority}.`),
  { input: { type: "boolean" } });

const BR_STATES = ["AC Acre", "AL Alagoas", "AP Amapá", "AM Amazonas", "BA Bahia", "CE Ceará", "DF Distrito Federal",
  "ES Espírito Santo", "GO Goiás", "MA Maranhão", "MT Mato Grosso", "MS Mato Grosso do Sul", "MG Minas Gerais", "PA Pará",
  "PB Paraíba", "PR Paraná", "PE Pernambuco", "PI Piauí", "RJ Rio de Janeiro", "RN Rio Grande do Norte",
  "RS Rio Grande do Sul", "RO Rondônia", "RR Roraima", "SC Santa Catarina", "SP São Paulo", "SE Sergipe", "TO Tocantins"]
  .map((entry) => ({ code: entry.slice(0, 2), name: entry.slice(3), flags: [] }));

module.exports = [
  clearanceCountry({
    code: "GT", name: L("Guatemala", "Guatemala"), currency: "GTQ", timezones: ["America/Guatemala"],
    taxId: { validator: "gt_nit", label: L("NIT", "NIT"), example: "576937K", hint: L("Número con dígito verificador (0-9 o K).", "Number with a check digit (0-9 or K).") },
    system: "FEL", authority: "SAT Guatemala",
    mandate: L("Factura Electrónica en Línea obligatoria, certificada por un certificador autorizado.", "Online e-invoice (FEL) mandatory, certified by an authorized certifier."),
    requirements: [eInvoicingEnabled("gt", "FEL", "SAT Guatemala")],
  }),
  clearanceCountry({
    code: "CR", name: L("Costa Rica", "Costa Rica"), currency: "CRC", timezones: ["America/Costa_Rica"],
    taxId: { validator: "cr_id", label: L("Cédula física o jurídica", "Physical or legal ID"), example: "3101123456", hint: L("9 dígitos (física), 10 (jurídica) u 11-12 (DIMEX).", "9 digits (individual), 10 (company) or 11-12 (DIMEX).") },
    system: L("Comprobante electrónico v4.4", "Electronic receipt v4.4"), authority: "Ministerio de Hacienda",
    mandate: L("Obligatorio; la versión 4.4 del esquema rige desde septiembre de 2025.", "Mandatory; schema version 4.4 applies since September 2025."),
    requirements: [eInvoicingEnabled("cr", "comprobantes v4.4", "Hacienda")],
  }),
  clearanceCountry({
    code: "PA", name: L("Panamá", "Panama"), currency: "USD", timezones: ["America/Panama"],
    taxId: { validator: "pa_ruc", label: L("RUC", "RUC"), example: "155596713-2-2015", hint: L("RUC con su dígito verificador (DV).", "RUC with its check digit (DV).") },
    system: "SFEP", authority: "DGI Panamá",
    mandate: L("Implementación escalonada del Sistema de Factura Electrónica; confirma tu grupo ante la DGI.", "Phased rollout of the e-invoicing system; confirm your group with the DGI."),
    requirements: [eInvoicingEnabled("pa", "SFEP", "DGI")],
  }),
  clearanceCountry({
    code: "DO", name: L("República Dominicana", "Dominican Republic"), currency: "DOP", timezones: ["America/Santo_Domingo"],
    taxId: { validator: "do_rnc", label: L("RNC o cédula", "RNC or ID number"), example: "101010632", hint: L("RNC de 9 dígitos o cédula de 11.", "9-digit RNC or 11-digit ID.") },
    system: "e-CF", authority: "DGII",
    mandate: L("Ley 32-23: adopción escalonada del e-CF por tamaño de contribuyente.", "Law 32-23: phased e-CF adoption by taxpayer size."),
    requirements: [eInvoicingEnabled("do", "e-CF", "DGII")],
  }),
  clearanceCountry({
    code: "CO", name: L("Colombia", "Colombia"), currency: "COP", timezones: ["America/Bogota"],
    taxId: { validator: "co_nit", label: L("NIT", "NIT"), example: "800197268-4", hint: L("NIT con dígito de verificación.", "NIT with check digit.") },
    system: L("Factura electrónica de venta", "Electronic sales invoice"), authority: "DIAN",
    mandate: L("Obligatoria con validación previa de la DIAN; el RUT define las responsabilidades de IVA.", "Mandatory with DIAN prior validation; the RUT defines VAT responsibilities."),
    requirements: [
      eInvoicingEnabled("co", "facturación electrónica", "DIAN"),
      req("co.rut", "document", L("RUT actualizado", "Updated RUT"), L("Registro Único Tributario con responsabilidades vigentes.", "Tax registry with current responsibilities.")),
    ],
  }),
  clearanceCountry({
    code: "EC", name: L("Ecuador", "Ecuador"), currency: "USD", timezones: ["America/Guayaquil"],
    taxId: { validator: "ec_ruc", label: L("RUC", "RUC"), example: "1790011674001", hint: L("13 dígitos con código de provincia.", "13 digits with a province code.") },
    system: L("Comprobantes electrónicos", "Electronic receipts"), authority: "SRI",
    mandate: L("Obligatorios para contribuyentes con RUC.", "Mandatory for taxpayers with a RUC."),
    requirements: [eInvoicingEnabled("ec", "comprobantes electrónicos", "SRI")],
  }),
  clearanceCountry({
    code: "PE", name: L("Perú", "Peru"), currency: "PEN", timezones: ["America/Lima"],
    taxId: { validator: "pe_ruc", label: L("RUC", "RUC"), example: "20131312955", hint: L("11 dígitos (10 persona natural, 20 empresa).", "11 digits (10 individual, 20 company).") },
    system: "CPE", authority: "SUNAT",
    mandate: L("Comprobantes de pago electrónicos obligatorios, vía SEE u OSE.", "Mandatory electronic payment receipts via SEE or an OSE."),
    requirements: [eInvoicingEnabled("pe", "CPE", "SUNAT")],
  }),
  clearanceCountry({
    code: "CL", name: L("Chile", "Chile"), currency: "CLP", timezones: ["America/Santiago", "America/Punta_Arenas"],
    taxId: { validator: "cl_rut", label: L("RUT", "RUT"), example: "60803000-K", hint: L("RUT con dígito verificador (0-9 o K).", "RUT with check digit (0-9 or K).") },
    system: "DTE", authority: "SII",
    mandate: L("Documentos tributarios electrónicos obligatorios desde 2018.", "Electronic tax documents mandatory since 2018."),
    requirements: [
      eInvoicingEnabled("cl", "DTE", "SII"),
      req("cl.activity", "declaration", L("Inicio de actividades ante el SII", "Business start registered with the SII"), L("Necesario para emitir DTE.", "Required to issue DTEs."), { input: { type: "boolean" } }),
    ],
  }),
  clearanceCountry({
    code: "AR", name: L("Argentina", "Argentina"), currency: "ARS", timezones: ["America/Argentina/Buenos_Aires", "America/Argentina/Cordoba", "America/Argentina/Mendoza"],
    taxId: { validator: "ar_cuit", label: L("CUIT", "CUIT"), example: "33-69345023-9", hint: L("11 dígitos con dígito verificador.", "11 digits with a check digit.") },
    system: L("Factura electrónica con CAE", "E-invoice with CAE"), authority: "ARCA",
    mandate: L("Obligatoria; cada comprobante obtiene su CAE de ARCA (antes AFIP).", "Mandatory; each invoice obtains its CAE from ARCA (formerly AFIP)."),
    questions: [question("vatStatus", L("Condición frente al IVA", "VAT status"), L("", ""), {
      type: "select", options: [["ri", L("Responsable inscripto", "Registered VAT payer")], ["mono", L("Monotributo", "Simplified regime")], ["exento", L("Exento", "Exempt")]] })],
    requirements: [eInvoicingEnabled("ar", "factura electrónica", "ARCA"),
      req("ar.vatStatus", "field", L("Condición frente al IVA", "VAT status"), L("Define el tipo de comprobante (A, B o C).", "Defines the invoice type (A, B or C)."), { field: "answers.vatStatus" })],
  }),
  clearanceCountry({
    code: "UY", name: L("Uruguay", "Uruguay"), currency: "UYU", timezones: ["America/Montevideo"],
    taxId: { validator: "uy_rut", label: L("RUT", "RUT"), example: "211003420017", hint: L("12 dígitos con dígito verificador.", "12 digits with a check digit.") },
    system: "CFE", authority: "DGI Uruguay",
    mandate: L("Comprobante fiscal electrónico obligatorio para contribuyentes de IVA.", "Electronic fiscal receipt mandatory for VAT taxpayers."),
    requirements: [eInvoicingEnabled("uy", "CFE", "DGI")],
  }),
  clearanceCountry({
    code: "BR", name: L("Brasil", "Brazil"), currency: "BRL", timezones: ["America/Sao_Paulo", "America/Manaus", "America/Bahia", "America/Fortaleza", "America/Recife", "America/Belem", "America/Cuiaba"],
    taxId: { validator: "br_cnpj", label: L("CNPJ", "CNPJ"), example: "33000167000101", hint: L("14 caracteres; desde julio de 2026 los nuevos CNPJ pueden ser alfanuméricos.", "14 characters; since July 2026 new CNPJs may be alphanumeric.") },
    system: "NF-e / NFS-e", authority: "Receita Federal / SEFAZ",
    mandate: L("NF-e (mercancías, estatal) y NFS-e (servicios, estándar nacional). Desde 2026 llevan los campos de CBS e IBS de la reforma tributaria.",
      "NF-e (goods, state level) and NFS-e (services, national standard). Since 2026 they carry the CBS and IBS fields of the tax reform."),
    subdivisions: { label: L("Estado (UF)", "State (UF)"), required: true, items: BR_STATES },
    questions: [question("sellsGoods", L("¿Vendes mercancías (contribuyente de ICMS)?", "Do you sell goods (ICMS taxpayer)?"), L("Requiere inscripción estatal.", "Requires state registration.")),
      question("providesServices", L("¿Prestas servicios (ISS)?", "Do you provide services (ISS)?"), L("Requiere inscripción municipal.", "Requires municipal registration."))],
    requirements: [
      req("br.state", "field", L("Estado (UF)", "State (UF)"), L("Define la SEFAZ que autoriza tus NF-e.", "Defines the SEFAZ that authorizes your NF-e."), { field: "subdivision" }),
      req("br.ie", "declaration", L("Inscripción estatal (IE)", "State registration (IE)"), L("Obligatoria para contribuyentes de ICMS en tu UF.", "Mandatory for ICMS taxpayers in your state."),
        { when: { answer: "sellsGoods" }, input: { type: "text", pattern: "^[0-9A-Za-z./-]{2,20}$" } }),
      req("br.im", "declaration", L("Inscripción municipal (IM)", "Municipal registration (IM)"), L("Necesaria para emitir NFS-e.", "Required to issue NFS-e."),
        { when: { answer: "providesServices" }, input: { type: "text", pattern: "^[0-9A-Za-z./-]{2,20}$" } }),
      info("br.reform", L("Reforma tributaria CBS / IBS", "CBS / IBS tax reform"),
        L("2026 es año de prueba (0.9 % CBS y 0.1 % IBS) con campos obligatorios en el XML; la transición termina en 2033.",
          "2026 is a test year (0.9% CBS and 0.1% IBS) with mandatory XML fields; the transition ends in 2033.")),
    ],
    sources: [source("KPMG - Brazil IBS/CBS e-invoicing calendar (Aug 2026)", "https://kpmg.com/us/en/taxnewsflash/news/2026/08/brazil-ibs-cbs-e-invoicing-implementation-calendar-consumption-tax-reform.html")],
  }),
];
