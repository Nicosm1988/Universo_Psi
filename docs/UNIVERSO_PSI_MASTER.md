# Universo Psi — contexto maestro

Actualizado: 2026-09-12. Este documento registra decisiones y contratos del producto; no prueba por sí solo que una funcionalidad esté implementada. El estado real se confirma con código, migraciones y tests.

## Estado operativo de pagos — 12/09/2026

Mercado Pago habilitado en Production con aprobación explícita: plan Profesional mensual por ARS120.000, cuenta real63533235 y app2533766701506518. Deployment `dpl_Gp5xuyMB42J7cXZitzN5ozPpvaVq` READY en `https://universo-psi-eight.vercel.app`, fuenteSHA0b77dd621bd6c3bb829fde7293f84c2d659b8c887d793219f13951b3b7ba18dd, CHECKOUTtrue sóloProduction y Previeworiginalfalse. Supabasegwiz tiene la correctiva20260911224302 aplicada: postflight10/10, advisors8/8 y cuatro RPC verificadas por API. Sandbox acreditó pago, activación y cancelación automáticos; producción pasó firma de webhook sintético ignorado y smoke sin cargos. No se ejecutó una compra productiva ni se cambiaron precios. Navegador anónimo productivo aprobado en escritorio1440 y móvil390: copy de cobro activo, mensual120000, CTA hacia ingreso con destino al alta profesional; sin enviar formularios ni crear cuentas/pagos. El detalle fechado y límites están en los reportes de habilitación/QA. Los estados anteriores se conservan como historia.

## Independencia de emails de pago — 13/09/2026

El email de autenticación no identifica al pagador de Mercado Pago. El checkout recoge el pagador independientemente cuando la API lo exige y omite el email en preferencias; aprobación por referencia aleatoria y API, sin comparar emails. Parámetros y límites de verificación: [auditoría dirigida](deployment/payment-email-independence-2026-09-13.md).

## Corrección de autenticación — 12/09/2026

Se confirmó Google deshabilitado y sin credenciales OAuth en Supabase productivo. El SDK sólo armaba la URL y la interfaz ofrecía siempre el proveedor. Se agregó comprobación runtime sin caché en ingreso/registro y en la acción, validación del redirect de autorización, preservación de PKCE y destino, y recuperación local de errores/cancelación. La excepción histórica de reset de la cuenta QA ahora exige modo de pruebas y excluye Production. Pasan lint, typecheck, 287 pruebas, build Node24 con catálogo público real y 22 comprobaciones de navegador con proveedor simulado. La habilitación real de Google requiere que el titular complete Google Cloud/Supabase y luego se verifique el retorno autenticado. El mismo error en el registro por email permitió encontrar una segunda causa: Enter podía elegir el botón Google, primer submit del formulario compartido. Ahora son formularios independientes. Se verificó Enter con datos inválidos y con un alta válida simulada; falta comprobar la entrega y confirmación de un correo real en esta corrección. Release final `dpl_5aSJgsgmFD1MRUZaCKtpV95uHags` READY en el dominio canónico; smoke productivo PASS de ambos formularios en escritorio/móvil y planes intactos, sin crear cuentas ni enviar correos/cargos. Guía y límites: [acceso con Google](deployment/google-auth.md).

## Resumen

Universo Psi conecta una búsqueda concreta con una persona profesional orientadora y un contacto:

`búsqueda visible → filtros → perfil → ingreso/contacto`

Es una plataforma B2C/B2P/B2B de SENDA, pero no es el servicio boutique SENDA. La relación de marca debe permanecer configurable.

## Principios no negociables

- Producto original y **clean-room**: RedPsi es sólo un benchmark funcional. No hay scraping, copia de código, textos, datos, assets, identidad ni diseño.
- La búsqueda aparece en la primera pantalla. La persona no atraviesa un test ni necesita conocer el nombre técnico del servicio que busca.
- La home es corta, práctica y mantiene visibles las acciones de buscar, abrir un perfil, contactar, ingresar y crear cuenta.
- El catálogo público admite cualquier tipo profesional activo de salud mental (`professional_types.is_active`): Psicología, Psiquiatría, Psicopedagogía, Musicoterapia y Terapia ocupacional al momento del fork. La taxonomía es data-driven y se amplía agregando filas, no código.
- Los perfiles, filtros, DTOs y ranking públicos no exponen honorarios. Los planes comerciales B2P son otro dominio.
- Las valoraciones y opiniones aprobadas sí son señales públicas de confianza; no reemplazan relevancia ni verificación.
- No se usan fotografías generadas por IA. Los recursos visuales futuros deben ser propios o licenciados y registrar su procedencia.
- B2C comienza gratuito. La monetización prioriza suscripciones B2P y convenios B2B.
- Relevancia antes que pago: cualquier resultado patrocinado se identifica y el plan sólo puede aplicar un impulso acotado.
- Privacidad por diseño: mínimo dato, autorización en servidor, Storage privado y trazabilidad de acciones sensibles.
- WCAG 2.2 AA, mobile-first, buen rendimiento y estados loading/empty/error/unauthorized/forbidden.
- Taxonomías, reglas de verificación y planes tienen fuente administrable en base de datos. El modelo histórico de matching permanece versionado y dormido: no tiene UI, navegación ni persistencia activa.

## Stack decidido

| Capa | Decisión |
| --- | --- |
| Aplicación | Next.js 16.3 App Router, React 19, TypeScript 5 strict |
| UI | Tailwind CSS 4, primitives accesibles sólo cuando aporten valor |
| Formularios | Server Actions/`useActionState` + Zod; validación repetida en servidor |
| Datos | Supabase PostgreSQL 17, Auth y Storage privado |
| Acceso | DAL `server-only`, DTOs mínimos, grants explícitos y RLS |
| Email | Adaptador Resend; envío real sólo con dominio y credenciales válidas |
| Pagos | Adaptador Mercado Pago preparado para sandbox/producción |
| Analítica | Vercel Analytics/Speed Insights; eventos de negocio propios |
| Calidad | ESLint, `tsc`, Vitest y Playwright |
| Destino de producción | [Vercel](https://universo-psi-eight.vercel.app), runtime Node.js 24, GitHub `main` → Production; release remoto verificado el 2026-08-15 |

Versiones exactas y lockfile se controlan en `package.json` y `package-lock.json`.

## Arquitectura en una página

- Server Components por defecto; Client Components sólo para interacción o APIs del navegador.
- Lecturas sensibles y operaciones privilegiadas pasan por módulos `server-only`. La excepción intencional es la carga directa al bucket privado desde el navegador con JWT, path propio y RLS; luego una RPC autenticada registra la credencial.
- Server Actions son controladores finos para formularios autenticados. Route Handlers cubren callback Auth, intake público, analytics, cron y webhooks.
- Las acciones se tratan como endpoints públicos: validan input, sesión, rol y propiedad en cada invocación.
- Supabase usa cliente SSR ligado a la sesión para operaciones con RLS; la clave secreta queda limitada a tareas privilegiadas y nunca compensa una autorización ausente.
- Cada objeto expuesto al Data API declara su `GRANT`; toda tabla expuesta tiene RLS. Las views usan `security_invoker = true`.
- Resend y Mercado Pago implementan puertos/adaptadores para que la falta de credenciales no bloquee el resto del producto.
- El ranking público usa `rank_professionals`, restringe la elegibilidad a Psicología/Psicopedagogía y devuelve versión, componentes y razones. Su firma ya no acepta presupuesto.
- El modelo/RPC de matching continúa versionado para preservar historial técnico, pero el cuestionario fue retirado de la experiencia. `/matching` sólo redirige al directorio.

Detalle: [arquitectura](architecture/architecture.md), [base de datos](architecture/database.md) y [seguridad](architecture/security.md).

Dominios estables: shell público `search-first`; directorio/filtros/cards; perfil/contacto; onboarding y workspace profesional; administración/moderación; planes/pagos; contenidos; convenios. Matching queda como infraestructura dormida, no como dominio visible. La UI compartida no contiene autorización ni reglas de negocio. Recursos y convenios permanecen como experiencia demo; sus esquemas productivos no son aún la fuente de esas páginas.

## Roles

| Rol | Alcance |
| --- | --- |
| `USER` | Buscar, contactar y gestionar sus propios datos. La tabla/policy de favoritos está preparada, pero su UI está pendiente. |
| `PROFESSIONAL` | Lo anterior más onboarding, perfil propio, credenciales, leads y suscripción. No se auto-verifica. |
| `EDITOR` | Tiene permisos de datos para moderar contenidos/reseñas dentro del alcance asignado; la consola UI está pendiente. No accede por defecto a credenciales privadas ni facturación. |
| `ADMIN` | El vertical UI revisa credenciales/publicación; el modelo autoriza taxonomías, planes, convenios y operaciones cuyas consolas están pendientes. Toda mutación sensible cubierta se audita. |
| `SUPERADMIN` | Configuración y recuperación excepcionales. Uso mínimo y reforzado. |

La autorización nunca depende de `user_metadata`. La fuente autoritativa es `user_roles`; si algún rol se refleja en `app_metadata`, los controles sensibles vuelven a verificarlo en servidor.

## Rutas canónicas y estado

- **Implementado — públicas:** `/`, `/profesionales`, `/profesionales/[slug]`, `/para-profesionales`, `/planes`, `/convenios`, `/convenios/[slug]`, `/recursos`, `/recursos/[slug]`, `/preguntas-frecuentes`, `/contacto`, `/solicitudes`, `/terminos` y `/privacidad`.
- **Compatibilidad:** `/matching` redirige permanentemente a `/profesionales`; no aparece en navegación ni sitemap y no representa una funcionalidad activa.
- **Implementado — cuenta y alta:** `/ingresar`, `/registro`, `/recuperar-acceso`, `/actualizar-contrasena`, `/aceptar-terminos`, `/profesionales/sumarse` y `/auth/callback`.
- **Implementado — privado:** `/dashboard` concentra perfil, últimas consultas, métricas y suscripción mediante secciones; `/admin` concentra revisión de credenciales y decisión de publicación.
- **Implementado — sistema:** `/api/leads`, `/api/analytics`, `/api/subscriptions/select`, `/api/webhooks/mercado-pago`, `/api/internal/notifications/process` y metadata routes para `robots.txt`/`sitemap.xml`. El webhook existe, pero responde cerrado y no procesa pagos.
- **Pendiente:** landings `/profesionales/{necesidad|tipo|ubicacion}/[slug]`, subrutas especializadas de dashboard y las consolas admin de taxonomías, planes, suscripciones, leads, reseñas, artículos, convenios y auditoría.

El contrato completo de navegación e indexación está en [arquitectura de información](product/information-architecture.md).

## Variables de entorno

Nombres canónicos:

- Base: `NEXT_PUBLIC_SITE_URL`.
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`.
- Seguridad operativa: `RATE_LIMIT_SALT`, `CRON_SECRET`.
- Resend: `RESEND_API_KEY`, `EMAIL_FROM`.
- Mercado Pago: `MERCADOPAGO_CHECKOUT_ENABLED` (`false` por defecto), `MERCADOPAGO_ACTIVE_ACCOUNT` y, por cuenta `PERSONAL`/`COMPANY`, `MERCADOPAGO_{CUENTA}_ACCESS_TOKEN`, `_WEBHOOK_SECRET`, `_ENVIRONMENT` (`sandbox`/`production`) y `_COLLECTOR_ID`. `_PUBLIC_KEY` es opcional para el checkout alojado. El interruptor cierra nuevos checkouts sin interrumpir webhooks/reconciliación. Los nombres genéricos históricos no configuran el adaptador actual; la fuente es `.env.example` y `src/lib/env/server.ts`.
- Preparadas pero sin adaptador activo: `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `SENTRY_DSN`; deben quedar vacías. `UNIVERSO_PSI_TEST_MODE` es exclusivo de tests.

No activar variables sin consumidor funcional. Todo `NEXT_PUBLIC_*` es visible en el navegador y queda embebido al construir. Matriz por ambiente: [despliegue en Vercel](deployment/vercel.md).

## Límites de credenciales externas

El dueño debe aportar o configurar fuera del repositorio:

- claves del proyecto Supabase y proveedores de Auth;
- dominio remitente verificado y API key de Resend;
- credenciales sandbox/producción y secreto de webhook de Mercado Pago;
- dominio público, DNS y variables de Vercel;
- cuentas de analítica/errores opcionales;
- alta y confirmación de la cuenta real que se promoverá una sola vez a primer `SUPERADMIN`.

Nunca se inventan valores ni se degradan integraciones reales a mocks silenciosos. Sin credenciales, el adaptador queda validable mediante contrato/fake de test y la UI comunica “integración no configurada”.

## Decisiones registradas

| ID | Decisión | Motivo |
| --- | --- | --- |
| D-001 | Supabase como Postgres/Auth/Storage | Menor carga operativa y controles de acceso coherentes. |
| D-002 | DAL exclusivamente de servidor | Centraliza auth/authz y minimiza datos serializados al cliente. |
| D-003 | Catálogo normalizado | Taxonomías y reglas cambian sin desplegar UI ni mantener JSON gigantes. |
| D-004 | Matching determinístico preparado, retirado de UX | Se preserva el modelo/RPC versionado, pero el producto no presenta cuestionario ni persiste respuestas. |
| D-005 | Ranking con impulso comercial acotado | Preserva utilidad, diversidad y confianza. |
| D-006 | Credenciales en Storage privado | Documentos sólo por acceso autorizado y URL firmada breve. |
| D-007 | Adaptadores para email/pagos | Aísla proveedores y permite continuar sin credenciales externas. |
| D-008 | Node.js 24 en Vercel | Runtime estable único para aplicación e integraciones de servidor. |
| D-009 | Shell operativo en `public`, PII en `private` | Reduce exposición del Data API y limita el impacto de errores. |
| D-010 | Aceptaciones legales append-only por versión | Conserva evidencia histórica; `user_profiles` mantiene sólo un cache de la versión vigente. |
| D-011 | Seed demo intencional sólo para el piloto inicial | Permite arrancar el catálogo sin representar personas ni acuerdos reales; toda fila demo se identifica. |
| D-012 | Experiencia `search-first` y home corta | Minimiza pasos y mantiene siempre accesible la conversión búsqueda → perfil → contacto. |
| D-013 | Publicación abierta a todo tipo profesional activo de salud mental | Migración `20260830000000` generaliza `has_supported_professional_types` (heredada de Red Senda, que la restringía a dos códigos) para admitir cualquier fila `is_active` del catálogo. |
| D-014 | Honorarios fuera de toda superficie pública | Perfil, filtros, directorio y ranking no exponen precios; los planes comerciales B2P continúan separados. |
| D-015 | Prohibidas las fotografías generadas por IA | La identidad visual usa tipografía, formas, iconografía y recursos propios o licenciados con procedencia verificable. |
| D-016 | `/recursos` y `/convenios` leen de Supabase, con `body` en Markdown ligero (`## Heading`) para secciones/lead | Evita tablas o JSON adicionales para prosa; reutiliza el patrón normalizado ya elegido para el resto del catálogo. |
| D-017 | `articles.takeaways` y `agreements.audience_summary/coverage_summary/benefits/eligibility/access_steps` se agregaron por migración | La demo original exigía contenido editorial estructurado que el esquema inicial no tenía; se agregó como columnas normalizadas mínimas, no JSON. |

Cualquier cambio irreversible, legal o económicamente relevante requiere una ADR breve o actualización de esta tabla.

## Política de eficiencia de tokens

Para toda tarea futura:

1. Leer este índice y sólo el documento especializado necesario.
2. Buscar con `rg` por símbolo, ruta, tabla o variable antes de abrir archivos completos.
3. No releer ni reimprimir contenido conocido salvo cambio real.
4. Agrupar inspecciones y verificaciones seguras.
5. Verificar antes de editar; preservar código sano y cambios ajenos.
6. Comunicar decisiones nuevas, no repetir diagnósticos.
7. Ejecutar el chequeo más pequeño que pruebe el cambio y ampliar según riesgo.
8. Actualizar esta documentación cuando cambie un contrato para no reconstruir contexto.

## Estado del MVP al 2026-08-15

| Área | Estado | Evidencia/límite |
| --- | --- | --- |
| Marketplace público y leads | **Implementado en el repositorio** | Home corta con búsqueda inmediata; directorio sólo de Psicología/Psicopedagogía; filtros URL con scroll propio; cards comparables sin honorarios; ratings/opiniones aprobadas; perfil, API idempotente, PII privada y outbox por cada lead nuevo. El fallback en memoria sólo corre en pruebas o contra la URL inerte de ejemplo. |
| Auth, onboarding y dashboard | **Implementado** | Aceptación legal append-only, perfil, plan, documento privado, últimas 20 consultas, transiciones y métricas agregadas. |
| Verificación y moderación | **Implementado** | El vertical `/admin` revisa credenciales y decide publicación con RPC auditadas. Las demás consolas están pendientes. |
| Email — pipeline | **Implementado** | Claim con lease/`lock_token`, lote post-response, cron diario autenticado y reintentos; no guarda el cuerpo sensible en el email. |
| Email — entrega real | **Pendiente** | Requiere dominio, `RESEND_API_KEY`, `EMAIL_FROM` y smoke test. Sin ellos el outbox queda `FAILED` reintentable, no `SENT`. |
| Planes/pagos | **Preparado** | Los tres planes están `DRAFT`, sin importes; elegir crea/actualiza `PENDING_PAYMENT`. Checkout, firma y reconciliación Mercado Pago están pendientes. |
| Matching | **Retirado de UX / dormido** | No hay cuestionario, CTA ni navegación. `/matching` redirige al directorio. Las tablas y `explain_matching` se conservan sin uso para no borrar historial técnico. |
| Contenidos y convenios | **Lectura pública implementada** | `/recursos` y `/convenios` leen artículos y convenios `PUBLISHED` desde Supabase (incluye seed real, `is_demo` rotulado). La consola admin para crear/moderar artículos y convenios sigue pendiente; hasta entonces el contenido sólo se carga por seed/SQL directo. |
| Seguridad/QA | **Implementado** | RLS/grants, Storage privado, CSP nonce, rate limit, suites públicas, fixture SQL, integración RLS y E2E autenticado ejecutados; CI de GitHub quedó verde para el release. |
| Primer `SUPERADMIN` | **Pendiente** | La RPC service-only está implementada; falta crear/confirmar la cuenta real y ejecutar el bootstrap único. |
| Producción | **Release verificado** | Cuatro migraciones alineadas en Supabase y commit `de0fbef` desplegado en Vercel; home `search-first`, catálogo exclusivo, filtros, perfiles, ausencia de honorarios, RPC/grants, lint/advisors y smoke desktop/móvil verificados el 2026-08-15. Email, pagos, primer admin y sesión real remota conservan sus estados externos propios. |

## Próxima iteración

### Habilitación de pagos revisada el 11/09/2026

El estado histórico anterior no acredita pagos ni recursos remotos actuales. La revisión incorpora reserva y enlace de checkout, validación de cuenta/ambiente y snapshot, deduplicación transaccional y recuperación administrativa de notificaciones perdidas. Una autorización de suscripción no activa beneficios: se exige consultar un pago aprobado y persistirlo correctamente. La migración nueva conserva las migraciones anteriores.

La verificación posterior recuperó acceso Vercel e identificó el proyecto `universo-psi`, dominio `universo-psi-eight.vercel.app` y base productiva `gwizdgboqwpzyiaqcxbb`. El 12/09 UTC se resolvió el 403 de Supabase al autorizar la CLI con la cuenta correcta desde una ventana separada dedicada a Supabase: Management respondió 200, estado `ACTIVE_HEALTHY`, organización `qwxmgztzoidyzkelupdr` y Auth configurado para el dominio servido. La consulta pública confirmó el mensual activo/publicado por ARS 120.000; esto no acredita cobro ni activación de beneficios. El vínculo local de la CLI se corrigió a `gwizdgboqwpzyiaqcxbb`, conservando un respaldo privado del vínculo heredado de `red-senda`. Vercel conserva credenciales de Mercado Pago protegidas en Production, todavía sin verificar identidad, ambiente ni cobro. Se guardó `MERCADOPAGO_CHECKOUT_ENABLED=false` para futuros despliegues de Preview y Production; no se desplegó la aplicación nueva ni se alteró el sitio servido. Sandbox requiere base aislada, cuentas de prueba y webhook público. No se activaron cobros ni se modificaron precios. Inventario actualizado, configuración propuesta y recuperación: [habilitación Mercado Pago](deployment/mercadopago-enablement-2026-09-11.md). Evidencia local y escenarios: [QA de pagos](deployment/mercadopago-qa-2026-09-11.md).

El [preflight remoto de pagos del 12/09 UTC](deployment/payment-preflight-results-2026-09-12.md) ejecutó 17 consultas de sólo lectura: contrato anterior presente, correctiva pendiente y cero suscripciones/eventos/clientes/mapeos en la captura. Las tres migraciones pendientes de catálogo no son dependencias de la correctiva; el release requiere aplicación compatible con checkout cerrado y migración dirigida, sin `db push` general ni aplicación automática de cambios ajenos.

Se creó además el proyecto gratuito y aislado `universo-psi-mp-sandbox` (`gzsbndvaxdyuyhjidfqq`). Allí se inicializaron las ocho migraciones base y fixtures mínimos, se desplegó un Preview con checkout cerrado y se aplicó únicamente la correctiva de pagos mediante el runner dirigido. El ensayo local verificó rollback, aplicación única e idempotencia; las pruebas SQL de pagos también pasaron en el sandbox hospedado con rollback de los fixtures. Producción conserva su esquema anterior; el pago auténtico de Mercado Pago continúa pendiente de las credenciales del vendedor y el correo del comprador de prueba.

El Preview público de pruebas quedó READY en [universo-psi-mp-test.vercel.app](https://universo-psi-mp-test.vercel.app), deployment de preparación `dpl_DMwqRRXnxuEuAueboZjuVYX7vEXM`, dentro del proyecto Vercel separado `universo-psi-mp-test`. Usa exclusivamente la base sandbox y variables propias de Preview; checkout y modo de fixtures permanecen en `false`. Home y planes respondieron 200; el webhook directo respondió 503 `not_configured`, sin login de Vercel, porque todavía no se cargaron credenciales de Mercado Pago. Esto acredita disponibilidad del endpoint, no firma ni entrega auténtica. El smoke inicial detectó que el mapeo entre el código del mensual y el slug de presentación descartaba el plan: se corrigió conservando el precio y se agregó regresión. También se incorporaron `SITE_NOINDEX=true`, cabecera noindex, robots cerrado y sitemap vacío para este entorno. La nueva fuente pasó lint, tipos, 144 pruebas unitarias y build; la revalidación del Preview se registra en el reporte QA. La protección y el despliegue productivo original permanecen sin cambios. El primer intento del nuevo proyecto fue clasificado automáticamente por Vercel como Production y terminó ERROR sin variables ni publicación; el segundo se verificó como Preview antes de asignarle el alias.

Actualización del 12/09/2026 después de cargar credenciales: Mercado Pago respondió 200 a `/users/me` y confirmó vendedor `test_user` de Argentina (`MLA`), con correo distinto del comprador indicado. El collector se derivó de esa respuesta y se conservó en el archivo privado; no se publicaron valores. La revisión automática rechazó transferir las variables MP y abrir checkout en el Preview por requerir aprobación explícita del payload y destino. El usuario respondió posteriormente «Sí, autorizo» a cargar las cuatro variables MP exclusivamente en Preview de `universo-psi-mp-test`, habilitar allí el checkout sandbox y publicar esa configuración. Después de repetir la validación del vendedor, release cargó las cuatro variables únicamente en Preview y publicó `dpl_D8n8c3GicHUAFU3upir3ncffgHbc` (READY, Preview) sobre el alias de QA, con checkout sandbox habilitado, modo de fixtures deshabilitado y noindex. El webhook sin firma respondió 401 y un evento sintético de tipo desconocido firmado localmente respondió 200 ignorado: esas pruebas verifican configuración, no entrega auténtica de Mercado Pago. Producción permanece sin cambios; el resultado se registra en el inventario de habilitación. La pertenencia de la firma a la aplicación y la entrega auténtica permanecen pendientes; verificar una credencial no acredita cobro. QA creó una identidad propia en la base sandbox con el correo indicado, aceptó términos y guardó el perfil ficticio por la interfaz: quedó privado, sin verificar ni publicar, con una única suscripción `PENDING_PAYMENT` por ARS 120.000 mensuales. El retorno manipulado con `status=approved` conservó ese estado, sin pago, período ni beneficios.

El primer intento de checkout sandbox falló antes de reservar: la acción filtraba `professional_profiles.user_id`, columna protegida, y recibió 403/42501. La búsqueda del proveedor y el estado persistido no mostraron recursos del intento. Se corrigió la acción para usar `my_professional_profile`, que deriva el dueño de `auth.uid()`, sin ampliar permisos ni migrar datos. La consulta real con JWT del comprador devolvió sólo su perfil; anon fue rechazado. Se agregaron diagnósticos por etapa sin PII y regresiones de autorización. Lint, tipos, 150 pruebas y build aprobaron; la corrección quedó READY sólo en Preview `dpl_Fqqjowr2VNcpHxQjjzu3YULbNYgd`, conservando las quince variables sandbox autorizadas.

El intento posterior llegó a reservar el checkout en la cuenta `personal`, pero Mercado Pago rechazó la creación con HTTP 400. El diagnóstico fija la etapa `provider_create`; no se conservó el cuerpo del rechazo ni se infiere su causa. La búsqueda exacta del proveedor devolvió cero recursos; la reserva permanece sin enlace, recibos, eventos ni período pagado. No se hizo otro POST ni se liberó la reserva. Los campos enviados cumplen la referencia de creación pendiente sin plan asociado. El usuario confirmó después que había indicado un correo personal para el comprador, no el de una cuenta compradora de prueba; hay que identificar el comprador de prueba correcto antes de preparar otro recorrido. Esto confirma una discrepancia con la preparación prevista, pero no recupera el motivo exacto del HTTP 400. Sigue pendiente la pertenencia de la firma del webhook a la aplicación vendedora de prueba. El pago sandbox auténtico continúa sin ejecutar.

El usuario aportó después la captura oficial del comprador de prueba de Argentina y su ID, distinto del vendedor. La consulta pública del comprador confirmó ID y sitio MLA, pero omitió email y etiquetas; no se construye el correo a partir del ID. El acceso a esa cuenta de prueba se completó en una sesión nueva y aislada. Su perfil autenticado mostró el usuario esperado y un correo completo sin máscara; se actualizó únicamente el correo local del comprador con esa fuente. Se prepara un nuevo fixture privado de Universo Psi para continuar el recorrido. Las credenciales aportadas se conservan únicamente en archivo privado; el fixture anterior y su reserva quedan intactos.


El nuevo fixture con correo del comprador de prueba llegó a checkout el 12/09 a las 15:08:50 UTC: un único intento redirigió a Mercado Pago y persistió el vínculo. La consulta oficial confirmó una sola suscripción pendiente, collector y comprador de prueba esperados, referencia propia y ARS 120.000 cada mes. Continúa `PENDING_PAYMENT`, sin recibos, eventos ni período pagado. La aplicación autoritativa del recurso es `2796628634374866`, distinta de la captura de creación de cuentas (`2533766701506518`); se consulta al usuario si el webhook y su secreto pertenecen a esa aplicación. La ausencia de `payer_email` y `live_mode` en el GET no se interpreta como valores negativos. La cuenta y el país del vendedor se revalidaron por `/users/me`.

Durante el alta del nuevo fixture, la primera aceptación de términos por UI devolvió error sin diagnóstico interno. Perfil y documentos vigentes existían; una comprobación posterior, única e idempotente, de `accept_current_terms` con el JWT propio respondió 200 y registró la aceptación. El borrador se guardó luego por UI. Se conserva la incidencia inicial sin atribuirle una causa no comprobada.


A las 15:27:09 UTC QA confirmó una sola vez el mismo checkout con la Mastercard oficial de prueba y el comprador autenticado. Mercado Pago mostró la suscripción completada y próximo pago el 12/10; esto acredita el resultado visible de la autorización, no un pago aprobado. La observación inmediata de Supabase conserva `PENDING_PAYMENT`, cero eventos/recibos y ningún período pagado. Se consultan suscripción, facturas, pagos y entrega del webhook para determinar qué falta. El código de seguridad requirió entrada por teclado y una segunda validación del formulario; hubo una sola confirmación final.


El GET posterior confirmó la suscripción `authorized` y un pago `approved/accredited` por ARS 120.000 con referencia y collector coincidentes. Aunque el vendedor fue revalidado como `test_user` y QA utilizó comprador y tarjeta oficiales de prueba, el pago devuelve `live_mode=true`; el adaptador actual exige `false` en sandbox. Esa discrepancia debe resolverse con controles de identidad y vínculo del recurso, sin ignorar globalmente el indicador. No se infiere un cargo real únicamente de ese campo. No se observaron requests del webhook en la ventana posterior y la base conserva el estado pendiente.

La búsqueda de facturas con `limit=50` devolvió 400 `Invalid value for limit`; una consulta con 20 también devolvió 400, sin cuerpo conservado. Una tercera consulta sin limit/offset recibió 429 `local_rate_limited` y se detuvieron los intentos. No se verificó la factura ni se cambió el límite de la aplicación por inferencia. El usuario tiene pendiente confirmar el webhook y su secreto en la aplicación `2796628634374866`; la confirmación de la suscripción y el pago de prueba no acreditan todavía notificación auténtica, reconciliación ni activación de beneficios. Producción permanece sin cambios.


En la reanudación posterior se comprobó el endpoint sandbox: `GET` devuelve 405 porque sólo admite notificaciones `POST`; un POST de diagnóstico sin firma devuelve 401 `invalid_signature`. Esto acredita acceso al endpoint y rechazo de llamadas no autenticadas, no entrega de Mercado Pago. El error genérico del panel del proveedor no permite inferir caída ni falta de permisos; se solicita verificar Integraciones desde una sesión separada del vendedor de prueba.

Tras el enfriamiento del 429, una única búsqueda de facturas con `preapproval_id` y sin `limit`/`offset` respondió 200, paginación observada `offset=0, limit=12, total=1`. El GET de esa factura confirmó estado `processed`, tipo `recurring`, importe ARS 120.000 y coincidencia de factura, suscripción, referencia externa y pago aprobado. La factura no expone collector ni live_mode; éstos se comprobaron en el recurso de pago. Se implementan una consulta paginada basada en la respuesta del proveedor y una validación acotada del pago recurrente del vendedor de prueba. No se amplían permisos ni se ignora globalmente el ambiente.


Las correcciones posteriores quedaron probadas y publicadas exclusivamente en Preview `dpl_E1cjBmAaM2Sk91sQEptSXuqbMVP6`, alias `universo-psi-mp-test.vercel.app`, fuente SHA256 `c7e6628de36fa3f22bbe9d4c274bf0495ad465f59944759ad6339a674411d6a3`, conservando las quince variables autorizadas. Lint, TypeScript, 190 pruebas y build aprobaron. El smoke del adaptador real realizó cuatro GET 200 (vendedor, factura, preapproval y pago), sin mocks del proveedor, y confirmó identidad TEST, vínculos, importe y pago aprobado. El nuevo helper recurrente verifica el propietario en cada invocación y permite el caso observado `live_mode=true` sólo en sandbox con vendedor de prueba y factura `recurring` vinculada íntegramente; pagos únicos y producción conservan sus verificaciones estrictas. No se modificaron contratos RPC ni permisos. La consulta de facturas usa paginación del proveedor, validada defensivamente, en vez de imponer 50. Se prepara la prueba de recuperación administrativa del pago ya aprobado sobre el fixture aislado; continúa pendiente una notificación auténtica del proveedor.


La recuperación administrativa del único pago de prueba aprobado se ejecutó mediante la función real de la aplicación, con guards de destino y recurso: ocho GET del proveedor y exactamente dos RPC en la base sandbox. La observación posterior confirmó `ACTIVE`, un recibo, dos eventos y período pagado vigente. Una segunda ejecución del mismo recurso conservó exactamente suscripción, período, estado de pago, recibos, eventos, perfil y ranking; no duplicó beneficios. El dashboard en la sesión aislada respondió 200, mostró la suscripción activa y dejó de ofrecer checkout. El perfil ficticio continúa `DRAFT` y `NOT_VERIFIED`, sin publicación ni ranking. Esta evidencia acredita recuperación administrativa e idempotencia con un pago real del entorno de prueba; no acredita entrega de webhook auténtico, que permanece pendiente de configuración/acceso al panel del vendedor de prueba. No hubo nuevas confirmaciones de pago ni cambios de producción.


El usuario confirmó mediante capturas el acceso a la aplicación vendedora de prueba `2796628634374866` (User ID `3170200305`, integración Suscripciones). Guardó en Webhooks, pestaña Modo productivo de esa cuenta de prueba, la URL del Preview `/api/webhooks/mercado-pago/personal` y los eventos Planes y suscripciones / Pagos (legacy). Luego reemplazó localmente el secreto del webhook y avisó que estaba guardado. Release verificó permisos 0600, secreto distinto y resto de valores MP idénticos; actualizó únicamente ese secreto en Preview e inició un despliegue con la misma fuente probada. Acceso al panel y configuración ya no son bloqueos. Falta comprobar una notificación emitida por Mercado Pago con la nueva firma. Una simulación del panel podrá acreditar conectividad y firma, pero se distinguirá de un evento auténtico generado por un cambio en la suscripción o pago de prueba.


El secreto del webhook actualizado quedó servido en Preview READY `dpl_8JpgqxExebgPN5L94BET9uw7ahRH`, con la misma fuente SHA256 `c7e6628de36fa3f22bbe9d4c274bf0495ad465f59944759ad6339a674411d6a3`, quince variables y alias QA actualizado. Un POST sin firma respondió 401; un tipo desconocido firmado localmente con el nuevo secreto respondió 200 ignorado. No se consultó ni modificó Mercado Pago ni la base para esos probes. Siguiente paso guiado: abrir el simulador del panel, seleccionar la notificación de factura recurrente y el recurso de prueba verificado; registrar su resultado como simulación emitida por el proveedor, separado de entrega auténtica de un evento comercial.


El usuario regeneró posteriormente la firma del webhook y volvió a guardarla en el archivo local después de que la anterior apareciera visible en una captura. Release confirmó que cambió sólo ese secreto. Antes de publicarlo detectó una diferencia de fuente: la revisión demostró que eran únicamente dos líneas de comentario en `reconcile-search.ts`; al revertirlas en memoria se recuperó exactamente el SHA anterior de las 124 fuentes. La fuente revisada queda en SHA256 `7d2d86c58ef28350f954e233c4585fb273931c68d57cad65122427f4e4da2d61`, sin cambios funcionales respecto de las 190 pruebas aprobadas. Se publica la firma regenerada exclusivamente en Preview y se comprueba tanto aceptación de la nueva como rechazo de la anterior, sin reproducir ninguna clave.


La rotación quedó READY en `dpl_GZ5isPbTsuXdKvyKNqWsgb1pwMQr` (Preview) con el alias QA actualizado. Los probes dieron: sin firma 401, firma anterior 401, firma regenerada 200 ignorado. Son comprobaciones sintéticas de configuración, sin llamadas a Mercado Pago ni cambios en pagos/base. El simulador visible agrupa tres tópicos bajo Planes y suscripciones; su documentación no especifica cuál envía el selector genérico. Se usará el ID de preapproval ya verificado y se revisará el `type` y resultado devueltos, sin confundirlo con el ID de factura ni prometer aceptación de un tipo distinto.

El simulador de Mercado Pago envió `subscription_preapproval` para el preapproval verificado y recibió 200. Vercel correlacionó el POST del 12/09 a las 19:54:42.345 UTC con el deployment Preview actual, separado de los probes locales anteriores. La observación de Supabase posterior conserva exactamente suscripción, período, estado de pago, recibos, eventos, perfil y ranking respecto de la recuperación duplicada: `ACTIVE`, un recibo y dos eventos. Quedan verificadas la conectividad, firma y deduplicación de esta simulación emitida por el proveedor; no se atribuye a una entrega comercial automática.

Para comprobar la entrega automática sin otro pago, se ejecutó una única actualización `PUT /preapproval/{id}` con sólo `reason`, agregando el sufijo de QA a la descripción del recurso TEST. Antes se revalidaron vendedor `test_user` MLA, comprador, aplicación, vínculo con el fixture y mensual ARS 120.000. Mercado Pago respondió 200 a las 20:00:14.758 UTC; se conservaron todos los campos comerciales comprobados, incluida recurrencia, estado, tarjeta, fecha del próximo pago y resumen cobrado. El script no escribió en Supabase ni ejecutó recuperación. La primera observación posterior sigue con dos eventos; se consulta la entrega automática sin repetir la mutación. Fuente del contrato: [actualizar suscripción](https://www.mercadopago.com.ar/developers/es/reference/online-payments/subscriptions/update-preapproval/put.md).

Las dos lecturas de Vercel a las 20:00:53 y 20:02:19 UTC no encontraron POST posteriores a la actualización de descripción de las 20:00:14. La observación de DB previa a la siguiente prueba tampoco mostró un evento nuevo. El usuario informa que Panel de monitoreo no abre; no se atribuye la falta de entrega a una causa no comprobada.

Se corrigió el despacho del tópico `payment`, que también puede representar pagos recurrentes. `reconcilePaymentNotification` descubre únicamente la referencia desde un GET autenticado, resuelve modelo/vínculo/cuenta/snapshot persistidos, busca una sola factura de ese pago bajo el preapproval enlazado y vuelve a validar la cadena completa antes de la RPC. Pago único conserva su validación estricta. Ambos tópicos recurrentes comparten la misma clave de deduplicación; no se cambiaron contratos DB ni permisos. Lint, TypeScript, 222 tests en once archivos y build Node24 aprobaron; la revisión independiente de QA no encontró defectos concretos. El nuevo buscador falla cerrado ante más de 1000 facturas, paginación incompleta/inestable o coincidencias ambiguas.

El smoke de `reconcilePaymentNotification` contra los servicios reales pasó con siete GET de Mercado Pago, una lectura de la suscripción en Supabase y una RPC recurrente, todos HTTP200. No se creó ningún pago. El primer intento de conexión falló sin respuestas ni RPC; su evidencia se conservó separada antes de ejecutar la fase con acceso de red. La observación posterior conserva exactamente ocho grupos de datos del baseline: suscripción y período, estado de pago, recibos, eventos, cantidades, perfil y ranking. Continúa `ACTIVE`, un recibo y dos eventos; queda probada la deduplicación cruzada entre `subscription_authorized_payment` y `payment`. Se actualiza únicamente Preview QA con la fuente integrada; el smoke no reemplaza una entrega automática emitida por Mercado Pago.

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

### Credenciales reales y preparación de producción, 12/09 a las22:31UTC

El usuario cargó las credenciales reales y el secreto de webhook en `.env.mercadopago.production.local`, archivo0600 ignorado por Git que Next no carga automáticamente. GET /users/me confirmó collector63533235, MLA, cuenta noTEST y correo coincidente con el declarado. GET /applications/2533766701506518 confirmó Universo Psi activa y token idéntico al verificado, comparado sólo en memoria. La respuesta no expone owner_id ni public_key; no se interpreta su ausencia como discrepancia. Token, publickey y secreto difieren del sandbox. No se transfirieron a Vercel ni se hicieron cargos reales.

QA aprobó además el build público productivo con Node24Docker, VERCEL_ENV=production/SITE_NOINDEX=false:26 consultas reales de catálogo200, sitemap23URLs, noindex desactivado. Credenciales administrativas ficticias sólo para compilación y sin tokenMP: no sustituye el smoke de configuración secreta durante release autorizado. El .next original quedó intacto.

La correctiva20260911224302 tiene paquete productivo dirigido preparado y hashes verificados offline; no se aplicó. Se conserva la restricción sandbox del runner existente y se excluyen las migraciones de catálogo pendientes. Propuesta: aplicación compatible con checkout cerrado → correctiva transaccional → postflight y verificaciones sin cargo → apertura sólo con aprobación del dueño. Mensual120000ARS/mes, restantes planesDRAFT, basegwiz y dominio universo-psi-eight.vercel.app. Falta confirmar URL/tópicos del webhook real y aprobar la configuración concreta; secreto presente no equivale a firma productiva probada.



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



### Apertura productiva y revisión final de navegador

El deployment dpl_Gp5xuyMB42J7cXZitzN5ozPpvaVq quedó READY/Production y sirviendo el dominio canónico a23:12:44UTC, fuenteSHA0b77dd621bd6c3bb829fde7293f84c2d659b8c887d793219f13951b3b7ba18dd. Export confirmó CHECKOUTtrue exclusivoProduction y Previewfalse conservado; basegwiz, SSO e indexación intactos. La versión BET compatible con checkoutfalse se conserva para recuperación.

QA final en navegador nuevo anónimo: escritorio1440/móvil390 PASS, copy de cobro activo presente y cerrado ausente, una tarjeta ARS120000, foco visible/target≥44px/sin overflow. Ambos botones navegaron por GET a `/ingresar?next=%2Fprofesionales%2Fsumarse%3Fplan%3DPROFESSIONAL_MONTHLY`, sin completar ni enviar formularios. Seis capturas finales revisadas en `output/playwright/psi-production-public-20260912/`. Resultado privado de navegador a23:17:01UTC: `/tmp/psi-production-public-browser-20260912/result.json`. La guarda bloqueó telemetría y cualquier POST; no se crearon cuentas, checkouts ni pagos de producción.

Resultado: habilitación productiva aprobada y ejecutada, con correcciones, pruebas locales, recorrido sandbox auténtico y smoke productivo sin cargo. No se declara una compra real ni una renovación mensual futura como probadas. Los cambios previos del usuario permanecen preservados; no se hizo commit/push de ese conjunto de trabajo.

### Presentación opcional antes del pago — 12 de septiembre de 2026

Publicado en Production: `dpl_FCc3BnBSNu4DhdJsPrgURmJorJmm`, estado READY y alias `universo-psi-eight.vercel.app` verificado.

El paso de presentación permite guardar textos vacíos o cortos. LinkedIn y sitio web son opcionales: un valor incompleto como «prueba» se descarta, con explicación visible. La documentación puede omitirse. El último paso ofrece «Continuar al pago» sin enviar el perfil a revisión; «Enviar a revisión» conserva su validación. Pagar no publica el perfil.

La migración `20260913002858_allow_incomplete_presentation_in_drafts.sql` se aplicó mediante una transacción dirigida a `gwizdgboqwpzyiaqcxbb`: mínimos de presentación sólo fuera de DRAFT/REJECTED, conservando máximos y NOT NULL. Postflight confirmó diez versiones, ambas restricciones validadas y ningún default nuevo. No se aplicaron las migraciones de catálogo pendientes.

Validación: lint, typecheck, 292 pruebas unitarias y build Node 24 PASS; dos recorridos Playwright locales PASS con presentación vacía y enlaces inválidos. Ambos conservan DRAFT/NOT_VERIFIED y seleccionan un único PENDING_PAYMENT de ARS 120000, sin revisión ni publicación. El entorno local sin Mercado Pago muestra un error honesto al abrir el checkout; estos recorridos no representan un cargo real. El usuario confirmó que el acceso con Google ya avanzó correctamente.

### Corrección del bloqueo por categorías ocultas — 12 de septiembre de 2026

Despliegue `dpl_7QwNwjAvXiNsvk2djvEzPTps6yA6` READY, alias canónico confirmado y entrada al onboarding responde con acceso autenticado.

Verificación: lint/typecheck, 293 pruebas unitarias, build Node 24 y cuatro recorridos Playwright locales PASS. Incluyen presentación vacía sin categorías y sin profesión; conservan un borrador y una selección de plan pendiente, sin cargos.

El primer ajuste de presentación opcional dejó obligatorias profesión y cuatro selecciones de categorías. El guardado del paso 3 validaba esos campos del paso 2 oculto y mostraba un mensaje genérico; los primeros E2E habían completado esas selecciones y no detectaron esa omisión. Ahora el borrador admite todas las clasificaciones vacías, omite inserciones vacías y conserva la validación de IDs cuando existen. No requiere otra migración. Nombre y apellido siguen siendo datos básicos obligatorios; los errores muestran su motivo y llevan al paso correspondiente. Revisión/publicación conserva sus requisitos.

### Backlog

1. Ampliar `/admin` a taxonomías, planes, suscripciones, leads, reseñas, artículos y convenios.
2. Habilitar Resend y Mercado Pago sólo con dominio, precios de planes B2P y credenciales aprobados.
3. Incorporar MFA para roles administrativos y mantener las pruebas E2E autenticadas contra un Supabase aislado.

## Mapa documental

- Producto: [visión](product/vision.md), [modelo de negocio](product/business-model.md), [benchmark](product/redpsi-benchmark.md), [IA](product/information-architecture.md), [búsqueda/ranking y matching dormido](product/matching.md), [marca — registro y antecedentes](product/trademark.md).
- Técnica: [arquitectura](architecture/architecture.md), [datos](architecture/database.md), [seguridad](architecture/security.md).
- Operación: [Vercel y ambientes](deployment/vercel.md).
