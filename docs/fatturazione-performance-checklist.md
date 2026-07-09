# Performance checklist — Fatturazione

Misurare su staging con dataset realistico (500+ fatture).

| Superficie | Target tempo | Target query |
|------------|--------------|--------------|
| Lista fatture | < 2s | 1 payload list |
| Drawer dettaglio | < 1s | ≤ 4 (invoice, rows, timeline paginata, payments) |
| Scadenziario | < 1s | 1 open_items |
| Tab pagamenti | < 1s | 1–2 |

## Query count drawer

Evitare N+1: un drawer con 18+ query è un anti-pattern ERP.

## EXPLAIN ANALYZE

Artefatti committati in `docs/perf/`:

- `fatturazione-timeline.explain`
- `fatturazione-open-items.explain`
- `fatturazione-scadenziario.explain`

Rigenerare con `npx tsx scripts/fatturazione-explain-analyze.ts` su DB staging.
