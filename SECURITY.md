# Seguridad de Buyniverse Vue

Revisión actualizada el 15 de agosto de 2026 contra OWASP Top 10 para el alcance real de esta aplicación: una demostración estática, sin backend ni autenticación de producción.

## Controles implementados

- A01 — acceso: guardas por rol, propietario y participante en rutas y acciones; facturas, pagos, proyectos, contratos, conversaciones, administración, compras y subastas filtran también por objeto y registran denegaciones.
- A02/A08 — secretos e integridad: no se recopilan claves fiscales; cualquier clave sensible se elimina al serializar; las dependencias CDN están fijadas y protegidas con SRI.
- A03 — inyección: Vue escapa el contenido, no hay sinks HTML dinámicos, todo texto mutable se limita y normaliza, y las exportaciones neutralizan fórmulas CSV.
- A04 — diseño: las transiciones críticas vuelven a comprobar rol, estado, pertenencia, rangos e identidad aunque el botón ya esté oculto.
- A05 — configuración: CSP, `nosniff`, anti-framing, política de permisos, aislamiento de origen y no-cache. El servidor permite sólo HTML, SFC/JS y activos explícitos; ZIP, código del servidor, documentación y métodos distintos de GET/HEAD quedan bloqueados. También valida `Host` para reducir DNS rebinding local.
- A06 — componentes: Vue 3.5.40, Vue Router 4.6.4, UnoCSS 66.7.5, vue3-sfc-loader 0.9.5 y Font Awesome 6.5.1 están fijados. La consulta a GitHub Advisory Database no devolvió avisos aplicables a esas versiones.
- A07 — identidad: el cambio de cuenta está etiquetado como función demo y siempre vuelve al dashboard para invalidar la vista del rol anterior.
- A09 — trazabilidad: los flujos de compras y subastas generan eventos de auditoría; los errores de componentes se capturan sin exponer secretos.
- A10 — solicitudes: el cargador SFC sólo acepta mismo origen, no sigue redirecciones y CSP limita conexiones a `self`.

## Endurecimiento operacional

- Bloqueo de privacidad manual y automático tras 15 minutos de inactividad. En esta demo se reanuda localmente; producción debe exigir reautenticación real.
- Borradores de proyectos, facturas, complementos y solicitudes se guardan sólo en `sessionStorage`, expiran entre 4 y 8 horas y pasan por la misma eliminación de secretos.
- Persistencia principal con escritura diferida, flush al ocultar/cerrar la pestaña, indicador de estado y rechazo de cachés con estructura o volumen anómalos.
- Bitácora local acotada para cambios de identidad demo, denegaciones de acceso y operaciones financieras sensibles. No sustituye un log inmutable en servidor/SIEM.
- Búsqueda global y recientes filtran cada resultado con el rol y la pertenencia activa antes de ofrecer navegación.

## Formularios

Los campos obligatorios muestran `*`, `aria-required` y límites de longitud. Al enviar, el primer campo inválido recibe foco, borde de error, `aria-invalid`, `aria-describedby` y un mensaje `role="alert"`. Los formularios dinámicos y los pasos de wizard se decoran mediante `MutationObserver`.

## Límite arquitectónico

El selector de cuentas no es autenticación y `localStorage` no es una base de datos multiusuario. Esta versión sirve datos ficticios y debe permanecer como demo. Un despliegue con usuarios o datos reales requiere una API que repita autorización, validación, rate limiting, sesiones seguras, auditoría persistente y almacenamiento de secretos en servidor.

El runtime SFC/UnoCSS en navegador requiere `unsafe-eval` y estilos inline en CSP. Para eliminar esas excepciones hay que publicar artefactos precompilados; eso sería otra modalidad de distribución, no esta variante CDN + SFC solicitada.

## Condición para estándares bancarios

Este frontend ya aplica una base OWASP sólida para demostración, pero no debe presentarse como “bank-grade” o certificado por sí solo. El paso a producción exige como mínimo OIDC/OAuth2 con MFA, cookies `HttpOnly`/`Secure`/`SameSite`, autorización ABAC/RBAC en cada API, cifrado administrado con KMS/HSM, tokenización de PII, controles antifraude, límites y doble aprobación, auditoría inmutable enviada a SIEM, gestión de dependencias/SBOM, SAST/DAST/secret scanning en CI, WAF/rate limiting, respaldo/DR y pruebas de penetración independientes. La distribución productiva debe ser precompilada y autoalojar dependencias para retirar `unsafe-eval` y reducir la cadena de suministro CDN.
