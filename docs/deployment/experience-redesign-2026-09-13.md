# Rediseño de experiencia — 13 de septiembre de 2026

## Alcance y base

Fuente estable reconstruida de Vercel `dpl_8AMUFg9RCkvwgZ9VWWMHKF7suyYj`: 223 archivos con SHA-1 coincidente. Repositorio `Nicosm1988/Universo_Psi`, proyecto `universo-psi`, Node 24.x y rama productiva `main`. El dueño autorizó registrar esa base en un commit separado, incluida su documentación en el repositorio público. El rediseño excluye los cambios locales posteriores de pagos y PayPal; no modifica DB, precios, planes, credenciales ni proveedores.

## Cambios y criterios

| Recorrido | Fricción | Cambio | Verificación |
| --- | --- | --- | --- |
| Navegación | Accesos repetidos y ubicación poco clara | Buscar profesional / Soy profesional; sección activa; menú con Escape | Escritorio, móvil y teclado |
| Directorio | Selecciones provocaban navegación inmediata | Aplicación conjunta; filtros visibles y limpieza | URL, filtros múltiples y atrás |
| Perfil | Volver descartaba filtros | Destino validado y ancla del resultado en URL | Abrir, recargar y regresar |
| Contacto | Formulario antes de la presentación | Identidad y enfoque antes del formulario; envío distinto de turno | Recorrido completo y red fallida |
| Confianza | Verificación pendiente inferida | Estado descriptivo sólo a partir de verificación acreditada | Tarjetas y perfil |
| Panel | Acciones principales dispersas | Editar, perfil público y suscripción junto al estado | Publicación, edición y panel autenticado |

Se reutilizan los tokens y componentes editoriales existentes. Referencia: [WCAG 2.2 oficial](https://www.w3.org/TR/WCAG22/), teclado, foco, mensajes accesibles y reflow; targets del proyecto 44 px. No se declara conformidad integral ni pruebas con personas reales.

## Evidencia técnica

- Node 24 Docker: build aprobado; lint y typecheck aprobados; 354 pruebas unitarias aprobadas en la fuente de release.
- Primera pasada pública detectó desborde del header por clases de display incompatibles. Corregido: 56 E2E públicos aprobados en escritorio/móvil, incluyendo 320, 390, 768 y 1440 px.
- Supabase local aislado: 11 E2E autenticados aprobados. Alta con Mailpit, validación, términos, borrador, credenciales, publicación administrativa, edición, consulta local y estados de suscripción sin cargos. Dos escenarios de inyección de fallos del proveedor omitidos: requieren interceptor específico.
- El workspace inicial tuvo cinco fallos autenticados causados por cambios locales de pagos posteriores al deployment estable. Esos archivos quedan fuera del release; la suite de la fuente estable más UX pasa.
- Capturas iniciales y finales: `output/playwright/redesign-20260913/`. Las alertas de Analytics/Speed Insights 404 en localhost corresponden a endpoints de Vercel no servidos localmente.
- Medición exploratoria inicial del directorio productivo, 1280 px, sin throttling: TTFB 30 ms, DOMContentLoaded 1813 ms, load 1815 ms, 35 recursos. No alcanza para afirmar una mejora de rendimiento o conversión.

## Continuidad

- [x] Fuente y cambios ajenos aislados; validación pública y autenticada local.
- [ ] Confirmar última pasada pública después del ajuste final de selección visible.
- [ ] Preview aislado, integración y producción; registrar evidencia al terminar.

Preview existente: Supabase `gzsbndvaxdyuyhjidfqq`, checkout false, distinto de producción. No se transfieren secretos entre ambientes.

Rollback: `vercel rollback https://universo-dqtwaovwt-nmarcosan-2648s-projects.vercel.app`; esperar READY y verificar alias `universo-psi-eight.vercel.app`, portada, directorio y acceso. Sin rollback de DB. El estado estable está confirmado al comienzo, no representa una ejecución de rollback.
