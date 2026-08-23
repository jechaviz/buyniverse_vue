# Modelo SaaS multiempresa y multisucursal

Buyniverse separa la suscripción (`tenant_accounts`) de las razones sociales (`tenant_legal_entities`). Una cuenta puede administrar varias razones sociales/RFC y cada una tiene sucursales y bodegas (`tenant_locations`). Ningún identificador del cliente es una autorización: cada petición recibe un contexto que el servidor vuelve a calcular desde la membresía activa.

## Jerarquía y permisos

```
Principal de identidad (OIDC/LDAP)
  └─ Cuenta SaaS / tenant
       ├─ Razón social RFC A
       │    ├─ Sucursal matriz
       │    └─ Bodega CDMX
       └─ Razón social RFC B
            └─ Bodega norte
```

- `owner` y `admin` con alcance `tenant` pueden crear razones sociales, ubicaciones e invitaciones.
- Los alcances `legal_entity` y `location` conceden acceso exclusivamente a esa entidad o ubicación.
- La invitación no crea una contraseña local: queda pendiente hasta que un proveedor de identidad corporativo vincule el sujeto verificado.
- El selector de contexto no transmite el tenant como fuente de verdad; el servidor verifica que la membresía permite la entidad y la ubicación solicitadas y devuelve un nuevo estado cifrado por contexto.

## Identidad empresarial preparada

Los secretos no viven en MySQL ni en el artefacto publicado. `ops/buyniverse-runtime.example.php` documenta referencias a secretos fuera del webroot para:

- **Microsoft Entra ID** mediante OIDC Authorization Code + PKCE, issuer fijo por tenant, grupos/claims mapeados a roles Buyniverse.
- **AWS Directory Service / Active Directory** mediante un adaptador servidor a servidor **LDAPS** con verificación de CA, cuenta de servicio de mínimo privilegio y mapeo de grupos. Nunca se consulta LDAP desde el navegador ni se guarda una contraseña LDAP en la aplicación.

Los adaptadores permanecen desactivados y el endpoint falla cerrado hasta que Seguridad entregue issuer/URI, CA, redirect URI, referencias de secretos y mapeo de grupos aprobado.

## Auditoría

Los cambios de contexto, altas de entidad, ubicación e invitación se registran en `tenant_audit_events`. Cada evento tiene hash encadenado y MAC derivado de la clave de cifrado de estado. Triggers de MySQL impiden `UPDATE` o `DELETE` sobre el historial para la cuenta operativa. La exportación a SIEM y retención regulatoria siguen siendo una configuración de plataforma obligatoria antes de procesar datos reales.
