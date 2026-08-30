# Visión de producto

## Estado del vertical

| Estado | Alcance |
| --- | --- |
| **Implementado y desplegado** | Home corta con búsqueda inmediata; directorio → perfil → lead; filtros URL con scroll propio; publicación limitada a Psicología/Psicopedagogía; contrato público sin honorarios; alta profesional → credencial privada → revisión admin → publicación; dashboard básico. |
| **Retirado de la UX** | Test/cuestionario de matching, CTA de orientación y navegación a `/matching`; la ruta legacy redirige al directorio. |
| **Preparado, no activo** | Modelo de matching administrable dormido, planes/suscripciones B2P, artículos, convenios y proveedores externos. |
| **Pendiente** | Entrega real de email, precio/cobro de planes B2P, contenido/convenios productivos y expansión de consolas. |

## Norte

> Universo Psi es la red de psicólogos/as y psicopedagogos/as que orientan trayectorias, decisiones y transiciones profesionales.

La oportunidad es hacer que alguien que expresa “mi profesión ya no me representa” pueda buscar de inmediato, comparar criterios relevantes y contactar a un profesional orientador sin atravesar un recorrido largo ni conocer previamente el nombre técnico del servicio.

## Problema

- Las necesidades mezclan identidad, educación, carrera, empleabilidad e industria.
- La oferta de orientación confiable está fragmentada y resulta difícil comparar psicólogos/as y psicopedagogos/as por modalidad, ubicación, enfoque y trayectoria profesional.
- Los títulos profesionales no explican bien qué situación puede acompañar cada persona.
- Comparar credenciales, modalidad, enfoque, disponibilidad, valoraciones y opiniones requiere confianza.
- Profesionales valiosos carecen de visibilidad, posicionamiento y demanda predecible.

## Públicos y propuesta de valor

| Público | Necesidad | Valor de Universo Psi |
| --- | --- | --- |
| Persona (B2C) | Encontrar ayuda confiable sin perderse | Búsqueda inmediata por situación, filtros claros, comparación y contacto gratuito. |
| Profesional (B2P) | Captar demanda y construir autoridad | Perfil, visibilidad, leads, verificación, contenido, analítica y red. |
| Institución (B2B) | Ofrecer acompañamiento a una comunidad | Convenios configurables, oferta curada y métricas agregadas. |

## Experiencia central

1. La búsqueda por texto y “Profesional orientador” aparece en la primera pantalla.
2. La persona llega al directorio y refina resultados con filtros que conservan su estado en la URL y pueden scrollear de forma independiente.
3. Compara cards alineadas de psicólogos/as y psicopedagogos/as con modalidad, ubicación, disponibilidad, rating y opiniones; nunca honorarios ni cantidades de años de experiencia. La trayectoria se presenta de forma narrativa en el perfil.
4. Abre un perfil, ingresa o crea su cuenta y envía un contacto con los datos mínimos. El contacto no debe quedar escondido detrás de contenido ornamental.
5. El profesional gestiona el lead en su dashboard; recibir un email real depende de Resend configurado y verificado. La relación continúa fuera de la plataforma en el MVP.

## Principios de producto

- **Buscar antes que explicar.** La taxonomía parte del lenguaje de la persona y la acción principal está visible desde el inicio.
- **Orientar sin test ni diagnóstico.** El catálogo y los filtros ayudan a explorar; no producen conclusiones clínicas ni decisiones automáticas.
- **Confianza demostrable.** “Verificado” exige revisión humana según reglas de cada tipo profesional.
- **Catálogo enfocado.** Sólo Psicología y Psicopedagogía son publicables; “Profesional orientador” funciona como etiqueta paraguas, no como un tercer tipo.
- **Sin honorarios públicos.** Los precios de servicios no aparecen en perfiles, filtros, ranking ni contratos públicos. Los planes B2P son un circuito comercial independiente.
- **Calidad antes que volumen.** No crear páginas SEO, perfiles ni contenidos pobres para inflar inventario.
- **Oferta comparable, no uniforme.** Credenciales y criterios varían por disciplina.
- **Transparencia comercial.** El pago no reemplaza la relevancia.
- **Humano y adulto.** Sin promesas de éxito, pasión o transformación garantizada.
- **Visuales con procedencia.** Nunca fotografías generadas por IA; sólo recursos propios o licenciados con origen registrado.

## Relación SENDA / Universo Psi

SENDA es un servicio boutique, de mayor intervención y metodología propia. Universo Psi es una plataforma escalable de profesionales independientes. La firma “Una iniciativa de Senda” y cualquier navegación cruzada deben poder cambiarse por configuración; no se asume una arquitectura de marca definitiva.

## Vertical MVP

El MVP termina un circuito real, no cincuenta módulos decorativos:

- home corta `search-first`, directorio Supabase, filtros URL con scroll propio, perfil y lead persistido con notificación en outbox;
- sólo Psicología/Psicopedagogía publicables; valoraciones/opiniones aprobadas visibles y honorarios excluidos del contrato público;
- cuestionario retirado; ruta `/matching` redirigida y modelo administrable conservado como infraestructura dormida;
- registro, onboarding, credenciales, revisión y dashboard profesional;
- roles y administración básica;
- planes `DRAFT` y selección `PENDING_PAYMENT`, sin cobro;
- contenidos y convenios demo rotulados, con esquemas preparados;
- SEO, analítica, datos demo, seguridad y tests críticos.

La comunidad profesional, derivaciones, IA y dashboards institucionales avanzados son extensiones posteriores.

## Métricas

**North star:** contactos válidos enviados a profesionales compatibles.

Métricas de diagnóstico:

- visita → búsqueda, búsqueda → perfil y perfil → ingreso/contacto;
- perfil → inicio de contacto → lead válido;
- profesional iniciado → perfil enviado → verificado;
- tasa de respuesta, spam y lead calificado;
- activación B2P, MRR, ARPU, churn y LTV;
- cobertura de oferta por necesidad, modalidad y ubicación;
- diversidad de exposición y concentración del ranking.

La conversión final fuera de plataforma sólo se mide con consentimiento y señales confiables; no se inventa.

## Guardrails

- No diagnóstico, consejo clínico ni decisión de carrera presentada como verdad.
- No exposición pública de documentación, domicilio, teléfono privado o identificadores innecesarios.
- No garantía de leads, empleo, resultados ni ingresos.
- No reseñas auto-publicadas ni verificación automática por completar un formulario.
- No test/cuestionario de orientación ni copy que prometa una recomendación diagnóstica.
- No honorarios profesionales en la superficie pública.
- No fotografías generadas por IA.
- Textos legales y de privacidad son borradores hasta revisión profesional.
