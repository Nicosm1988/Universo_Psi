# Revisión crítica de recorridos — Universo Psi

## Diagnóstico

La interfaz permite explorar y completar el alta. La mayor debilidad para abrir una captación amplia es la distancia entre lo que parece ofrecer y lo que efectivamente se puede completar: catálogo público de demostración, cuenta sin perfil orientada siempre al profesional, revisión sin devolución visible suficiente, condiciones comerciales contradictorias y operación de soporte/recuperación todavía incompleta. Más secciones o una landing promocional no corrigen esas brechas.

Evaluación heurística realizada sobre el código publicado (`b4f8e65`) y el checkout de correcciones. No es una investigación con pacientes o psicólogos reales, ni prueba de conversión. Las frases en primera persona abajo son una simulación explícita de perspectiva de uso, no testimonios.

## Cobertura y límites

- Navegación productiva anónima: portada, directorio, recursos, convenios, propuesta profesional, planes, ingreso, registro, recuperación, privacidad, términos, dashboard/admin/alta protegidos, redirección de matching y 404. Se comprobaron URL final, título principal y desbordamiento; 16 destinos. Las respuestas 200 de rutas protegidas corresponden a la página de ingreso después de redirigir, no a acceso anónimo al panel.
- Revisión de código de las páginas de detalle, Server Actions, endpoints de contacto, analítica, callbacks, checkout, webhook y tareas internas. No se enviaron consultas ni compras productivas.
- Regresiones públicas de escritorio/móvil: filtros → perfil → regreso conservando búsqueda, contacto con éxito/error simulado, navegación, teclado, vacíos y errores. Los fixtures públicos no demuestran persistencia productiva.
- Integración local real: usuarios propios/ajenos/anónimo, onboarding, documentos privados, MFA administrativa, revisión, publicación, selección de plan, consulta y bandeja. Datos sintéticos y buzón local. Resultados definitivos y límites en el reporte de implementación de seguridad.
- No se acreditan con este trabajo: entrega externa de correo, una compra/renovación/reembolso productivos, respuesta humana del profesional, restauración completa de producción, revisión jurídica ni accesibilidad completa con tecnologías asistivas.

## Matriz de ida, vuelta y recuperación

| Persona / recorrido | Ida | Vuelta o excepción | Evaluación |
| --- | --- | --- | --- |
| Busca acompañamiento | Home → búsqueda → filtros → perfil | Volver conserva filtros; limpiar y búsqueda vacía disponibles | Base clara; falta oferta real antes de adquisición |
| Compara profesionales | Tarjetas → detalle → otro resultado | URL del listado y ancla preservadas | Bien resuelto; no existe lista personal de comparación en UI |
| Envía consulta | Perfil → datos mínimos → consentimiento → enviar | Reintento ante red fallida; éxito distingue consulta de turno | Sin trazabilidad visible posterior para quien consulta |
| Elige WhatsApp/teléfono | Preferencia → teléfono requerido | Error de validación conserva formulario | Preferencia no asegura canal ni plazo de respuesta |
| Crea cuenta | Registro/Google → confirmación → términos → destino | Cancelación/error vuelven al acceso | La cuenta genérica termina empujando al alta profesional |
| Recupera acceso | Email → enlace → contraseña | Enlace inválido/vencido → ingreso | Hay que acreditar entrega real y mejorar el enlace para pedir otro |
| Profesional nuevo | Registro → borrador → presentación → documentos | Guardar y volver; datos persisten | Falta explicar mejor duración/requisitos antes de pedir esfuerzo |
| Documentación | Subida privada → estado en revisión | Fallo de conexión recuperable, reintento | Corregido bloqueo de carga; falta devolución externa específica al rechazo |
| Publicación | Envío → revisión administrativa → perfil público | Edición puede devolver a revisión | Advertir claramente el efecto de editar un perfil publicado |
| Rechazo | Administrador exige motivo | Profesional ve estado observado | Motivo interno no llega como instrucción accionable al titular |
| Suscripción | Plan → alta → autorización en proveedor | Retorno pendiente/error no acredita pago | Contradicciones legales y falta de una salida de cancelación clara |
| Bandeja profesional | Consulta → lectura → cambio de estado | Estado persiste tras recarga | Sólo últimas 20; cierre irreversible en UI; vocabulario de CRM |
| Administración | Cuenta propia → segundo factor → revisión | Sesión revocada pierde privilegios | Corregido MFA; faltan historial/filtros y tratamiento de casos viejos |
| Recursos | Listado → artículo → regreso | Slug inexistente → no encontrado | Tono parcialmente heredado de orientación laboral, no siempre salud mental |
| Convenios | Listado → detalle → contacto/enlace | Volver y vacíos | Los ejemplos ficticios deben quedar fuera del lanzamiento público real |
| Soporte/privacidad | Pie/legal → correo explícito | Gestión humana posterior | Se agregó canal; falta SLA interno y procedimiento de identidad/baja |

## Hallazgos priorizados y crítica como usuario

### P0 — Antes de captar público o cobrar de forma amplia

**UX-01. El catálogo no acredita disponibilidad real.** Evidencia de la revisión productiva: 12 perfiles publicados de demostración, ningún perfil real publicado. “Puedo buscar, pero no encuentro a quién contactar de verdad”. Aunque hay etiquetas, un recorrido comercial que termina en una persona ficticia erosiona confianza. Acción: publicar una primera oferta real revisada y separar ejemplos de la búsqueda real. No borrar datos de demostración sin plan; ocultarlos de la experiencia productiva mediante una configuración explícita y probada. Métrica: contactos a perfiles reales, no cantidad de tarjetas.

**UX-02. Los términos contradicen el cobro.** `src/app/(public)/terminos/page.tsx`, sección 6, declara planes en borrador sin precios aprobados. `/planes` consulta el precio publicado y usa la disponibilidad del proveedor; además conserva un texto lateral condicional obsoleto. “No entiendo si estoy contratando algo ni qué condiciones rigen”. Acción: completar responsable legal, condiciones de renovación/cancelación, precio total y prestaciones, con revisión jurídica y versionado de aceptación. No presentar este informe como validación legal.

**UX-03. La operación tiene que sostener las promesas.** La consulta se guarda en el panel, pero este trabajo no demuestra entrega de notificaciones externas ni que alguien responda. “Envié información personal y no sé qué pasa ahora”. Acción: validar correo real con cuentas controladas y autorización, asignar responsable operativo, definir seguimiento y una salida si no hay respuesta. Medir tiempo de primera respuesta y consultas abandonadas.

### P1 — Confianza, tareas esenciales y recuperación

**UX-04. La cuenta genérica es en realidad un panel profesional.** `dashboard/page.tsx` muestra “Construí un perfil…” cuando no hay perfil; navegación incluye Suscripción/Mi perfil para cualquier cuenta. “Me registré para buscar ayuda y parece que quieren que ofrezca servicios”. Acción: distinguir intención al ingresar o mantener búsqueda/contacto sin registro; un espacio consumidor sólo cuando tenga funciones útiles, con privacidad propia. No pedir registro por costumbre.

**UX-05. Rechazo sin instrucciones visibles.** `CredentialUploader` sólo traduce estado a Observado; `my_credential_statuses` no expone la devolución. El motivo de publicación queda en auditoría. Dashboard invita a revisar observaciones que el editor no muestra. “Me dicen que corrija, pero no qué”. Acción: separar nota interna de devolución al profesional, mostrar motivo, documento/campo afectado y acción para reenviar. Nunca publicar notas internas ni toda la auditoría.

**UX-06. Edición y publicación no son un único estado.** Hay protección de cambios de taxonomía que devuelve a revisión. “Cambio un dato y desaparezco de la búsqueda sin anticiparlo”. Acción: avisar antes de guardar qué cambios requieren nueva aprobación; idealmente mantener versión publicada y borrador en revisión. Probar atrás, recarga y conflicto de dos pestañas.

**UX-07. La bandeja pierde utilidad al crecer.** `my_professional_leads` se pide con límite 20; no hay paginación visible ni búsqueda. “Mi consulta anterior dejó de aparecer”. Acción: paginación por cursor, filtros de estado y búsqueda autorizada sin descargar toda la PII. Mantener filtros al regresar de un detalle.

**UX-08. Cerrar una consulta no tiene vuelta en la UI.** `leadTransitions` deja CLOSED y SPAM sin transiciones. “Me equivoqué al marcar spam y no puedo corregirlo”. Acción: acción explícita de reapertura con motivo y auditoría; confirmación o deshacer para las transiciones de más impacto. No borrar el historial.

**UX-09. Cancelación comercial poco localizable.** En la versión revisada el panel permite retomar pagos, pero no ofrece una acción de cancelación propia clara. “Puedo empezar a pagar; no encuentro cómo dejar de hacerlo”. Acción: recorrido completo de baja, fecha efectiva, confirmación y persistencia verificable contra proveedor. Incluir estado incierto y reintentos idempotentes. No atribuir un pago exitoso al retorno del navegador.

**UX-10. La primera camada necesita control privado, no una categoría de marketing.** Acción: aprobación manual existente más asignación individual de un beneficio separado del pago. Especificación en `private-admission-2026-09-15.md`. Sin landing, badge ni cupón compartido. El beneficio de tres meses requiere implementación y pruebas comerciales propias; no se activó mediante una etiqueta visual.

**UX-11. Soporte estaba implícito.** Privacidad decía “canales de soporte” sin dirección. Se incorpora `hola@universosenda.com`, confirmado por el dueño, en pie y legales. Pendiente: procedimiento para verificar identidad, registrar solicitudes, responder y aplicar retención/baja. El correo no prueba atención efectiva ni autorización del dominio como remitente de Resend.

**UX-12. Un fallo de lectura no puede parecer formulario vacío.** El alta ignoraba errores de catálogos y relaciones. Se corrigió: bloquea la edición con error antes de presentar datos incompletos. También se evita que la lista administrativa de credenciales muestre vacío si falló su consulta. La siguiente iteración debe ofrecer retry contextual y mensajes sin jerga.

**UX-13. Los documentos merecen una recuperación clara.** Se corrigió carga trabada por excepción, envío doble inmediato, firmas de archivos y descarga administrativa protegida. Pendiente: explicar límite de documentos, gestionar reemplazos y dar al operador diagnóstico de archivo inválido; análisis antimalware real. No confundir comprobación de firma de archivo con seguridad del contenido.

### P2 — Claridad, fricción y coherencia

**UX-14. El copy usa metáforas donde hace falta orientar.** Registro: “Un lugar para tu próximo movimiento”; recursos: “Ideas para pensar mejor antes de moverte más rápido”. Pueden referir a carrera, no a buscar atención psicológica. Propuesta: “Creá tu cuenta” y “Recursos para conocer opciones de acompañamiento”, revisando contenido editorial antes de renombrar todo. Mantener tono cálido sin ocultar la tarea.

**UX-15. La bandeja habla como un CRM.** “Calificada”, “Convertida” y preferencia cruda EMAIL/ANY no ayudan a un psicólogo. Propuesta: “Leída”, “Respondida”, “Primera entrevista coordinada”, “Cerrada”, con definiciones claras; conservar valores internos y migración de estados sólo si cambia el contrato. No equiparar conversión a vínculo terapéutico.

**UX-16. Falta anticipar esfuerzo y privacidad en el alta.** Propuesta: checklist breve antes de empezar, documentos exigidos por categoría, qué se publica/qué queda privado y qué se puede completar después. Guardado explícito y advertencia por cambios sin guardar. No pedir todos los campos sólo porque existen en el esquema.

**UX-17. El formulario de consulta puede recolectar más de lo necesario.** Se agrega aviso de no enviar diagnósticos/historia clínica y se alinean límites de longitud visibles. Pendiente: evaluar si el motivo obligatorio aporta al profesional o duplica mensaje, y distinguir error por campo. Mensaje de 429 ahora explica el límite; no invita a reintentar indefinidamente.

**UX-18. La administración es una cola sin suficiente contexto.** Límite 50, contadores de opiniones/artículos sin un flujo de resolución equivalente en esta versión. Propuesta: filtros, paginación, historial por perfil, vista previa segura y pantalla específica para cada moderación. No mostrar un número como si ya existiera una herramienta para resolverlo.

**UX-19. Métricas pueden inducir lecturas incorrectas.** Panel suma últimos 30 registros diarios y cuenta nuevas dentro de las últimas 20 consultas. “Consultas nuevas” puede interpretarse como total pendiente. Propuesta: intervalo visible, conteo total autorizado y distinción visitas/contactos/consultas; no presentar actividad demo como demanda real.

**UX-20. Accesibilidad requiere más que no desbordar.** La navegación revisada tiene foco y estados; falta acreditar lectura con lector de pantalla y errores por campo en cada formulario, zoom 200%, teclado en MFA y contrastes de estados secundarios. Algunos enlaces de pie/documentos tienen targets menores que el objetivo del proyecto de 44 px. Pruebas automáticas y revisión heurística no equivalen a WCAG AA certificada.

**UX-21. Hay dependencia excesiva de recordar una URL interna.** Se agregó enlace “Administrar perfiles” al panel sólo para roles administrativos; el servidor y DB siguen validando permisos. Pendiente: recuperación de MFA perdida mediante un procedimiento de identidad y auditoría, sin cuentas compartidas ni desactivar controles para resolver urgencias.

## Orden recomendado

1. Cerrar bloqueos operativos: admins con MFA, respaldo recuperable, correo verificado, legales/precio/cancelación y oferta real.
2. Incorporar seleccionados por flujo privado; validar una persona de punta a punta antes de ampliar la camada. Ese ensayo humano complementa las pruebas automáticas; no obliga al dueño a repetir manualmente todas las variantes.
3. Resolver devoluciones de revisión, distinción consumidor/profesional y seguimiento de consultas.
4. Completar paginación, métricas, copy y accesibilidad con personas representativas.

No priorizar ahora nuevas páginas promocionales, rankings más complejos ni más campos de perfil. El siguiente incremento debe hacer que cada promesa actual tenga una salida clara cuando todo sale bien y cuando algo falla.
