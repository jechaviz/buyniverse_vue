(function (global) {
"use strict";
function updateSeoMetadata(to, store, currentLang) {
if (!to || typeof document === "undefined") return;
currentLang = currentLang || window.BuyniverseI18n?.currentLocale?.() || "es";
const baseTitle = "Buyniverse · B2B Procurement & Freelance Marketplace";
const routeTitles = {
"/": { es: "Plataforma de Compras B2B y Marketplace", en: "B2B Procurement & Freelance Marketplace" },
"/dashboard": { es: "Panel Principal", en: "Dashboard" },
"/dashboard/overview": { es: "Resumen de Actividad", en: "Activity Overview" },
"/dashboard/timesheets": { es: "Hojas de Tiempo", en: "Timesheets" },
"/dashboard/transactions": { es: "Historial de Transacciones", en: "Transaction History" },
"/dashboard/my-agency": { es: "Mi Agencia", en: "My Agency" },
"/find-talent": { es: "Buscar Talento Verificado", en: "Find Verified Talent" },
"/browse-services": { es: "Explorar Servicios", en: "Browse Services" },
"/saved-jobs": { es: "Trabajos Guardados", en: "Saved Jobs" },
"/procurement": { es: "Centro de Compras B2B", en: "Procurement Cockpit" },
"/procurement/auction": { es: "Subastas Inversas en Vivo", en: "Live Reverse Auctions" },
"/procurement/sourcing": { es: "Sourcing y Rondas RFX", en: "Sourcing & RFX Rounds" },
"/procurement/queue": { es: "Solicitudes de Compra", en: "Purchase Requests Queue" },
"/procurement/execution": { es: "Órdenes y Recepción", en: "Orders & Execution" },
"/procurement/governance": { es: "Gobernanza y Reglas", en: "Governance & Compliance" },
"/procurement/intelligence": { es: "Inteligencia de Gasto", en: "Spend Intelligence" },
"/suppliers": { es: "Directorio de Proveedores", en: "Supplier Directory" },
"/products": { es: "Catálogo de Productos", en: "Product Catalog" },
"/expenses": { es: "Gastos Operativos", en: "Operational Expenses" },
"/invoices": { es: "Facturas CFDI 4.0", en: "CFDI 4.0 Invoices" },
"/invoices/new": { es: "Nueva Factura Electrónica", en: "New Electronic Invoice" },
"/estimates": { es: "Cotizaciones Comerciales", en: "Estimates & Quotes" },
"/payments": { es: "Complementos de Pago", en: "Payment Complements" },
"/payments/new": { es: "Nuevo Pago Fiscal", en: "New Fiscal Payment" },
"/clients": { es: "Clientes", en: "Clients" },
"/leads": { es: "Prospectos Comerciales", en: "Commercial Leads" },
"/projects": { es: "Proyectos y Contratos", en: "Projects & Contracts" },
"/messages": { es: "Mensajería Segura", en: "Secure Messaging" },
"/post-job": { es: "Publicar Proyecto", en: "Post a Project" },
"/admin/issuers": { es: "Configuración de Emisores", en: "Fiscal Issuers Configuration" },
"/profile/billing": { es: "Facturación y Folios", en: "Billing & Folios" }
};
let pageTitle = routeTitles[to.path]?.[currentLang];
if (!pageTitle) {
if (to.params.jobId || (to.path.startsWith("/project/") && to.params.id)) {
const jId = to.params.jobId || to.params.id;
const job = store?.job?.(jId);
pageTitle = job ? `${job.title} · Buyniverse` : "Proyecto · Buyniverse";
} else if (to.params.agencyId) {
const ag = store?.agency?.(to.params.agencyId);
pageTitle = ag ? `${ag.name} · Agencia Buyniverse` : "Agencia · Buyniverse";
} else if (to.params.userId) {
const u = store?.user?.(to.params.userId);
pageTitle = u ? `${u.name} (${u.title || "Perfil"}) · Buyniverse` : "Perfil · Buyniverse";
} else if (to.params.contractId) {
pageTitle = `Contrato ${to.params.contractId} · Buyniverse`;
} else if (to.params.invoiceId) {
pageTitle = `Factura ${to.params.invoiceId} · Buyniverse`;
} else {
const seg = to.path.split("/").filter(Boolean).pop() || "Platform";
pageTitle = (seg.charAt(0).toUpperCase() + seg.slice(1)).replace(/-/g, " ") + " · Buyniverse";
}
} else {
pageTitle = `${pageTitle} · Buyniverse`;
}
const translatedTitle = window.BuyniverseI18n?.t?.(pageTitle) || pageTitle;
document.title = translatedTitle;
const ogTitle = document.querySelector('meta[property="og:title"]');
if (ogTitle) ogTitle.setAttribute("content", translatedTitle);
const twitterTitle = document.querySelector('meta[name="twitter:title"]');
if (twitterTitle) twitterTitle.setAttribute("content", translatedTitle);
const routeDescriptions = {
"/": {
es: "Plataforma SaaS B2B todo en uno: abastecimiento inteligente, subastas inversas, cotizaciones RFX y contratación freelance verificada.",
en: "All-in-one B2B SaaS platform: smart procurement, live reverse auctions, RFX quoting, and verified freelance contracts."
},
"/find-talent": {
es: "Contrata freelancers y agencias verificadas en desarrollo, diseño UI/UX, arquitectura cloud y gestión de compras.",
en: "Hire top verified freelancers and agencies in software development, UI/UX design, cloud architecture, and procurement."
},
"/browse-services": {
es: "Explora catálogo de servicios profesionales empaquetados: auditorías de código, diseño de producto y consultoría.",
en: "Browse catalog of packaged professional gigs: codebase audits, UI/UX sprints, cloud setups, and technical consulting."
},
"/procurement": {
es: "Centro de mando unificado de compras B2B: métricas de gasto, colas de solicitudes, abastecimiento y gobernanza.",
en: "Unified B2B procurement cockpit: spend analytics, request queues, RFX sourcing rounds, and vendor governance."
},
"/procurement/auction": {
es: "Subastas inversas en vivo con ofertas en tiempo real, rankings dinámicos, auto-puja y protección anti-sniping.",
en: "Live reverse auctions featuring real-time bidding, dynamic supplier rankings, auto-bid ceilings, and anti-sniping."
},
"/procurement/sourcing": {
es: "Diseña rondas de cotización RFQ/RFP, compara ofertas multicriterio en bid sheets y adjudica órdenes de compra.",
en: "Design RFQ/RFP quote rounds, evaluate multi-criteria supplier proposals on bid sheets, and award purchase orders."
},
"/procurement/queue": {
es: "Gestión y aprobación de solicitudes de compra con presupuestos, centros de costos y conversión directa a RFX.",
en: "Intake and approval queue for enterprise purchase requests with department budgets and 1-click RFX conversion."
},
"/procurement/execution": {
es: "Órdenes de compra, recepción de mercancías en almacén, conciliación 3-way match y resolución de excepciones.",
en: "Purchase order execution, warehouse goods receipts, automated 3-way invoice matching, and dispute management."
},
"/suppliers": {
es: "Directorio empresarial de proveedores calificados con evaluación de desempeño, ESG, riesgo y cumplimiento.",
en: "Enterprise directory of qualified suppliers with scorecards for quality, on-time delivery, ESG, and financial risk."
},
"/invoices": {
es: "Emisión de facturas electrónicas CFDI 4.0 válidas ante el SAT, descarga de XML/PDF y control fiscal.",
en: "Issue SAT-compliant CFDI 4.0 electronic invoices, XML/PDF downloads, and automated tax retention calculation."
}
};
const customDesc =
routeDescriptions[to.path]?.[currentLang] ||
(currentLang === "es"
? `Buyniverse: ${translatedTitle}. Plataforma SaaS para compras B2B, cotizaciones RFX, contratos y talento freelance.`
: `Buyniverse: ${translatedTitle}. Enterprise platform for B2B procurement, RFX sourcing, contracts, and freelance talent.`);
const metaDesc = document.querySelector('meta[name="description"]');
if (metaDesc) metaDesc.setAttribute("content", customDesc);
const ogDesc = document.querySelector('meta[property="og:description"]');
if (ogDesc) ogDesc.setAttribute("content", customDesc);
const twitterDesc = document.querySelector('meta[name="twitter:description"]');
if (twitterDesc) twitterDesc.setAttribute("content", customDesc);
const canonicalUrl = `https://buyniverse.example.com${to.path === "/" ? "" : to.path}`;
const canonicalLink = document.querySelector('link[rel="canonical"]');
if (canonicalLink) canonicalLink.setAttribute("href", canonicalUrl);
const ogUrl = document.querySelector('meta[property="og:url"]');
if (ogUrl) ogUrl.setAttribute("content", canonicalUrl);
try {
let dynamicSchema = document.getElementById("buyniverse-dynamic-schema");
if (!dynamicSchema) {
dynamicSchema = document.createElement("script");
dynamicSchema.id = "buyniverse-dynamic-schema";
dynamicSchema.type = "application/ld+json";
document.head.appendChild(dynamicSchema);
}
const breadcrumbs = [
{
"@type": "ListItem",
position: 1,
name: currentLang === "es" ? "Inicio" : "Home",
item: "https://buyniverse.example.com/"
}
];
const segments = to.path.split("/").filter(Boolean);
let cumulative = "";
segments.forEach((seg, index) => {
cumulative += "/" + seg;
const label = seg.replace(/-/g, " ");
breadcrumbs.push({
"@type": "ListItem",
position: index + 2,
name: window.BuyniverseI18n?.t(label) || label,
item: `https://buyniverse.example.com${cumulative}`
});
});
const schemaGraph = [
{
"@context": "https://schema.org",
"@type": "BreadcrumbList",
itemListElement: breadcrumbs
}
];
if (to.params.jobId || (to.path.startsWith("/project/") && to.params.id)) {
const jId = to.params.jobId || to.params.id;
const job = store?.job?.(jId);
if (job) {
schemaGraph.push({
"@context": "https://schema.org",
"@type": "JobPosting",
title: job.title,
description: job.description || job.title,
datePosted: "2026-08-01",
validThrough: "2026-12-31",
employmentType: "CONTRACTOR",
hiringOrganization: {
"@type": "Organization",
name: "Buyniverse Client Enterprise"
},
jobLocationType: "TELECOMMUTE",
baseSalary: {
"@type": "MonetaryAmount",
currency: job.currency || "USD",
value: {
"@type": "QuantitativeValue",
value: job.budget || 5000,
unitText: "PROJECT"
}
}
});
}
}
if (to.params.gigId) {
schemaGraph.push({
"@context": "https://schema.org",
"@type": "Service",
name: translatedTitle,
description: customDesc,
provider: {
"@type": "Organization",
name: "Buyniverse Verified Partner"
},
offers: {
"@type": "Offer",
priceCurrency: "USD",
price: "1500"
}
});
}
dynamicSchema.textContent = JSON.stringify({
"@context": "https://schema.org",
"@graph": schemaGraph
});
} catch (err) {
console.debug("[SEO] Schema injection exception:", err);
}
}
global.BuyniverseSeo = { updateSeoMetadata };
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));