# Solicitudes y minimización de navegación

## Alcance

- Formulario público `/solicitudes`: baja, arrepentimiento, acceso, corrección, eliminación y reclamos, sin exigir cuenta ni justificar el motivo de la baja. Devuelve constancia sólo tras confirmar persistencia; reintentos idénticos conservan la referencia.
- Datos en tablas `private` con RLS, sin grants a visitantes/usuarios. RPC de escritura sólo backend y rate limit por red; RPC administrativas requieren ADMIN/SUPERADMIN, AAL2 y sesión vigente. La gestión deja un evento inmutable para el cliente.
- `/admin/solicitudes`: bandeja de hasta 200 pedidos, pendientes primero y más antiguos antes. Estado y notas no ejecutan cambios en Mercado Pago, no eliminan cuentas ni envían correos. Requiere atención humana.
- Analítica opcional desactivada en cliente, endpoint y componentes Vercel; se eliminan del navegador los identificadores anteriores. No se borraron registros históricos productivos ni logs de infraestructura.
- Aclaraciones operativas fechadas en términos/privacidad y planes. Se conserva fuente anterior en `docs/legal/archive/`. No se fabrican nuevas aceptaciones ni se afirma que los términos definitivos estén completos. Se mantiene la versión contractual existente; estas correcciones explican funcionamiento y no autorizan cargos ni cambios retroactivos.

## Procedimiento para administración

Revisar `/admin/solicitudes` cada día hábil y antes del siguiente ciclo de cobro. Confirmar la identidad mediante un canal verificado antes de entregar datos, modificar cuentas o cancelar una contratación. No pedir contraseñas ni códigos MFA. Un email escrito en el formulario no prueba titularidad.

Registrar comprobación, acción realizada, referencia del proveedor cuando corresponda y respuesta al solicitante. Resolver una baja requiere comprobar el estado efectivo del recurso en el proveedor; marcar la fila como resuelta no cancela un débito. Las solicitudes de datos requieren verificar el alcance legal y no entregar datos de terceros. El panel no envía respuestas automáticas: la atención debe realizarse desde soporte.

## Pendientes materiales

El usuario confirmó que ambos integrantes tienen monotributo. Sigue faltando definir cuál presta y factura el servicio e informar su nombre completo, CUIT y domicilio publicable. No hace falta sociedad ni marca registrada para identificar al titular; la cuenta de cobro no reemplaza esa identificación.

Los borradores definitivos de términos/privacidad y el acuerdo de invitación privada siguen pendientes de completar y revisar. No se activaron concesiones gratuitas, PayPal, escaneo antimalware ni restauraciones de backups en este release. No se declara cierre integral del lanzamiento ni cumplimiento legal completo por disponer del formulario.

## Despliegue

Aplicar sólo `20260916002307_legal_requests_and_analytics_minimization.sql` y, después, `20260916003917_legal_admin_private_functions.sql`, con transacción e historia de migración. La segunda conserva los controles y mueve las implementaciones privilegiadas al esquema privado; los wrappers públicos son SECURITY INVOKER. No ejecutar db push sobre migraciones históricas no aplicadas. La migración es aditiva; una reversión del frontend conserva pedidos y auditoría privados. Si se revierte el sitio, los pedidos ya recibidos siguen necesitando atención.

Validación local: lint, typecheck, 375 pruebas unitarias; prueba SQL sintética de permisos, MFA, idempotencia, auditoría y revocación con rollback. Build Node24. 60 pruebas públicas aprobadas en escritorio y móvil; incluyen recuperación de error, constancia y ausencia de seguimiento. La primera corrida detectó y permitió corregir el desplazamiento del buscador en móvil y un selector de prueba ambiguo. Integración real local aprobada: dos POST al backend devolvieron la misma constancia y una única fila persistida. No se usó un mock en esa prueba.

## Cierre del despliegue

PR #15 integrada; commit `83f73f4827cac621b298d61ef2545420b014e1eb`. Deployment `dpl_2C7VNLCDuh5LskYqj3uFiHM3zKbd`, READY Production, asociado a https://universo-psi-eight.vercel.app. Árbol de main idéntico al verificado. CI `35041183388`: quality y supabase-integration aprobados.

Smoke productivo con navegador: formulario visible, detalle opcional, datos inválidos rechazados con 422 sin pedido persistido, analítica devuelve 204, administración redirige al ingreso y aviso anterior de precios corregido. No hubo solicitudes reales, cargos ni correos externos de prueba. Se eliminaron credenciales temporales locales y pedidos sintéticos locales. Los pendientes materiales detallados arriba siguen vigentes.
