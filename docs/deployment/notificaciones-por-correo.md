# Notificaciones por correo

Fecha: 24/09/2026.

## Cómo se envía

Todo sale por Resend, con `EMAIL_FROM` sobre un dominio verificado, a través de
[`deliverTransactionalEmail`](../../src/lib/integrations/email.ts). Si faltan
`RESEND_API_KEY` o `EMAIL_FROM`, la función devuelve `queued` y no rompe la
acción que la invocó.

Hay dos caminos, a propósito:

- **Consultas** → cola en `private.notification_outbox`, con reintentos, bloqueo
  por trabajador y backoff. Una consulta que se pierde es una persona que no
  recibe respuesta, así que se reintenta.
- **Avisos de cuenta** → envío directo desde la acción con `after()`. Acompañan
  algo que ya ocurrió y quedó registrado; si el correo falla, la acción igual se
  completó. Reintentarlos indefinidamente no aporta.

## Marca

Una sola maqueta: [`email-layout.ts`](../../src/lib/integrations/email-layout.ts).
La usan tanto los correos de autenticación como los avisos de cuenta y las
notificaciones de consultas, así que el diseño no se bifurca.

La marca se dibuja **con texto y color, no con una imagen**. Los clientes de
correo bloquean imágenes remotas por defecto: un logo en `<img>` se ve como un
recuadro roto justo en la primera lectura, que es la que importa. Por lo mismo,
todo va en estilos en línea y sobre tablas, que es lo único que Gmail y Outlook
respetan de forma pareja.

El pie lleva enlaces a privacidad, términos, baja y derechos, y el correo de
contacto. Los valores que vienen de datos de personas se escapan antes de
interpolarse; hay una prueba que lo cubre.

## Qué se notifica hoy

| Evento | Destinatario | Disparador |
| --- | --- | --- |
| Alta de cuenta, recuperación, cambio de email, invitación, enlace mágico | quien se registra | hook de Supabase Auth → `/api/auth/hooks/send-email` |
| Contraseña actualizada | titular de la cuenta | `updatePasswordAction` |
| Perfil publicado | profesional | `resolvePublicationAction`, al aprobar |
| Perfil rechazado | profesional | `resolvePublicationAction`, al rechazar |
| Nueva consulta recibida | profesional | outbox, al crearse la consulta |
| Confirmación de consulta enviada | quien consulta | outbox, al crearse la consulta |

Ningún correo transporta datos de contacto ajenos ni el cuerpo de una consulta:
un correo puede quedar abierto en una pantalla que no es la de su destinatario.
El detalle siempre se consulta dentro de la cuenta.

## Lo que falta

- **Baja de cuenta.** La plantilla `account_closed` está escrita pero sin
  disparador: la baja se pide por `/solicitudes` y la resuelve una persona desde
  `/admin/solicitudes`. Conectarla implica decidir en qué momento del circuito se
  considera cerrada la cuenta, que hoy no está definido.
- **Publicación de contenido por parte del profesional.** No existe ese flujo en
  el producto, así que no hay qué notificar todavía.
- **Verificar la entrega real.** `RESEND_API_KEY` y `EMAIL_FROM` están cargadas
  en producción, pero en esta sesión no se envió ningún correo real: no se
  acredita entrega ni reputación del dominio remitente. Conviene una prueba
  extremo a extremo con una casilla propia antes de abrir el registro al público.
