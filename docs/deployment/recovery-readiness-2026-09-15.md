# Recuperación de datos: requisito operativo pendiente

No hay evidencia suficiente para declarar que producción se puede restaurar. El chequeo anterior devuelve `backups: null`, `pitr_enabled: false`, `walg_enabled: true`; esa combinación no acredita una copia disponible ni permite concluir por sí sola que no exista ninguna copia interna del proveedor.

Antes de recibir una camada amplia:

1. Designar responsable y custodio de recuperación; acordar RPO/RTO. Propuesta para la fase inicial: pérdida máxima de 24 horas y recuperación ensayada en un día hábil; no son garantías ya contratadas.
2. Elegir destino cifrado fuera del proyecto primario y controlar las claves separadamente de las credenciales productivas. Si requiere un plan pago o nueva cuenta, revisar costo y autorización. No guardar dumps sin cifrar en GitHub, la carpeta del proyecto o un bucket público.
3. Inventariar DB, roles/grants/RLS/RPC, Auth, Storage (objetos reales además de metadatos), configuración de dominios, secretos y proveedores. Un backup de PostgreSQL no incluye los binarios de Storage.
4. Preparar copia con el mecanismo soportado por el proveedor; limitar acceso, registrar checksums, fecha, versión de esquema y claves de cifrado referenciadas por identificador, nunca su valor. No copiar tokens de pago/correo a logs.
5. Restaurar en un proyecto aislado sin checkout, webhooks, cron ni envíos activos. Verificar migraciones, conteos sin revelar PII, RLS con anónimo/propietario/ajeno/admin, descarga de una muestra autorizada y consistencia Auth↔perfiles.
6. Documentar duración real y problemas. Borrar el entorno de ensayo y sus copias temporales según retención acordada; verificar que los datos no quedaron públicamente accesibles.
7. Automatizar y alertar ausencia de copia; repetir el ensayo después de cambios relevantes. Una tarea programada que nunca se restauró no prueba recuperación.

Esta revisión no exportó datos productivos ni realizó una restauración. Las pruebas locales sintéticas de RLS/MFA son distintas y no cierran este requisito.

Referencia: [Backups de Supabase](https://supabase.com/docs/guides/platform/backups).
