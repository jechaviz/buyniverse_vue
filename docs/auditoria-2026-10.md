# Auditoría de Buyniverse y modelo de negocio (2026-10-17)

Reemplaza a `propuesta-comisiones.md`, que tenía errores (ver sección 2). Todo lo marcado **[hecho]** ya está en el repositorio. Lo demás es plan.

## 1. Estado real: qué es autoritativo en el servidor y qué no
| Pieza | Dónde vive hoy | Consecuencia |
|---|---|---|
| Identidad, sesión, CSRF, setup de empresa, demo privada, plataforma, cobranza de timbres | Servidor (PHP + MySQL), con pruebas | Confiable |
| Pujas en vivo (piso, paso, ventana, anti-sniping) | Servidor, libro inmutable | Confiable |
| Necesidad, RFQ, **adjudicación**, orden de compra, recepción, factura, pago | **Blob JSON por usuario (`workspace-state`)**, editable desde el navegador | No auditable, no consultable, sin concurrencia |
| **Tasa de comisión** (`gainShareRate`) | Mismo blob; `setCommercialTerms` la cambia desde el cliente | Cualquier administrador de empresa podría ponerse 0% |
| Claims públicos ("pago en custodia / escrow") | Texto | No existe pasarela ni custodia en el código |

Conclusión: **hoy Buyniverse no puede cobrar su propio modelo de negocio** porque el ahorro, la adjudicación y la tasa los decide el cliente. Antes de cobrar un peso por ahorro, la adjudicación y su liquidación tienen que pasar al servidor. **[Resuelto el 17 oct para subastas en vivo: ver sección 4.]**

## 2. Corrección de lo último que diseñé
1. **Dirección del riesgo equivocada.** Escribí que el riesgo era "inflar el presupuesto". Es al revés: el comprador paga comisión sobre `presupuesto − oferta final`, así que le conviene **bajar** el presupuesto para pagar menos. Si el presupuesto lo fija el comprador, el modelo de "comisión sobre ahorro" se evade solo.
2. **Comisión al proveedor sobre lo adjudicado** (2%): en una subasta inversa el proveedor la mete en su precio, y eso reduce el ahorro que justifica la comisión del comprador. Se anula a sí misma.
3. **Compromiso de 12 compras/año**: no se puede hacer cumplir sin facturación recurrente y sin adjudicación en servidor.
4. **Calculadora pública con tasa fija en 40%**: duplica una constante que también está en `commercial-metrics.js` y en el estado inicial. Al cambiar el modelo habría tres números distintos.
5. **Claims de custodia**: ya corregidos en la cara pública **[hecho]** (portada, pie, registro, textos de acceso). Quedan menciones dentro de la app, plantillas de contrato y FAQ de soporte; hay que revisarlas con el área legal, no reemplazarlas a ciegas.

## 3. Modelo de negocio recomendado: "ahorro verificado con piso"
Principio: cobrar solo lo que Buyniverse **mide en su servidor** y puede **atribuirse**, con un piso que no depende de que el comprador declare nada.

**Comprador (por adjudicación)**
- `comisión = max(piso, tasa × ahorro verificado)`, con tope de **8% del monto adjudicado**.
- **Ahorro verificado** = línea base bloqueada − precio adjudicado. La línea base se **congela al publicar** (con fecha y huella) y no se puede editar después de recibir la primera oferta. Así no se manipula.
- **Tasa estándar 25%** del ahorro verificado. Mensaje publicable: "te quedas con 3 de cada 4 pesos que ahorras". Los tramos se aplican **por tramo**, sobre el ahorro verificado de los últimos 12 meses: 25% hasta MXN 5 millones y 20% por el excedente.
- **Piso por adjudicación:** 0.4% del monto adjudicado, mínimo MXN 3,000 (≈ USD 150). Es lo que protege contra la línea base baja.
- **Sin adjudicación, sin cobro.** Con adjudicación y sin ahorro se cobra el piso (por eso ningún texto público debe decir "sin ahorro, sin comisión").

**Proveedor**
- Responder invitaciones: gratis, hasta 3 al mes. **Sin comisión por adjudicación** (no infla precios).
- **Proveedor verificado**, USD 49/mes: sello, prioridad en el directorio y respuestas ilimitadas. Reutiliza `supplier_compliance`, que ya evalúa documentos por jurisdicción en el servidor.

**Facturación y timbres**
- Paquetes de timbres CFDI con margen sobre el costo del PAC. El módulo de cobranza ya existe. *El costo real por timbre lo conoces tú; el margen se ajusta en la tabla de paquetes.*

**Protección contra fuga (adjudicar fuera de la plataforma)**
- Contacto del proveedor oculto hasta la adjudicación.
- Cláusula en términos: si el comprador contrata fuera con un proveedor al que invitó en los 90 días siguientes al cierre, se factura el piso más la comisión del ahorro que el servidor registró. *Requiere revisión legal.*

### Números (ahorro por compra supuesto, sin supuestos de costos)
| Empresa | Compras/año | Ahorro/compra | Ahorro anual | Comisión anual | Se queda el comprador |
|---|---|---|---|---|---|
| Pequeña | 6 | 4,000 | 24,000 | 6,000 | 75% |
| Mediana | 24 | 12,000 | 288,000 | 70,100 | 76% |
| Corporativa | 80 | 25,000 | 2,000,000 | 412,500 | 79% |

Frente al 40% fijo de hoy, el comprador conserva más y Buyniverse cobra menos por compra. La apuesta es que una tasa que se puede publicar en un anuncio convierte mejor. **No tengo datos de costos ni de conversión**; el piloto debe medirlos antes de fijar la tabla.

### Qué decides tú (con mi recomendación)
1. Tasa estándar 25% y tramo de 20% sobre USD 250 mil. *Recomendado.*
2. Piso 0.4% (mín. USD 150) y tope 8%. *Recomendado.*
3. Proveedor verificado a USD 49/mes. *Recomendado como hipótesis; probar con 10 proveedores.*
4. Cláusula de fuga a 90 días. *Revisión legal antes de publicarla.*
5. Piloto: 5 empresas de una sola categoría, con la comisión en modo "informativo" (se muestra, no se cobra) durante el primer mes.

## 4. Estado de la obra para poder cobrar
**[hecho, 17 oct]** El modelo de la sección 3 ya vive en el servidor:
1. **`commerce_terms`**: términos por defecto y por empresa. Solo los operadores de plataforma los cambian (pestaña 6.2.5 Comisión). Dos modos: **informativo** (se calcula y se muestra, no se cobra) y **cobro** (la liquidación queda como cuenta por cobrar).
2. **`award_settlements`**: una liquidación por sala, escrita una sola vez por el servidor al cerrar la adjudicación, a partir del precio inicial bloqueado de la sala y de la puja ganadora del libro. Los montos no se pueden reescribir ni borrar (triggers). Guarda los términos usados y su huella.
3. **Cálculo único**: `server/modules/commerce/fee.php` en centavos y puntos base. La copia del navegador (`app/lib/commerce.js`) se comprueba contra **300 vectores generados por PHP**, así que la calculadora pública, los paneles y la liquidación dan el mismo número.
4. **Fuente única de la tasa**: `/api/v1/runtime` publica los términos vigentes. El navegador ya no puede fijar su tasa (se retiró `setCommercialTerms` y el selector).
5. **Cobro**: el operador marca la liquidación como cobrada (con clave de rastreo SPEI) o la condona (con motivo). Todo queda en la bitácora de plataforma.

Cómo se opera: arrancar en **informativo** durante el piloto, revisar las liquidaciones que el servidor genera, y cambiar a **cobro** por empresa (o por defecto) cuando los números convenzan.

**Todavía pendiente (no bloquea cobrar):**
- La **línea base** es el precio inicial de la sala, no un presupuesto separado. Un comprador puede abrir la sala con un precio inicial bajo; el piso (0.4%, mínimo MXN 3,000) y el tope son lo que lo protege. Si aparecen abusos, congelar también el presupuesto del evento.
- **Solo las subastas en vivo con libro** se liquidan en servidor. Las cotizaciones RFQ siguen en el estado del navegador.
- **Tramos en otra moneda**: los montos fijos (piso mínimo, umbral anual) solo aplican en la moneda de los términos (MXN). En otra moneda rigen solo los porcentajes.
- **Cláusula de fuga a 90 días** y retiro definitivo del claim de custodia: revisión legal.

## 5. Pipelines y su representación web
**Comprador:** Necesito → (RFQ | subasta en vivo) → adjudicar → orden de compra → recepción (3 vías) → factura CFDI → pago.
**Proveedor:** invitación → cotización/puja → adjudicación → entrega → factura → cobro.

| Tramo | Servidor | Web |
|---|---|---|
| Necesidad y RFQ | No | `/necesito`, `SourcingWorkspace` (599 líneas) |
| Subasta en vivo | Sí (libro) | `LiveAuctionWorkspace` (527) |
| Adjudicación y OC | No | `ProcurementExecution` (350) |
| Factura CFDI | Parcial (timbrado en servidor, registro en blob) | `FiscalPage` (496), `InvoiceViewPage` (350) |
| Pagos y gastos | No | `WorkspacePage` genérica |

### Densificar
- **Cinco pantallas muestran el mismo ahorro** (`MarketplaceValueHub`, `SavingsWaterfall`, `NeedsHome`, `ProcurementCockpit`, `DashboardPage`). Una sola pieza `SavingsSummary` con variantes compacta y completa, alimentada por `commercial-metrics`.
- **"Dinero" (Facturas, Pagos, Gastos) y "Ventas" (cinco pantallas del proveedor)** son vistas de la misma `WorkspacePage`. Una pantalla con pestañas numeradas (`3.1.1`, `3.1.2`…) reduce la barra lateral sin perder acceso; el modelo de pestañas de `lib/menu.js` ya lo soporta.
- **Páginas de más de 450 líneas** (`SourcingWorkspace`, `LiveAuctionWorkspace`, `FiscalPage`): partir por paso del pipeline.

### Optimizar
- **Caché [hecho]:** todo se servía con `no-store`, incluidos los 64 recursos de arranque. Ahora scripts, estilos y componentes se revalidan con ETag y el medio pesado se guarda una semana. HTML y API siguen sin caché. *Verificar en producción tras el despliegue.*
- **129 componentes `.vue` se compilan en el navegador** y la CSP necesita `unsafe-eval`. Precompilar con Vite eliminaría `unsafe-eval`, bajaría el arranque y daría minificación real (hoy la reducción del build es 0.1%).
- **Peso del despliegue:** `dist` pesa 57 MB; unos 25 MB son capturas PNG y videos que la app no carga (solo los usan documentación y el render de video). Excluirlos del build.
- **`workspace-state` como blob único por usuario** impide consultas, analítica y concurrencia. Debe dividirse por entidad (eventos, adjudicaciones, facturas) en tablas, empezando por las que tocan dinero.

### Extender (con el modelo de ahorro como motor de crecimiento)
- **Calculadora con categorías:** `/ahorro/<categoría>` con presupuesto típico precargado y SEO propio; destino natural de anuncios de Facebook.
- **Casos reales anónimos** generados de adjudicaciones cerradas (con permiso del comprador), en lugar de cifras genéricas.
- **Compartir resultado** por WhatsApp desde la calculadora y desde el cierre de una adjudicación.
- **Referidos:** comisión del piso bonificada al comprador que trae a un proveedor que se verifica.
- **Medición de campañas:** el enlace con seguimiento ya existe; falta guardar `utm_*` en el servidor al crear una necesidad, sin datos personales, para atribuir ahorro por canal.
- **Consentimiento:** cualquier píxel de Facebook requiere aviso y consentimiento (LFPDPPP); no se instaló ninguno.

## 6. Qué corregí hoy
- Claims de custodia en la cara pública (portada, pie, registro, accesos).
- Cabeceras de caché (revalidación para código, una semana para medios).
- Esta auditoría reemplaza a la propuesta de comisiones anterior.
- **[17 oct] Liquidación de adjudicación en servidor, términos por empresa, panel de comisión, calculadora con la regla real** (secciones 3 y 4).

## 7. Lo que sigue abierto, y por qué
- **Adjudicación de RFQ en servidor:** misma obra que la subasta, sobre otras tablas.
- **Precompilar con Vite:** cambia todo el arranque; merece su propio release.
- **Ruta `/marketing` sin guardia en el cliente:** no expone datos sensibles (solo un generador de enlaces); el menú la oculta a quien no es operador.
