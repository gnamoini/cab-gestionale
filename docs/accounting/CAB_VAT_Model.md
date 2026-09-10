# CAB VAT Engine — Data Model (FASE 7)

**Date:** 2026-09-10  
**Status:** Target model (implementation reference)

## 1. Architecture layers

```text
VAT Code              = stable identity (code string)
    ↓
VAT Configuration     = what applies (temporal version + direction)
    ↓
VAT Resolution        = which config for (code, date, direction, context)
    ↓
VAT Calculation       = how to compute amounts (separate algorithm)
    ↓
Document Snapshot     = what was actually applied (immutable truth)
    ↓
Accounting Engine     = double-entry
    ↓
FatturaPA Adapter     = XML field mapping
```

**Rule:** Configuration states *what applies*; calculation states *how to compute*; snapshot states *what was applied*.

## 2. Tables

### 2.1 `vat_codes` — identity

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | Stable FK target |
| `company_id` | uuid NOT NULL | Tenant |
| `code` | text NOT NULL | e.g. `IVA22`, `N4` |
| `active` | boolean | Soft disable |
| audit | timestamps | |

UNIQUE `(company_id, code)` — **identity only**, not version.

### 2.2 `vat_code_configurations` — temporal config

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | Referenced by document snapshot |
| `vat_code_id` | uuid FK | Parent code |
| `description` | text | Human label |
| `rate` | numeric(6,3) | ≥ 0 |
| `nature_id` | uuid FK nullable | → `vat_natures` (XML normative) |
| `operation_type_id` | uuid FK | → `vat_operation_types` (CAB internal) |
| `vat_account_id` | uuid FK nullable | → `accounting_accounts` |
| `vat_register_id` | uuid FK nullable | → `vat_registries` |
| `direction` | text | `sales` \| `purchase` \| `both` |
| `deductibility_rate` | numeric(5,2) | 0–100 |
| `valid_from` | date NOT NULL | |
| `valid_to` | date nullable | NULL = open-ended |
| `active` | boolean | |
| `normative_reference` | text | |
| `notes`, `metadata` | text/jsonb | |
| audit | created/updated by | |

**Overlap constraint:**

```sql
EXCLUDE USING gist (
  vat_code_id WITH =,
  direction WITH =,
  daterange(valid_from, coalesce(valid_to, 'infinity'::date), '[]') WITH &&
) WHERE (active = true)
```

**`direction = both` rule:** RPC/trigger rejects insert/update if any overlapping `sales` or `purchase` config exists for same `vat_code_id` in the date range. Conversely, `sales`/`purchase` configs reject overlap with existing `both`.

### 2.3 `vat_natures` — normativa / XML

| Column | Notes |
|--------|-------|
| `code` | N1, N2.1, N3.6, N4, N6.1, … |
| `family` | N1, N2, N3, N4, N5, N6, N7 |
| `description` | Official description |
| `valid_from`, `valid_to`, `active` | Temporal |

**Not** interchangeable with `vat_operation_types`. N6.x = XML reverse charge nature; `REVERSE_CHARGE` in operation_types = CAB internal semantics.

### 2.4 `vat_operation_types` — semantica interna CAB

| Code | Meaning |
|------|---------|
| `IMPONIBILE` | Standard taxable |
| `ESENTE` | Exempt |
| `NON_IMPONIBILE` | Not taxable |
| `NON_SOGGETTA` | Not subject |
| `REVERSE_CHARGE` | Internal RC classification |
| `ALTRO` | Extension bucket |

Governed by DB seed; not hardcoded in TS business logic.

### 2.5 `vat_registries` — evolved

Add: `direction`, `valid_from`, `valid_to`.

### 2.6 `vat_audit_events` — admin trail

Append-only: user, timestamp, entity, old/new values, reason.

## 3. Document snapshot (`invoice_rows`)

Populated **only at consolidation** (`emessa`+). Draft: `vat_code_id` proposed only.

| Column | Purpose |
|--------|---------|
| `vat_code_id` | FK identity |
| `vat_configuration_id` | FK exact config version |
| `vat_snapshot_version` | Schema version (e.g. 1) |
| `vat_code`, `vat_description` | Denormalized |
| `vat_rate`, `vat_nature`, `vat_operation_type` | Applied values |
| `vat_direction` | sales/purchase |
| `vat_deductibility_rate` | |
| `vat_account_id`, `vat_register_id` | |
| `vat_valid_from`, `vat_valid_to` | Config validity |
| `vat_normative_reference` | |
| `vat_snapshot` | JSONB immutable payload |

**Demonstrable chain:**

```text
historical document → code → configuration → version → rule → calculation
```

Header `invoices.imponibile/iva/totale` = derived sum of lines (not independent SSOT).

## 4. Validation rules

### 4.1 Triple validation (mandatory)

Never derive operation type from rate alone:

```text
VALIDATE(operation_type, nature, rate, direction, deductibility)
```

Forbidden: `rate = 0 → automatically NON_IMPONIBILE`.

### 4.2 Resolution inputs (mandatory)

```text
resolveVatConfiguration(code, operationDate, direction, context?)
```

- `direction` and date validity are required
- No fallback to 22% or stored rate
- `default_vat_code_id` on partner = **suggested default only**; server re-validates

### 4.3 Pre-consolidation errors

Structured codes: `VAT_CODE_EXPIRED`, `VAT_NATURE_REQUIRED`, `VAT_AMOUNT_MISMATCH`, etc.

## 5. Calculation policy

- Module: `lib/vat/vat-calculation.server.ts` (separate from resolution)
- Rounding: `lib/vat/vat-rounding.ts` — line → summary → document total
- Invariant: `VAT_AMOUNT ≈ TAXABLE × RATE / 100` within fiscal tolerance
- Negative amounts: NC via document sign, same VAT configuration

## 6. EsigibilitaIVA resolution

Not a mandatory property of `vat_code_configurations`.

```text
VAT configuration
+ document fiscal context (tipo documento, split payment, regime, …)
→ E-invoice VAT context (vat-einvoice-context.server.ts)
→ EsigibilitaIVA (FatturaPA adapter)
```

## 7. Lifecycle

| Event | Action |
|-------|--------|
| Create code | Insert `vat_codes` + first `vat_code_configurations` |
| Norm change | Close old config (`valid_to`), insert new config |
| Config in use | No UPDATE of historical fields — new version only |
| Deactivate | `active=false` or `valid_to`; no DELETE if referenced |

## 8. Relation to Accounting (FASE 3–4)

- VAT Engine provides treatment; Accounting Engine writes entries
- `vat_movements` populated at `accounting_post_entry` from document snapshots
- Period guards: reuse `accounting_assert_period_open_for_posting`
- Indeductible VAT: second accounting line from `deductibility_rate < 100`

## 9. Invariants

1. No overlapping active configs for same `(vat_code_id, direction)`
2. Posted document rows: VAT snapshot immutable
3. Changes to live config do not alter consolidated documents
4. No physical DELETE of referenced VAT codes/configs
5. Client cannot set rate/nature/account/register directly on consolidated docs
