# La demo: catálogo real y gente virtual

## El catálogo es real (ElectroPrice)
ElectroPrice (https://electroprice.appniverse.com) es un vendedor real de electrónica en México y, en Buyniverse, el proveedor con lista de precios para compras de hardware. El catálogo de la demo son **162 productos reales** de su inventario: marca, número de parte, precio en MXN, existencias y las especificaciones capturadas, en 17 grupos.
- Origen: las capturas de precios de sus mayoristas (carpeta `out/` de `electroprice-ec`, mayo 2026). `scripts/extract_electroprice_catalog.js` elige la muestra y la guarda en `scripts/data/electroprice-catalog.json`; `scripts/build_demo_catalog.js` la convierte en el catálogo de la demo. No se inventa ningún dato de producto.
- Los precios son los capturados, antes de IVA; los que venían en USD se convirtieron con el tipo de cambio de la propia captura (17.54). Cuando un producto aparece en dos mayoristas, el precio es el menor y la "referencia" es el mayor.
- Los nombres de los mayoristas no salen del script: la demo solo muestra a ElectroPrice.
- No hay dato en la captura del tiempo de entrega ni de las condiciones de pago: se muestran 3 días y "prepago" como valores de la demo. Su calificación y riesgo también son métricas de muestra.
- Los demás proveedores de hardware de la demo (Mayoreo Cómputo MX, ByteBodega…) **son ficticios y no tienen lista de precios**: cotizan bajo pedido. Existen para que una cotización y una puja tengan rivales.
- Para renovar la muestra: `node scripts/extract_electroprice_catalog.js`, `node scripts/build_demo_catalog.js`, `node scripts/build_demo_cast.js` y `node scripts/build_marketplace_catalog.js`.

# La demo con gente virtual

La demo (`/demo/`) no tiene servidor ni base de datos. Para que se vea como un producto vivo, un elenco de **personas virtuales** hace lo que haría gente real. Todo corre en el navegador, solo para verlo.

## Qué hace

**Puja en vivo.** Botón *Iniciar una puja de demostración* (página Ofertas en vivo). Abre una solicitud y una puja reales con seis proveedores virtuales (presupuesto MXN 1,850,000, seis minutos).
- Pujan según su estilo: constante, agresivo, cauteloso, francotirador (solo en los últimos 50 segundos, dispara la extensión anti-francotirador) y farol (abre con una baja grande). Nadie puja por debajo de su propio límite: al llegar se retira y lo dice.
- Conversan en el canal de mensajes: saludan, hacen preguntas aclaratorias (flete, plazo de pago, entregas parciales, garantía, factura, equivalentes, instalación), reaccionan cuando los superan.
- Si el comprador (tú) no responde una pregunta, el equipo interno del cliente lo hace al rato. Si escribes en el canal, el proveedor más indicado responde según el tema; un anuncio le llega a todos por correo.
- Correos simulados: invitación, "te superaron" (máximo uno por minuto por proveedor), pregunta, respuesta, aclaración y cierre.

**Pedido adjudicado.** Al adjudicar, o al abrir la pestaña *Equipos y tareas* de cualquier orden, los equipos de las dos empresas trabajan juntos:
- Proveedor: ejecutivo de cuenta, preventa técnica, logística, facturación. Cliente: solicitante de TI, finanzas, almacén, legal (más tú).
- Se hablan por el hilo del pedido, se pasan tareas (ficha técnica, compatibilidad, drivers firmados, datos fiscales, ventana de recepción, póliza de garantía) y se mandan correos.
- Te dejan una tarea a ti ("Aprobar el calendario de entrega"). Lo que depende de ella espera; si tardas, el proveedor te recuerda por chat y correo.
- Puedes crear tareas para cualquiera de los dos equipos. Si es para alguien del proveedor, la acusa de recibido, la empieza y la termina.

**Controles.** Velocidad de ½× a 4×, pausa, y *Otra puja*. El elenco se ve en la pestaña *Equipo virtual* de la puja y en *Equipos y tareas* del pedido.

## Qué NO es

- **No se envía ningún correo.** Los correos son filas en la bandeja simulada de la demo. Las personas virtuales (76) usan direcciones `@yopmail.com` (un buzón público desechable); el enlace "abrir en Yopmail" de cada destinatario abre una bandeja que seguirá vacía.
- Ninguna de estas personas puede iniciar sesión ni administrar nada (tipo `Contact`, sin acceso, fuera del selector de usuarios).
- No existe fuera de la demo: en producción `castTick` y `startDemoAuction` no hacen nada (hay prueba).

## Dónde está

| Pieza | Archivo |
|---|---|
| Las personas (76) | `app/data/demo.js`, bloque generado por `scripts/build_demo_cast.js` |
| Lo que dicen y hacen (guion, es/en) | `app/lib/demo-cast.js` |
| El motor (pujas, chat, correo, tareas) | `app/store/castActions.js` |
| Pantallas | `pages/procurement/auction/AuctionCastTab.vue`, `pages/procurement/execution/OrderTeamTab.vue`, `components/SimulatedMailbox.vue` |
| Prueba (45 comprobaciones, reloj falso) | `scripts/qa/demoCast.js` |

Para cambiar el guion: edita `app/lib/demo-cast.js` (el motor no cambia). Para cambiar quién está: `scripts/build_demo_cast.js` y vuelve a correrlo.

## Si algún día se quiere correo real
Haría falta un servidor (la demo no tiene), una lista de destinatarios fija en `yopmail.com` y un tope de envíos. Es una decisión aparte: hoy todo es solo visual.
