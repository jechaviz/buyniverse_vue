# Backend de Buyniverse

Este repositorio contiene las capas de servidor de Buyniverse junto con el frontend. La distribución pública sigue siendo mínima: `scripts/build_dist.js` publica sólo el artefacto de interfaz y los archivos de runtime explícitamente permitidos. El directorio `backend/` nunca se copia al document root.

## Componentes activos

| Componente | Ubicación | Responsabilidad |
| --- | --- | --- |
| Gateway PHP | `index.php` | API `/api/v1`, sesiones seguras, CSRF, persistencia cifrada, tenencia, autorización y auditoría. |
| Correo transaccional | `email_service.php`, `email_worker.php` | Cola cifrada y envío exclusivo desde worker CLI. |
| Esquema productivo | `ops/migrations/` | Migraciones MySQL por tenant, fiscal, identidad, correo y subastas. |
| Configuración privada | `ops/buyniverse-runtime.example.php` | Contrato de configuración fuera del document root; no contiene secretos reales. |

## Servicio V interno

`v-service/` preserva y endurece el núcleo V recuperado del backend histórico: tipos de dominio, ranking de ofertas y creación de hitos de escrow. Es un **sidecar local sin autoridad**:

- escucha únicamente en `127.0.0.1`;
- expone sólo `GET`/`HEAD /healthz`;
- no contiene credenciales, conexión a base de datos, sesiones ni rutas de negocio;
- no se despliega ni se enruta desde el frontend hasta que exista una integración autenticada, autorizada y revisada.

La API PHP actual es la autoridad de producción. No sustituirla por el sidecar V ni abrir su puerto en un balanceador público.

## Verificación

```powershell
C:\git\v\v.exe -check backend\v-service
C:\git\v\v.exe run backend\v-service\service.v verify
bun run qa
```

`legacy-source-review.md` describe los artefactos del origen que se excluyeron por seguridad y por no ser compatibles con el modelo multiempresa actual.
