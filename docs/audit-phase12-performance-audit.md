# FASE 12 — Audit performance (Gestionale CAB)

Inventario bundle, React Query, liste, Realtime e colli di bottiglia render. Stato verificato **2026-06-02** post-fix fasi 1–11.

**Documenti correlati:** [`performance-query-policies.md`](./performance-query-policies.md) · [`audit-phase4-edge-cases.md`](./audit-phase4-edge-cases.md) · [`audit-phase9-data-sync-audit.md`](./audit-phase9-data-sync-audit.md)

**Legenda:** ✅ gestito · ⚠️ parziale · ❌ gap · 📋 backlog · 🔧 fix audit applicato

---

## Sintesi esecutiva

| Area | Stato pre-audit | Post fase 12 |
|------|-----------------|--------------|
| Code splitting modali pesanti | ⚠️ parziale (3 route) | 🔧 + report + documenti |
| React Query stale/refetch | ✅ policy centralizzate | ✅ |
| Liste grandi (virtualizzazione) | ❌ assente | 📋 backlog P2 |
| Fetch liste server-side limit | ❌ lavorazioni/magazzino full load | 📋 backlog |
| PDF client-side | ⚠️ main thread | 📋 worker backlog |
| Realtime + polling XOR | ✅ fase 9 | ✅ |
| Bundle analyzer CI | ❌ assente | 📋 backlog |

---

## Policy React Query

Fonte: [`lib/react-query/query-layer-policies.ts`](../lib/react-query/query-layer-policies.ts)

| Policy | staleTime | refetchOnWindowFocus | Uso |
|--------|-----------|----------------------|-----|
| Core | 30s | default | Liste operative, mutazioni |
| VIEW | 60s | **false** | Dashboard, bunder, read-only |
| Report | 120s | **false** | KPI aggregati, manual entries |

**Log feed:** cap condiviso `GESTIONALE_LOG_FEED_LIMIT = 200` (dashboard ↔ report).

**Permessi:** `staleTime: Infinity` — invalidazione esplicita via truth layer.

---

## Code splitting (`next/dynamic`)

| Route / modulo | Componente lazy | Stato |
|----------------|-----------------|-------|
| `/lavorazioni` | `LavorazioneCreateModal`, `SchedeLavorazioneModal` | ✅ |
| `/preventivi` | `PreventiviEditorModal` | ✅ |
| `/bunder` | `BunderEditorModal` | ✅ |
| `/report` | `ReportAnalyticsView` (intero analytics) | 🔧 fase 12 |
| `/documenti` | Upload / Edit / Info modals | 🔧 fase 12 |
| `/magazzino` | Form inline in shell | ⚠️ inline (modale leggera) |
| `/dipendenti` | Griglia inline | — |

Pattern: `{ ssr: false }` + skeleton dove utile.

---

## Liste e DOM

| Modulo | Paginazione client | Page size | Virtualizzazione | Fetch server |
|--------|-------------------|-----------|------------------|--------------|
| Lavorazioni list | ✅ `useClientPagination` | responsive / 100 | ❌ | Full list in memoria |
| Lavorazioni kanban | Colonne full DOM | — | ❌ | Full list |
| Magazzino | ✅ | 100 | ❌ | Full list |
| Preventivi | ✅ | 100 | ❌ | DB |
| BUNDER | ✅ | 100 | ❌ | DB |
| Report tops | ✅ | pageSize zone | ❌ | Derived in memoria |
| Documenti tree | ✅ marca pages | — | ❌ | DB |

**Rischio EC-001 (fase 4):** migliaia di righe lavorazioni/magazzino → render lento; mitigato parzialmente da paginazione client (max 100 righe visibili), non da virtual scroll.

---

## Sync / refetch overhead

| Meccanismo | Intervallo | Impatto perf |
|------------|------------|--------------|
| Realtime connected | event-driven | Basso (debounce 100ms) |
| Polling fallback | 20s | Medio burst invalidation |
| Report refresh broadcast | on mutation | Targeted `domain: report` |
| Snapshot recovery | tab focus | Opzionale refetch |

Tabelle Realtime: `allGestionaleOperationalTables()` — ~18 publication post fase 9.

---

## Re-render / UI autonomy

`useUIAutonomyFixEngine` su: `/lavorazioni`, `/magazzino`, `/report`.

⚠️ Fix layout runtime — costo: effect per pagina; accettato per stabilità flex (fasi UI audit).

---

## PDF e asset pesanti

| Uso | Libreria / path | Thread |
|-----|-----------------|--------|
| Preventivi anteprima | API POST inline + client render | Main |
| BUNDER export | `bunder-pdf`, HTML print | Main |
| Dipendenti export | PDF stats client | Main |
| Immagini lavorazioni | Signed URL Supabase | Network-bound |

📋 Backlog: Web Worker per PDF pesanti.

---

## Findings e fix

### P12-001 — Report bundle monolitico su route group

| | |
|---|---|
| **Severità** | P2 |
| **Problema** | `ReportAnalyticsView` (~15 zone + derived cache) nel chunk iniziale `/report`. |
| **Fix** | 🔧 `next/dynamic` in `report-view.tsx` + `LoadingReportSkeleton`. |

### P12-002 — Documenti modals eager import

| | |
|---|---|
| **Severità** | P2 |
| **Problema** | `documenti-modals.tsx` (upload + edit + dropzone) sempre nel bundle lista. |
| **Fix** | 🔧 dynamic import condizionale per i tre modals. |

### P12-003 — Nessuna virtualizzazione tabelle

| | |
|---|---|
| **Severità** | P2 |
| **Stato** | 📋 backlog — `@tanstack/react-virtual` non presente |
| **Mitigazione attuale** | Paginazione client 100 |

### P12-004 — Liste operative senza `.limit()` server

| | |
|---|---|
| **Severità** | P2 |
| **Stato** | 📋 server pagination backlog |
| **Impatto** | Memoria + parse JSON crescono linearmente |

### P12-005 — Bundle analyzer non in CI

| | |
|---|---|
| **Severità** | P3 |
| **Stato** | 📋 script `analyze` opzionale locale |

---

## Fix applicati (fase 12)

| ID | File |
|----|------|
| P12-001 | `components/gestionale/report/report-view.tsx` |
| P12-002 | `components/gestionale/documenti/documenti-view.tsx` |
| CI | `lib/regression/performance-policy.test.ts` |

---

## Checklist verifica manuale

| # | Scenario | Pass atteso |
|---|----------|-------------|
| 1 | Navigare `/report` | Skeleton breve poi KPI; Network: chunk separato |
| 2 | Aprire upload documenti | Modale appare; chunk modals on-demand |
| 3 | Aprire editor preventivi / schede lavorazioni | Lazy chunk (già presente) |
| 4 | Report remount entro 2 min | No refetch liste se cache fresh |
| 5 | Realtime down | Polling 20s max lag accettabile |
| 6 | Lista lavorazioni 500+ righe | Paginazione 100; scroll pagina fluido |

---

## Verifica automatica

```bash
npm run ci:tsc
npx tsx lib/regression/performance-policy.test.ts
npm run smoke:regression
```

---

## Riferimenti codice

| Area | Path |
|------|------|
| Query policies | `lib/react-query/query-layer-policies.ts` |
| Doc policies | `docs/performance-query-policies.md` |
| Client pagination | `lib/ui/use-client-pagination.ts` |
| Report live data | `lib/report/use-report-live-data.ts` |
| Realtime config | `lib/realtime/gestionale-realtime-config.ts` |
| Dynamic report | `components/gestionale/report/report-view.tsx` |

---

## Documenti audit per fase

| Fase | Documento |
|------|-----------|
| 2–11 | vedi fasi precedenti |
| 12 | questo documento |
