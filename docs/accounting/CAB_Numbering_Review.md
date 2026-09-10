# CAB Numbering — Review (FASE 6)

## Audit 6A summary

| Legacy system | Action |
|---------------|--------|
| `MAX(numero)+1` invoices | Removed |
| `allocate_invoice_number` (unused, client-exposed) | Dropped |
| `invoice_number_sequences` | Dropped |
| `ddt_numero_counters` + `assign_ddt_numero` | Consolidated → central engine |
| Preventivi counters | Preserved (out of scope) |
| Accounting journal sequences | Untouched |

## Baseline gate assumption

```text
invoices = 0
credit_notes = 0
preventivi = 0 (or preserved separately)
```

→ No FT/NC historical migration; sequences created on-demand at first emit/NC create.

DDT: conditional seed from legacy counters / max confirmed documents when present.

## Decisions recorded

| Topic | Decision |
|-------|----------|
| Series absent | Canonical `DEFAULT`, NOT NULL |
| Fattura numbering | At `emit`, draft `numero NULL` |
| NC | Emessa at create, no draft |
| Allocator | Internal PL/pgSQL, zero EXECUTE grants |
| Gap on rollback | Accepted, no reuse |
| FT vs NC progressions | Separate per `document_type` |
| Display | FT/NC/DDT prefix formats, padding 3 |

## Migration

- `supabase/migrations/20270210120000_fase6_document_numbering_engine.sql`

## Post-change verification

Run:

- `lib/regression/document-numbering-gate.test.ts`
- `lib/document-numbering/*.test.ts`
- Global grep audit: classify `MAX(numero)`, legacy counters → MUST REMOVE on fiscal paths

## RELEASE_GATE checklist

See Definition of Done in FASE 6 plan — static gates PASS; DB integration/concurrency tests require deployed migration on target environment.
