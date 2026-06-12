# API Waterfall Remediation + BFF Consolidation

Documento di remediation basato sull’audit waterfall pre-esistente.  
Obiettivo: meno roundtrip HTTP/Supabase, meno orchestrazione client, DTO completi lato server, zero regressione UX.

---

## FASE 1 — Catalogazione waterfall

| View | Chain attuale | Roundtrip (before) | Root cause |
|------|---------------|-------------------|------------|
| **Lavorazioni list** | `useLavorazioniList` → `useSchedeBundlesQuery` → N× `schedeService.getAll({ lavorazione_id })` | 1 + ⌈N/8⌉ batch sequenziali | UI list-gated; backend per-id only |
| **Lavorazioni hub / detail** | `useLavorazioneBase` ∥ schede/mov/pv/log; `useDocumentiByLavorazione`: base → `getById(mezzo)` → `getAll(marca)` | 6 parallele + 2–3 seriali doc | DTO frammentato; documenti keyed by marca |
| **Dashboard metrics** | `useLavorazioniList` → `useSchedeBundlesQuery(ids)` | 1 + N schede | Stesso pattern lista |
| **Dashboard recent feeds** | `useLavorazioniList` + `useSchedeBundlesQuery()` **senza ids** | 1 + 0 schede (bug) | `hasIds=false` → ensure disabled |
| **Preventivi** | `usePreventiviListQuery` ∥ `useMezziListQuery` → client join | 2 (parallelo, loading=max) | DTO frammentato |
| **Report** | 5 liste ∥ settings → `enrichLavorazioneListRowsWithMezzi` client | 6 parallelo, enrich client | `includeMezzo: false` by design |
| **Documenti** | settings ∥ mezzi ∥ documenti (tutto client, no SSR) | 3 cold | `CLIENT_OWNER`, no prefetch |
| **Mezzo hub** | base ∥ lav/pv/log; doc gated base; mov gated lav | 5 + 2 wave | movimenti keyed by lav ids |
| **Modali schede/detail** | prop bundle + `useLavorazioneHub` overlap | 0–6 (RQ dedup) | Doppia sottoscrizione hub |

Legenda wave: **∥** = parallelo, **→** = sequenziale obbligato.

---

## FASE 2 — Eliminazione richieste seriali

### Implementato

| Catena before | After | File |
|---------------|-------|------|
| N× `getAll(lavorazione_id)` chunk 8 | 1 query `.in(lavorazione_id, ids)` per chunk 80 | `lib/schede/schede-bundles-fetch.ts`, `schede-sync-adapter.ts` |
| Dashboard prefetch: lav → (client schede) | BFF wave1: lav∥mag∥settings; wave2: schede batch server | `lib/bff/dashboard-data-fetch-server.ts`, `prefetch-gestionale-page.ts` |
| Lavorazioni SSR: solo lista | Lista + schede batch in prefetch | `prefetchLavorazioniPage` |
| Documenti cold: 3 fetch client | SSR: settings∥mezzi∥documenti in 1 orchestrator | `lib/bff/documenti-dashboard-fetch-server.ts`, `documenti/page.tsx` |
| Dashboard feeds: schede mai fetchate | Pass `lavorazioneIds` da lista | `dashboard-recent-feeds.tsx` |

### Parzialmente migliorato

| Catena | Miglioramento | Residuo |
|--------|---------------|---------|
| Hub documenti lav | `fetchLavorazioneDocumentiSlice` con `mezzoHint` → `getById` ∥ `getAll(marca)` | Senza hint: ancora 2 RTT seriali |
| Hub lav server BFF | `fetchLavorazioneDetailDTOServer`: 5∥ + 1 doc | Non ancora wired a modali client |

### Non convertibile in `Promise.all` (dipendenza reale)

- Documenti per marca **senza** mezzo embed: serve `marca` da mezzo.
- `useMezzoMovimenti`: richiede `lavorazione_ids` dalla lista mezzo.
- Auth → permissions → RBAC: sessione necessaria prima di permessi.

---

## FASE 3 — DTO Aggregation Layer

| DTO | Tipo export | Composizione | File |
|-----|-------------|--------------|------|
| `LavorazioneDetailDTO` | `LavorazioneHubData` | `composeLavorazioneHub(snapshot)` | `lib/bff/lavorazione-hub-fetch-server.ts` |
| `MezzoDetailDTO` | `MezzoHubData` | `composeHubData(snapshot)` | `lib/bff/mezzo-hub-fetch-server.ts` |
| `DashboardDataDTO` | lavorazioni + schedeStore + mag report + settings | Server orchestrator | `lib/bff/dashboard-data-fetch-server.ts` |
| `DocumentiDashboardDTO` | settings + mezzi + documenti rows | `Promise.all` × 3 | `lib/bff/documenti-dashboard-fetch-server.ts` |
| `ReportDataDTO` | 5 liste + settings + enrich lav↔mezzi server | `fetchReportDataDTOServer` | `lib/bff/report-bundle-fetch-server.ts` |

**Regola rispettata:** riuso `lavorazioniDomainService` / `mezzoDomainService` — nessuna duplicazione logica KPI/timeline.

**Non ancora wired al client:** `LavorazioneDetailDTO` / `MezzoDetailDTO` disponibili server-side per prefetch modali / route handler futuri senza nuove API HTTP.

---

## FASE 4 — Lightweight BFF Layer

Pattern: **RSC prefetch + `setQueryData`** (no nuove route HTTP — elimina roundtrip client senza aggiungere endpoint).

```
Server Page (RSC)
  └─ fetch*DTOServer()        ← BFF orchestrator
       └─ Promise.all([...])  ← parallel Supabase
  └─ dehydrate(qc)            ← HydrationBoundary
Client View
  └─ useQuery same keys       ← cache hit, skip fetch (HYBRID/SERVER_OWNER)
```

| BFF | Prefetch route | Query keys seeded |
|-----|----------------|-------------------|
| `fetchDashboardDataDTOServer` | `/dashboard` | lav attive, mag report, settings, `SCHEde_BUNDLES_QUERY_KEY` |
| `prefetchLavorazioniPage` | `/lavorazioni` | lav attive, schede bundles |
| `getDocumentiDashboardDTOServer` | `/documenti` | settings, mezzi list, documenti list |

Ownership aggiornato (`lib/render/query-ownership-registry.ts`):

- `documenti.list`: `CLIENT_OWNER` → **`HYBRID_OWNER`**
- `schede.bundles`: prefetch routes `[/dashboard, /lavorazioni]`

---

## FASE 5 — Query Collapse (owner unico)

| Dominio | Owner | Meccanismo |
|---------|-------|------------|
| Settings | `AppSettingsQueryProvider` | Shared context + `tier: static` |
| Lavorazioni list attive | SSR `SERVER_OWNER` | Dashboard + Lavorazioni prefetch |
| Schede bundles | `HYBRID_OWNER` | SSR seed + `useSchedeBundlesQuery` client merge missing |
| Documenti list | `HYBRID_OWNER` | SSR seed + client refetch stale |
| Permessi | `useUserPermissionsQuery` | `staleTime: ∞`, 1× sessione |
| Hub atomi | `lavorazioniDomainQueryKeys` | RQ dedup + `primeLavorazioneSchedeRowsCache` |

**Eliminato:** doppio fetch schede N+1 per-id nel client adapter.  
**Mantenuto:** hub atomi in modali (subscriber RQ, no network duplicato se key uguale).

---

## FASE 6 — Report

| Aspetto | Before | After |
|---------|--------|-------|
| Prefetch SSR | 6 query parallele (già ok) | Invariato |
| Client enrich lav↔mezzi | `useReportLiveData` gate su mezzi | `ReportDataDTO` pronto server-side (`report-bundle-fetch-server.ts`) per adozione futura |
| Duplicati dashboard/report | Lav list stessa key RQ | Dedup nativo React Query |

**Prossimo step opzionale:** far consumare a `useReportLiveData` il DTO enriched da cache se dehydrated (0 enrich client).

---

## FASE 7 — Lavorazioni

| Flusso | Before RTT | After RTT | Note |
|--------|------------|-----------|------|
| Lista cold (SSR) | 1 lav + N schede | 1 lav + 1–⌈N/80⌉ schede | Prefetch + batch `.in()` |
| Lista warm | 0–1 | 0 cache hit | `ensureSchedeBundlesInCache` solo missing ids |
| Hub open | 6–8 | 6 parallele + doc 2–3 | BFF server pronto (6+1 wave) |
| Schede rows hub | bundle gate → rows | Prime da batch, cache hit | `primeLavorazioneSchedeRowsCache` |
| Profili mobile | 1 batch pagina | Invariato (lazy intenzionale) | `includeProfiles: false` |

**Lazy load conservati:** archivio chiuse, profili mobile, log undo toolbar.

---

## FASE 8 — Misurazioni (stima)

Assunzioni: 40 lavorazioni attive, cold visit, latenza ~50ms/RTT Supabase, chunk schede 80.

| View | Before (RTT) | After (RTT) | Δ RTT | Δ Supabase queries (40 lav) |
|------|--------------|-------------|-------|------------------------------|
| `/lavorazioni` cold | 1 + 5 chunk = **6** | 1 + **1** = **2** | **−4** | 40 → 1 |
| `/dashboard` cold | 3 + 5 chunk client = **8** | 3 + 1 schede = **4** | **−4** | 40 → 1 |
| `/documenti` cold | **3** client | **3** server 1 wave | 0* | 3 (stesso conteggio, −TTFB perceived) |
| Hub lav documenti (hint) | 3 seriali | 2 paralleli | **−1** | 3 → 2 |
| Hub lav documenti (no hint) | 3 seriali | 3 seriali | 0 | — |
| Dashboard feeds schede | **0** (bug) | **1** batch | +1 (fix funzionale) | 0 → 1 |

\* Documenti: stesso numero query, ma eseguite server-side in `Promise.all` durante RSC — client non attende waterfall post-hydration.

### Waterfall depth

| View | Before depth | After depth |
|------|--------------|-------------|
| Lavorazioni list | 2 (list→schede) | 2 (list→batch), width 1 vs N |
| Dashboard | 2 + client schede | 2 server waves |
| Hub lav | 3 (doc chain) | 2 (BFF) / 2–3 (client) |

### KB trasferiti

Batch schede riduce overhead HTTP/PostgREST headers (~N× request metadata). Payload invariato (stesse righe). Nessun over-fetch aggiunto.

---

## File introdotti / modificati

### Nuovi

- `lib/schede/schede-bundles-fetch.ts` — batch `.in()` core
- `lib/schede/schede-bundles-fetch-server.ts`
- `lib/schede/schede-bundles-fetch-authorized.ts`
- `lib/lavorazioni/lavorazione-documenti-slice-fetch.ts`
- `lib/bff/lavorazione-hub-fetch-server.ts`
- `lib/bff/mezzo-hub-fetch-server.ts`
- `lib/bff/dashboard-data-fetch-server.ts`
- `lib/bff/documenti-dashboard-fetch-server.ts`
- `lib/bff/report-bundle-fetch-server.ts`
- `lib/regression/schede-bundles-batch.test.ts`

### Modificati

- `lib/schede/schede-sync-adapter.ts` — batch + prime cache righe
- `src/lib/react-query/prefetch-gestionale-page.ts` — dashboard/lavorazioni/documenti BFF
- `app/(gestionale)/documenti/page.tsx` — hydration boundary
- `components/dashboard/dashboard-recent-feeds.tsx` — schede ids fix
- `src/services/domain/lavorazioni-domain.queries.ts` — documenti slice
- `lib/documenti/documenti-list-fetch-server.ts` — `fetchDocumentiRowsServer`
- `lib/render/query-ownership-registry.ts` — HYBRID documenti + schede routes

---

## Problemi residui (non eliminabili senza schema/API)

1. **Preventivi client join** — serve embed mezzo nel select preventivi (migration query).
2. **Hub modali doppio subscriber** — richiede refactor modali a prop-only bundle (no `useLavorazioneHub` se parent ha contesto).
3. **Movimenti mezzo** — `lavorazione_ids` chain finché DB non espone `mezzo_id` su movimenti.
4. **Report client enrich** — `ReportDataDTO` server pronto ma hook non ancora migrato.
5. **Hub lav client** — `fetchLavorazioneDetailDTOServer` non esposto via prefetch modale (scope futuro).
6. **Auth→permissions** — waterfall sessione necessario; possibile dehydrate permessi in auth snapshot.

---

## Vincoli rispettati

- [x] Nessuna nuova API HTTP senza eliminare fetch esistenti
- [x] Server Components + HydrationBoundary invariati
- [x] React Query keys allineate (`query-key-factory`, `SCHEde_BUNDLES_QUERY_KEY`)
- [x] MIC / RDR / dedup layer non modificati
- [x] Cache tiers rispettati (`GESTIONALE_*_STALE_MS`)
- [x] UX invariata
- [x] No over-fetch (DTO minimi, stessi filtri/colonne SSOT)

---

## Verifica

```bash
npm run ci:tsc
npx tsx lib/regression/schede-bundles-batch.test.ts
npx tsx lib/regression/server-fetch-policy.test.ts
npx tsx lib/regression/query-dedup-policy.test.ts
```

### Dev manuale

1. Cold `/lavorazioni` — Network: 1 batch schede, non 40× `scheda_lavorazione`
2. Cold `/dashboard` — schede store populated in React Query devtools
3. Cold `/documenti` — 0 fetch documenti/mezzi/settings al primo paint (dehydrated)
4. Dashboard feeds — log oggetto con label scheda (non solo codice lav)

---

## Roadmap residua (priorità)

| P | Task | Impatto |
|---|------|---------|
| P1 | Wire `fetchLavorazioneDetailDTOServer` a prefetch modale hub | −2 RTT hub open |
| P1 | Preventivi select con mezzo embed | −1 RTT cold |
| P2 | `useReportLiveData` ← `ReportDataDTO` cache | −1 client enrich |
| P2 | Modali: rimuovere `useLavorazioneHub` ridondante | −subscriber/render |
| P3 | Movimenti `mezzo_id` filter DB | −1 RTT mezzo hub |
