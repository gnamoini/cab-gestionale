# Audit post-remediation — EXPLAIN ANALYZE e misure REST

**Data:** 2026-06-11  
**Progetto:** `oxmnuovsgenqkuwfolqh` (CAB Gestionale, Postgres 17)  
**Migration deployata:** [`20260711120000_db_performance_indexes.sql`](../supabase/migrations/20260711120000_db_performance_indexes.sql)  
**Metodo SQL:** `npx supabase db query --linked` (Management API, ruolo postgres)  
**Metodo REST:** PostgREST service role (bypass RLS)  
**Artefatti:** [`test-results/explain-audit-raw.json`](../test-results/explain-audit-raw.json), [`test-results/rest-benchmark-post-deploy.json`](../test-results/rest-benchmark-post-deploy.json)

---

## Executive summary

| Area | Esito |
|------|-------|
| Deploy migration | **OK** — 6/6 nuovi indici presenti su remoto |
| Indici nuovi utilizzati dal planner | **3/6** confermati (Q6, Q8, Q12); trgm/priorità/liste semplici restano Seq Scan su dataset ~37 righe |
| EXPLAIN execution time (DB) | **0.07–2.5 ms** per query — overhead dominato da rete/API, non da Postgres |
| REST lista lavorazioni + embed mezzi | **1080 → 902 ms** (−16%); report parallelo **472 → 266 ms** (−44%) |
| RLS realistico | **Non misurato** — EXPLAIN eseguito come postgres; REST con service role |

---

## Dataset remoto (pg_stat_user_tables)

| Tabella | `n_live_tup` |
|---------|--------------|
| lavorazioni | 37 |
| mezzi | 38 |
| magazzino_ricambi | 14 |
| movimenti_ricambi | 0 |

Con tabelle così piccole il planner preferisce spesso **Seq Scan** anche con indici validi.

---

## Indici nuovi — verifica deploy

```sql
SELECT indexname FROM pg_indexes WHERE indexname IN (
  'idx_mezzi_cliente_btree',
  'idx_lavorazioni_priorita',
  'idx_lavorazioni_codice_trgm',
  'idx_lavorazioni_note_trgm',
  'idx_lavorazioni_stato_archived_created',
  'idx_movimenti_ricambi_ricambio_created'
);
```

**Risultato:** tutti e 6 presenti.

---

## EXPLAIN ANALYZE — tabella per query

Legenda piano **prima:** non catturato pre-deploy (migration non era su remoto). Stime: stesso comportamento Seq Scan su tabelle piccole; indici nuovi assenti.

| ID | Schermata | Query | Piano dopo | Indice usato | Rows scanned | Rows returned | Exec time (DB) | RLS on/off delta | Raccomandazione |
|----|-----------|-------|------------|--------------|--------------|---------------|----------------|------------------|-----------------|
| Q1 | Lavorazioni | Lista attive `archived=false` + sort `created_at` | Sort → **Seq Scan** | — | 14 | 14 | 0.16 ms | Nessuna | A >500 righe: forzare uso `idx_lavorazioni_active_archived_created`; oggi planner sceglie seq scan |
| Q2 | Lavorazioni | Lista archivio `archived=true` | Sort → **Seq Scan** | — | 20 | 20 | 0.15 ms | Nessuna | Come Q1 |
| Q3 | Lavorazioni | Search `codice ILIKE '%26-00%'` | **Seq Scan** | — (atteso: `idx_lavorazioni_codice_trgm`) | 27 | 27 | 0.17 ms | Nessuna | Indice trgm creato ma non scelto (tabella piccola). Rivalutare con ANALYZE e >1k righe |
| Q4 | Lavorazioni | Search `note ILIKE '%test%'` | **Seq Scan** | — | 0 | 0 | 0.14 ms | Nessuna | Nessun match; trgm non attivato. Normale su 0 risultati |
| Q5 | Lavorazioni | Filtro `priorita = 'media'` | **Seq Scan** | — (atteso: `idx_lavorazioni_priorita`) | 22 | 22 | 0.09 ms | Nessuna | Indice parziale presente; seq scan più economico su 37 righe |
| Q6 | Lavorazioni | `stato='accettazione' AND archived=false` + sort | **Index Scan** | `idx_lavorazioni_stato_archived_created` | 5 | 5 | 0.10–1.41 ms | Nessuna | **Indice nuovo efficace** |
| Q7 | Mezzi | Lista `ORDER BY created_at DESC` | Sort → Seq Scan | — | 38 | 38 | 0.15 ms | Nessuna | Accettabile; aggiungere indice su `created_at` se >1k mezzi |
| Q8 | Mezzi | `cliente = 'Specchia'` | **Index Scan** | `idx_mezzi_cliente_btree` | 1 | 1 | 0.12 ms | Nessuna | **Indice nuovo efficace** (portale cliente) |
| Q9 | Magazzino | Lista `ORDER BY codice` | Sort → Seq Scan | — (esiste `idx_magazzino_ricambi_codice`) | 14 | 14 | 0.15 ms | Nessuna | Seq scan su 14 righe; indice btree esistente non scelto |
| Q10 | Magazzino | `nome ILIKE '%filtro%'` | Seq Scan | — (esiste `idx_magazzino_ricambi_nome_trgm`) | 0 | 0 | 0.15 ms | Nessuna | 0 risultati; trgm esistente non necessario |
| Q11 | Report | Movimenti `ORDER BY created_at DESC` | **Index Scan** | `idx_movimenti_ricambi_created_at` | 0 | 0 | 0.07 ms | Nessuna | Indice pre-esistente OK |
| Q12 | Report | Movimenti per `ricambio_id` + sort | Bitmap Index Scan | `idx_movimenti_ricambi_ricambio_created` | 0 | 0 | 0.12 ms | Nessuna | **Indice nuovo efficace** |

### Dettaglio piani (dopo deploy)

**Q6 — Index Scan (nuovo indice):**
```
Index Scan actual_rows=5 [idx_lavorazioni_stato_archived_created]
```

**Q8 — Index Scan (nuovo indice):**
```
Index Scan actual_rows=1 [idx_mezzi_cliente_btree]
```

**Q12 — Bitmap Index Scan (nuovo indice):**
```
Sort actual_rows=0
  Bitmap Heap Scan actual_rows=0
    Bitmap Index Scan [idx_movimenti_ricambi_ricambio_created]
```

**Q1 — Seq Scan residuo (dataset piccolo):**
```
Sort actual_rows=14
  Seq Scan actual_rows=14
```

---

## REST benchmark — prima vs dopo deploy

Misurazioni service role (non include costo RLS per utente autenticato).

| Query | Prima (ms) | Dopo (ms) | Δ | Payload | Rows |
|-------|------------|-----------|---|---------|------|
| Lavorazioni lista + embed mezzi | 1080.31 | 902.25 | **−16%** | 25.7 KB | 34 |
| Lavorazioni `archived=false` | 90.38 | 79.93 | −12% | 6.5 KB | 14 |
| Lavorazioni search | 87 | 96 | +10%* | 16.5 KB | 34 |
| Mezzi lista | 77 | 83 | +8%* | 16.1 KB | 38 |
| Magazzino lista | 88 | 89 | ~0% | 7.6 KB | 14 |
| Report bundle (parallelo) | 471.63 | 266.28 | **−44%** | ~49 KB | — |

\*Variazione entro jitter di rete; DB execution time resta sub-ms.

**Interpretazione:** il miglioramento REST non deriva principalmente dagli indici (query planner sub-ms), ma da **latenza di rete variabile** e possibile warm-up pooler. Il collo di bottiglia persistente è il **join PostgREST lavorazioni↔mezzi** (~900 ms su 34 righe).

---

## RLS e policy

- Policy lavorazioni: `cap_lavorazioni_select` → `rbac_can_read_row('lavorazioni', id)`
- EXPLAIN con `SET row_security = on` come **postgres** non replica il filtro per-riga su utente `authenticated`
- REST benchmark usa **service role** → nessun overhead RLS

**Raccomandazione:** ripetere Q1 con sessione JWT operatore reale (es. `SET ROLE authenticated` + claim sub) su staging con volume produzione.

---

## Sequential scan residui

| Query | Motivo probabile | Azione |
|-------|------------------|--------|
| Q1, Q2, Q5, Q7, Q9 | Tabelle <40 righe — seq scan più cheap | Monitorare; `EXPLAIN` a 500+ righe |
| Q3, Q4, Q10 | Trgm non scelto / zero risultati | `ANALYZE lavorazioni, magazzino_ricambi`; test con token che matchano molte righe |
| Lista lavorazioni PostgREST | Join embed + sort client-side | Paginazione server o view materializzata leggera |

---

## Raccomandazioni prioritarie

1. **Indici nuovi validati** su Q6, Q8, Q12 — mantenere migration deployata.
2. **Rieseguire EXPLAIN** quando `lavorazioni` supera ~500 righe per confermare uso trgm e indici parziali.
3. **Profilare join lavorazioni+mezzi** lato PostgREST (900 ms su 34 righe) — indici DB non risolvono questo collo.
4. **Audit RLS autenticato** separato con utente operatore/cliente.
5. **Paginazione server** sulle liste core resta il fix strutturale per payload/RAM (vedi gate in remediation plan).

---

## Riproduzione

```bash
# Deploy (già eseguito)
npx supabase db push --linked --yes

# EXPLAIN suite
node scripts/ops/db-performance-explain-audit.mjs > test-results/explain-audit-raw.json

# Verifica indici
npx supabase db query --linked -o json "SELECT indexname FROM pg_indexes WHERE indexname LIKE 'idx_lavorazioni_%trgm%';"
```

---

## Riferimenti

- [`docs/audit-database-performance-remediation.md`](./audit-database-performance-remediation.md) — remediation codice
- [`docs/audit-supabase-performance-degradation.md`](./audit-supabase-performance-degradation.md) — overhead RLS/refetch
