# Documentos legales de Universo Psi

Los textos publicados en el sitio provienen de los documentos redactados por la
asesoría legal del proyecto. Los archivos originales se archivan en
[`fuentes/`](fuentes) para poder comparar cualquier versión futura contra lo que
efectivamente se publicó.

| Documento | Fuente | Publicado en |
| --- | --- | --- |
| Política de privacidad y tratamiento de datos personales | `fuentes/politica-de-privacidad-2026-09-22.docx` | [`/privacidad`](../../src/app/(public)/privacidad/page.tsx) |
| Preguntas frecuentes | `fuentes/faq.doc` | [`/preguntas-frecuentes`](../../src/app/(public)/preguntas-frecuentes/page.tsx) |
| Banner y panel de cookies | `fuentes/cookies-banner.docx` | [`CookieConsent`](../../src/components/consent/cookie-consent.tsx) |
| Términos y condiciones de uso | `fuentes/terminos-y-condiciones-2026-09-22.docx` | [`/terminos`](../../src/app/(public)/terminos/page.tsx) |

## Titular y responsable

El sitio es de titularidad de **Nicolás San Marco**, CUIT **20-33556056-7**, con
domicilio en **Av. Coronel Díaz 1465, Ciudad Autónoma de Buenos Aires**, quien
además reviste el carácter de responsable de la base de datos a los efectos de la
Ley N° 25.326.

Los documentos entregados por asesoría legal decían «de titularidad de
UniversoPsi», que es una marca y no identifica a la persona obligada. El dato se
publica en el encabezado de ambos documentos y en sus canales de contacto, y vive
en una sola constante: `LEGAL_ENTITY` de [`src/lib/legal.ts`](../../src/lib/legal.ts).

## Versionado y aceptaciones

`private.accept_current_terms` exige que TERMS y PRIVACY compartan la versión
vigente, así que el paquete legal se publica completo y se acepta completo. La
constante `TERMS_VERSION` de [`src/lib/legal.ts`](../../src/lib/legal.ts) debe
coincidir siempre con la fila `is_current` de `private.legal_document_versions`.

Publicar una redacción sustancial nueva implica, en una sola migración:

1. dar de baja el `is_current` anterior (las filas viejas no se borran: sostienen
   las aceptaciones ya registradas por clave foránea);
2. insertar la versión nueva de ambos documentos con su `content_sha256`;
3. actualizar `TERMS_VERSION` en el código.

A partir de ahí, cada persona con sesión iniciada pasa una vez por
`/aceptar-terminos` antes de volver a operar.

## Cambios de adaptación sobre el texto original

- El canal de contacto publicado es `hola@universosenda.com`. Los documentos
  entregados mencionaban `soporte@universopsi.com`, una casilla que no está
  verificada en el proyecto.
- Las remisiones al “formulario de Contacto” se repartieron entre dos canales,
  porque la plataforma ya tenía uno específico para derechos y bajas:
  [`/solicitudes`](../../src/app/(public)/solicitudes/page.tsx) para acceso,
  rectificación, supresión, baja, arrepentimiento y reclamos —entrega constancia
  y deja eventos inmutables—, y
  [`/contacto`](../../src/app/(public)/contacto/page.tsx), creado en esta
  publicación, para reportes de contenido, avisos de seguridad, soporte y
  consultas comerciales.
- La cláusula 9 de los términos no menciona el botón de baja ni el de
  arrepentimiento que exige la Disposición 954/2025 y que la plataforma ya
  implementa. Se agregó una sección de información operativa en `/terminos` que
  los enlaza, sin modificar el texto de la cláusula.
- La política de privacidad conserva la actualización operativa del 15 de
  septiembre de 2026 sobre la medición desactivada, que el texto entregado no
  contempla y que ya se le había comunicado a los usuarios.
- La remisión de la cláusula 6 de privacidad a “la Cláusula 10 de los Términos y
  Condiciones” enlaza al ancla `#seguridad-informatica` de la cláusula 10
  publicada, que es la que corresponde a esa materia.

## Pendientes

- Implementar el vencimiento del día 5, que ahora aparece en la cláusula 9 de los
  términos además de la FAQ: ver [`payment-day-five.md`](payment-day-five.md).
- Habilitar un canal de divulgación de vulnerabilidades: la cláusula 3.n de los
  términos exige comunicarlas por “el canal de seguridad establecido por
  UniversoPsi”. Hoy esa remisión apunta a `/contacto`.
