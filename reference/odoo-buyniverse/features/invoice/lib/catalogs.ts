// Mock SAT catalogs for CFDI 4.0
// In a real application, these would be more extensive or fetched from a service.

export const catalogs = {
    UsoCFDI: {
        "G01": "Adquisición de mercancías",
        "G02": "Devoluciones, descuentos o bonificaciones",
        "G03": "Gastos en general",
        "I01": "Construcciones",
        "I02": "Mobiliario y equipo de oficina por inversiones",
        "I08": "Otra maquinaria y equipo",
        "P01": "Por definir",
    },
    RegimenFiscal: {
        "601": "General de Ley Personas Morales",
        "603": "Personas Morales con Fines no Lucrativos",
        "605": "Sueldos y Salarios e Ingresos Asimilados a Salarios",
        "612": "Personas Físicas con Actividades Empresariales y Profesionales",
        "614": "Ingresos por intereses",
        "621": "Incorporación Fiscal",
        "626": "Régimen Simplificado de Confianza",
    },
    FormaPago: {
        "01": "Efectivo",
        "02": "Cheque nominativo",
        "03": "Transferencia electrónica de fondos",
        "04": "Tarjeta de crédito",
        "28": "Tarjeta de débito",
        "99": "Por definir",
    },
    MetodoPago: {
        "PUE": "Pago en una sola exhibición",
        "PPD": "Pago en parcialidades o diferido",
    },
    Moneda: {
        "USD": "Dólar americano",
        "MXN": "Peso Mexicano",
        "EUR": "Euro",
    },
    ObjetoImp: {
        "01": "01 - No objeto de impuesto",
        "02": "02 - Sí objeto de impuesto",
        "03": "03 - Sí objeto del impuesto y no obligado al desglose"
    },
    MotivoCancelacion: {
        "01": "01 - Comprobante emitido con errores con relación",
        "02": "02 - Comprobante emitido con errores sin relación",
        "03": "03 - No se llevó a cabo la operación",
        "04": "04 - Operación nominativa relacionada en una factura global"
    },
    TipoRelacion: {
        "01": "01 - Nota de crédito de los documentos relacionados",
        "02": "02 - Nota de débito de los documentos relacionados",
        "03": "03 - Devolución de mercancía sobre facturas o traslados previos",
        "04": "04 - Sustitución de los CFDI previos",
        "05": "05 - Traslados de mercancías facturados previamente",
        "06": "06 - Factura generada por los traslados previos",
        "07": "07 - CFDI por aplicación de anticipo",
    },
    Exportacion: {
        "01": "01 - No aplica",
        "02": "02 - Definitiva",
        "03": "03 - Temporal",
    },
    Periodicidad: {
        "01": "Diario",
        "02": "Semanal",
        "03": "Quincenal",
        "04": "Mensual",
        "05": "Bimestral",
    },
    Meses: {
        "01": "Enero",
        "02": "Febrero",
        "03": "Marzo",
        "04": "Abril",
        "05": "Mayo",
        "06": "Junio",
        "07": "Julio",
        "08": "Agosto",
        "09": "Septiembre",
        "10": "Octubre",
        "11": "Noviembre",
        "12": "Diciembre",
        "13": "Enero-Febrero",
        "14": "Marzo-Abril",
        "15": "Mayo-Junio",
        "16": "Julio-Agosto",
        "17": "Septiembre-Octubre",
        "18": "Noviembre-Diciembre",
    }
};