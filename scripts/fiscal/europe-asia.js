// Europe (EN 16931 / Peppol era), India, and the generic fallback.
"use strict";

const { L, req, info, question, source } = require("./lib");

function country(code, name, currency, timezones, taxId, invoicing, requirements, extra = {}) {
  return {
    code, name, currency, timezones, taxId,
    invoicing: { buyniverseIssuance: false, ...invoicing },
    questions: extra.questions || [],
    ...(extra.subdivisions ? { subdivisions: extra.subdivisions } : {}),
    ...(extra.subdivisionFlags ? { subdivisionFlags: extra.subdivisionFlags } : {}),
    requirements: [
      req(`${code.toLowerCase()}.taxId`, "taxId", L(`${taxId.label.es} válido`, `Valid ${taxId.label.en}`), taxId.hint),
      req(`${code.toLowerCase()}.legalName`, "field", L("Denominación registrada", "Registered legal name"),
        L("Como figura en el registro fiscal.", "As shown in the tax register."), { field: "legalName" }),
      ...requirements,
    ],
    sources: extra.sources || [],
  };
}

const ES_REGIONS = [
  ["AN", "Andalucía"], ["AR", "Aragón"], ["AS", "Asturias"], ["IB", "Illes Balears"], ["CN", "Canarias", "igic"],
  ["CB", "Cantabria"], ["CL", "Castilla y León"], ["CM", "Castilla-La Mancha"], ["CT", "Cataluña"], ["EX", "Extremadura"],
  ["GA", "Galicia"], ["MD", "Madrid"], ["MC", "Murcia"], ["NC", "Navarra", "foral"], ["VI", "Álava", "ticketbai foral"],
  ["BI", "Bizkaia", "ticketbai foral"], ["SS", "Gipuzkoa", "ticketbai foral"], ["RI", "La Rioja"], ["VC", "Comunitat Valenciana"],
  ["CE", "Ceuta", "ipsi"], ["ML", "Melilla", "ipsi"],
].map(([code, name, flags = ""]) => ({ code, name, flags: flags ? flags.split(" ") : [] }));

const IN_STATES = [
  ["01", "Jammu and Kashmir"], ["02", "Himachal Pradesh"], ["03", "Punjab"], ["04", "Chandigarh"], ["05", "Uttarakhand"],
  ["06", "Haryana"], ["07", "Delhi"], ["08", "Rajasthan"], ["09", "Uttar Pradesh"], ["10", "Bihar"], ["11", "Sikkim"],
  ["12", "Arunachal Pradesh"], ["13", "Nagaland"], ["14", "Manipur"], ["15", "Mizoram"], ["16", "Tripura"], ["17", "Meghalaya"],
  ["18", "Assam"], ["19", "West Bengal"], ["20", "Jharkhand"], ["21", "Odisha"], ["22", "Chhattisgarh"], ["23", "Madhya Pradesh"],
  ["24", "Gujarat"], ["26", "Dadra and Nagar Haveli and Daman and Diu"], ["27", "Maharashtra"], ["29", "Karnataka"],
  ["30", "Goa"], ["31", "Lakshadweep"], ["32", "Kerala"], ["33", "Tamil Nadu"], ["34", "Puducherry"],
  ["35", "Andaman and Nicobar Islands"], ["36", "Telangana"], ["37", "Andhra Pradesh"], ["38", "Ladakh"],
].map(([code, name]) => ({ code, name, flags: [] }));

const peppol = (code) => req(`${code}.peppol`, "declaration", L("Identificador Peppol", "Peppol participant ID"),
  L("Dirección de recepción en la red Peppol (esquema:identificador).", "Receiving address on the Peppol network (scheme:identifier)."),
  { input: { type: "text", pattern: "^[0-9]{4}:[A-Za-z0-9._-]{3,50}$" } });

module.exports = [
  country("ES", L("España", "Spain"), "EUR", ["Europe/Madrid", "Atlantic/Canary", "Africa/Ceuta"],
    { validator: "es_nif", label: L("NIF", "NIF"), example: "B12345674", hint: L("NIF, NIE o CIF con carácter de control.", "NIF, NIE or CIF with control character.") },
    { system: "Verifactu / TicketBAI", authority: "AEAT y haciendas forales", model: "reporting",
      mandate: L("Verifactu obligatorio desde enero de 2027 (sociedades) y julio de 2027 (autónomos). La factura B2B electrónica (Ley Crea y Crece) llegará después para empresas de más de 8 M€.",
        "Verifactu mandatory from January 2027 (companies) and July 2027 (sole traders). B2B e-invoicing (Crea y Crece law) follows later for companies above €8M.") },
    [
      req("es.region", "field", L("Comunidad o territorio", "Region or territory"), L("Los territorios forales y Canarias tienen reglas propias.", "Foral territories and the Canary Islands have their own rules."), { field: "subdivision" }),
      req("es.ticketbai", "declaration", L("Software TicketBAI / Batuz", "TicketBAI / Batuz software"), L("Obligatorio en Álava, Bizkaia y Gipuzkoa.", "Mandatory in Álava, Bizkaia and Gipuzkoa."),
        { when: { flag: "ticketbai" }, input: { type: "boolean" } }),
      req("es.igic", "declaration", L("Alta en IGIC", "IGIC registration"), L("En Canarias se aplica IGIC en lugar de IVA.", "The Canary Islands apply IGIC instead of VAT."), { when: { flag: "igic" }, input: { type: "boolean" } }),
      req("es.ipsi", "declaration", L("Alta en IPSI", "IPSI registration"), L("Ceuta y Melilla aplican IPSI.", "Ceuta and Melilla apply IPSI."), { when: { flag: "ipsi" }, input: { type: "boolean" } }),
    ],
    { subdivisions: { label: L("Comunidad autónoma o territorio", "Region or territory"), required: true, items: ES_REGIONS },
      subdivisionFlags: { ticketbai: L("TicketBAI / Batuz: envío de cada factura a la hacienda foral.", "TicketBAI / Batuz: each invoice is sent to the foral treasury."),
        foral: L("Régimen foral con hacienda propia.", "Foral regime with its own treasury."), igic: L("Impuesto General Indirecto Canario.", "Canary Islands indirect tax (IGIC)."),
        ipsi: L("Impuesto sobre la Producción, los Servicios y la Importación.", "Production, services and import tax (IPSI).") },
      sources: [source("vatcalc - Verifactu delay to 2027", "https://www.vatcalc.com/spain/spain-verifactu-delay-till-jan-2027-for-certified-e-invoicing/")] }),

  country("PT", L("Portugal", "Portugal"), "EUR", ["Europe/Lisbon", "Atlantic/Azores", "Atlantic/Madeira"],
    { validator: "pt_nif", label: L("NIF", "NIF"), example: "501964843", hint: L("9 dígitos con dígito de control.", "9 digits with a check digit.") },
    { system: "SAF-T + ATCUD", authority: "Autoridade Tributária", model: "reporting",
      mandate: L("Software de facturación certificado, código ATCUD y QR; comunicación mensual a la AT.", "Certified invoicing software, ATCUD code and QR; monthly reporting to the AT.") },
    [req("pt.software", "declaration", L("Software de facturación certificado", "Certified invoicing software"), L("Número de certificado de la AT.", "AT certificate number."), { input: { type: "boolean" } })]),

  country("FR", L("Francia", "France"), "EUR", ["Europe/Paris"],
    { validator: "fr_siren", label: L("SIREN", "SIREN"), example: "732829320", hint: L("9 dígitos del registro INSEE.", "9-digit INSEE registration.") },
    { system: L("Factura electrónica vía plataforma autorizada (PA)", "E-invoicing via an approved platform (PA)"), authority: "DGFiP", model: "clearance",
      mandate: L("Desde el 1 de septiembre de 2026 toda empresa debe recibir facturas electrónicas y las grandes y medianas emitirlas; pymes y micro emiten desde septiembre de 2027.",
        "Since 1 September 2026 every company must receive e-invoices and large and mid-sized ones must issue them; SMEs and micro-enterprises issue from September 2027.") },
    [req("fr.platform", "declaration", L("Plataforma autorizada (PA)", "Approved platform (PA)"), L("Nombre de la plataforma registrada ante la DGFiP que recibe tus facturas.", "Name of the DGFiP-registered platform that receives your invoices."),
      { input: { type: "text", pattern: "^.{2,80}$" } })],
    { sources: [source("Avalara - French e-invoicing mandate (Jul 2026)", "https://www.avalara.com/blog/en/europe/2026/07/french-e-invoicing-mandate-readiness.html")] }),

  country("DE", L("Alemania", "Germany"), "EUR", ["Europe/Berlin"],
    { validator: "de_vat", label: L("USt-IdNr.", "VAT ID (USt-IdNr.)"), example: "DE136695976", hint: L("DE seguido de 9 dígitos.", "DE followed by 9 digits.") },
    { system: "XRechnung / ZUGFeRD (EN 16931)", authority: "Bundeszentralamt für Steuern", model: "post-audit",
      mandate: L("Recepción obligatoria desde 2025. Emisión obligatoria desde enero de 2027 (facturación > 800 000 €) y enero de 2028 para el resto.",
        "Reception mandatory since 2025. Issuance mandatory from January 2027 (turnover > €800,000) and January 2028 for everyone else.") },
    [req("de.format", "declaration", L("Emisión en formato EN 16931", "EN 16931 invoice format"), L("XRechnung, ZUGFeRD 2.1+ o Peppol BIS 3.0.", "XRechnung, ZUGFeRD 2.1+ or Peppol BIS 3.0."), { input: { type: "boolean" } })]),

  country("IT", L("Italia", "Italy"), "EUR", ["Europe/Rome"],
    { validator: "it_piva", label: L("Partita IVA", "Partita IVA"), example: "00743110157", hint: L("11 dígitos con dígito de control.", "11 digits with a check digit.") },
    { system: "FatturaPA / SdI", authority: "Agenzia delle Entrate", model: "clearance",
      mandate: L("Factura electrónica B2B obligatoria vía Sistema di Interscambio desde 2019.", "B2B e-invoicing mandatory through the Sistema di Interscambio since 2019.") },
    [req("it.sdi", "declaration", L("Código destinatario SdI o PEC", "SdI recipient code or PEC"), L("7 caracteres o dirección PEC.", "7 characters or a PEC address."),
      { input: { type: "text", pattern: "^([A-Za-z0-9]{7}|[^@\\s]+@[^@\\s]+\\.[^@\\s]+)$" } })]),

  country("BE", L("Bélgica", "Belgium"), "EUR", ["Europe/Brussels"],
    { validator: "be_enterprise", label: L("Número de empresa", "Enterprise number"), example: "0403170701", hint: L("10 dígitos (BCE/KBO).", "10 digits (CBE/KBO).") },
    { system: "Peppol BIS 3.0", authority: "SPF Finances", model: "post-audit",
      mandate: L("Factura electrónica B2B doméstica obligatoria desde el 1 de enero de 2026 vía Peppol.", "Domestic B2B e-invoicing mandatory since 1 January 2026 via Peppol.") },
    [peppol("be")]),

  country("PL", L("Polonia", "Poland"), "PLN", ["Europe/Warsaw"],
    { validator: "pl_nip", label: L("NIP", "NIP"), example: "5261040828", hint: L("10 dígitos con dígito de control.", "10 digits with a check digit.") },
    { system: "KSeF (FA(3))", authority: "Ministerstwo Finansów", model: "clearance",
      mandate: L("KSeF obligatorio desde febrero de 2026 (grandes) y abril de 2026 (resto); microempresas desde enero de 2027.",
        "KSeF mandatory since February 2026 (large) and April 2026 (others); micro-enterprises from January 2027.") },
    [req("pl.ksef", "declaration", L("Acceso a KSeF", "KSeF access"), L("Confirma que emites y recibes en KSeF.", "Confirm you issue and receive through KSeF."), { input: { type: "boolean" } })],
    { sources: [source("EY - Poland KSeF timeline", "https://www.ey.com/en_gl/technical/tax-alerts/poland-announces-new-timeline-for-mandatory-e-invoicing")] }),

  country("GB", L("Reino Unido", "United Kingdom"), "GBP", ["Europe/London"],
    { validator: "gb_vat", label: L("Número de IVA", "VAT number"), example: "GB980780684", hint: L("GB seguido de 9 dígitos.", "GB followed by 9 digits.") },
    { system: "Making Tax Digital", authority: "HMRC", model: "post-audit",
      mandate: L("Registros digitales MTD; la factura electrónica obligatoria está anunciada para abril de 2029.", "MTD digital records; mandatory e-invoicing is announced for April 2029.") },
    [info("gb.ni", L("Irlanda del Norte", "Northern Ireland"), L("Las ventas de mercancías usan el prefijo XI y reglas de IVA de la UE.", "Goods sales use the XI prefix and EU VAT rules."))]),

  country("IN", L("India", "India"), "INR", ["Asia/Kolkata", "Asia/Calcutta"],
    { validator: "in_gstin", label: L("GSTIN", "GSTIN"), example: "27AAPFU0939F1ZV", hint: L("15 caracteres; los dos primeros deben coincidir con el estado.", "15 characters; the first two must match the state.") },
    { system: L("E-invoice (IRN)", "E-invoice (IRN)"), authority: "GSTN / IRP", model: "clearance",
      mandate: L("IRN obligatorio con facturación anual superior a ₹5 crore; con ₹10 crore o más, reporte al IRP dentro de 30 días.",
        "IRN mandatory above ₹5 crore annual turnover; at ₹10 crore or more, report to the IRP within 30 days.") },
    [
      req("in.state", "field", L("Estado o territorio", "State or territory"), L("Debe coincidir con el código del GSTIN.", "Must match the GSTIN state code."), { field: "subdivision" }),
      req("in.irn", "declaration", L("Generación de IRN", "IRN generation"), L("Confirma que registras tus facturas B2B en el IRP.", "Confirm you register B2B invoices with the IRP."),
        { when: { answer: "above5Crore" }, input: { type: "boolean" } }),
    ],
    { questions: [question("above5Crore", L("¿Tu facturación anual ha superado ₹5 crore en algún año desde 2017-18?", "Has your annual turnover exceeded ₹5 crore in any year since 2017-18?"), L("", ""))],
      subdivisions: { label: L("Estado", "State"), required: true, items: IN_STATES } }),

  country("ZZ", L("Otro país", "Another country"), "USD", [],
    { validator: "generic", label: L("Identificación fiscal", "Tax identifier"), example: "", hint: L("El número con el que tu autoridad fiscal te identifica.", "The number your tax authority identifies you with.") },
    { system: L("Según tu país", "Per your country"), authority: L("Autoridad fiscal local", "Local tax authority"), model: "unknown",
      mandate: L("Buyniverse aún no tiene reglas específicas para tu país: el equipo verifica tu registro manualmente.", "Buyniverse has no country-specific rules for you yet: the team verifies your registration manually.") },
    [
      req("zz.countryName", "field", L("País de residencia fiscal", "Country of tax residence"), L("Código ISO de dos letras.", "Two-letter ISO code."), { field: "residenceCountry" }),
      req("zz.formal", "declaration", L("Contribuyente formal", "Formal taxpayer"), L("Declaro que emito comprobantes fiscales válidos en mi país.", "I declare I issue valid tax invoices in my country."), { input: { type: "boolean" } }),
      req("zz.registration", "document", L("Constancia de registro fiscal", "Tax registration certificate"), L("Documento oficial de tu autoridad fiscal.", "Official document from your tax authority.")),
    ]),
];
