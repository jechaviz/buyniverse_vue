// The Constancia de Situacion Fiscal reader: the parser is pure, so it is
// tested here with the text layout pdf.js produces (one item per line).
const fs = require("fs");
const path = require("path");
const scope = {};
new Function("window", fs.readFileSync(path.resolve(__dirname, "../../app/lib/constancia.js"), "utf8"))(scope);
const { parse } = scope.BuyniverseConstancia;
const catalog = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../cfdi/sat/catalogos.json"), "utf8")).regimen_fiscal;
const check = (condition, message) => { if (!condition) throw new Error(message); console.log(`[PASS] ${message}`); };

const moral = ["CÉDULA DE IDENTIFICACIÓN FISCAL", "idCIF: 20010123456", "RFC: EKU9003173C9", "Denominación/Razón Social: ESCUELA KEMPER URGATE SA DE CV", "Régimen Capital: SOCIEDAD ANÓNIMA DE CAPITAL VARIABLE",
  "Nombre Comercial: KEMPER", "Fecha inicio de operaciones: 17 DE MARZO DE 1990", "Datos del domicilio registrado", "Código Postal: 06300", "Tipo de Vialidad: AVENIDA", "Nombre de Vialidad: REFORMA",
  "Número Exterior: 100", "Número Interior: 4B", "Nombre de la Colonia: GUERRERO", "Nombre de la Localidad: CIUDAD DE MÉXICO", "Regímenes:", "Régimen", "Fecha de alta", "General de Ley Personas Morales", "01/04/1990"].join("\n");
let r = parse(moral, catalog);
check(r.rfc === "EKU9003173C9", "the RFC is read");
check(r.legalName === "ESCUELA KEMPER URGATE", "the legal name loses its corporate suffix, as the SAT requires for CFDI");
check(r.postalCode === "06300", "the postal code is read");
check(r.regimes.includes("601"), "the regime is matched against the SAT catalogue");
check(r.street === "REFORMA No. 100 Int. 4B", "the street and numbers are assembled");
check(r.neighborhood === "GUERRERO", "the colonia is read");

const person = ["RFC: XAXX010101000", "Nombre (s): MARÍA", "Primer Apellido: PÉREZ", "Segundo Apellido: LÓPEZ", "Fecha de inicio de operaciones: 01/01/2020", "Código Postal: 64000",
  "Regímenes:", "Régimen de Actividades Empresariales y Profesionales"].join("\n");
r = parse(person, catalog);
check(r.legalName === "MARÍA PÉREZ LÓPEZ" && r.rfc === "XAXX010101000", "a person's name is assembled from given name and surnames");
check(r.regimes.includes("612"), "a person's regime is matched");

r = parse("a page that is not a constancia at all", catalog);
check(r.rfc === "" && r.legalName === "" && r.regimes.length === 0, "an unrelated document yields nothing instead of guessing");
console.log("=== CONSTANCIA READER PASSED ===");
