# UI Regression Audit — Post Performance Optimization

Audit e chiusura regressione visiva introdotta dallo **split CSS Performance Core v2** (Wave 4), non da degradazione runtime delle performance.

## Root cause

| Sintomo | Causa reale |
|---------|-------------|
| Sidebar senza active/hover/collapse | Regole in `globals-gestionale-shell.css` non caricate o test che leggevano `globals.css` (solo re-export di core) |
| Toolbar senza superficie/blur | `.cab-page-toolbar-surface` nello shell CSS |
| ShellCard piatta | `.cab-shell-card` nello shell CSS |
| Chevron kanban mobile incoerente | Bypass SSOT (`GestionaleCollapsibleChevronIcon` invece di `GestionaleCollapsibleHeader`) |

### Contratto CSS post-split

| Area | File | Importato da |
|------|------|--------------|
| Token globali, Tailwind, flex-safe, toast, textarea | `app/globals-core.css` | `app/layout.tsx` |
| Sidebar, toolbar, shell-card, scroll shell | `app/globals-gestionale-shell.css` | `app/(gestionale)/layout.tsx` |
| Legacy entry | `app/globals.css` → `@import "./globals-core.css"` | Non usare per assert shell |

**Login, auth, onboarding e pagine pubbliche** caricano solo `globals-core.css` — voluto per bundle lean.

## Fix applicati (per priorità)

### P1 — CSS wiring

Verificato: `app/(gestionale)/layout.tsx` importa `../globals-gestionale-shell.css` **prima** dei componenti. `app/layout.tsx` importa solo `./globals-core.css`.

### P2 — Regression policy tests

Aggiornati i test al contratto split:

- `sidebar-layout-policy.test.ts`
- `ui-reliability-policy.test.ts`
- `flex-containment-policy.test.ts`
- `flex-system-policy.test.ts`
- `flex-system-definitive.test.ts`
- `visual-clip-remediation-policy.test.ts`
- `gestionale-textarea-ssot-audit.test.ts`
- `compatibility-policy.test.ts`
- `body-scroll-lock-manager.test.ts`
- `performance-policy.test.ts` (+ assert layout import)

Nuovo: `gestionale-shell-css-wiring-policy.test.ts` (wiring sorgente + audit opzionale `.next`).

### P2b — Audit build produzione

`gestionale-shell-css-wiring-policy.test.ts` ispeziona `.next/static/css` quando presente:

- Presenza `.cab-sidebar-nav-row` e `.cab-page-toolbar-surface`
- Nessuna duplicazione anomala delle regole toolbar

### P3 — Collapsible SSOT

`lavorazioni-kanban-mobile-board.tsx`: `GestionaleCollapsibleHeader` (`form` + `formFlat`) al posto del chevron custom. `FiltersChevron` in toolbar non toccato.

### P4 — Toolbar token

`lavorazioni-page-toolbar.tsx`: meta testuali `text-zinc-500` → `dsTypoSmall`.

## Risultato atteso

| Elemento | Atteso |
|----------|--------|
| Sidebar | Active state, hover, collapse, indicator |
| Toolbar | Superficie `cab-page-toolbar-surface` + blur |
| ShellCard | Border/background token |
| Collapsible kanban | Chevron SSOT (`GestionaleCollapsibleChevronBox`) |
| Bundle | Nessun aumento significativo |
| Login/public | Nessun CSS gestionale shell |

## Esplicitamente non fatto

- Shell CSS in `app/layout.tsx` o `globals.css`
- Classi inline nei componenti per compensare CSS mancante
- Sidebar styles duplicati inline
- Modifiche al Design System per mascherare import mancante
- Redesign sidebar/toolbar
- Tocco a `FiltersChevron`

## Rischi residui

| Rischio | Mitigazione |
|---------|-------------|
| HMR stale in dev | Hard refresh / restart dev server |
| Deploy senza shell layout | Policy assert + build audit |
| Doppio border ShellCard + PageToolbar | Pre-esistente; fuori scope |

## Verifica

```bash
npx tsx lib/regression/gestionale-shell-css-wiring-policy.test.ts
npx tsx lib/regression/sidebar-layout-policy.test.ts
npx tsx lib/regression/ui-reliability-policy.test.ts
npx tsx lib/regression/performance-policy.test.ts
npm run build
npm run ci:tsc
```
