# Arquitectura de aplicación

## Estado

| Estado | Alcance |
| --- | --- |
| **Implementado y desplegado** | App Router, SSR Auth, home `search-first`, directorio Supabase limitado a Psicología/Psicopedagogía, filtros URL con scroll propio, contratos públicos sin honorarios, APIs, vertical profesional/admin, CSP y outbox. |
| **Retirado de la UX** | Cuestionario de matching; `/matching` queda como redirección legacy al directorio. |
| **Preparado** | Modelo/RPC de matching dormido, esquemas de contenidos/convenios y adaptadores externos cerrados. |
| **Pendiente** | Lectura productiva de contenidos/convenios, pagos B2P y entrega real de email verificados. |

## Topología

```text
Navegador
   │ HTTPS / cookies
   ▼
Next.js 16.3 (Vercel `gru1`, Node.js 24)
   ├─ Server Components: lectura/render/SEO
   ├─ Server Actions: mutaciones internas
   ├─ Route Handlers: callback, APIs, cron y webhooks
   └─ Módulos server-only: authz, repositorios, integraciones y DTOs
          ├─ Supabase Auth
          ├─ PostgreSQL 17 + RLS
          ├─ Storage privado
          ├─ Integración email (Resend)
          └─ Integración pagos (Mercado Pago, preparada)
```

## Límites de módulos

Estructura actual y estable:

```text
src/app/                    rutas, layouts, metadata, actions/handlers finos
src/components/             UI compartida sin reglas de negocio
src/lib/dal/                acceso, sesión, autorización y DTOs; server-only
src/lib/data/               repositorio público Supabase y routing de fallback de tests
src/lib/demo/               fixtures/editorial demo; nunca fallback silencioso productivo
src/lib/supabase/           fábricas browser/server y cliente admin aislado
src/lib/integrations/       puertos/adaptadores de email y pagos; server-only
src/lib/notifications/      consumidor del outbox; server-only
src/lib/validation/         esquemas Zod compartibles sin secretos
src/lib/http/               validación de request/origen sin reglas de dominio
supabase/migrations/        esquema, grants, RLS, índices, triggers y seed contract
```

Las dependencias apuntan hacia adentro: UI → caso de uso/DAL → proveedor. Los Client Components nunca importan un cliente privilegiado. Sólo Route Handlers/Server Actions `server-only` de alcance backend (`leads`, `analytics`, aceptación de alta y outbox) crean el cliente administrativo.

## Render y datos

- Pages/layouts son Server Components por defecto.
- Filtros interactivos, pasos de formularios y controles con estado son islas Client Component pequeñas.
- El panel de filtros conserva query params y tiene un contenedor de scroll propio; la composición visual no cambia la fuente de verdad server-side.
- Datos privados no pasan completos al árbol React; el DAL construye DTOs explícitos.
- Sólo módulos de servidor (`env`, Supabase admin, integraciones y workers) acceden a secretos; ningún Client Component los importa.
- La política de caché es explícita por consulta. Catálogo público admite revalidación; sesión, leads, dashboard y admin no comparten caché entre usuarios.
- La decisión admin de publicación invalida `/profesionales`; las demás estrategias de cache/revalidación se incorporan cuando exista gestión productiva de contenidos.

En runtime normal, perfiles, filtros, taxonomías públicas, reseñas y planes se leen desde Supabase. La frontera pública sólo proyecta Psicología/Psicopedagogía y excluye honorarios; las reseñas aprobadas conservan rating y texto. El repositorio demo se selecciona sólo con `UNIVERSO_PSI_TEST_MODE=true` o con la URL inerte reservada a pruebas. Recursos y convenios son todavía una excepción explícita: sus páginas consumen datos editoriales demo rotulados.

## Lecturas

1. La ruta obtiene params/searchParams no confiables y los valida.
2. El DAL obtiene la sesión actual de forma cacheada por request.
3. Aplica autorización y consulta con cliente ligado al JWT cuando RLS corresponde.
4. Devuelve sólo campos públicos o permitidos en un DTO.
5. El Server Component renderiza y entrega a clientes sólo props serializables mínimas.

No se llama a un Route Handler propio desde un Server Component; se invoca directamente el DAL para evitar un salto HTTP innecesario.

## Mutaciones

- Server Action actual: valida → autentica → autoriza recurso → ejecuta RPC/escritura → audita por trigger/RPC cuando la operación es sensible → revalida.
- Route Handler público: valida método/content-type/origen según el consumidor. Firma e idempotencia son obligatorias para webhooks antes de habilitarlos; el de Mercado Pago permanece cerrado.
- No se confía en que la página contenedora haya autorizado la acción.
- Los retornos son resultados mínimos (`ok`, error de campo/código); nunca filas crudas, tokens ni stack traces.
- Leads usan clave de idempotencia y transiciones de estado válidas. El email usa outbox y lease; el webhook de pagos permanece cerrado hasta implementar firma, idempotencia y reconciliación.

## Auth

Supabase SSR mantiene la sesión en cookies `SameSite=Lax` y `Secure` en producción. El cliente de navegador requiere acceso a la cookie, por lo que hoy no es HttpOnly; CSP con nonce y el resto de controles XSS son compensatorios, y un BFF server-only es una evolución posible. Hay cliente browser para Auth y cliente de servidor por request; `proxy.ts` renueva tokens cuando corresponde mediante validación de claims. El proxy mejora la sesión, pero no sustituye la autorización dentro de DAL/actions.

El ID canónico es `auth.users.id`. `user_roles` es la fuente autoritativa y sólo una operación privilegiada asigna roles; nunca se toman de metadata editable por la persona usuaria.

## Integraciones

Los contratos de dominio no contienen tipos del SDK. La integración de email devuelve estados estables `sent|queued|failed`. Cada lead nuevo encola notificaciones; `after()` intenta un lote de hasta cinco elementos luego de preparar la respuesta, y `/api/internal/notifications/process` reclama hasta 25 como respaldo diario autenticado con `CRON_SECRET`. El claim service-only usa lease de 15 minutos y `lock_token`; completar exige el mismo token. Sin Resend configurado la entrega queda `FAILED` reintentable, nunca `SENT`.

La integración de pagos sólo informa capacidad y conserva la selección en `PENDING_PAYMENT`. Los planes piloto tienen `pricing_status = DRAFT` y precio nulo. El webhook falla cerrado hasta disponer de términos comerciales, credenciales y contrato sandbox para firma/reconciliación. Ninguna integración real se activa por inferencia.

## Búsqueda, ranking y matching dormido

El catálogo normalizado alimenta la búsqueda inmediata, los filtros, SEO y `rank_professionals`. Sólo los tipos activos `psychology_orientation` y `psychopedagogy` pueden cruzar la elegibilidad pública; la misma restricción se repite al enviar el perfil a revisión, al publicar, en `professional_directory` y en el ranking. Los tipos históricos se conservan inactivos para compatibilidad referencial.

El contrato público de directorio, perfil y ranking no incluye honorarios, y la firma de `rank_professionals` ya no acepta `p_budget_max`. Las cards presentan filas comparables alineadas, y el panel de filtros mantiene su propio scroll sin perder el estado URL.

La UI local de cuatro preguntas fue retirada. `/matching` redirige permanentemente a `/profesionales`, no aparece en navegación/sitemap y no crea sesiones ni analytics de respuestas. El modelo versionado y `explain_matching` permanecen dormidos; preservarlos no implica un compromiso de reactivación. Detalles en [búsqueda y ranking](../product/matching.md). El ranking limita la respuesta, valida el tamaño de filtros y desempata por ID; la UI actual todavía no expone paginación por cursor.

## Errores y observabilidad

- Errores esperables usan códigos de dominio; UI muestra mensajes seguros.
- Los logs actuales emiten códigos acotados y IDs técnicos sólo cuando son necesarios; excluyen mensaje de lead, documento, token y email/teléfono completos. Incorporar `request_id` y contexto estructurado uniforme está **pendiente** junto con el proveedor de observabilidad.
- `private.audit_log` responde quién hizo qué; `analytics_events` es otra corriente de datos.
- **Implementado:** eventos de negocio con allowlist, Vercel Analytics/Speed Insights en la app, errores operativos acotados y auditoría DB de mutaciones sensibles.
- **Preparado:** estado/errores del outbox y eventos idempotentes de suscripción.
- **Pendiente:** proveedor central de errores, alertas/SLO, reconciliación de webhooks y dashboards operativos.

## Decisiones de runtime

- Node.js 24 es el runtime único de Vercel; Edge sólo con evidencia de necesidad y compatibilidad.
- Next.js, React, Supabase y SDKs quedan pinneados con lockfile.
- No se incorpora ORM, cola, motor de búsqueda ni IA hasta que el caso lo justifique.
- PostgreSQL resuelve el MVP; búsqueda avanzada puede evolucionar desde FTS/trigramas medidos.

## Verificación por cambio

1. Lint y typecheck.
2. Pruebas unitarias de reglas/validación.
3. `npm run test:integration` contra Supabase local reseteado para el vertical/RLS afectado.
4. Build de producción.
5. Playwright para flujos afectados.
6. Revisión visual, responsive y accesibilidad proporcional al cambio.

Las decisiones de datos y seguridad se detallan en [database.md](database.md) y [security.md](security.md).
