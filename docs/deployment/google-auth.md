# Acceso con Google

## Causa del incidente del 12/09/2026

El proyecto productivo `gwizdgboqwpzyiaqcxbb` devolvía `external.google=false` y la configuración administrativa confirmó ausencia de Client ID y Client Secret. La interfaz ofrecía Google sin comprobar su disponibilidad. `signInWithOAuth` del SDK genera la URL y devuelve `error:null` sin consultar el proveedor, por lo que la acción enviaba a la persona al error HTTP400 de Supabase.

## Segunda causa: el alta por email iniciaba Google

El botón Google era el primer submit dentro del mismo formulario de email/contraseña. El envío implícito con Enter podía elegir su `formAction`, por lo que incluso el registro por email terminaba en `/authorize?provider=google`. Ahora OAuth y email son formularios hermanos independientes, sin formularios anidados. El botón de Google no pertenece al formulario de contraseña; el destino y la elección profesional se conservan.

## Contrato corregido

- `/ingresar` y `/registro` consultan `/auth/v1/settings` con clave pública, sin caché persistente y con timeout. Sólo ofrecen Google cuando está habilitado; una falla de ese proveedor no oculta el formulario de email.
- La acción vuelve a consultar, incluso para formularios antiguos, genera PKCE con el cliente SSR por request y comprueba la primera respuesta de autorización. Sólo acepta un redirect HTTPS de Supabase a `accounts.google.com`; no sigue URLs arbitrarias ni registra tokens o mensajes externos.
- Una configuración incompleta, una caída, un código vencido o una cancelación vuelven al ingreso con un mensaje en español y el destino interno preservado. El callback mantiene la exigencia de términos vigentes.
- No se agrega una variable manual `GOOGLE_ENABLED` que pueda diferir de Supabase. La habilitación se refleja en la siguiente carga del formulario sin reconstruir el sitio.

## Por qué la pantalla de Google dice `gwizdgboqwpzyiaqcxbb.supabase.co`

La línea «Ir a …» que Google muestra debajo de «Selecciona una cuenta» es el host
de la **URI de redirección** del cliente OAuth, no el del sitio. El retorno de
Google va a Supabase (`https://<ref>.supabase.co/auth/v1/callback`) y recién
después a `/auth/callback` en el sitio, así que Google nombra a Supabase.

Cambiar ese texto por `universopsi.com` **no se arregla desde el código**:
requiere el add-on de **Custom Domain** de Supabase, que expone el endpoint de
auth en un subdominio propio (por ejemplo `auth.universopsi.com`). Con eso, la
URI de redirección pasa a ser `https://auth.universopsi.com/auth/v1/callback` y
es ese nombre el que ve la persona. Es una función paga del proyecto Supabase.

El **logo y el nombre** de la aplicación en esa pantalla son otra cosa: se cargan
en Google Cloud Console → *Branding*, y son independientes del dominio. Ahí van
nombre visible, logo, correo de soporte, dominios autorizados y los enlaces a
política de privacidad y términos —que ahora existen en `universopsi.com` y son
requisito para que Google apruebe la verificación—.

En resumen, son dos arreglos distintos: el logo se resuelve gratis en Google, el
host feo sólo con el dominio propio de Supabase.

## Configuración necesaria

1. En Google Auth Platform, crear o seleccionar el proyecto de Universo Psi. Configurar marca y audiencia Externa.
2. Crear un cliente OAuth de tipo Aplicación web.
3. Orígenes autorizados: `https://universopsi.com` y `https://www.universopsi.com`. Conservar el `.vercel.app` mientras siga en uso.
4. URI de redirección autorizada: `https://gwizdgboqwpzyiaqcxbb.supabase.co/auth/v1/callback` (el retorno de Google va a Supabase, no directamente al sitio).
5. En Supabase → Authentication → Sign In / Providers → Google, cargar Client ID y Client Secret, habilitar y guardar. Las credenciales OAuth se almacenan en Supabase; no pertenecen al cliente Next.js ni al repositorio.
6. Site URL `https://universopsi.com` y permitir el retorno `/auth/callback` con su `next`, para el apex y para `www`. Mientras `NEXT_PUBLIC_SITE_URL` siga apuntando al `.vercel.app`, los enlaces de los correos vuelven al dominio viejo aunque el allowlist ya incluya el nuevo.
7. En modo de pruebas de Google, incluir explícitamente los usuarios de prueba. Antes de ofrecer el acceso al público general, publicar la audiencia en Google. Solicitar sólo identidad básica: openid, email y perfil.

Guía oficial: https://supabase.com/docs/guides/auth/social-login/auth-google

## Verificación y prevención de regresiones

Con las variables públicas del ambiente cargadas, ejecutar `node scripts/check-google-auth.mjs`. Sólo hace GET de configuración e inicio OAuth; no registra personas ni lee datos privados. Falla si el proveedor está deshabilitado o no redirige a Google con el callback correcto. No acredita por sí solo la validez del secreto en el intercambio final ni las restricciones de audiencia de Google.

Completar con una cuenta autorizada: ingreso desde `/planes` → Google → consentimiento → retorno al sitio → términos si corresponde → mismo plan seleccionado. Repetir cancelación y verificar mensaje local, escritorio y móvil. Nunca confundir este login con una compra: confirmar Google no autoriza cobros.

Las regresiones Playwright permanentes de `tests/e2e/public-journeys.spec.ts` cubren Enter en ingreso y registro, con validación local y sin redirección OAuth. El ensayo aislado adicional verificó 22 casos en escritorio1440 y móvil390, incluido un registro válido simulado con Google habilitado: llamó al proveedor de email y mostró confirmación sin enviar ningún correo real.

Las pruebas unitarias cubren proveedor deshabilitado, configuración malformada, falla de red, cambio después del render, destino hostil, conservación de PKCE y `next`, intención profesional y callback con términos/cancelación/código vencido.

Estado al iniciar esta corrección: credenciales Google pendientes de configuración por el titular. No se declara Google operativo hasta comprobar el retorno autenticado.

## Release verificado

Versión final `dpl_5aSJgsgmFD1MRUZaCKtpV95uHags`, fuente SHA256 `cf0eacb2ff61a2800964c12d268b7fcaa76c43ad5cf17a851ecebdb176d8b9c6`, READY y alias canónico confirmado. Pasan lint, typecheck, 287 pruebas unitarias y build Node24. Las cuatro regresiones Playwright permanentes de Enter pasan en escritorio y móvil. El ensayo con Google habilitado simulado acredita 22 casos, incluido envío de registro válido por email; no entrega correo real.

Smoke del dominio productivo: `/ingresar` y `/registro` HTTP200, Enter valida email/contraseña sin OAuth en 1440px y 390px. Google oculto mientras el proveedor continúa deshabilitado. `/planes` HTTP200, importe ARS120.000 y disponibilidad de checkout conservados. Cero cuentas creadas, cero correos enviados y cero pagos ejecutados. Evidencia privada: `/tmp/psi-auth-production-check-final.log`; capturas `output/playwright/google-auth/production-*`. El primer chequeo de planes leyó antes de que terminara de cargar su contenido; se corrigió la espera del ensayo y la verificación final pasó sin modificar el producto.

Pendientes externos: cargar las credenciales OAuth y verificar consentimiento/retorno Google; completar un registro real con recepción y confirmación del correo. No confundir el arreglo del submit incorrecto con evidencia de entrega de email.


## Registro manual: diagnóstico del 13 de septiembre de 2026 UTC

Los logs de Auth registraron `/signup` 500 por respuesta 500 del Send Email hook. Vercel confirmó `send_email_hook_delivery_failed`. Una comprobación de sólo lectura dentro del build de producción validó que Resend tiene clave disponible y responde GET /domains 200, pero el remitente usa `resend.dev` y no hay dominios verificados. Ese remitente de prueba no habilita correo para usuarios externos; se necesita verificar un dominio propio y configurar EMAIL_FROM. No se desactivó la confirmación de email ni se declaró entrega productiva exitosa.

La corrección del formulario conserva nombre, email, contraseñas, tipo de cuenta y términos al fallar; limpia contraseñas sólo al éxito, enfoca el campo inválido y distingue errores de transporte sin exponer detalles del proveedor. Publicada en `dpl_A1pi85aaJtVLp2NnqKx7NE61BbMG` READY con alias canónico confirmado. Validación: lint/typecheck/294 tests/build PASS y cuatro E2E locales (dos altas reales mediante UI con correo capturado en Mailpit; rechazos de proveedor y transporte inyectados, identificados como tales). El primer problema de la captura era una contraseña sin mayúscula; el fallo de entrega era independiente.

Preparación adicional (todavía sólo QA): validación de contraseña compatible con el máximo de 72 bytes UTF-8 de Auth, preservación del destino interno `next` cuando ya existe sesión, y transmisión de cookies renovadas al handler actual desde el proxy. Regresión específica verifica cookie nueva tanto en el request reenviado como en la respuesta, preservando CSP y headers de refresh. El primer POST TEST de tarjeta llevaba JWT no vencido: el arreglo de refresh no se presenta como causa demostrada de ese 401. En QA `dpl_GcHKUgNZefyaBgjnxUftLce2WD6h`, un POST sin tarjeta para UUID inexistente pasó autenticación y fue rechazado antes del proveedor como correspondía. Validación integrada: lint/typecheck y 336 tests PASS, build Node24 PASS con 26 lecturas públicas y ningún error.

Las correcciones adicionales de sesión y máximo de contraseña quedaron publicadas en `dpl_DPruWEU3WnRqXN5hszQeqkgTSqTN`, READY/alias confirmado02:31UTC. Registro e ingresoHTTP200. Esto no acredita envío de email: continúa pendiente verificar el dominio de Resend y cambiar el remitente de prueba; se pidió al titular únicamente dominio/acceso, sin secretos. Google permanece disponible según la prueba del titular.
