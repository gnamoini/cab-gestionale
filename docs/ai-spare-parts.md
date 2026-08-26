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

## UI Documenti

Badge in modale dettaglio: **File Search**, **AI Catalog**, **Esplosi** (da `status`, `understanding_status`, `document_capabilities`).

## Troubleshooting

- Documento non usato in ricerca: verificare flag AI, PDF, `understanding_status = ready`.
- Coda bloccata: controllare cron Vercel e `CRON_SECRET`.
- Web sempre attivo: match strutturato assente o sotto soglia (`shouldRunWebSearch`).
