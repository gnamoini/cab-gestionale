# Performance v5 — Program Summary

**Date:** 2026-07-17  
**Scope:** 12 pagine gestionale (page-local)

## Waves completate

| Pagina | Interventi v5 principali |
|--------|------------------------|
| Agenda | BFF sessions SSR, lazy Gantt/DnD/sidebar, list virtual, modal gate |
| Lavorazioni | Lazy confirm dialogs + modal gate |
| Magazzino | Modal gate filtri/log |
| Impostazioni | Lazy section loaders espansi + HEAVY ids |
| Portale | Archivio list query on-demand |
| Preventivi | (v3 virtualRows) — policy invariata |
| Dipendenti | (v3 grid virtual rows) — policy invariata |
| Mezzi | (v3 hub dynamic) — policy invariata |
| Report | Live data query gating cold (mezzi/mov/manual off) |
| Dashboard | Header KPI queries estratte in hook dedicato |
| Fatturazione | (v3 lazy sections) — policy invariata |
| Sicurezza | Lazy users tab panel |

## Verifica

```bash
npm run build
npx tsx lib/regression/agenda-perf-policy.test.ts
npx tsx lib/regression/lavorazioni-perf-policy.test.ts
npx tsx lib/regression/magazzino-perf-policy.test.ts
npx tsx lib/regression/impostazioni-perf-policy.test.ts
npx tsx lib/regression/client-portal-perf-policy.test.ts
npx tsx lib/regression/report-perf-policy.test.ts
npx tsx lib/regression/dashboard-perf-policy.test.ts
npx tsx lib/regression/sicurezza-perf-policy.test.ts
npx tsx lib/regression/shared-components-perf-policy.test.ts
npx tsx lib/regression/performance-policy.test.ts
```

## Residui (fuori scope v5)

- Server pagination liste ERP
- AppShell code-split
- Split monoliti view >2k LOC (lavorazioni/magazzino shell)
- Report BFF partial SSR (prefetch ancora 6-wave)
