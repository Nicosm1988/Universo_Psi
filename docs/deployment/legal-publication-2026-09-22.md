# Publicación del paquete legal 2026-09

Fecha: 22/09/2026. Actualizado: 23/09/2026 con los términos y condiciones.
Alcance: publicar en el sitio los términos y condiciones, la política de
privacidad, las preguntas frecuentes y el banner de cookies redactados por la
asesoría legal del proyecto, y habilitar el canal de contacto al que esos textos
remiten.

Los documentos originales quedaron archivados en [`docs/legal/fuentes/`](../legal/fuentes).
Criterios de versionado y adaptaciones aplicadas: [`docs/legal/README.md`](../legal/README.md).

## Qué cambió en el producto

| Área | Cambio |
| --- | --- |
| `/terminos` | Reemplaza el borrador propio por el texto final completo (14 cláusulas). Se retira el cartel de “borrador sujeto a revisión legal”. |
| `/privacidad` | Reemplaza el resumen anterior por el texto final completo, con canales de contacto, órgano de control (AAIP) y sección de cookies. Su remisión a la “Cláusula 10 de los Términos y Condiciones” ahora enlaza al ancla `#seguridad-informatica`. |
| `/preguntas-frecuentes` | Página nueva, dividida por audiencia, con `FAQPage` en JSON-LD y el nonce de la CSP. |
| `/contacto` | Página y endpoint nuevos. El pedido se persiste en `private.support_requests` antes de cualquier aviso por correo. |
| Banner de cookies | Componente nuevo en el layout raíz, con panel de configuración por categoría. Ninguna categoría opcional nace activada. |
| Medición | `trackAnalytics`, Vercel Analytics y Speed Insights sólo se cargan con consentimiento de análisis. Al revocarlo se borran los identificadores de navegador. |
| Checkout con tarjeta | El SDK de Mercado Pago sólo se carga con la categoría de funcionalidades externas habilitada; si falta, el formulario queda deshabilitado con un acceso directo al panel de cookies. |
| `/admin` | Bandeja de mensajes de contacto con estados `NEW`, `IN_PROGRESS`, `RESOLVED` y `SPAM`, y nota interna. |
| Pie de página | Enlaces a preguntas frecuentes y contacto, y botón para reabrir las preferencias de cookies. |

## Migración

`supabase/migrations/20260922234500_add_support_requests_and_publish_2026_09_legal_bundle.sql`

1. Crea `private.support_requests` con RLS forzada y sin políticas: sólo la
   alcanzan `service_role` y las funciones definidas.
2. Agrega `create_support_request_from_backend` (sólo `service_role`) y
   `admin_support_requests` / `admin_resolve_support_request` (rol
   `ADMIN`/`SUPERADMIN`, con aceptación legal vigente).
3. Publica el paquete legal `2026-09` para TERMS y PRIVACY, y da de baja el
   `is_current` de `2026-08` sin borrar sus filas.

## Efecto esperado tras el despliegue

**Cada profesional con sesión iniciada pasa una vez por `/aceptar-terminos`.**
Es el comportamiento previsto del gate: `private.has_current_legal_acceptance()`
exige aceptación de la versión vigente y la política de privacidad cambió de
forma sustancial. Conviene desplegar la migración y el código juntos: si la base
publica `2026-09` y el código todavía envía `2026-08`, la aceptación falla con
`Legal document bundle is not current`.

## Verificación hecha

- `npm run lint`, `npm run typecheck` y `npm run test` (402 pruebas) en verde.
- `npm run build` con variables de entorno de marcador.
- Playwright público completo, `chromium` y `mobile-chromium`: 70 pruebas en
  verde, incluidas las siete nuevas de `tests/e2e/legal-journeys.spec.ts`.
- Revisión visual del banner y del panel a 390 px y del contacto en tema oscuro.

## Pendiente antes de considerar el paquete cerrado

1. **Identificación legal del responsable**: ningún documento entregado incluye
   nombre o razón social, CUIT ni domicilio.
2. **Casilla de contacto**: se publica `hola@universosenda.com`. Hay que
   confirmar que recibe y que alguien responde dentro de los plazos de la
   Ley N° 25.326.
3. **Aviso por correo de los mensajes de contacto**: depende de `RESEND_API_KEY`
   y `EMAIL_FROM`. Sin esas credenciales el mensaje igual se guarda y se atiende
   desde `/admin`, pero nadie recibe la alerta.
4. **Vencimiento del día 5**: la cláusula 9 de los términos y la FAQ establecen
   una regla de cobro y suspensión que el sistema no implementa. Al estar en el
   contrato, corresponde implementarla. Detalle en
   [`docs/legal/payment-day-five.md`](../legal/payment-day-five.md).
5. **Aplicación móvil**: privacidad y FAQ describen una app para Android e iOS
   que todavía no existe.
6. **Canal de divulgación de vulnerabilidades**: la cláusula 3.n exige comunicar
   fallos por “el canal de seguridad establecido por UniversoPsi”. Hoy esa
   remisión apunta a `/contacto`; conviene publicar un canal específico.

## Cierre del despliegue

Desplegado el 23/09/2026. PR #16 integrada por squash; commit `5a66765` en `main`.
Deployment `universo-3yt2hj78f` READY en Production, asociado a
https://universo-psi-eight.vercel.app.

Migración `20260922234500` aplicada en el proyecto productivo `gwizdgboqwpzyiaqcxbb`
**antes** del despliegue del código, y sólo esa: las tres migraciones de taxonomía
del 30/08 siguen pendientes por decisión previa. El orden importa y no es
simétrico. Con la base en `2026-09` y el código viejo, las escrituras
autenticadas que dependen de `has_current_legal_acceptance()` fallan durante la
ventana; al revés, cada profesional habría quedado atrapado en
`/aceptar-terminos` con `Legal document bundle is not current`, sin salida.

CI `35922874408`: `quality` y `supabase-integration` aprobados, más las dos
comprobaciones de Vercel. Dos correcciones surgieron de esa corrida y no de la
verificación local:

- Las pruebas SQL pedían el paquete `2026-08` fijo. Las de TypeScript ahora leen
  `TERMS_VERSION`; las SQL no pueden, así que quedan atadas a la constante por
  convención.
- El `<dialog>` del panel de cookies se montaba siempre. Un diálogo cerrado
  conserva sus etiquetas en el DOM, y «información» dentro de la descripción de
  las cookies de personalización rompía `getByLabel('Formación')` del vertical
  autenticado. Ahora se monta sólo mientras está abierto.

Smoke productivo con navegador: las seis rutas devuelven 200; `/terminos`
publica «Versión septiembre de 2026» sin el cartel de borrador y su cláusula 10
responde al ancla que la privacidad enlaza; el banner ofrece las tres acciones y
«Rechazar» guarda `analytics:false`, oculta el banner y no deja diálogos en el
DOM; el sitemap incluye las rutas nuevas. No se generaron pedidos reales ni
cargos.

El árbol local estaba 9 commits detrás de producción al empezar. Se respaldó en
`respaldo/arbol-local-2026-09-23`, que conserva el trabajo de PayPal sin mergear
—sandbox, aislamiento live y sus dos migraciones—, pendiente de su propio
release con sandbox probado.

## Revisión 2026-09.1 — identificación del titular (23/09/2026)

El titular informó sus datos: **Nicolás San Marco**, CUIT **20-33556056-7**,
domicilio **Av. Coronel Díaz 1465, CABA**. El dígito verificador del CUIT es
consistente con el algoritmo estándar; no se verificó la inscripción ante AFIP.

Se publican en el encabezado de términos y privacidad, en sus canales de contacto
y como responsable de la base de datos. Viven en la constante `LEGAL_ENTITY` de
`src/lib/legal.ts`, no repetidos en cada página.

**Por qué una revisión nueva y no una edición de 2026-09.** Identificar a la parte
contratante no es una corrección de estilo: cambia con quién se contrata. Entre el
despliegue de 2026-09 y esta revisión pudo haber aceptaciones, y no deben quedar
apuntando a un texto distinto del que se aceptó. La migración
`20260923220000` publica `2026-09.1` para TERMS y PRIVACY y conserva las filas
anteriores. Quien ya aceptó 2026-09 vuelve a aceptar una vez.

Las pruebas SQL dejaron de fijar la versión: ahora la leen de
`private.legal_document_versions` con `\gset` antes de cambiar de rol, porque
`authenticated` no alcanza el esquema `private`. Cada revisión del paquete las
rompía; con esto dejan de depender del número.

Queda pendiente confirmar si ese domicilio es el que corresponde publicar como
comercial.
