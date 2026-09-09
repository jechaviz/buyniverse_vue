# Buyniverse Enterprise B2B Platform

Plataforma integral de compras B2B, subastas inversas en tiempo real, gestión de proveedores y facturación electrónica CFDI 4.0 / SAT.

## Arquitectura del Producto

- **Frontend (Vue 3 CDN/SFC + UnoCSS AOT)**: Interfaz de usuario de alto desempeño, bilingüe (EN/ES), carga inmediata sin parpadeo (Anti-FOUC) y compilación AOT de estilos CSS en dist/app/uno.css.
- **Backend SaaS (PHP LiteSpeed/Apache)**: Gateway fail-closed (index.php, tenant_service.php, auction_service.php, email_service.php) con autenticación federada, cifrado AES-256-GCM y multi-tenancy corporativo estricto.
- **Subsistema Nativo (V-Language)**: Microservicio en V (backend/v-service/) para procesamiento ultrarrápido y lógica autónoma.
- **Motor de Video Lifecycle**: Generador audiovisual Hyperframes en tools/lifecycle-video/ con renders completos en assets/media/.

## Estructura Consolidada del Repositorio

```
buyniverse_vue/
├── app/                  # Código fuente Vue 3 (páginas, componentes, store, router, i18n)
├── assets/               # Medios, identidad de marca, renders 3D y showcase
│   ├── brand/            # Identidad visual, showcase y visualizador 3D interactivo
│   └── media/            # Renders de video (buyniverse-full-lifecycle.mp4)
├── backend/              # Kernel nativo V-Language y especificaciones de backend
│   └── v-service/        # Código fuente V, binarios y mod
├── dist/                 # Artefacto productivo optimizado para despliegue AOT
├── docs/                 # Documentación técnica, manuales y auditorías de UI/Shell
│   ├── audits/           # Reportes de auditoría UI y shell
│   ├── specs/            # Especificaciones y memorias de arquitectura
│   └── PRODUCTION_RUNBOOK.md # Manual de operaciones en producción
├── ops/                  # Herramientas de despliegue y configuración de producción
│   ├── Deploy-Buyniverse.ps1 # Script de despliegue en Spaceship / LiteSpeed
│   ├── buyniverse-runtime.example.php # Plantilla de runtime productivo con MySQL
│   └── migrations/       # Esquema de base de datos y migraciones SQL
├── reference/            # Implementación de referencia (React + TypeScript / Odoo)
├── tools/                # Herramientas de generación de video lifecycle
├── archive/              # Paquetes históricos consolidados y perfiles de prueba
└── scripts/              # Suite de pruebas QA, auditoría profunda y build AOT
```

## Ejecución y Desarrollo Local

Servidor local ligero en Python (sin requerir dependencias pesadas):
```powershell
uv run serve.py --port 4178
```
Abre http://127.0.0.1:4178/buyniverse_vue/.

## Suite de Calidad y Pruebas (QA)

```powershell
# Auditoría general de componentes, rutas, seguridad e i18n
bun scripts/qa.js

# Auditoría profunda de sintaxis y referencias
bun scripts/qa/deepReview.js

# Verificación de ciclo completo de compras y subastas
bun scripts/qa/fullProcurementLifecycle.js
bun scripts/qa/e2eSimulation.js
```

## Compilación y Despliegue Productivo

Para compilar el bundle AOT y desplegar en producción:
```powershell
# 1. Compilación AOT de estilos y artefacto dist/
node scripts/build_dist.js

# 2. Despliegue con cero tiempo de inactividad a Spaceship
powershell -ExecutionPolicy Bypass -File ops/Deploy-Buyniverse.ps1
```

Consulta docs/PRODUCTION_RUNBOOK.md para el manual operativo completo.
