# Lanzamiento en universopsi.com

Fecha: 23/09/2026. Alcance: mover el sitio a su dominio propio, retirar las
secciones de Recursos y Convenios, y vaciar el contenido piloto para abrir el
catálogo sin perfiles ficticios.

## Dominio

`universopsi.com` y `www.universopsi.com` están asociados al proyecto
`universo-psi` en Vercel. El dominio se registró en Namecheap; los nameservers
siguen siendo los del registrador (`dns1/dns2.registrar-servers.com`) y la
resolución al edge de Vercel se hace por A record. El sitio ya responde.

En el código, `https://universopsi.com` pasa a ser el valor por defecto de
`NEXT_PUBLIC_SITE_URL` en `layout.tsx`, `robots.ts`, `sitemap.ts` y los datos
estructurados. `supabase/config.toml` apunta su `site_url` al dominio nuevo y
suma los callbacks de apex y `www`.

## Secciones retiradas

Se eliminan `/recursos` y `/convenios` con sus rutas de detalle, sus tarjetas,
los accesos de navegación y pie, las entradas de sitemap, los métodos del
repositorio público y los fixtures demo asociados (518 líneas de código muerto
menos). Las URLs anteriores quedaron indexadas mientras existieron, así que
`next.config.ts` las redirige de forma permanente a `/profesionales` en lugar de
devolver 404. El acceso «Contenido» del panel profesional también sale.

## Vaciado del contenido piloto

Migración `20260923230000_remove_pilot_demo_content.sql`. Borra únicamente lo que
`seed.sql` marcó con `is_demo = true`: perfiles profesionales, reseñas,
artículos, convenios e instituciones.

El filtro es seguro por dos razones verificadas, no supuestas:

1. **La taxonomía no se toca.** Tipos profesionales, necesidades, servicios,
   especialidades, audiencias, modalidades, ubicaciones, idiomas, industrias,
   etapas y planes se sembraron sin `is_demo`, conservando el valor por defecto
   `false`. Una prueba en seco contra Postgres con los datos del seed confirmó
   que pasan de 23 necesidades, 11 servicios y 4 modalidades a los mismos
   valores, mientras los 16 perfiles demo caen a 0.
2. **No hay cuentas en juego.** `seed.sql` declara que los perfiles demo se
   crearon «sin auth users, contraseñas, correos ni PII real», así que el borrado
   no puede alcanzar la cuenta de una persona real. Los perfiles reales que
   existan, publicados o en borrador, quedan intactos por construcción.

Al momento de escribir esto, los 7 perfiles publicados en producción provienen
todos del seed, de modo que el catálogo queda en cero y se abre limpio. La
migración verifica al final que no sobrevivió contenido demo y falla si queda
alguno.

Como consecuencia, la home muestra un estado vacío que invita a sumar el primer
perfil en lugar de un carrusel sin contenido, y se retira el cartel de «versión
piloto» del encabezado público, que ya no describe nada.

## Pendiente de ejecución externa

Estos pasos no se pudieron aplicar desde esta sesión y quedan para el titular:

1. **`NEXT_PUBLIC_SITE_URL` en Vercel Production** sigue en
   `https://universo-psi-eight.vercel.app`. Hasta cambiarla a
   `https://universopsi.com`, los canonical, el sitemap, `robots.txt`, los datos
   estructurados y los enlaces de correo de autenticación siguen apuntando al
   dominio viejo. Es el cambio más urgente de los tres.
2. **Supabase Auth**: la Site URL y la lista de redirecciones permitidas del
   proyecto productivo deben incluir `https://universopsi.com/auth/callback` y
   `https://www.universopsi.com/auth/callback`. Sin eso, el ingreso con Google y
   los enlaces de confirmación fallan desde el dominio nuevo.
3. **Aplicar la migración** de vaciado al proyecto productivo.

Mientras 1 y 2 no estén hechos, conviene no difundir el dominio nuevo: el sitio
responde, pero la autenticación y el SEO siguen atados al anterior.

## Ejecución del vaciado (24/09/2026)

La migración `20260923230000` se aplicó al proyecto productivo. El catálogo pasó
de 7 perfiles a 0 y la home muestra el estado vacío. Se aplicó sólo esa
migración: las tres de taxonomía del 30/08 siguen pendientes por decisión previa.

## Defecto encontrado: 404 blando en perfiles inexistentes

Al verificar el vaciado apareció un problema que **no** introdujo este cambio y
que sigue abierto: una URL de perfil inexistente devuelve **HTTP 200** con el
cuerpo de «no existe», en vez de 404. Se reproduce en local y afecta por igual a
un slug borrado y a uno inventado. Una ruta desconocida fuera de
`/profesionales/[slug]` sí devuelve 404 correctamente, porque la resuelve el
router antes de renderizar.

Causa: el layout raíz es `force-dynamic` para poder emitir el nonce de la CSP por
request. React transmite el shell apenas está listo, así que cuando la página
llama a `notFound()` el estado 200 ya se envió. Mover la comprobación a
`generateMetadata` no alcanza: desde Next 15 los metadatos también se transmiten.

Importa ahora porque las 7 URLs de perfiles piloto estuvieron indexadas y, al
recibir 200, los buscadores las tratan como 404 blandos y tardan más en
soltarlas. `robots.txt` productivo permite indexación, así que estuvieron
expuestas de verdad.

Mitigación aplicada: `sitemap.ts` pasa a revalidar cada hora. Antes se generaba
en el build y quedaba congelado —se lo encontró sirviendo las 7 URLs muertas con
`x-vercel-cache: HIT` y diez horas de antigüedad—, de modo que seguía
ofreciéndolas activamente.

Pendiente de resolver: devolver un 404 real. Las salidas razonables son emitir el
nonce sin obligar a `force-dynamic` en el layout raíz, o resolver la existencia
del perfil antes del render. Ninguna es un cambio de una línea y no se improvisó
acá.
