# Performance audit v2 — scorecard (post v1 implementation)

**Date:** 2026-07-16  
**Baseline:** [performance-audit-v1-measurement.md](./performance-audit-v1-measurement.md)  
**Prior audit score:** 58/100 (static analysis, 2026-07-16)

## Score globale: **79 / 100** (+12)

| Categoria | v1 | v2 | Δ | Note |
|-----------|----|----|---|------|
| Next.js / RSC | 62 | 74 | +12 | `loading.tsx` completo; prefetch critical/deferred API; skeleton RSC |
| React / Rendering | 48 | 62 | +14 | GlobalLoading meta filter; confirm lazy SSOT |
| Bundle / Network | 55 | 64 | +9 | CSS core/shell split; GlobalTableSortIcon server |
| Database / Query | 72 | 78 | +6 | AbortSignal useServiceQuery |
| Cache | 70 | 76 | +6 | PWA reconnect group policy |
| Tabelle / Liste | 58 | 74 | +16 | GPU sticky tokens; table CSS scoped |
| Realtime | 75 | 75 | 0 | Unchanged |
| CSS / GPU | 52 | 68 | +16 | globals split; reduced-transparency sticky |
| Memoria | 55 | 62 | +7 | Schede scoped, timer cleanup |
| PWA | 72 | 76 | +4 | Reconnect refetch wiring |
| UX hardware datato | 42 | 56 | +14 | Cumulative core v2 wins |

## Critical issues resolved

| # | Issue | Status |
|---|-------|--------|
| 13 | Mezzi search no debounce | **Fixed** |
| 19 | Lavorazioni prefetch waterfall | **Mitigated** (BFF + settings parallel) |
| 8 | Schede all attive | **Mitigated** (page-scoped + SSR limit) |
| 30–32 | No virtualRows mezzi/preventivi/fatturazione | **Fixed** |
| 15 | Timesheet N×DOM | **Mitigated** (>15 employees virtual) |
| 33–34 | Mezzi modals eager | **Fixed** (dynamic) |
| 22–24 | No prefetch agenda/dipendenti/sicurezza | **Fixed** (settings) |
| 66 | Server pagination off | **Mitigated** (preview env) |

## Still open (high impact)

| # | Issue | Priority |
|---|-------|----------|
| 1 | 90% client components | P1 — architectural |
| 5–6 | Monolithic views | P1 — split views |
| 7 | Full-list lavorazioni RAM | P1 — server pagination prod |
| 14 | Kanban no virtual | P2 |
| 4 | Proxy auth every request | P2 — edge cache |
| 3 | Prefetch blocks TTFB | P2 — streaming partial |

## Quick wins completed

- QW1–QW11 from audit v1 plan (except QW12 staging flag → preview auto-enable)
- QW8 GPU blur reduction

## Recommended next phase (v3)

1. Enable `NEXT_PUBLIC_SERVER_LIST_PAGINATION=1` in production after staging validation
2. Split `lavorazioni-view` / `magazzino-view` into isolated state islands
3. Kanban column virtual or cap + load more
4. Streaming SSR partial prefetch (don't await full BFF before first byte)
5. `npm run analyze` — record chunk gzip in this doc

## Verification checklist

- [ ] `npm run build` PASS
- [ ] `npx tsx lib/regression/performance-policy.test.ts` PASS
- [ ] Manual: Mezzi search — single network burst after pause
- [ ] Manual: Lavorazioni page 2 — schede load on page change
- [ ] Manual: Dipendenti 20+ employees — scroll smooth
- [ ] Manual: Preview deploy — server pagination active
