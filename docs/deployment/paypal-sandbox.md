# PayPal Sandbox — Universo Psi

Implementación local, sin despliegue ni cobros reales. PayPal está cerrado sin credenciales/precios, con `PAYPAL_ENV` distinto de `sandbox` y en Vercel Production. Mercado Pago conserva su configuración y adaptador. Usar un Preview conectado a **Supabase aislado de pruebas**: Sandbox modifica estados de membresía en la base configurada.

## Configuración para probar

1. Aplicar `supabase/migrations/20260913190731_add_paypal_sandbox.sql` en la base aislada después de las migraciones existentes. Nunca modificar una migración ya aplicada. La prueba SQL incluida puede ejecutarse en transacción con rollback.
2. En PayPal Developer → Apps & Credentials → Sandbox, crear una REST App para una cuenta Business de prueba. Crear otra cuenta Personal Sandbox para pagar; su email puede ser distinto del usuario de Universo Psi. No usar cuentas Live.
3. En esa misma app crear un webhook HTTPS: `https://<DOMINIO-PREVIEW>/api/webhooks/paypal`. El endpoint debe ser accesible a PayPal (sin protección de acceso que intercepte el webhook). Copiar el **Webhook ID**, no el ID de un evento.
4. En Vercel, sólo para el Preview de pruebas, cargar:

```dotenv
PAYPAL_CLIENT_ID=<CLIENT_ID_DE_LA_APP_SANDBOX>
PAYPAL_CLIENT_SECRET=<SECRET_DE_LA_MISMA_APP_SANDBOX>
PAYPAL_WEBHOOK_ID=<ID_DEL_WEBHOOK_SANDBOX>
PAYPAL_ENV=sandbox
NEXT_PUBLIC_PAYPAL_CLIENT_ID=<MISMO_CLIENT_ID_SANDBOX>
NEXT_PUBLIC_SITE_URL=https://<DOMINIO-PREVIEW>
PAYPAL_PLANS={"PROFESSIONAL_MONTHLY":{"currency":"<MONEDA>","amount":"<IMPORTE_CON_DOS_DECIMALES>","planId":"<P-ID_PLAN_SANDBOX>"}}
```

`NEXT_PUBLIC_PAYPAL_CLIENT_ID` es opcional y no se consume: este flujo utiliza redirección alojada, sin SDK en el navegador. Los otros IDs/secretos se leen exclusivamente en servidor. Mantener además las variables Supabase del proyecto aislado y `RATE_LIMIT_SALT`. No modificar variables de Mercado Pago.

**Falta definir moneda e importes comerciales.** PayPal no admite ARS; no se transforma ARS en USD ni se inventa una cotización. El adaptador admite USD, EUR, GBP, CAD, AUD y MXN con dos decimales. Reemplazar los marcadores antes de guardar el JSON. [Monedas oficiales](https://developer.paypal.com/api/codes/currency/).

5. Crear un producto de servicio y un plan en PayPal Sandbox (panel de suscripciones o APIs oficiales `/v1/catalogs/products` y `/v1/billing/plans`). Usar un plan activo: un solo ciclo `REGULAR`, `MONTH`, `interval_count=1`, `total_cycles=0`, precio fijo igual al JSON, sin prueba gratis, impuestos ni cargo inicial; `quantity_supported=false`, `payment_preferences.auto_bill_outstanding=false`. Definir el umbral de fallos según la operación; PayPal gestiona los reintentos. Cargar su ID `P-…` en `planId`. El backend consulta y valida ese plan antes de crear una suscripción. No se necesita crear otro producto/plan por profesional. [API de planes](https://developer.paypal.com/api/subscriptions/v1/plans-create).
6. Suscribir el webhook a:

```text
BILLING.SUBSCRIPTION.CREATED
BILLING.SUBSCRIPTION.ACTIVATED
BILLING.SUBSCRIPTION.UPDATED
BILLING.SUBSCRIPTION.CANCELLED
BILLING.SUBSCRIPTION.SUSPENDED
BILLING.SUBSCRIPTION.EXPIRED
BILLING.SUBSCRIPTION.PAYMENT.FAILED
PAYMENT.SALE.COMPLETED
PAYMENT.SALE.REFUNDED
PAYMENT.SALE.REVERSED
CHECKOUT.ORDER.APPROVED
CHECKOUT.ORDER.COMPLETED
PAYMENT.CAPTURE.COMPLETED
PAYMENT.CAPTURE.PENDING
PAYMENT.CAPTURE.DENIED
PAYMENT.CAPTURE.REFUNDED
PAYMENT.CAPTURE.REVERSED
```

7. Reconstruir Preview. Con un profesional de prueba y términos aceptados: seleccionar mensual → continuar pago → PayPal → pagar con cuenta Sandbox → volver al dashboard. El retorno no activa: esperar webhook firmado, consulta de API y escritura atómica. Repetir con email PayPal distinto, doble click, pago pendiente/fallido, reentrega del mismo evento y cancelación desde PayPal. Verificar el estado local después de cada webhook. El simulador de webhooks no sustituye una operación real de Sandbox y su firma no acredita el flujo completo.

## Plan anual y estados

Existe `PROFESSIONAL_ANNUAL_UPFRONT` (12 meses, pago único), actualmente inactivo/DRAFT y sin precio en el seed. Su orden está implementada, pero no se habilita el plan ni se inventa precio. Si se publica mediante el flujo comercial existente, agregar a `PAYPAL_PLANS` ese código con `currency` y `amount`, sin `planId`. El webhook `CHECKOUT.ORDER.APPROVED` consulta la orden, la captura en backend y vuelve a consultar orden/capture antes de habilitar los 12 meses. El semestral actual es un compromiso de cobros mensuales, no un pago anticipado; no se agrega un plan semestral nuevo.

Estados existentes: creación/aprobación → `PENDING_PAYMENT`; pago comprobado con período vigente → `ACTIVE`; deuda/fallo recurrente → `PAST_DUE`; suspensión/reembolso → `PAUSED`; cancelación → `CANCELED`; vencimiento → `EXPIRED`. Salir del checkout sólo vuelve al dashboard, no cancela un contrato ni confirma un pago. Cancelar el contrato desde PayPal genera el webhook verificado. Ante captura fallida confirmada, se cancela la operación local; puede seleccionarse nuevamente el plan. No se habilita una membresía sólo porque PayPal muestre una suscripción `ACTIVE`: se exige una transacción pagada.

## Persistencia y recuperación

`public.subscriptions` conserva sus estados/beneficios; sólo se agrega el proveedor `paypal` a su constraint y un trigger que impide cambiar el proveedor de una reserva. `private.paypal_operations` guarda referencia opaca, precio acordado, IDs separados de orden/suscripción, estado y fechas; `private.paypal_events` conserva sólo event ID/tipo/fecha. RLS forzada, sin acceso de anon/authenticated; RPC de escritura sólo service_role. No se guardan payloads, emails ni datos de tarjeta.

La restricción actual de una suscripción vigente por profesional y el bloqueo de su fila serializan reservas. Los reintentos usan la misma referencia como `PayPal-Request-Id`; cuando hay ID guardado se consulta esa operación. Si una creación quedó incierta sin ID, sólo se reenvía durante una hora, por debajo de la retención de claves de PayPal; después exige recuperación operativa. No borrar reservas ni generar otro ID: localizar por `custom_id` en Sandbox y asociar el recurso mediante `paypal_operation('attach', …)` desde un entorno administrativo, después de verificar referencia, plan/importe y cuenta. Una notificación anterior a la asociación devuelve 503 para reentrega. No existen secretos ni credenciales Sandbox verificados en esta entrega.

Fuentes: [idempotencia de suscripciones](https://developer.paypal.com/api/subscriptions/v1/subscriptions-create), [webhooks oficiales](https://developer.paypal.com/api/rest/webhooks/rest/).

## Archivos de esta implementación

- `.env.example`, `src/lib/env/server.ts`.
- `src/lib/integrations/paypal.ts` y `paypal.test.ts`.
- `src/lib/subscriptions/paypal.ts`, `paypal.test.ts` y guardas en `checkout.ts`.
- `src/app/api/subscriptions/paypal/route.ts`.
- `src/app/api/webhooks/paypal/route.ts` y `route.test.ts`.
- `src/app/dashboard/suscripcion/pagar/page.tsx`, `src/components/subscriptions/paypal-checkout.tsx`.
- `supabase/migrations/20260913190731_add_paypal_sandbox.sql`, `supabase/tests/database/paypal_persistence.sql` y esta guía.

## Verificación de esta entrega — 13/09/2026

- Node 24.15.0: `npm run typecheck` y `npm run lint` aprobados; `npm run test`: 376 pruebas en 25 archivos, incluidas 29 de PayPal. La validación independiente de Mercado Pago cubrió 227 pruebas existentes; la suite completa volvió a pasar después de integrar las guardas.
- `npm run build -- --webpack` aprobado sobre el código final con configuración ficticia local y `UNIVERSO_PSI_TEST_MODE=true`. `npm run build` con Turbopack no pudo finalizar: el entorno bloquea la apertura de puertos/procesos de su transformación CSS (`EPERM`). No se cambió la configuración del bundler del proyecto.
- SQL PayPal aprobado: reserva repetida, referencia única, propiedad ajena, no activación al crear, cambio de proveedor rechazado, importe inválido, event ID repetido, snapshot obsoleto, cancelación terminal, permisos y RLS. También pasó el SQL existente `payment_persistence.sql` de Mercado Pago con la migración nueva. Ambas ejecuciones fueron en `supabase_db_psi_payments_20260911`, locales, transaccionales y revertidas; no quedó aplicada la migración.
- Playwright real contra build local: planes 1440/390 px con ARS120.000 y sin overflow; checkout PayPal anónimo redirige a ingreso; checkout/webhook devuelven 503 sin configuración. No acredita la UI autenticada completa ni el pago Sandbox.
- Pendientes: moneda/importes aprobados, credenciales, plan PayPal Sandbox, webhook accesible, aplicación de migración a la base de pruebas y smoke autenticado de compra/renovación/cancelación Sandbox. Sin cargos reales ni despliegue.
