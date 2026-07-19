# Performance Bundle Dependency Map (Sprint 0)

**Source:** `npm run analyze` → `.next/diagnostics/route-bundle-stats.json`  
**Baseline:** 1793.6 KB first-load JS, 443.3 KB vendor (2026-07-17 governance)  
**Post-v3 (2026-07-19, git `91a7007`):** **1870.3 KB** first-load JS (+76.7 KB), 443.3 KB vendor — **Caso A** (runtime ↓, bundle ↑). Vedi [`post-v3-results.md`](post-v3-results.md).

## Shell critical path

```
app/layout.tsx
  └─ QueryProvider (TanStack)
  └─ (gestionale)/layout.tsx
       └─ AppProvidersGestionale (12+ providers)
            └─ AppShell
                 └─ lazy route views (per-page chunks)
```

## Lazy route chunks (`lazy-route-views.tsx`)

| Chunk | Route |
| ----- | ----- |
| `DashboardViewLazy` | `/dashboard` |
| `LavorazioniViewLazy` | `/lavorazioni` |
| `ClientLavorazioniViewLazy` | `/lavorazioni-clienti` |
| `MagazzinoViewLazy` | `/magazzino` |

## Dashboard nested lazy

- `DashboardControlTowerLayout` → per-widget `dynamic()`
- `CalendarV2Section` → **toggle utente** (Sprint 1)
- `useReportLiveData` solo se calendario aperto

## Lavorazioni heavy imports (post-RPC)

- `lavorazioni-view.tsx` monolith (~2700 LOC) — Sprint 2 state split
- Kanban: isolated `lavorazioni-kanban-lazy.tsx`
- Schede modal: `dynamic({ ssr: false })`

## Sprint 2 shell targets

| Module | Azione |
| ------ | ------ |
| `DeferredGestionaleBridges` | `requestIdleCallback` defer |
| `ObservabilityProvider` | lazy dev/prod |
| `RealtimePack` | post-interactive |

Goal JS: **≤1500 KB**, min acceptable **≤1600 KB**
