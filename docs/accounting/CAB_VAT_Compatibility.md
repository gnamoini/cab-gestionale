# CAB VAT Engine — FatturaPA / SdI Compatibility

**Date:** 2026-09-10  
**Primary sources:**
- [AE — Fatturazione elettronica](https://www1.agenziaentrate.gov.it/web_app_entrate/fatturazione_elettronica.html)
- [Guida compilazione FE v1.9 (2024-03-05)](https://www.agenziaentrate.gov.it/portale/documents/20143/451259/Guida_compilazione-FE-Esterometro-V_1.9_2024-03-05.pdf)

## 1. SdI coherence rules (AE)

SdI verifies consistency between:
- `ImponibileImporto`
- `AliquotaIVA` (when applicable)
- `Imposta` (when applicable)
- `Natura` (for exempt / non-taxable / non-subject / reverse charge cases)

**CAB pre-flight** (`validateInvoiceVatForEInvoice`) mirrors known checks; does **not** replace official SdI validation.

## 2. XML field mapping

| FatturaPA field | CAB source | Resolved by |
|-----------------|------------|-------------|
| `AliquotaIVA` | `invoice_rows.vat_rate` (snapshot) | VAT snapshot at consolidation |
| `Natura` | `invoice_rows.vat_nature` (snapshot) | `vat_natures.code` via configuration |
| `ImponibileImporto` | `invoice_rows.imponibile` | VAT calculation engine |
| `Imposta` | `invoice_rows.iva` | VAT calculation engine |
| `EsigibilitaIVA` | E-invoice context | See §3 |

### 2.1 When Natura is required

Per AE: when operation is exempt, non-taxable, non-subject, or reverse charge, **Natura** replaces/alongside rate semantics. CAB uses `vat_natures.code` from resolved configuration — never inferred from `rate = 0`.

### 2.2 When AliquotaIVA is omitted

For nature-only lines (per tracciato rules), adapter omits `AliquotaIVA` and sets `Natura`. Validation uses triple `(operation_type, nature, rate)` not rate alone.

## 3. EsigibilitaIVA resolution model

**Not stored exclusively on VAT code configuration.**

```text
┌─────────────────────────┐
│ VAT configuration       │  rate, nature, operation_type, direction
└───────────┬─────────────┘
            │
┌───────────▼─────────────┐
│ Document fiscal context │  document_type, issue_date, split_payment,
│                         │  fiscal_regime, payment_terms, …
└───────────┬─────────────┘
            │
┌───────────▼─────────────┐
│ E-invoice VAT context   │  lib/vat/vat-einvoice-context.server.ts
└───────────┬─────────────┘
            │
┌───────────▼─────────────┐
│ FatturaPA adapter       │  EsigibilitaIVA: I | D | S (per tracciato)
└─────────────────────────┘
```

### 3.1 Default rules (initial implementation)

| Condition | EsigibilitaIVA |
|-----------|----------------|
| Standard sales invoice, no split payment | `I` (immediate) |
| Split payment (`cliente.split_payment = true`) | `S` (split payment) |
| Purchase / passive (future) | Per document policy |
| Override in document meta (explicit, audited) | Stored on invoice, validated |

Document-level override requires structured field `fiscal_context.esigibilita_iva` with validation against allowed enum.

## 4. Adapter architecture

```text
IVA Engine (snapshot on document)
    ↓
Normalized Tax Model (vat_snapshot JSONB)
    ↓
Invoice Document Model (invoice + rows)
    ↓
FatturaPA Adapter (lib/fatturazione/fe-sdi/fatturapa-snapshot.ts → future XML)
    ↓
SdI provider (future)
```

**Anti-pattern (forbidden):**

```text
UI → XML fields → database
```

## 5. Pre-flight validation cases

| Case | Expected |
|------|----------|
| imponibile 100, aliquota 22, IVA 22 | PASS |
| imponibile 100, aliquota 22, IVA 20 | FAIL `VAT_AMOUNT_MISMATCH` |
| imponibile 100, natura N4, IVA 0 (coherent config) | PASS |
| natura required but missing | FAIL `VAT_NATURE_REQUIRED` |
| natura present on IMPONIBILE 22% | FAIL `VAT_NATURE_NOT_ALLOWED` |

## 6. Credit notes (TD04)

- NC rows carry own VAT snapshot (negative amounts)
- Reference `parent_invoice_row_id` when correcting specific source lines
- Same `Natura`/`AliquotaIVA` rules apply to NC lines
- Adapter maps document type TD04 without hardcoding VAT engine to TD codes

## 7. Future compatibility notes

- **Esterometro:** separate adapter; same normalized tax model
- **Liquidazione IVA:** derived from `vat_movements`, not re-computed from live config
- **Autofattura / integrativa:** document fiscal context drives EsigibilitaIVA and nature; not new VAT codes unless normatively required

## 8. Compatibility status

| Area | Status |
|------|--------|
| Normalized tax model | FASE 7 — implemented |
| Snapshot → JSON stub | FASE 7 — updated |
| Full XML generation | Future phase |
| SdI transmission | Future phase |
| Official SdI validation substitute | **No** — pre-flight only |
