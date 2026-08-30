# Universo Psi — contexto maestro

Actualizado: 2026-08-19. Este documento registra decisiones y contratos del producto; no prueba por sí solo que una funcionalidad esté implementada. El estado real se confirma con código, migraciones y tests.

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

- **Implementado — públicas:** `/`, `/profesionales`, `/profesionales/[slug]`, `/para-profesionales`, `/planes`, `/convenios`, `/convenios/[slug]`, `/recursos`, `/recursos/[slug]`, `/terminos` y `/privacidad`.
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
- Mercado Pago: `MERCADOPAGO_ACCESS_TOKEN`, `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`, `MERCADOPAGO_WEBHOOK_SECRET`.
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

1. Ampliar `/admin` a taxonomías, planes, suscripciones, leads, reseñas, artículos y convenios.
2. Habilitar Resend y Mercado Pago sólo con dominio, precios de planes B2P y credenciales aprobados.
3. Incorporar MFA para roles administrativos y mantener las pruebas E2E autenticadas contra un Supabase aislado.

## Mapa documental

- Producto: [visión](product/vision.md), [modelo de negocio](product/business-model.md), [benchmark](product/redpsi-benchmark.md), [IA](product/information-architecture.md), [búsqueda/ranking y matching dormido](product/matching.md).
- Técnica: [arquitectura](architecture/architecture.md), [datos](architecture/database.md), [seguridad](architecture/security.md).
- Operación: [Vercel y ambientes](deployment/vercel.md).
