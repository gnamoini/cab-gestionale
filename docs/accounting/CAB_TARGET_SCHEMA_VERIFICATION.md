# CAB Target Schema Verification

**Date:** 2026-09-10  
**Target:** `oxmnuovsgenqkuwfolqh` (CAB Gestionale)  
**Method:** `supabase_migrations.schema_migrations` + `information_schema` / `pg_*` introspection

---

## Summary

| Area | Match |
|------|-------|
| Migration head | **PASS** — `20270312120000` |
| Core tables | **PASS** |
| Fiscal columns on `invoices` | **PASS** |
| Guard triggers | **PASS** |
| RLS on critical tables | **PASS** |
| SDI RPC grants | **PASS** |
| Naming drift | **DOCUMENTED** (see below) |

---

## Tables

| Oggetto | Repository | Target | Match | Azione |
|---------|------------|--------|-------|--------|
| `invoices` | F8/F9 schema | present, RLS 4 policies | YES | — |
| `invoice_fatturapa_snapshots` | append-only + RLS SELECT | present, RLS 1 policy | YES | — |
| `invoice_xml_documents` | F10 | present, RLS 2 policies | YES | — |
| `invoice_transmissions` | F9 | present | YES | — |
| `invoice_sdi_jobs` | F9 | present | YES | — |
| `invoice_sdi_events` | F9 | present | YES | — |
| `document_number_sequences` | F6 | present | YES | — |
| `accounting_entries` / `lines` | F3 | present, RLS | YES | — |
| `accounting_fiscal_years` | F4 rename | present | YES | — |
| `accounting_periods` | F4 | present | YES | — |
| `accounting_audit_events` | F4 | present | YES | — |
| `clienti_anagrafiche` | F5 | present, RLS 7 | YES | — |
| `fornitori_anagrafiche` | F5 | present | YES | — |
| `vat_codes` | F7 | present | YES | — |
| `vat_configurations` | audit doc name | **`vat_code_configurations`** on target | **DOCUMENTED** | Canonical name is `vat_code_configurations` in migrations |

---

## Functions (FASE 3–10 critical RPC)

| Oggetto | Repository | Target | Match | Azione |
|---------|------------|--------|-------|--------|
| `allocate_document_number` | F6 SECURITY DEFINER | exists; no EXECUTE for anon/auth/svc | YES | INTERNAL_ONLY — called from emit TX |
| `apply_sdi_event` | F9 + remediation | exists; EXECUTE **service_role only** | YES | — |
| `handle_sdi_outcome` | F9 + remediation | exists; EXECUTE **service_role only** | YES | — |
| `invoice_insert_event` | F8/F9 | exists; EXECUTE authenticated | YES | actor forced in remediation |
| `update_invoice_draft_with_rows` | F8 | exists; tenant guard patched | YES | — |
| `enqueue_invoice_submission` | F9 | exists | YES | — |

---

## Triggers (remediation + FASE 8/9)

| Oggetto | Repository | Target | Match | Azione |
|---------|------------|--------|-------|--------|
| `invoice_guard_direct_axes_update` | via `trg_invoices_guard_axes` | **present** on `invoices` | YES | Denies direct `fiscal_validity` / `accounting_status` / axes |
| `invoice_guard_emitted_totals_update` | via `trg_invoices_guard_emitted_totals` | **present** on `invoices` | YES | — |
| `trg_invoice_fatturapa_snapshot_append_only` | F8 | present | YES | — |
| `trg_invoice_xml_document_append_only` | F10 | present | YES | — |

**Live test (postgres session):** direct `UPDATE invoices SET fiscal_validity=…` → denied with *Aggiornamento diretto assi stato non consentito*.

---

## Policies & RLS

| Table | RLS enabled | Policies | Match |
|-------|:-----------:|:--------:|:-----:|
| `invoices` | yes | 4 | YES |
| `invoice_fatturapa_snapshots` | yes | 1 (SELECT-only auth) | YES |
| `invoice_xml_documents` | yes | 2 | YES |
| `accounting_entries` | yes | 1 | YES |
| `clienti_anagrafiche` | yes | 7 | YES |

---

## Grants (sensitive RPC)

| Function | SECURITY DEFINER | anon | authenticated | service_role | Match |
|----------|:----------------:|:----:|:-------------:|:------------:|:-----:|
| `apply_sdi_event` | yes | deny | deny | **EXECUTE** | YES |
| `handle_sdi_outcome` | yes | deny | deny | **EXECUTE** | YES |
| `allocate_document_number` | yes | deny | deny | deny | YES (internal) |
| `invoice_insert_event` | yes | deny | EXECUTE | — | YES |

---

## Indexes / constraints

Spot-check: PK/FK on `invoices`, `document_number_sequences`, `invoice_transmissions.idempotency_key` — present per migration SQL. No orphan mismatch flagged in automated diff.

---

## Invariants (target data)

| Check | Result |
|-------|--------|
| Unbalanced accounting entries | **0** |
| Duplicate sequence rows (company/type/year/series) | **0** |
| Duplicate active transmissions per invoice | **0** |
| Emitted snapshots | 0 rows (no emitted XML cycle on prod yet) |

---

## Verdict

**SCHEMA MATCH: PASS** (with documented `vat_code_configurations` naming)
