# Audit membership archivio lavorazioni

## Invariante

> `archived=true` ⇒ la lavorazione **non** deve mai comparire nella tabella **Lavorazioni in corso**.

La membership è determinata dal campo DB `archived`, non dallo `stato` workflow (`completata` resta in attive finché non si esegue **Concludi**).

---

## Root cause (analisi codice + fix applicati)

| Classe | Descrizione | Fix |
|--------|-------------|-----|
| **B** | Rollback mutation parallela ripristina snapshot pre-conclude con `archived=false` mentre DB/base ha `archived=true` | `rollbackLavorazioneUpdateQueries` → post-rollback reconcile da base cache + guard `updated_at` |
| **A/C** | Optimistic/invalidate non gestivano chiavi `list-v2` | `isLavorazioniListCacheQueryKey` + reconcile infinite pages + invalidate predicate |
| **UI** | Cache stale mostrata senza difesa | Invariant check UI (`isLavorazioneInCorso`) + `console.warn` in dev |

**DB/query filter**: `.eq("archived", false)` su fetch attive — confermato corretto in [`lavorazioni-list-fetch.ts`](../../lib/lavorazioni/lavorazioni-list-fetch.ts).

---

## Trace ricomparsa (Fase 0)

In **development**, i log `[lavorazioni-archive-membership]` sono emessi da:

- `applyOptimisticLavorazioneUpdate` → `optimistic_apply`
- `rollbackLavorazioneUpdateQueries` → `optimistic_rollback`
- `reconcileRowAcrossLists` → `reconcile`
- `assertNoArchivedInActiveLists` → `invariant_violation`

### Cosa registrare durante riproduzione

| Campo | Dove |
|-------|------|
| `lavorazioneId` | log / React Query Devtools |
| Query key | `lavorazioniQueries` → `list` (ar=0) o `list-v2` (mode=active) |
| Timestamp conclude | Network → response `updated_at` |
| Primo refetch post-conclude | RQ `dataUpdatedAt` su query attive |
| `archived` in payload | response fetch lista |

### Momenti da verificare

1. Subito dopo conclude (toast)
2. Dopo `onSettled` / MIC invalidate
3. Dopo evento realtime (seconda tab)
4. Dopo navigazione via e ritorno
5. Dopo refetch automatico RQ
6. Dopo inline edit su **altra** riga (rollback race)

### Classificazione

- **A**: optimistic non applicato (chiave lista non match)
- **B**: rollback ripristina snapshot vecchio
- **C**: fetch senza filtro `archived=false`
- **D**: realtime/cross-tab senza reconcile membership

---

## Checklist manuale (admin + manager)

Stesso comportamento write atteso per **admin** e **manager**.

- [ ] Crea lavorazione test → stato **completata** → **Concludi** → sparisce da attive
- [ ] Apri sezione **Archivio** → riga presente
- [ ] Reload F5 → non in attive
- [ ] Naviga (es. Mezzi) e torna → non in attive
- [ ] Logout / login → non in attive
- [ ] Secondo utente (admin o manager) → non in attive; solo in archivio
- [ ] Tab 2 su `/lavorazioni`: conclude da tab 1 → tab 2 coerente
- [ ] Dopo conclude, modifica priorità/stato su **altra** riga → riga archiviata **non** riappare in attive

### Verifica DB (opzionale)

```bash
# Script Node locale
npx tsx scripts/debug-lavorazioni-list-fetch.ts

# SQL (service role / SQL editor)
# scripts/audit-lavorazioni-archivio.sql
```

---

## Test automatici

```bash
npx tsx src/lib/react-query/lavorazioni-optimistic.test.ts
npx tsx lib/regression/lavorazioni-archive-membership.test.ts
```

---

## File modificati

| File | Ruolo |
|------|-------|
| `src/lib/react-query/lavorazioni-optimistic-cache.ts` | reconcile list + list-v2, rollback version-aware |
| `src/lib/react-query/invalidate-targets.ts` | invalidate `list` + `list-v2` |
| `components/gestionale/lavorazioni/lavorazioni-view.tsx` | invariant check UI |
| `src/hooks/gestionale/use-lavorazione-mutations.ts` | restore optimistic simmetrico |
| `lib/lavorazioni/lavorazioni-archive-membership-debug.ts` | trace dev |

**Fix E** (blocco `update` su archiviate): **non** applicato — fuori scope fino a evidenza trace.
