# Acceso social en buyniverse.com

Buyniverse no guarda contraseñas: las personas entran con Google, Microsoft,
LinkedIn o Facebook mediante el flujo *Authorization Code* del servidor
(`identity_service.php`). Un proveedor aparece en el modal de acceso en cuanto
queda habilitado en la configuración de runtime del servidor; los que no están
configurados simplemente no se muestran.

Cada proveedor exige que el dueño de la cuenta cree una aplicación en su consola.
Ese paso no se puede automatizar: requiere tu inicio de sesión y aceptar los
términos de cada plataforma.

## 1. Crear las aplicaciones

URI de redirección exactas (una por proveedor; deben coincidir carácter por carácter):

| Proveedor | Consola | URI de redirección |
|---|---|---|
| Google | Google Cloud Console → APIs y servicios → Credenciales → ID de cliente OAuth (aplicación web) | `https://buyniverse.com/api/v1/auth/google/callback` |
| Microsoft | Microsoft Entra admin center → Registros de aplicaciones → Nuevo registro → *Cuentas de cualquier directorio organizativo y cuentas personales de Microsoft* → Web | `https://buyniverse.com/api/v1/auth/microsoft/callback` |
| LinkedIn | LinkedIn Developers → Create app → Products: *Sign In with LinkedIn using OpenID Connect* → Auth | `https://buyniverse.com/api/v1/auth/linkedin/callback` |
| Facebook | Meta for Developers → Crear app → *Inicio de sesión con Facebook* → Configuración | `https://buyniverse.com/api/v1/auth/facebook/callback` |

Permisos (scopes) que usa el servidor, para declararlos en cada consola:

- Google: `openid email profile` (pantalla de consentimiento en modo *Producción*).
- Microsoft: `openid email profile` (permisos delegados de Microsoft Graph).
- LinkedIn: `openid profile email`.
- Facebook: `email public_profile`.

## 2. Registrar las credenciales en el servidor

Edita `~/buyniverse-runtime.php` en el servidor (fuera del document root, modo 0600)
y completa el bloque de cada proveedor en `identity`, tomando como referencia
`ops/buyniverse-runtime.example.php`:

```php
'google_oidc' => [
    'enabled' => true,
    'client_id' => '<ID de cliente>',
    'client_secret' => getenv('BUYNIVERSE_GOOGLE_CLIENT_SECRET') ?: '',
    'redirect_uri' => 'https://buyniverse.com/api/v1/auth/google/callback',
],
```

Nunca pongas un secreto en el repositorio ni en `dist/`. El servidor rechaza una
configuración cuya `redirect_uri` no coincida con la ruta de callback, que no use
HTTPS, o que traiga usuario, contraseña, query o fragmento en la URL.

## 3. Verificar

```bash
curl -s https://buyniverse.com/api/v1/auth/providers
```

Debe listar cada proveedor habilitado, por ejemplo
`{"providers":[{"id":"google","name":"Google","audience":"individual"}]}`.
Después, en buyniverse.com, “Únete gratis” muestra el botón correspondiente.

## Qué ocurre después del acceso

1. El servidor valida `state` (y PKCE en Google y Microsoft), obtiene el perfil y
   regenera la sesión.
2. Una identidad nueva va a `/#/onboarding`: elige comprar, vender o ambas.
3. Para vender, el alta valida la identidad fiscal de su país con
   `fiscal_rules.php` (RFC y CFDI en México, EIN y sales tax en Estados Unidos, …).

El correo solo se considera verificado cuando el proveedor lo afirma (Google
siempre; LinkedIn por perfil). Microsoft y Facebook no reciben correos sensibles
de forma automática.

## Probar sin credenciales

```bash
bun tools/dev-server.js 8772 --production --providers=google,microsoft,linkedin,facebook
```

Simula producción con los cuatro proveedores configurados (sin backend PHP), para
revisar el modal y la redirección a `/api/v1/auth/<proveedor>/start`.
