# Agentes para habilitar pagos

Instalación de proyecto: `.codex/agents/*.toml`. Cada archivo define un agente nativo de Codex con `name`, `description` y `developer_instructions`, según la [documentación oficial](https://learn.chatgpt.com/docs/agent-configuration/subagents#custom-agents). Heredan el modelo, el razonamiento y los permisos de la sesión. No requieren otro proveedor ni instalar dependencias de la aplicación.

## Uso

Abrí una nueva sesión de Codex en este repositorio para que descubra las definiciones. Podés pedir:

> Usá los agentes de pagos de Universo Psi para preparar la habilitación de Mercado Pago. Delegá la revisión de checkout a psi_pagos, los contratos de persistencia a psi_datos_pagos y la configuración por ambiente a psi_release_pagos. Coordiná las correcciones sin superponer archivos y después pedí a psi_qa_pagos que valide el resultado. Completá lo posible con los accesos existentes e indicá los insumos externos que falten.

La instalación deja instrucciones reutilizables; no crea procesos permanentes ni activa cobros automáticamente. Las herramientas de una sesión pueden no exponer selección de roles por nombre: en ese caso el coordinador lee el TOML correspondiente y pasa sus instrucciones al subagente, preservando los límites de la sesión.

## Responsabilidades

| Agente | Trabajo | Entrega |
| --- | --- | --- |
| `psi_pagos` | Checkout, firma, webhooks, acciones y mensajes de suscripción | Cambios de aplicación y escenarios que QA debe verificar |
| `psi_datos_pagos` | RPC, transiciones, idempotencia, permisos y migraciones | Contratos compatibles y pruebas de integridad/acceso |
| `psi_qa_pagos` | Pruebas unitarias, integración y recorrido en navegador/sandbox | Resultados por ambiente, fallos y casos no ejecutados |
| `psi_release_pagos` | Credenciales por ambiente, recursos de destino y release autorizado | Configuración verificada, evidencia operativa y recuperación |

El hilo principal conserva el objetivo y las decisiones del usuario. Las inspecciones independientes pueden ejecutarse en paralelo; las escrituras sobre un mismo archivo, los cambios de contrato y los despliegues se coordinan en secuencia. No es necesario ejecutar los cuatro agentes para cada tarea.

## Punto de partida: revisión local del 11/09/2026

Se revisó código; no se verificaron credenciales remotas ni se ejecutó un cobro. El repositorio incluye checkout recurrente y de pago único, webhook por cuenta y reconciliación. La documentación histórica contiene afirmaciones contradictorias: no usarla como prueba del estado de producción.

Hallazgos para reproducir y resolver durante la habilitación:

- `src/lib/subscriptions/checkout.ts`: se ignoran errores devueltos por las RPC de enlace del checkout; comprobar que un fallo impida devolver una redirección como exitosa y que el reintento sea recuperable.
- `supabase/migrations/20260830020000_add_mercadopago_subscription_support.sql`: las funciones de eventos pueden consumir una notificación sin encontrar todavía la suscripción. Probar webhook anterior al enlace y corregir con una migración nueva si se confirma.
- `src/app/api/webhooks/mercado-pago/[account]/route.ts` y `src/lib/integrations/payments.ts`: verificar validación del cuerpo, replay, metadatos no firmados, identidad de cuenta y vínculo con el snapshot de importe/moneda. Contrastar la política de timestamps/reintentos con Mercado Pago antes de implementarla.
- No se encontraron pruebas unitarias dedicadas al adaptador/firma/webhook; el flujo autenticado existente llega a `PENDING_PAYMENT`. Eso no demuestra cobro ni activación.

No se encontró `.env.local`, variables de proveedor en el proceso ni enlace `.vercel/project.json` en esta sesión. Eso no demuestra ausencia de credenciales en Vercel. La sesión de Vercel y los proyectos remotos requieren verificación antes de cualquier conclusión operativa. El acceso local a Docker devolvió permiso denegado durante esta inspección.

## Evidencia requerida para habilitar

1. Identificar el proyecto y despliegue de Universo Psi, la base asociada y la cuenta que cobra. Verificar configuración sin exponer valores secretos. Usar los nombres actuales de `.env.example` y `src/lib/env/server.ts`.
2. Resolver y probar las brechas del flujo de pagos y persistencia. Habilitar sólo planes con precio/condiciones aprobados; no hace falta publicar los demás planes `DRAFT` para habilitar el mensual.
3. Validar en sandbox selección → checkout → notificación auténtica → reconciliación → estado persistido/beneficios. Cubrir rechazo, duplicado, concurrencia y cancelación. Un retorno del navegador o el simulador de webhooks no reemplazan esa prueba.
4. Preparar y ejecutar el release dentro de la autorización vigente. Registrar versión, ambiente, pruebas, resultados y pendientes. Cualquier prueba con cargo real necesita que el usuario haya autorizado ese cargo concreto.

Un rollback del sitio no cancela débitos recurrentes ya autorizados en Mercado Pago. La recuperación debe contemplar nuevos checkouts, suscripciones existentes y continuidad de la reconciliación por separado.

## Verificación del proyecto

Usar Node 24 y npm. En el equipo inspeccionado está disponible `/home/ts/.nvm/versions/node/v24.15.0/bin`; ese path es local, no un requisito portable.

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npx playwright test
```

El coordinador ejecuta las verificaciones sobre el resultado integrado. Evitar builds simultáneos. `playwright.config.ts` usa fixtures con `UNIVERSO_PSI_TEST_MODE=true`; sus resultados verifican la UI, no pagos reales. `npm run test:e2e:auth` y `npm run test:integration` requieren la base aislada y variables de prueba indicadas en sus configuraciones; no apuntarlos a producción.

Informar separadamente: configuración de agentes válida, pruebas locales, sandbox y producción. Si falta acceso, el escenario queda **no ejecutado**, nunca aprobado por inferencia.

### Resultado de la instalación (11/09/2026)

- Cuatro TOML instalados, parseados y comprobados contra sus definiciones; referencias de coordinación válidas y revisión independiente de instrucciones aprobada.
- Node 24.15.0: lint y typecheck aprobados; 4 archivos de pruebas y 38 tests aprobados.
- `npm run build`: falló al procesar CSS con Turbopack por `binding to a port: Operation not permitted`; el reintento con escalación devolvió la misma restricción.
- Smoke Playwright de home, escritorio/móvil: casos descubiertos, pero no ejecutados porque el servidor no encontró un build de producción completo.
- No se ejecutaron cargos, checkout sandbox ni despliegues. La carga automática de los roles se comprueba al iniciar una nueva sesión del cliente; en esta sesión se validaron los archivos y se delegaron las revisiones con las herramientas disponibles.
