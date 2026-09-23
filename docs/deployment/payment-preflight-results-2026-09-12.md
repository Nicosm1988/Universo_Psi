# Preflight remoto de pagos — 12/09/2026 UTC

**Estado actualizado al 12/09/2026, 23:07 UTC: la correctiva `20260911224302` quedó aplicada y verificada en producción, después de la aprobación explícita del usuario y del despliegue compatible con checkout cerrado.** El historial tiene nueve versiones; las tres migraciones de catálogo siguen pendientes y los precios permanecen intactos. Las secciones anteriores a la aplicación conservan su carácter de evidencia histórica. La apertura posterior del checkout se registra por separado en la evidencia de release; esta migración no realiza cargos.

## Alcance y evidencia

- Proyecto: `gwizdgboqwpzyiaqcxbb`, organización `qwxmgztzoidyzkelupdr`, región `ca-central-1`. El agente de release confirmó previamente `GET` autenticado con HTTP 200 y estado `ACTIVE_HEALTHY`; el nombre de base `postgres` no se usó para identificar el proyecto.
- Inicio de captura: `2026-09-12T01:31:56Z` — 11/09/2026, 22:31:56 de Argentina.
- Se ejecutaron las 14 consultas de [payment-preflight.sql](payment-preflight.sql), dos consultas complementarias de rol/conteos y una consulta de políticas: **17 respuestas HTTP 201**.
- Destino explícito: `POST https://api.supabase.com/v1/projects/gwizdgboqwpzyiaqcxbb/database/query`, con `read_only: true`. La credencial del llavero se utilizó sólo en memoria; no se consultaron API keys ni se usó `--linked` o el cache `.temp` del repositorio. Este parámetro figura en la [referencia oficial de Management API](https://supabase.com/docs/reference/api/v1-run-a-query).
- PostgreSQL `17.6`; rol efectivo `supabase_read_only_user`; `transaction_read_only = on`; `rolbypassrls = true`; `rolsuper = false`. `row_security_active` devolvió `false` para suscripciones, eventos y clientes de pagos. Los conteos siguientes son globales para esas tablas, no ceros causados por filtros RLS.
- No se ejecutaron RPC de aplicación, fixtures, escrituras de datos, DDL, resets, seeds, restauraciones ni pruebas con cargos. No se repitieron las suites locales previamente aprobadas.

Archivos de evidencia de esta sesión, con permisos locales `0600`, sin tokens ni PII:

- `/tmp/psi-remote-config/payment-preflight-results-2026-09-12.json`
- `/tmp/psi-remote-config/payment-preflight-extra-2026-09-12.json`
- `/tmp/psi-remote-config/payment-preflight-policies-2026-09-12.json`

Son archivos temporales; este documento conserva los resultados necesarios para revisar el release.

## Historial de migraciones

| Versión | Estado remoto |
| --- | --- |
| `20260815161322` | Registrada |
| `20260815174429` | Registrada |
| `20260815210300` | Registrada |
| `20260815233718` | Registrada |
| `20260819120000` | Registrada |
| `20260830000000` | Registrada |
| `20260830020000` | Registrada; soporte Mercado Pago base |
| `20260830030000` | Registrada |
| `20260830040000` | Pendiente; ampliación de taxonomía |
| `20260830050000` | Pendiente; constraint e incorporación de lengua de señas |
| `20260830060000` | Pendiente; constraint e incorporación de modalidad a domicilio |
| `20260911224302` | Pendiente; correctiva de pagos |

No se devolvieron versiones remotas adicionales. El historial y los objetos consultados concuerdan con el estado previo a la correctiva; no se descargaron los cuerpos de funciones ni los `statements` del historial, por lo que esta revisión no certifica equivalencia textual completa de las migraciones antiguas.

## Contratos, permisos y tablas

| Objeto | Resultado remoto |
| --- | --- |
| `attach_subscription_checkout(uuid,text,text,text)` | Existe en `public` y `private` |
| `apply_subscription_webhook_event` legacy de 9 argumentos | Existe en ambos esquemas |
| `apply_subscription_payment_event` legacy de 6 argumentos | Existe en ambos esquemas |
| `begin_subscription_checkout` y firmas nuevas de attach/webhook/payment | No existen en ninguno de los dos esquemas |
| `select_professional_plan(uuid,text)` | Existe; `authenticated` y `service_role` pueden ejecutar; `anon` no |
| `lookup_plan_provider_id`, `upsert_plan_provider_mapping`, `expire_past_due_subscriptions` | Existen; ejecución sólo `service_role` entre los roles de aplicación inspeccionados |
| `private.subscription_payment_state` / `subscription_payment_receipts` | No existen todavía |

Las RPC de backend existentes inspeccionadas niegan `EXECUTE` a `anon` y `authenticated` y lo permiten a `service_role`. Sus implementaciones `private` son `SECURITY DEFINER`, los wrappers `public` son `SECURITY INVOKER` y todos fijan `search_path` vacío.

| Tabla | RLS / FORCE RLS | Lectura `anon` | Lectura `authenticated` |
| --- | --- | --- | --- |
| `public.plans` | Sí / sí | Sí | Sí |
| `public.subscriptions` | Sí / sí | No | Sí, limitada por policy |
| `private.payment_customers` | Sí / sí | No | No |
| `private.subscription_events` | Sí / sí | No | No |
| `private.plan_provider_mappings` | **No / no** | No | No |

Políticas observadas:

- `subscriptions_owner_or_admin_read`: `SELECT` para `authenticated`, condicionado a propiedad del perfil o rol `ADMIN`/`SUPERADMIN`.
- `plans_public_read_active`: `SELECT` para `anon`/`authenticated`, condicionado a plan activo o rol administrativo.
- `plans_admin_insert`, `plans_admin_update` y `plans_admin_delete`: verifican `ADMIN`/`SUPERADMIN`; `UPDATE` tiene `USING` y `WITH CHECK`. Esta consulta identifica las policies, no ejecuta mutaciones.
- No hay policies en las tres tablas privadas inspeccionadas. Clientes/eventos tienen RLS forzada y grants de lectura revocados a los roles públicos. `plan_provider_mappings` requiere la defensa adicional de RLS que incorpora la correctiva.

## Datos comerciales y financieros

El único plan consultado fue `PROFESSIONAL_MONTHLY`:

| Propiedad | Valor remoto |
| --- | --- |
| Activo / precio publicado | Sí / `PUBLISHED` |
| Importe / moneda | `120000.00` / `ARS` |
| Intervalo / modelo | `MONTH` / `RECURRING` |
| Compromiso mínimo | `NULL`, sin ciclos comprometidos |
| Gracia | 3 días |
| Coincidencia con el mensual aprobado | Sí |

| Agregado global | Cantidad |
| --- | --- |
| Suscripciones | 0 |
| Eventos de suscripción | 0 |
| Clientes de pago | 0 |
| Mapeos de planes con el proveedor | 0 |
| Grupos de recursos duplicados | 0 |
| Eventos procesados sin suscripción / cuenta no resoluble | 0 / 0 |

El mapeo vacío no demuestra una configuración inválida: el adaptador contempla creación recurrente sin `preapproval_plan_id`. Estos conteos tampoco prueban ausencia de recursos creados directamente en Mercado Pago; esa cuenta requiere su verificación independiente. No hay historial financiero local que reconciliar según esta captura.

## Aplicabilidad de la correctiva y diferencias pendientes

Se verificaron los objetos que la correctiva elimina o sustituye:

- `subscriptions_provider_subscription_idx` existe con unicidad legacy sobre `(provider, provider_subscription_id)` y filtro de recurso no nulo.
- `subscriptions_one_current_idx` existe sobre el perfil para estados corrientes.
- `payment_customers_pkey` sigue usando `professional_profile_id`; existe `payment_customers_provider_external_customer_id_key` sobre proveedor/cliente externo.
- Existe `subscription_events_provider_external_event_id_key`, con `UNIQUE NULLS NOT DISTINCT (provider, external_event_id)`.
- Las columnas nuevas de eventos/clientes y el índice nuevo de identidad de eventos todavía no existen.
- La consulta de dependencias catalogadas de las seis RPC legacy a eliminar devolvió **cero filas**; tampoco aparecieron claves foráneas externas contra `payment_customers`.

La revisión estática de las tres migraciones de catálogo pendientes mostró:

| Versión pendiente | Objetos que modifica | Dependencia de la correctiva de pagos |
| --- | --- | --- |
| `20260830040000` | `specialties`, `languages`, `services`, `needs` | Ninguna referencia a estos objetos |
| `20260830050000` | `languages`, `languages_code_check` | Ninguna referencia |
| `20260830060000` | `modalities`, `modalities_code_check` | Ninguna referencia |

La correctiva utiliza `plans`, `subscriptions`, las tablas privadas de pagos y los helpers existentes de propiedad/aceptación legal. Esas dependencias proceden del esquema inicial y del soporte Mercado Pago `20260830020000`, ya registrados. **No requiere aplicar las tres migraciones de catálogo para ejecutar su SQL.** Esta conclusión es estática, respaldada por el inventario remoto; no se ensayó DDL contra producción.

El encabezado conservador del preflight indica detenerse si faltan predecesoras: esta revisión explica la diferencia concreta y permite preparar una aplicación dirigida, sin inferir autorización para aplicar el catálogo. No se debe simular que sus tres versiones se aplicaron, editar migraciones registradas ni borrar los huecos con `migration repair`.

## Secuencia propuesta para el release autorizado

1. Preparar el despliegue de la aplicación nueva con `MERCADOPAGO_CHECKOUT_ENABLED=false`, dirigida a este proyecto y a la cuenta del proveedor verificada. La bandera debe estar presente en la versión efectivamente desplegada; una versión vieja que no la lee no cierra checkouts.
2. Preparar un mecanismo dirigido que aplique **únicamente** `20260911224302_harden_payment_persistence.sql` y registre esa versión de manera coherente en el historial. Revisar el SQL exacto antes de ejecutarlo. No usar un `db push` general: incluiría los tres cambios del usuario ajenos a pagos.
3. Coordinar la ventana entre aplicación y migración. Antes de la migración, la aplicación nueva puede devolver errores reintentables al invocar contratos aún ausentes; no debe confirmar procesamiento exitoso. Después de la migración, comprobar firmas nuevas, ausencia de legacy, permisos, RLS, estado de despliegue y conexión; reconciliar recursos del proveedor si existieran.
4. Mantener checkout deshabilitado hasta completar sandbox y obtener aprobación explícita de la configuración de cobros. El precio mensual observado no autoriza modificar otros planes ni efectuar cargos reales.
5. Para recuperación, mantener la base forward-only y el checkout cerrado con una aplicación compatible. Un rollback a la aplicación legacy es incompatible con las firmas nuevas. Conservar eventos y datos financieros; un rollback del sitio no cancela débitos del proveedor.

Aplicar antes la correctiva dejará tres versiones de catálogo anteriores pendientes. Su futuro release deberá tratarlas explícitamente, sin falsificar historial ni dejar que una herramienta las incluya de forma implícita. En esta fase no se ejecutó ninguna de las acciones propuestas.

## Identidad de los artefactos revisados

- Preflight SHA-256: `776c36351e6bbb39d3dea05da22716ce25726f1c32564945a732a81690b824e3`.
- Correctiva SHA-256: `10b29b93ea002e68ab8657797b6a650b0346e53f1187792189c4051fcf105e19`.

Las pruebas locales previas siguen siendo evidencia local. Este preflight demuestra acceso remoto y estado de la base; no demuestra checkout sandbox, recepción de una notificación auténtica ni habilitación de producción.

## Tramo posterior: runner dirigido y sandbox aislado

Esta sección registra trabajo posterior autorizado únicamente sobre un sandbox nuevo. **El proyecto productivo `gwizdgboqwpzyiaqcxbb` y Red Senda no recibieron escrituras.** Los resultados del preflight productivo de las secciones anteriores conservan su alcance de sólo lectura.

### Artefactos del runner

- [payment-migration.mjs](../../scripts/payment-migration.mjs): Node 24, dry-run por defecto; aplica sólo la correctiva de pagos revisada. Bloquea producción y la base local original `postgres`. Para el transporte remoto acepta únicamente el sandbox `gzsbndvaxdyuyhjidfqq`, con nombre, organización y estado verificados por Management API.
- [payment-sandbox-target.example.json](../../scripts/payment-sandbox-target.example.json): manifest explícito del sandbox, sin credenciales.
- [payment-migration-rehearsal.mjs](../../scripts/payment-migration-rehearsal.mjs): prueba controlada sobre una base fixture local dedicada; no admite transporte remoto.
- [payment-bootstrap-legacy.mjs](../../scripts/payment-bootstrap-legacy.mjs) y [payment-legacy-hashes.json](../../scripts/payment-legacy-hashes.json): inicialización dirigida de un sandbox vacío con las ocho versiones legacy y hashes fijados. Excluyen correctiva, migraciones pendientes de catálogo y seed general.
- [payment-sandbox-fixtures.sql](../../scripts/payment-sandbox-fixtures.sql): configuración mínima de QA sin identidades, perfiles ni documentos.

El runner correctivo exige el SHA-256 revisado, los contratos legacy completos y un historial conocido. Emite el SQL para revisión sin escribir la base. La aplicación requiere además `--apply` y `--confirm-isolated` con la identidad exacta. El manifest `checkout_enabled=false` documenta la declaración del operador; **no verifica por sí mismo que Vercel haya desplegado la bandera**. Release debe comprobar la versión y configuración efectivas antes de habilitar la aplicación de la correctiva.

La transacción correctiva toma un lock, vuelve a verificar el historial/contrato, ejecuta las 55 sentencias de la migración y agrega una única fila con versión `20260911224302`, nombre y `statements` exactos. Un fallo revierte esquema e historial juntos. Después comprueba las firmas nuevas, la desaparición de legacy y el hash de los statements registrados. Un reintento con ese estado completo devuelve `already_applied`, sin ejecutar escrituras. No modifica ni marca como aplicadas las tres versiones de catálogo pendientes.

Ejemplo de revisión, con `SUPABASE_ACCESS_TOKEN` ya suministrado de forma segura al proceso:

```bash
node scripts/payment-migration.mjs \
  --target scripts/payment-sandbox-target.example.json \
  --output-sql /tmp/psi-payments-directed-corrective.sql
```

No se imprimen tokens, URLs con credenciales ni errores que incluyan headers. No hay reintentos automáticos de escritura ante timeouts: se vuelve primero al dry-run para distinguir un commit realizado de una transacción no aplicada.

### Ensayo local del mecanismo

Se creó la base nueva `psi_payments_legacy_20260912` dentro del contenedor aislado `supabase_db_psi_payments_20260911`. No se reseteó ni modificó la base original `postgres`. El scaffold de Auth/Storage se copió sólo como estructura, sin datos; los servicios del stack no se reconectaron a esta base fixture.

Sobre esa base se aplicaron las ocho migraciones legacy y se verificaron estos resultados:

| Prueba del mecanismo | Resultado |
| --- | --- |
| Producción, `postgres` original, hash incorrecto, checkout declarado abierto o confirmación faltante | Rechazados antes de aplicar |
| Dry-run sobre legacy, con las tres migraciones de catálogo ausentes | Aprobado; 55 sentencias correctivas preparadas |
| Fallo intencional después del DDL y antes del historial | Rollback completo; siguiente dry-run conserva estado legacy |
| Aplicación dirigida | Una correctiva y una fila de historial; cero migraciones de catálogo |
| Segundo intento de aplicación | `already_applied`; ninguna escritura |
| Nombre y hash de statements registrados | Coinciden con el artefacto revisado |
| Sintaxis Node 24 y ESLint de los scripts | Aprobadas |

Evidencia local: `/tmp/psi-payments-migration-rehearsal.log`, `/tmp/psi-payments-legacy-init.log` y SQL revisable `/tmp/psi-payments-directed-corrective.sql`. El ensayo comprueba el mecanismo de migración; no es un recorrido de pago con Mercado Pago ni una verificación del flag de una aplicación desplegada.

### Estado del sandbox hospedado al cerrar este tramo

Release creó y verificó el proyecto aislado `universo-psi-mp-sandbox`, ref `gzsbndvaxdyuyhjidfqq`, organización `qwxmgztzoidyzkelupdr`. Tras la autorización del coordinador y la cesión de escritura exclusiva de DB por release:

- Se inicializaron las **ocho versiones legacy** desde `20260815161322` hasta `20260830030000`, con su historial dentro de una transacción. La verificación posterior devolvió exactamente esas ocho versiones.
- **No se aplicó la correctiva `20260911224302` ni las tres migraciones de catálogo pendientes.** El Preview con checkout deshabilitado es el siguiente paso de coordinación antes de aplicar la correctiva allí.
- Se cargaron sólo `psychologist`, dos tipos de credencial con sus dos reglas, `anxiety`, `individual_therapy`, `ONLINE`, `es`, el mensual aprobado de ARS 120000 recurrente y sus dos entitlements. Son filas de configuración mínima, no el seed general.
- Los conteos verificados de usuarios, perfiles profesionales y suscripciones son **cero**. No se crearon documentos ni identidades; el comprador sandbox queda a cargo del recorrido QA coordinado.
- La creación del plan en una base nueva replica el importe ya aprobado; no se alteró un precio existente ni un plan productivo.

Evidencia: `/tmp/psi-payments-hosted-legacy-bootstrap.log` (`bootstrapped_and_verified`) y `/tmp/psi-payments-hosted-fixtures.log` (fixtures HTTP 201 y conteos). El SQL de inicialización revisable queda en `/tmp/psi-payments-hosted-legacy-bootstrap.sql`. La disponibilidad de esta base aún no demuestra un cobro sandbox aprobado ni una notificación auténtica reconciliada.

## Transición sandbox completada: Preview cerrado → correctiva

A continuación del estado legacy anterior, el coordinador autorizó aplicar la correctiva **sólo al sandbox `gzsbndvaxdyuyhjidfqq`**. Release había confirmado el Preview `dpl_8Zzp8krBbYavqef94ocghNNpw7c4` en `READY`, conectado a esa base y con `MERCADOPAGO_CHECKOUT_ENABLED=false`; también reportó home/planes HTTP 200 y webhook de la aplicación HTTP 503 por falta de credencial Mercado Pago. Esta evidencia de aplicación corresponde al coordinador/release.

Se ejecutó el runner dirigido ya ensayado, sin modificarlo:

1. Dry-run: identidad y manifest del sandbox, SHA-256 `10b29b93ea002e68ab8657797b6a650b0346e53f1187792189c4051fcf105e19`, estado legacy y 55 sentencias confirmados. Las tres versiones de catálogo figuraban pendientes.
2. Aplicación: `applied_and_verified`; una única fila de historial agregada para `20260911224302`, con nombre y hash de statements verificados. No se aplicó ninguna migración de catálogo.
3. Segundo intento: `already_applied`, `wrote=false`. Fue un no-op de sólo lectura.
4. Postflight capturado desde `2026-09-12T01:55:19Z`: **14 consultas, todas HTTP 201**, en modo de sólo lectura.

| Control posterior | Resultado |
| --- | --- |
| RPC nuevas de begin/attach/webhook/payment, en `public` y `private` | 8 presentes |
| RPC legacy sustituidas | 0 presentes |
| Ejecución de backend | Sólo `service_role` entre los roles de aplicación inspeccionados; `anon`/`authenticated` denegados |
| Wrappers y funciones privadas | `SECURITY INVOKER` en `public`, `SECURITY DEFINER` en `private`, `search_path` vacío |
| Cinco tablas privadas de pagos | RLS y FORCE RLS activos; lectura de `anon`/`authenticated` denegada |
| Historial | Las ocho versiones legacy y `20260911224302`: nueve versiones exactas |
| `20260830040000`, `20260830050000`, `20260830060000` | Siguen ausentes |
| Plan mensual | ARS 120000, `MONTH`, `RECURRING`, activo y `PUBLISHED`; sin cambio |
| Suscripciones/eventos persistidos en el postflight | 0 / 0 |

La consulta de advisors de seguridad por Management API respondió HTTP 200: **cero WARN/ERROR y 17 INFO `rls_enabled_no_policy`**. Estos avisos incluyen las tablas privadas protegidas y `public.analytics_events`; no se agregaron policies ni grants para silenciarlos. La CLI rechazó inicialmente `--project-ref` sin `--linked`; se usó la ruta explícita de API en lugar de cambiar el contexto enlazado.

QA recibió la confirmación de aplicación antes de ejecutar su suite funcional remota. Posteriormente reportó HTTP 201 y marcador `PASS` para `payment_persistence.sql` dentro de `BEGIN ... ROLLBACK`, con cero fixtures de usuarios, perfiles, suscripciones, eventos, recibos y estado de pago antes/después. El detalle de esa prueba pertenece al reporte de QA y a `/tmp/psi-payments-hosted-qa-20260912.json`.

Evidencia de esta transición:

- `/tmp/psi-payments-hosted-corrective-dryrun.log`
- `/tmp/psi-payments-hosted-corrective-apply.log`
- `/tmp/psi-payments-hosted-corrective-duplicate.log`
- `/tmp/psi-payments-hosted-corrective-reviewed.sql`
- `/tmp/psi-payments-hosted-corrective-postflight.log`
- `/tmp/psi-remote-config/payment-sandbox-postflight-results-2026-09-12.json`
- `/tmp/psi-remote-config/payment-sandbox-security-advisors-2026-09-12.json`

**La correctiva quedó aplicada y probada en el sandbox, no en producción.** Este tramo no creó cargos, usuarios ni nuevos fixtures persistentes, no habilitó checkout y no reemplaza el recorrido pendiente con las credenciales y cuentas de prueba de Mercado Pago.

## Revalidación productiva por SQL Editor, 12/09/2026 22:34 UTC

El coordinador ejecutó un preflight con `BEGIN READ ONLY` desde el SQL Editor del proyecto productivo `gwizdgboqwpzyiaqcxbb`. La captura de la respuesta de red venció, pero el editor mostró una fila completa `state`. **No se dispone de un código HTTP para esta ejecución.** La hora de observación conservada es `2026-09-12T22:34:33.356061Z`, tomada del mtime del archivo de captura; no se presenta como timestamp del servidor de base de datos.

El agente de datos extrajo esa fila y aplicó, sin red ni nuevas consultas, el bloque exacto de validación previa del paquete dirigido de producción. Resultado: **9/9 comprobaciones PASS**, con rol observado `postgres` y `transaction_read_only=on`:

- Ocho versiones legacy exactas; correctiva todavía ausente del historial.
- Seis firmas legacy presentes y cero nuevas; constraints legacy e índice del proveedor presentes.
- Columnas del historial compatibles; las dos tablas nuevas de estado/recibos todavía ausentes.
- Agregados devueltos de suscripciones, eventos, clientes y mapeos: cero.
- Mensual sin cambios: ARS 120000, `MONTH`, `RECURRING`, activo y `PUBLISHED`, sin compromiso mínimo y con tres días de gracia.

También coincidieron el SHA-256 original de la correctiva y los cuatro hashes del manifest para la transacción, consulta de estado, preflight y payload revisables. La identidad se corroboró con el ref exacto de la URL capturada del SQL Editor. Esta validación offline no volvió a consultar organización, salud del proyecto ni privilegios de bypass del rol; conserva el alcance de los datos de la captura.

Evidencia privada `0600`: `/tmp/psi-remote-config/production-migration-20260911224302.pre.ui-20260912T223433Z.json`. Fuente: `/tmp/psi-supabase-browser-prod-preflight-result-view-20260912.log`; el resultado conserva su hash y no copia el resto del contenido del navegador. La preparación y recuperación están detalladas en `/tmp/psi-remote-config/production-migration-20260911224302.REVIEW.md`.

**Este PASS valida las precondiciones capturadas; no constituye aprobación ni ejecución de la migración productiva.** No se aplicaron DDL, grants ni cambios de datos en esta validación. La aplicación nueva con checkout cerrado y la autorización explícita siguen siendo pasos separados de la secuencia coordinada.

## Aplicación productiva autorizada y verificada, 12/09/2026 23:07 UTC

Después del preflight, el usuario autorizó: «Sí, avanzá y dejá todo listo para recibir pagos reales». El coordinador confirmó el despliegue compatible `dpl_BETKKLQDNArnsoi5C8j5w9GYCmXs` en `READY`, dirigido a producción y con checkout cerrado. El manifest de la operación conserva esa referencia y tiene estado `APPLIED_POSTFLIGHT_VERIFIED`.

El coordinador envió **una única transacción dirigida** por Management API al proyecto `gwizdgboqwpzyiaqcxbb`. La guardia previa de identidad confirmó organización `qwxmgztzoidyzkelupdr`, región `ca-central-1` y `ACTIVE_HEALTHY`. El intento comenzó a las `23:06:53.047Z` y la respuesta observada a las `23:06:55.595Z` fue **HTTP 201**. El SHA-256 del SQL enviado fue `e68da6b94cb340a3a098960763e01791fc3d443e4f714aa6b9c0f106d00e669f`, idéntico a la transacción aprobada. Esa envoltura conserva las 55 sentencias de la correctiva original con SHA-256 `10b29b93ea002e68ab8657797b6a650b0346e53f1187792189c4051fcf105e19` y registra su historial en el mismo commit.

El agente de datos revisó después las capturas privadas **offline**, comprobando hashes, integridad de las respuestas fuente y correspondencia entre filas capturadas y resultados de validación. No hizo nuevas consultas remotas durante esta revisión.

| Verificación posterior | Resultado observado |
| --- | --- |
| Postflight de sólo lectura, HTTP 201 | **10/10 PASS** |
| Historial | Nueve versiones exactas: ocho legacy más `20260911224302` |
| Nombre y statements del historial correctivo | `harden_payment_persistence`, MD5 `5cd8fe39e9201a169710bfb49239a4d7` |
| RPC nuevas / legacy sustituidas | Ocho nuevas en `public`/`private`; cero legacy |
| Contratos backend | EXECUTE de aplicación sólo `service_role`; wrappers invoker, helpers definer, `search_path` vacío |
| Controles SQL de seguridad de pagos, HTTP 201 | **8/8 PASS**, incluidos RLS forzada, grants de tabla/columna e identidades de índices |
| Esquema REST/PostgREST, HTTP 200 a las 23:07:43Z | Las cuatro RPC públicas nuevas y sus argumentos exactos están disponibles |
| Catálogo pendiente | `20260830040000`, `20260830050000` y `20260830060000` siguen ausentes; no se ejecutó su DDL |
| Plan mensual | Activo, `PUBLISHED`, ARS 120000, `MONTH`, `RECURRING`, sin compromiso mínimo y con tres días de gracia |
| Agregados al postflight | Suscripciones, eventos, clientes y mapeos: cero |

Los ocho controles de seguridad son consultas dirigidas al esquema de pagos; no se presentan como una ejecución global de todos los advisors de Supabase. La comprobación de OpenAPI demuestra disponibilidad del contrato REST, sin llamar RPC de escritura ni generar pagos.

Evidencias privadas de esta aplicación:

- `/tmp/psi-remote-config/production-migration-20260911224302.apply.management-20260912T230652Z.json`
- `/tmp/psi-remote-config/production-migration-20260911224302.post.captured-20260912T230708Z.json`
- `/tmp/psi-remote-config/production-migration-20260911224302.advisors.captured-20260912T230731Z.json`
- `/tmp/psi-remote-config/production-postgrest-schema-verified.json`
- `/tmp/psi-remote-config/production-migration-20260911224302.manifest.json`

**La migración productiva quedó aplicada y verificada.** Se preservó el runner exclusivo de sandbox, no se ejecutó un `db push` general, no se aplicaron seeds ni se modificaron precios. La recuperación permanece forward-only: mantener una aplicación compatible y cerrar checkout ante incidentes; no volver a firmas legacy, borrar historial financiero ni repetir la transacción ya confirmada. La apertura posterior de checkout y las pruebas de la aplicación corresponden al tramo de release coordinado.
