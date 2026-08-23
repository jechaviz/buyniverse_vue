# Seguridad de Buyniverse Vue

Revisión actualizada el 22 de agosto de 2026 contra OWASP Top 10 para el alcance real de esta aplicación: una demostración estática, sin backend ni autenticación de producción.

## Controles implementados

- A01 — acceso: guardas por rol, propietario y participante en rutas y acciones; facturas, pagos, proyectos, contratos, conversaciones, administración, compras y subastas filtran también por objeto y registran denegaciones.
- A02/A08 — secretos e integridad: no se recopilan claves fiscales; cualquier clave sensible se elimina al serializar; las dependencias CDN están fijadas y protegidas con SRI.
- A03 — inyección: Vue escapa el contenido, no hay sinks HTML dinámicos, todo texto mutable se limita y normaliza, los enlaces de tablas sólo aceptan rutas internas y las exportaciones neutralizan fórmulas CSV.
- A04 — diseño: las transiciones críticas vuelven a comprobar rol, estado, pertenencia, rangos e identidad aunque el botón ya esté oculto. Creación y edición en línea usan una regla compartida de valores finitos, con máximos de importe, cantidades, porcentajes y rondas.
- A05 — configuración: CSP, `nosniff`, anti-framing, política de permisos, aislamiento de origen y no-cache. El servidor permite sólo HTML, SFC/JS y activos explícitos; ZIP, código del servidor, documentación y métodos distintos de GET/HEAD quedan bloqueados. El artefacto `dist` no publica dumps, semillas ni código fuente de backend; el shim PHP falla cerrado y no expone despliegue ni administración de BD por HTTP.
- A06 — componentes: Vue 3.5.40, Vue Router 4.6.4, UnoCSS 66.7.5, vue3-sfc-loader 0.9.5 y Font Awesome 6.5.1 están fijados. La consulta a GitHub Advisory Database no devolvió avisos aplicables a esas versiones.
- A07 — identidad: el cambio de cuenta está etiquetado como función demo y siempre vuelve al dashboard para invalidar la vista del rol anterior. Los diálogos, drawers y bloqueo de privacidad mantienen el foco dentro de la capa activa y restauran el foco al cerrarse.
- A09 — trazabilidad: los flujos de compras y subastas generan eventos de auditoría; los errores de componentes se capturan sin exponer secretos. El shell muestra con precisión el guardado local, sin afirmar una sincronización de base de datos inexistente.
- A10 — solicitudes: el cargador SFC sólo acepta mismo origen, no sigue redirecciones y CSP limita conexiones a `self`.

## Publicación verificable

- El despliegue prepara un directorio temporal construido desde `dist` y sólo después reemplaza el webroot. No copia el artefacto encima de un checkout: así no sobreviven `package.json`, `scripts/`, dumps, semillas ni archivos de automatización de una versión anterior.
- Apache y el shim PHP aplican la misma CSP con hash para el único bootstrap inline, HSTS, `Permissions-Policy` compatible con navegadores actuales, `nosniff`, aislamiento de origen, anti-framing y bloqueo explícito de rutas de código, dependencias y operación.
- El modal público ya no acepta correo, contraseña, OTP ni proveedores SSO simulados. Sólo permite elegir perfiles ficticios y advierte que no se ingresen credenciales reales.

## Endurecimiento operacional

- Bloqueo de privacidad manual y automático tras 15 minutos de inactividad. En esta demo se reanuda localmente; producción debe exigir reautenticación real.
- Borradores de proyectos, facturas, complementos y solicitudes se guardan sólo en `sessionStorage`, expiran entre 4 y 8 horas y pasan por la misma eliminación de secretos.
- Persistencia principal con escritura diferida, flush al ocultar/cerrar la pestaña, indicador de estado y rechazo de cachés con estructura o volumen anómalos.
- Bitácora local acotada para cambios de identidad demo, denegaciones de acceso y operaciones financieras sensibles. No sustituye un log inmutable en servidor/SIEM.
- Búsqueda global y recientes filtran cada resultado con el rol y la pertenencia activa antes de ofrecer navegación.

## Formularios

Los campos obligatorios muestran `*`, `aria-required` y límites de longitud. Al enviar, el primer campo inválido recibe foco, borde de error, `aria-invalid`, `aria-describedby` y un mensaje `role="alert"`. Los formularios dinámicos y los pasos de wizard se decoran mediante `MutationObserver`.

## Aislamiento multiempresa y multisucursal

El contexto servidor ahora separa la cuenta SaaS, razón social/RFC, sucursal y bodega. El navegador sólo solicita un cambio de contexto; la API vuelve a resolver la membresía, el alcance y el rol antes de leer o escribir el estado cifrado. Los espacios de trabajo se cifran con AAD ligado a principal + tenant + razón social + ubicación, de modo que no pueden reutilizarse entre contextos.

Las altas de empresa, ubicaciones e invitaciones pasan por la misma autorización. Las invitaciones almacenan correo cifrado y hash HMAC, no crean contraseñas locales, y quedan pendientes hasta vincularse con identidad corporativa. Los eventos relevantes se encadenan y MACean; MySQL rechaza su actualización o borrado. Consulta [MULTITENANCY.md](MULTITENANCY.md) para el modelo completo.

## Límite arquitectónico

El selector de perfiles demo no es autenticación. La cuenta, entidad, sucursal y bodega sí se validan en servidor, pero esta versión sigue sirviendo datos ficticios y debe permanecer como demo hasta enlazar una identidad empresarial real. Un despliegue con usuarios o datos reales requiere OIDC/LDAPS configurado, autorización de cada objeto de negocio en API, rate limiting global, sesiones de servidor, auditoría a SIEM y almacenamiento de secretos administrado.

El runtime SFC/UnoCSS en navegador requiere `unsafe-eval` y estilos inline en CSP. Para eliminar esas excepciones hay que publicar artefactos precompilados; eso sería otra modalidad de distribución, no esta variante CDN + SFC solicitada.

## Condición para estándares bancarios

Este frontend ya aplica una base OWASP sólida para demostración, pero no debe presentarse como “bank-grade” o certificado por sí solo. El paso a producción exige como mínimo OIDC/OAuth2 con MFA, cookies `HttpOnly`/`Secure`/`SameSite`, autorización ABAC/RBAC en cada API, cifrado administrado con KMS/HSM, tokenización de PII, controles antifraude, límites y doble aprobación, auditoría inmutable enviada a SIEM, gestión de dependencias/SBOM, SAST/DAST/secret scanning en CI, WAF/rate limiting, respaldo/DR y pruebas de penetración independientes. La distribución productiva debe ser precompilada y autoalojar dependencias para retirar `unsafe-eval` y reducir la cadena de suministro CDN.
