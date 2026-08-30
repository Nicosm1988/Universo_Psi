# Modelo de negocio

## Estado del modelo

| Estado | Alcance |
| --- | --- |
| **Implementado** | Catálogo `PROFESSIONAL_MONTHLY|PROFESSIONAL_6M|PROFESSIONAL_12M|PROFESSIONAL_ANNUAL_UPFRONT`, selección de plan propia y boost técnico limitado a 2 puntos. Sólo `PROFESSIONAL_MONTHLY` tiene precio publicado ($120.000 ARS/mes); los otros tres son códigos preparados en `DRAFT` sin precio. |
| **Preparado** | Entitlements, suscripciones, snapshots, mapeo plan interno↔`preapproval_plan_id` de Mercado Pago por cuenta (`personal`/`company`), checkout real (recurrente y pago único), webhook con reconciliación server-side, período de gracia configurable y panel admin de suscripciones. |
| **Pendiente** | Precios de los planes 6M/12M/anual-upfront, credenciales reales de Mercado Pago (hoy sólo sandbox), pruebas E2E de checkout, definición fiscal/comercial del dueño y un convenio B2B real. Los honorarios profesionales no se publican. |

## Tesis

Universo Psi genera demanda y confianza para psicólogos/as y psicopedagogos/as que acompañan trayectorias y transiciones. El acceso B2C comienza gratuito; los ingresos provienen principalmente de la oferta profesional y, luego, de convenios institucionales.

## Tres lados

| Lado | Intercambio de valor | Ingreso inicial |
| --- | --- | --- |
| B2C | Búsqueda directa, filtros, comparación, opiniones y contacto | Sin cargo en el MVP; favoritos todavía sin UI |
| B2P | Visibilidad, leads, reputación, contenido, analítica y comunidad | Suscripción recurrente |
| B2B | Oferta curada para empleados, estudiantes, asociados o afiliados | Convenio/abono configurable |

La relación profesional-cliente continúa directamente después del lead en el MVP. Universo Psi no cobra comisión por sesión ni media el servicio salvo decisión futura explícita.

## Unidad económica inicial

La unidad operativa es un **lead válido**, no un clic. Debe tener consentimiento, destino profesional, fuente y estado. Estados: `NEW`, `VIEWED`, `CONTACTED`, `QUALIFIED`, `CONVERTED`, `CLOSED`, `SPAM`.

No se promete una cantidad fija de leads sin datos. El sistema sí registra impresiones, vistas, contactos, respuesta, calidad y conversión declarada para estimar CAC, CPL, payback, ARPU, LTV y churn.

## Planes

Los nombres son una propuesta comercial administrable para profesionales, no honorarios de consulta ni precios hardcodeados en el marketplace:

| Plan | Cadencia de cobro | Compromiso | Precio |
| --- | --- | --- | --- |
| `PROFESSIONAL_MONTHLY` | Recurrente mensual (Mercado Pago Preapproval) | Ninguno | $120.000 ARS/mes, `PUBLISHED` |
| `PROFESSIONAL_6M` | Recurrente mensual | 6 cobros | `DRAFT`, sin precio |
| `PROFESSIONAL_12M` | Recurrente mensual | 12 cobros | `DRAFT`, sin precio |
| `PROFESSIONAL_ANNUAL_UPFRONT` | Pago único (Mercado Pago Checkout Pro) | — | `DRAFT`, sin precio |

`plans` define precio, `pricing_status`, `payment_model` (`RECURRING`/`ONE_TIME`), `commitment_cycles`, `grace_period_days`, `monthly_lead_quota`, `ranking_boost_points` (máximo 2) y `visibility_score`; `plan_entitlements` modela capacidades/límites. `subscriptions` conserva estado, período, snapshot, cuenta de Mercado Pago usada (`provider_account`), `provider_subscription_id`, último/próximo cobro y fin del período de gracia. El mapeo plan interno → `preapproval_plan_id` de Mercado Pago vive en `private.plan_provider_mappings`, separado del código interno para poder tener un `preapproval_plan_id` distinto por cuenta sin tocar `plans`.

Estado actual: sólo `PROFESSIONAL_MONTHLY` tiene precio y `pricing_status = PUBLISHED`; los otros tres son códigos preparados sin precio (no se inventa un importe que el dueño no aprobó). Elegir un plan crea una selección `PENDING_PAYMENT` y, si Mercado Pago está configurado, redirige a un checkout real — pero la redirección nunca activa la suscripción por sí sola: sólo el webhook, tras reconsultar el estado real contra la API de Mercado Pago, la marca `ACTIVE`.

## Separación obligatoria de precios

- Los honorarios del servicio profesional no se publican en cards, perfil, filtros, búsqueda, DTOs ni ranking.
- `professional_directory` y los contratos PostgREST públicos excluyen los campos de honorarios; la firma del ranking no acepta presupuesto.
- Los planes `PROFESSIONAL_*` son una relación comercial B2P entre Universo Psi y el profesional. Sus importes, cuando se aprueben, no habilitan a reintroducir precios de consulta en la experiencia B2C.
- Un plan puede mejorar capacidades o aplicar el boost acotado documentado, pero nunca compra verificación, rating, opiniones ni elegibilidad.

## Gobernanza comercial del ranking

- La coincidencia de necesidad y restricciones domina el score.
- El impulso por plan es pequeño, versionado y medible.
- El bloque patrocinado se rotula como “Destacado” y admite como máximo tres perfiles que ya superaron filtros de compatibilidad.
- Rotación y límites de frecuencia evitan concentración permanente.
- No se venden credenciales, reseñas ni el badge de verificación.

Detalle del cálculo: [matching y ranking](matching.md).

## Convenios B2B

Una `Institution` puede tener uno o más `Agreement` con vigencia, servicios, cupos, condiciones, descuentos y profesionales participantes. Un convenio puede ser público, por código o privado. Sus métricas externas serán agregadas y anonimizadas; nunca exponen el motivo individual de consulta.

Modelos comerciales a validar con evidencia:

- abono por población cubierta;
- paquete de cupos o servicios;
- fee de implementación/curaduría;
- plan institucional recurrente.

No elegir uno de forma irreversible sin entrevistas, voluntad de pago y revisión fiscal/legal.

## Flywheel

1. Contenido y páginas útiles captan demanda orgánica.
2. Más demanda pertinente produce leads de mayor calidad.
3. Mejores resultados atraen y retienen profesionales.
4. Más oferta enfocada aumenta cobertura y calidad de la búsqueda.
5. Verificación, reseñas moderadas y respuesta mejoran confianza.
6. La cobertura habilita convenios y nuevos contenidos.

## Etapas comerciales

1. **Liquidez:** cubrir pocas necesidades prioritarias con oferta suficiente y leads reales.
2. **Retención B2P:** validar activación, calidad y disposición a pagar antes de sofisticar planes.
3. **Convenios:** probar un caso institucional con operación manual asistida.
4. **Escala:** automatizar cuotas, facturación, reporting y expansión geográfica.

## Riesgos y señales

| Riesgo | Señal temprana | Respuesta |
| --- | --- | --- |
| Oferta sin demanda | baja tasa de leads por perfil | enfocar categorías/SEO y no sobreadquirir oferta |
| Leads pobres o spam | alta tasa `SPAM`/baja respuesta | validación, rate limit y calificación mínima |
| Pay-to-win | caída de CTR/conversión en primeros resultados | limitar boost y auditar concentración |
| Mala retención | churn temprano | mejorar activación y valor, no prometer volumen |
| Verificación costosa | cola de revisión creciente | reglas por tipo y SLA operativo |

Mercado Pago queda detrás de un adaptador que soporta cuentas `personal`/`company` (namespaced por variables de entorno, seleccionable con `MERCADOPAGO_ACTIVE_ACCOUNT` sin tocar código ni datos históricos), checkout recurrente y de pago único, webhook con verificación de firma y reconciliación server-side idempotente, y período de gracia configurable ante un cobro rechazado. Hoy no hay ninguna credencial cargada (ni sandbox ni producción): el webhook responde 503 hasta que se configure una cuenta. Activar cobro real requiere precios aprobados para los planes que faltan, credenciales, pruebas E2E en sandbox y definición fiscal/comercial del dueño — nunca activar producción sin haber verificado sandbox primero.
