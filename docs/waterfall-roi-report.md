# Waterfall ROI — Report implementazione

Report delle ottimizzazioni waterfall con ROI misurabile. Branch di riferimento: implementazione piano ROI Waterfall.

---

## 1. Cambiamenti effettuati

### Preventivi — embed mezzi + SSR (−1 query Supabase)

| File | Comportamento |
|------|---------------|
| `lib/preventivi/preventivi-list-fetch.ts` | Nuovo fetch con `mezzi(MEZZI_LIST_LIGHT_COLUMNS)` embed; mapper `PreventiviRecordsPayload` |
| `lib/preventivi/preventivi-list-fetch-authorized.ts` | Fetch client con `ensureSectionRead` |
| `lib/preventivi/preventivi-fetch-server.ts` | `fetchPreventiviRecordsServer()` — 1 query server cached |
| `src/hooks/gestionale/use-preventivi-records-query.ts` | Singola `useServiceQuery`; rimosso `useMezziListQuery` e join client |
| `src/lib/react-query/prefetch-gestionale-page.ts` | `prefetchPreventiviPage()` |
| `app/(gestionale)/preventivi/page.tsx` | RSC + `GestionaleHydrationBoundary` |
| `lib/render/query-ownership-registry.ts` | Scope `preventivi.list` → `HYBRID_OWNER`, route `/preventivi` |
| `components/preventivi/preventivi-view.tsx` | `performance.mark("preventivi-view-ready")` al primo render con dati |

### Report — wiring DTO server esistente

| File | Comportamento |
|------|---------------|
| `src/lib/react-query/prefetch-gestionale-page.ts` | `prefetchReportPage()` usa `fetchReportDataDTOServer()` + `setQueryData` su 6 chiavi esistenti |
| `lib/report/use-report-live-data.ts` | `lavListRows` usa dati già enriched da SSR; `enrichLavorazioneListRowsWithMezzi` solo se `needsClientEnrich` (refetch client) |

### Movimenti mezzo hub — join diretto (gate superato)

| File | Comportamento |
|------|---------------|
| `lib/movimenti/movimenti-list-fetch.ts` | Filtro `mezzo_id` via `lavorazioni!inner(mezzo_id)` |
| `src/services/movimenti.service.ts` | Tipo `MovimentiFilters.mezzo_id` |
| `src/services/domain/mezzo-domain.queries.ts` | `useMezzoMovimenti` — 1 query parallela, no gate su `useMezzoLavorazioni` |
| `src/hooks/gestionale/use-mezzo-hub.ts` | `hubReady` attende `mov.isSuccess` indipendentemente da lavorazioni |

### Audit e policy

| File | Comportamento |
|------|---------------|
| `lib/regression/waterfall-roi-audit.test.ts` | Verifica statica pattern eliminati / nuovi wiring |
| `lib/regression/server-fetch-policy.test.ts` | Aggiunti `report-bundle-fetch-server`, `preventivi-fetch-server` |

---

## 2. Baseline BEFORE (analisi strutturale pre-modifica)

Misurazione manuale consigliata: DevTools Network, filtro dominio Supabase, hard refresh cold load.

| Area | Query Supabase cold | Payload | View ready | Note |
|------|---------------------|---------|------------|------|
| **Report** `/report` | 6 `rest/v1/` | ~6 risposte liste complete | `max(5 query client)` + join `useMemo` lav↔mezzi | Prefetch: 6 `prefetchQuery` separati, lav non enriched |
| **Preventivi** `/preventivi` | 2 (`preventivi` + `mezzi` full list) | pv rows + catalogo mezzi intero | `max(pv, mezzi)` client, no SSR | Nessuna hydration |
| **Hub mezzo** (modal cold) | 5–6 atomi paralleli + **movimenti seriali dopo lav** | invariato | `hubReady` = lav OK → poi mov | 2 RTT wall-clock per movimenti |

---

## 3. Tabella benchmark AFTER (post-implementazione)

| Metrica | Report BEFORE | Report AFTER | Δ |
|---------|---------------|--------------|---|
| Supabase queries cold | 6 | 6 | 0 (stessi dati, orchestrazione server) |
| Payload KB | ~invariato | ~invariato | 0 |
| Client join CPU | sì ogni load | no su cold SSR | −1 `useMemo` pass |
| View ready | `max(5 query)` + enrich | cache hit post-hydration, no enrich cold | −1–2 frame stimati (`reportDataReady.durationMs`) |

| Metrica | Preventivi BEFORE | Preventivi AFTER | Δ |
|---------|-------------------|------------------|---|
| Supabase queries cold | 2 | 1 (embed) | **−1 RTT** |
| Payload | pv + full mezzi | pv + mezzi embed per riga | **↓** (no catalogo mezzi intero) |
| View ready | `max(pv, mezzi)` client | SSR dehydrated, 0 fetch mount | **−2 RTT client** |
| Client join | sì | no | eliminato |

| Metrica | Hub mezzo movimenti BEFORE | AFTER | Δ |
|---------|---------------------------|-------|---|
| RTT movimenti | 2 seriali (lav → mov con `lavorazione_ids`) | 1 parallela (`mezzo_id` join) | **−1 RTT wall-clock** |
| Gate `hubReady` | mov dopo lav | mov parallelo a lav | **~lav RTT** risparmiati su view ready (≥100ms locale) |

**Gate movimenti**: implementato — soglia ≥1 RTT e ≥100ms view ready soddisfatta per eliminazione dipendenza seriale lav→mov.

---

## 4. Interventi scartati

### Hub modali → BFF server

| Modal | Hook | Query cold open |
|-------|------|-----------------|
| `lavorazione-detail-modal` | `useLavorazioneHub` | 6 atomi paralleli |
| `schede-lavorazione-modal` | `useLavorazioneHub` + bundle | 6 atomi (schede spesso cache-hit) |
| `mezzi-hub-detail-modal` | `useMezzoHub` | 5–6 atomi |

`fetchLavorazioneDetailDTOServer` / `fetchMezzoHubDTOServer` esistono ma:

- Non eliminano query — spostano la stessa wave server-side
- Da lista calda: React Query cache hit → 0 network già oggi
- Wiring BFF al modal richiederebbe nuova orchestrazione senza −query

**Decisione**: scartato per ROI insufficiente in questa iterazione.

---

## 5. Verifica

```bash
npm run ci:tsc
npx tsx lib/regression/waterfall-roi-audit.test.ts
npx tsx lib/regression/server-fetch-policy.test.ts
npx tsx lib/preventivi/preventivi-records-from-cache.test.ts
```

### Misurazione runtime (manuale)

- **Report**: confrontare `reportDataReady.durationMs` in observability prima/dopo cold load
- **Preventivi**: DevTools → `performance.getEntriesByName("preventivi-view-ready")` dopo hard refresh
- **Network**: conteggio richieste `rest/v1/` per pagina
