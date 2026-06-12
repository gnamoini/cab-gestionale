# Database Performance — Audit & Remediation

**Data:** 2026-06-11  
**Scope:** Wave 1–5 (auto-safe). Wave 6 (paginazione server liste core) **non applicata** — richiede conferma UX.

Documenti correlati: [`audit-phase12-performance-audit.md`](./audit-phase12-performance-audit.md) · [`performance-query-policies.md`](./performance-query-policies.md)

---

## Problemi trovati

| ID | Criticità | Problema | Impatto |
|----|-----------|----------|---------|
| P0-1 | Critica | Full-table `getAll()` senza `.range()` | Payload/RAM/CPU RLS |
| P0-2 | Alta | `select('*')` su ~100 occorrenze | Colonne inutili su ogni roundtrip |
| P0-3 | Critica | Report: 2 fetch lavorazioni | Roundtrip duplicato |
| P0-4 | Alta | N+1 rename propagation | UPDATE seriali su JSON |
| P1-1 | Media | Dipendenti: scan completo entries | Full scan aggregazioni |
| P1-2 | Media | `mezzi(*)` embed liste lavorazioni | Payload join gonfiato |
| P1-5 | Media | Search `ilike` su note/codice | Seq scan senza trgm |

---

## Ottimizzazioni applicate

### Migration DB

File: [`supabase/migrations/20260711120000_db_performance_indexes.sql`](../supabase/migrations/20260711120000_db_performance_indexes.sql)

| Indice / RPC | Motivazione |
|--------------|-------------|
| `idx_mezzi_cliente_btree` | Equality `mezzi.cliente` portale cliente |
| `idx_lavorazioni_priorita` | Filtro priorità liste attive |
| `idx_lavorazioni_codice_trgm` | Search `codice.ilike.%token%` |
| `idx_lavorazioni_note_trgm` | Search `note.ilike.%token%` |
| `idx_lavorazioni_stato_archived_created` | Filtri stato + archivio + sort |
| `idx_movimenti_ricambi_ricambio_created` | Storico movimenti per ricambio |
| `list_timesheet_month_keys()` | Distinct mesi senza trasferire tutte le righe |
| `list_timesheet_employee_ids_with_entries()` | Distinct dipendenti con presenze |

### SELECT espliciti

SSOT: [`lib/db/table-select-columns.ts`](../lib/db/table-select-columns.ts)

Refactor su tutti `src/services/*.service.ts`, actions admin/security, `lavorazioni-list-fetch.ts`, `client-lavorazioni.service.ts`, componenti security dashboard/drawer, `delete-documento-fully.ts`.

### Embed ridotti

[`lib/lavorazioni/lavorazioni-list-fetch.ts`](../lib/lavorazioni/lavorazioni-list-fetch.ts): `LAVORAZIONI_COLUMNS` + `MEZZI_LIST_EMBED_COLUMNS` al posto di `*, mezzi(*)`.

### Paginazione / limiti difensivi

| File | Fix |
|------|-----|
| `log.service.ts` | Default `limit: LOG_MODIFICHE_RETENTION_PER_ENTITA` (100) |
| `admin-users.ts` | `PROFILES_COLUMNS` esplicito |

### N+1 / batch

| File | Fix |
|------|-----|
| `settings-rename-propagation.service.ts` | `runBatchedRowUpdates` chunk 20 paralleli |
| `dipendenti-timesheet.service.ts` | Batch insert; update paralleli chunk 20 |
| `security-users-permissions.ts` | Preload profiles `.in(id, userIds)` |

### Caching / roundtrip

| File | Fix |
|------|-----|
| `use-report-live-data.ts` | 1 sola fetch lavorazioni + split `archived` client |
| `load-known-clienti.ts` | `React cache()` per-request dedupe server |
| `dipendenti-timesheet.service.ts` | RPC aggregations al posto di full scan |

### Test regressione

Esteso [`lib/regression/performance-policy.test.ts`](../lib/regression/performance-policy.test.ts): colonne SSOT, default limit log, report single-fetch, migration indici, assenza `select('*')` nei services.

---

## Stime tecniche (dataset medio: 500 lav, 2k ricambi, 300 mezzi)

| Ottimizzazione | Payload | Latency |
|----------------|---------|---------|
| SELECT espliciti liste | −20–40% | −10–25% |
| Embed mezzi ridotto | −30% fetch lavorazioni | −15% |
| Indici trgm search | — | −50–90% su search |
| Report −1 fetch lav | −1 roundtrip | −200–500ms |
| Batch rename propagation | — | −60–80% wall time |
| RPC dipendenti aggregations | −95% rows | −80% toolbar mesi |

---

## Ottimizzazioni future (richiedono conferma)

| Area | Beneficio stimato |
|------|-------------------|
| Server pagination / cursor su lavorazioni, magazzino, mezzi | −70–90% initial load su dataset grandi |
| Report KPI via SQL / materialized views | −80% RAM report page |
| Virtual scroll lavorazioni kanban | DOM cost su migliaia righe |
| RLS initplan `(select auth.uid())` | −10–15% CPU Postgres per refetch |
| Deploy migration F5 realtime prune (se non su remoto) | −overhead WAL deprecated tables |

---

## Rischi residui

- Liste core restano **full fetch + paginazione client** — collo di bottiglia principale oltre ~few thousand righe.
- Sort/filtri lavorazioni su dati schede impediscono paginazione server senza refactor.
- RLS per-row amplifica ogni query ottimizzata.

---

## Verifica

```bash
npm run ci:tsc
npx tsx lib/regression/performance-policy.test.ts
```

Dopo deploy migration: `EXPLAIN ANALYZE` su search lavorazioni con token e lista filtrata `archived=false`.
