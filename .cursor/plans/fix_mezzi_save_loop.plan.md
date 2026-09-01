---
name: Fix mezzi save loop
overview: "Correggere salvataggio marca/modello attrezzatura da scheda ingresso (lavorazione in corso). RC1: merge attrezzatura fill_empty blocca overwrite intenzionale. Loop guard solo su save espliciti, mai su refetch/invalidate."
todos:
  - id: diag-repro
    content: "Riproduzione DEBUG_INGRESSO_SAVE: confermare ATTREZZATURA_CONFLICT_SKIPPED pre-fix"
    status: pending
  - id: attrezzatura-overwrite
    content: "mergeMode fill_empty default + user_confirmed_overwrite solo su fieldsToUpdate"
    status: pending
  - id: post-save-link-state
    content: "attrezzaturaId nel commit + linkedSnapshot reconcile + reset userEditedPermanent"
    status: pending
  - id: single-flight-throw
    content: "syncIngressoBackendForEdit throw SAVE_IN_PROGRESS se flight attivo"
    status: pending
  - id: loop-guard
    content: "save-operation-loop-guard — solo tentativi save utente, MAI refetch/invalidate"
    status: pending
  - id: catalog-fix
    content: "MezziEditModal primary attrezzaturaId + overwrite manuale catalogo"
    status: pending
  - id: tests
    content: "Unit overwrite + loop guard + E2E marca/modello mezzo linkato + typecheck/lint"
    status: pending
isProject: false
---

# Fix salvataggio mezzi da scheda ingresso

## Sequenza di esecuzione (vincolante)

1. Riproduzione e conferma `ATTREZZATURA_CONFLICT_SKIPPED` (pre-fix)
2. Overwrite esplicito marca/modello su conferma anagrafica (`fill_empty` default / `user_confirmed_overwrite` solo `fieldsToUpdate`)
3. Riallineamento `attrezzaturaId` + `linkedSnapshot` post-commit
4. Single-flight **fail loud**
5. Loop guard come **ultima** barriera
6. Verifica 10 casi E2E + typecheck/lint/build

---

## Root cause primaria (RC1)

`mergeAttrezzaturaPatch` in [`merge-attrezzatura-patch.ts`](lib/domain/mezzo-attrezzatura/merge-attrezzatura-patch.ts) applica `kept_existing` su marca/modello già valorizzati.

Flusso scheda ingresso:

- Gate conferma → `fieldsToUpdate` include `marcaAttrezzatura` / `modelloAttrezzatura`
- [`buildMezzoAnagraficaPatchFromScheda`](lib/domain/mezzo/apply-mezzo-patch-from-scheda-fields.ts) **non** scrive attrezzatura (solo telaio)
- Write attrezzatura via [`resolveOrCreateAttrezzatura`](lib/domain/mezzo-attrezzatura/resolve-or-create-attrezzatura.ts) + merge → **DB invariato**
- Scheda/bundle aggiornati → drift persistente → percezione di loop

---

## Correzione 1 — Overwrite attrezzatura

### `merge-attrezzatura-patch.ts`

Aggiungere `MergeAttrezzaturaPatchOptions.overwriteFields?: ReadonlySet<AttrezzaturaMergeField>`.

- Default (nessuna option): comportamento attuale `fill_empty`
- Campi in `overwriteFields`: applicare incoming anche su valori esistenti

### `apply-mezzo-patch-from-scheda-fields.ts`

- `attrezzaturaOverwriteFieldsFromPlan(fieldsToUpdate)` — mappa `marcaAttrezzatura`→`marca`, ecc.
- `schedaFieldsToAttrezzaturaPatch`: se key in `fieldsToUpdate`, scrivere anche valori vuoti (`"—"` per marca/modello)

### `resolve-or-create-attrezzatura.ts`

Params estesi:

```ts
mergeMode?: "fill_empty" | "user_confirmed_overwrite";
overwriteFields?: ReadonlySet<AttrezzaturaMergeField>;
```

In `applyMergeUpdate`: passare `overwriteFields` a `mergeAttrezzaturaPatch` quando `mergeMode === "user_confirmed_overwrite"`.

Telemetry (opt-in `NEXT_PUBLIC_DEBUG_INGRESSO_SAVE=1`):

- `ATTREZZATURA_OVERWRITE_APPLIED` — campi in patch con overwrite
- `ATTREZZATURA_CONFLICT_SKIPPED` — conflitto in modalità fill_empty

### `upsert-from-scheda-v2.ts`

Quando `anagraficaPlan.updateAnagrafica && fieldsToUpdate.length`:

```ts
await deps.resolveAttrezzatura({
  mezzoId,
  incoming: schedaToAttrezzaturaPayload(...),
  hintId: fields.attrezzaturaId ?? attrezzaturaIdHint,
  mergeMode: "user_confirmed_overwrite",
  overwriteFields: attrezzaturaOverwriteFieldsFromPlan(anagraficaPlan.fieldsToUpdate),
});
```

Altrimenti: `fill_empty` (default).

### Catalogo [`persist-mezzo-form.ts`](lib/mezzi/persist-mezzo-form.ts)

- Risolvere `primaryAttrezzaturaId` via `listByMezzo` + `pickPrimaryAttrezzatura`
- `mergeMode: "user_confirmed_overwrite"` + overwrite tutti i campi attrezzatura del form

---

## Correzione 2 — Post-save state

### `syncIngressoAfterSave` / [`ingresso-backend-sync.ts`](lib/schede/ingresso-backend-sync.ts)

Restituire `{ attrezzaturaId }` dall'upsert (non solo da patch lavorazione se invariato).

### [`schede-lavorazione-modal.tsx`](components/lavorazioni/schede/schede-lavorazione-modal.tsx) `commitIngressoEdit`

```ts
const sync = await onIngressoCommitted?.(...);
const campi = sync?.attrezzaturaId ? { ...ig, attrezzaturaId: sync.attrezzaturaId } : ig;
// nextDoc.campi = campi
```

### [`use-scheda-ingresso-mezzo-prompt.ts`](src/hooks/use-scheda-ingresso-mezzo-prompt.ts)

Nuova `reconcileLinkedSnapshotAfterSave(fields, mezzo?, savedFieldKeys?)`:

- aggiorna `linkedSnapshot.fieldsAtLinkTime` = `pickMezzoPermanentFields(fields)`
- aggiorna `mezzoUpdatedAtAtLinkTime` da catalogo
- rimuove da `userEditedPermanent` i campi salvati

Chiamata in `onSaveSuccess` di [`scheda-ingresso-form-modal.tsx`](components/gestionale/lavorazioni/scheda-ingresso-form-modal.tsx).

---

## Correzione 3 — Single-flight fail loud

[`lavorazioni-view.tsx`](components/gestionale/lavorazioni/lavorazioni-view.tsx) `syncIngressoBackendForEdit`:

```ts
if (!acquireLavorazioneEditFlight(...)) {
  throw new Error("SAVE_IN_PROGRESS");
}
```

Pipeline già gestisce `SAVE_IN_PROGRESS`.

---

## Correzione 4 — Loop guard (fallback, ultima barriera)

Nuovo [`lib/sync/save-operation-loop-guard.ts`](lib/sync/save-operation-loop-guard.ts).

### Regola critica (feedback utente)

**La loop guard conta SOLO tentativi di save espliciti dell'utente** (click Salva / submit form / `savePipeline.run`).

**NON conta mai:**

- `invalidateQueries` / `refetch`
- `refreshSchedeBundlesForMezzoId`
- cab-sync / realtime
- `settleMezzoMutationCache`
- effetti React post-invalidation

Altrimenti maschera regressioni invece di rilevarle.

### API

```ts
export class SaveOperationLoopError extends Error {}

/** Chiamare all'ingresso di un save utente (dopo lock.acquire). */
export function recordExplicitSaveAttempt(scope: string, entityId: string): void

/** Chiamare in finally su save completato (ok o errore non-loop). */
export function clearExplicitSaveAttempts(scope: string, entityId: string): void
```

- Soglia: 5 tentativi / 30s per `scope:entityId`
- Superamento: throw `SaveOperationLoopError` con messaggio UI richiesto
- Log: `SAVE_LOOP_GUARD_TRIGGERED` + scope, entityId, attemptCount, runId

### Integrazione (solo entry point save)

| Entry | scope | entityId |
|-------|-------|----------|
| `runIngressoSavePipeline` dopo `lock.acquire()` | `scheda_ingresso` | `loopGuardEntityId` passato dal caller |
| `MezziEditModal.handleSubmit` | `mezzo_catalog` | `mezzo.id` |

`SchedaIngressoEditModal.runIngressoSave` passa `excludeLavorazioneId` o id lavorazione come `loopGuardEntityId` al pipeline.

---

## Test

### Unit

- `merge-attrezzatura-patch` + overwrite marca/modello su record esistente
- `resolve-or-create-attrezzatura` con `user_confirmed_overwrite`
- `save-operation-loop-guard.test.ts` — 5° tentativo esplicito blocca; invalidate **non** incrementa
- Regression: `syncIngressoBackendForEdit` non fa `return` silenzioso su flight

### E2E (estendere [`13-lavorazioni-scheda-ingresso.spec.ts`](e2e/smoke/13-lavorazioni-scheda-ingresso.spec.ts))

1. modifica marca (mezzo linkato, lav. attiva)
2. modifica modello
3. altri campi mezzo
4. mezzo senza lavorazioni
5. mezzo con lavorazione in corso
6. modifiche consecutive
7. doppio click Salva
8. errore API
9. refresh durante save
10. realtime durante save (dev)

### Gate

- `npm run test` file nuovi
- typecheck / lint / build su file toccati

---

## File coinvolti (checklist)

- [ ] `lib/domain/mezzo-attrezzatura/merge-attrezzatura-patch.ts`
- [ ] `lib/domain/mezzo-attrezzatura/resolve-or-create-attrezzatura.ts`
- [ ] `lib/domain/mezzo-attrezzatura/upsert-from-scheda-v2.ts`
- [ ] `lib/domain/mezzo/apply-mezzo-patch-from-scheda-fields.ts`
- [ ] `lib/mezzi/persist-mezzo-form.ts`
- [ ] `lib/schede/ingresso-backend-sync.ts`
- [ ] `lib/schede/scheda-ingresso-save-pipeline.ts`
- [ ] `lib/sync/save-operation-loop-guard.ts`
- [ ] `lib/observability/mezzo-mutation-save-trace.ts`
- [ ] `src/hooks/use-scheda-ingresso-mezzo-prompt.ts`
- [ ] `components/gestionale/lavorazioni/scheda-ingresso-form-modal.tsx`
- [ ] `components/gestionale/lavorazioni/lavorazioni-view.tsx`
- [ ] `components/lavorazioni/schede/schede-lavorazione-modal.tsx`
- [ ] `components/gestionale/mezzi/mezzi-edit-modal.tsx`
