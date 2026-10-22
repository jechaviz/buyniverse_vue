# Buyniverse en producción: estado, pendientes del dueño y operación

Actualizado el 22 de octubre de 2026. Complementa `docs/auditoria-2026-10.md` (modelo de negocio y arquitectura).

## 1. Qué está listo y verificado
| Área | Estado |
|---|---|
| Acceso | Inicio de sesión con Google (token verificado en el servidor, nonce de un solo uso, CSRF). Sin contraseñas propias. |
| Aislamiento | Cada acceso se valida en el servidor por empresa, sucursal y rol. Estado de empresa, llaves fiscales, invitaciones y cuenta de cobro, cifrados. |
| Operación de compra | Pedir precios (RFQ) → aprobar propuestas → puja en vivo → ganador. Cotizaciones y pujas inmutables en el servidor. |
| Comisión | Calculada solo en el servidor, liquidación inmutable por adjudicación, modo **informativo** (no se cobra). |
| Facturación CFDI | Timbrado por servidor, wizard de alta de empresa, CSD cifrado. Ambiente de **pruebas** del PAC. |
| Correo | SMTP configurado, SPF y DKIM correctos, cola con reintentos. |
| Demo | Privada, por invitación, sin base de datos ni llaves, sesión propia. |
| Legal | Aviso de privacidad y términos de servicio en `/privacidad` y `/terminos` (ES/EN). |
| Respaldos | Volcado diario de la base, verificado, con rotación (14 diarios + 6 mensuales). Prueba de restauración automatizada. |
| Vigilancia | Revisión cada 5 minutos (base, sitio, correo atorado, respaldo, disco) con alarma por correo. |
| Pruebas | `npm run qa` (más de 130 comprobaciones) y 7 suites de backend contra MariaDB. |

## 2. Lo que solo puede hacer el dueño
Ordenado por urgencia. Ninguno se puede resolver desde el código.

1. **Autorizar el origen en Google Cloud.** En la credencial OAuth de `buyniverse.com`, en *Orígenes de JavaScript autorizados*, agrega `https://buyniverse.com`. Sin eso el botón de Google falla.
2. **Darte acceso de operador.** Inicia sesión una vez en buyniverse.com. Luego, por SSH:
   ```bash
   cd ~/buyniverse.com
   php server/modules/platform/admin.php principals <tu nombre>
   php server/modules/platform/admin.php grant <id>
   ```
3. **Agregar el registro DMARC** (falta; SPF y DKIM ya existen). En el DNS del dominio, un registro TXT:
   - Nombre: `_dmarc`
   - Valor: `v=DMARC1; p=none; rua=mailto:hi@buyniverse.com; fo=1`

   Empieza en `p=none` (solo reporta). Cuando los reportes estén limpios, sube a `p=quarantine`.
4. **Completar los datos legales.** En `app/pages/LegalPage.vue`, en la constante `LEGAL`, llena `entity` (razón social del responsable) y `address` (domicilio). El aviso de privacidad los exige y yo no los conozco.
5. **Revisión legal** del aviso, los términos, la cláusula de fuga a 90 días y las menciones de "Escrow" que quedan en el flujo de freelancers. No se debe lanzar publicidad en Facebook que mencione ahorro o comisiones antes de esa revisión.
6. **Token de producción del PAC (SW)** y cambiar `cfdi.environment` a `production`, solo cuando vayan a emitirse facturas reales. Hoy están en ambiente de pruebas.
7. **Pasar la comisión a cobro** (`informative` → `charging`) en la pestaña 6.2.5 del panel de plataforma, por empresa o por defecto, cuando el piloto lo respalde.

## 3. Primer piloto recomendado
- 5 empresas de una sola categoría, con la comisión en modo informativo durante el primer mes.
- Cada empresa: alta con el wizard, un RFQ real con al menos dos proveedores, aprobación y puja en vivo.
- Medir: cuántos RFQ llegan a puja, el ahorro medido contra el mercado, y qué decide la comisión (ahorro, piso o tope).
- **No se ha probado el flujo completo con cuentas reales en producción.** El piloto es esa prueba.

## 4. Operación
Todo corre en `~/buyniverse.com` (el código) con la configuración en `~/buyniverse-runtime.php` (permisos 0600, fuera del repositorio).

### Respaldos
- Cron: `17 3 * * *` ejecuta `ops.php backup`. Guarda en `~/backups/buyniverse/db-AAAAMMDD-HHMMSS.sql.gz` (0600) con su suma de verificación.
- Un respaldo se rechaza si el archivo está dañado o si el volcado no termina con su pie. En ese caso no se conserva y se envía una alarma.
- Ver estado: `php server/modules/ops/ops.php status`.
- **Restaurar** (en una base vacía, nunca encima de la de producción sin detener el sitio):
  ```bash
  gzip -dc ~/backups/buyniverse/db-AAAAMMDD-HHMMSS.sql.gz | mysql --defaults-extra-file=<archivo con usuario y clave> <base_destino>
  ```
- Los respaldos **no incluyen** `buyniverse-runtime.php` (tiene secretos). Guarda una copia aparte en un gestor de contraseñas.
- Los respaldos están en el mismo servidor. Para un desastre del servidor, copia periódicamente una a otro lugar.

### Vigilancia
- Cron cada 5 minutos: `ops.php check`. Revisa base, sitio público, correos atorados más de 30 minutos, fallas de correo, antigüedad del respaldo (más de 26 horas es problema) y espacio en disco.
- Cada problema nuevo manda un correo a `hi@buyniverse.com` (o a `email.alert_to` si lo configuras). Se repite cada 6 horas mientras siga abierto y se avisa una vez cuando se resuelve.
- Bitácora: `~/backups/buyniverse/ops.log`.
- Si el propio servidor cae, esta vigilancia tampoco corre: conviene además un monitor externo gratuito (por ejemplo UptimeRobot) apuntando a `https://buyniverse.com/api/v1/runtime`.

### Despliegue y reversa
- Desplegar: `powershell -ExecutionPolicy Bypass -File ops/Deploy-Migration.ps1 -Migration <archivo.sql>` (aplica la migración y publica) o `ops/Deploy-Buyniverse.ps1` (solo publica).
- Las migraciones solo agregan tablas y columnas. Para revertir un release, regresa el commit en `main` y vuelve a desplegar; las tablas nuevas no estorban a la versión anterior.

### Cuando algo falla
| Síntoma | Qué revisar |
|---|---|
| Nadie puede entrar | `ops.php status` (base y sitio); origen autorizado en Google Cloud; `~/buyniverse-runtime.php` presente. |
| No llegan correos | `ops.php status` (correos atorados); cron de `email_worker.php`; credenciales SMTP. |
| Una comisión sale rara | Pestaña 6.2.5 del panel: términos vigentes y la liquidación (base, ahorro, piso, tope). |
| Respaldo fallido | `ops.log`; espacio en disco; credenciales de la base. |

## 5. Límites conocidos
- La política de seguridad del navegador necesita `unsafe-eval` porque los componentes se compilan en el navegador. Precompilar eliminaría ese requisito y aceleraría el arranque (proyecto aparte).
- Las partes del flujo que no mueven dinero (mensajes, proyectos, gastos) siguen en el estado de cada empresa, no en tablas. Las adjudicaciones, pujas, cotizaciones y comisiones sí están en el servidor.
- Una subasta directa (sin RFQ previo) no tiene base de mercado; la protegen el piso y el tope.
