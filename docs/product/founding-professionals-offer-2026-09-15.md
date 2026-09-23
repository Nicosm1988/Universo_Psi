> Propuesta sustituida por pedido del usuario: no habrá campaña ni categoría pública de fundadores. Ver [ingreso privado](private-admission-2026-09-15.md). Esta propuesta anterior no se implementó.

# Primera camada: tres meses gratis por invitación

**Propuesta recomendada:** una landing dentro de Universo Psi y una invitación individual vinculada a un correo verificado. No hace falta otro sitio. Un cupón público compartido no permite controlar bien quién recibe el beneficio.

Este documento es una propuesta lista para implementar, **no una promoción activa**. No se otorgaron beneficios, enviaron invitaciones ni alteraron precios/contratos de personas existentes. Las reglas recomendadas deben quedar confirmadas antes de habilitar la campaña.

## Experiencia propuesta

Ruta pública `/profesionales/fundadores`, con identidad editorial existente. Separar la explicación pública del canje privado; ocultar una URL no es autorización.

**Título:** Sumate a la primera comunidad de profesionales de Universo Psi.

**Bajada:** Si recibiste una invitación, tenés tres meses sin cargo para conocer la plataforma y desarrollar tu perfil profesional. El beneficio comienza cuando aprobamos y publicamos tu perfil.

**Condición visible:** Exclusivo para profesionales invitados. Sin tarjeta y sin renovación automática. La publicación requiere revisión de identidad y matrícula. No garantizamos una cantidad de consultas.

**CTA principal:** Activar mi invitación.

**Pasos:** Confirmá tu correo → completá tu perfil y documentación → revisión → publicación y comienzo del beneficio. Si ya tenés cuenta, ingresás conservando la invitación.

**Qué incluye:** perfil profesional y herramientas que realmente estén disponibles en el plan elegido: presentación, categorías/modalidades, recepción y gestión de consultas. Los beneficios se obtienen del contrato de plan vigente; no inventar agenda, reserva, WhatsApp, resultados clínicos ni funciones pendientes.

**Durante el beneficio:** el dashboard informa estado, fecha de inicio y fecha exacta de finalización, con acciones de editar perfil, ver perfil público y revisar opciones de continuidad. El tiempo de revisión no consume meses gratuitos.

**Al finalizar:** no se realiza ningún débito. Para continuar con prestaciones pagas, se muestran precio/recurrencia vigentes y se solicita contratación explícita mediante el checkout existente. Se conservan cuenta, datos y acceso a consultas anteriores.

**FAQ mínima:** quién puede usarla; cuándo empiezan los tres meses; qué documentación se necesita; si pide tarjeta; qué ocurre al vencer; cómo solicitar ayuda. Un contacto real debe estar disponible antes de publicar.

## Reglas recomendadas

| Regla | Propuesta |
| --- | --- |
| Elegibilidad | Profesionales elegidos por el equipo; correo confirmado; identidad profesional revisada. |
| Duración | Tres meses calendario desde primera publicación aprobada. Cálculo y fecha final en servidor, con tratamiento explícito de fin de mes. No confundir con 90 días. |
| Precio promocional | Cero durante la vigencia; conservar precio público normal y snapshot de condiciones aceptadas. |
| Tarjeta y renovación | Sin tarjeta para activar; sin débito automático al finalizar. |
| Uso | Una activación por profesional/campaña, no transferible, no acumulable. No reiniciar plazo al editar o volver a publicar. |
| Invitación | Token aleatorio individual, de un uso, guardado sólo como hash, vinculado al correo normalizado de Auth. Vencimiento de canje recomendado: 30 días. |
| Cuenta existente | Mantener identidad y datos. No cancelar, bonificar ni convertir automáticamente una suscripción pagada existente. Resolver esa excepción expresamente. |
| Revisión | La invitación nunca da estado VERIFIED/PUBLISHED por sí misma ni permiso administrativo. |
| Suspensión | Puede bloquearse un perfil por fraude/seguridad; no borrar consultas previas ni extender el beneficio automáticamente. |
| Cupo | Definido por invitaciones emitidas; no inventar “últimos lugares” ni una cantidad sin decisión comercial. |

## Implementación compatible con lo actual

Existe `TRIALING` en el esquema de suscripciones (`20260815161322…:1298`), pero **no existe un canje seguro de invitaciones**. Cambiar un estado a mano o poner precio cero en la UI no resuelve autorización, expiración y concurrencia.

Recomiendo guardar la invitación y el acceso promocional en tablas privadas independientes del registro de cobros: `private.professional_invitations` y `private.promotional_access`. La autorización efectiva combina una suscripción pagada válida o un beneficio promocional vigente. Así no se inventan pagos ni se abre una suscripción externa de importe cero.

- Migración nueva e inmutable, grants mínimos/RLS explícita, RPC transaccional que verifica sesión, email confirmado, destinatario, cupo, fecha y único canje. Dos peticiones concurrentes deben producir una sola activación.
- Separar estados INVITED/CLAIMED/PENDING_REVIEW/ACTIVE/EXPIRED/REVOKED. El token acredita invitación, no autenticación ni matrícula.
- Canje mediante POST autenticado con validación de origen y límites por cuenta/red; errores que no revelen si otro correo fue invitado. Nunca confiar en `?gratis=true` o en un precio enviado por el navegador.
- Si el enlace lleva token, página sin analytics ni recursos externos, política de referencias restrictiva y retirar el token de la URL tras establecer contexto seguro. No incluir email en el enlace ni token en logs/eventos.
- Beneficio resuelto con reloj de la DB en cada operación relevante; un cron puede notificar, pero no ser el único control de vencimiento. Auditar emisión, canje, activación y revocación.
- Emails de invitación/recordatorio sólo mediante proveedor verificado y autorización de envío. Primero probar en Mailpit/sandbox y cuentas controladas.

**Decisión comercial pendiente:** hoy la elegibilidad pública del directorio no depende exclusivamente del pago (`private.is_professional_publicly_visible`). Antes de implementar la expiración hay que definir si, terminado el beneficio, el perfil queda visible con prestaciones gratuitas limitadas o se pausa la captación de nuevas consultas. Recomendación inicial: conservar gestión e historial, finalizar prestaciones bonificadas y explicar con precisión qué requiere contratación; no borrar el perfil ni cobrar por sorpresa.

## Pruebas de aceptación

Invitación correcta y correo incorrecto; token vencido/revocado/reutilizado; dos canjes simultáneos; sesión vencida y retorno; cuenta ya paga; perfil rechazado; aprobación tardía; fechas de fin de mes; vencimiento sin ejecución de cron; límites de abuso; revocación; cero llamadas de cobro durante el beneficio; restauración del estado; aislamiento entre invitados; contrato y precio visibles antes de contratar después.

## Trabajo del dueño frente a trabajo técnico

El equipo técnico puede automatizar registro, confirmación en entorno aislado, filtros, perfil, canje, permisos, expiración y regresión. El titular define destinatarios y condiciones comerciales, aporta identidad legal/canal de soporte, completa MFA/OAuth cuando requiera intervención personal y revisa una experiencia real breve. No tiene que recorrer manualmente todas las pantallas ni probar cada combinación.
