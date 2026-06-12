# Architecture — Intervento Write v2 & Consistency Hardening

**Data:** 2026-06-11  
**Riferimento audit:** [`mezzi-schede-ingresso-dataflow-audit.md`](mezzi-schede-ingresso-dataflow-audit.md)  
**Vincoli:** nessuna modifica schema tabelle; API legacy intatte; feature flags per rollout.

---

## 1. Write flow attuale (v1)

### Create path

```
LavorazioneCreateModal.onSubmit
  → createInterventoTransaction
      Stage A: upsertMezzoFromSchedaIngresso (mezzi)
      Stage B: lavorazioniService.create (lavorazioni)
      Stage C: persistSchedeStore → syncBundleToDb (scheda_lavorazione)
```

Retry parziale: solo Stage C via `createdLavorazioneIdRef` se lav già creata.

### Edit path

```
SchedeLavorazioneModal.applyIngressoCommitAsync
  → lavorazioni-view.persistSchedeAndSync (scheda FIRST)
  → onIngressoCommitted → executeInterventoWrite (sync interno mezzo + lav AFTER)
```

### Punti deboli (W1–W9)

| ID | Punto | Severità |
|----|-------|----------|
| W1 | Create: mezzo OK → lav fail | MEDIUM |
| W2 | Create: lav OK → scheda fail | HIGH (partial retry) |
| W3 | Edit: scheda OK → sync fail | HIGH |
| W4 | `mezzo_id` patch solo se FK vuoto | MEDIUM |
| W5 | `schedeRow` snapshot stale in sync | MEDIUM |
| W6 | Concurrent mezzo INSERT stesso ident | MEDIUM |
| W7 | `persistBundleInBackground` vs commit | HIGH |
| W8 | OCC senza merge UX | **P0** |
| W9 | `ensureSchedeBundlesInCache` skip-if-present | **P0-adjacent** |

---

## 2. Write Contract v2

### Entry point

`executeInterventoWrite(plan)` in `lib/domain/intervento-context/write-contract.ts`

Feature flags: `NEXT_PUBLIC_INTERVENTO_WRITE_V2=1` (saga authoritative), `NEXT_PUBLIC_INTERVENTO_WRITE_V2_SHADOW=1` (dry-run parallelo a v1)

### Stage order (edit)

1. resolve — `resolveMezzoFromScheda`
2. prepare-mezzo — upsert
3. prepare-lavorazione — create/patch (incluso `mezzo_id` se resolved ≠ FK)
4. persist-scheda — `persistSchedeBundle` con OCC
5. finalize — MIC invalidation

### Idempotency

`sessionStorage` ledger `intervento-write-ledger-v1` con `{ key, lavorazioneId, stage, at }`.

### v1 compatibility

`createInterventoTransaction` resta esportato; `syncIngressoAfterSave` è interno a `write-contract`. Con flag OFF: v1 authoritative (+ shadow opzionale).

---

## 3. Concurrency model

- OCC via `updated_at` su `scheda_lavorazione` (esistente)
- Conflict typed result: `{ ok: false, kind: "concurrency", serverBundle, clientBundle }`
- UI: `SchedaConcurrencyMergeDialog` — mantieni / server / merge campo-per-campo
- Background persist defer se `submitLock` attivo o merge dialog aperto

---

## 4. Cache consistency model

### Bundle revision hint

```typescript
type BundleCacheMeta = { _revision?: string; _fetchedAt?: number };
```

Calcolato da `max(updated_at)` righe `scheda_lavorazione`.

### ensureSchedeBundlesInCache options

- `force` — bypass skip-if-present
- `afterInvalidate` — refetch post-invalidate (default ON via `NEXT_PUBLIC_SCHEDE_ENSURE_FORCE_ON_INVALIDATE`)

### MIC extension

- Mezzo mutation → `refreshSchedeBundlesForMezzoId`
- Domain `mezzi` dispatch include `scheda_lavorazione`
- Soft delete lavorazione → evict bundle slice

---

## 5. Read model hardening

`resolveInterventoDisplayForSurface(surface, inputs)` — unica fonte display per list/hub/pdf/preventivo/draft/filter.

---

## 6. Feature flags

| Flag | Default | Scopo |
|------|---------|-------|
| `NEXT_PUBLIC_INTERVENTO_WRITE_V2` | `0` | Saga orchestrator (authoritative) |
| `NEXT_PUBLIC_INTERVENTO_WRITE_V2_SHADOW` | `0` | Saga dry-run parallelo a v1 (noop deps) |
| `NEXT_PUBLIC_INTERVENTO_WRITE_RPC` | `0` | RPC `create_intervento_atomic` (fallback client) |
| `NEXT_PUBLIC_SCHEDE_ENSURE_FORCE_ON_INVALIDATE` | `1` | Cache fix after invalidate |

Template staging: `.env.example`. Production: `.env.production.example` (tutti write flags vietati).

### Staging rollout matrix

| Env | V2 | SHADOW | RPC | Comportamento |
|-----|-----|--------|-----|---------------|
| Production | OFF | OFF | OFF | v1 only |
| Staging F1 | OFF | ON | OFF | v1 + shadow compare |
| Staging F2 | ON | OFF | OFF | saga authoritative |
| Staging F3 | ON/OFF | * | ON | RPC try + fallback |

---

## 7. File domain layer

| File | Ruolo |
|------|-------|
| `lib/domain/intervento-context/write-contract.ts` | Entry point `executeInterventoWrite` |
| `lib/domain/intervento-context/write-contract-v2.ts` | Re-export legacy |
| `lib/domain/intervento-context/intervento-write-saga.ts` | Stage machine |
| `lib/domain/intervento-context/intervento-write-types.ts` | Types |
| `lib/domain/intervento-context/resolve-intervento-display-for-surface.ts` | Read SSOT per surface |
| `lib/schede/schede-bundle-cache-patch.ts` | Surgical bundle refresh |
| `components/lavorazioni/schede/scheda-concurrency-merge-dialog.tsx` | Merge UX |

---

*Documento generato come parte del Write Consistency & Cache Hardening Plan.*
