# Seguridad y privacidad

## Estado

| Estado | Alcance |
| --- | --- |
| **Baseline implementado** | Grants/RLS, autorización por ownership/rol, CSP con nonce, origen en mutaciones de navegador, Storage privado, evidencia legal append-only, rate limit de leads/analytics, outbox con lease/token y probes remotos del release 2026-08-15. |
| **Implementado en el repositorio** | Elegibilidad repetida sólo para Psicología/Psicopedagogía, opiniones aprobadas ligadas a perfiles visibles y contratos/grants de cliente sin honorarios. |
| **Preparado** | Endpoint de pagos cerrado, adaptador Resend, eventos/auditoría y scripts de calidad. |
| **Pendiente** | Enforcement MFA admin, eventual BFF para sesión HttpOnly, antimalware de documentos, firma/reconciliación Mercado Pago, proveedor de alertas y revisión legal. |

## Modelo

Defensa en profundidad: navegador no confiable → validación/autorización Next.js → grants/RLS PostgreSQL → acceso de Storage → auditoría. Ninguna capa sustituye a otra.

## Clasificación de datos

| Clase | Ejemplos | Regla |
| --- | --- | --- |
| Público | nombre profesional, headline, servicios, ciudad general, rating y opiniones aprobadas | sólo perfil `PUBLISHED`, verificado y de Psicología/Psicopedagogía; nunca honorarios |
| Cuenta | email de acceso, favoritos, preferencias | propietario y soporte justificado |
| Confidencial | lead, teléfono, mensaje, suscripción | mínimo acceso y logs redactados |
| Altamente sensible | credencial, matrícula completa, documento, notas de revisión | Storage privado, URL breve, admin autorizado |

No guardar CUIT, documento, domicilio privado u otra PII si el caso no lo exige. Los textos legales son borradores hasta revisión profesional; no afirmar cumplimiento garantizado.

## Auth y autorización

- Supabase Auth con cookies SSR renovadas por `proxy.ts`, `SameSite=Lax` y `Secure` en producción. Por el cliente browser de `@supabase/ssr`, la cookie de sesión actual es legible por JavaScript (`HttpOnly=false`); no se documenta como cookie HttpOnly.
- No autorizar con `user_metadata`/`raw_user_meta_data`, porque la persona puede editarlo.
- `user_roles` es la fuente autoritativa. Si se usan claims para acelerar lecturas, sólo `app_metadata`; considerar su posible desactualización hasta renovar JWT.
- Para acciones admin críticas, verificar sesión y rol actual en DAL además del claim.
- Diferenciar 401 (sin identidad) y 403 (identidad sin permiso) sin filtrar existencia de recursos.
- Revocar sesiones antes de eliminar/bloquear cuentas sensibles; mantener expiración razonable.
- `secure_password_change = true` está versionado y fue aplicado al proyecto alojado con el resto de la configuración Auth. El smoke real de recuperación/cambio requiere una cuenta autorizada.
- Las aceptaciones se insertan por documento y versión en `private.legal_acceptances` con timestamp del servidor. El alta usa `accept_terms_from_signup_backend`; una sesión desactualizada debe pasar por `accept_current_terms`. No se sobreescribe evidencia histórica.

Cada Server Action y Route Handler es invocable directamente: valida sesión, rol, ownership y transición de estado dentro del entrypoint/caso de uso.

## Supabase Data API

- Privilegios por defecto revocados; `GRANT` explícito y mínimo para `anon`, `authenticated` y `service_role`.
- RLS habilitado en toda tabla expuesta; policy separada por operación cuando mejora claridad.
- `TO authenticated` no basta: siempre existe predicado de ownership o permiso.
- `UPDATE` incluye policy `SELECT`, `USING` y `WITH CHECK`.
- Views expuestas llevan `security_invoker = true` en PostgreSQL 17.
- `SECURITY DEFINER` no se usa para tapar errores. Si es imprescindible: schema privado, `search_path` vacío/fijo, validación de actor y `EXECUTE` mínimo.
- La clave secreta/service role nunca llega al cliente y no se usa como cliente general.

## Storage de credenciales

- Bucket privado exacto `professional-credentials`; nunca `/public` ni bucket público.
- Ruta opaca `<auth.uid()>/...`, sin documento o email en el filename.
- Límite inicial 10 MiB y allowlist PDF/JPEG/PNG; verificar tipo real y considerar escaneo antimalware antes de revisión humana.
- Policies de `storage.objects` restringen upload al namespace propio, lectura al propietario o admin y borrado del propietario sólo mientras el objeto todavía no fue registrado como credencial.
- URLs firmadas se crean en servidor, por pocos minutos y después de reautorizar cada solicitud.
- No registrar la URL firmada. Su expiración no reemplaza eliminación/revocación operativa del objeto.
- La carga actual usa `upsert: false`; un objeto registrado como credencial queda inmutable para su dueño y sólo puede ser leído por propietario/admin conforme a RLS.

## Validación y abuso

- Zod en servidor para body, params, searchParams, headers y payload externo.
- Límites de longitud, formatos, listas permitidas y normalización antes de persistir.
- **Implementado:** rate limit server-side por fingerprint de red y por perfil/email en contacto; rate limit separado para analytics.
- **Pendiente:** límites específicos para login, uploads y webhook cuando se habilite. Matching no tiene UI activa: no crea sesiones, no persiste respuestas ni emite eventos desde el recorrido público.
- **Implementado:** honeypot, idempotencia/deduplicación diaria y límites por red/destinatario para leads. **Pendiente según abuso:** tiempo mínimo y captcha.
- Sanitizar contenido enriquecido con allowlist; React escaping no cubre HTML arbitrario.
- Queries parametrizadas mediante SDK/driver; nunca concatenar filtros u órdenes.
- Cookies Auth con `SameSite=Lax` y `Secure` en producción; hoy `HttpOnly=false` por la arquitectura browser de Supabase SSR. CSP con nonce, ausencia de HTML arbitrario, escaping de React, validación de origen y payloads acotados reducen riesgo XSS/CSRF, pero no vuelven HttpOnly a la cookie. Migrar Auth a un BFF que mantenga tokens sólo en servidor queda **pendiente** si el riesgo/alcance lo exige.

## Integraciones

- **Implementado en código:** Resend recibe destinatarios/templates server-side; los emails de lead omiten mensaje y datos de contacto. La entrega requiere `RESEND_API_KEY` y `EMAIL_FROM`; si faltan, la fila queda reintentable y nunca se marca `SENT`.
- **Pendiente:** verificar dominio/remitente Resend y ejecutar un smoke real. No existe una variable de destinatario global: cada receptor se resuelve desde el lead/usuario al reclamar el outbox.
- **Preparado y cerrado:** Mercado Pago. El Route Handler devuelve 503 y no modifica suscripciones hasta implementar firma sobre payload original, tolerancia temporal, ID único, idempotencia y reconciliación.
- No confiar en monto, plan, estado o `professional_id` enviados por el navegador; reconciliar contra datos internos/proveedor.
- Separar credenciales sandbox y producción. Un fake de tests jamás opera en producción silenciosamente.

## Auditoría y observabilidad

**Implementado:** triggers de auditoría para roles, perfiles, verificaciones, suscripciones, planes, reseñas, artículos y convenios; las RPC críticas agregan decisiones/metadata sin PII sensible.

**Pendiente:** unificar `request_id`, resultado operativo y auditoría de cada apertura/generación de URL firmada. El contrato objetivo cubre:

- aprobación/rechazo/suspensión de profesional;
- apertura/decisión sobre credenciales;
- cambios de rol, plan, suscripción y convenio;
- moderación de reseñas/artículos;
- generación de URL firmada y operaciones administrativas sensibles.

No registrar tokens, passwords, API keys, archivos, mensajes completos, emails/teléfonos completos ni payloads crudos de pago. Acceso y retención de logs se restringen.

## Riesgos prioritarios

| Riesgo | Control principal |
| --- | --- |
| IDOR/BOLA en dashboard/admin | authz por recurso en DAL + RLS + tests negativos |
| Exposición de documentos | bucket privado + policy + signed URL breve |
| Service key filtrada | `server-only`, variables Vercel y escaneo de secretos |
| Spam/abuso de leads | rate limit, validación, dedupe y moderación |
| Falso “Verificado” | estado sólo por workflow admin auditado |
| Webhook falsificado/repetido | endpoint cerrado; firma, timestamp e idempotencia pendientes antes de activarlo |
| XSS en artículos/bios | escaping React + CSP; sanitización allowlist obligatoria si se habilita HTML enriquecido |
| Inferencia clínica | no hay cuestionario; copy no diagnóstico, búsqueda explícita y pruebas de regresión |
| Exposición comercial indebida | view/RPC/DTO/grants sin honorarios; planes B2P separados |

## Gate de producción

| Estado | Control |
| --- | --- |
| **Implementado** | Secrets aislados por ambiente, bucket privado de 10 MiB con MIME allowlist, autorización repetida, CSP/headers remotos, contacto idempotente/rate-limited y suites local/CI completas del vertical. |
| **Preparado** | Lint, typecheck, unitarias, build, Playwright público, fixture SQL, integración RLS, E2E autenticado profesional/admin y advisors están automatizados en el release. |
| **Pendiente** | Ampliar cobertura RLS fuera del vertical, observabilidad central y smoke remoto de URL firmada con una cuenta real autorizada. |
| **Pendiente externo** | MFA administrativa, escaneo antimalware, sandbox Mercado Pago completo, entrega Resend, retención/eliminación de PII y revisión profesional de privacidad/términos/base legal. |

## Guardrails públicos de esta iteración

- La elegibilidad se valida en cada frontera: envío a revisión, publicación admin, view pública y ranking. Ocultar tipos no soportados en el formulario no es el control de seguridad.
- Los grants de cliente y los contratos PostgREST excluyen columnas de honorarios, incluso para un perfil propio; los planes B2P usan contratos separados.
- Sólo opiniones `APPROVED` son legibles públicamente y sólo si el perfil asociado continúa visible.
- `/matching` redirige y no recibe respuestas. Las tablas/RPC dormidas no autorizan a presentar una funcionalidad activa ni a recolectar datos.
- Las pruebas unitarias, DB/PostgREST y Playwright son controles técnicos; no deben confundirse con un test de orientación al usuario.

Referencias: [Data API](https://supabase.com/docs/guides/api/securing-your-api), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) y [Storage privado](https://supabase.com/docs/guides/storage/buckets/fundamentals).
