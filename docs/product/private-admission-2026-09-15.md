# Ingreso privado y beneficio individual

Decisión del usuario: la primera camada se incorpora sin campaña, landing, badge, categoría de “fundadores” ni cupón compartido. Este documento sustituye la propuesta pública anterior. No hay que publicar una promoción para resolver este objetivo.

## Qué se puede operar con la aplicación

1. El equipo comparte por su propio canal el enlace normal de registro/alta con cada profesional elegido. No se envían invitaciones automáticas desde esta revisión.
2. La persona se registra, acepta los términos, guarda el borrador y carga documentación privada. Guardar no publica el perfil y seleccionar un plan no acredita un pago.
3. Administración verifica la documentación y decide explícitamente si publica. La cuenta administradora usa su propio acceso y segundo factor; no hay cuentas compartidas.
4. Sólo después de la aprobación aparece el perfil en la búsqueda. La documentación, decisiones internas y eventual condición comercial no se muestran al público.

La aplicación permite registro abierto. La aprobación de publicación ya es manual. No se cerraron todos los registros: es una decisión distinta de elegir quién recibe un beneficio. Si se quiere cerrar el alta profesional, debe existir una autorización en servidor/DB ligada a una cuenta, no una URL difícil de adivinar.

## Cómo debe implementarse el beneficio de tres meses

Especificación propuesta, **todavía no es una prestación activada**:

- Asignación administrativa a una cuenta verificada y su perfil, sin secretos compartidos entre invitados. Elegir cuenta por email exacto; confirmar nombre y perfil antes de conceder.
- Registro separado en `private`, con otorgante, beneficiario, motivo interno, fecha de asignación, inicio, vencimiento y revocación. No representar una gratuidad como un pago aprobado por Mercado Pago.
- Tres meses calendario desde la primera publicación aprobada, para que la revisión documental no consuma el beneficio. Sin apilar renovaciones por reenvío o recarga. La fecha de vencimiento se muestra en el panel de esa persona.
- Sin tarjeta ni autorización de débito al aceptar el beneficio. Al vencer, ninguna conversión automática a pago. La persona decide si contrata un plan y autoriza su cobro.
- Durante la vigencia, el panel y el alta indican “Acceso sin cargo hasta [fecha]”. El checkout debe rechazar también desde servidor/DB intentos incompatibles; ocultar el botón no alcanza.
- No conceder sobre una suscripción cobrada o un checkout externo en curso. Primero reconciliar o cancelar ese recurso para evitar cobros paralelos. Otorgamiento y reserva de checkout deben compartir un bloqueo transaccional.
- Definir qué ocurre con publicación, leads nuevos, lectura de consultas anteriores y edición al vencer. Hoy la visibilidad pública no depende automáticamente del estado de suscripción; no prometer una pausa que el código no ejecuta.
- Avisos privados de vencimiento sólo con canal de correo verificado. La web no debe mostrar “fundador”, “invitado” ni “gratuito” en tarjetas, ranking, directorio, sitemap, metadatos ni analítica pública.

## Criterios de aceptación antes de habilitarlo

Autorización administrativa con MFA; cuenta ajena y anónimo rechazados; repetición no extiende fechas; concurrencia con checkout sin doble beneficio/cobro; vencimiento y revocación comprobados con reloj controlado; webhook no sobreescribe el beneficio; historial auditable; HTML público sin indicadores de la promoción; panel privado con fechas y condiciones comprensibles. Pruebas de pago en entorno aislado, sin cargos reales.

## Por qué no un cupón

Un código compartido puede circular y exige controlar usos, identidad, vencimiento y filtraciones. Como el objetivo es que el equipo elija a cada persona, un permiso individual resuelve mejor el control. Una invitación futura puede llevar un token de un solo uso ligado al email, pero no es necesaria para empezar con cuentas ya registradas.
