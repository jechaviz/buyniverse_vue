# @local/procurement-common

Núcleo de dominio para demos de procurement que funcionan directamente en el navegador, sin Node ni build.

```html
<script src="../lib/procurement-common/browser.js"></script>
```

Expone `window.ProcurementCommon` con:

- flujo canónico request → approval → sourcing → award → order → receipt → match → close;
- metadatos de estado y capacidades por rol;
- transiciones y eventos de auditoría;
- clonación segura de registros a Draft;
- scoring normalizado y ranking multicriterio de ofertas;
- validación y registro de pujas inversas;
- exportación CSV y descargas browser-only.

La librería no contiene UI ni estado global de una aplicación. Cada consumidor conserva su propio store.
