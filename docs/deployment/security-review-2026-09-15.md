# Seguridad y preparación del lanzamiento — 15/09/2026

**Resultado: hay defensas reales verificadas, pero no recomiendo ampliar el lanzamiento hasta resolver las prioridades de actualización, operación y privacidad.** Es una auditoría técnica de alcance delimitado, no una certificación ni un pentest exhaustivo. No demuestra ausencia de intrusiones.

## Alcance y evidencia

- Sitio: `https://universo-psi-eight.vercel.app`. Vercel confirmó `dpl_6oFckkpLM2zaEGUG7xLFccP7crc1`, READY, Production. Fuente de referencia: commit `b4f8e65ad182eeb43ba0bb78a56fa7ea25f5d10e`, descargada separadamente de GitHub; el workspace contiene cambios posteriores que no se atribuyen al deployment.
- Supabase: `gwizdgboqwpzyiaqcxbb`, mediante CLI autenticada y transacciones `BEGIN READ ONLY … ROLLBACK`. Se revisaron metadatos, políticas, funciones, permisos y conteos agregados; no se descargaron mensajes, documentos, emails ni contraseñas. El MCP disponible apuntaba a localhost y no se usó como evidencia productiva.
- Evidencias locales: `output/launch-review-20260915/`. No publicar sus metadatos operativos indiscriminadamente. No se modificaron configuración, permisos, base, proveedores ni dependencias.
- Se ejecutaron nuevamente **354 tests de la fuente publicada: PASS**. Las 56 pruebas públicas y 11 autenticadas de la entrega anterior son evidencia histórica, no se presentan como reejecutadas hoy. No hubo cargos, altas de cuentas ni contactos reales.

## Controles comprobados

| Superficie | Evidencia y resultado |
| --- | --- |
| Base y aislamiento | 66 tablas de `public`/`private`, todas con RLS; ninguna con INSERT/UPDATE/DELETE para anon. Ninguna tabla privada con SELECT para anon/authenticated. |
| Columnas sensibles | Verificación adicional productiva: anon no puede leer `user_id` ni honorarios del perfil; authenticated no puede escribir estado de publicación, verificación o versión de términos. Cero tablas privadas con siquiera una columna legible por anon/authenticated (`column-permissions.json`). |
| Vistas públicas | `professional_directory` y `professional_profile_statuses` usan `security_invoker`; esta última también `security_barrier`. |
| Autorización | Rol obtenido de `user_roles`, no de metadata editable. Políticas de propiedad, triggers y RPC revisados para perfiles, leads, suscripciones y credenciales. No se identificó una elevación directa de rol en los caminos revisados. |
| RLS negativa | Actor sintético autenticado sin membresías: 0 cuentas, roles, suscripciones, leads, archivos y perfiles sin publicar; `has_admin_role=false`. Hay 4 cuentas y 3 suscripciones en la base: la prueba de estos dos recursos no es vacía. Leads/archivos tienen 0 filas; su aislamiento está respaldado por políticas y pruebas históricas, no por un cruce productivo entre dos propietarios con datos. |
| Storage | `professional-credentials` privado, máximo 10 MiB, allowlist PDF/JPEG/PNG, namespace propio y URLs firmadas de 300 segundos. |
| HTTP | `/admin` y `/dashboard` anónimos → 307 a ingreso; cron sin autorización → 401; POST de otro origen a leads/analytics/suscripciones → 403; lead inválido → 422; selección de plan anónima → 401. |
| Webhooks | Email y Mercado Pago sin firma → 401. Revisión de MP: firma según su protocolo, cotejo del ID firmado y lectura autenticada del proveedor para acreditar importe, cuenta, ambiente y estado; no se confía en el estado enviado por el navegador. |
| Navegador | HTTPS y cabeceras CSP con nonce/strict-dynamic, frame-ancestors none, nosniff, DENY, política de referencias y permisos limitados confirmadas. Sin unsafe-eval en respuesta productiva. |
| Inyección y redirecciones | Consultas parametrizadas mediante Supabase/RPC; destinos de retorno internos validados; JSON-LD escapa `<`; script inline de tema es constante. No se hallaron eval/subprocesos con input de usuario en runtime revisado. |
| Secretos | Módulos administrativos `server-only`; rastreo de patrones concretos en 231 archivos de la fuente publicada sin coincidencias de claves privadas/tokens seleccionados. Esto no sustituye un análisis de entropía, del historial completo ni de todos los bundles. GitHub informa secret scanning y push protection habilitados. |
| Abuso | Límites por red y destinatario en leads, por red en analítica y controles de registro/login, con falla cerrada de la RPC de rate limit. Límites de cuerpo en esas rutas. No se realizó prueba de carga o DoS. |

## Hallazgos prioritarios

### S01 — Alta: actualizar Next.js/Sharp; aviso upstream crítico

- Evidencia: `package.json:37` fija Next `16.3.1`. `npm audit --omit=dev` sobre el lockfile publicado informa Next crítico y Sharp alto; archivos `npm-audit-production.json` y `npm-audit-local.json`.
- [GHSA-2xp9-vwfh-vxw4](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4): RCE condicionada a procesamiento de AVIF, versión corregida 16.3.3. `next.config.ts:23` permite imágenes del Storage público del proyecto. No se demostró que un atacante pueda alojar un AVIF en un origen admitido: el único bucket observado es privado y no admite AVIF. Tampoco se verificó la implementación interna del optimizador administrado de Vercel. **Paquete afectado confirmado; explotación de este sitio no demostrada.**
- Impacto potencial si se dan las precondiciones: ejecución de código con acceso a secretos/datos del runtime. No se enviaron archivos maliciosos ni se intentó explotación.
- El aviso separado de RCE en Windows no corresponde al entorno Linux/Vercel observado; no se cuenta como un segundo ataque confirmado.
- Acción: actualizar a versión soportada corregida, revisar resolución de Sharp (aviso [GHSA-rgj7-g3m4-5g8c](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c)), lockfile, audit, lint/typecheck/tests/build y Preview antes de publicar. No usar `npm audit fix --force` indiscriminadamente. Desarrollo también presenta avisos de Vitest/mocker y js-yaml; no son endpoints del sitio productivo.

### S02 — Alta operativa: recuperación ante pérdida de datos no acreditada

- Evidencia: `backups.json`: `backups:null`, `physical_backup_data:{}`, `pitr_enabled:false`, `walg_enabled:true`, región `ca-central-1`.
- No equivale a afirmar que el proveedor no guarda ninguna copia; la API consultada **no acredita una copia que el titular pueda restaurar**. No hay evidencia de un ensayo de restauración completo.
- Impacto: borrado accidental, credenciales comprometidas o fallo operativo pueden dejar a la empresa sin recuperación demostrada.
- Acción: definir RPO/RTO, inventariar backup exportable cifrado y aislado, incluir Auth/esquema/datos y archivos de Storage, probar restauración en destino aislado y documentar responsable. Los [backups de DB no incluyen los objetos de Storage](https://supabase.com/docs/guides/platform/backups). No descargar PII para esta auditoría ni ejecutar restore productivo.

### S03 — Alta operativa: falta administrador y enforcement de MFA

- Evidencia actual: conteo agregado de ADMIN/SUPERADMIN = **0**. Esto no significa que no exista dueño en el dashboard de Supabase: son roles distintos.
- `src/app/admin/actions.ts:22` autoriza por rol, sin AAL2. La función productiva `private.has_any_role` tampoco exige segundo factor (`database-functions-review.json`).
- Impacto: no hay operador habilitado en la aplicación para aprobar la camada inicial. Cuando se asigne un administrador, el robo de su sesión permitiría acciones privilegiadas sin un segundo control.
- Acción: identificar al titular operativo, asignación controlada/auditada, enrolar MFA y exigir AAL2 en DAL y operaciones/RLS sensibles. Verificar MFA y recuperación de las cuentas dueñas de GitHub/Vercel/Supabase/Google por separado; no se inspeccionaron sus dispositivos ni códigos de recuperación.

### S04 — Media: contraseñas filtradas admitidas

- Evidencia productiva: asesor `auth_leaked_password_protection` en `database-advisors.json`.
- Impacto: mayor riesgo de reutilización de claves comprometidas y credential stuffing.
- Acción: activar protección si el plan la permite, confirmar políticas y límites Auth reales, y MFA para operadores. Supabase indica disponibilidad de esta función en [Pro y superiores](https://supabase.com/docs/guides/auth/password-security). No se cambió de plan ni se generó un gasto.

### S05 — Media: documentos sin cuarentena/escaneo y sin cuota agregada comprobada

- Evidencia: `src/components/onboarding/credential-uploader.tsx:43–76` valida tamaño/MIME declarados y carga directo al bucket. `src/app/admin/page.tsx:86–90` firma el archivo para revisión. No hay etapa visible de validación de firma binaria ni antimalware; la policy productiva de INSERT comprueba namespace/términos, no cuota acumulada.
- Impacto: un usuario autenticado puede intentar cargar documentos engañosos/maliciosos o muchos archivos de hasta 10 MiB, afectando revisión y costo. No se realizó upload malicioso ni prueba volumétrica.
- Acción: cuarentena privada, verificación real de formato, escaneo, cuota por profesional y limpieza de huérfanos. Mantener propiedad/RLS; usar descarga controlada para revisión. No asumir que la extensión o MIME equivale a archivo seguro.

### S06 — Media: recuperación y gestión de incidentes de cuenta incompletas

- Evidencia: `src/lib/dal/auth.ts:19–35` usa claims válidos y roles actuales; no comprueba explícitamente vigencia de `session_id`. No existe flujo de usuario para listar/revocar dispositivos ni proceso implementado de baja/anonimización en el código publicado.
- Cookie SSR accesible a JavaScript según el diseño del SDK (`@supabase/ssr` establece `httpOnly:false`); necesaria para el cliente browser/upload actual. No es una fuga por sí sola: incrementa consecuencias de un XSS, mitigado parcialmente por CSP.
- Acción: definir revocación/bloqueo y verificación de sesión en operaciones críticas; evaluar BFF sólo con rediseño del upload/browser Auth, no agregar HttpOnly y romper el login. Probar revocación con dos sesiones aisladas.
- Corrección documental: el informe histórico decía que cambiar contraseña no revoca otras sesiones por faltar una llamada explícita. **No se toma como hallazgo confirmado**: [Supabase documenta terminación de sesiones por cambios sensibles](https://supabase.com/docs/guides/auth/sessions). Verificar comportamiento real antes de afirmar lo contrario; JWT ya emitidos pueden conservar validez hasta expirar.

### S07 — Media: rama de producción sin barreras obligatorias

- Evidencia GitHub: main `protected:false`, rulesets `[]`, actualizaciones de seguridad Dependabot desactivadas; secret scanning/push protection activos. CI existente tiene permisos mínimos `contents:read` y acciones fijadas por SHA.
- Impacto: quien tenga permiso de escritura puede introducir una regresión o cambio sensible sin checks obligatorios; hay además desfase entre workspace, Git y schema aplicado.
- Acción: activar reglas compatibles con la operatoria del dueño: PR, CI obligatorio, impedir force-push y borrado, actualizaciones de dependencias y revisión de secretos. No se cambiaron protecciones.

### S08 — Media: privacidad, soporte y términos no preparados para operación real

- Evidencia: `src/app/(public)/terminos/page.tsx:29` declara borrador; sección 6 afirma que no hay precios aprobados ni cobros, incompatible con el plan publicado. `privacidad/page.tsx:21` remite a canales de soporte sin indicar uno concreto ni identificar al responsable; no hay política técnica de retención/borrado ejecutable acreditada.
- Los mensajes libres de consultas pueden contener salud u otra información sensible, aunque el sitio no sea una historia clínica. La DB está en Canadá según API de backups; revisar proveedores/transferencias y acceso con la asesoría responsable.
- Acción: responsable legal y canal efectivo de derechos/incidentes; plazos y procedimiento verificable de acceso, corrección, supresión y retención compatible con obligaciones comerciales; consentimiento y texto que desaconseje incluir historia clínica. Revisión legal conforme a [derechos informados por AAIP](https://www.argentina.gob.ar/aaip/datospersonales/derechos). No se declara infracción ni cumplimiento integral mediante esta auditoría técnica.

### S09 — Baja/Media: hook de correo con límites y validación incompletos

- Evidencia: `src/app/api/auth/hooks/send-email/route.ts:39` usa `request.text()` sin límite propio antes de verificar firma; línea 45 realiza cast TypeScript sin schema runtime; línea 60 interpreta `redirect_to` sin manejo local del error.
- Firma inválida fue rechazada correctamente (401). Un payload malformado auténtico puede provocar fallo de entrega; payloads grandes no firmados consumen recursos hasta el límite de infraestructura, cuya configuración no se inspeccionó.
- Acción: límite pequeño al cuerpo crudo conservando bytes para firma, schema Zod luego de verificar, parse seguro del destino y pruebas de fallos sin enviar correos reales.

### S10 — Baja: permisos innecesarios en función de evento

- Asesores señalan EXECUTE anon/authenticated sobre `public.rls_auto_enable`. Inspección productiva confirma `RETURNS event_trigger` y `search_path=pg_catalog`; es un helper de DDL, no una RPC ordinaria invocable como función normal. **No se demuestra bypass de RLS ni se eleva automáticamente a crítico.**
- Acción: revocar permisos innecesarios de roles web en una migración nueva validada; conservar el event trigger. Referencias del asesor: [0028](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [0029](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

## Pendientes de verificación, no vulnerabilidades demostradas

- No se auditó MFA/IAM de todos los proveedores, WAF/reglas anti-bot, alertas externas ni restauración. `SENTRY_DSN` en el schema no prueba que Sentry esté integrado; no hay SDK/instrumentación de Sentry en la fuente revisada.
- No se hizo pentest destructivo, DoS, phishing, carga de malware, revisión forense de todos los logs, escaneo completo de historia Git ni compra real.
- El límite por IP depende de cabeceras de Vercel. La confianza en `x-forwarded-for` debe comprobarse bajo esa infraestructura; no se reporta un bypass sólo por existir la cabecera.
- Restan recorridos productivos con cuentas controladas para entrega real de correo/recuperación y prueba de derechos; no hace falta que el dueño ejecute toda la suite manualmente.
- Readiness actual: **12 perfiles publicados demo, 0 publicados reales**, 0 administradores de app. No es un catálogo listo para captar pacientes reales.

## Orden recomendado

1. Corregir S01 con release aislado y regresión; resolver backups/restauración y asignación de administrador con MFA.
2. Cerrar canal de soporte/derechos y términos; completar pruebas productivas controladas de Auth/correo y operación.
3. Corregir controles de documentos, hook y protecciones Git; establecer alertas y procedimiento de incidente.
4. Implementar invitaciones gratuitas y probar vencimiento/aislamiento; aprobar los primeros perfiles reales.

Checklist: [x] fuente exacta; [x] dependencias; [x] RLS/grants/buckets; [x] HTTP negativo; [x] pruebas unitarias; [x] backups/config Git leídos; [ ] correcciones; [ ] pruebas privadas productivas; [ ] lanzamiento comercial.
