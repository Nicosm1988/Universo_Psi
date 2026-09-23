# universopsi.com — disponibilidad y antecedentes

Consultado el 15/09/2026. **El dominio presenta indicios sólidos de estar sin registrar, pero no está comprado ni reservado. La habilitación jurídica de la marca sigue pendiente.**

## Registro y DNS

| Consulta | Resultado | Alcance |
| --- | --- | --- |
| Registro autoritativo [.com / Verisign RDAP](https://rdap.verisign.com/com/v1/domain/universopsi.com) | HTTP 404 en dos consultas | No se encontró objeto de registro. El cuerpo no pudo completarse por un cierre TLS; se conservaron las cabeceras. No se atribuye una fecha de alta o titular inexistente. |
| [RDAP de referencia](https://rdap.org/domain/universopsi.com) | 302 hacia Verisign | Confirma cuál es el registro que corresponde consultar; no es una segunda base independiente. |
| [DNS público, NS](https://dns.google/resolve?name=universopsi.com&type=NS) | Status 3 / NXDOMAIN, autoridad .com | No hay delegación DNS visible. Por sí solo no prueba que un dominio se pueda comprar. |
| Búsqueda exacta web `"universopsi.com"` | Sin sitio específico acreditado | No reemplaza un registro ni prueba ausencia de historia previa. |

**Conclusión técnica:** razonable pasar a comprobar disponibilidad final en un registrador acreditado. No se ejecutó checkout ni se verificó precio de renovación/premium. La disponibilidad puede cambiar y sólo el registro exitoso acredita titularidad. No se necesita pagar un custom domain de Supabase para que el sitio tenga dominio propio en Vercel; esa personalización de Auth es una decisión distinta.

Evidencia: `output/launch-review-20260915/domain-rdap-headers.txt`, `rdap-second-headers.txt`, `rdap-bootstrap-headers.txt`, `dns.json`.

## Antecedentes del nombre

Se consultó la guía oficial del [INPI argentino](https://www.argentina.gob.ar/inpi/marcas/averigua-si-tu-marca-esta-registrada), su buscador directo y TMview, alternativa enlazada por el INPI. El buscador directo del INPI devolvió una página de bloqueo/HTTP 500 en el navegador disponible; **no se obtuvo una búsqueda nacional certificable**. No se intentó eludir ese bloqueo.

En [TMview](https://www.tmdn.org/tmview/#/tmview/results?page=1&pageSize=30&criteria=C&basicSearch=UNIVERSO%20PSI), la búsqueda amplia `UNIVERSO PSI` mostró 16 resultados distribuidos entre Brasil, EUIPO, México, Portugal y España. Entre los antecedentes relevantes:

| Denominación | Oficina / clase | Estado mostrado | Referencia |
| --- | --- | --- | --- |
| EDITORA UNIVERSO PSI | Brasil / 41 | Registered | [921139063](https://www.tmdn.org/tmview/#/tmview/detail/BR500000921139063) |
| UNIVERSO PSICOLOGIA | Portugal / 44 | Registered | [050000507677](https://www.tmdn.org/tmview/#/tmview/detail/PT500000000507677) |
| UNIVERSO PSICOANALÍTICO | México / 44 | Registered | [2959593](https://www.tmdn.org/tmview/#/tmview/detail/MX501985012959593) |
| UNIVERSO PSICOANALÍTICO | México / 41 | Registered | [2959592](https://www.tmdn.org/tmview/#/tmview/detail/MX501985012959592) |
| UniversoPsi | Brasil / 41, solicitud 01/06/2023 | Ended | [930641957](https://www.tmdn.org/tmview/#/tmview/detail/BR500000930641957), búsqueda adicional `UNIVERSOPSI` |

Estos resultados son señales para estudiar semejanzas y territorios, **no una conclusión de impedimento en Argentina**. “Ended” no permite inferir por sí solo abandono de todo uso o ausencia de otros derechos. La ausencia de Argentina en los resultados visibles tampoco acredita marca libre: pueden existir diferencias de cobertura, actualización o semejanza fonética.

Además existe una [Revista Universo Psi de FACCAT, Brasil](https://seer.faccat.br/index.php/psi/about), con actividad editorial documentada desde 2020. Esto acredita uso previo de la denominación en el ámbito psicológico; no se equipara automáticamente a un registro marcario argentino. Las referencias comerciales de terceros encontradas en buscadores no se toman como registros oficiales.

Evidencia reproducible: `tmview-results.txt`, `tmview-universopsi.txt` y captura `output/playwright/tmview-universopsi-20260915.png`.

## Qué falta para decir “lo puedo usar” con respaldo

1. Confirmación final de registrabilidad y registro a nombre del titular correcto, con MFA, bloqueo de transferencia y renovación controlada. No se realizó compra.
2. La gestoría que ya figura a cargo en `docs/product/trademark.md` debe revisar antecedentes nacionales exactos y fonéticos: Universo Psi, UniversoPsi y variantes confundibles. El INPI diferencia búsqueda gratuita exacta de búsqueda fonética arancelada.
3. Definir clases según servicios efectivos. Evaluar 35 para intermediación/directorio comercial, 42 si hay servicio tecnológico pertinente y 44 si corresponde por los servicios ofrecidos. La clase 44 no se da por obligatoria sólo porque el directorio liste psicólogos; evaluar también 41 si hay formación/contenido editorial.
4. Revisar territorios objetivo antes de expansión. Registrar un .com no confiere exclusividad mundial de marca: [WIPO](https://www.wipo.int/en/web/trademarks) y [política UDRP de ICANN](https://www.icann.org/resources/pages/policy-2024-02-21-en).

**Decisión recomendada:** candidato técnicamente viable para registrar, sujeto a disponibilidad al comprar; no invertir aún en una campaña grande basándose en una supuesta autorización marcaria definitiva. Llevar estos antecedentes a la gestoría para cerrar el análisis argentino. No se contactó a terceros ni se solicitó una búsqueda paga.
