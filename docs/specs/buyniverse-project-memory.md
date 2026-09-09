---
name: buyniverse-project
description: "Buyniverse — React19+Vite+TS marketplace freelance + ERP/CFDI export de AI Studio en C:\\git\\websites\\buyniverse; git'd a jechaviz/buyniverse rama main"
metadata: 
  node_type: memory
  type: project
  originSessionId: 4352e1a9-3a8d-4c73-ba3c-f5a0dfe52d68
---

Buyniverse = portal React 19 + Vite + TypeScript (marketplace de talento freelance + ERP ligero mexicano con facturación CFDI 4.0/SAT, asistido por Gemini), **exportado de Google AI Studio** (app id 4204b8d5…). ~24.8k LOC, 450 archivos. En `C:\git\websites\buyniverse`.

Arquitectura: un solo `useReducer` global (store/reducer.ts, ~50 acciones) sembrado de data/mockData.ts; **sin backend** — ahora persiste estado en localStorage (clave `buyniverse-state:v1`, versionada). Tailwind vía CDN + importmap esm.sh (corre sin bundle); además build Vite real. i18n es(default)/en. IA en services/geminiService.ts (gemini-2.5-flash: genera vacantes, claves SAT, widgets dashboard).

2026-06-30: examiné + arreglé findings del export y lo subí a git:
- El export **nunca tuvo @types/react** → nunca chequeó tipos; agregué los tipos + gate `tsc --noEmit && vite build` + limpié 11 errores latentes + 1 syntax error que rompía build (FreelancerDashboard `<div>` sin cerrar). Build verde, typecheck 0.
- Branding GigFinder→Buyniverse, doble-mount de index.tsx eliminado, README reescrito, .env.example.
- Borré duplicado huérfano components/form/InvoiceForm.tsx (el activo es components/InvoiceForm.tsx, vía features/invoice/index.ts).

Remoto: **github.com/jechaviz/buyniverse** (HTTPS + wincred). OJO: el remoto ya traía historia NO relacionada (rama `master` + ramas `codex/*`/`b11`/`sadique` de un proyecto PHP/Laravel). Publiqué en rama **`main`** (orphan, no toqué nada existente) — pendiente con el usuario si quiere que `main` sea default o reconciliar con `master`. Preview server "buyniverse" añadido a C:\git\.claude\launch.json (npm dev, puerto 3000).

2026-06-30 (2): revisión OWASP con 20 workers (Workflow + verificación adversarial: 60→51 hallazgos, 2 High, ningún Critical) y luego 20 agentes aplicaron TODOS los fixes corregibles en código (particionados por archivos disjuntos para evitar colisiones): RequireRole en /admin/issuers, guards de rol en reducer + ownership en RELEASE_MILESTONE_PAYMENT/InvoicesPage/ContractPage, secretos CSD/PAC excluidos de localStorage (replacer), PII→ficticia, CSV formula-injection, SAT-codes validados + logs DEV-gated en geminiService, CONSUME_FOLIO atómico, saneo numérico CFDI, **Tailwind migrado de CDN a build + importmap esm.sh eliminado** (nuevos tailwind/postcss/autoprefixer + index.css; ThemeContext fija --color-primary en runtime=acento azul, el rojo de index.css es solo fallback), headers CSP/X-Frame vía public/_headers+vercel.json, safeHref+noopener, SECURITY.md. Verificado tsc/build/preview OK (guard admin redirige). El ÚNICO High no aplicado = GEMINI_API_KEY en bundle (requiere proxy backend = decisión de despliegue, documentado). Commit cb4344f.

Nota seguridad: app 100% cliente, GEMINI_API_KEY se hornea en el bundle (expuesta en deploy) — para prod necesita proxy/backend. Persistencia y multi-usuario reales aún por decidir (encaja con patrón nodeless+PocketBase o shim PHP+V de otros [[realstate-nodeless-clone]]/[[micasitadigna-project]]).
