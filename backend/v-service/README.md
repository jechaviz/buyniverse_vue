# Buyniverse V internal sidecar

Servicio V de referencia para verificar el modelo de ranking de ofertas y la creación de contratos con hitos. No es un API público ni una alternativa al gateway PHP.

## Garantías de diseño

- Bindea exclusivamente a `127.0.0.1`.
- Sólo responde `GET` y `HEAD` en `/healthz`.
- Las rutas restantes devuelven `404`; otros métodos devuelven `405`.
- No usa credenciales, variables de base de datos, estados de usuario ni información demo.
- El puerto se configura con `BUYNIVERSE_V_PORT` y acepta únicamente el rango `1024..65535`.

## Comprobación local

```powershell
C:\git\v\v.exe -check .
C:\git\v\v.exe run .\service.v verify
```

Para una ejecución local controlada: `C:\git\v\v.exe run .\service.v serve`. No publique el puerto ni añada un proxy HTTP sin autenticación de servicio, mTLS, límites de tasa y una revisión de arquitectura.
