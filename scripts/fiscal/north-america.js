// Mexico, United States and Canada.
"use strict";

const { L, req, info, question, source } = require("./lib");

// ---------------------------------------------------------------------------
// Mexico - CFDI 4.0 clearance through a PAC certified by the SAT.

const MX_STATES = [
  ["AGU", "Aguascalientes", ["20"]], ["BCN", "Baja California", ["21", "22"], ["borderNorth"]],
  ["BCS", "Baja California Sur", ["23"]], ["CAM", "Campeche", ["24"], ["borderSouth"]],
  ["CHP", "Chiapas", ["29", "30"], ["borderSouth"]], ["CHH", "Chihuahua", ["31", "32", "33"], ["borderNorth"]],
  ["CMX", "Ciudad de México", ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16"]],
  ["COA", "Coahuila", ["25", "26", "27"], ["borderNorth"]], ["COL", "Colima", ["28"]],
  ["DUR", "Durango", ["34", "35"]], ["GUA", "Guanajuato", ["36", "37", "38"]], ["GRO", "Guerrero", ["39", "40", "41"]],
  ["HID", "Hidalgo", ["42", "43"]], ["JAL", "Jalisco", ["44", "45", "46", "47", "48", "49"]],
  ["MEX", "Estado de México", ["50", "51", "52", "53", "54", "55", "56", "57"]],
  ["MIC", "Michoacán", ["58", "59", "60", "61"]], ["MOR", "Morelos", ["62"]], ["NAY", "Nayarit", ["63"]],
  ["NLE", "Nuevo León", ["64", "65", "66", "67"], ["borderNorth"]], ["OAX", "Oaxaca", ["68", "69", "70", "71"]],
  ["PUE", "Puebla", ["72", "73", "74", "75"]], ["QUE", "Querétaro", ["76"]], ["ROO", "Quintana Roo", ["77"], ["borderSouth"]],
  ["SLP", "San Luis Potosí", ["78", "79"]], ["SIN", "Sinaloa", ["80", "81", "82"]], ["SON", "Sonora", ["83", "84", "85"], ["borderNorth"]],
  ["TAB", "Tabasco", ["86"], ["borderSouth"]], ["TAM", "Tamaulipas", ["87", "88", "89"], ["borderNorth"]],
  ["TLA", "Tlaxcala", ["90"]], ["VER", "Veracruz", ["91", "92", "93", "94", "95", "96"]], ["YUC", "Yucatán", ["97"]],
  ["ZAC", "Zacatecas", ["98", "99"]],
].map(([code, name, postalPrefixes, flags = []]) => ({ code, name, postalPrefixes, flags }));

// SAT catalogue c_RegimenFiscal. `person`: moral (12-char RFC), fisica (13) or
// both. `supplier`: the regime can issue income CFDI to a business customer.
const MX_REGIMES = [
  ["601", "General de Ley Personas Morales", "moral", true],
  ["603", "Personas Morales con Fines no Lucrativos", "moral", true],
  ["605", "Sueldos y Salarios e Ingresos Asimilados a Salarios", "fisica", false],
  ["606", "Arrendamiento", "fisica", true],
  ["607", "Régimen de Enajenación o Adquisición de Bienes", "fisica", false],
  ["608", "Demás ingresos", "fisica", false],
  ["610", "Residentes en el Extranjero sin Establecimiento Permanente en México", "both", false],
  ["611", "Ingresos por Dividendos (socios y accionistas)", "fisica", false],
  ["612", "Personas Físicas con Actividades Empresariales y Profesionales", "fisica", true],
  ["614", "Ingresos por intereses", "fisica", false],
  ["615", "Régimen de los ingresos por obtención de premios", "fisica", false],
  ["616", "Sin obligaciones fiscales", "fisica", false],
  ["620", "Sociedades Cooperativas de Producción que optan por diferir sus ingresos", "moral", true],
  ["621", "Incorporación Fiscal (solo contribuyentes que permanecen)", "fisica", true],
  ["622", "Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras", "moral", true],
  ["623", "Opcional para Grupos de Sociedades", "moral", true],
  ["624", "Coordinados", "moral", true],
  ["625", "Actividades Empresariales con ingresos a través de Plataformas Tecnológicas", "fisica", true],
  ["626", "Régimen Simplificado de Confianza", "both", true],
].map(([code, name, person, supplier]) => ({ code, name, person, supplier }));

const mexico = {
  code: "MX",
  name: L("México", "Mexico"),
  currency: "MXN",
  timezones: ["America/Mexico_City", "America/Monterrey", "America/Merida", "America/Cancun", "America/Chihuahua",
    "America/Ciudad_Juarez", "America/Hermosillo", "America/Mazatlan", "America/Tijuana", "America/Matamoros",
    "America/Ojinaga", "America/Bahia_Banderas"],
  taxId: { validator: "mx_rfc", label: L("RFC", "RFC (Mexican tax ID)"), example: "EKU9003173C9",
    hint: L("12 caracteres para persona moral, 13 para persona física. No se aceptan RFC genéricos.",
      "12 characters for a company, 13 for an individual. Generic RFCs are not accepted.") },
  invoicing: {
    system: "CFDI 4.0", authority: "SAT", model: "clearance",
    mandate: L("Obligatorio para todo contribuyente. Cada CFDI se timbra con un PAC autorizado por el SAT.",
      "Mandatory for every taxpayer. Each CFDI is stamped by a SAT-authorized PAC."),
    buyniverseIssuance: true,
  },
  regimes: MX_REGIMES,
  subdivisions: { label: L("Estado", "State"), required: true, items: MX_STATES },
  subdivisionFlags: {
    borderNorth: L("Región fronteriza norte: IVA al 8 % y crédito de ISR para contribuyentes inscritos en el padrón del estímulo.",
      "Northern border region: 8% VAT and income-tax credit for taxpayers enrolled in the stimulus register."),
    borderSouth: L("Región fronteriza sur: IVA al 8 % y crédito de ISR para contribuyentes inscritos en el padrón del estímulo.",
      "Southern border region: 8% VAT and income-tax credit for taxpayers enrolled in the stimulus register."),
  },
  questions: [
    question("specializedServices", L("¿Prestas servicios especializados o ejecutas obras especializadas con personal propio en instalaciones del cliente?",
      "Do you provide specialized services or works with your own staff at the customer's premises?"),
      L("Aplica el artículo 15-A de la Ley Federal del Trabajo: se requiere registro REPSE vigente.",
        "Article 15-A of the Federal Labor Law applies: a current REPSE registration is required.")),
  ],
  requirements: [
    req("mx.rfc", "taxId", L("RFC válido", "Valid RFC"),
      L("Estructura, fecha y dígito verificador. No se permiten XAXX010101000 ni XEXX010101000.",
        "Structure, date and check digit. XAXX010101000 and XEXX010101000 are not allowed.")),
    req("mx.legalName", "field", L("Nombre o razón social como en la Constancia", "Legal name exactly as on the tax certificate"),
      L("CFDI 4.0 exige el nombre idéntico al de la Constancia de Situación Fiscal y sin el régimen societario (S.A. de C.V., S. de R.L., etc.).",
        "CFDI 4.0 requires the name exactly as on the tax status certificate, without the corporate suffix (S.A. de C.V., S. de R.L., etc.)."),
      { field: "legalName" }),
    req("mx.regime", "field", L("Régimen fiscal compatible", "Compatible tax regime"),
      L("Debe permitir emitir CFDI de ingreso y corresponder al tipo de persona del RFC.",
        "Must allow issuing income CFDI and match the person type of the RFC."), { field: "taxRegime" }),
    req("mx.state", "field", L("Estado del domicilio fiscal", "State of the fiscal address"),
      L("Determina estímulos regionales y la validación del código postal.", "Drives regional incentives and postal-code validation."),
      { field: "subdivision" }),
    req("mx.postalCode", "field", L("Código postal del domicilio fiscal", "Postal code of the fiscal address"),
      L("Cinco dígitos; el CFDI 4.0 lo valida contra el registrado en el SAT.", "Five digits; CFDI 4.0 validates it against the SAT record."),
      { field: "postalCode" }),
    req("mx.repse", "declaration", L("Folio de registro REPSE", "REPSE registration number"),
      L("Sin REPSE vigente, el cliente pierde la deducción del ISR y el acreditamiento del IVA de esos pagos.",
        "Without a current REPSE registration the customer loses the income-tax deduction and VAT credit on those payments."),
      { when: { answer: "specializedServices" }, input: { type: "text", pattern: "^[A-Za-z0-9/-]{4,40}$" } }),
    req("mx.csf", "document", L("Constancia de Situación Fiscal", "Tax status certificate (CSF)"),
      L("Emitida por el SAT con antigüedad máxima de 90 días.", "Issued by the SAT within the last 90 days."), { maxAgeDays: 90 }),
    req("mx.opinion32d", "document", L("Opinión de cumplimiento (32-D) en sentido positivo", "Positive tax compliance opinion (32-D)"),
      L("Los compradores corporativos la exigen para contratar; se renueva cada 30 días.",
        "Corporate buyers require it before contracting; it is renewed every 30 days."), { maxAgeDays: 30 }),
    req("mx.repseDocument", "document", L("Constancia de registro REPSE", "REPSE registration certificate"),
      L("Aviso de registro vigente ante la STPS.", "Current registration notice from the Ministry of Labor."),
      { when: { answer: "specializedServices" } }),
    req("mx.border", "declaration", L("Padrón del estímulo fiscal fronterizo", "Border tax-stimulus register"),
      L("Solo si estás inscrito puedes facturar con IVA al 8 %. Vigente en 2026 (DOF 31-12-2025); confirma la prórroga para años siguientes.",
        "Only enrolled taxpayers may invoice at 8% VAT. In force for 2026 (DOF 2025-12-31); confirm the extension for later years."),
      { blocking: false, when: { anyFlag: ["borderNorth", "borderSouth"] }, input: { type: "boolean" } }),
    info("mx.paymentComplement", L("Complemento de pago", "Payment complement"),
      L("En ventas a crédito (método PPD) emite el complemento de pago a más tardar el día 5 del mes siguiente al cobro.",
        "For credit sales (PPD method) issue the payment complement by the 5th day of the month after collection.")),
  ],
  sources: [
    source("SAT - Guía de llenado del CFDI con complemento de pagos", "http://omawww.sat.gob.mx/tramitesyservicios/Paginas/documentos/Guia_llenado_pagos.pdf"),
    source("DOF - Decreto de estímulos fiscales región fronteriza", "https://sidof.segob.gob.mx/notas/docFuente/5777697"),
    source("PRODECON - Estímulos región fronteriza norte", "https://www.gob.mx/prodecon/articulos/decreto-de-estimulos-fiscales-region-fronteriza-norte-260496"),
  ],
};

// ---------------------------------------------------------------------------
// United States - no e-invoicing mandate; sales tax is state and local.
// Flags: salesTax, grossReceipts, noSalesTax, localTax, localOnly, homeRule,
// origin (intrastate origin sourcing) and hybrid (origin for some levels).

const US_STATES = [
  ["AL", "Alabama", "salesTax localTax homeRule"], ["AK", "Alaska", "noSalesTax localOnly localTax homeRule"],
  ["AZ", "Arizona", "salesTax localTax origin"], ["AR", "Arkansas", "salesTax localTax"],
  ["CA", "California", "salesTax localTax hybrid"], ["CO", "Colorado", "salesTax localTax homeRule"],
  ["CT", "Connecticut", "salesTax"], ["DE", "Delaware", "noSalesTax grossReceipts"], ["DC", "District of Columbia", "salesTax"],
  ["FL", "Florida", "salesTax localTax"], ["GA", "Georgia", "salesTax localTax"], ["HI", "Hawaii", "grossReceipts localTax"],
  ["ID", "Idaho", "salesTax localTax"], ["IL", "Illinois", "salesTax localTax origin"], ["IN", "Indiana", "salesTax"],
  ["IA", "Iowa", "salesTax localTax"], ["KS", "Kansas", "salesTax localTax"], ["KY", "Kentucky", "salesTax"],
  ["LA", "Louisiana", "salesTax localTax homeRule"], ["ME", "Maine", "salesTax"], ["MD", "Maryland", "salesTax"],
  ["MA", "Massachusetts", "salesTax"], ["MI", "Michigan", "salesTax"], ["MN", "Minnesota", "salesTax localTax"],
  ["MS", "Mississippi", "salesTax localTax origin"], ["MO", "Missouri", "salesTax localTax origin"],
  ["MT", "Montana", "noSalesTax localTax"], ["NE", "Nebraska", "salesTax localTax"], ["NV", "Nevada", "salesTax localTax"],
  ["NH", "New Hampshire", "noSalesTax"], ["NJ", "New Jersey", "salesTax"], ["NM", "New Mexico", "grossReceipts localTax"],
  ["NY", "New York", "salesTax localTax"], ["NC", "North Carolina", "salesTax localTax"], ["ND", "North Dakota", "salesTax localTax"],
  ["OH", "Ohio", "salesTax localTax origin"], ["OK", "Oklahoma", "salesTax localTax"], ["OR", "Oregon", "noSalesTax"],
  ["PA", "Pennsylvania", "salesTax localTax origin"], ["RI", "Rhode Island", "salesTax"], ["SC", "South Carolina", "salesTax localTax"],
  ["SD", "South Dakota", "salesTax localTax"], ["TN", "Tennessee", "salesTax localTax origin"], ["TX", "Texas", "salesTax localTax origin"],
  ["UT", "Utah", "salesTax localTax origin"], ["VT", "Vermont", "salesTax localTax"], ["VA", "Virginia", "salesTax localTax origin"],
  ["WA", "Washington", "salesTax localTax grossReceipts"], ["WV", "West Virginia", "salesTax localTax"],
  ["WI", "Wisconsin", "salesTax localTax"], ["WY", "Wyoming", "salesTax localTax"], ["PR", "Puerto Rico", "salesTax localTax"],
].map(([code, name, flags]) => ({ code, name, flags: flags.split(" ") }));

const unitedStates = {
  code: "US",
  name: L("Estados Unidos", "United States"),
  currency: "USD",
  timezones: ["America/New_York", "America/Chicago", "America/Denver", "America/Phoenix", "America/Los_Angeles",
    "America/Anchorage", "America/Adak", "Pacific/Honolulu", "America/Detroit", "America/Boise",
    "America/Indiana/Indianapolis", "America/Kentucky/Louisville", "America/Puerto_Rico"],
  taxId: { validator: "us_ein", label: L("EIN", "EIN"), example: "12-3456789",
    hint: L("Número de identificación patronal del IRS. Para no almacenar números de Seguro Social, las personas físicas usan su EIN de propietario único.",
      "IRS Employer Identification Number. To avoid storing Social Security numbers, sole proprietors use their sole-proprietor EIN.") },
  invoicing: {
    system: L("Sin sistema federal", "No federal system"), authority: L("IRS y departamentos estatales de ingresos", "IRS and state revenue departments"), model: "none",
    mandate: L("No hay mandato de factura electrónica. El impuesto sobre ventas es estatal, de condado y de ciudad, y se calcula por dirección.",
      "There is no e-invoicing mandate. Sales tax is state, county and city level and is calculated by address."),
    buyniverseIssuance: false,
  },
  subdivisions: { label: L("Estado", "State"), required: true, items: US_STATES, secondLevel: { label: L("Condado", "County"), dataset: "us-counties", requiredWhen: "localTax" } },
  subdivisionFlags: {
    salesTax: L("Impuesto estatal sobre ventas: se requiere permiso para cobrarlo.", "Statewide sales tax: a permit is required to collect it."),
    noSalesTax: L("Sin impuesto estatal sobre ventas.", "No statewide sales tax."),
    localOnly: L("Sin impuesto estatal, pero los municipios y boroughs pueden cobrar impuesto local.", "No state tax, but municipalities and boroughs may levy local sales tax."),
    grossReceipts: L("Impuesto a los ingresos brutos a cargo del vendedor; requiere licencia o registro estatal.", "Gross receipts tax on the seller; requires a state license or registration."),
    localTax: L("Condados y ciudades suman tasas locales: el condado del domicilio es obligatorio.", "Counties and cities add local rates: the business county is required."),
    homeRule: L("Jurisdicciones con autonomía administran su propio impuesto: puede requerirse registro local adicional.", "Home-rule jurisdictions administer their own tax: an additional local registration may be required."),
    origin: L("Ventas dentro del estado se gravan con la tasa del origen (domicilio del vendedor).", "In-state sales are taxed at the origin rate (seller's location)."),
    hybrid: L("Sistema mixto: niveles estatal, de condado y ciudad en origen; impuestos de distrito en destino.", "Hybrid sourcing: state, county and city levels at origin; district taxes at destination."),
  },
  questions: [
    question("sellsTaxable", L("¿Vendes bienes o servicios gravados en tu estado?", "Do you sell taxable goods or services in your state?"),
      L("Si es así necesitas un permiso de impuesto sobre ventas antes de cobrarlo.", "If so you need a sales tax permit before collecting it.")),
  ],
  requirements: [
    req("us.ein", "taxId", L("EIN válido", "Valid EIN"), L("Nueve dígitos con prefijo emitido por el IRS.", "Nine digits with an IRS-issued prefix.")),
    req("us.legalName", "field", L("Nombre legal como en el formulario W-9", "Legal name as on Form W-9"),
      L("Debe coincidir con el registro del IRS para el EIN.", "Must match the IRS record for the EIN."), { field: "legalName" }),
    req("us.state", "field", L("Estado del domicilio comercial", "State of the business address"),
      L("Define impuesto sobre ventas, ingresos brutos y sourcing.", "Defines sales tax, gross receipts and sourcing."), { field: "subdivision" }),
    req("us.county", "field", L("Condado del domicilio comercial", "County of the business address"),
      L("Necesario donde existen tasas locales.", "Required where local rates exist."), { field: "county", when: { flag: "localTax" } }),
    req("us.salesTaxPermit", "declaration", L("Número de permiso de impuesto sobre ventas", "Sales tax permit number"),
      L("Emitido por el departamento de ingresos del estado.", "Issued by the state revenue department."),
      { when: { flag: "salesTax", answer: "sellsTaxable" }, input: { type: "text", pattern: "^[A-Za-z0-9 -]{4,30}$" } }),
    req("us.grossReceipts", "declaration", L("Licencia de impuesto a ingresos brutos", "Gross receipts tax license"),
      L("Hawái (GET), Nuevo México (CRS), Delaware y Washington (B&O) gravan los ingresos del vendedor.",
        "Hawaii (GET), New Mexico (CRS), Delaware and Washington (B&O) tax the seller's receipts."),
      { when: { flag: "grossReceipts" }, input: { type: "text", pattern: "^[A-Za-z0-9 -]{4,30}$" } }),
    req("us.homeRule", "declaration", L("Registro con jurisdicción local autónoma", "Home-rule local registration"),
      L("Confirma si tu ciudad o parroquia administra su propio impuesto.", "Confirm whether your city or parish administers its own tax."),
      { blocking: false, when: { flag: "homeRule" }, input: { type: "boolean" } }),
    req("us.w9", "document", L("Formulario W-9 firmado", "Signed Form W-9"),
      L("El comprador lo usa para emitir el 1099-NEC al cierre del año.", "The buyer uses it to issue Form 1099-NEC at year end.")),
    info("us.nexus", L("Nexo económico", "Economic nexus"),
      L("Tras Wayfair (2018), vender por encima del umbral de un estado (comúnmente USD 100,000) obliga a registrarte y cobrar ahí.",
        "Since Wayfair (2018), selling above a state's threshold (commonly USD 100,000) requires registering and collecting there.")),
  ],
  sources: [
    source("IRS - Instructions for Form W-9", "https://www.irs.gov/forms-pubs/about-form-w-9"),
    source("U.S. Census Bureau - County reference file (2020)", "https://www2.census.gov/geo/docs/reference/codes2020/national_county2020.txt"),
  ],
};

// ---------------------------------------------------------------------------
// Canada - GST/HST federally; QST and PST provincially. No e-invoicing mandate.

const CA_PROVINCES = [
  ["AB", "Alberta", "gst"], ["BC", "British Columbia", "gst pst"], ["MB", "Manitoba", "gst pst"],
  ["NB", "New Brunswick", "hst"], ["NL", "Newfoundland and Labrador", "hst"], ["NS", "Nova Scotia", "hst"],
  ["NT", "Northwest Territories", "gst"], ["NU", "Nunavut", "gst"], ["ON", "Ontario", "hst"],
  ["PE", "Prince Edward Island", "hst"], ["QC", "Québec", "gst qst"], ["SK", "Saskatchewan", "gst pst"], ["YT", "Yukon", "gst"],
].map(([code, name, flags]) => ({ code, name, flags: flags.split(" ") }));

const canada = {
  code: "CA",
  name: L("Canadá", "Canada"),
  currency: "CAD",
  timezones: ["America/Toronto", "America/Vancouver", "America/Edmonton", "America/Winnipeg", "America/Halifax",
    "America/St_Johns", "America/Regina", "America/Montreal", "America/Moncton", "America/Whitehorse", "America/Yellowknife"],
  taxId: { validator: "ca_bn", label: L("Número de empresa (BN)", "Business Number (BN)"), example: "123456782",
    hint: L("Nueve dígitos asignados por la CRA.", "Nine digits assigned by the CRA.") },
  invoicing: {
    system: L("Sin mandato", "No mandate"), authority: "CRA / Revenu Québec", model: "none",
    mandate: L("No hay factura electrónica obligatoria; la factura debe mostrar el número de GST/HST cuando se cobra.",
      "No mandatory e-invoicing; the invoice must show the GST/HST number when tax is charged."),
    buyniverseIssuance: false,
  },
  subdivisions: { label: L("Provincia o territorio", "Province or territory"), required: true, items: CA_PROVINCES },
  subdivisionFlags: {
    gst: L("GST federal.", "Federal GST."), hst: L("HST armonizado (federal + provincial).", "Harmonized HST (federal + provincial)."),
    pst: L("Impuesto provincial sobre ventas con registro propio.", "Provincial sales tax with its own registration."),
    qst: L("QST de Quebec administrado por Revenu Québec.", "Québec QST administered by Revenu Québec."),
  },
  questions: [
    question("gstRegistered", L("¿Estás registrado para GST/HST?", "Are you registered for GST/HST?"),
      L("Los pequeños proveedores (hasta CAD 30,000 en cuatro trimestres) pueden no estarlo.", "Small suppliers (up to CAD 30,000 over four quarters) may be unregistered.")),
    question("sellsTaxable", L("¿Vendes bienes o servicios gravados con impuesto provincial?", "Do you sell goods or services subject to provincial tax?"), L("", "")),
  ],
  requirements: [
    req("ca.bn", "taxId", L("Número de empresa válido", "Valid Business Number"), L("Nueve dígitos con dígito verificador.", "Nine digits with a check digit.")),
    req("ca.legalName", "field", L("Nombre legal registrado", "Registered legal name"), L("Como aparece ante la CRA.", "As registered with the CRA."), { field: "legalName" }),
    req("ca.province", "field", L("Provincia o territorio", "Province or territory"), L("Define GST, HST, PST o QST.", "Defines GST, HST, PST or QST."), { field: "subdivision" }),
    req("ca.gstAccount", "declaration", L("Cuenta GST/HST (RT)", "GST/HST program account (RT)"), L("Formato 123456789RT0001.", "Format 123456789RT0001."),
      { when: { answer: "gstRegistered" }, input: { type: "text", pattern: "^[0-9]{9}\\s?RT\\s?[0-9]{4}$" } }),
    req("ca.smallSupplier", "declaration", L("Declaración de pequeño proveedor", "Small-supplier declaration"),
      L("Confirma que no superas CAD 30,000 en cuatro trimestres consecutivos.", "Confirm you do not exceed CAD 30,000 over four consecutive quarters."),
      { when: { answerNot: "gstRegistered" }, input: { type: "boolean" } }),
    req("ca.qst", "declaration", L("Número de QST", "QST number"), L("Formato 1234567890TQ0001.", "Format 1234567890TQ0001."),
      { when: { flag: "qst", answer: "gstRegistered" }, input: { type: "text", pattern: "^[0-9]{10}\\s?TQ\\s?[0-9]{4}$" } }),
    req("ca.pst", "declaration", L("Número de PST provincial", "Provincial PST number"), L("Columbia Británica, Manitoba o Saskatchewan.", "British Columbia, Manitoba or Saskatchewan."),
      { when: { flag: "pst", answer: "sellsTaxable" }, input: { type: "text", pattern: "^[A-Za-z0-9 -]{4,20}$" } }),
  ],
  sources: [source("CRA - GST/HST registration", "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses.html")],
};

module.exports = [mexico, unitedStates, canada];
