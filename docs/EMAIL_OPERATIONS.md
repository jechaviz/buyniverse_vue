# Correo transaccional seguro

El catálogo fuente es [`email_templates.json`](../email_templates.json). Contiene 46 plantillas bilingües (`en` y `es`) para identidad, acceso multiempresa, proyectos, RFX, subastas, compras, facturación, comunicaciones y cumplimiento. Los textos se renderizan exclusivamente en PHP; los valores se limitan y escapan antes de crear HTML.

## Cobertura de flujos

| Dominio | Plantillas |
| --- | --- |
| Identidad | verificación, bienvenida, código de acceso, 2FA, recuperación, cambio de contraseña/correo, inicio nuevo, bloqueo y vinculación social |
| Empresa | invitación, aceptación, cambio o revocación de acceso, empresa y sucursal/bodega creadas |
| Marketplace | proyecto, propuesta, adjudicación, hitos y documentos candidatos |
| Sourcing | invitación RFI/RFQ/RFP, recordatorio, aclaración, oferta, adjudicación y no adjudicación |
| Subasta | invitación, apertura, cierre próximo y cierre |
| Compras y facturación | aprobación, orden, recepción, excepción de match, CFDI, factura y pagos |
| Gobierno | comunicados, revisión de cumplimiento y alerta de auditoría |

La creación de una invitación de empresa y una cuenta personal de Google con correo verificado ya insertan un mensaje en la cola como parte de la misma transacción y dejan evidencia encadenada en auditoría. Los demás IDs están disponibles para los comandos de dominio del backend; nunca deben dispararse desde el navegador con destinatarios arbitrarios.

## Datos y controles

- `tenant_email_outbox` guarda destinatario, asunto y cuerpo cifrados AES-256-GCM; los índices utilizan HMAC y digest, no PII en claro.
- La clave de idempotencia está aislada por tenant. Reintentos de proveedor usan backoff acotado; el trabajador marca mensajes expirados o fallidos sin revelar su contenido.
- `email_service.php`, `email_worker.php` y el catálogo están bloqueados por HTTP. El worker rechaza cualquier ejecución que no sea CLI.
- Las URL de CTA exigen HTTPS (HTTP únicamente para loopback local), y el transporte hacia el proveedor valida TLS y no sigue redirecciones.

## Activación controlada

1. Aplique `ops/migrations/20260823_email_outbox.sql` con una cuenta de migración temporal; luego devuélvala a permisos DML.
2. En el archivo privado `~/buyniverse-runtime.php`, copie el bloque `email` de `ops/buyniverse-runtime.example.php`. Para SpaceMail se usa `provider => 'smtp_ssl'`, host `mail.spacemail.com` y puerto `465`; la contraseña permanece solamente en ese archivo con modo `0600` o en un gestor de secretos.
3. Configure SPF, DKIM y DMARC para el dominio `from_email`; valide el buzón, los dominios y el tratamiento de rebotes/quejas antes de poner `enabled => true`.
4. Cree un cron privado, por ejemplo cada minuto:

   ```text
   /opt/alt/php84/usr/bin/php /home/AGINGR_IOU/buyniverse.com/email_worker.php 25 >/dev/null 2>&1
   ```

   Sustituya `AGINGR_IOU` por el home real de cPanel. El cron no requiere acceso HTTP y debe ejecutar con el mismo usuario que lee `~/buyniverse-runtime.php`.
5. Monitoree `queued`, `retry`, `failed`, `expired` y `sent`; alerte por cualquier acumulación, rebote o fallo de autenticación del proveedor.

No active contraseñas, recuperación ni OTP en el frontend demo. Esas plantillas quedan listas para el servicio de identidad aprobado, que debe generar códigos de uso único con expiración, rate limits, protección anti-enumeración y auditoría.
