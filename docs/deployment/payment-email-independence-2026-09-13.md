# Emails independientes — 13/09/2026

La identidad autenticada de Universo Psi y el pagador de Mercado Pago pueden tener emails distintos. El checkout alojado anterior validaba `params.email` y lo propagaba desde `user.email`/`claims.email`. Esto era un defecto de código; no hay respuesta del incidente actual que permita atribuirlo exclusivamente a TEST.

## Parámetros antes y después (sin secretos)

`POST /preapproval`, checkout alojado:
```js
{
  reason: "Universo Psi · <planName>",
  external_reference: "<subscriptions.id: UUID aleatorio>",
  payer_email: "<ANTES: email autenticado; DESPUÉS: payerEmail ingresado independientemente>",
  back_url: "<site>/dashboard?subscription=checkout-return",
  // Sólo cuando existe:
  preapproval_plan_id: "<providerPlanId>",
  auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: "<importe numérico del snapshot>", currency_id: "<moneda>" },
  status: "pending"
}
```
La [API de suscripciones](https://www.mercadopago.com.ar/developers/en/reference/online-payments/subscriptions/create-preapproval/post) requiere `payer_email`; no puede eliminarse sin romper ese contrato. Se recoge vacío y editable antes de crear el recurso, sin prellenarlo con la identidad de Universo Psi. El email elegido identifica al pagador en Mercado Pago; nunca se compara con el de la app. El flujo de tarjeta conserva su pagador independiente y añade `card_token_id` efímero y `status: "authorized"` al preapproval.

`POST /checkout/preferences`:
```js
{
  items: [{ title: "Universo Psi · <planName>", quantity: 1, unit_price: "<importe numérico>", currency_id: "<moneda>" }],
  // ANTES: payer: { email: "<email autenticado>" }; DESPUÉS: propiedad ausente.
  external_reference: "<subscriptions.id: UUID aleatorio>",
  notification_url: "<site>/api/webhooks/mercado-pago/<accountKey>",
  back_urls: {
    success: "<site>/dashboard?subscription=checkout-return",
    pending: "<site>/dashboard?subscription=checkout-pending",
    failure: "<site>/dashboard?subscription=checkout-failure"
  }
}
```
No se envían `user_id`, `profile_id` ni emails de autenticación en URL o metadata pública. El vínculo servidor es `subscriptions.id → professional_profile_id → user_id`; UUID generado por `gen_random_uuid()`, ownership por sesión/RLS. Persistencia guarda cuenta e ID del recurso MP. Webhook y reconciliación consultan API y validan referencia, cuenta, recurso, importe, moneda y estado aprobado. El retorno del navegador no acredita pago ni activa beneficios. No se encontraron comparaciones de emails en aprobación/rechazo.

## Sandbox y producción

En sandbox usar una cuenta compradora de prueba distinta de la vendedora, del mismo país. Su email puede diferir del email de Universo Psi. [Guía oficial de pruebas](https://www.mercadopago.com.ar/developers/en/news/2023/11/16/Questions-on-how-to-test-your-integration--). En esta corrección no se verificó contra API la identidad del comprador ni que difiera del vendedor: queda pendiente el smoke sandbox con esas identidades. No inferir ambiente únicamente por el prefijo del token; la aplicación verifica vendedor y `test_user` mediante `/users/me`.

Producción redirige al checkout de Mercado Pago; las cuentas y medios disponibles los determina Mercado Pago. La suscripción alojada exige el email del pagador elegido por el usuario. No se ejecutaron cargos; el despliegue posterior autorizado se registra abajo.

## Verificación local

Node 24.15.0: lint y typecheck aprobados; 347 pruebas en 22 archivos aprobadas, incluyendo emails divergentes/ausentes en identidad, preference sin payer y reconciliación por IDs. Playwright autenticado intentado: no arranca porque falta `SUPABASE_TEST_URL` del stack aislado. No acredita prueba de pago sandbox ni producción.

`npm run build` con Turbopack falla por restricción del entorno al compilar CSS (`binding to a port: Operation not permitted`), también fuera del sandbox solicitado. `npm run build -- --webpack` aprobado con variables ficticias explícitas, `UNIVERSO_PSI_TEST_MODE=true` y pagos deshabilitados. Compilación, TypeScript y generación de páginas completos. Los intentos sin variables fallaron por validación de configuración, resuelta sólo para este build local.

## Despliegue productivo autorizado — 13/09/2026 14:34 UTC

Usuario: «desplegá así lo pruebo real». Publicado mediante CLI Node24, build remoto Vercel con Turbopack y variables productivas existentes: **READY**. ID `dpl_8AMUFg9RCkvwgZ9VWWMHKF7suyYj`; dominio `https://universo-psi-eight.vercel.app` confirmado por `vercel inspect` contra el nuevo deployment. No se usó el build local con fixtures. Sin cambios de precios, variables, migraciones ni cargos.

Paquete: 224 archivos, manifiesto SHA256 `a680ab28b2245bf64aa1238bed2046533164e8234d959c245e1c8398d6b351fa`; excluye credenciales y builds locales. Fuente: árbol de trabajo verificado, con cambios existentes conservados; no equivale al HEAD de Git. Rollback disponible: `dpl_EH8p5oHFemR4hDYDpuLSJ6LoyzbZ`, que estaba READY y servía el dominio antes del release.

Evidencia local: `/tmp/psi-email-deploy-files.json`, `/tmp/psi-email-production-deploy.log`, `/tmp/psi-email-before-deploy.log`, `/tmp/psi-email-after-deploy.log`. La verificación acredita publicación y alias, no compra real, sesión autenticada ni activación de beneficios. La prueba de compra queda a cargo del usuario.
