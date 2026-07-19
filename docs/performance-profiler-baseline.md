# Performance Profiler Baseline (Sprint 0)

**Status:** Measurement Lock — registrare prima di ogni fix Sprint 1+

## Scenari obbligatori

| Route | Scenario | Metriche |
| ----- | -------- | -------- |
| `/lavorazioni` | cold open | commit count, max duration, top 5 components |
| `/lavorazioni` | cambio filtro avanzato | cascade depth, `LavorazioniView` % |
| `/lavorazioni` | ricerca post-debounce 320ms | `needsFullSchedeFetch` impact |
| `/lavorazioni` | tab attive/archivio | archivio mount cost |
| `/lavorazioni` | kanban drag | DnD re-render scope |
| `/dashboard` | cold open | Control Tower widget cascade |
| `/magazzino` | search keystroke | `filteredSorted` recompute |
| `/lavorazioni-clienti` | cold open | barrier + hydration |

## Metodo

1. `NEXT_PUBLIC_PERF_DIAGNOSTICS=1 npm run dev`
2. React DevTools Profiler → Record
3. Eseguire scenario → Stop → esportare commit duration

## Target proxy (dev)

| Scenario | commit duration target |
| -------- | ---------------------: |
| Filtro lavorazioni | <50 ms |
| Search magazzino (indexed) | <30 ms @500 righe |
| Kanban drag | <16 ms frame |

## Baseline numerica skeleton (dev 1440)

Vedi [`performance-regression-matrix.md`](performance-regression-matrix.md).

## Post Sprint 1 atteso

- Lavorazioni RPC: meno commit su data merge (lista paginata)
- Dashboard KPI: zero fetch client header al mount
- Portale: meno dehydrated payload (no archivio SSR)
