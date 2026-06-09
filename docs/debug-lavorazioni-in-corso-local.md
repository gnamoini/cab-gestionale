# Debug «Lavorazioni in corso» — report locale

**Data:** 2026-06-09  
**Progetto Supabase:** `oxmnuovsgenqkuwfolqh`  
**Sintomo iniziale:** banner «Impossibile caricare le lavorazioni» su `/lavorazioni` e `/lavorazioni-clienti`.

---

## Root cause

**Migration drift** tra codice applicativo e database Supabase remoto.

Il fetch lista in [`lib/lavorazioni/lavorazioni-list-fetch.ts`](../lib/lavorazioni/lavorazioni-list-fetch.ts) includeva un join PostgREST su:

```
updated_by_profile:profiles!lavorazioni_updated_by_fkey(nome)
```

La migration [`supabase/migrations/20260710120000_lavorazioni_updated_by.sql`](../supabase/migrations/20260710120000_lavorazioni_updated_by.sql) **non era stata applicata** sul progetto collegato a `.env.local`. La colonna `lavorazioni.updated_by` non esisteva.

### Errore PostgREST (prima del fix)

```
code: PGRST200
Could not find a relationship between 'lavorazioni' and 'profiles' in the schema cache
Searched for a foreign key relationship ... 'lavorazioni_updated_by_fkey' ... no matches were found.
```

`useServiceQuery` propaga l'errore come eccezione → React Query `isError` → UI «Impossibile caricare le lavorazioni».

---

## Punto esatto del breakdown

| Layer | Stato |
|---|---|
| DB dati | OK — 8 righe `archived=false`, 19 `archived=true`, 27 totali attive |
| RLS / permessi UI | OK — guard superato con sessione autenticata |
| **PostgREST select (join profiles)** | **FAIL** — FK `lavorazioni_updated_by_fkey` assente |
| Filtri client | Non coinvolti (query non completata) |
| Cache React Query | Non coinvolta (errore hard) |

Catena: `useLavorazioniList` → `fetchLavorazioniListAuthorized` → `fetchLavorazioniListRows` → **select con join** → errore PGRST200.

---

## Fix applicati

### 1. Migration DB (fix primario)

```bash
npx supabase db push --linked
```

Applicata `20260710120000_lavorazioni_updated_by.sql` sul progetto `oxmnuovsgenqkuwfolqh`.

### 2. Fallback codice (resilienza migration drift)

In [`lib/lavorazioni/lavorazioni-list-fetch.ts`](../lib/lavorazioni/lavorazioni-list-fetch.ts):

- Primo tentativo con join completo (`updated_by` + `created_by` profile).
- Se errore PGRST200 su `lavorazioni_updated_by_fkey`, retry senza `updated_by_profile` (solo `created_by_profile`).
- Nessuna modifica a business logic: filtri `archived`, `deleted_at`, stati invariati.

### 3. Osservabilità dev

- Helper [`lib/lavorazioni/lavorazioni-list-pipeline-debug.ts`](../lib/lavorazioni/lavorazioni-list-pipeline-debug.ts) — log `[lavorazioni-pipeline]` nel layer fetch (solo `NODE_ENV=development`).
- Script diagnostico [`scripts/debug-lavorazioni-list-fetch.ts`](../scripts/debug-lavorazioni-list-fetch.ts) per verifiche CLI.

---

## Verifica post-fix

| Check | Risultato |
|---|---|
| Script CLI: colonna `updated_by` | OK |
| Script CLI: admin full-join select | OK, 3 righe campione |
| `/lavorazioni` | **Lavorazioni in corso (8)** — nessun banner errore |
| `/lavorazioni-clienti` | **Lavorazioni in corso (8)** — nessun banner errore |
| DB count `archived=false` | 8 (allineato UI) |

---

## Rischio regressione

| Area | Rischio |
|---|---|
| Migration `updated_by` | Basso — migration già in repo, idempotente (`add column if not exists`) |
| Fallback join | Basso — attivo solo su errore relationship noto; in produzione con schema allineato usa join completo |
| Metadati `updated_by_nome` | Medio-basso — in ambienti senza colonna, lista funziona ma autore ultima modifica può mancare in UI |

---

## Prevenzione

1. Dopo pull con nuove migration in `supabase/migrations/`, eseguire `npx supabase db push --linked` sul progetto dev.
2. Opzionale: `npx tsx scripts/debug-lavorazioni-list-fetch.ts` per sanity check schema + join.
3. In CI/deploy production: assicurarsi che `20260710120000` sia applicata prima del deploy frontend che include il join `updated_by_profile`.
