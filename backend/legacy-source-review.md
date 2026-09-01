# Revisión de importación del backend histórico

Origen revisado: la copia local de Buyniverse escrita en V, situada fuera de este repositorio.

Se incorporó únicamente el núcleo consolidado de dominio V, convertido en `v-service/service.v`. La importación no copia binarios, código C generado, scripts de despliegue específicos del host, proxy PHP histórico, pruebas de conectividad, esquema completo ni semillas.

## Exclusiones deliberadas

- El proxy PHP histórico incluía administración de base de datos, sincronización y arranque de procesos desde HTTP. Es incompatible con el gateway actual, que falla cerrado y bloquea esas rutas.
- El esquema y las semillas históricas eliminaban tablas y no modelaban tenant, empresa legal, ubicación, membresía ni auditoría inmutable. Las migraciones autoritativas están en `ops/migrations/`.
- La copia histórica contenía configuración de conexión embebida. Ninguna configuración ni secreto se transfiere a este repositorio; el único contrato permitido es `ops/buyniverse-runtime.example.php`.
- Los ejecutables, C generado y bundles son artefactos reproducibles y no deben estar bajo control de versiones.
- Las variantes modulares V duplicaban tipos ya presentes en el archivo consolidado y no compilaban juntas. Se conserva una sola fuente verificable.

## Resultado

El monorepo conserva la lógica de ranking y escrow como componente interno auditable, mientras que la capa PHP existente permanece como límite de seguridad y persistencia productivo. No se introdujo una segunda autoridad de datos ni una ruta pública adicional.
