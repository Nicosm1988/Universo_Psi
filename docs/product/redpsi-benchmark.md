# Benchmark funcional: RedPsi

## Estado

- **Implementado:** desarrollo clean-room, copy propio y seed marcado `is_demo`.
- **Decisión vigente:** Universo Psi no usa fotografías generadas por IA. La interfaz prioriza tipografía, formas, iconografía y evidencia real.

## Alcance

Este documento registra únicamente aprendizajes funcionales aportados en el brief del proyecto. **Universo Psi se diseña e implementa de forma original, clean-room y desde cero.** No se necesita ni se autoriza scraping de RedPsi.

RedPsi se usa como referencia conceptual de un directorio/marketplace que conecta demanda con profesionales y monetiza principalmente visibilidad y generación de leads para la oferta. La referencia se limita al principio funcional de que la búsqueda debe aparecer rápido; no habilita copiar su interfaz, taxonomía, copy ni datos.

## Qué se puede estudiar

- recorrido búsqueda → filtro → perfil → contacto;
- acceso inmediato al buscador y reducción de pasos hasta el primer resultado;
- taxonomías de oferta y demanda;
- mecanismos generales de confianza, reputación y verificación;
- adquisición B2C/B2P/B2B;
- suscripciones, convenios, contenido y SEO como patrones de negocio;
- métricas genéricas de un marketplace de servicios.

Son patrones comunes del mercado, no especificaciones para replicar una implementación.

## Qué está prohibido

- Copiar código, HTML, CSS, JavaScript, textos, artículos o estructura visual 1:1.
- Descargar o reutilizar fotos, iconos, logo, identidad, nombres internos o trade dress.
- Copiar datos, perfiles o información de profesionales reales.
- Hacer scraping automatizado, evadir restricciones o buscar código no público.
- Presentar contenido derivado como propio o construir una réplica estética.

## Diferenciación obligatoria

Universo Psi se organiza como una búsqueda directa de profesionales orientadores. Agrega:

- una home deliberadamente corta, sin cuestionario, con búsqueda y CTA de conversión en la primera pantalla;
- una franja compacta y accesible de profesionales/opiniones con controles propios, iniciales en lugar de fotografías y copy original sobre qué es Universo Psi;
- filtros claros y estado compartible en la URL;
- panel de filtros con scroll propio y un listado horizontal compacto cuyos bloques comparables se alinean entre resultados;
- catálogo público limitado a Psicología/Psicopedagogía bajo la entrada “Profesional orientador”;
- ratings y opiniones moderadas, sin publicar honorarios profesionales;
- reglas de verificación diferentes por tipo profesional;
- ranking transparente con fairness y patrocinio visible;
- foco específico en trayectorias, empleabilidad y transiciones;
- arquitectura para convenios y red profesional interna;
- identidad humana/editorial propia de SENDA, sin clonar un portal clínico.

## Procedimiento clean-room

1. Convertir el brief funcional en capacidades abstractas.
2. Diseñar taxonomía, copy, flujos, componentes y modelo de datos originales.
3. Usar únicamente recursos gráficos propios o licenciados; excluir fotografías generadas por IA.
4. Crear seed con personas y datos inequívocamente ficticios; marcar `is_demo` cuando aplique.
5. Revisar antes de publicar que no exista similitud sustancial en copy, composición, identidad o dataset.
6. Registrar fuente/licencia de cualquier recurso externo permitido.

## Checklist de originalidad

| Estado | Control |
| --- | --- |
| **Implementado** | No hay scraper/importador de RedPsi en el repositorio; copy, diseño, tokens y componentes fueron creados para Universo Psi. |
| **Implementado** | Los 16 perfiles y demás datos demo se declaran ficticios mediante `is_demo` y rótulos visibles. |
| **Implementado** | Ranking y patrocinio siguen reglas propias y transparentes. |
| **Implementado y verificado en producción** | La experiencia es `search-first`, no presenta test de orientación, no publica honorarios y restringe el catálogo a Psicología/Psicopedagogía. El release/smoke remoto está registrado en despliegue. |
| **Pendiente recurrente** | Revisar que nuevas taxonomías, textos y assets mantengan origen propio/licencia registrada y no introduzcan similitud sustancial. |

Si una investigación competitiva futura requiere material no incluido en el brief, debe limitarse a observación humana legítima de información pública, documentar sólo aprendizajes abstractos y pasar revisión legal cuando exista duda.
