# Universo Psi — adaptación legal propia

Fecha: 15/09/2026. Estado: propuesta para revisión y cierre; no reemplaza los documentos publicados ni modifica aceptaciones existentes. Responsable legal, CUIT y domicilio pendientes de información del titular. Contacto aprobado: hola@universosenda.com.

## Referencia y criterio

Se revisaron los [términos y privacidad de RedPsi](https://www.redpsi.com.ar/contenido/terminos) como referencia de cobertura: acceso, cuentas, publicaciones, verificación, conducta, propiedad intelectual, planes, continuidad, datos y terceros. No se reproducen sus cláusulas. Universo Psi necesita describir su propio servicio, proveedores, autorizaciones y obligaciones. Las exclusiones amplias de responsabilidad, la aceptación por simple navegación y las autorizaciones promocionales generales no se incorporan como solución automática.

## Hallazgos del producto publicado

Revisión de la fuente publicada de seguridad, disponible en `/tmp/psi-security-release`, y contexto maestro operativo. No se presupone que los cambios locales posteriores estén desplegados.

| Tema | Evidencia y adaptación necesaria |
| --- | --- |
| Responsable | Falta identidad legal en términos y privacidad. SENDA y Universo Psi son marcas/productos; no identifican por sí solos a la persona obligada. |
| Cobros | La sección 6 de términos dice que los planes no tienen precio ni generan cobros. Contradice la habilitación productiva registrada de Mercado Pago. Sustituir al publicar el nuevo paquete. |
| Renovación | `src/lib/integrations/payments.ts` configura recurrencia mensual. Informarla antes de contratar junto con precio final y baja. No confundir cancelar un intento pendiente con cancelar una suscripción activa. |
| Publicación | Revisión de perfil y credenciales es independiente de la acreditación de un pago. No prometer publicación automática al pagar ni consultas garantizadas. |
| Contactos | El contacto puede iniciarse sin cuenta. Diferenciar envío de consulta, recepción, respuesta y reserva: no equivalen. |
| Analítica | `src/lib/analytics/client.ts` usa identificadores en localStorage/sessionStorage, ruta y eventos, incluidos perfiles. No describir esto como anonimato irreversible. Layout incorpora Vercel Analytics y Speed Insights. |
| Datos delicados | Una búsqueda o perfil visitado puede permitir inferencias sobre salud. Minimizar seguimiento y evitar vincularlo a identidad; no basta con avisar que no se envíen diagnósticos. |
| Derechos | La privacidad actual es demasiado breve: completar responsable, destinatarios, derechos, transferencias y conservación verificable. |
| Invitación privada | Tres meses gratuitos son una especificación pendiente de implementación. Acuerdo individual, sin página promocional, distintivo público ni cupón compartible. |
| Versiones | `src/lib/legal.ts` y registros iniciales de documentos usan `2026-08`. Una nueva redacción sustancial requiere versión nueva, archivo de texto anterior y aceptación trazable, no cambiar silenciosamente lo ya aceptado. |

## Normativa consultada y consecuencias prácticas

- [Ley 25.326, texto actualizado](https://www.argentina.gob.ar/normativa/nacional/64790/actualizacion): información previa sobre responsable, finalidad y destinatarios; reglas para datos sensibles; acceso en diez días corridos y rectificación/supresión en cinco hábiles, con las condiciones legales correspondientes. No inventar una política de conservación indefinida.
- [Ley 24.240, texto actualizado](https://www.argentina.gob.ar/normativa/nacional/ley-24240-638/actualizacion): información clara de contratación, protección frente a cláusulas abusivas y mecanismos de terminación. La aplicación a cada contrato profesional exige evaluar su destino; no excluir globalmente a profesionales por su título.
- [Disposición 954/2025](https://www.argentina.gob.ar/normativa/nacional/norma-417152/texto): revisar e implementar accesos visibles a baja y arrepentimiento cuando correspondan. Una mención en términos no reemplaza el mecanismo. No basar la implementación en las resoluciones 316/2018 y 424/2020, derogadas por esta norma.
- [Disposición 3/2026](https://www.argentina.gob.ar/normativa/nacional/disposici%C3%B3n-3-2026-423007/texto): permite comprobaciones razonables de identidad exclusivamente por seguridad al tramitar esas solicitudes; no justifica trabas comerciales.
- [AAIP: transferencias internacionales](https://www.argentina.gob.ar/transferencias-internacionales): inventariar destinos y subencargados y documentar la garantía aplicable. Contratar un proveedor conocido o elegir una región no demuestra por sí solo cumplimiento.
- [AAIP: derechos](https://www.argentina.gob.ar/aaip/datospersonales/derechos): ofrecer un canal efectivo de ejercicio y reclamo ante la autoridad.

## Cierre necesario antes de publicar la versión definitiva

1. Completar titular, CUIT, domicilio y responsable de responder hola@universosenda.com.
2. Confirmar condiciones comerciales: prestaciones por plan, facturación/impuestos, momento de activación, baja de renovación, período ya abonado y tratamiento de reintegros. No inventar una regla de “sin devolución”.
3. Probar recepción y resolución de baja/arrepentimiento, incluida conciliación con Mercado Pago, sin cargos reales durante pruebas no autorizadas. La escritura de una cláusula no implementa este flujo.
4. Inventariar proveedores realmente activos, países/subencargados, contratos y plazos de eliminación por categoría, incluidos respaldos. Revisar registro de bases y las obligaciones concretas del responsable.
5. Definir y aplicar tratamiento de menores y representantes. La propuesta de cuentas propias para mayores de 18 años no está acreditada como control actual.
6. Resolver medición opcional y controles de preferencias antes de prometer que el visitante puede desactivarla desde la web.
7. Revisar jurídicamente los borradores adjuntos, archivar versiones y coordinar frontend, base de datos y pruebas de consentimiento. No cambiar sólo la constante ni reescribir migraciones ya aplicadas.

No se cambió producción en esta revisión documental. El documento complementario contiene textos originales concretos para revisar, con los pendientes señalados fuera del contenido propuesto.
