# Modelo SaaS multiempresa y multisucursal

Buyniverse separa la suscripción (`tenant_accounts`) de las razones sociales (`tenant_legal_entities`). Una cuenta puede administrar varias razones sociales/RFC y cada una tiene sucursales y bodegas (`tenant_locations`). Ningún identificador del cliente es una autorización: cada petición recibe un contexto que el servidor vuelve a calcular desde la membresía activa.

## Jerarquía y permisos

```
Principal de identidad (OIDC/LDAP/social)
  └─ Cuenta SaaS / tenant
       ├─ Razón social RFC A
       │    ├─ Sucursal matriz
       │    └─ Bodega CDMX
       └─ Razón social RFC B
            └─ Bodega norte
```

- `owner` y `admin` con alcance `tenant` pueden crear razones sociales, ubicaciones e invitaciones.
- Los alcances `legal_entity` y `location` conceden acceso exclusivamente a esa entidad o ubicación.
- Los proyectos, solicitudes/órdenes de compra, rondas RFX, invitaciones de talento, solicitudes de servicio, facturas y complementos almacenan un `operationalScope` inmutable para la sesión de escritura: tenant, razón social y, cuando se selecciona, sucursal o bodega. El servidor rechaza una escritura cuyo alcance no coincida exactamente con el contexto autorizado.
- La invitación no crea una contraseña local: queda pendiente hasta que un proveedor de identidad corporativo vincule el sujeto verificado.
- El selector de contexto no transmite el tenant como fuente de verdad; el servidor verifica que la membresía permite la entidad y la ubicación solicitadas y devuelve un nuevo estado cifrado por contexto.

## Cuenta personal con Google o Facebook

Una persona que todavía no representa una empresa puede entrar con **Google** o **Facebook** cuando Seguridad haya habilitado el proveedor en la configuración privada del servidor. La primera autenticación crea una cuenta SaaS de tipo `individual`, una membresía `owner` y un espacio personal aislado sin RFC. No se fabrica un RFC ni se habilita a ese espacio para emitir CFDI: para facturar o gestionar una razón social, la persona debe agregar una entidad legal verificada.

El flujo es Authorization Code del lado servidor; Google usa PKCE S256. El navegador nunca recibe `client_secret`, token de proveedor ni una contraseña local. El callback consume `state` de un solo uso, rota la sesión, elimina el código de la URL mediante redirección local y registra el evento en la cadena de auditoría.

Para habilitar cada proveedor, copie los valores de `ops/buyniverse-runtime.example.php` al archivo privado `~/buyniverse-runtime.php`, configure exactamente estas URIs de callback en Google Cloud / Meta:

- `https://buyniverse.com/api/v1/auth/google/callback`
- `https://buyniverse.com/api/v1/auth/facebook/callback`

Mantenga `enabled => false` hasta completar revisión de Seguridad, MFA/conditional access empresarial y la aprobación de Meta que corresponda. Los `*_secret_ref` son referencias operativas: el valor efectivo debe ser entregado al proceso PHP desde el gestor de secretos, nunca desde el repositorio ni el cliente.

## Identidad empresarial preparada

Los secretos no viven en MySQL ni en el artefacto publicado. `ops/buyniverse-runtime.example.php` documenta referencias a secretos fuera del webroot para:

- **Microsoft Entra ID** mediante OIDC Authorization Code + PKCE, issuer fijo por tenant, grupos/claims mapeados a roles Buyniverse.
- **AWS Directory Service / Active Directory** mediante un adaptador servidor a servidor **LDAPS** con verificación de CA, cuenta de servicio de mínimo privilegio y mapeo de grupos. Nunca se consulta LDAP desde el navegador ni se guarda una contraseña LDAP en la aplicación.

Los adaptadores permanecen desactivados y el endpoint falla cerrado hasta que Seguridad entregue issuer/URI, CA, redirect URI, referencias de secretos y mapeo de grupos aprobado.

## Auditoría

Los cambios de contexto, altas de entidad, ubicación e invitación se registran en `tenant_audit_events`. Cada evento tiene hash encadenado y MAC derivado de la clave de cifrado de estado. Triggers de MySQL impiden `UPDATE` o `DELETE` sobre el historial para la cuenta operativa. La exportación a SIEM y retención regulatoria siguen siendo una configuración de plataforma obligatoria antes de procesar datos reales.

## Regla operativa

El selector superior define el destino antes de crear un registro. Con **Todas las ubicaciones**, la operación aplica a toda la razón social; al elegir una **Sucursal** o **Bodega**, el registro queda ligado a esa ubicación. El catálogo de proveedores, talento y servicios sigue siendo de mercado; la invitación, comparación guardada o solicitud generada desde él queda ligada al contexto comprador activo.
