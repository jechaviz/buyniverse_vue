# Keelvar + Oktio procurement integration

Buyniverse conserva su shell Vue 3 CDN/SFC, UnoCSS CDN, glassmorphism, modo oscuro, acento seleccionable, DataTable compartida y estado demo local. La integración no clona dos productos dentro de otro: traduce sus mejores conceptos a un único dominio conectado con proyectos, proveedores, productos, facturas y usuarios existentes.

## Síntesis de los proyectos fuente

### Keelvar clone

- Ciclo de sourcing de extremo a extremo: diseño, invitación, publicación, oferta, análisis, adjudicación, ejecución y automatización.
- Eventos RFI, RFQ, RFP, negociación y subasta; lotes y bid sheet canónico.
- Comparación explicable con ponderaciones de precio, calidad, entrega, riesgo y ESG.
- Escenarios alternativos y decisión con racional permanente.
- Subasta inversa en vivo con piso, reserva, paso mínimo, auto-bid, anti-sniping, moderación y auditoría.
- Scorecards de proveedor, certificaciones, riesgo, ESG y puntualidad.
- Fulfillment, contratos/órdenes, reglas inteligentes, workflows, roles, documentación y trazabilidad.

### Oktio y purchase_mock_proposal

- Cockpit-first: salud, excepciones y acciones inmediatas antes que navegación profunda.
- Lifecycle-first: solicitud → aprobación → RFX → adjudicación → PO → recepción → 3-way match → cierre.
- Exception-first: cada bloqueo tiene motivo, severidad, propietario, siguiente acción e historial.
- Workspaces por rol: buyer, supplier/bidder y admin; misma información, controles distintos.
- IA compacta y estable: tablas densas para listas; workspaces solamente cuando existe una tarea decisional.
- Native-first: reutilizar objetos y vistas existentes antes de inventar una capa paralela.
- Clone como acción de registro: crea Draft editable con referencia al origen y nunca altera el original.

## Traducción a Buyniverse

| Concepto absorbido | Superficie Buyniverse | Implementación |
|---|---|---|
| Cockpit operacional | `/procurement/cockpit` | KPIs, pipeline, spend/savings, excepciones, proveedores y actividad unificada |
| Intake y aprobación | `/procurement/queue` | DataTable, creación, submit, aprobación, aclaración, rechazo y conversión a RFX |
| Diseño de evento | `/procurement/sourcing` | Wizard, RFI/RFQ/RFP/Auction, lotes, deadline, visibilidad y readiness |
| Red de proveedores | Sourcing / Suppliers | Invitación, score, on-time, riesgo, ESG, certificaciones y estado |
| Bid sheet | Sourcing → Bid sheet | Modelo de lotes único, respuestas alineadas, CSV y respuesta demo |
| Comparación y escenarios | Sourcing → Comparison | Ranking ponderado normalizado y escenarios Price/Resilience/ESG |
| Adjudicación explicable | Sourcing → Award | Proveedor, valor, score, racional obligatorio, auditoría y PO conectado |
| Subasta inversa | `/procurement/auction` | Gráfica, timer, rank, historial, bidder/organizer console, auto-bid y guardrails |
| Ejecución | `/procurement/execution` | PO, términos, líneas, recepción parcial, excepciones, documentos y auditoría |
| 3-way match | Execution → 3-way match | PO + goods receipt + factura, tolerancia, bloqueo por excepción y estado final |
| Inteligencia | `/procurement/intelligence` | Spend, ahorro, categorías, escenarios, supplier risk/ESG y exportables |
| Automatización | `/procurement/governance` | Triggers, pasos, runs, success rate y gates humanos |
| Reglas | Governance → Rules | Approval, exclusion, auction, matching, supplier limit y price threshold |
| Roles y configuración | Governance | Matriz role-to-surface, políticas y controles administrativos |
| Auditoría | Governance → Audit | Trail único para requests, eventos, bids, awards, receipts, matching y policy |
| Referencias visuales | Governance → Visual sources | Galería de 16 imágenes canónicas, deduplicadas y trazables |

## Modelo coherente y relaciones

```text
Project ─┬─ PurchaseRequest ─ SourcingEvent ─ Auction
         │                         │              │
         │                         ├─ Quotes ─ Supplier
         │                         └─ Award ──────┘
         │                                  │
         └──────────────────────── PurchaseOrder ─ Receipt ─ Invoice ─ Match
                                                    └─ Exception
```

- Los IDs existentes enlazan `job-*`, `user-*`, `sup-*`, `prod-*`, `PR-*`, `RFQ/RFP/AUC-*`, `PO-*` e `inv-*`.
- Crear una solicitud preserva líneas y propietario; convertirla crea un evento referenciado.
- Adjudicar reutiliza o crea la orden del evento; la orden mantiene request, project, supplier y audit.
- Recibir actualiza líneas y porcentaje; matching crea/enlaza factura demo y registra la transición.
- Toda transición escribe en el audit local del objeto y en el trail global.

## Roles

| Capacidad | Buyer/Client | Supplier/Freelancer | Admin |
|---|:---:|:---:|:---:|
| Solicitar y aprobar | Sí | No | Sí |
| Diseñar, invitar y publicar | Sí | No | Sí |
| Responder y pujar | Vista | Sí | Moderar |
| Comparar y adjudicar | Sí | No | Sí |
| Orden, recepción y match | Sí | Vista | Sí |
| Reporting | Sí | Parcial | Sí |
| Reglas, workflows y configuración | Lectura | Lectura | Escritura |

Las restricciones de esta SPA son UX/defensa en profundidad. En producción, autorización, pujas, adjudicación y matching deben validarse en backend.

## Activos visuales

Se auditaron 79 archivos gráficos, 75 únicos. Para respetar la regla de no duplicación se incorporaron 16 referencias canónicas: ocho imágenes raíz de Oktio y ocho superficies light de la propuesta native-first. El detalle de procedencia y conceptos vive en `assets/procurement/manifest.json`; las variantes repetidas, before/after y copias de referencia permanecen en los proyectos fuente.

La UI no copia su chrome: usa las imágenes como evidencia y extrae jerarquía, densidad, estados, relación entre paneles y patrones de interacción dentro del lenguaje visual premium de Buyniverse.

## Biblioteca compartida

`C:\git\websites\lib\procurement-common\browser.js` concentra:

- estados y metadatos del lifecycle;
- capacidades por rol;
- auditoría y transiciones;
- clonación segura a Draft;
- normalización de pesos y ranking de quotes;
- validación y colocación de pujas inversas;
- CSV y descargas en navegador.

Así, la lógica determinista no queda enterrada ni duplicada en componentes SFC.

## Evidencia de aceptación

- Siete módulos procurement cargados consecutivamente con datos y `window.__buyniverseErrors = []`.
- Flujo probado: nueva solicitud → submit → approve → Create RFX.
- Flujo probado: comparison → supplier selection → rationale → award → purchase order.
- Flujo probado: receive all → create/link invoice → 3-way match.
- Puja válida probada con actualización de ranking y auto-bid; puja fuera del máximo bloqueada.
- Workflow creado como Admin; controles mutables protegidos por rol.
- 16/16 imágenes cargadas, ninguna rota.
- Viewports 1440×1000 y 390×844 verificados; móvil sin overflow global.
- `bun scripts/qa.js` valida SFC, rutas, relaciones demo, ranking, librerías CDN y filtros DataTable.
