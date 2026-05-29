# Performance — policy React Query

## File

[`lib/react-query/query-layer-policies.ts`](../lib/react-query/query-layer-policies.ts)

## Policy

| Policy | `staleTime` | Focus refetch | Uso |
|--------|-------------|---------------|-----|
| VIEW (`useViewQueryOpts`) | 60s | no | Dashboard, bunder, liste read-only VIEW |
| Report (`useReportViewQueryOpts`) | 120s | no | Report, `reportManualEntries` |
| Core (`GESTIONALE_CORE_STALE_MS`) | 30s | da realtime | Liste operative / mutazioni |
| Log feed | limit **200** | — | `QK.log` magazzino + movimenti (dashboard ↔ report) |

## Dashboard vs Report (cache keys)

- **Dashboard** (`useDashboardMetrics`): `useLavorazioniList({ includeMezzo: true, archived: false })` — solo lavorazioni in corso per widget operativi.
- **Report** (`useReportLiveData`): `useLavorazioniList({ includeMezzo: true })` — tutte le non eliminate (attive + archiviate) per KPI completate.
- Non unificare le chiavi senza misura: comportamento e payload differiscono per design.

## Report

- **Una fetch** `useLavorazioniList({ includeMezzo: true })` — include attive e archiviate; `buildReportLavorazioniBundle(rows)` senza seconda query `archived: true`.
- Refresh broadcast: `invalidateOperationalTruth({ domain: "report", skipReportBroadcast: true })` + `bumpMagLog` locale.
- `storage` (log magazzino locale): solo `bumpMagLog`, nessun refetch server.
- Nessun `visibilitychange` refetch sulla pagina report (realtime + broadcast coprono).

## Cosa non fare

- Non reintrodurre `staleTime: 0` su report/dashboard VIEW.
- Non invalidare 4 domini operativi dal listener report (solo `domain: "report"`).
- Non usare limit log diversi (es. 80 vs 200) tra dashboard e report per la stessa entità.

## Verifica manuale

1. Aprire Report → Network: **1** richiesta lista lavorazioni.
2. Remount entro 2 min → cache hit (no refetch liste se fresh).
3. Modifica magazzino → report si aggiorna via `bumpReportDataRefresh` / realtime.
