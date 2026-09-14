# Auditoría de regresión de pagos y dashboard — 13/09/2026

Resultado de esta revisión local, 03:02–03:07 UTC: **241 pruebas unitarias en 11 archivos, dos suites SQL y siete carreras de concurrencia: PASS**. No se detectó una regresión de los contratos de cobro en las pruebas ejecutadas. Sí se identificaron huecos de cobertura y automatización, detallados abajo. Este informe no sustituye la auditoría visual del dashboard a cargo del coordinador.

Se revisó el árbol de trabajo actual, conservando todos los cambios existentes. Node **24.15.0**, npm y Vitest **4.1.10**. No se ejecutaron builds, consultas remotas, llamadas a Mercado Pago, cargas de credenciales, cambios de flags ni cargos nuevos. Las pruebas del adaptador usaron mocks locales. Las pruebas SQL se dirigieron exclusivamente al contenedor `supabase_db_psi_payments_20260911`: base `postgres` y, para las carreras de leases, fixture `psi_payments_legacy_20260912`.

## Inventario de comportamiento y cobertura

| Contrato | Comprobación disponible y resultado de esta auditoría |
| --- | --- |
| Selección autorizada | RPC `select_professional_plan` valida `auth.uid()` y propiedad, conserva el snapshot cobrable y reutiliza una selección reservada. Suite SQL y carrera real de selección: PASS. El endpoint `/api/subscriptions/select` no tiene una suite de Route Handler dedicada. |
| Propiedad al retomar/pagar | Acción de dashboard resuelve el perfil mediante RPC de sesión; checkout filtra UUID de suscripción y perfil. El correo del pagador es independiente del usuario autenticado. Pruebas de acción, tarjeta y rutas: PASS. |
| Precio y moneda | Precio/moneda provienen del snapshot; estados DRAFT o recursos cruzados se rechazan. El endpoint de tarjeta rechaza importe, PAN/CVC y otros campos extra enviados por el cliente. Adaptador y persistencia contrastan importe, moneda, cuenta y referencia: PASS. |
| Configuración ausente | Checkout cerrado/incompleto no crea ni reserva un pago. Deshabilitar checkout no elimina la capacidad de reconciliar recursos existentes. Pruebas locales: PASS. No se volvió a inspeccionar configuración remota. |
| Visita y autorización de tarjeta | GET del formulario no crea recursos ni toma reservas. `authorized` mantiene PENDING_PAYMENT; sólo el pago confirmado habilita ACTIVE. Pruebas de contrato: PASS. El montaje real SDK/CSP tiene evidencia sandbox previa, no una prueba E2E permanente dedicada en el repositorio. |
| Creación y persistencia fallidas | Fallo de attach no devuelve autorización exitosa. Respuesta incierta conserva reserva y evita repetir POST; HTTP400/422 sólo libera el intento propio. Pruebas unitarias, SQL y carreras: PASS. |
| Retorno manipulado | El dashboard usa la suscripción persistida para mostrar estado. Existe E2E autenticado de `?subscription=checkout-return&status=approved` que exige PENDING_PAYMENT en DB. Fue inspeccionado, no reejecutado aquí: navegador y cambios visuales son responsabilidad del coordinador. |
| Firma y cuerpo del webhook | HMAC, hex estricto, ID firmado en query/cuerpo, cuentas, cuerpo limitado, metadatos no confiables y errores reintentables: PASS. Firmas sintéticas de tests no se cuentan como entrega real. |
| Estado autoritativo | Se consulta la cadena vendedor → factura/preapproval → pago, con identidad y snapshot; no se activa por estado de factura o consentimiento. Pendiente, rechazado, aprobado, reembolso, disputa y cancelación tienen pruebas locales: PASS. |
| Duplicados y orden | Ambos topics comparten deduplicación del pago; un cobro repetido no extiende dos veces el período. Eventos tempranos no se consumen sin enlace; rechazo/reembolso histórico no degrada un período posterior. SQL y carreras: PASS. |
| Cuenta personal/company | Cuenta histórica prevalece sobre la cuenta activa y se rechazan cruces de collector, ambiente, UUID o recurso. Pruebas con ambas cuentas simuladas: PASS. No se ejecutó un cargo real con cuenta company. |
| Cancelación y recuperación | Adapter normaliza `canceled`/`cancelled`; cancelar recurso pendiente requiere consentimiento y ausencia de facturación, y nunca cancela uno autorizado para reemplazarlo. Persistencia terminal y selección posterior: PASS. El endpoint `/api/subscriptions/card/restart` carece de tests directos de ruta. |

## Ejecuciones y evidencia local

1. Selección de suites Vitest: `payments`, `card-payments`, `checkout`, `card-checkout`, `reconcile`, `reconcile-search`, `checkout-diagnostics`, rutas de tarjeta/webhook, acción de suscripción y proxy. **241/241 PASS**, 11/11 archivos, 1,41 s.
2. `supabase/tests/database/payment_persistence.sql`: **PASS**, terminó en `ROLLBACK`; permisos/RLS, identidad, snapshots, reintentos, deduplicación y transiciones.
3. `supabase/tests/database/card_checkout_attempts.sql`: **PASS**, terminó en `ROLLBACK`; reserva por intento, liberación acotada, atomicidad, grants y reemplazo de cancelada.
4. `supabase/tests/database/payment_concurrency.py`: **4/4 PASS**; selección simultánea, reserva única, pago duplicado y rechazo/aprobación concurrentes.
5. `supabase/tests/database/card_checkout_concurrency.py`: **3/3 PASS**; único ganador, liberación idempotente y rechazo viejo incapaz de liberar un intento nuevo. Los runners eliminaron sólo los UUID aleatorios que crearon en sus bases locales de prueba.

Logs y manifiesto con hashes de los archivos revisados: `/tmp/psi-dashboard-payment-audit-20260913/manifest.json`, `unit-tests.log`, `payment-persistence.log`, `card-attempts.log`, `payment-concurrency.log` y `card-concurrency.log`.

Comando unitario reproducible, con Node24 en PATH:

```sh
npm run test -- src/lib/integrations/payments.test.ts src/lib/integrations/card-payments.test.ts src/lib/subscriptions/checkout.test.ts src/lib/subscriptions/card-checkout.test.ts src/lib/subscriptions/reconcile.test.ts src/lib/subscriptions/reconcile-search.test.ts src/lib/subscriptions/checkout-diagnostics.test.ts src/app/api/subscriptions/card/route.test.ts 'src/app/api/webhooks/mercado-pago/[account]/route.test.ts' src/app/dashboard/subscription-actions.test.ts src/proxy.test.ts
```

No se ejecutó `npm run test:e2e`: ese script incluye un build. Tampoco se inició otro servidor ni se modificó `.next`.

## Huecos concretos comunicados al coordinador

- **Selector E2E desactualizado:** `tests/e2e/authenticated/authenticated-vertical.spec.ts` busca la ausencia de «Continuar en Mercado Pago», mientras que el botón actual es «Continuar con el pago». Esa aserción puede pasar aunque el botón actual se mostrara incorrectamente. Debe comparar el nombre vigente; el coordinador tiene asignadas las correcciones y la ejecución E2E.
- **Cobertura de controladores:** faltan suites directas de `/api/subscriptions/select` y `/api/subscriptions/card/restart`. Las funciones/RPC inferiores tienen cobertura, pero no acreditan todos los códigos HTTP, rechazo de origen/cuerpo, términos y ratelimit de esos endpoints.
- **CI no ejecuta todas las pruebas de pagos:** `.github/workflows/ci.yml` corre las suites SQL de búsqueda/workflow, integración y E2E autenticado; no invoca las dos suites SQL específicas de pagos ni sus runners de concurrencia. Estos últimos tienen nombres de contenedor/base local fijos, por lo que requieren parametrización con guardia de destino antes de integrarlos a CI.
- **SDK/CSP y respuestas de proveedor:** el recorrido real integrado se acreditó con helpers QA privados y evidencia fechada, pero no hay un E2E de repositorio dedicado que detecte automáticamente la regresión de navegación cliente/CSP/campos de tarjeta. Los 401/502 iniciales se conservan como incidentes históricos; no se atribuye una causa exacta del primer401 sólo porque un intento posterior funcionó.

Estos puntos son huecos de evidencia/automatización; no se presentan como un cobro duplicado o acceso indebido observado. Esta subtarea no modifica sus implementaciones.

## Evidencia sandbox previa y límites

La prueba anterior del 13/09/2026 acreditó tarjeta TEST → tokenización201 → autorización200/PENDING_PAYMENT → pago `approved/accredited` → webhook auténtico200 → ACTIVE visible en escritorio/móvil. El webhook de pago quedó procesado a las 02:19:47.831709 UTC. La limpieza posterior canceló sólo esa suscripción TEST: proveedor200 y webhook auténtico200, DB CANCELED a las 02:31:51 UTC, sin beneficios activos y conservando recibo, eventos e intento de tarjeta. No se repitió esa compra durante esta auditoría. Detalle: [reporte de QA de Mercado Pago](mercadopago-qa-2026-09-11.md).

**NO EJECUTADO:** renovación mensual futura mediante débito automático; compra o reembolso productivo; prueba real de pago único (planes aún DRAFT); compra con una cuenta company real; rechazo/contracargo real de un comprador. Las transiciones equivalentes que pasan en mocks/SQL no prueban esos eventos externos. La habilitación productiva previa y su smoke sin cargos tampoco equivalen a una compra productiva probada.
