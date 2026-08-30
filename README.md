# Universo Psi

La red universal de profesionales de salud mental: un marketplace amplio donde una persona encuentra psicólogos/as, psiquiatras, psicopedagogos/as, musicoterapeutas y terapistas ocupacionales. Conecta búsqueda inmediata, filtros, perfiles comparables, consultas, alta profesional, revisión de credenciales, publicación y gestión básica de leads.

El directorio y los perfiles publicados se leen desde Supabase. Cualquier tipo profesional activo del catálogo (`professional_types.is_active`) puede cruzar la frontera pública — a diferencia del vertical de origen (Red Senda), acá no hay un allowlist fijo de dos profesiones: la taxonomía es data-driven y se amplía agregando filas al catálogo, no código. El contrato público no expone honorarios ni filtros de precio; valoraciones y opiniones aprobadas sí forman parte de la confianza. El seed conserva 16 perfiles inequívocamente ficticios con `is_demo = true`; `UNIVERSO_PSI_TEST_MODE=true` habilita el repositorio en memoria únicamente para pruebas automatizadas (nunca en producción: falla al arrancar si se activa con `VERCEL_ENV=production`). Recursos y convenios también se leen desde Supabase (`articles`/`agreements` en estado `PUBLISHED`); todavía no existe una consola admin para crearlos o moderarlos, así que por ahora sólo se cargan por seed o SQL directo.

## Estado actual

| Estado | Alcance |
| --- | --- |
| **Implementado, pendiente de backend propio** | Home corta y `search-first`; directorio Supabase con filtros URL y scroll propio; ranking y perfiles de cualquier tipo profesional activo (Psicología, Psiquiatría, Psicopedagogía, Musicoterapia, Terapia ocupacional); contrato público sin honorarios; perfil y lead idempotente; Auth; aceptación legal append-only; onboarding con documento privado; dashboard de leads; revisión admin de credencial y publicación; outbox con lease/token. Requiere un proyecto Supabase propio (ver [despliegue](docs/deployment/vercel.md)); mientras tanto la producción sirve el catálogo demo en memoria. |
| **Implementado, pendiente de deploy** | `/recursos` y `/convenios` leen artículos y convenios publicados desde Supabase (migración `20260819120000`, incluye el fix de grants de `owns_professional_profile` que esa lectura destapó). |
| **Retirado de la UX** | No hay test/cuestionario de orientación. `/matching` queda como ruta legacy que redirige al directorio; no integra navegación ni sitemap. |
| **Preparado, no activo** | Tablas/RPC históricas de matching; planes comerciales B2P separados en `DRAFT`, selección en `PENDING_PAYMENT`; adaptadores de Resend y Mercado Pago cerrados sin configuración válida. |
| **Pendiente** | Consola admin para artículos/convenios; definir precio y checkout de los planes B2P sin mezclarlo con honorarios profesionales; credenciales y smoke tests de proveedores; primer `SUPERADMIN`. |

Producción: [https://universo-psi.vercel.app](https://universo-psi.vercel.app). Forkeado de Red Senda (commit `4de373c`) el 2026-08-29; ver [SOURCE_STATE.md](https://github.com/Nicosm1988/red_senda/blob/main/SOURCE_STATE.md) en el repo de origen para la auditoría que justificó partir de HEAD. Backend Supabase propio pendiente de aprovisionar (bloqueado por el límite de proyectos free de la cuenta al momento del fork); hasta entonces la producción sirve el catálogo demo en memoria. El alcance del smoke y los límites externos están registrados en [despliegue](docs/deployment/vercel.md).

## Experiencia pública

- La búsqueda aparece en la primera pantalla y conduce al directorio sin pasos intermedios.
- La home evita recorridos largos y repite sólo CTA útiles: buscar, abrir perfil, contactar, ingresar o crear cuenta.
- Los filtros conservan el estado en la URL y tienen scroll propio; el listado permanece legible mientras se refinan resultados.
- Las cards alinean bloques comparables y muestran profesión, experiencia, modalidad, ubicación, disponibilidad y valoración, nunca precio.
- No se usan fotografías generadas por IA. Cualquier recurso visual futuro debe ser propio o licenciado y tener procedencia registrada.

“No hay test” describe la experiencia de orientación: no existe cuestionario para la persona usuaria. Las suites técnicas de Vitest, SQL/PostgREST y Playwright sí existen y son obligatorias para validar cambios.

## Stack

- Node.js 24, Next.js 16, React 19 y TypeScript estricto.
- Tailwind CSS 4 y componentes propios accesibles.
- Supabase Postgres, Auth y Storage con RLS.
- Vercel en región `gru1`, Analytics y Speed Insights activos en el deployment de producción.
- Zod, Vitest y Playwright.

## Puesta en marcha

Requisitos: Node 24, npm y Docker para Supabase local.

```bash
npm ci
cp .env.example .env.local
npx supabase start
npm run db:reset
npm run dev
```

Completá `.env.local` con valores del ambiente local. `SUPABASE_SECRET_KEY`, `RATE_LIMIT_SALT` y `CRON_SECRET` son exclusivamente de servidor; `CRON_SECRET` necesita al menos 32 caracteres cuando se habilita el consumidor programado. Resend y Mercado Pago son opcionales y deben quedar sin configurar hasta contar con credenciales y pruebas válidas.

La aplicación queda disponible en [http://localhost:3000](http://localhost:3000).

El archivo `.mcp.json` deja preparados Next DevTools, Playwright en sesión aislada y el MCP del stack Supabase local. Reiniciá el cliente compatible después de clonar o modificar esa configuración. El MCP de Supabase apunta deliberadamente a `127.0.0.1:54321`: no debe cambiarse al proyecto productivo ni recibir secretos en el repositorio.

## Comandos

```bash
npm run lint       # ESLint sin warnings
npm run typecheck  # TypeScript estricto
npm run test       # pruebas unitarias
npm run test:db:workflow # workflow SQL transaccional; requiere stack local
npm run test:integration # vertical Supabase local; requiere SUPABASE_TEST_*
npm run build      # build de producción
npm run test:e2e   # build + flujos Playwright
npm run test:e2e:auth # vertical UI autenticado; requiere Supabase local
npm run check      # lint + tipos + unitarias + build

npm run db:reset   # reconstruye Supabase local y carga seed
npm run db:push    # aplica migraciones al proyecto enlazado
npm run db:types   # regenera tipos desde Supabase local
```

`UNIVERSO_PSI_TEST_MODE=true` hace que las rutas E2E validen los contratos sin generar leads, eventos ni suscripciones reales. Nunca debe configurarse así en producción.

La integración destructiva `tests/integration/supabase-vertical.test.ts` y el E2E autenticado sólo aceptan una URL Supabase local por HTTP; fallan o se omiten si faltan `SUPABASE_TEST_URL`, `SUPABASE_TEST_PUBLISHABLE_KEY` o `SUPABASE_TEST_SECRET_KEY`. Ejecutalos después de `npm run db:reset`; crean y limpian usuarios, perfiles y objetos exclusivos de prueba y validan RLS, aceptación legal, onboarding, bootstrap admin, credencial privada, publicación, plan, lead idempotente, analítica y reset de moderación. `test:db:workflow` ejecuta además una fixture SQL dentro de una transacción que siempre termina en rollback.

`npm run db:reset` carga el seed demo local. El primer release piloto aplicó ese seed una sola vez y de forma explícita el 2026-08-15 con `npx supabase@2.114.0 db push --linked --include-seed --yes`; no debe repetirse en releases posteriores sin una nueva decisión documentada.

## Límites de confianza

- El navegador usa sólo la publishable key; la secret key queda en módulos `server-only` usados por handlers, actions y workers acotados.
- La sesión Supabase usa cookies `SameSite=Lax` y `Secure` en producción. Son legibles por JavaScript (`HttpOnly=false`) por el cliente browser actual; CSP con nonce y controles XSS son compensatorios, y un BFF HttpOnly queda como evolución de seguridad.
- Leads y analytics entran por APIs con validación, origen y rate limit; los leads además usan idempotencia.
- Cada lead nuevo crea notificaciones transaccionales en outbox; se procesa un lote después de responder y el cron autenticado con `CRON_SECRET` recupera reintentos o leases vencidos.
- La PII de consultas, credenciales, auditoría, pagos y outbox vive en `private`.
- Los documentos se cargan en un bucket privado con rutas por usuario.
- La autorización real se evalúa en Postgres/RLS y en RPCs; nunca desde metadata editable.
- Los honorarios profesionales no forman parte del contrato público, del perfil, de los filtros ni del ranking. Los planes comerciales B2P permanecen separados en `DRAFT`; una elección queda en `PENDING_PAYMENT` y no activa cobro. El webhook de Mercado Pago falla cerrado hasta implementar y verificar firma y reconciliación en sandbox.
- Sin `RESEND_API_KEY` y un `EMAIL_FROM` verificado, los emails quedan reintentables y nunca se marcan falsamente como enviados.

## Documentación

- [Documento maestro](docs/UNIVERSO_PSI_MASTER.md)
- [Arquitectura](docs/architecture/architecture.md)
- [Base de datos](docs/architecture/database.md)
- [Seguridad](docs/architecture/security.md)
- [Producto](docs/product/vision.md)
- [Búsqueda, ranking y matching dormido](docs/product/matching.md)
- [Despliegue](docs/deployment/vercel.md)

Los perfiles y textos demo son ficticios. No representan recomendaciones, diagnósticos ni profesionales reales.
