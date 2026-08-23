# Gate de producción — Security First

Estado: el artefacto público está endurecido para una demostración. No debe procesar dinero, credenciales, PII real ni decisiones de negocio hasta completar este gate.

## Controles que el release verifica

- La publicación se genera primero en un directorio temporal desde `dist` y después reemplaza el webroot; el checkout, herramientas, paquetes, semillas y documentación no quedan publicados.
- CSP, HSTS, anti-framing, `nosniff`, aislamiento de origen, política de permisos y `no-store` se aplican tanto a recursos estáticos como a rutas SPA.
- La API PHP permanece cerrada por defecto. Sólo puede reenviar a un backend local configurado explícitamente; no expone administración, despliegue, seed ni base de datos.
- El acceso público es explícitamente demo: no solicita ni simula validación de contraseñas, OTP o SSO.
- El correo transaccional se renderiza en servidor, se encola cifrado e idempotente y sólo puede enviarlo el trabajador CLI; jamás se entrega una clave de proveedor ni el contenido de la cola al navegador.

## Bloqueadores obligatorios para banca

1. OIDC/OAuth 2.1 con MFA resistente a phishing, gestión de sesión en servidor y cookies `HttpOnly`, `Secure`, `SameSite`.
2. Autorización ABAC/RBAC y validación de cada operación en la API; la UI nunca es el control de acceso.
3. Secretos, cifrado y rotación administrados por KMS/HSM; datos financieros tokenizados y cifrados en tránsito y reposo.
4. Bitácora inmutable y correlacionada hacia SIEM, monitoreo de fraude, alertamiento, WAF, rate limiting y protección DDoS.
5. Doble aprobación, límites transaccionales, reconciliación y controles de segregación de funciones en servidor.
6. CI/CD con SAST, DAST, SCA/SBOM, secret scanning, revisión de infraestructura y pruebas de penetración independientes.
7. Artefactos precompilados y dependencias autoalojadas o gobernadas; eliminar `unsafe-eval` y dependencias CDN de la versión bancaria.
8. Evidencia de respaldo, DR, pruebas de restauración, retención regulatoria y evaluación legal/regulatoria aplicable.
9. Dominio de envío con SPF, DKIM y DMARC alineados, proveedor aprobado, monitoreo de rebotes/quejas y una cola de correo operada con alertas.

La aprobación de este documento requiere evidencias técnicas y la aceptación del responsable de seguridad; no se obtiene sólo con cambios de frontend.
