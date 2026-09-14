# Evidencia de QA de Mercado Pago — 11 y 12/09/2026

**Producción habilitada con autorización del dueño; sandbox de pago y cancelación automática aprobado.** El nuevo deployment Gp5xREADY sirve el dominio canónico con checkouttrue sóloProduction. La correctiva se aplicó y pasó postflight10/10, seguridad8/8 y las cuatro RPC de API. Credenciales reales verificadas y desplegadas; firma productiva comprobada con un evento sintético ignorado, sin cobro. Local: lint/typecheck,254tests y build Node24 aprobados. El sandbox acreditó selección, checkout, webhooks auténticos, activación y cancelación automática con recibo conservado, sin simulación ni recuperación administrativa sobre el segundo recurso. No se realizaron cargos reales ni cambios de precios. La revisión final en navegador público pasó en escritorio y móvil, sin formularios ni cargos; los apartados fechados siguientes conservan la historia y los límites de cada prueba.

## Versión y ambientes de la revisión inicial del 11/09

- Base Git: `d9347fa02714890f1258fe540635f63d5787a9d0`, más cambios de trabajo del 11/09 preservados e integrados por el equipo. No corresponde atribuir el resultado sólo al commit base.
- Unitarios: Node `24.15.0`, npm, Vitest `4.1.10`, red del proveedor reemplazada por fixtures y RPC simuladas. Credenciales ficticias exclusivas de tests. **Esto no es sandbox de Mercado Pago.**
- Base local aislada: stack `psi_payments_20260911`, Supabase API loopback puerto `55321`; usuarios ficticios. Migración nueva `20260911224302_harden_payment_persistence.sql`. Pruebas SQL y reset a cargo de `psi_datos_pagos`.
- Navegador local: público en `3180` con fixtures; autenticado en `3179` con Supabase local y `UNIVERSO_PSI_TEST_MODE=false`. Ejecución serial a cargo del coordinador; no se construyó `.next` en paralelo.
- Sandbox Mercado Pago: no ejecutado en esta revisión inicial del 11/09; el recorrido auténtico posterior del 12/09 figura aprobado en la actualización final.
- Producción: **NO EJECUTADO**. Requiere aprobación del dueño después de sandbox. `MERCADOPAGO_CHECKOUT_ENABLED=false` permite preparar credenciales y reconciliar recursos existentes sin ofrecer nuevos checkouts.

Huella SHA-256 del código verificado por los unitarios de esa revisión inicial:

| Archivo | SHA-256 |
| --- | --- |
| `src/lib/integrations/payments.ts` | `47a1a7bb04b8b7c2469500251483fce725cfc881e6e1f8c5ff424e3ce45f14cb` |
| `src/lib/subscriptions/checkout.ts` | `117879f4aae623b2e648c039f42e8252f0c0e01ed49f32af23551142faa4b288` |
| `src/lib/subscriptions/reconcile.ts` | `339e1751f60306aefd899a4661e1c66fb7dff0edc855a4d04c3aaf632f1fced5` |
| `src/lib/subscriptions/reconcile-search.ts` | `639b0c659def592a1728b7032b2994eefa283afc031dc7601c210b6a0aea5570` |
| `src/app/api/webhooks/mercado-pago/[account]/route.ts` | `7baf02b3d17b950832f162e20cfb0269053f1025bab14e89263438f9b884f22a` |

## Casos unitarios y resultado observado

En todos los casos siguientes el ambiente es unitario local, la versión es la huella anterior y el observado coincide con el esperado. Los títulos de los tests contienen las variantes individuales; las filas agrupan comportamientos relacionados.

| ID | Pasos / esperado | Observado / evidencia |
| --- | --- | --- |
| U01 | Firmar ID normalizado con timestamps en segundos/milisegundos; reenviar entrega histórica. Aceptar firmas válidas; rechazar alteración de ID/request/cuenta, timestamp futuro, hex inválido, campos duplicados y delimitadores. | **APROBADO**, `src/lib/integrations/payments.test.ts`. Firma sintética, sin atribución a MP. |
| U02 | Quitar por separado token, secreto, collector o ambiente; consultar disponibilidad. Cerrar checkout sin escritura. Desactivar interruptor conservando consultas para webhook. | **APROBADO**, `payments.test.ts` y `checkout.test.ts`. |
| U03 | Responder `/users/me` de vendedor/ambiente diferente; alterar collector, live mode, ID, UUID, importe o fecha del pago. Rechazar antes de persistir. Probar personal y company. | **APROBADO**, `payments.test.ts`. |
| U04 | Crear checkout con snapshot servidor; alterar respuesta externa, monto, moneda, identidad o host de URL. Sólo devolver recurso congruente y datos mínimos. | **APROBADO**, `payments.test.ts`; la ruta de retorno no comunica activación. |
| U05 | Leer selección por ID y perfil usando cliente de request. Probar fila ausente, error RLS, estado ACTIVE, DRAFT, importe nulo e input inválido. No crear checkout. | **APROBADO**, `src/lib/subscriptions/checkout.test.ts`. Ownership real se comprueba adicionalmente en SQL, no por el mock. |
| U06 | Fallar lookup, reserva o enlace RPC. Devolver `null`, nunca URL exitosa. Tras timeout o enlace fallido recuperar recurso por referencia, sin repetir POST. Mantener cuenta histórica company. | **APROBADO**, `checkout.test.ts`. |
| U07 | Recuperar preapproval ya authorized: enlazar primero, consultar pagos después y volver al dashboard sin pedir otro consentimiento. Fallar reconciliación y no informar éxito. | **APROBADO**, `checkout.test.ts`. |
| U08 | Crear/recuperar ONE_TIME; validar collector, UUID, cantidad, precio, moneda y URL. Búsqueda ausente/ambigua no permite nuevo POST; recurso conocido debe conservar ID. Guardar preference ID. | **APROBADO**, `payments.test.ts` y `checkout.test.ts`. Fixture de contrato; plan ONE_TIME real continúa DRAFT. |
| U09 | Recibir pending/authorized de preapproval o factura sin payment ID. No activar ni extender período. Paused/cancelled se propagan. | **APROBADO**, `payments.test.ts` comprueba mapa real y `src/lib/subscriptions/reconcile.test.ts` comprueba argumentos RPC. |
| U10 | Consultar invoice → preapproval + payment; comparar UUID, monto y moneda en los tres recursos. Enviar status aprobado/pendiente/rechazado/reembolsado/contracargo del pago real, no de la factura. | **APROBADO**, `reconcile.test.ts`. |
| U11 | Entregar dos veces el mismo recurso. Conservar clave estable por cuenta/recurso/versión; payload mínimo sin PII. Error RPC, incluido enlace todavía ausente, debe propagarse. | **APROBADO**, `reconcile.test.ts`. La deduplicación transaccional y orden se prueban en SQL. |
| U12 | Webhook sin cuenta, JSON inválido, cuerpo >16 KiB, ID faltante/cruzado/duplicado, firma inválida. Esperar 503/400/413/401 sin reconciliar. | **APROBADO**, `src/app/api/webhooks/mercado-pago/[account]/route.test.ts`. |
| U13 | Alterar notification.id/date_created/user_id/live_mode; transmitir sólo ID firmado y cuenta a reconciliación. Error proveedor/RPC, incluido simulador 404, devuelve 502, no 200 ficticio. | **APROBADO**, `route.test.ts`. |
| U14 | Recuperación manual consulta historia recurrente/única, valida pertenencia, deduplica y pagina 50+1 recursos. Historia parcial, ajena o fallo de pago debe fallar. | **APROBADO**, `src/lib/subscriptions/reconcile-search.test.ts`. |

Comando reproducible:

```bash
npm run test -- src/lib/integrations/payments.test.ts src/lib/subscriptions/checkout.test.ts src/lib/subscriptions/reconcile.test.ts src/lib/subscriptions/reconcile-search.test.ts 'src/app/api/webhooks/mercado-pago/[account]/route.test.ts'
```

Resultado: **5 archivos, 103 tests aprobados**. Log local sin secretos: `/tmp/psi-payments-qa-unit-20260911.log`. La ejecución inicial tuvo dos fallos de fixtures (fecha nueva del pago y cuenta persistida por reserva), corregidos antes del resultado final.

## Verificaciones integradas del coordinador

Resultado integrado: `npm run lint`, `npm run typecheck` y `npm run test` aprobados: **9 archivos, 141 tests** (38 previos + 103 nuevos). `npm run build` aprobado con Next 16.3.1/Turbopack dentro de Docker, Node **24.21.0**, después de reconstruir la base. El host usa Node 24.15.0: Turbopack encontró una restricción de bind y Webpack una salida vacía del proceso TypeScript; Docker permitió completar el build original sin modificar configuración de Next. Una ejecución durante el reset encontró el catálogo temporalmente ausente y se repitió una vez finalizado el reset.

- Público: **36/36 aprobados, 43,9 segundos**, en la pasada final completa sobre el build integrado, escritorio y móvil. Un caso móvil inicial consultaba visibilidad antes de adjuntar el DOM; se corrigió la espera y se verificó toda la suite. Primera tentativa sobre puerto 3000 descartada porque correspondía a otra aplicación; corrida válida identificada en 3180.
- Autenticado: **3/3 aprobados, 25 segundos**, sobre la base reconstruida, incluyendo selección mensual, administración/publicación y dashboard `PENDING_PAYMENT`. El retorno manipulado `?subscription=checkout-return&status=approved` conserva el estado pendiente y muestra que volver al sitio no acredita el pago. **No prueba cobro.** La aserción histórica que prometía completar el pago sin credenciales se actualizó al mensaje correcto de cobro deshabilitado.
- Integración vertical Supabase: **1/1 aprobado**, 2,58 segundos sobre la base reconstruida. `npm run test:integration` usa exclusivamente la API local `55321`.
- Persistencia: reset local desde cero con todas las migraciones y seed, nueva migración incluida; SQL de pagos, búsqueda y workflow aprobados. Cuatro carreras entre conexiones reales aprobadas: selección única, una sola reserva de checkout, un evento/período para pago duplicado y convergencia ante rechazo/aprobación concurrentes. Advisors de seguridad sin hallazgos y lint SQL público/privado sin advertencias. Logs: `/tmp/psi-payments-db-reset.log` y `/tmp/psi-payments-{sql,concurrency,search,workflow,advisors,db-lint}-final.log`.

La infraestructura local de validación usa un stack propio y conserva los otros contenedores/proyectos. Los secretos de ese stack sólo se cargaron desde archivos temporales privados. No se usaron claves de Mercado Pago ni una base remota en estas pruebas.

Al cerrar la ejecución se detuvieron los servidores de prueba y el stack `psi_payments_20260911`, conservando sus volúmenes. Configuración aislada para reanudar: `/tmp/psi-payments-sandbox-20260911/supabase/config.toml`; no reemplaza la configuración ni las credenciales del entorno sandbox externo pendiente.

### Reanudación local — 12/09/2026 01:40 UTC

Se reanudó únicamente `psi_payments_20260911` con sus volúmenes existentes, sin reset. PostgreSQL, Auth, Storage, Kong, Realtime, Mailpit y Postgres Meta saludables; REST en ejecución. Health HTTP de Auth, REST y Storage devolvió **200**. La base local conserva la migración `20260911224302`; al verificar había cero usuarios y cero suscripciones después de la limpieza de fixtures anterior. No se modificó la base original en 54321 ni una base remota. Los puertos de app 3179 y 3180 estaban libres, sin servidor de aplicación iniciado.

| Servicio aislado | Endpoint |
| --- | --- |
| API | `http://127.0.0.1:55321` |
| Auth health | `http://127.0.0.1:55321/auth/v1/health` |
| REST | `http://127.0.0.1:55321/rest/v1/` |
| Storage health | `http://127.0.0.1:55321/storage/v1/status` |
| PostgreSQL | `127.0.0.1:55322` |
| Bandeja de correo de prueba | `http://127.0.0.1:55324` |
| App prevista | `http://127.0.0.1:3179` |

Desde la raíz del repositorio, con Node 24 en PATH, arranque idempotente sin reset:

```bash
umask 077
./node_modules/.bin/supabase start --workdir /tmp/psi-payments-sandbox-20260911 --exclude studio,imgproxy,edge-runtime,logflare,vector,supavisor > /tmp/psi-payments-supabase-resume.log 2>&1
./node_modules/.bin/supabase status --workdir /tmp/psi-payments-sandbox-20260911 -o json > /tmp/psi-payments-local-status.json
```

El comando de estado puede contener secretos: se guarda sólo en el archivo privado; no copiar su salida al chat o documentación. Ambos archivos quedaron con modo **0600**. `/tmp/psi-local-run.py` valida API_URL loopback 55321 y carga esas claves sin mostrarlas. Para abrir solamente la aplicación local sin proveedor:

```bash
python3 /tmp/psi-local-run.py env NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3179 UNIVERSO_PSI_TEST_MODE=false MERCADOPAGO_CHECKOUT_ENABLED=false npm run dev -- --hostname 127.0.0.1 --port 3179
```

El helper elimina variables `MERCADOPAGO_*` heredadas, por lo que este comando **no realiza un checkout sandbox**. Para el recorrido real habrá un loader separado cuando el coordinador confirme que el archivo privado está listo. En esta reanudación no se leyó `.env.mercadopago.sandbox.local`.

`cloudflared` y `ngrok` no se encontraron en PATH. No se instaló ni abrió un túnel. La alternativa HTTPS y una eventual base remota exclusiva de prueba quedan coordinadas por release. La nueva DB fixture del ensayo de migración legacy se prepara por el agente de datos dentro del contenedor local y no reemplaza la DB `postgres` que usará QA.

### Revalidación después de configuración — 12/09/2026 UTC

El coordinador actualizó `next.config.ts` para derivar el host de imágenes desde `NEXT_PUBLIC_SUPABASE_URL` y alineó las URLs locales de Auth en `supabase/config.toml`. Informó lint, typecheck, 141 unitarios y build Docker Node 24 aprobados. QA reutilizó ese build **`4S5vLZUA9oi9nz7wvmS-x`**, sin reconstruir ni iniciar `next dev`.

Prueba ejecutada: suite pública Playwright completa con fixtures, puerto exclusivo 3180, Node 24.15.0. **36/36 aprobados en 47,9 segundos**: home, búsqueda/directorio, perfil, contacto, navegación, tema, responsive y estructura accesible en Chromium escritorio/móvil. Verificación HTTP adicional de `/planes`: **200**, contenido identificado como Universo Psi. Log: `/tmp/psi-payments-postconfig-public-20260912.log`. El runner detuvo su servidor al terminar.

Huellas de las configuraciones de esa ejecución:

- `next.config.ts`: `c1e28bab2b40489e526410978ca1394e9c08bb61759dfe78bb5a40fdaae54850`.
- `supabase/config.toml`: `76e57f165cd3a90ef7db686cad536e05b5db71778046c8efd5cc806ab050b70e`.

Límites: fixtures públicos no incluyen una foto real de Storage; **carga efectiva de imagen remota NO EJECUTADA**. Esta pasada no repite el flujo autenticado ni demuestra redirección OAuth remota, checkout, cobro o notificación de Mercado Pago. No se leyó el archivo pendiente de credenciales MP ni se usó la base productiva.

### Persistencia en Supabase hospedado — 12/09/2026 01:56 UTC

Tras confirmación de Datos de la aplicación de la correctiva y autorización del coordinador, QA ejecutó **`supabase/tests/database/payment_persistence.sql`** sobre el proyecto aislado `gzsbndvaxdyuyhjidfqq`. La ruta sugerida inicialmente `tests/sql/subscription-payment-contracts.sql` no existe; se utilizó la suite real del repositorio **sin editarla**. Hash de fuente: `3188cee07d7d0d25a6ea35c19f2e4f4305ebbd9bd6a9a4c36e2cde33d03aa3fa`.

Antes de enviar SQL se validaron por Management API el ID del proyecto, nombre `universo-psi-mp-sandbox`, organización `qwxmgztzoidyzkelupdr` y estado `ACTIVE_HEALTHY`. La suite se transportó en un solo query conservando `BEGIN` y `ROLLBACK`; únicamente se quitó del payload la directiva de cliente psql `\set ON_ERROR_STOP on`. La credencial de Management se obtuvo en memoria mediante el helper privado, sin imprimirla ni usar el proyecto vinculado de producción. No hay llamadas a servicios de pagos en esta suite.

**Resultado: APROBADO**, HTTP **201**, marcador final `PASS: payment persistence, isolation, transitions and RPC permissions`. Cubre reserva única y reintento, enlace tardío sin consumir evento, snapshots/importe/moneda/cuenta, duplicados, fuera de orden, aprobación/rechazo y período de gracia, cancelación/reembolso, aislamiento de cuentas, grants de RPC/tablas privadas y RLS con rol autenticado. Los eventos y cobros de esta prueba son fixtures SQL; **no son notificaciones auténticas ni cobros de Mercado Pago**. Las cuatro carreras entre conexiones reales se mantienen como evidencia local; no se repitieron concurrentemente en el remoto.

Rollback comprobado por una segunda consulta independiente: usuarios Auth, perfiles, suscripciones, eventos, receipts y estado interno de pagos quedaron todos en **0**, iguales a los conteos previos. Antes y después permanecieron una fila de la migración `20260911224302` y el plan mensual publicado ARS 120.000. No se dejaron fixtures, no se cambiaron precios y no se tocaron otros proyectos.

Evidencia local privada 0600: `/tmp/psi-payments-hosted-qa-20260912.json`, con target, timestamp, hash, HTTP, marcador y conteos antes/después. No contiene credenciales. La compra sandbox auténtica continúa **NO EJECUTADA** a la espera del token/email y el acceso al checkout del proveedor.

### Smoke del primer Preview público — 12/09/2026 02:36–02:41 UTC

Destino: `https://universo-psi-mp-test.vercel.app`, deployment **`dpl_8DQuAmxwcWsQuhwuCosbNRJ2RcEd`**, Vercel proyecto `prj_nZDkEEpIowd5rSJbYBWfyhQuVZDl`, target Preview. Release confirmó Supabase sandbox `gzsbndvaxdyuyhjidfqq`, `MERCADOPAGO_CHECKOUT_ENABLED=false`, `UNIVERSO_PSI_TEST_MODE=false` y ausencia de credenciales MP. Digest de 121 fuentes/configuración informado por release: `319f1e94dfa34b5e53ade77a4ffd6ff0d0f5d4b17fcb08456d527e7712b70426`.

QA usó Chromium nuevo mediante Playwright CLI, perfil aislado en memoria y viewport inicial 1365×900. No se abrió el navegador personal ni la ventana de Supabase del usuario; no se crearon cuentas, enviaron formularios ni solicitaron recursos a Mercado Pago. Las comprobaciones HTTP se hicieron sin cookies ni bypass de Vercel.

| Escenario y pasos | Esperado | Observado |
| --- | --- | --- |
| Abrir home y navegar a planes | Ambas páginas disponibles | **APROBADO**: HTTP200, navegación del navegador aislado sin bloqueo de autenticación Vercel |
| Esperar carga completa de `/planes` y revisar oferta | Plan mensual publicado ARS 120.000 visible, sin cobro habilitado | **FALLÓ**: cero tarjetas, cero precio y cero CTA de plan; intro y FAQ sí renderizados. Ancho de documento 1365 igual al viewport, sin overflow en esa vista |
| Revisar mensaje de cobro cerrado | No prometer pago/beneficios activos | **APROBADO**: «El cobro en línea todavía no está habilitado» y selección no genera cargo. El mensaje no compensa la oferta ausente |
| Abrir `/ingresar` sin credenciales | Formulario accesible | **APROBADO para carga**: HTTP200 y snapshot con controles Email, Contraseña e Ingresar; screenshot móvil 390×844 del formulario vacío. No se verificó autenticación ni alta |
| POST vacío a `/api/webhooks/mercado-pago/personal` sin sesión/bypass | Respuesta de aplicación cerrada por falta de MP | **APROBADO**: HTTP503, JSON `{"ok":false,"reason":"not_configured"}`, sin redirección a login |
| Revisar indexación del alias QA | Preview excluido de buscadores | **FALLÓ**: home/planes sin `X-Robots-Tag` y sin meta robots; `robots.txt` permite `/`. Ingreso sí tiene meta `noindex, nofollow` |
| Recorrido autenticado, checkout y pago auténtico | Cobro de prueba y transición comprobados | **NO EJECUTADO**: faltan token/email/webhook y está cerrado el checkout |

Hallazgos comunicados al coordinador. Implementación confirmó un filtro que cruzaba el código DB `PROFESSIONAL_MONTHLY` con el slug editorial y descartaba el plan; prepara corrección y regresión. El coordinador prepara `noindex` explícito para Preview/QA. **Ambas correcciones requieren un nuevo deployment y revalidación; este smoke inicial no las da por aprobadas.** Se detuvo el smoke adicional por coordinación hasta esa versión.

Evidencia: `/tmp/psi-hosted-app-http-20260912.json` (0600, estados HTTP y metadata sin secretos) y `output/playwright/psi-hosted-smoke-20260912/`: `planes-desktop.png`, `ingresar-mobile.png`, snapshots de navegación y formulario. Una lectura auxiliar de etiquetas falló en el script QA al iterar `labels` de un input oculto; no se contabiliza como defecto de la app ni como validación completa de foco/targets móviles.

### Revalidación del Preview corregido — 12/09/2026 02:50–02:52 UTC

**Resultado del smoke focalizado: APROBADO.** Alias `https://universo-psi-mp-test.vercel.app` confirmado por release sobre **`dpl_DMwqRRXnxuEuAueboZjuVYX7vEXM`**, target Preview; URL única `https://universo-psi-mp-test-3hccnv77q-nmarcosan-2648s-projects.vercel.app`. Source digest informado por release: `35ab6d4806555b7b56cd032910bc8ddca9a3b854fc19a44f0f7f758a38de006d`. El coordinador informó lint, typecheck, **144 unitarios** y build Node 24 aprobados, build ID `FPHe7ktgkIEnWn8FRhhLV`. QA no repitió suites locales ni builds.

Se reutilizó solamente el Chromium aislado creado para QA, sin credenciales ni cuentas. Se abrió `/planes` después del READY y se esperó su render completo. La revisión DOM y visual en **1365×900** y **390×844** confirma exactamente **una tarjeta** «Profesional · Mensual», precio **$120.000**, copy de cobro mensual recurrente y enlace **`/profesionales/sumarse?plan=PROFESSIONAL_MONTHLY`**. No aparecen ofertas DRAFT. El CTA mide 44 px de alto en ambas vistas (ancho357/300); el ancho del documento coincide con el viewport1365/390, sin desbordes horizontales. El texto «El cobro en línea todavía no está habilitado» permanece visible. No se pulsó el CTA ni se inició autenticación o checkout.

La revalidación HTTP independiente, sin cookies ni bypass, confirmó:

| Recurso | Resultado observado |
| --- | --- |
| `/planes` | HTTP200, precio y CTA canónico presentes, copy de checkout cerrado |
| Headers de las cuatro rutas verificadas | `X-Robots-Tag: noindex, nofollow, noarchive` |
| `/robots.txt` | HTTP200; `User-Agent: *` y `Disallow: /` |
| `/sitemap.xml` | HTTP200; XML válido con `urlset` vacío, sin URLs publicadas |
| POST `{}` a `/api/webhooks/mercado-pago/personal` | HTTP503 y `{"ok":false,"reason":"not_configured"}`, sin redirección |

Así quedan resueltos los dos defectos del primer smoke. Un intento intermedio de release había fallado en el prerender del sitemap; el sitio final ahora entrega el sitemap vacío requerido para QA. No se infiere de estos resultados entrega auténtica de webhooks, cobro, activación ni renovación.

Evidencia final: `/tmp/psi-hosted-app-http-final-20260912.json` (0600) y capturas `output/playwright/psi-hosted-smoke-20260912/planes-desktop-final.png` y `planes-mobile-final.png`. El navegador QA se cerró al concluir. **Sandbox Mercado Pago continúa NO EJECUTADO**: faltan los tres insumos privados solicitados (token del vendedor de prueba, email exacto del comprador y secreto webhook), verificarlos y habilitar únicamente el checkout de prueba. Producción continúa sin autorización de cobros.

## Runbook sandbox pendiente

Producto seleccionado: Suscripciones con preapproval mensual, checkout con estado inicial pending. Oferta actual conservada: `PROFESSIONAL_MONTHLY`, ARS 120.000/mes; ninguna publicación o cambio de precios de planes DRAFT.

### Preparación del recorrido hospedado — 12/09/2026 UTC

Destino de prueba indicado por el coordinador: proyecto Supabase **`gzsbndvaxdyuyhjidfqq`**, independiente de producción; Preview HTTPS disponible en `https://universo-psi-mp-test.vercel.app` con checkout cerrado; smoke inicial y defectos registrados más abajo. Esta sección es preparación documental: todavía no se creó una cuenta ni suscripción desde QA y no se hicieron solicitudes POST a Mercado Pago. Credenciales MP pendientes de carga y verificación. Release confirmó el dominio y su asociación con esa base; el deployment final aprobado por el smoke público es `dpl_DMwqRRXnxuEuAueboZjuVYX7vEXM`. La configuración MP aún debe verificarse antes del recorrido.

**Requisito confirmado de `payer_email`:** la [referencia oficial completa de creación de preapproval](https://www.mercadopago.com.ar/developers/es/reference/online-payments/subscriptions/create-preapproval/post.md) indica que, para suscripciones sin plan asociado, durante el pago compara el email enviado con el del pagador y rechaza si no coinciden. La creación con `status=pending` pospone la elección del medio de pago, pero no documenta una excepción a esa comparación. El email ficticio del ejemplo de integración no permite concluir que cualquier dirección sea válida para un comprador de prueba.

El código actual pasa el email de la identidad autenticada de Universo Psi (`user.email` o `claims.email`) a `createCheckoutRedirectUrl`; el adaptador lo envía como `payer_email`. No hay un campo separado de email de facturación. Corrección 13/09/2026: esa dependencia era un defecto del código, no una regla válida de sandbox. El email de Universo Psi puede ser distinto; el email requerido por Mercado Pago debe provenir del pagador de forma independiente. No crear cuentas de Universo Psi para hacer coincidir emails. El ID numérico del comprador no es un campo del POST actual y no reemplaza el email; sólo sería útil para una corroboración adicional.

Los **tres insumos solicitados por el coordinador** se cargarán en `.env.mercadopago.sandbox.local`, archivo ignorado y privado: Access Token de Suscripciones del vendedor de prueba, `MERCADOPAGO_SANDBOX_BUYER_EMAIL` con el email exacto del comprador de prueba y secreto webhook de la integración de prueba. El rótulo de credencial «producción» dentro de la cuenta de prueba del vendedor no autoriza cobros reales: la identidad `test_user`, el collector esperado y `ENVIRONMENT=sandbox` se verificarán antes de usarla. QA no leyó ese archivo durante esta preparación.

La contraseña de Mercado Pago y los códigos de acceso se ingresarán por un mecanismo privado o por el usuario en su sesión dedicada; no se solicitan por chat. La contraseña de la cuenta nueva de Universo Psi será distinta, generada para QA y conservada en archivo privado 0600. La identidad de la app se preparará confirmada mediante administración **sólo de la base sandbox**, sin enviar mensajes reales al email ficticio del comprador; se registrará como fixture y no como prueba de entrega de correo/alta completa. No se creará usuario o perfil hasta disponer del email exacto. `MERCADOPAGO_SANDBOX_BUYER_EMAIL` es un insumo de preparación QA: no sustituye `user.email` en el contrato de checkout de la aplicación.

Secuencia concreta una vez que release confirme Preview y configuración:

1. Registrar dominio, deployment ID/commit y proyecto `gzsbndvaxdyuyhjidfqq`; comprobar que la aplicación usa esa base y que `UNIVERSO_PSI_TEST_MODE=false`. Mantener checkout cerrado hasta verificar vendedor de prueba, collector, ambiente y webhook secret. La comprobación del vendedor se hará por lectura autenticada cuando el coordinador habilite el acceso.
2. Crear identidad y perfil profesional nuevos exclusivamente para esta prueba. Completar términos y onboarding en la app. Verificar selección mensual propia, importe ARS 120.000, cadencia mensual y estado `PENDING_PAYMENT` antes de abrir checkout. Confirmar que los planes DRAFT siguen sin venderse.
3. Validar en escritorio y móvil planes → ingreso → onboarding/dashboard; inspeccionar foco y mensajes. Visitar retorno manipulado con `status=approved` antes de pagar y comparar estado de base y UI: ambos deben continuar pendientes.
4. Con cuenta MP de prueba verificada y checkout activado sólo en Preview, iniciar una selección y conservar referencia privada de su preapproval enlazado. Comprobar que `payer_email` corresponde al comprador previsto. Autorizar desde sesión dedicada del comprador de prueba, usando tarjeta oficial de prueba. No usar sesión personal ni medios reales.
5. Registrar por separado retorno del checkout, preapproval autorizado, factura generada y pago efectivamente aprobado. Esperar la liquidación asíncrona del proveedor sin reducir frecuencia ni monto. Sólo la entrega auténtica y la lectura del pago aprobado permiten comprobar `ACTIVE`, período persistido y beneficios efectivos. Si sólo existe consentimiento, el caso de cobro queda pendiente.
6. Con recursos creados exclusivamente por este ensayo, completar rechazo/pendiente, reentrega, recuperación de evento perdido y cancelación; conservar evidencia redactada del recurso del proveedor y de la transición local. Renovación se marca **NO EJECUTADA** hasta observar realmente un segundo ciclo de prueba. No duplicar autorizaciones para acelerar evidencia.

Pendientes inmediatos: token, email exacto del comprador y secreto webhook cargados por el usuario en el archivo privado; verificación de vendedor/collector/ambiente y configuración de webhook por el equipo. Los defectos de planes e indexación del primer Preview ya fueron corregidos y revalidados en el deployment final indicado arriba. La taxonomía mínima para el perfil nuevo y la migración quedan a cargo exclusivo del agente de datos. La existencia del proyecto hospedado o del botón de suscripción no cumple ninguno de los escenarios de pago de la matriz siguiente.

1. En un ambiente aislado confirmar vendedor y comprador de prueba del mismo país (Argentina), identidades distintas y credenciales del vendedor que corresponden a Suscripciones. Comprobar `/users/me` con collector esperado y `test_user`; no inferir ambiente por prefijo del token. Preparar el comprador y código de verificación por canal seguro. La guía específica de [cuentas de prueba de Suscripciones](https://www.mercadopago.com.ar/developers/es/docs/subscriptions/additional-content/your-integrations/test/accounts) documenta los roles y el código de ingreso.
2. Cargar variables de la cuenta elegida sin imprimirlas; `ENVIRONMENT=sandbox`, collector del vendedor y webhook secret de esa integración. Confirmar Supabase de prueba, URL HTTPS de callback alcanzable y eventos subscription_preapproval, subscription_authorized_payment y payment. Activar `MERCADOPAGO_CHECKOUT_ENABLED=true` solamente en ese ambiente sandbox.
3. Abrir navegador limpio, escritorio y móvil. Recorrer planes → ingreso/alta → selección → checkout. Comprobar monto/moneda servidor, foco visible, uso por teclado, controles de 44 px y mensajes de estado accesibles. La guía de [compra de prueba de Suscripciones](https://www.mercadopago.com.ar/developers/es/docs/subscriptions/integration-test/payment-approval) indica realizar el recorrido con usuario y tarjeta de crédito de prueba.
4. Usar tarjeta nacional de crédito del catálogo oficial de [tarjetas de prueba para Suscripciones](https://www.mercadopago.com.ar/developers/es/docs/subscriptions/additional-content/your-integrations/test/cards). La página consultada publica Visa y Mastercard con vencimiento 11/30; tomar allí los datos al ejecutar. Titular APRO para aprobación, OTHE/FUND para rechazo y CONT para pendiente. Confirmar el resultado efectivo que devuelve Suscripciones: no extrapolar un resultado de Checkout API/Bricks ni contar la autorización como cobro.
5. Sin pagar, visitar retorno con `status=approved`: verificar estado y beneficios sin activar. Después autorizar el checkout y esperar el pago real de prueba; conservar referencia redactada de preapproval, factura, payment, entrega auténtica y estado final de base. Sólo payment aprobado congruente debe activar período y beneficios. Un 200 del simulador no satisface este paso.
6. Repetir pendiente/rechazado; reenviar la misma entrega auténtica y confirmar ningún segundo período. En un entorno controlado introducir fallo de enlace antes del webhook y recuperar por reintento. Probar doble click/concurrencia y eventos fuera de orden conservando saldo temporal correcto.
7. Para renovación observar una factura/pago de prueba posterior real del proveedor. Para cancelación usar exclusivamente la suscripción de prueba creada en este runbook, confirmar estado MP y persistido y que eventos viejos no la reactiven. No reducir frecuencia/precio del plan comercial ni cancelar suscripciones de clientes para acelerar QA.
8. Repetir identidad y entrega en namespaces personal/company cuando existan credenciales de prueba para ambos. Si sólo se habilita una cuenta, registrar la otra **NO EJECUTADA** y no configurarla para nuevos cobros.

| Escenario sandbox | Esperado | Estado actual |
| --- | --- | --- |
| Planes → autenticación/alta → checkout escritorio/móvil | Checkout del dueño con snapshot correcto, foco y mensajes accesibles | **NO EJECUTADO**, faltan accesos |
| Retorno manipulado sin pago | Sigue pendiente, sin beneficios | **NO EJECUTADO en sandbox** |
| Autorización sin pago aprobado | Sigue pendiente, sin período pago | **NO EJECUTADO** |
| Pago de prueba aprobado + webhook auténtico | ACTIVE y un período persistido, beneficio comprobado | **NO EJECUTADO** |
| Pendiente/rechazado, duplicado, fuera de orden | No activación falsa ni período duplicado | **NO EJECUTADO** |
| Renovación y cancelación de suscripción de prueba | Nuevo período único y cancelación sin reactivación por evento viejo | **NO EJECUTADO** |
| Cuentas personal/company | Sin cruce de vendedor o ambiente | **NO EJECUTADO** |

Por ejecución registrar: ambiente y versión/despliegue, timestamp UTC, escenario, pasos, esperado, observado, refs de recursos redactadas, screenshot/trace de UI sin secretos ni PII y consulta mínima del estado persistido. Guardar capturas en `output/playwright/`; no adjuntar tokens, datos del comprador o cuerpos completos del proveedor.

La aprobación para producción requiere completar esos escenarios pendientes y presentar cuenta que cobra, proyecto/base/dominio exactos, monto/moneda/cadencia y configuración final al dueño. Este reporte no sustituye esa aprobación.

### Preparación de identidad tras carga privada — 12/09/2026

El coordinador informó que el archivo privado ahora contiene token, email, secreto webhook y public key. QA comprobó **sólo el campo email** en memoria: presente, formato válido, longitud admisible y sin placeholder detectado; archivo modo0600. No se registró la dirección ni se analizaron valores de tokens/secreto. El email no coincide con el patrón histórico `test_user_<n>@testuser.com`; ese dato no lo invalida, pero la sintaxis **no prueba identidad de comprador MP**. Release verifica al vendedor por separado. La compra auténtica sigue NO EJECUTADA.

Preparación local sin escrituras remotas: `/tmp/psi-hosted-identity-plan-20260912.json` (0600) contiene target fijo sandbox, IDs de taxonomía ya sembrada y campos ficticios para un borrador. No contiene email, password ni token. `execution_authorized=false`: **no se creó usuario, perfil ni suscripción**; la ejecución espera aviso del coordinador.

Secuencia preparada para ese aviso:

1. Confirmar target `gzsbndvaxdyuyhjidfqq` y crear únicamente una identidad Auth nueva con el email exacto cargado y una contraseña aleatoria de QA distinta de MP, conservada en archivo privado0600. Usar creación administrativa con `email_confirm: true`, sin invitación ni envío de correo al comprador. La [documentación oficial de Supabase para createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser) confirma la creación en servidor y auto-confirmación; se registra como fixture, no como prueba de entrega de correo. No asignar ADMIN/SUPERADMIN.
2. Abrir navegador nuevo y aislado para la app, sin adjuntar sesiones Chrome existentes. Ingresar por `/ingresar?next=/profesionales/sumarse?plan=PROFESSIONAL_MONTHLY`, completar credenciales desde archivo/memoria privados sin logs y aceptar términos versión2026-08 por la UI. Para ejecución usar `next` URL-encoded.
3. Completar nombre ficticio, profesión Psicólogo/a, experiencia0, disponibilidad Consultar, Ansiedad, Terapia individual, Online y Español; titular de al menos10 y biografía de al menos40 caracteres identificando expresamente el fixture. Guardar borrador mensual. El código de `saveOnboardingAction` llama `select_professional_plan` también al guardar borrador: se espera una suscripción propia PENDING_PAYMENT con snapshot ARS120.000. Este paso no requiere documentos ni publicación. No reutilizar el helper E2E local: prepara administrador, limpieza y un catálogo mayor que no corresponden al ensayo hospedado.
4. Verificar dashboard y retorno manipulado antes del pago. Cuando el coordinador habilite checkout sandbox tras validar proveedor/configuración, usar el reintento propio desde dashboard. La documentación o revisión profesional son requisitos de publicación diferentes del estado de pago; un perfil borrador no demuestra beneficios de visibilidad pública aunque el cobro se apruebe.
5. La autenticación del comprador Mercado Pago se hará manualmente en un navegador nuevo dedicado al ensayo cuando el checkout esté autorizado. El usuario ingresa su contraseña/código allí; no se solicita por chat ni se copia la sesión personal. No se abrió MP durante esta preparación.

Se revisaron `tests/e2e/authenticated/authenticated-vertical.spec.ts`, su helper local, validación y acciones de onboarding, selección de plan y fixtures SQL mínimos. No se ejecutaron tests, builds, SQL ni llamadas MP en esta tarea.

### Identidad y retorno sin pago en sandbox hospedado — 12/09/2026 13:41–13:50 UTC

**Preparación autorizada completada.** Se creó una única identidad Auth confirmada en `gzsbndvaxdyuyhjidfqq`, tras verificar que el email exacto cargado no existiera. No se modificó una identidad previa ni se asignaron roles administrativos. Credenciales y referencias del fixture se conservan exclusivamente en `/tmp/psi-hosted-app-identity-20260912.json` (0600); la contraseña de la app es aleatoria y distinta de Mercado Pago. El helper privado fija el host sandbox y rechaza coincidencias o reintentos sobre su archivo existente.

Versión app: alias QA `https://universo-psi-mp-test.vercel.app`, deployment previamente confirmado `dpl_DMwqRRXnxuEuAueboZjuVYX7vEXM`, checkout todavía cerrado. Se abrió **otro Chromium visible y nuevo**, sesión `psi-hosted-auth-20260912`, sin conectar el Chrome habitual ni el perfil Supabase. Ingreso, aceptación de términos2026-08 y guardado del perfil se ejecutaron mediante UI normal. El perfil «Prueba Sandbox Psi» declara expresamente que es ficticio y no ofrece atención real. Se eligieron únicamente las taxonomías existentes y el mensual publicado; no se adjuntaron documentos, envió a revisión ni publicó el perfil.

| Escenario | Esperado | Observado |
| --- | --- | --- |
| Guardar borrador mensual | Perfil privado y selección propia pendiente | **APROBADO**: UI «Borrador guardado»; DB `DRAFT`, `NOT_VERIFIED`, `published_at=null` y exactamente una suscripción `PENDING_PAYMENT` |
| Snapshot del servidor | Mensual ARS120.000 sin cambio de precio | **APROBADO**: `PROFESSIONAL_MONTHLY`, `price_amount=120000`, `currency=ARS`, `billing_interval=MONTH`, `payment_model=RECURRING` |
| Abrir `/dashboard?subscription=checkout-return&status=approved` sin pago | No activar suscripción/período/beneficios | **APROBADO**: UI avisa que el regreso no acredita pago; no muestra suscripción activa. Lectura DB independiente después mantiene exactamente el mismo `PENDING_PAYMENT`, con `last_payment_at`, `current_period_start`, `current_period_end`, `provider_account` y `provider_subscription_id` todos null |
| Checkout cerrado durante preparación | No botón de continuación a MP ni llamada a proveedor | **APROBADO**: botón «Continuar en Mercado Pago» ausente; no se inició checkout ni se abrió MP |

Incidencia observada en login: el primer intento de Email/Contraseña con botón exacto «Ingresar» terminó en autorización Google no habilitada (HTTP400). Después de recargar, el segundo intento llegó correctamente a términos. El formulario tenía un solo `form`, botones separados por `formAction` e hidratación presente; no hubo error de hidratación en consola. Se comunicó a implementación, **sin atribuir una causa confirmada ni modificar Auth**. Un error en la espera auxiliar del segundo intento no impidió el login real, corroborado por DOM y aceptación persistida. No se amplió la investigación durante este ensayo.

Evidencias redactadas: `/tmp/psi-hosted-draft-before-20260912.json` y `/tmp/psi-hosted-draft-after-20260912.json` (0600, sin email ni IDs personales), `output/playwright/psi-hosted-auth-20260912/retorno-pendiente.png` (sólo sección de suscripción), snapshots con email/password omitidos. La sesión nueva queda abierta exclusivamente para que el usuario continúe el ensayo autorizado; no se borró la identidad ni el borrador.

**Pendiente actual:** la revisión automática rechazó transferir las credenciales MP y activar checkout en Preview porque faltaba aprobación explícita del payload/destino. El coordinador presentará esa configuración concreta al usuario. Los valores privados ya fueron cargados y release informó vendedor de prueba verificado; aún faltan transferencia autorizada, configuración efectiva, checkout de prueba, notificación auténtica y pago aprobado. El recorrido MP continúa **NO EJECUTADO**. No se realizaron cobros, cambios de precios, builds ni suites adicionales en esta preparación.

### Primer intento de checkout sandbox autorizado — 12/09/2026 13:56–14:01 UTC

El usuario aprobó la transferencia de las cuatro variables MP, checkout activo y despliegue **sólo en Preview QA**. Release confirmó READY y alias sobre `dpl_D8n8c3GicHUAFU3upir3ncffgHbc`, misma fuente `35ab6d48…`, con vendedor `test_user` de Argentina verificado nuevamente. La aprobación pendiente descrita en la sección anterior quedó resuelta para ese destino de prueba; no habilita producción.

QA reutilizó la misma identidad/perfil/sesión exclusiva, sin crear duplicados. Tras refrescar dashboard, la UI mostró Profesional·Mensual, pago todavía no confirmado y exactamente un botón «Continuar en Mercado Pago». Datos confirmó snapshot previo con propiedad correcta, una única suscripción `PENDING_PAYMENT`, ARS120.000, sin reserva, cuenta, enlace, eventos, receipts ni período.

Una primera ejecución de la instrumentación **no llegó al click**: la guardia del helper usó `URL`, no disponible en el sandbox de `run-code`, y falló antes de incrementar el contador o ejecutar `button.click`. Se corrigió únicamente el helper privado; una lectura adicional de Datos confirmó que seguía sin reserva o cambios. Este fallo instrumental no se cuenta como intento de checkout.

A las13:59 UTC se ejecutó **un único click real** por UI normal, autorizado por el coordinador después del snapshot. Observación de navegador sin cuerpos: una solicitud Server Action POST a `/dashboard` respondió HTTP200 y la app navegó a **`/dashboard?subscription=checkout-error`**. El panel mostró «No pudimos retomar el pago…», mantuvo estado pendiente y no mostró activación. **No llegó al login de Mercado Pago.** Un HTTP200 del transporte de Server Actions no representa checkout exitoso.

Resultado: **FALLÓ el inicio de checkout; no hubo un segundo click.** Snapshot posterior de Datos: la misma suscripción PENDING120000ARS, `provider_account=null`, sin reserva ni recurso enlazado, eventos0/receipts0, sin último pago ni período; perfil DRAFT/NOT_VERIFIED. No se atribuye todavía una causa de backend: reserva ausente es evidencia de persistencia, no prueba por sí sola qué llamadas remotas se intentaron. Release/coordinador revisan logs redactados para distinguir validación/configuración/RPC.

Evidencia privada0600: `/tmp/psi-hosted-checkout-once-20260912.json` y `.log`, snapshots de Datos `/tmp/psi-hosted-payment-before_checkout-20260912.json`, `psi-hosted-payment-instrumentation_check-20260912.json` y `psi-hosted-payment-after_checkout-20260912.json`. Captura recortada sin email: `output/playwright/psi-hosted-auth-20260912/checkout-error-once.png`. El navegador exclusivo queda abierto en el error, sin ingresar comprador ni contraseña MP.

Pendiente actual: diagnosticar y corregir el inicio de checkout antes de un eventual reintento coordinado; luego login manual del comprador, entrega auténtica y pago de prueba aprobado. **Compra/cobro/activación/renovación Mercado Pago siguen NO EJECUTADOS.** No se repitieron POST a ciegas, no hubo cargos reales, cambios de precio ni pruebas adicionales fuera del alcance.

### Diagnóstico y preparación de revalidación del reintento — 12/09/2026

El coordinador identificó la causa del `checkout-error`: `retrySubscriptionCheckoutAction` filtraba `professional_profiles.user_id`, una columna protegida. La consulta con JWT del usuario devolvía HTTP403 / PostgreSQL42501, por lo que el flujo se detenía antes de reservar el checkout. Implementación prepara reemplazar esa lectura por la RPC existente de perfil propio; no se amplían grants ni se cambia la base para resolverlo.

QA verificó el formulario servido de la misma sesión sin mostrar referencias: exactamente un hidden `subscriptionId`, **igual al ID del fixture privado**, y un botón «Continuar en Mercado Pago». Evidencia `/tmp/psi-hosted-form-check-20260912.json` (0600, sólo conteos y booleano). No hubo click adicional. La corrección espera pruebas integradas, nuevo deployment READY y snapshot before de Datos sobre la misma suscripción; la próxima revalidación será un único click coordinado, sin duplicar identidades o recursos.

### Intento único posterior al fix de propiedad — 12/09/2026 14:13–14:15 UTC

El coordinador informó corrección de la lectura de propietario por RPC existente, prueba remota con JWT válida y validaciones locales aprobadas: lint, typecheck, **150 tests**, build `1UjtEyuPqdbtA29e_3FTu`. Release confirmó READY/alias sobre **`dpl_Fqqjowr2VNcpHxQjjzu3YULbNYgd`** (mismas variables sandbox autorizadas). QA no repitió suites/builds.

Se recargó completamente el dashboard de la misma sesión. El hidden `subscriptionId` continuó siendo único y coincidente con el fixture privado; un botón de checkout. Root ejecutó el observador de Datos, porque no se pudo reactivar ese agente, y confirmó propiedad, una PENDING120000ARS y ausencia de reserva/recurso/pagos/eventos antes de autorizar el nuevo intento. Baseline: `/tmp/psi-hosted-payment-before_checkout_retry-20260912.json`.

**Resultado: FALLÓ el inicio de checkout.** Un único click real post-fix a las14:14UTC produjo Server Action POST `/dashboard` HTTP200 y retorno `subscription=checkout-error`. Sigue pendiente, sin mensaje de activación, y no llegó a login MP. No hubo segundo click ni reintento ciego. El nuevo bloqueo se investiga mediante logs por etapa y snapshot after del coordinador; no se da por resuelto por haber corregido la consulta anterior.

Evidencias privadas0600: `/tmp/psi-hosted-form-ownerfix-20260912.json`, `/tmp/psi-hosted-checkout-ownerfix-20260912.json` y `.log`. Captura recortada: `output/playwright/psi-hosted-auth-20260912/checkout-ownerfix-error.png`. Se conserva la sesión QA; compra, cobro, activación y notificación auténtica continúan **NO EJECUTADOS**.

Lectura after de Root del intento post-fix: `provider_account=personal`, **`checkout_reserved=true`**, sin recurso enlazado, eventos0/receipts0 y sin período pago. A diferencia del primer fallo, esta vez la reserva quedó persistida. **No volver a pulsar checkout ni emitir otro POST de creación**: release busca el recurso existente y el error tipado para determinar si el proveedor creó algo antes de fallar el enlace. La reserva por sí sola no prueba que el proveedor haya creado una suscripción ni que exista un pago. La sesión permanece abierta sin interacción adicional.

### Repreparación con comprador de prueba identificado — 12/09/2026

El usuario aportó una captura oficial del comprador de prueba argentino. El coordinador indicó preparar una identidad de app nueva para ese comprador y conservar el fixture anterior, cuyo email correspondía a una identidad personal y cuyo intento recibió rechazo400 con reserva persistida. La validación de formato de email realizada inicialmente no acreditaba que fuera un comprador de prueba; no se reutiliza esa identidad para el nuevo ensayo. No se borró, actualizó ni reinició su reserva.

Release informó lectura pública GETbuyer HTTP200 con ID/país coincidentes con la captura, pero **email y tags ausentes de la respuesta**. La ausencia no equivale a un valor negativo y **no permite inferir el correo desde username o ID**. No se modificó el archivo de entorno con un email supuesto. Las credenciales de ingreso del comprador de prueba ya fueron provistas por el usuario y no se vuelven a pedir, reproducir ni guardar en código/documentación/logs.

QA preparó sólo `/tmp/psi-hosted-buyer-identity-plan-20260912.json` (0600), con `execution_authorized=false`. Define una futura identidad en `/tmp/psi-hosted-buyer-app-identity-20260912.json` y sesión nueva `psi-hosted-buyer-auth-20260912`, distintas del fixture anterior. Contiene datos ficticios de borrador y referencias de prueba; **no contiene email inferido, contraseña ni token**. No se creó usuario/perfil, no se abrió la nueva sesión y no se ejecutó checkout.

Insumo indispensable pendiente para esta preparación: **email autoritativo del comprador de prueba**. Después de verificarlo, la creación de identidad y el siguiente checkout esperan aviso expreso del coordinador. Compra, pago, activación y entrega auténtica de MP continúan no comprobados.

### Email autoritativo obtenido por login del comprador test — 12/09/2026

Con autorización expresa se abrió **otro Chromium nuevo y aislado**, sesión `psi-mp-buyer-readonly-20260912`, exclusivamente para el comprador de prueba indicado. No se reutilizó Chrome habitual, la sesión Supabase ni la antigua sesión de app. Se siguió Iniciar sesión desde Mercado Pago oficial. Username y contraseña provistos por el usuario se enviaron **una vez cada uno** al formulario oficial; no hubo captcha, rechazo de credenciales ni necesidad de código adicional. Un timeout inicial al pulsar la etiqueta del método Contraseña se resolvió usando su botón normal: no se forzó el control ni se repitió una contraseña.

El login llegó a `/home`; se consultó únicamente Configurar perfil → Información de tu perfil. **Resultado APROBADO:** `/accounts/profile-data` mostró exactamente un email completo sin máscara y un username visible que coincide con el comprador de prueba indicado por el usuario. El ID numérico no estaba visible en esta UI; no se infiere de username/email. La lectura GET previa de release había corroborado ID y país, y la coincidencia de username completa la asociación de esta sesión con la cuenta indicada. No se leyeron ni extrajeron cookies o tokens de sesión.

El email exacto se guardó únicamente en `/tmp/psi-mp-buyer-email-authoritative-20260912.json` (0600), con fuente, timestamp y comprobaciones. Se actualizó **sólo** `MERCADOPAGO_SANDBOX_BUYER_EMAIL` en `.env.mercadopago.sandbox.local`, conservando modo0600 y el resto de campos idénticos. No se publica el email ni las credenciales en este reporte. Las entradas privadas temporales del formulario se eliminaron después de usarlas; outputs de la herramienta y artefactos textuales quedaron filtrados.

La preparación nueva `/tmp/psi-hosted-buyer-identity-plan-20260912.json` apunta ahora a esa fuente privada y registra email verificado; creación/checkout siguen **sin ejecutar** a la espera del aviso del coordinador. Se conserva autenticada la nueva sesión de comprador para el ensayo posterior. No se modificaron datos de MP, no se realizaron pagos ni se crearon recursos. El fixture anterior y su reserva permanecen intactos.

### Nuevo fixture con email del comprador test — 12/09/2026 14:59–15:06 UTC

Con aviso expreso del coordinador, se creó **otra identidad Auth confirmada sólo en sandbox** usando el email autoritativo observado en la cuenta del comprador test. Antes se comprobó que no existiera ese email. Se generó una contraseña propia de la app, conservada en archivo privado0600; no se reutilizó la contraseña MP. La identidad anterior y su reserva se conservaron intactas.

Nueva sesión app visible y aislada: `psi-hosted-buyer-auth-20260912`; sesión MP autenticada conservada aparte: `psi-mp-buyer-readonly-20260912`. El login de la nueva app fue exitoso. El primer envío de aceptación de términos por UI (15:00:38UTC) devolvió «No pudimos registrar tu aceptación»; no se diagnosticó la causa. La revisión de sólo lectura confirmó que existían el user_profile y el bundle vigenteTERMS/PRIVACY2026-08. Por autorización puntual se hizo **una llamada idempotente** a `accept_current_terms` con publishable key y JWT propio del nuevo usuario, después del consentimiento UI: HTTP200, identidad verificada, aceptación15:04:10UTC. No hubo override administrativo ni escritura directa de términos. Esto demuestra que el contrato RPC funcionó en esa llamada; no demuestra que el primer error fuera transitorio ni completa una prueba exitosa de esa Server Action.

Después de recargar la UI se completó el onboarding mínimo con nombre ficticio «Comprador Prueba Sandbox» y textos que aclaran el carácter de prueba. Guardar y continuar devolvió **Borrador guardado**. No se cargaron documentos, envió a revisión ni publicó el perfil. La lectura baseline a15:06:12UTC confirmó:

- target `gzsbndvaxdyuyhjidfqq`, términos2026-08;
- perfil `DRAFT`, `NOT_VERIFIED`, `published_at=null`;
- exactamente una suscripción propia `PENDING_PAYMENT`, snapshot `PROFESSIONAL_MONTHLY`, ARS120.000, MONTH/RECURRING;
- `provider_account`, `provider_subscription_id`, `last_payment_at`, `current_period_start` y `current_period_end` todos null.

Archivos nuevos privados0600: `/tmp/psi-hosted-buyer-app-identity-20260912.json` contiene email/password y referencias `userId/profileId/subscriptionId`; `/tmp/psi-hosted-buyer-draft-baseline-20260912.json` contiene estados sin email/IDs personales. Diagnóstico legal: `/tmp/psi-hosted-buyer-legal-read-20260912.json` y `/tmp/psi-hosted-buyer-accept-terms-once-20260912.json`. Captura sólo suscripción: `output/playwright/psi-hosted-buyer-auth-20260912/buyer-pending-baseline.png`.

**No se inició checkout para este fixture nuevo.** La sesión queda en dashboard a la espera del baseline ampliado/aviso del coordinador. Se mantienen separadas las evidencias y reservas del fixture anterior.

### Checkout del comprador de prueba correcto — 12/09/2026 15:08 UTC

Root confirmó baseline ampliado del nuevo fixture: propietario correcto, una suscripción PENDING120000ARS, perfil DRAFT, sin proveedor/reserva/enlace ni eventos/receipts/período. Autorizó **un único click** desde `psi-hosted-buyer-auth-20260912`. QA comprobó en memoria el hidden `subscriptionId` contra la nueva referencia privada y ejecutó ese único click sobre el deployment `dpl_Fqqjowr2VNcpHxQjjzu3YULbNYgd`.

**Resultado del inicio de checkout: APROBADO hasta redirección al proveedor.** A15:08:50UTC, POST Server Action `/dashboard` HTTP200 y navegación a `https://www.mercadopago.com.ar/checkout/v1/subscription/redirect`. La URL contenía las claves `preference-id` y `router-request-id`; sus valores se conservan únicamente en evidencia privada. No se repitió el click.

El navegador quedó detenido en Mercado Pago, **sin ingresar tarjeta ni confirmar la suscripción**. Root/release verifican ahora reserva, enlace, vendedor, aplicación e importe del recurso creado antes de cualquier continuación. La redirección no prueba autorización, cobro, activación ni entrega auténtica. Esos escenarios siguen pendientes.

Evidencias privadas0600, separadas de los intentos anteriores: `/tmp/psi-hosted-buyer-checkout-once-20260912.json` y `.log`. Los fixtures anteriores, sus reservas y la sesión autenticada de comprador MP se mantienen intactos.

### Confirmación de prueba y falta de actualización en la app — 12/09/2026 15:27–15:29 UTC

Se continuó **el mismo recurso creado a las15:08UTC**, trasladando su URL privada a la sesión aislada del comprador de prueba ya autenticado. No se creó otro checkout. Antes de continuar, release verificó mediante GET que el recurso correspondía al comprador y vendedor de prueba esperados, al enlace persistido en DB y al snapshot mensual de ARS120.000. El `application_id` autoritativo del recurso difiere de la aplicación que aparecía en la captura de las cuentas de prueba; el coordinador mantiene pendiente comprobar que la configuración de notificaciones corresponda a la aplicación que creó este recurso.

Con autorización expresa para este ensayo, se eligió Nueva tarjeta y se usaron exclusivamente los datos públicos de **Mastercard de prueba, terminación0604**, titular APRO y documento de prueba de la [documentación oficial de Suscripciones](https://www.mercadopago.com.ar/developers/es/docs/subscriptions/additional-content/your-integrations/test/cards). No se usaron tarjetas reales ni se modificó el precio. El primer Continuar del formulario mostró validación de CVC vacío pese a la entrada inicial. Se corrigió la interacción mediante foco y teclado normales dentro del campo seguro, sin forzar controles ni eludir desafíos. Un segundo Continuar, autorizado para revalidar ese formulario, llegó al resumen. Esta incidencia de interacción no demuestra un defecto del backend.

El resumen mostró Universo Psi · Profesional · Mensual, ARS120.000 por mes y la tarjeta de prueba esperada. Se ejecutó **una sola confirmación final**, a las15:27:09UTC. Mercado Pago navegó a `/subscriptions/checkout/congrats` y mostró «¡Listo! Ya te suscribiste a Universo Psi · Profesional · Mensual.». Esta pantalla acredita la confirmación observada en UI; por sí sola no acredita pago aprobado, webhook ni beneficios activos.

El coordinador informó después la lectura autoritativa del proveedor: **suscripción AUTHORIZED y pago APPROVED**. También informó `live_mode=true` aun tratándose de las cuentas de prueba controladas. Este dato requiere investigar el contrato efectivo de modo de Suscripciones y su compatibilidad con la validación de la app; no se lo presenta como evidencia de cobro de producción ni se cambia la validación para aceptar el caso sin diagnóstico. La consulta adicional del endpoint de facturas rechazó los límites50 y20 y luego respondió429; release detuvo las consultas. QA no ejecutó esas lecturas ni las repitió.

**Resultado en Universo Psi: pendiente, recorrido completo todavía NO APROBADO.** La lectura DB del coordinador posterior a la confirmación mantiene `PENDING_PAYMENT`, eventos0, receipts0 y ausencia de período pagado. No se observaron solicitudes de webhook auténticas. QA recargó únicamente `/dashboard` en la sesión de app del nuevo comprador a las15:28:59UTC: la sección de suscripción dice «Tu elección está guardada y el pago todavía no está confirmado. Si ya lo autorizaste, esperá la confirmación de Mercado Pago.» y no muestra activación. No se pulsó nuevamente Continuar en Mercado Pago ni se ejecutó reconciliación manual.

Evidencias privadas0600: `/tmp/psi-mp-buyer-confirm-once-20260912.json` y `.log`, con timestamp y contador de confirmación igual a1; `/tmp/psi-hosted-buyer-checkout-url-20260912.json` conserva la URL del mismo recurso. Capturas limitadas: `output/playwright/psi-mp-buyer-readonly-20260912/test-subscription-review.png`, `test-subscription-congrats-safe.png` (identificador de operación oculto) y `output/playwright/psi-hosted-buyer-auth-20260912/after-mp-consent-pending.png` (sólo panel de suscripción). No se incluyen correos, credenciales ni referencias de operación en este reporte.

Pendientes concretos: comprobar la configuración de webhook de la aplicación que creó el recurso; obtener y validar una entrega auténtica; resolver con evidencia el contrato `live_mode` del recurso de prueba; acreditar persistencia del pago, período y activación en la app. Renovación real de prueba y recorrido completo posterior al pago continúan **NO EJECUTADOS**. El primer error de aceptación de términos por UI sigue sin causa diagnosticada. No se habilitaron cobros en producción, no hubo nuevas confirmaciones ni cambios de precio. Las dos sesiones exclusivas y ambos fixtures se conservan; QA detiene aquí las acciones en Mercado Pago.

## Revalidación posterior: factura, recuperación y Preview

Lint, TypeScript, 190 pruebas unitarias y build aprobaron. Preview `dpl_E1cjBmAaM2Sk91sQEptSXuqbMVP6` publicado únicamente en el proyecto de QA, con las quince variables autorizadas. El adaptador nuevo pasó además un smoke contra la API real: cuatro GET sin mocks del proveedor, vendedor de prueba y cadena factura/suscripción/pago coherentes.

La recuperación administrativa del único pago de prueba aprobado se ejecutó mediante la función real de la aplicación, con guards de destino y recurso: ocho GET del proveedor y exactamente dos RPC en la base sandbox. La observación posterior confirmó `ACTIVE`, un recibo, dos eventos y período pagado vigente. Una segunda ejecución del mismo recurso conservó exactamente suscripción, período, estado de pago, recibos, eventos, perfil y ranking; no duplicó beneficios. El dashboard en la sesión aislada respondió 200, mostró la suscripción activa y dejó de ofrecer checkout. El perfil ficticio continúa `DRAFT` y `NOT_VERIFIED`, sin publicación ni ranking. Esta evidencia acredita recuperación administrativa e idempotencia con un pago real del entorno de prueba; no acredita entrega de webhook auténtico, que permanece pendiente de configuración/acceso al panel del vendedor de prueba. No hubo nuevas confirmaciones de pago ni cambios de producción.

El webhook público devuelve GET 405 (método no implementado) y POST sin firma 401 `invalid_signature`. Estos controles no simulan una entrega auténtica. El mensaje genérico del panel de Mercado Pago no permite concluir que el proveedor esté caído ni atribuirlo a permisos. Se solicita verificar la aplicación emisora desde la cuenta Seller Test User.


## Simulación del proveedor y entrega automática — 12/09/2026 19:54–20:00 UTC

El usuario configuró el webhook en la aplicación del vendedor TEST y regeneró la firma. Preview `dpl_GZ5isPbTsuXdKvyKNqWsgb1pwMQr` sirve la firma actual; los probes locales dieron firma nueva 200 ignorado, anterior 401 y ausencia de firma 401. Son probes de configuración, sin cambios comerciales.

El simulador del panel emitió `subscription_preapproval` para el recurso verificado y recibió 200. Vercel correlacionó el POST a las 19:54:42.345 UTC con el deployment QA actual. La observación posterior en Supabase coincide exactamente con el baseline de recuperación duplicada: suscripción, período, estado de pago, recibos, eventos, perfil, ranking y cantidad de suscripciones iguales. Estado `ACTIVE`, un recibo y dos eventos. Evidencia privada: `/tmp/psi-hosted-payment-after_provider_simulation_buyer-20260912.json`. Esto aprueba conectividad, firma y deduplicación de una simulación emitida por Mercado Pago; no equivale a entrega comercial automática.

Para investigar esta última sin otro pago, root ejecutó una sola actualización de la descripción del preapproval TEST mediante `PUT` con únicamente `reason`, luego de validar vendedor TEST/MLA, comprador, aplicación, referencia y snapshot. API200 a las 20:00:14.758 UTC; conservó importe, moneda, frecuencia, estado, tarjeta, fecha próxima y resumen cobrado. El script no escribió en DB ni reconcilió. Primera observación posterior: `ACTIVE`, un recibo, dos eventos; entrega automática todavía no observada. Evidencia privada del PUT: `/tmp/psi-remote-config/automatic-webhook-reason-result.json`. El usuario informa que la sección Panel de monitoreo no abre; no se atribuye una causa sin evidencia ni se le pide reiterar el acceso.

La revisión detectó además que el tópico `payment` también aplica a cobros recurrentes, mientras el dispatch anterior lo dirigía sólo a `reconcileOneTimePayment`. Se está corrigiendo ese despacho con resolución de vínculo y factura autenticados. El control estricto de pagos únicos y la validación completa del vendedor TEST para la excepción recurrente se mantienen; la corrección no se considera probada ni desplegada hasta los checks integrados.


### Corrección del tópico payment recurrente — verificación integrada

La corrección quedó integrada en el adaptador, reconciliación y dispatch de la ruta. Lint, TypeScript, **222 tests en 11 archivos** y build Node24 aprobaron. QA independiente revisó los seis archivos sin encontrar defectos concretos. Búsqueda limitada al vínculo persistido, factura única del ID firmado, cuenta y snapshot comprobados, ONE_TIME estricto y errores cerrados; la RPC y su clave compartida de deduplicación no cambian.

El smoke con servicios reales de `reconcilePaymentNotification` pasó: siete GET MP, un GET de la suscripción sandbox y exactamente una RPC recurrente, todos200, sin429 ni timeout. El intento inicial sin red produjo TypeError antes de respuestas/RPC y quedó conservado; la fase `first-network` separada se ejecutó con acceso de red autorizado. La observación posterior conserva exactamente ocho grupos del baseline, incluido período: `ACTIVE`, un recibo, dos eventos, perfil DRAFT/NOT_VERIFIED y sin ranking. Evidencias privadas: `/tmp/psi-remote-config/payment-notification-smoke/result-first-network.json`, `/tmp/psi-hosted-payment-before_payment_topic_buyer-20260912.json` y `/tmp/psi-hosted-payment-after_payment_topic_buyer-20260912.json`.

Esto prueba deduplicación entre ambos tópicos al procesar el mismo pago ya registrado; se omite una repetición adicional sin nueva hipótesis. Pendiente el smoke de la ruta desplegada y una entrega automática del proveedor. La ausencia de POST se observó hasta20:02:19UTC tras el cambio de descripción, sin inferir causa ni ausencia definitiva.


### Preview final y ensayo de cancelación

La revisión previa al ensayo de cancelación encontró que la referencia oficial documenta `canceled`, mientras el adaptador reconocía sólo `cancelled`. Se admiten ambas variantes y se normalizan a `cancelled`, conservando la transición interna `CANCELED` y rechazando estados desconocidos. Lint, TypeScript, 228 tests en once archivos y build Node24 aprobaron. Preview QA quedó READY en `dpl_3VZzHsZxEtbMSMCsdznzJu1tpgcv`, fuente SHA256 `4f33a26bc6a1c1df7bdc0bef9537241a2f8c09781044a5eca879c06aebd314a2`, mismas quince variables. El smoke de la ruta publicada dio GET405, POST sin firma401 y un `payment` firmado localmente200. La base conserva exactamente los ocho grupos del baseline, con ACTIVE/un recibo/dos eventos. El navegador de pruebas respondió200, mostró suscripción activa y cero botones de checkout. Un primer intento sólo se detuvo por guardia de origen al estar seleccionada about:blank; la comprobación posterior abrió únicamente el dashboard QA y pasó.

El ensayo de cancelación TEST se inició con identidad y estado frescos, sin solicitudes de pago/reembolso: un único PUT con `status=canceled` respondió400 a las20:18:42UTC. El error detuvo el script. Un GET separado posterior confirmó que el recurso continúa `authorized`, con la misma fecha de modificación de las20:00:14 y mismo importe. No se acredita cancelación ni entrega automática. Se conserva evidencia del intento y se contrasta el contrato del valor de estado antes de considerar un intento corregido; nunca se repite ciegamente la mutación.


### Cancelación auténtica y corrección de lectura del proveedor

Un segundo intento controlado, con `status=cancelled` conforme al SDK oficial y una nueva reserva de ejecución, recibió200 a las20:23:05UTC. No hubo un tercer PUT. La comprobación posterior confirmó cancelación, identidad y condiciones económicas intactas. El proveedor omitió `init_point` después de cancelar; el guard posterior del helper detectó ese cambio y se detuvo, aunque la cancelación ya había ocurrido.

Vercel recibió dos notificaciones auténticas `subscription_preapproval` a las20:23:10.727 y20:23:11.970UTC, ambas502 en el deployment anterior. La firma pasó y el fallo se produjo al reconciliar: el adaptador exigía la URL de checkout también al leer un recurso cancelado. La base permanecía ACTIVE, con un recibo y dos eventos. No se ejecutó recuperación manual ni un POST sintético en esta ventana. Hasta20:38:24UTC no se observaron nuevos reintentos; esta observación no determina si habrá entregas posteriores.

La lectura ahora admite `init_point` ausente o nulo; crear o recuperar un checkout sigue exigiendo una URL válida de Mercado Pago. El smoke del adaptador contra la API real pasó con dos GET200, vendedor TEST y estado cancelado, sin acceso a DB. Lint, TypeScript, **240 tests en once archivos** y build Node24 aprobaron.

El primer despliegue de esa corrección falló al precargar perfiles por un error al consultar taxonomías públicas; el alias anterior se preservó. Diez consultas públicas de taxonomías respondieron200 desde este equipo, sin demostrar la causa del fallo remoto. En Preview o con SITE_NOINDEX=true, `generateStaticParams` devuelve ahora una lista vacía y los perfiles se resuelven al abrirlos; la precarga de producción conserva su comportamiento. Los checks integrados y el build de QA volvieron a aprobar. Pendiente publicar esta fuente y acreditar cancelación persistida por entrega auténtica, seguida de un nuevo recorrido de pago de prueba con activación automática. No hubo cambios de producción, precios ni cargos reales.


El Preview corregido quedó READY y recibió el alias QA a las20:41:37UTC: `dpl_42VMAv7sM5jC6wtHDggP6GDy5sPj`, SHA256 `a68593b8d4d5e959ef65df607007674b14cebbed42b3d7a0cbb4c3c7ae0f46c6`, mismas quince variables. Un tercer POST auténtico a las20:40:44.407UTC recibió502 todavía en el deployment anterior; no se lo atribuye a la corrección nueva.

La CLI de Supabase quedó sin acceso a su credencial porque el llavero contiene el item bloqueado. Se retomó exclusivamente el perfil de navegador dedicado de Supabase ya autorizado. Una consulta `BEGIN READ ONLY; SELECT; COMMIT` en el proyecto sandbox respondió201 y confirmó `transaction_read_only=on`, ACTIVE/un recibo/dos eventos a las20:48:35UTC. El primer intento del editor se detuvo antes de hacer click por un selector; el segundo obtuvo resultado válido, junto con el timeout de la espera pendiente del intento anterior. Se conservan ambas trazas sin presentar ese error de automatización como fallo de DB. La observación queda en `/tmp/psi-hosted-payment-after_cancel_fixed_preview_buyer-20260912.json`. El dashboard QA respondió200 y continuaba mostrando ACTIVE. Aún no se hizo recuperación ni nuevo checkout; se espera el reintento sobre el deployment corregido.


### Segundo recorrido sandbox: activación automática comprobada

La ventana de observación de la primera cancelación cerró a las20:56:04UTC sin entrega al Preview corregido. A las21:01:31–33UTC se ejecutó una recuperación administrativa única mediante `reconcilePreapproval` real: dos GET Mercado Pago200 y una `apply_subscription_webhook_event`200 aceptada. El observer READ ONLY confirmó CANCELED, un recibo, tres eventos y período pagado inactivo; la cancelación administrativa no se cuenta como entrega automática. La tabla de planes mantuvo PROFESSIONAL_MONTHLY activo/PUBLISHED, RECURRING/MONTH y ARS120.000. No se modificó el precio.

Con el comprador y perfil ficticios existentes se hizo un único POST autenticado, same-origin, a `/api/subscriptions/select`. Creó una UUID nueva y su checkout, preservando el fixture anterior. La lectura independiente de Supabase comprobó PENDING_PAYMENT, reserva y vínculo, cero recibos y cero eventos. Dos GET del proveedor verificaron vendedor y comprador TEST, aplicación emisora, referencia exacta y condiciones. No se combinó esta selección con otro click de checkout ni con una RPC directa.

El navegador aislado del comprador abrió únicamente ese recurso nuevo. Se eligió Nueva tarjeta y la Mastercard pública de prueba terminada en0604, titular APRO. El texto de Nueva tarjeta estaba cubierto por su botón accesible; se corrigió el selector sin forzar clicks. El campo seguro de CVC requirió foco y teclado; todos los campos quedaron válidos y la tokenización respondió200. Una segunda continuación desde el formulario ya validado llegó al resumen, que confirmó ARS120.000 por mes y tarjeta de prueba. Estos pasos no confirmaron la suscripción. Se realizó **una sola confirmación final** a las21:14:32.377UTC y se observó la pantalla de éxito a las21:14:37.059UTC.

**Recorrido selección → checkout → notificación auténtica → reconciliación → ACTIVE/beneficios: PASS en sandbox.** Vercel recibió POST automáticos200 a las21:14:35.988 y21:14:45.949UTC, ambos en `dpl_42VMAv7sM5jC6wtHDggP6GDy5sPj`. La consulta READ ONLY de las21:15:07UTC confirmó la UUID nueva ACTIVE, un recibo approved y dos versiones de evento `subscription_authorized_payment`, sin errores ni flags demo; período pagado vigente y fecha de pago presentes. Los eventos se procesaron a las21:14:38.549 y21:14:46.337UTC, coherentes con las entregas. El dashboard devolvió200 y mostró activa. No hubo simulación, POST firmado localmente ni recuperación administrativa sobre esta nueva suscripción. Perfil y ranking se mantienen intactos, DRAFT/NOT_VERIFIED y sin publicación por pago.

Evidencias privadas0600: `repeat-mp-browser-confirm-once-20260912.json`, `repeat-payment-webhook-correlation-after-confirmation.json` en `/tmp/psi-remote-config/`, `/tmp/psi-hosted-payment-after_repeat_payment_buyer-20260912.json` y `/tmp/psi-app-buyer-browser-repeat-active-20260912.log`. Se prepara la cancelación de esta segunda suscripción para comprobar la baja automática con el fix publicado; todavía no se ejecutó al registrar este resultado. Producción sigue sin desplegarse ni activarse. Se dejó un archivo privado, ignorado por Git, para que el usuario aporte las credenciales reales necesarias para verificar el receptor antes de presentar aprobación; no contiene credenciales al crearse ni se carga automáticamente en la aplicación.


### Cancelación automática del segundo ensayo y estado final de QA

La verificación autoritativa de las21:18:11UTC realizó tres GET y ninguna escritura: vendedor TEST, preapproval authorized y pago del único recibo approved/accredited, con identidad, aplicación en preapproval, nueva referencia e importe exactos. El pago volvió a exponer `live_mode=true`; no expone application_id, por lo que ese dato se validó en el preapproval y no se inventó en el pago.

Para verificar la corrección completa y cerrar la recurrencia TEST, se canceló únicamente el segundo recurso: dos GET de identidad/estado y un PUT `status=cancelled`,200 a las21:19:42UTC. Condiciones económicas y resumen cobrado iguales; `init_point` omitido, como en el caso que antes fallaba. No hubo RPC administrativa ni POST sintético para esta baja.

**Cancelación automática: PASS.** Vercel recibió el webhook200 a las21:19:46.664UTC en el Preview corregido. Supabase registró el evento `subscription_preapproval` del recurso nuevo, ocurrido21:19:42.003 y procesado21:19:47.251UTC. La observación READ ONLY de las21:20:10UTC confirmó CANCELED, beneficios pagados inactivos y el recibo aprobado exactamente conservado; perfil y ranking intactos. Hay cuatro eventos: dos versiones del pago, autorización del preapproval que llegó después del primer snapshot, y cancelación; ninguno tiene errores ni es demo. El dashboard respondió200, dejó de mostrar activa y mostró «Tu suscripción fue cancelada.».

El resultado final del fixture nuevo es deliberadamente **CANCELED**, después de haber comprobado y capturado ACTIVE. Evidencias privadas: `/tmp/psi-remote-config/repeat-test-approved-payment-verified-20260912.json`, `cancel-repeat-test-preapproval-once-evidence-20260912.json` y `repeat-payment-webhook-correlation-followup.json` en el mismo directorio; `/tmp/psi-hosted-payment-after_repeat_cancel_buyer-20260912.json` y `/tmp/psi-app-buyer-browser-repeat-cancelled-20260912.log`. La fase de logs llamada followup corresponde a cancelación, no a otro pago. Captura de la activación previa: `output/playwright/psi-hosted-buyer-auth-20260912/repeat-active-subscription.png`.

Las pruebas de rechazo, duplicados y concurrencia siguen teniendo la evidencia local/SQL detallada en este documento; este segundo recorrido remoto acredita aprobación, activación y baja auténticas. No se presenta una renovación mensual futura ni un rechazo bancario sandbox como ejecutados. La cuenta productiva y su secreto de webhook real siguen pendientes de verificación y aprobación, con el template privado aún vacío al cierre de esta comprobación. No se activó producción.



## Preparación productiva del 12/09, posterior al cierre sandbox

La verificación de identidad mediante GET confirmó cuenta real MLA, collector63533235 y correo coincidente con el indicado por el dueño. La aplicación Universo Psi2533766701506518 está activa, sin bloqueos; su token coincide en memoria con el que identifica esa cuenta. La API no expone owner_id ni public_key: no se afirma una comprobación independiente de esos campos. Secreto de webhook presente en archivo local0600 ignorado, diferente de sandbox; todavía no desplegado ni probado en producción. Cero cargos reales.

QA realizó un único build DockerNode24 a las22:31UTC con VERCEL_ENV=production, SITE_NOINDEX=false y modo demo deshabilitado, sobre copia idéntica del código. Veintiséis consultas públicas reales al catálogo gwiz respondieron200; sitemap23URLs, robots sin bloqueo general y sin cabecera noindex. Se usaron únicamente URL y publishable key reales; secretos administrativos/salt fueron placeholders y no se incluyó tokenMP. El build valida el camino público productivo, no autentica configuración secreta del servidor. .next original intacto. Evidencia privada `/tmp/psi-production-public-build-20260912/result.json` y `artifact-check.json`.


### Preflight productivo y configuración externa confirmados

La observación del SQL Editor exclusivo de gwiz a las22:34:33UTC contiene una fila con transaction_read_only=on. Validación offline:9/9 checks del preflight PASS, hash de la correctiva y cuatro artefactos del manifest coincidentes. Ocho versiones históricas, seis firmas legacy y ninguna nueva; cero suscripciones/eventos/clientes/mapeos; mensual120000ARS intacto. No se capturó el código HTTP por timeout del listener; el resultado proviene de la UI, no de una respuestaAPI inventada. Evidencia0600 `/tmp/psi-remote-config/production-migration-20260911224302.pre.ui-20260912T223433Z.json`. No se ejecutó DDL y debe repetirse el control antes de la futura migración.

El dueño confirmó que la app real2533766701506518 tiene guardados en Webhooks → Modo productivo el endpoint `https://universo-psi-eight.vercel.app/api/webhooks/mercado-pago/personal` y los eventos Planes y suscripciones + Pagos legacy. Es confirmación del usuario; firma/procesamiento del endpoint productivo todavía deben verificarse durante release autorizado. Configuración preparada para aprobación: conservar Verceluniverso-psi/basegwiz y mensualARS120000, desplegar código compatible con checkoutfalse, aplicar sólo correctiva20260911224302, comprobar contratos y smoke sin cargo, abrir checkout únicamente si fue autorizado y los controles pasan. No se autoriza una compra real con esta preparación.


### Ejecución autorizada y corrección del build productivo

El dueño autorizó desplegar, aplicar la correctiva de pagos y abrir el mensual existente para recibir pagos reales. La autorización no incluye compras de prueba reales ni cambios de precio. Se cargó la configuración MP únicamente en Production, preservando checkout cerrado. El primer deployment dpl_DupeE1W4C7G2Ev2tJXX6DFPkpQ7k falló al precargar convenios: Supabase respondió Gateway Timeout. No movió el alias ni se aplicó DDL.

Se incorporó fetchPublicCatalog exclusivamente al cliente anónimo público, con dos reintentos para GET502/504 (250/500ms), cancelación respetada, sin cachear el error y sin reintentar escrituras. Trece pruebas nuevas; lint/typecheck y253tests PASS. Build Production Node24 PASS con26 consultas públicas reales200. Precarga productiva conservada; los errores persistentes siguen deteniendo el build. Evidencia `/tmp/psi-production-public-retry-build-20260912/result.json`. La fuente de release posterior tiene SHA52851cacc0a313e547583275cfe0dd3a1085323309bf4ca2ccd4ed8adaf9b7a0.

La clave administrativa existente default de gwiz se recuperó por API oficial mediante la sesión exclusiva de Supabase, sin crear o rotar claves. La publishable coincide con Vercel; GET de suscripciones con secret200 vacío y con publishable401. Se guardó sólo privada600 y release la actualizó sólo en Production para los despliegues posteriores. ManagementAPI también confirmó identidad/organización/región/ACTIVE_HEALTHY y preflightreadonly2019/9PASS a22:56:29UTC. Todavía no hubo migración ni cargo real al registrar este tramo.


### Corrección de espera por copia de respuesta durante el build

El primer helper de reintentos introducía una espera al hacer await response.body.cancel() sobre una respuesta clonada por Next. Se reprodujo localmente: la cancelación espera a que se consuma la otra rama. El deployment dpl_Bk7hK2FzexNmRgfLrDUiFf4nD5bi quedó en Collecting page data y se canceló a23:01:58UTC, todavía sin alias asignado. La hipótesis remota no reemplaza la reproducción: se registran ambas por separado.

Se corrigió descartando el stream sin esperar la promesa y manejando explícitamente su rechazo. La regresión504clonado/no consumido→200 ahora pasa. Resultado integrado final: lint/typecheck/254tests en12archivos PASS, build Production Node24 a23:02:17UTC con26consultas reales200. No se agregó timeout ni se alteraron precios, lógica de pagos o precarga productiva. Evidencia `/tmp/psi-production-public-clonefix-build-20260912/result.json`. La migración todavía no se ejecutó; release publicará esta fuente antes de continuar.


### Migración real y smoke productivo sin cargos completados

Después de la autorización explícita del dueño y del deployment compatible dpl_BETKKLQDNArnsoi5C8j5w9GYCmXs READY con checkoutfalse en el dominio canónico, se repitió preflightporManagementAPI2019/9PASS. La transacción dirigida se envió una sola vez: comenzó23:06:53.047UTC y respondió201 a23:06:55.595UTC, SHAe68da6b94cb340a3a098960763e01791fc3d443e4f714aa6b9c0f106d00e669f. Guardas,55sentencias originales e historial quedaron en la misma transacción; no se aplicó catálogo, no se alteraron precios ni se generaron pagos.

Postflight10/10PASS: historial9versiones,0firmaslegacy/8nuevas, contratos/permisos/RLS y mensual120000ARSintactos. Advisors de pagos8/8PASS y GETOpenAPI200 confirmó las cuatro RPC con argumentos exactos; no hizo falta recargar caché manualmente. Las capturas registran cero agregados financieros antes de abrir el checkout, no una promesa sobre futuros compradores. Evidencia en `/tmp/psi-remote-config/production-migration-20260911224302.post.captured-20260912T230708Z.json`, advisors.captured20260912T230731Z y `production-postgrest-schema-verified.json`.

Smoke en BET a23:08:16–19UTC: home,planes,ingresar,robots,sitemapHTTP200; precio y CTA correctos, indexación normal y23URLs. Un único webhook sintético firmado de tipo ignorado devolvió200/ignoredtrue: verifica firma/configuración real sin consultar Mercado Pago ni escribir pagos. No sustituye una entrega auténtica productiva ni un cargo real. Evidencia `/tmp/psi-remote-config/production-nocharge-smoke-20260912/result.json`.

Release separó el flag compartido para conservar Previewfalse y habilitar sóloProductiontrue. La apertura requiere que el nuevo deployment quedeREADY y que la UI confirme availability; todavía estaba publicándose al registrar esta sección. BET conserva la versión compatible cerrada para recuperación, sin volver al binario legacy.


## Smoke público final de producción — 12/09/2026, 23:13–23:17 UTC

**PASS, sin cargos.** Deployment `dpl_Gp5xuyMB42J7cXZitzN5ozPpvaVq`, origen `https://universo-psi-eight.vercel.app`, fuente SHA-256 `0b77dd621bd6c3bb829fde7293f84c2d659b8c887d793219f13951b3b7ba18dd`. Release confirmó READY y checkout habilitado sólo en Production antes de abrir el navegador. Se utilizó una sesión nueva y anónima, sin cookies personales; una guarda permitió únicamente GET al origen exacto y bloqueó todos los POST y destinos externos. No se reutilizaron cuentas ni sesiones sandbox o personales.

| Escenario | Esperado | Observado |
| --- | --- | --- |
| Planes, escritorio1440×1000 y móvil390×844 | Mensual publicado, precio aprobado y disponibilidad activa | GET200 en ambos; una tarjeta «Profesional · Mensual», $120.000; texto «La suscripción se activa cuando confirmamos el pago con Mercado Pago» presente y «El cobro en línea todavía no está habilitado» ausente. Este texto deriva de `paymentAvailability` en el servidor. |
| CTA y layout | Código canónico, foco visible, target44px y sin overflow | `/profesionales/sumarse?plan=PROFESSIONAL_MONTHLY`; foco visible en ambos; botón377×44 y285×44px respectivamente; overflow horizontal0. Capturas visuales revisadas. |
| Seguir CTA sin sesión | Autenticación same-origin, conservando plan; ningún recurso de pago | Ambos recorridos llegaron a `/ingresar?next=%2Fprofesionales%2Fsumarse%3Fplan%3DPROFESSIONAL_MONTHLY`; campos vacíos, cero formularios enviados, sin registro, checkout ni pago. |

La primera espera `networkidle` venció con la página ya renderizada. Se comprobó el DOM existente y se usó `domcontentloaded` para las navegaciones posteriores; no se atribuye ese timeout a un fallo de pagos. Los mensajes de consola observados fueron únicamente bloqueos intencionales de telemetría `view`/`vitals` por la guarda GET-only. Las capturas de página completa tomadas con foco muestran el header fijo en la posición de scroll; se agregaron capturas superiores sin scroll para revisar el layout.

Evidencia estructurada y trazas600: `/tmp/psi-production-public-browser-20260912/result.json`, `verify-and-follow.log` y `capture-clean-layout.log`. Capturas sin credenciales ni PII: `output/playwright/psi-production-public-20260912/{desktop,mobile}-plans.png`, `{desktop,mobile}-plans-top.png` y `{desktop,mobile}-authentication.png`. La firma productiva con tipo sintético ignorado fue comprobada previamente por el coordinador a las23:08:19UTC; no se repitió en este smoke.

Este resultado acredita disponibilidad productiva y navegación pública con el esquema y configuración del release. **Una compra real, un débito productivo y una renovación mensual futura no se ejecutaron**; el pago y la cancelación automáticos se acreditaron exclusivamente con las cuentas y tarjetas TEST del segundo recorrido sandbox documentado arriba.


## Onboarding opcional — QA local posterior al release, 13/09/2026 UTC

**PASS: 2/2 recorridos autenticados reales locales, 31,6s.** Archivo nuevo `tests/e2e/authenticated/optional-onboarding-payment.spec.ts`. Se probó Node24Docker/Nextdev webpack en copia aislada `/tmp/psi-optional-onboarding-e2e-20260913/workspace`, puerto3191, con Supabase local55321 y migración20260913002858 confirmada por datos. `UNIVERSO_PSI_TEST_MODE=false`, checkoutfalse y sin tokens Mercado Pago; ninguna conexión productiva. No se usó ni reconstruyó `.next` del proyecto compartido.

Dos usuarios efímeros independientes completaron login y aceptación de términos por UI; pasos1/2 con datos mínimos; paso3 totalmente vacío o con «prueba» en presentación y enlaces; Guardar y continuar; omisión de documentos; Continuar al pago. La base guardó headline/bio vacíos o breves exactamente, enlaces inválidos null y perfil DRAFT/NOT_VERIFIED. Cada caso registró una única selección PENDING_PAYMENT con snapshot PROFESSIONAL_MONTHLY/120000ARS, sin recurso proveedor, pago ni período. El bucket de documentos quedó vacío. En ningún caso se pulsó Enviar a revisión ni cambió la publicación. Como Mercado Pago no estaba configurado, la UI mostró el mensaje honesto para reintentar desde Suscripción, sin afirmar éxito. No acredita un checkout nuevo contra el proveedor; prueba la separación entre pago y revisión y la persistencia de la presentación opcional. Los usuarios y sus filas exclusivas fueron eliminados al finalizar.

El primer intento se detuvo antes de usar la aplicación porque el contenedorUID1000 no podía escribir en la copia propiedadUID1001; se corrigió sólo ese parámetro, se confirmó ingresoHTTP200 y se reejecutó. Resultado y trazas iniciales conservados aparte; no se considera un fallo funcional de onboarding. Evidencias600: `/tmp/psi-optional-onboarding-e2e-20260913/evidence.json`, `test-run-owner-fixed.log`, `server-owner-fixed.log` y `results-initial-infrastructure-failure/`. Huellas de los tres archivos de aplicación y del test registradas en evidence.json. El coordinador conserva la validación integrada y la decisión de release.


## Regresión: guardar sin especialidades ni profesión — 13/09/2026 UTC

**PASS: 4/4 E2E autenticados locales en51,6s.** Se amplió `optional-onboarding-payment.spec.ts` con dos omisiones antes no cubiertas: presentación vacía sin seleccionar necesidades/servicios/modalidades/idiomas, y textos «prueba» sin profesión ni ninguna de esas listas. Las pruebas anteriores sí completaban la clasificación; su PASS no acreditaba este caso. La inspección del contrato previo identificó `min(1)` en las cuatro listas y UUID obligatorio en profesión: sus errores estaban asociados a pasos ocultos cuando se guardaba desde paso3. No se presenta esa inspección como reproducción remota del error del usuario.

La copia local se actualizó con el esquema opcional, las escrituras condicionales de relaciones y la UI que vuelve al paso inválido/compara la transición del estado completo. Pasaron nuevamente los dos casos anteriores y ambos casos nuevos (10,6s y9,0s). Las categorías omitidas quedaron con cero filas en sus cuatro tablas; la profesión omitida también quedó sin asociación. Guardar y continuar → omitir documentos → Continuar al pago conservó DRAFT/NOT_VERIFIED y exactamente una PENDING_PAYMENT con snapshot120000ARS; sin documentos, publicación, proveedor ni pago. El error de MP no configurado fue el esperado y no afirmó éxito. La recuperación visual de otros errores de identidad no se ejecutó como escenario separado en este lote.

Mismo entorno local aislado55321/3191, sin claves MP ni cambios de producción; usuarios efímeros limpiados al terminar. Evidencia600: `/tmp/psi-optional-onboarding-e2e-20260913/evidence-taxonomy-fix.json`, `test-taxonomy-fix.log` y `server-taxonomy-fix.log`. La fuente anterior y sus resultados se conservaron en `source-before-taxonomy-fix/` y `results-presentation-only-pass/`; no se sobrescribió la evidencia del caso anterior. UI y validación coinciden byte a byte con la fuente entregada; en actions.ts sólo se retiraron espacios de una línea vacía después de la copia, sin cambio funcional. Las dos huellas quedan registradas.


## Registro manual y conservación de datos — 13/09/2026 UTC

**PASS local:** alta manual válida (7,3s), luego tres casos de error/reintento con la corrección final (3/3,18,2s). Nuevo archivo `tests/e2e/authenticated/manual-signup-regression.spec.ts`. Node24Docker/Nextdev aislado3192, Auth real55321, Mailpit55324; no admin-create para registrar usuarios, no fixtures que salteen el formulario y ningún correo real. Las dos altas se hicieron sólo por UI: una directa y otra corrigiendo exclusivamente las contraseñas después de validación fallida. Ambas crearon cuenta pendiente de confirmación, registraron términos y generaron mensaje de confirmación capturado en el buzón local; los enlaces no se abrieron. Las cuentas efímeras fueron eliminadas al terminar.

La regresión verificó nombre/email/ambas contraseñas/tipo de cuenta/términos/next conservados ante error; contraseña inválida recibe foco y puede corregirse sin volver a completar lo demás. Se inyectaron por separado `weak_password`422 y un fallo de fetch que Auth devuelve como status0; el mensaje de transporte fue amigable y no expuso detalles técnicos. Estos dos casos verifican respuesta y retención ante errores controlados, no acreditan una caída real del proveedor. Los rechazos no crearon cuentas. Passwords permanecieron exclusivamente en la memoria del navegador y se limpiaron después del éxito.

El primer lote encontró dos problemas del harness (nombre accesible de contraseña ampliado por error inline y respuesta inyectada sin versión/error_code para el SDK) y un defecto real: el reset nativo desmarcaba el radio pese al state controlado. El coordinador añadió `onReset` con preventDefault; la revalidación pasó conservando radio y checkbox. Se preservaron trazas previas y sólo se repitieron los casos pendientes.

Evidencia600: `/tmp/psi-signup-e2e-20260913/evidence.json`, `tests.log`, `tests-reset-fixed.log`, `server-reset-fixed.log` y `results-before-reset-fix/`; auditoría de inyección sin secretos en `control/fault-events.jsonl`. Esta prueba local no acredita envío productivo: el diagnóstico remoto de la configuración de correo y su corrección son responsabilidad del release y permanecen separados de este resultado.

### Tarjeta integrada TEST — comprobación del 13/09/2026, 02:08 UTC

Ambiente: Preview `universo-psi-mp-test.vercel.app`, Supabase aislado `gzsbndvaxdyuyhjidfqq`; fixture nuevo ficticio con presentación completa, DRAFT/NOT_VERIFIED y mensual ARS120.000 PENDING_PAYMENT. El correo de acceso de la aplicación es distinto del comprador TEST verificado. Se preservaron las identidades y suscripciones previas. La migración de reservas `20260913012905` quedó verificada por el agente de datos; no se usaron cuentas ni medios de pago productivos.

La primera versión `dpl_4M1WKKLWeg4WjfQLbva5rG7X8ab2` falló al entrar por navegación cliente: conservaba la CSP del documento de ingreso y bloqueaba el preflight del SDK; tres iframes quedaban vacíos. Una recarga completa permitió aislar la causa. La versión corregida `dpl_AUrraRHauPCVSxmyqa83rkevbu6T` pasó el recorrido desde un navegador QA nuevo: ingreso real, carga automática del documento de checkout, tres campos seguros operativos de 44 px, importe correcto y habilitación del botón. No se eludió CSP. La clave pública efectiva del SDK coincidió con la configuración TEST y el vendedor fue verificado como cuenta de prueba.

Único envío a las 02:07:00 UTC: tokenización real del SDK **HTTP201**, seguida de `/api/subscriptions/card` **HTTP401** a las 02:07:07 UTC. El formulario mostró error y no indicó activación. Se detuvo la prueba sin repetir tokenización ni autorización. Un GET de `/dashboard` en la misma sesión a las 02:08:14 UTC devolvió 200, perfil propio y estado pendiente; por lo tanto todavía debe diagnosticarse el rechazo puntual del endpoint. La creación de preapproval, el cobro y la activación automática de **este recorrido integrado permanecen NO ACREDITADOS**; la evidencia previa del checkout hospedado no sustituye esta prueba.

Evidencias privadas con permisos 0600: `embedded-card-app-identity-20260913.json`, `embedded-card-before-checkout-20260913.json`, `embedded-card-sdk-initial-evidence-20260913.json` y `embedded-card-submit-once-result-20260913.json`, bajo `/tmp/psi-remote-config/`; logs de navegador bajo `/tmp/psi-embedded-browser-20260913/`. No se incluyen valores de tarjetas, tokens ni credenciales en este informe.

Diagnóstico adicional del 401, sin segundo envío: el POST histórico conservaba una cookie Auth y Origin correcto. Su JWT se inspeccionó sólo en memoria: issuer del sandbox correcto, sujeto presente y 3.452 segundos restantes al enviar; no estaba vencido. Una consulta Management API READ ONLY, HTTP201, confirmó exactamente el fixture propio PENDING_PAYMENT, sin enlace ni cuenta de proveedor, sin reserva, **cero intentos de tarjeta**, cero recibos/eventos y sin período pago. El fallo ocurrió sin persistir una autorización de proveedor. Evidencias adicionales: `embedded-card-after401-auth-metadata-20260913.json` y `embedded-card-after401-db-readonly-20260913.json` en el directorio privado anterior. La corrección del refresh del proxy no se atribuye como causa demostrada de este 401.

### Tarjeta integrada TEST — autorización y pago acreditados, activación pendiente (13/09/2026, 02:22 UTC)

Sobre `dpl_GcHKUgNZefyaBgjnxUftLce2WD6h`, un único diagnóstico autenticado con UUID no perteneciente al perfil y token ficticio devolvió el 409 esperado a las 02:16:33 UTC. No tokenizó tarjeta ni llegó a reservar un intento de pago. Esto permitió verificar la autenticación actual; no demuestra por sí mismo que el ajuste del proxy explique el 401 anterior.

Con autorización del coordinador y la base aún sin reservas ni recursos, se recargó el formulario y se realizó un nuevo intento TEST, sin reutilizar el token anterior: SDK HTTP201 a las 02:18:42 UTC y endpoint de tarjeta HTTP200 a las 02:18:45 UTC. La interfaz recibió `PENDING_PAYMENT` y comunicó correctamente que faltaba confirmar el pago. Se registró un solo token y un solo POST de tarjeta en ese intento.

La lectura de base a las 02:19:23 UTC confirmó enlace al preapproval, una reserva y un intento de tarjeta sin liberar; permanecía PENDING_PAYMENT, con cero recibos y un evento `subscription_preapproval` sin error registrado. El coordinador observó notificaciones auténticas al deployment, incluyendo errores 502 en los eventos de pago. No se usó simulador ni reconciliación manual.

La consulta autoritativa del proveedor a las 02:22:06 UTC confirmó vendedor TEST MLA, preapproval `authorized`, factura `processed` de tipo `recurring` y pago `approved/accredited`. Cuenta, comprador TEST, aplicación, referencia interna, ARS120.000 y periodicidad mensual coincidieron; el correo del pagador seguía siendo distinto del acceso a la aplicación. El proveedor informó `live_mode=true` dentro de estas cuentas TEST controladas; no se reinterpretó ese campo como `false`. **Pago TEST acreditado: PASS. Activación automática del recorrido integrado: todavía pendiente de resolver los 502.** No se canceló la recurrencia durante este diagnóstico ni se inició otro pago.

Evidencias privadas adicionales: `embedded-card-auth-probe-result-20260913.json`, `embedded-card-submit-retry-once-result-20260913.json`, `embedded-card-after-authorized-db-readonly-20260913.json` y `embedded-provider-chain-20260913/summary.json`, bajo `/tmp/psi-remote-config/`. Las respuestas originales del proveedor permanecen en archivos 0600 para revisión del validador, sin copiar datos privados a este reporte.

### Cierre de tarjeta integrada TEST — PASS de pago, activación y cancelación auténticos (13/09/2026, 02:32 UTC)

El recorrido integrado finalmente pasó sobre `dpl_GcHKUgNZefyaBgjnxUftLce2WD6h`. El coordinador confirmó un reintento auténtico del webhook con HTTP200 a las **02:19:47.333 UTC**; el evento `subscription_authorized_payment` quedó procesado a las **02:19:47.831709 UTC**, con `is_demo=false` y sin error. La lectura QA READ ONLY a las 02:29:18 UTC confirmó **ACTIVE, período pago vigente, un recibo y dos eventos**. El ID del recibo coincidió exactamente con el pago autoritativo aprobado. La prueba diagnóstica SQL del agente de datos usó subtransacción con excepción forzada y ROLLBACK exterior; no se atribuye la activación a una reconciliación manual persistida.

El dashboard propio devolvió HTTP200 y copy de suscripción activa, sin el mensaje pendiente. Escritorio de 1.440 px y móvil de 390 px pasaron sin desbordamiento horizontal. Capturas del fixture ficticio: `output/playwright/psi-embedded-card-20260913/desktop-active.png` y `mobile-active.png`. El ingreso al checkout había confirmado carga automática del documento, campos seguros de 44 px y tokenización real del SDK; el correo del pagador TEST fue distinto del correo de acceso a la aplicación.

Para evitar renovaciones de la prueba, se canceló **sólo el nuevo preapproval TEST** con un PUT `status=cancelled`, HTTP200 a las **02:31:24.061 UTC**, después de verificar nuevamente vendedor TEST, comprador, aplicación, UUID propio e importe ARS120.000. El GET posterior confirmó `cancelled`, condiciones económicas y cantidad de cobros conservadas. No hubo reembolso, eliminación de fixtures, liberación forzada de reservas ni modificación de las otras suscripciones.

El webhook auténtico de cancelación devolvió HTTP200 en `dpl_7QSFWnVPeKnhu855Fq9T7qRNaf2P` a las **02:31:25.866 UTC**, según observación del coordinador. La lectura QA READ ONLY a las 02:31:51 UTC confirmó **CANCELED, sin período activo, un recibo, tres eventos y el intento de tarjeta conservado**. El evento de cancelación quedó procesado a las 02:31:26.858490 UTC, sin error y con `is_demo=false`. No se utilizó simulador ni reconciliación manual para acreditar este pago o su cancelación.

Conclusión del alcance QA: **tokenización TEST, autorización, pago aprobado/acreditado, webhook auténtico, activación visible y cancelación automática: PASS**. Se preservan como hallazgos históricos los 401/502 iniciales y sus diagnósticos; la causa exacta del primer 401 no quedó demostrada por su desaparición. Este resultado corresponde a cuentas y medios TEST controlados: no se ejecutó un cargo productivo ni una renovación mensual futura.

Evidencias finales 0600 bajo `/tmp/psi-remote-config/`: `embedded-card-after-active-db-readonly-20260913.json`, `embedded-card-verify-dashboard-active-20260913.json`, `cancel-embedded-test-once-evidence-20260913.json` y `embedded-card-after-cancel-db-readonly-20260913.json`. Las identidades, tokens y datos de tarjeta no forman parte de este reporte público.
