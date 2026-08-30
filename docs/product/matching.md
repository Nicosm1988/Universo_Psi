# Búsqueda y ranking explicables

## Estado actual

| Estado | Alcance |
| --- | --- |
| **Implementado** | `rank_professionals` ordena el directorio con filtros, límites, `rank-v1`, componentes, razones, boost máximo de 2 y desempate estable. Sólo participan perfiles publicables de Psicología/Psicopedagogía y el presupuesto no afecta el resultado. |
| **Retirado de la UX** | El flujo local de cuatro preguntas, sus CTA y la navegación a matching. `/matching` es una ruta legacy que redirige permanentemente a `/profesionales` y no integra el sitemap. |
| **Preparado, dormido** | `matching_questions`, `matching_options`, `matching_rules`, sesiones/respuestas/recomendaciones y RPC `explain_matching`. Se conservan para preservar el historial técnico, pero ninguna pantalla los consulta ni escribe. |

“No hay test” significa que la persona usuaria no completa un cuestionario de orientación. No significa que falten pruebas automatizadas: el ranking, la elegibilidad pública y los contratos de datos se validan con suites unitarias, SQL/PostgREST, integración y Playwright.

## Recorrido activo

1. La home presenta una búsqueda por texto y el selector “Profesional orientador” en la primera pantalla.
2. La persona llega al directorio con filtros representados en query params compartibles.
3. Selects y checks refinan automáticamente; el panel puede scrollear de forma independiente del listado y no ofrece presupuesto/precio.
4. Las cards alinean los mismos bloques comparables: identidad, enfoque, etiquetas, modalidad/ubicación y disponibilidad/valoración. La trayectoria narrativa queda en el perfil, sin publicar cantidades de años de experiencia.
5. La persona abre un perfil, ingresa o crea cuenta y envía sus datos de contacto al profesional.

No se genera un diagnóstico ni una recomendación cerrada. La orientación surge de criterios explícitos de búsqueda, contenido profesional verificable, rating y opiniones aprobadas.

## Entradas activas

- texto libre acotado;
- necesidad o situación;
- tipo profesional: sólo `psychology_orientation` o `psychopedagogy`;
- servicio, especialidad y audiencia/etapa;
- modalidad, ubicación e idioma;
- disponibilidad, verificación y orden explícito.

Honorarios, presupuesto y rango de precio no forman parte del contrato público, de los filtros ni del cálculo. La firma SQL de `rank_professionals` ya no acepta `p_budget_max`.

## Pipeline del ranking

1. Validar y normalizar filtros contra IDs del catálogo activo.
2. Aplicar restricciones duras: perfil `PUBLISHED`, tipos soportados exclusivamente, credencial regulada verificada y aceptación de leads.
3. Calcular relevancia base de 0 a 100 sólo con señales de encaje.
4. Aplicar modificadores operativos/comerciales acotados.
5. Rotar empates para distribuir exposición.
6. Generar razones desde coincidencias reales.

## Score `rank-v1`

La relevancia cruda vale 0–100 y luego aporta hasta 78 puntos:

| Coincidencia | Peso crudo |
| --- | ---: |
| Necesidades | 47 |
| Tipo profesional + servicio + especialidad | 20 |
| Modalidad + ubicación | 15 |
| Audiencia + etapa de carrera | 10 |
| Idioma + industria | 8 |

El total visible queda en 0–100:

| Componente | Máximo |
| --- | ---: |
| Relevancia normalizada | 78 |
| Disponibilidad | 6 |
| Verificación revisada | 5 |
| Completitud | 4 |
| Respuesta | 2,5 |
| Actividad | 1,5 |
| Plan | 2 |
| Rotación determinística | 1 |

El plan nunca rescata una incompatibilidad. La rotación se deriva de perfil + fecha + firma de búsqueda, por lo que es estable dentro de la ventana diaria. `is_sponsored` no altera el score: habilita un bloque rotulado de hasta tres perfiles compatibles; después continúa el orden orgánico.

## Explicación al usuario

El directorio puede mostrar razones concretas derivadas de filtros, por ejemplo: “acompaña la necesidad seleccionada”, “ofrece la modalidad elegida” o “credenciales revisadas por Universo Psi”. No presenta porcentajes de precisión ni frases como “necesitás un psicólogo”, “tu vocación es…” o “esta es la mejor carrera”.

La explicación complementa la decisión de la persona; el CTA principal sigue siendo abrir el perfil y contactar.

## Elegibilidad y confianza

- Sólo perfiles con al menos un tipo soportado y ningún tipo no soportado pueden enviarse a revisión o publicarse.
- Como Psicología y Psicopedagogía son tipos regulados, el perfil público exige verificación vigente.
- Un perfil suspendido o que no acepta leads no entra al ranking.
- El badge se muestra únicamente con `verification_state = VERIFIED` y refleja una revisión real.
- Las reseñas cuentan y se muestran sólo si están `APPROVED`; no reemplazan relevancia.
- Ningún honorario se proyecta desde `professional_directory`, DTOs, filtros, perfiles o componentes de ranking.

## Fairness

- **Implementado:** boost de plan máximo 2, hasta tres patrocinados compatibles, rótulo visible y rotación determinística diaria por perfil/contexto.
- **Preparado:** `ranking_version`, desglose y señales separadas permiten explicar y comparar cambios.
- **Pendiente:** límite de frecuencia longitudinal, métricas por necesidad/ubicación, auditoría de concentración/CTR/conversión por posición-plan y comparación offline antes de cambiar pesos.

## Infraestructura de matching dormida

`matching_questions`, `matching_options` y `matching_rules` conservan el cuestionario y sus pesos históricos por `rule_version`. `matching_sessions`, `matching_answers`, `matching_recommendations`, `private.matching_session_tokens` y `explain_matching` permanecen en el esquema, sin consumidor en la experiencia pública.

No se crean sesiones, no se guardan respuestas y no se ejecuta `explain_matching` en el recorrido actual. Los eventos `matching_started` y `matching_completed` pueden permanecer en la allowlist histórica, pero la UI retirada no los emite. Reactivar esta capacidad exige una nueva decisión de producto, revisión de privacidad y diseño de una experiencia que no vuelva a introducir un test no solicitado.

## Pruebas automatizadas

Casos mínimos de regresión:

- home y header no muestran CTA ni navegación de cuestionario;
- `/matching` redirige a `/profesionales` y no aparece en sitemap;
- sólo Psicología/Psicopedagogía cruzan `professional_directory` y `rank_professionals`;
- un perfil con cualquier tipo no soportado no puede enviarse a revisión ni publicarse;
- la firma pública del ranking no acepta presupuesto;
- vista, RPC, DTO, cards, filtros y perfil no exponen honorarios;
- valoraciones y opiniones aprobadas siguen visibles;
- misma entrada + misma versión produce el mismo desglose dentro de la ventana de rotación;
- el boost comercial no supera restricciones duras;
- filtros URL y scroll propio funcionan en desktop y móvil;
- las filas comparables de cards mantienen alineación sin perder accesibilidad.
