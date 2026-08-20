(function (global) {
  "use strict";

  var documentTemplates = [
    {
      id: "rfq_b2b",
      name: "Pliego de Licitación RFQ / RFT",
      desc: "Estructura formal para compra corporativa con subasta inversa y criterios multicriterio.",
      icon: "fa-solid fa-file-contract",
      build: function () {
        return [
          { id: "sec-1", title: "Objeto de la Contratación y Contexto", level: 1, pageBreakBefore: false, content: "Se convoca a personas jurídicas a presentar ofertas para la adquisición del servicio." },
          { id: "sec-2", title: "Alcance Técnico y Entregables", level: 2, pageBreakBefore: false, content: "| Hito | Entregable | Plazo |\n| :--- | :--- | :--- |\n| 1 | Prototipo | 15 días |\n| 2 | Despliegue | 30 días |" },
          { id: "sec-3", title: "Criterios de Ponderación y Subasta BAFO", level: 2, pageBreakBefore: false, content: "- Ponderación Técnica: 60%\n- Ponderación Económica (Subasta Inversa): 40%" },
          { id: "sec-4", title: "Acuerdos de Nivel de Servicio (SLA)", level: 1, pageBreakBefore: true, content: "> [!IMPORTANT]\n> Disponibilidad mínima de 99.9% y soporte técnico 24/7." }
        ];
      }
    },
    {
      id: "sla_freelance",
      name: "Contrato de Servicios Freelance & Escrow",
      desc: "Acuerdo de entregables por hitos con custodia en fideicomiso.",
      icon: "fa-solid fa-handshake",
      build: function () {
        return [
          { id: "sec-1", title: "Definición del Servicio", level: 1, pageBreakBefore: false, content: "El Freelancer se compromete a diseñar y programar los módulos solicitados." },
          { id: "sec-2", title: "Cronograma de Pagos en Fideicomiso", level: 2, pageBreakBefore: false, content: "- Hito 1: 30% contra aprobación de diseño\n- Hito 2: 40% contra entrega de código\n- Hito 3: 30% contra puesta en marcha" },
          { id: "sec-3", title: "Propiedad Intelectual y Confidencialidad", level: 1, pageBreakBefore: false, content: "La totalidad del código y activos pasarán a ser propiedad exclusiva del Cliente." }
        ];
      }
    },
    {
      id: "prd_agile",
      name: "PRD / Especificación Técnica Ágil",
      desc: "Historias de usuario, criterios de aceptación y requerimientos no funcionales.",
      icon: "fa-solid fa-code",
      build: function () {
        return [
          { id: "sec-1", title: "Visión del Producto", level: 1, pageBreakBefore: false, content: "Construir una plataforma escalable con micro-frontends y conciliación automática." },
          { id: "sec-2", title: "Historias de Usuario y Criterios de Aceptación", level: 2, pageBreakBefore: false, content: "- [ ] Como comprador, puedo iniciar una subasta BAFO de 60 minutos\n- [ ] Como proveedor, puedo contraofertar en tiempo real" },
          { id: "sec-3", title: "Arquitectura y Seguridad", level: 2, pageBreakBefore: false, content: "> [!NOTE]\n> Cumplimiento estricto con TLS 1.3 y autenticación multi-factor." }
        ];
      }
    }
  ];

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { documentTemplates: documentTemplates };
  }
  global.DocumentTemplates = { documentTemplates: documentTemplates };
})(typeof window !== "undefined" ? window : globalThis);
