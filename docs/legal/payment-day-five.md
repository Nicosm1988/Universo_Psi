# Vencimiento del día 5: el contrato promete algo que el sistema no hace

Fecha: 22/09/2026. Actualizado: 23/09/2026. Estado: pendiente de implementación.

## Qué dice el texto publicado

La regla aparece en los dos documentos entregados por la asesoría legal, así que
no es un descuido de redacción: es la política comercial querida.

La cláusula 9 de los [términos y condiciones](../../src/app/(public)/terminos/page.tsx)
la establece como obligación contractual:

> Universo Psi se reserva el derecho de suspender o dar de baja de forma
> inmediata la cuenta y la publicación del perfil en caso de que el Plan de
> Suscripción no se encuentre totalmente abonado al día 5 (cinco) de cada mes.

Y las [preguntas frecuentes](../../src/app/(public)/preguntas-frecuentes/page.tsx)
la explican al profesional:

> El vencimiento para el pago de tu plan opera el día 5 (cinco) de cada mes.

> Si al llegar el día 5 de cada mes el pago de tu plan no se encuentra
> acreditado, el sistema suspenderá automáticamente la visibilidad de tu cuenta
> y tu perfil será retirado temporalmente de los resultados del buscador.

## Qué hace hoy el sistema

La suscripción se crea en Mercado Pago como una preaprobación con
`auto_recurring: { frequency: 1, frequency_type: "months" }`
([`src/lib/integrations/payments.ts`](../../src/lib/integrations/payments.ts)).
Es decir: el ciclo se cuenta desde la fecha en que cada profesional contrató, no
desde un día fijo del calendario. Dos personas que se suscriben el 3 y el 27
tienen vencimientos distintos, y ninguno cae necesariamente el día 5.

La suspensión por falta de pago tampoco está atada al día 5: el estado se
reconcilia contra el proveedor y las suscripciones `PAST_DUE` se pausan cuando
vence su período de gracia (`expire_past_due_subscriptions`).

## Por qué importa

Es una afirmación sobre el funcionamiento del producto dentro de un documento al
que los propios términos remiten. Publicada como está, un profesional que
contrató el día 20 puede concluir que tiene tiempo hasta el 5 siguiente, o que
su perfil se cae ese día.

## Qué hay que hacer

Como la regla está en los términos, que son el contrato, **corresponde
implementarla en el producto**, no reescribir el texto. Alinear el ciclo de
facturación a una fecha fija implica:

1. prorratear el primer período entre el alta y el día 5 siguiente;
2. crear la preaprobación de Mercado Pago con esa fecha de inicio;
3. revisar la conciliación y el vencimiento de la gracia para que la suspensión
   caiga donde el contrato dice.

Es un cambio de producto con impacto en cobros: conviene encararlo con los
agentes de pagos (`docs/deployment/payment-agents.md`) y probarlo en sandbox
antes de tocar producción.

Hasta que eso exista, hay una diferencia entre lo que el contrato promete y lo
que el sistema hace. Es exigible por un profesional, y también es la razón por la
que un cobro puede caer un día distinto del que la persona espera.
