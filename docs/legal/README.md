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
- Las remisiones al “formulario de Contacto” apuntan a [`/contacto`](../../src/app/(public)/contacto/page.tsx),
  creado junto con esta publicación.
- La remisión de la cláusula 6 de privacidad a “la Cláusula 10 de los Términos y
  Condiciones” enlaza al ancla `#seguridad-informatica` de la cláusula 10
  publicada, que es la que corresponde a esa materia.

## Pendientes

- Completar la identificación legal del responsable (nombre o razón social, CUIT
  y domicilio), que ninguno de los documentos entregados incluye.
- Implementar el vencimiento del día 5, que ahora aparece en la cláusula 9 de los
  términos además de la FAQ: ver [`payment-day-five.md`](payment-day-five.md).
- Habilitar un canal de divulgación de vulnerabilidades: la cláusula 3.n de los
  términos exige comunicarlas por “el canal de seguridad establecido por
  UniversoPsi”. Hoy esa remisión apunta a `/contacto`.
