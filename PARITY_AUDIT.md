# React → Vue parity audit

Una ruta se considera cubierta cuando conserva datos demo, navegación, estados vacíos y acciones principales. La existencia del path por sí sola no cuenta como paridad.

| Área | Ruta | Estado Vue | Evidencia funcional |
|---|---|---:|---|
| Shell | navegación, tema, acento, notificaciones | Verificada | Sidebar por rol, tema, seis acentos, dropdown de notificaciones, cambio de usuario y carga asíncrona sin pantalla vacía |
| DataTable | workspaces tabulares | Verificada | Búsqueda, filtros por columna y compuestos AND/OR, orden, drag, resize, columnas, vistas guardadas, selección, paginación, tabla/cards/kanban/dashboard e inline editor tipado |
| Procurement OS | `/procurement/:section?` | Verificada | Cockpit, request/approval, RFX, comparación ponderada, award, live auction, PO/receipt/match, intelligence, workflows, rules, roles, audit y galería fuente |
| Projects | `/projects` | Verificada | Datos persistentes al alternar menús, edición inline y seis registros demo coherentes |
| Project detail | `/project/:id` | Verificada | Details, Providers/Proposals, Milestones/Tasks, Files y Comments con acciones y datos relacionados |
| Post a job | `/post-job/:id?` | Verificada | Wizard RFI/RFP, brief, archivos, equipo, aprobadores, creación y edición |
| Messages | `/messages` | Verificada | Conversaciones por usuario/proyecto, historial y envío persistente |
| Marketplace home | `/` | Verificada | Filtros por texto, categoría, tipo, experiencia y presupuesto; guardados |
| Dashboard | `/dashboard/*` | Verificada | Overview, timesheets, transactions y my-agency dedicados |
| Contest | `/project/:id/contest` | Verificada | Ranking, participación, cierre y adjudicación con notificación |
| Invoice form/view | `/invoices/*` | Verificada | CFDI 4.0, emisor/receptor, conceptos, IVA, edición, impresión, clonación, envío y cancelación SAT |
| Payments | `/payments/*` | Verificada | Complemento 2.0, documento relacionado, saldo anterior/nuevo y prevención de sobrepago |
| Job detail | `/job/:jobId` | Verificada | Q&A, NDA, propuesta, guardado y acciones por rol |
| Client job view | `/client/job/:jobId` | Verificada | Gestión del job y revisión de propuestas (mejora sobre la vista React incompleta) |
| Profile/Billing | `/profile/*` | Verificada | Perfil, bio, skills, reviews, edición, folios y transacciones |
| Agency | `/agency/:agencyId` | Verificada | Miembros, especialidades, portafolio y acceso del owner |
| Contract | `/contract/:contractId` | Verificada | Milestones, release, tareas, timesheet, resumen financiero y mensajes |
| Talent/Gigs | `/find-talent`, `/browse-services`, `/gig/:id` | Verificada | Filtros comerciales, disponibilidad, precio, invitación, solicitud y detalle de alcance |
| Admin issuers | `/admin/issuers` | Verificada | Denegación explícita por rol, RFC/régimen/sucursales/PAC y secretos write-only |

## Evidencia de cierre

- Cobertura de rutas: las 28 rutas declaradas en React tienen equivalente Vue; Vue añade `/post-job/new` mediante parámetro opcional y fallback propio.
- Matriz de navegación: 19 rutas representativas se recorrieron consecutivamente con `BLANK=0`; durante compilación CDN se muestra `Loading workspace…`.
- Persistencia entre menús: `/projects → /invoices → /payments → /projects → /invoices` conservó `6 → 3 → 1 → 6 → 3` registros.
- Roles: Admin obtuvo `Fiscal issuers` y `New issuer`; Freelancer obtuvo `Questions & answers` y `Submit a proposal`.
- DataTable: test determinista confirma reglas numéricas/textuales con AND/OR y creación válida de reglas.
- Validación: todos los scripts SFC y `main.js` se parsearon correctamente con Bun.
- Visual: revisadas capturas 1440×1000 de Project detail, Invoice view y Find talent; jerarquía, shell, modo oscuro, acento, densidad y contraste son coherentes.
- Procurement: siete módulos recorridos; lifecycle request→RFX→award→PO→receipt→match, bidder/admin workspaces, 16 imágenes y viewport móvil verificados dinámicamente.
- Producción: Vue, Vue Router, `vue3-sfc-loader`, UnoCSS y recursos visuales se consumen por CDN; el servidor sólo necesita servir archivos estáticos.

## Mejoras sobre React

- La vista cliente de job, incompleta en React, es funcional en Vue.
- La carga de SFC tiene estado visible, timeout, retry y error recuperable.
- Los datos persistidos se normalizan antes del primer render para evitar diferencias entre rutas.
- Los secretos fiscales no se guardan en almacenamiento del navegador.
