# Correcciones de seguridad — 15/09/2026

Base publicada: `b4f8e65ad182eeb43ba0bb78a56fa7ea25f5d10e`. Trabajo aislado en `/tmp/psi-security-release`; el workspace original conserva cambios ajenos no publicados. No se modifican precios, credenciales de pago ni proveedores. El análisis no certifica ausencia total de vulnerabilidades.

## Cambios

| Hallazgo | Corrección | Límite |
| --- | --- | --- |
| Dependencias vulnerables | Next y eslint-config-next 16.3.3, Vitest 4.1.11; lock actualizado para sharp/js-yaml | `npm audit` sólo conoce avisos publicados |
| Administración sin segundo factor | Pantalla de enrolamiento/verificación TOTP; acciones y páginas exigen RPC autorizada | Cada titular debe enrolar su propio factor |
| JWT administrativo todavía válido tras revocación | `private.has_any_role` exige AAL2 y `session_id` vigente en `auth.sessions` para ADMIN/SUPERADMIN | No se afirma revocación inmediata de todos los accesos ordinarios |
| Documentos | 4 MiB por archivo, 20 objetos por cuenta; política RLS con bloqueo por usuario; descarga por UUID con autorización y firmas de formato | Firma PDF/PNG/JPEG no es antivirus ni saneamiento PDF; no hay motor antimalware configurado |
| Exposición accidental de documentos | Descarga adjunta, no-store, nosniff y CSP restrictiva; no se publica un enlace firmado en la página administrativa | Titulares/admins autorizados conservan acceso por Storage conforme RLS |
| Endpoint de email | Límite de cuerpo real 64 KiB, firma sobre texto original, Zod, acciones soportadas, redirect canónico, sin log del payload inválido | No acredita entrega externa ni nuevos flujos de cambio de email/reauth |
| Función de plataforma expuesta | Revocado EXECUTE público de `rls_auto_enable`, cuando existe | Se conserva su event trigger |
| Repositorio sin barreras | Main con PR, quality + supabase-integration, checks estrictos, sin force-push/borrado, aplica a admins; alertas y parches automáticos habilitados | Dependabot no sustituye revisión humana ni pruebas |
| Datos incompletos por fallo de lectura | Alta detiene edición si falla recuperar catálogos/perfil/relaciones; admin no confunde error de credenciales con cola vacía | Se conserva el estado previo |
| Carga trabada o duplicada | Guardia síncrona y try/finally; formato/tamaño y mensaje recuperable | Un resultado de red incierto debe revisarse antes de duplicar envío |
| Privacidad/contacto | Canal confirmado `hola@universosenda.com`; aviso de no incluir historia clínica en la consulta; error de límite explícito | No prueba atención del buzón ni remitente Resend verificado |

## Pruebas

- Lint y TypeScript aprobados; 367 pruebas unitarias aprobadas.
- Integración Supabase local real aprobada: onboarding, credenciales, aprobación, publicación, suscripción, leads y RLS; agrega denegación AAL1 y aceptación AAL2 con TOTP real.
- SQL MFA transaccional: administrador AAL1 denegado; AAL2/sesión vigente permitido; sesión borrada denegada con el mismo JWT; rol USER preservado.
- SQL Storage transaccional: objeto 20 permitido, 21 denegado, directorio ajeno denegado. No se declara prueba de estrés distribuida.
- Workflow de publicación SQL aprobado con fixture administrativo AAL2.
- Build de producción Node24/Turbopack aprobado en Docker aislado. El primer intento dentro del sandbox no completó; se detuvo sólo ese proceso antes de correr Docker.
- Navegador autenticado: se detectó y corrigió la normalización del QR SVG entregado por Auth. Un reintento posterior chocó con el límite de login local; se usó un salt exclusivo de la corrida QA sin alterar límites productivos. Resultado final: 11 E2E autenticados aprobados, incluidos MFA y descarga adjunta; 2 pruebas de inyección de fallos omitidas por requerir interceptor externo. Alta/confirmación usa Mailpit local, no correo externo.
- Regresión pública final: 56 E2E aprobados en escritorio y móvil sobre build de producción local.
- Navegador productivo: 16 destinos anónimos revisados, sin enviar datos ni cargos. Evidencia local `output/security-review/public-routes.txt`.

## Pendientes que no deben darse por resueltos

1. **Recuperación de datos:** la consulta anterior de backups no acreditó una copia restaurable/PITR. Antes de captación amplia, definir almacenamiento cifrado fuera del proveedor, clave de recuperación bajo control del responsable, retención y realizar restauración aislada de DB más archivos. No se exportó PII a una ubicación improvisada.
2. **Contraseñas filtradas:** el advisor informó protección deshabilitada. Confirmar elegibilidad del plan/configuración; no se compra una ampliación de plan sin autorización.
3. **MFA de plataformas:** revisar individualmente GitHub, Vercel, Supabase, Google Cloud y correo. MFA dentro de la web no acredita MFA de esas consolas.
4. **Antimalware:** integrar cuarentena/escaneo real antes de ampliar recepción de documentos. Las comprobaciones implementadas no detectan un PDF malicioso con encabezado válido.
5. **Legales y operación:** responsable legal, condiciones comerciales actuales, retención por categoría, proceso de baja, atención de soporte, monitoreo con alertas atendidas y correo productivo verificado.
6. **Promoción privada:** especificación separada. No se creó una landing ni se concedieron tres meses simulando un pago; requiere contrato de acceso/vencimiento y exclusión mutua con checkout.

## Despliegue y recuperación

Aplicar sólo `20260915233057_security_admin_mfa.sql` y `20260915233425_security_credential_download.sql`, con transacción y registro de historia. No ejecutar un push indiscriminado de migraciones históricas de catálogo pendientes. No hay documentos productivos existentes en el preflight.

Después del deployment, asignar ADMIN a las dos cuentas confirmadas que indicó el usuario; no publicar sus emails personales en el repositorio ni dar SUPERADMIN innecesariamente. El grant queda auditado. Los administradores entran por Dashboard → Administrar perfiles → Seguridad; deben conservar su clave TOTP en un lugar seguro.

Rollback de aplicación: deployment anterior `dpl_6oFckkpLM2zaEGUG7xLFccP7crc1`. Mantener las restricciones nuevas de DB durante una recuperación: volver al frontend viejo no debe reabrir privilegios AAL1. Una reversión de DB requiere migración compensatoria revisada, nunca editar la aplicada. No reenviar documentos ni resetear contraseñas para resolver un fallo de despliegue.

## Fuentes técnicas

- [Next.js advisory GHSA-2xp9-vwfh-vxw4](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4).
- [Supabase TOTP MFA](https://supabase.com/docs/guides/auth/auth-mfa/totp).
- [Supabase sesiones y revocación](https://supabase.com/docs/guides/auth/sessions).
- Documentación de Next instalada: `node_modules/next/dist/docs/01-app/02-guides/data-security.md`.


## Cierre productivo — 15/09/2026

- PR [#7](https://github.com/Nicosm1988/Universo_Psi/pull/7) integrada con quality y supabase-integration aprobados. Commit de main `fcb1a2d48b04b40c808fd8b2e852a187edb38f0b`; árbol equivalente al checkout probado.
- Deployment `dpl_5JJMN318WtLoQHgV1Nub59hGTFcp`, READY Production, `https://universo-e4r3w9t1j-nmarcosan-2648s-projects.vercel.app`; alias canónico `https://universo-psi-eight.vercel.app` verificado.
- Ambas migraciones nuevas aplicadas y registradas en una transacción. Postflight: bucket privado, límite 4194304 bytes, anónimo sin EXECUTE de RPC administrativas/descarga/función de plataforma.
- Dos cuentas existentes, verificadas con Google y expresamente elegidas por el dueño, recibieron ADMIN, sin SUPERADMIN. Asignación auditada. Prueba productiva de solo lectura: ambas denegadas con AAL1. El enrolamiento personal de TOTP queda a cargo de cada titular; no se generaron factores ni se accedió a sus sesiones personales.
- Advisor productivo posterior: un aviso pendiente, `auth_leaked_password_protection`. No se declara seguridad completa.
- Smoke productivo: portada/directorio/privacidad 200 con soporte visible; Seguridad/Admin/descarga privada redirigen al ingreso para anónimos. Detalles de profesionales, recursos y convenios y regreso al listado comprobados a 1440 y 390 px.
- Evidencia de la sesión: `output/security-hardening-20260915/`. Fuente de release conservada en el repositorio remoto y checkout aislado; el código local previo del workspace original no se mezcló con sus cambios ajenos pendientes.

GitHub confirmó cero alertas Dependabot abiertas después de integrar los parches. Esto no equivale a ausencia de vulnerabilidades desconocidas.
