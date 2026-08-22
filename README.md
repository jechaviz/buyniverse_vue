# Buyniverse Vue (CDN + SFC)

Réplica estática del frontend Buyniverse que se ejecuta sin Node, bundler ni compilación en el navegador. `package.json` y Bun se usan exclusivamente para QA local y para generar el artefacto `dist` precompilado.

- Vue 3, Vue Router, `vue3-sfc-loader` y UnoCSS se consumen desde CDN con versiones fijas e integridad SRI.
- Los componentes SFC se compilan en el navegador.
- La interfaz funciona en inglés y español; el selector `EN / ES` persiste la preferencia y localiza contenido dinámico, fechas y monedas.
- `../lib/web-common/browser.js` comparte persistencia defensiva, sanitización y validación accesible de formularios.
- `../lib/procurement-common/browser.js` comparte lifecycle, roles, auditoría, scoring, subastas y exportación CSV segura.
- El estado es exclusivamente demo. No hay login ni backend real y no deben guardarse credenciales o secretos operativos.

## Ejecutar sin Node

El servidor incluido usa únicamente la librería estándar de Python, agrega cabeceras OWASP y evita caché obsoleta. Desde esta carpeta:

```powershell
uv run serve.py --port 4178
```

Abre `http://127.0.0.1:4178/buyniverse_vue/`. El servidor resuelve desde `C:\git\websites`, pero su allowlist expone únicamente esta aplicación y los dos scripts compartidos requeridos de `/lib/`; no lista carpetas ni sirve proyectos vecinos.

El CSP conserva `unsafe-eval` y estilos inline porque son requisitos técnicos del compilador SFC y de UnoCSS en runtime. Para producción pública, la siguiente evolución debe precompilar SFC/CSS, eliminar esas excepciones y trasladar autenticación, autorización y validación de negocio a una API.

## Operación diaria

- `Ctrl+K` abre acceso rápido a vistas y objetos permitidos para la cuenta activa.
- El dashboard conserva accesos recientes por cuenta y ofrece acciones frecuentes.
- El estado muestra cuándo está guardado; proyectos, documentos fiscales y solicitudes recuperan borradores efímeros tras un refresh.
- El menú de cuenta permite bloquear la pantalla y también se bloquea tras 15 minutos sin actividad.
- La variante actual es una demo endurecida, no una arquitectura bancaria completa; consulta `SECURITY.md` para el límite y la ruta de producción.

## QA opcional

La aplicación no necesita Bun. Si está disponible, se usa únicamente para auditoría estática:

```powershell
bun scripts/qa.js
```

El QA comprueba rutas, sintaxis SFC, relaciones demo, CSP/SRI, sinks DOM, redacción de secretos, prototype pollution, CSV injection, uploads, guardas de acceso y cobertura interactiva de formularios obligatorios. El detalle del modelo de seguridad está en `SECURITY.md`.
