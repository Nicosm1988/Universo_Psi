# Auditoría del menú y recorridos — 13/09/2026

La navegación usaba anclas cuyos destinos desaparecían cuando la cuenta todavía no tenía perfil. Se reemplazó por secciones explícitas con estado vacío y siguiente acción. Cada sección consulta sólo sus datos; un fallo de consulta ya no se presenta como cero resultados. Se conservaron los cambios existentes, los 12 tipos profesionales y la configuración de pagos.

| Flujo | Resultado | Evidencia |
| --- | --- | --- |
| Menú sin perfil, destinos, regreso, recarga, cierre de sesión | PASS | E2E autenticado en 1440 y 390 px; consultas/suscripción accesibles sin perfil |
| Alta, términos, onboarding, credenciales privadas, aprobación y edición | PASS local | 3 escenarios verticales + 4 de presentación opcional |
| Consulta pública y bandeja propia | PASS local real | POST 201, consulta persistida y cambio a Vista conservado tras recargar |
| Registro manual y recuperación de errores | PASS local | 4 escenarios; correo real a Mailpit, fallos de proveedor/transporte inyectados explícitamente |
| Búsqueda, filtros, perfil, contacto, vacíos y 404 | PASS con fixtures | 42 E2E públicos, escritorio/móvil; contacto persistente además probado en vertical local |
| Propiedad y permisos | PASS local | Suite de integración con cuenta ajena, datos privados, Storage y RLS |
| Pagos, webhook, idempotencia | PASS de regresión local | 241 pruebas incluidas en las 338 totales, 2 suites SQL y 7 carreras; sin cargos |

## Cambios de esta auditoría

- `src/components/dashboard/navigation.tsx`, `src/app/dashboard/layout.tsx`: enlaces reales y sección activa accesible.
- `src/app/dashboard/page.tsx`, `actions.ts`: secciones independientes, estado sin perfil, regreso a Consultas después de guardar y errores explícitos.
- `src/app/dashboard/error.tsx`, `loading.tsx`, `src/app/error.tsx`, `src/app/(public)/error.tsx`: carga y recuperación con `retry()` según Next instalado.
- `src/app/profesionales/sumarse/page.tsx`: retorno al espacio profesional.
- `src/app/(auth)/actions.ts`: no simular cierre de sesión si Supabase lo rechaza.
- `tests/e2e/authenticated/dashboard-navigation.spec.ts`, `authenticated-vertical.spec.ts`, `tests/e2e/public-journeys.spec.ts`: regresiones de navegación, persistencia, estado de pago y salidas públicas.
- `docs/product/information-architecture.md`: contrato vigente del menú.

## Verificación

Node 24.15.0. `npm run lint`, `npm run typecheck`, `npm run test`: PASS, 338 pruebas en 22 archivos. `npm run build`: PASS en copia aislada, sin tocar `.next` compartido; una consulta pública tuvo 504 transitorio y el build completó correctamente. No se usaron credenciales de pago en el build local.

13 escenarios E2E autenticados únicos y 42 públicos: PASS. Una suite de integración: PASS. Las repeticiones no se cuentan como escenarios nuevos. El arnés de errores de alta se corrigió para devolver el formato real de Supabase; la repetición usó un salt exclusivo de QA para evitar consumir el límite de pruebas anteriores, sin modificar límites productivos.

Evidencia local: `/tmp/psi-menu-e2e-20260913/`, `/tmp/psi-menu-public-e2e-20260913/tests.log`, `/tmp/psi-menu-release-build-20260913/result.json`, `/tmp/psi-menu-final-{lint,typecheck,test}.log`. Capturas: `output/playwright/dashboard-menu-20260913/`.

## Límites y pendiente externo

El correo productivo requiere verificar un dominio remitente en Resend y configurar EMAIL_FROM. El alta local con Mailpit no acredita entrega externa productiva. La marca de consentimiento Google depende de su configuración/verificación externa. No se hizo una compra real ni se ejecutó una renovación mensual futura. La evidencia sandbox previa y los huecos de automatización de pagos están en `dashboard-payment-audit-2026-09-13.md`. En esta auditoría se corrigió y reejecutó el selector E2E obsoleto señalado allí.

## Despliegue verificado

Vercel `dpl_EH8p5oHFemR4hDYDpuLSJ6LoyzbZ`: READY y alias `universo-psi-eight.vercel.app` coincidente. Fuente SHA256 `b38cf8c37c58a22c180f32af6313cd2340ace60291b0eafc1e47b318ce74cba0`. Variables de entorno, precios y configuración de pagos sin cambios.

Smoke 13/09/2026 03:22 UTC: portada, recursos e ingreso 200; dashboard, ambas secciones y onboarding 307 al ingreso conservando el destino. Todas con CSP. Evidencia `/tmp/psi-menu-production-smoke.json`. El recorrido autenticado se probó en entorno local real; el smoke productivo fue anónimo. No se accedió a sesiones personales.
