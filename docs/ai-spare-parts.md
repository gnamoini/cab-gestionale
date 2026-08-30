# Ricambi AI — Identifica ricambio

Modulo server-only per identificazione ricambi con cataloghi CAB indicizzati e ricerca operatore assistita.

## Architettura

1. **Ingestion** (save Documenti con `meta.aiSparePartsEnabled`): coda `document_ai_index` → File Search → Document Understanding (pagine, esplosi, `part_references`).
2. **Search** (`/identifica-ricambio`): foto + descrizione → coda `ai_part_searches` → analisi visiva → retrieval strutturato → web solo se match ambiguo → ranking.

Due code separate (cron primario):

- `POST /api/cron/spare-parts-document-index-queue`
- `POST /api/cron/spare-parts-part-search-queue`

## Gate catalogo utilizzabile

Retrieval operativo solo se:

```text
document_ai_index.is_active = true
AND status = 'indexed'
AND understanding_status = 'ready'
```

## Env

| Variabile | Default | Uso |
|-----------|---------|-----|
| `GEMINI_FILE_SEARCH_EMBEDDING_MODEL` | `gemini-embedding-2-preview` | Embedding File Search (verificare su API) |
| `GEMINI_MODEL_PART_IDENTIFICATION` | `AI_MODEL_GOOGLE` | Analisi foto / search |
| `AI_SPARE_PARTS_MAX_CONCURRENT_INDEXING` | `2` | Worker indicizzazione |
| `AI_SPARE_PARTS_MAX_CONCURRENT_SEARCH` | `2` | Worker identificazione |
| `AI_SPARE_PARTS_MOCK` | — | `1`/`true` per mock senza chiamate Gemini |
| `GEMINI_FILE_SEARCH_STORE_NAME` | — | Store File Search esistente (riuso; se assente ne viene creato uno per job) |
| `GEMINI_FILE_SEARCH_UPLOAD_TIMEOUT_MS` | `480000` (8 min) | Timeout polling upload File Search |

## UI Documenti

Badge in modale dettaglio: **File Search**, **AI Catalog**, **Esplosi** (da `status`, `understanding_status`, `document_capabilities`).

## Troubleshooting

- Documento non usato in ricerca: verificare flag AI, PDF, `understanding_status = ready`.
- Coda bloccata / "In coda da X ore": dopo un errore il job può restare bloccato da `next_retry_at` — **Riprova indicizzazione** ora resetta il gate e avvia il worker inline sul documento.
- `FILE_SEARCH_UPLOAD_TIMEOUT`: upload Gemini lento o SDK senza `done` — su **Riprova** il file già caricato viene riusato (solo Catalogo AI); primo upload può richiedere fino a 8 min. Aumentare `GEMINI_FILE_SEARCH_UPLOAD_TIMEOUT_MS` se necessario.
- Web sempre attivo: match strutturato assente o sotto soglia (`shouldRunWebSearch`).

### Checklist infra worker indicizzazione

1. **Vault Supabase:** secret `push_delivery_cron_secret` (≥ 8 caratteri) = `CRON_SECRET` su Vercel.
2. **Vercel env:** `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, chiavi Gemini (config AI).
3. **pg_cron:** job attivo `spare-parts-document-index-poll` (`select jobname, schedule from cron.job`).
4. **pg_net:** risposte HTTP verso `/api/cron/spare-parts-document-index-queue` (401 = secret errato).
5. **URL worker:** per ambienti non-prod, `app.spare_parts_document_index_worker_url` (default: produzione CAB).

Query stato riga:

```sql
SELECT status, understanding_status, attempt_count, error_code, error_message,
       created_at, updated_at, next_retry_at
FROM document_ai_index
WHERE documento_id = '<uuid>' AND is_active = true;
```
