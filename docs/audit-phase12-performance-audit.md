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

---

## 2026-06 follow-up — fix ad alto impatto (Chrome locale)

Misurazione mirata su `localhost:3000` + ottimizzazioni bundle/render a basso rischio. Nessun cambio logica business.

### Fix applicati

| ID | Descrizione | File chiave |
|----|-------------|-------------|
| P0 | Rimossi debug probe sessione 929eab (input-lag, scroll-lock, dev lock) | `lib/ui/*`, modali, `lib/magazzino/form.ts` |
| P1 | `jspdf` on-demand su export PDF (lavorazioni, preventivi, bunder, dipendenti) | `lib/pdf/lazy-pdf-modules.ts`, view + `dipendenti-pdf-export.ts` |
| P2 | Kanban lavorazioni lazy (`LoadingKanbanSkeleton`) | `lavorazioni-view.tsx` |
| P3 | Modali magazzino lazy (new/edit/info/dup) | `magazzino-view.tsx`, `magazzino-modals.tsx` |
| P5 | Virtual scroll pilot tabella Magazzino (`@tanstack/react-virtual`) | `global-table.tsx`, `magazzino-view.tsx` |
| P6 | `npm run analyze` + `@next/bundle-analyzer` | `next.config.ts`, `scripts/analyze-bundle.ts` |

### Metriche before/after (stima desktop Chrome, no throttling)

| Metrica | Pre | Post Wave 1 | Post Wave 1–2 | Note |
|---------|-----|-------------|-----------------|------|
| Chunk JS route `/lavorazioni` | baseline | −100–200 KB | −100–200 KB | jspdf + kanban fuori chunk iniziale |
| Chunk JS `/magazzino` | baseline | −80–150 KB | −80–150 KB | modali ricambio lazy |
| Chunk JS `/preventivi`, `/bunder` | baseline | −100–300 KB ciasc. | idem | PDF on click |
| DOM righe tabella Magazzino (pagina 100) | ~100 `<tr>` | ~100 | ~15–25 visibili | virtual scroll nel scroll scope |
| Probe network dev | attivi | 0 | 0 | meno noise + meno handler |

*Confermare con DevTools → Network (filter JS, first load) e Profiler scroll lista Magazzino.*

### Score stimato

| Area | Pre | Post |
|------|-----|------|
| Rendering | 6 | 8 |
| Input responsiveness | 7 | 7 |
| Memory usage | 5 | 8 |
| Query efficiency | 8 | 8 |
| Mobile performance | 6 | 8 |
| Dashboard performance | 7 | 7 |
| Modal performance | 7 | 8 |
| Bundle efficiency | 5 | 8 |
| UI fluidity | 6 | 8 |
| **Overall** | **6.3** | **7.9** |

### Verifica automatica (2026-06-05)

```bash
npm run ci:tsc                                    # PASS
npx tsx lib/regression/performance-policy.test.ts # PASS
npm run smoke:regression                          # FAIL — compat-readiness score 85 < 90 (pre-esistente, non performance)
npm run analyze                                   # bundle report locale (non CI)
```

### Checklist Chrome (2026-06-05, localhost:3000)

| # | Scenario | Esito |
|---|----------|-------|
| 1 | `/magazzino` — lista carica, 14+ ricambi visibili | PASS |
| 2 | Modale **+ Nuovo** lazy (campi form, input descrizione) | PASS |
| 3 | Chiusura modale senza errori | PASS |
| 4 | `/dashboard` — KPI lavorazioni/magazzino + calendario | PASS |
| 5 | PDF lazy — nessun import statico `preventivi-pdf`/`bunder-pdf` in `components/` | PASS (grep) |
| 6 | Kanban lazy `/lavorazioni` | Non verificato in questa sessione (nav sidebar hydration noise) |
| 7 | PDF export click (4 moduli) | Da verificare manualmente (apre nuova scheda) |
| 8 | Realtime seconda tab | Da verificare manualmente |

**Gap PDF esteso (2026-06-05):** lazy import anche in `preventivi-editor-modal`, `bunder-editor-modal`, `mezzi-hub-detail-modal`, `lavorazione-detail-modal`.

### Backlog residuo

- Server-side pagination liste (P12-004) — stesso UI, diverso fetch model
- PDF Web Worker — thread separato da main
- Split monoliti `lavorazioni-view` / `magazzino-view`
- Virtual scroll su Lavorazioni list mode (replicare pilot Magazzino)
- Riduzione provider tree — impatto auth/realtime
