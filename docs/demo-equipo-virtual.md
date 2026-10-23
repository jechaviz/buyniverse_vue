# La demo: catálogo real y gente virtual

## El catálogo es real y completo (ElectroPrice)
ElectroPrice (https://electroprice.appniverse.com) es un vendedor real de electrónica en México y, en Buyniverse, el proveedor con lista de precios para compras de hardware. El catálogo de la demo es **todo su catálogo: 20,576 productos reales** en 22 grupos (6,240 en existencia y el resto bajo pedido), con marca, número de parte, nombre, precio en MXN y las especificaciones capturadas.
- Origen: las capturas de precios de sus mayoristas (`out/` de `electroprice-ec`, mayo 2026). `scripts/extract_electroprice_catalog.js` las une por número de parte y escribe `app/data/electroprice/` (un archivo por grupo más `index.json`, 4.3 MB en total) y `scripts/data/electroprice-costs.json` (solo para la prueba; nunca se sirve). No se inventa ningún dato de producto.
- La demo los carga por grupos en segundo plano (`app/lib/electroprice-catalog.js`) y se puede buscar mientras cargan. Solo se convierte en producto del espacio de trabajo lo que se agrega a una lista.
- **Los precios capturados son el costo de ElectroPrice.** El precio que ve el comprador es ese costo más un 35% sobre costo (`MARKUP` en el extractor), para que al negociar por volumen quede 10-15% sobre el costo (un descuento de hasta 15% sigue dejando más de 10%). El costo no sale del repositorio y la prueba verifica los dos márgenes en los 20,576 productos.
- Los costos son los capturados, antes de IVA; los que venían en USD se convirtieron con el tipo de cambio de la propia captura (17.54). Si un producto está en dos mayoristas, el costo es el menor entre los que tienen existencia y la "referencia" parte del mayor.
- Un producto con existencia se entrega en 3 días; uno bajo pedido, en 12. Ese dato no viene en las capturas: es un valor de la demo, igual que las condiciones de pago ("prepago") y la calificación y el riesgo de ElectroPrice.
- Los nombres de los mayoristas no salen del script: la demo solo muestra a ElectroPrice (la prueba lo verifica). No se publican las imágenes (apuntan a los servidores de los mayoristas).
- Los archivos del catálogo solo se entregan dentro de `/demo/` con sesión (`.htaccess`, `index.php` y pruebas en `demoAccess.js` y `backendIntegration.js`).
- Los demás proveedores de hardware de la demo (Mayoreo Cómputo MX, ByteBodega…) **son ficticios y no tienen lista de precios**: cotizan bajo pedido, para que una cotización y una puja tengan rivales.
- Para renovar: `node scripts/extract_electroprice_catalog.js`, `node scripts/build_demo_catalog.js`, `node scripts/build_demo_cast.js` y `node scripts/build_marketplace_catalog.js`.

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
