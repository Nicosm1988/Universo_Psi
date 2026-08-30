<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Universo Psi — reglas del proyecto

- Leé `docs/UNIVERSO_PSI_MASTER.md` y la referencia específica antes de ampliar alcance.
- La interfaz, el copy y los estados operativos se escriben en español claro de Argentina.
- Usá Node 24 y npm. Mantené TypeScript estricto, Server Components por defecto y Client Components sólo donde haya interacción real.
- No importes `src/lib/env/server.ts`, la secret key ni clientes administrativos desde componentes cliente.
- En Supabase SSR creá un cliente por request; para identidad confiable usá `auth.getClaims()` y aplicá cookies/headers de refresh desde `src/proxy.ts`.
- Toda tabla expuesta requiere grants mínimos y RLS explícita. PII, credenciales, pagos, auditoría, rate limits y outbox permanecen en `private`.
- Las migraciones aplicadas son inmutables: agregá una migración nueva para cualquier cambio posterior.
- Los Server Actions y Route Handlers son endpoints públicos: validá input con Zod y repetí autorización en el punto de escritura.
- Conservá el sistema visual editorial existente, foco visible, WCAG AA, targets táctiles de 44 px y `prefers-reduced-motion`.
- No agregues scraping ni copies contenido de RedPsi; el benchmark es clean-room.
- Antes de entregar ejecutá `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` y los flujos Playwright pertinentes.
- No afirmes que pagos, correo, observabilidad o proveedores opcionales están activos si sus credenciales y smoke tests no están verificados.
