# Despliegue en Vercel

## Estado

- **Release verificado el 2026-08-15:** cuatro migraciones alineadas en Supabase y commit `de0fbef` desplegado en Vercel; home `search-first`, retiro del cuestionario, catálogo público limitado a Psicología/Psicopedagogía y eliminación de honorarios de los contratos públicos comprobados en producción.
- **Pendiente externo:** primer `SUPERADMIN`, entrega Resend y contrato/sandbox Mercado Pago. El smoke autenticado remoto se completa después de crear la cuenta real autorizada.

## Destino

- Repositorio: [Nicosm1988/universo_psi](https://github.com/Nicosm1988/universo_psi).
- Proyecto activo: [universo-psi](https://vercel.com/nmarcosan-2648s-projects/universo-psi) en el equipo del dueño, ligado por `.vercel/project.json`.
- Producción: branch `main` conectada al proyecto existente.
- URL canónica activa: [https://universo-psi.vercel.app](https://universo-psi.vercel.app); `supabase/config.toml` usa esa Site URL y permite exactamente su `/auth/callback`, además de callbacks locales. Los previews no usan Auth productivo: tienen variables Supabase aisladas y no figuran en el allowlist del proyecto productivo.
- Runtime confirmado: Node.js `24.x`.
- Región de Functions: `gru1` (São Paulo), cercana al mercado inicial y coherente con `vercel.json`.
- Framework/root confirmado: `nextjs`, root del repositorio, install `npm ci`, build `npm run build`.

Un vínculo local no demuestra que Git Integration, dominio, variables o último deployment estén correctos; se validan en Vercel antes de declarar producción.

## Ambientes

| Ambiente | Datos/credenciales | Uso |
| --- | --- | --- |
| Local | Supabase local o proyecto de desarrollo, fakes/sandbox | desarrollo y tests |
| Preview | Supabase no productivo o valores inertes, sin secret de producción | PR, QA y Playwright sin mutaciones privilegiadas |
| Production | proyecto y credenciales exclusivos de producción | tráfico real desde `main` |

No usar el mismo secreto de pago, DB privilegiada o webhook en Preview y Production. **Implementado en Vercel:** Preview usa valores inertes y no comparte la secret key productiva; volver a comprobarlo en cada alta/rotación. Para el piloto inicial se decidió aplicar `seed.sql` una vez en Production: sus 16 perfiles y las filas demo de reseñas, artículos y convenios llevan `is_demo = true`. Las páginas de recursos/convenios todavía usan fixtures editoriales demo, también rotuladas. Releases posteriores no deben resembrar sin una decisión explícita.

## Variables

| Variable | Exposición | Requerida | Responsable/uso |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | navegador | sí | URL canónica exacta por ambiente |
| `NEXT_PUBLIC_SUPABASE_URL` | navegador | sí | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | navegador | sí | clave publicable; RLS sigue siendo obligatoria |
| `SUPABASE_SECRET_KEY` | servidor | sí | operaciones backend privilegiadas; alcance mínimo |
| `RATE_LIMIT_SALT` | servidor | sí | sal aleatoria para fingerprints antiabuso |
| `RESEND_API_KEY` | servidor | para envío real | Resend |
| `EMAIL_FROM` | servidor | para envío real | remitente sobre dominio verificado |
| `CRON_SECRET` | servidor | sí en Production | 32+ caracteres aleatorios; autentica `GET /api/internal/notifications/process` |
| `MERCADOPAGO_ACCESS_TOKEN` | servidor | para pagos reales | sandbox o producción, nunca mezclados |
| `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` | navegador | si el checkout cliente la usa | clave pública de la app MP |
| `MERCADOPAGO_WEBHOOK_SECRET` | servidor | para webhook real | verificación de firma |
| `UNIVERSO_PSI_TEST_MODE` | servidor | sólo test | guard reservado para adaptadores; debe tener consumidor explícito y ser `false` en producción |

`NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` y `SENTRY_DSN` están validadas como variables opcionales, pero sus adaptadores están **pendientes**: deben permanecer vacías hasta implementar y probar el proveedor. Documentar cualquier alta adicional en esta tabla y en `.env.example`.

Reglas:

- No commitear `.env*` salvo `.env.example` sin valores.
- Validar env de servidor al arrancar/ejecutar el caso de uso; no importar secretos desde Client Components.
- `NEXT_PUBLIC_*` es público y se congela durante el build.
- Rotar cualquier secreto que haya aparecido en Git, logs o una preview no confiable.

## Fronteras externas

| Sistema | Debe aportar/configurar el dueño | Se puede preparar sin ello |
| --- | --- | --- |
| Supabase | URL, publishable/secret keys, Auth URLs/providers, proyecto prod | migraciones locales, RLS, clientes y tests |
| Resend | API key, dominio/DNS y remitente verificado | puerto, adaptador, templates y fake |
| Mercado Pago | app, credenciales sandbox/prod, webhook y definición comercial/fiscal | puerto, adaptador, estados, idempotencia y tests fixture |
| Vercel | acceso al proyecto, variables, dominio/DNS, Git Integration | build local y documentación |
| GitHub | permisos y protección de `main` | branch/commits locales |

No inventar credenciales. Si faltan, el resto despliega sin habilitar la función externa y presenta un estado claro; nunca un éxito falso.

## Outbox y cron

- **Implementado:** al crear un lead nuevo, `after()` intenta procesar hasta cinco notificaciones sin demorar la respuesta.
- **Implementado:** `vercel.json` agenda `GET /api/internal/notifications/process` todos los días a las 12:17 UTC; Vercel debe enviar `Authorization: Bearer <CRON_SECRET>`.
- **Implementado:** el worker reclama con lease/`lock_token`, reintenta leases de más de 15 minutos y sólo completa con el token vigente.
- **Implementado en configuración:** `CRON_SECRET` está aislado en Production; no se expone su valor ni se replica en Preview.
- **Verificado en producción:** sin Bearer responde 401 y con el `CRON_SECRET` vigente respondió 200, con lote vacío sano. Sin credenciales de email, cualquier entrega real queda fallida/reintentable hasta habilitar Resend.

## Flujo de release

1. Confirmar worktree, remote y protección de `main`; no force-push.
2. Revisar migraciones, grants/RLS y compatibilidad hacia atrás.
3. En Preview: `npm ci`, lint, typecheck, unit/integration, build y Playwright crítico.
4. Para la migración contractiva `20260815233718`, desplegar primero la aplicación compatible: ya ignora honorarios y aplica el allowlist Psicología/Psicopedagogía incluso contra el esquema anterior. Esperar `READY` y comprobar el directorio antes de cambiar la base.
5. Aplicar luego `npx supabase@2.114.0 db push --linked --yes`, **sin seed**, y verificar inmediatamente vista, firma RPC, grants, perfiles permitidos y denegaciones. El `--include-seed` fue exclusivo del primer release piloto y no se repite.
6. Aplicar la configuración Auth versionada con `npx supabase@2.114.0 config push --yes` sólo cuando ese archivo haya cambiado; verificar Site URL, redirect allowlist, confirmación de email, contraseña mínima/requisitos y `secure_password_change = true` en el proyecto alojado.
7. Verificar variables, Node 24, URL de Auth, cron y dominio por ambiente. El webhook Mercado Pago debe seguir cerrado mientras no exista sandbox validado.
8. Ejecutar smoke tests y revisar logs/Analytics sin PII. Si falla la contracción de base, corregir hacia adelante; no promover una versión anterior de la app que dependa del contrato retirado.

## Primer SUPERADMIN

Estado: **Pendiente de una cuenta real confirmada**. La función de bootstrap está implementada; no se inventa un usuario para completar este paso.

El trigger de alta asigna únicamente `USER`. Para romper el círculo inicial sin abrir gestión de roles al cliente:

1. El dueño crea y confirma su cuenta real en `/registro`.
2. Se obtiene su UUID desde Supabase Auth, sin copiar tokens ni contraseñas.
3. Una persona operadora autorizada ejecuta una sola vez, desde SQL Editor/rol de mantenimiento: `select public.bootstrap_first_superadmin_from_backend('<uuid>'::uuid);`.
4. Se verifica el rol `SUPERADMIN` y el evento `FIRST_SUPERADMIN_BOOTSTRAPPED` en `private.audit_log`.

La función toma un advisory lock, rechaza usuarios demo y falla si ya existe un `SUPERADMIN`; no es un endpoint público ni se reutiliza para altas posteriores.

## Comandos de calidad

Usar scripts del repositorio, sin adivinar comandos de CLI:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run test:db:workflow
npm run test:integration
npm run build
npm run test:e2e
npm run test:e2e:auth
```

`test:integration` y `test:e2e:auth` requieren las tres variables `SUPABASE_TEST_*` del stack local y rechazan cualquier URL que no sea `http://localhost`/`127.0.0.1`/`::1`; ejecutar después de `npm run db:reset`. El E2E autenticado fuerza `UNIVERSO_PSI_TEST_MODE=false`, usa usuarios exclusivos y limpia Auth, perfiles y Storage al finalizar. Para Supabase consultar `supabase --help`; el mínimo esperado es reset local, fixture SQL, integración de políticas, vertical UI y advisors antes de producción.

## Smoke tests de producción

Estado actual: **smoke público y de contrato completado el 2026-08-15** para `de0fbef`. Se verificaron la home compacta, búsqueda en primera pantalla, directorio de tres perfiles compatibles, filtro Psicopedagogía, perfiles/contacto, ausencia de fotos y honorarios, redirect de `/matching`, 404 de tipos históricos y móvil 390×844. Las cuatro migraciones quedaron alineadas; `professional_directory` no tiene campos de honorarios, la firma antigua de ranking no existe, los grants de precios están revocados y DB lint/advisors no informan problemas.

También se verificaron el directorio/ranking remoto de Supabase y las denegaciones anónimas de `leads`, `analytics_events` y `private`. Un lead sintético same-origin se creó y reintentó con la misma clave: hubo una sola fila; luego se eliminaron de forma dirigida el lead y sus efectos de prueba. El cron respondió 401 sin secreto y 200 con Bearer válido. El CI de GitHub ejecutó calidad, fixture SQL, integración Supabase y E2E autenticado con resultado verde.

Los siguientes checks requieren insumos externos y permanecen pendientes: sesión real profesional/admin y URL firmada remota; entrega desde un dominio Resend verificado; firma/replay/reconciliación Mercado Pago en sandbox.

El release actual cumplió estos checks; deben repetirse en cambios futuros:

- Home: búsqueda y selector “Profesional orientador” visibles en la primera pantalla; sin cuestionario, CTA “No sé qué ayuda necesito” ni fotografías generadas por IA.
- Directorio: sólo Psicología/Psicopedagogía, filtros persistidos en URL y panel con scroll propio en desktop/móvil.
- Cards: bloques comparables alineados; rating/opiniones presentes y ningún honorario.
- Contrato remoto: `professional_directory`, ranking, perfil propio/admin y grants de servicios no exponen campos de honorarios.
- Publicación: un perfil con tipo no soportado no puede enviarse a revisión ni publicarse; los tipos históricos permanecen inactivos.
- `/matching`: redirección permanente a `/profesionales`, ausencia en header y sitemap.
- Conversión: home → directorio → filtro → perfil → ingreso/registro/contacto y confirmación.

El smoke integral conserva además:

- Login profesional → dashboard; un usuario no puede acceder a otro perfil/lead.
- Admin autorizado → revisión/aprobación; rol común recibe 403.
- Credencial privada sólo abre por URL firmada autorizada y breve.
- Selección de plan muestra `PENDING_PAYMENT` y no cobra. Cuando exista sandbox, validar firma, replay y que un duplicado no duplique suscripción antes de habilitar el webhook.
- Metadata, canonical, sitemap, robots, responsive y errores básicos.

## Rollback

- Aplicación: promover el último deployment sano de Vercel o revertir el commit con un nuevo commit.
- Base: preferir migración correctiva forward; no borrar/revertir columnas con datos durante un rollback urgente.
- Integración: deshabilitar el adapter/feature flag y conservar eventos para reconciliación.
- Después: documentar incidente, alcance, recuperación y acción preventiva sin copiar PII a tickets.

Referencia de runtime: [versiones Node.js soportadas por Vercel](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).
