# Audit mirato performance — risultati (2026-08-08)

Evidence-based audit del gestionale. Tier 2 **non implementato** — criteri evidenza non soddisfatti.

---

## Tier 0 — Misura

### Android cold start (P0 misura)

| Artefatto | Stato |
|-----------|--------|
| Campagna device 30 run | **Non eseguita** — richiede device fisico + procedura [`android-pwa-cold-start-procedure.md`](../investigation/android-pwa-cold-start-procedure.md) |
| Proxy Playwright | **Bloccato** — `SMOKE_ADMIN_EMAIL` / `SMOKE_ADMIN_PASSWORD` assenti in ambiente CI locale |
| `test-results/android-cold-start/summary.json` | `inputFiles: 0` — aggregatore eseguito, nessun report device |

**Conseguenza:** P0 candidati (bundle, settings TTFB) restano **non promossi** a P0 confermato.

### Nav waterfall 4 route

| Artefatto | Stato |
|-----------|--------|
| `__cabNavBootTimeline` / `__cabNavHttpWaterfall` | **Non esportati** — stesso blocco credenziali smoke Playwright |
| Spec di riferimento | [`e2e/smoke/mobile-ios-navigation-perf.spec.ts`](../../e2e/smoke/mobile-ios-navigation-perf.spec.ts) |

**Azione richiesta:** rieseguire con `SMOKE_ADMIN_*` + `NEXT_PUBLIC_BOOT_INVESTIGATION=1` su `/dashboard`, `/lavorazioni`, `/magazzino`, `/mezzi`.

### Search probe (completato)

Script: `npx tsx scripts/ops/search-hot-path-probe-report.ts`  
Output: [`test-results/search-hot-path-probe.json`](../../test-results/search-hot-path-probe.json)

| Dominio | parseQueryCalls | documentBuildCalls | filterCpuMs (200 righe, `CEREBA`) |
|---------|-----------------|-------------------|-----------------------------------|
| mezzi (baseline) | 1 | 200 | 17.49 |
| lavorazioni_indexed (post-fix) | **0** | 200 | 27.24 |
| magazzino_indexed (post-fix) | **0** | 0* | 5.42 |

\* magazzino probe usa haystack sintetico (no compat-read-guard); misura path prepared-query.

**Evidenza:** parse per riga eliminato su Lavorazioni/Magazzino; document build resta O(n) su cambio dataset (intenzionale, amortizzato via index).

### Bundle snapshot (completato)

`npm run build` + `npm run ops:build-budget-gate`  
Output: [`test-results/build-budget-snapshot.json`](../../test-results/build-budget-snapshot.json)

| Metrica | Baseline (2026-07) | Attuale (2026-08-08) |
|---------|-------------------|----------------------|
| firstLoadJsKb (globale) | 1877.4 | **2935.6** |
| vendorChunkKb | 449.1 | 448.9 |
| Route tipiche (`/lavorazioni`, `/mezzi`, …) | ~1811 | **~2004** |
| `/magazzino` | ~1811 | 2935.6 (outlier route stats — verificare analyzer) |

**Nota:** gate CI fallisce su soglia 1900 KB; impatto runtime device **non misurato**. Classificazione: **P1 / P0 candidato** (invariata).

**Fix build blocker:** rimosso export duplicato `LoadingSpinnerTone` in [`components/design-system/loading/index.ts`](../../components/design-system/loading/index.ts) per consentire `next build`.

---

## Tier 1 — Fix implementati

### 1. `useMezzoRemoveMutation` — settle non bloccante

- File: [`src/hooks/gestionale/use-mezzo-remove-mutation.ts`](../../src/hooks/gestionale/use-mezzo-remove-mutation.ts)
- Pattern: `settleMezzoMutationCache` + `traceMutationLifecycle` (allineato a create/update/tagliandi)
- Test: [`lib/regression/mezzo-mutation-settle-nonblocking.test.ts`](../../lib/regression/mezzo-mutation-settle-nonblocking.test.ts)

### 2. Lavorazioni search — haystack + prepared query + score map

- Nuovi: [`lib/lavorazioni/lavorazioni-search-haystack-index.ts`](../../lib/lavorazioni/lavorazioni-search-haystack-index.ts), [`lib/lavorazioni/lavorazioni-filter-search-index.ts`](../../lib/lavorazioni/lavorazioni-filter-search-index.ts)
- Consumer: [`components/gestionale/lavorazioni/lavorazioni-view.tsx`](../../components/gestionale/lavorazioni/lavorazioni-view.tsx)
- Test: [`lib/search/search-perf-benchmark.test.tsx`](../../lib/search/search-perf-benchmark.test.tsx) (parse ≤2 per pass)

### 3. Magazzino search — prepared query + score map

- File: [`lib/magazzino/magazzino-filter-search-index.ts`](../../lib/magazzino/magazzino-filter-search-index.ts), [`components/gestionale/magazzino/magazzino-view.tsx`](../../components/gestionale/magazzino/magazzino-view.tsx)
- Test: benchmark + policy [`lib/regression/performance-regression-matrix-policy.test.ts`](../../lib/regression/performance-regression-matrix-policy.test.ts)

---

## Tier 2 — Valutazione (nessun intervento)

| # | Condizione | Esito | Decisione |
|---|------------|-------|-----------|
| 1 | `boot_mount_to_static_hidden` dominante | Nessun dato device | **Defer** |
| 2 | TTFB settings >30% web_startup | Nessun waterfall export | **Defer** |
| 3 | DOM nodes >500 + commit misurabile | Non misurato | **Defer** — `forceFullRender` può essere intenzionale |
| 4 | `fp_to_react` dominante su device | Nessun dato device | **Defer** |
| 5 | Spike `cacheInvalidateTruthSpike` | Non misurato in sessione reale | **Defer** |
| 6 | Bundle P0 confermato | Solo build snapshot, no device | **Defer** |

---

## Matrice priorità (stato post-audit)

| Finding | Priorità | Stato |
|---------|----------|--------|
| Campagna device assente | P0 misura | **Aperta** |
| First-load JS | P1 / P0 candidato | Misurato build; device pending |
| Settings prefetch seriale | P1 / P0 candidato | Waterfall pending |
| Lavorazioni search | P1 | **Risolto** (Tier 1) |
| Magazzino search | P1 | **Risolto** (Tier 1) |
| Mezzo remove settlement | P1 confermato | **Risolto** (Tier 1) |
| Virtualizer forceFullRender | P1 candidato | Misura pending |
| Settings invalidation globale | P1 candidato | Misura pending |
| Static boot hide | P1 candidato | Device pending |

---

## Verifiche eseguite

```bash
npx tsx lib/regression/mezzo-mutation-settle-nonblocking.test.ts
npx tsx lib/search/search-perf-benchmark.test.tsx
npx tsx scripts/ops/search-hot-path-probe-report.ts
npm run build
npm run ops:build-budget-gate   # fallisce soglie — snapshot scritto
node scripts/ops/android-cold-start-aggregate.mjs
```

## Prossimi passi (operativi)

1. Campagna Android 30 run su device fisico
2. Playwright waterfall con credenziali smoke
3. Promuovere P0 candidati solo se evidenza device/waterfall supera soglie definite nel piano
