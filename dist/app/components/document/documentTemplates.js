(function (global) {
  "use strict";

  var documentTemplates = [
    {
      id: "nda_b2b",
      name: "Acuerdo de Confidencialidad (NDA / Machote)",
      desc: "Formulario base con portada formal, campos configurables, leyendas de secretos y bloque de firmas.",
      icon: "fa-solid fa-user-shield",
      isFormTemplate: true,
      build: function () {
        return [
          {
            id: "sec-cov",
            type: "cover",
            alignVertical: "center",
            title: "ACUERDO DE CONFIDENCIALIDAD & NO DIVULGACIÓN",
            subtitle: "Protección Integral de Secretos Industriales · Buyniverse Escrow",
            content: "Celebrado entre {{EMPRESA_CLIENTE:Buyniverse Inc.}} y {{EMPRESA_PROVEEDOR:TechGlobal Solutions S.A. de C.V.}}.",
            legalDisclaimer: "La información técnica, financiera y comercial contenida en este instrumento es estrictamente confidencial bajo la legislación de propiedad industrial aplicable.",
            versionText: "Versión 2.0 · {{FECHA_FIRMA:20 de Agosto de 2026}} · Custodia Fideicomitida"
          },
          {
            id: "sec-1",
            type: "standard",
            title: "Comparecientes y Declaraciones",
            level: 1,
            pageBreakBefore: true,
            content: "En la ciudad de {{CIUDAD_FIRMA:CDMX}}, a {{FECHA_FIRMA:20 de Agosto de 2026}}, celebran el presente Acuerdo de Confidencialidad:\n\n- **Parte Reveladora:** {{EMPRESA_CLIENTE:Buyniverse Inc.}}, representada por {{REPRESENTANTE_CLIENTE:Lic. Alejandro Ramos}}, con RFC {{RFC_CLIENTE:BUY260101XYZ}}.\n- **Parte Receptora:** {{EMPRESA_PROVEEDOR:TechGlobal Solutions S.A. de C.V.}}, representada por {{REPRESENTANTE_PROVEEDOR:Ing. Carlos Mendoza}}, con RFC {{RFC_PROVEEDOR:TGS190412AB3}}."
          },
          {
            id: "sec-2",
            type: "standard",
            title: "Información Confidencial y Propósito",
            level: 2,
            pageBreakBefore: false,
            content: "La Información Confidencial se transferirá exclusivamente para el propósito de:\n\n> [!NOTE]\n> **Propósito:** {{PROPOSITO_PROYECTO:Evaluación y participación en subasta inversa B2B de desarrollo de software y servicios en la nube}}.\n\nQuedan comprendidos todos los secretos técnicos, código fuente, algoritmos, arquitectura, modelos de precios y bases de datos."
          },
          {
            id: "sec-3",
            type: "standard",
            title: "Obligaciones de No Divulgación y Custodia",
            level: 2,
            pageBreakBefore: false,
            content: "- La Parte Receptora mantendrá la información con el estándar más alto de seguridad y cifrado TLS 1.3.\n- No divulgará a terceros salvo empleados que tengan necesidad estricta de conocerla y hayan firmado convenio similar.\n- Vigencia de la confidencialidad: **{{VIGENCIA_ANIOS:3}} años** posteriores a la firma."
          },
          {
            id: "sec-4",
            type: "standard",
            title: "Penalización por Incumplimiento y Jurisdicción",
            level: 1,
            pageBreakBefore: false,
            content: "> [!WARNING]\n> En caso de divulgación indebida comprobada, la Parte Infractora cubrirá una pena convencional líquida de **{{MONTO_PENALIZACION:$50,000.00 USD}}**, sin perjuicio de los daños y perjuicios reclamables.\n\nPara la interpretación y cumplimiento, las partes se someten a los tribunales de **{{JURISDICCION_CIUDAD:Ciudad de México}}**."
          },
          {
            id: "sec-end",
            type: "section_end",
            alignVertical: "bottom",
            title: "CIERRE Y SUSCRIPCIÓN DE CONFORMIDAD",
            content: "Enteradas las partes del contenido y fuerza legal del presente Acuerdo, lo ratifican y firman por duplicado en la fecha citada al inicio.",
            showSignatures: true
          }
        ];
      }
    },
    {
      id: "rfq_b2b",
      name: "Pliego de Licitación RFQ / RFT (Machote)",
      desc: "Estructura formal con portada, subasta inversa multicriterio y aceptación.",
      icon: "fa-solid fa-file-contract",
      isFormTemplate: true,
      build: function () {
        return [
          {
            id: "sec-cov",
            type: "cover",
            alignVertical: "center",
            title: "PLIEGO DE BASES Y TÉRMINOS DE REFERENCIA",
            subtitle: "{{TITULO_LICITACION:Servicios de Infraestructura Cloud y DevOps}}",
            content: "Convocatoria pública internacional para adquisición de servicios tecnológicos corporativos.",
            legalDisclaimer: "Documento oficial del concurso de compras. Prohibida su alteración o uso fuera del proceso de licitación.",
            versionText: "RFP-2026-042 · Emisión: {{FECHA_LIMITE:30 de Agosto de 2026}}"
          },
          { id: "sec-1", type: "standard", title: "Objeto de la Contratación y Contexto", level: 1, pageBreakBefore: true, content: "Se convoca a personas jurídicas a presentar ofertas para la adquisición de **{{TITULO_LICITACION:Servicios de Infraestructura Cloud y DevOps}}** convocado por **{{EMPRESA_EMISORA:Corporativo Alfa S.A.}}**.\n\n- Presupuesto Máximo de Referencia: **{{PRESUPUESTO_BASE:$35,000.00 USD}}**.\n- Fecha Límite de Recepción: **{{FECHA_LIMITE:30 de Agosto de 2026}}**." },
          { id: "sec-2", type: "standard", title: "Alcance Técnico y Entregables", level: 2, pageBreakBefore: false, content: "| Hito | Entregable Clave | Plazo | % Fondo Escrow |\n| :--- | :--- | :--- | :--- |\n| Hito 1 | {{HITO_1:Diseño de Arquitectura & Prototipo UX}} | 15 días | 30% |\n| Hito 2 | {{HITO_2:Implementación Core & APIs}} | 30 días | 40% |\n| Hito 3 | {{HITO_3:Pruebas de Calidad, QA & Despliegue}} | 15 días | 30% |" },
          { id: "sec-3", type: "standard", title: "Criterios de Ponderación y Subasta BAFO", level: 2, pageBreakBefore: false, content: "- Ponderación Técnica y Scoring SRM: **{{PESO_TECNICO:60%}}**\n- Ponderación Económica en Subasta Inversa: **{{PESO_ECONOMICO:40%}}**\n\n> [!NOTE]\n> Se aplicará el esquema de ganancia compartida Gain-Share sobre el ahorro neto de subasta." },
          { id: "sec-4", type: "standard", title: "Acuerdos de Nivel de Servicio (SLA)", level: 1, pageBreakBefore: false, content: "> [!IMPORTANT]\n> Disponibilidad garantizada mínima de **{{SLA_UPTIME:99.95%}}** con tiempo de respuesta ante incidencias críticas no mayor a **{{TIEMPO_RESPUESTA:30 minutos}}**." },
          {
            id: "sec-end",
            type: "section_end",
            alignVertical: "bottom",
            title: "CONSTANCIA DE ACEPTACIÓN DE BASES",
            content: "El postor declara conocer y aceptar sin reservas las especificaciones técnicas y condiciones del presente pliego.",
            showSignatures: true
          }
        ];
      }
    },
    {
      id: "sla_freelance",
      name: "Contrato de Servicios Freelance & Escrow",
      desc: "Acuerdo de entregables por hitos con custodia en fideicomiso.",
      icon: "fa-solid fa-handshake",
      isFormTemplate: true,
      build: function () {
        return [
          { id: "sec-1", type: "standard", title: "Definición del Servicio", level: 1, pageBreakBefore: false, content: "El Freelancer **{{NOMBRE_FREELANCER:John Doe}}** se compromete con el Cliente **{{NOMBRE_CLIENTE:Acme Corp}}** a ejecutar el proyecto **{{TITULO_PROYECTO:Desarrollo de Aplicación Móvil}}**." },
          { id: "sec-2", type: "standard", title: "Cronograma de Pagos en Fideicomiso", level: 2, pageBreakBefore: false, content: "- Hito 1: 30% contra aprobación de diseño de pantallas\n- Hito 2: 40% contra entrega de código fuente funcional\n- Hito 3: 30% contra puesta en marcha en tiendas de apps" },
          { id: "sec-3", type: "standard", title: "Propiedad Intelectual y Confidencialidad", level: 1, pageBreakBefore: false, content: "La totalidad del código, activos gráficos y propiedad intelectual pasarán a ser propiedad exclusiva del Cliente una vez liberados los fondos en Escrow." }
        ];
      }
    },
    {
      id: "prd_agile",
      name: "PRD / Especificación Técnica Ágil",
      desc: "Historias de usuario, criterios de aceptación y requerimientos no funcionales.",
      icon: "fa-solid fa-code",
      isFormTemplate: false,
      build: function () {
        return [
          { id: "sec-1", type: "standard", title: "Visión del Producto", level: 1, pageBreakBefore: false, content: "Construir una plataforma escalable con micro-frontends y conciliación automática." },
          { id: "sec-2", type: "standard", title: "Historias de Usuario y Criterios de Aceptación", level: 2, pageBreakBefore: false, content: "- [ ] Como comprador, puedo iniciar una subasta BAFO de 60 minutos\n- [ ] Como proveedor, puedo contraofertar en tiempo real" },
          { id: "sec-3", type: "standard", title: "Arquitectura y Seguridad", level: 2, pageBreakBefore: false, content: "> [!NOTE]\n> Cumplimiento estricto con TLS 1.3 y autenticación multi-factor." }
        ];
      }
    }
  ];

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { documentTemplates: documentTemplates };
  }
  global.DocumentTemplates = { documentTemplates: documentTemplates };
})(typeof window !== "undefined" ? window : globalThis);
