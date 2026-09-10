# CAB FASE 10 — XML FatturaPA Audit (read-only)

**Date:** 2026-03-10  
**Status:** FASE 0 complete — no code/DB changes in this phase

## CURRENT ARCHITECTURE

```text
invoice_snapshot (FASE 8, immutable post-emissione)
  → lib/fatturazione/invoice-canonical.ts (parziale)
  → lib/fatturazione/fe-sdi/invoice-xml-builder.ts (template literal)
  → lib/fatturazione/fe-sdi/invoice-xml-validator.ts (structural only)
  → sdi-job-processor.server.ts → store_invoice_xml_document → provider
```

FASE 9 storage: `invoice_xml_documents`, `invoice_xml_schema_versions`, `invoice_transmissions`, `invoice_sdi_events`, `invoice_state_history`.

## EXISTING FISCAL DOCUMENT MODEL

| Entity | Table / RPC | Notes |
|--------|-------------|-------|
| Fatture / NC / ND / proforma | `invoices` | `document_type`, `fattura_pa_tipo_documento` (TD01/04/05/24/25) |
| Righe | `invoice_rows` | VAT snapshot FASE 7 (`vat_rate`, `vat_nature`) |
| Collegamenti | `invoice_links` | preventivo, DDT, lavorazione, consuntivo |
| Snapshot emissione | `invoices.invoice_snapshot` | RPC `invoice_build_emission_snapshot` |
| Cedente SSOT | `company_fiscal_profile` | FASE 5/8 |
| Cliente fiscale | `clienti_anagrafiche` + `customer_snapshot` | codice_destinatario, PEC, split_payment |
| Preventivi | `preventivi` | Non documenti fiscali; bridge via `invoice_links` |

Stati: `document_status`, `sdi_status`, `accounting_status`, `fiscal_validity`.

## EXISTING INVOICE DATA MODEL

- Types: `src/types/supabase-tables.ts` (`InvoiceRow`, `FatturaPaTipoDocumento`)
- Services: `src/services/invoices.service.ts`
- Ciclo attivo: `lib/fatturazione/ciclo-attivo/*`
- Snapshot builder: `invoice_build_emission_snapshot` in migration `20270212120100`

## EXISTING VAT MODEL

- SSOT: `vat_resolve_configuration`, `vat_validate_document` (FASE 7 RPC)
- TS: `lib/vat/vat-engine.server.ts`, `vat-calculation.ts`, `vat-einvoice-context.ts`
- Snapshot on emit: `vat_rate`, `vat_nature` on `invoice_rows`
- Natures seed: N2.x, N3.x, N4, N6.x in `vat_natures`

## EXISTING NUMBERING MODEL

- SSOT: `allocate_document_number()` (FASE 6, internal RPC only)
- Display: `lib/document-numbering/format-document-number.ts`

## EXISTING CUSTOMER FISCAL MODEL

- `clienti_anagrafiche`: P.IVA, CF, PEC, `codice_destinatario`, `split_payment`
- Validation: `lib/fiscal/validate.ts`, `lib/fiscal/normalize.ts`
- Admin RPC: `admin_create_cliente` / `admin_update_cliente` (FASE 5)

## EXISTING XML/SDI CODE

| File | Role |
|------|------|
| `lib/fatturazione/fe-sdi/invoice-xml-builder.ts` | Template XML (legacy) |
| `lib/fatturazione/fe-sdi/fatturapa-xml.server.ts` | Orchestrator + deprecated legacy |
| `lib/fatturazione/fe-sdi/invoice-xml-validator.ts` | Substring structural check |
| `lib/fatturazione/fe-sdi/invoice-xml-version.ts` | Hardcoded FPR12-v1.2.2 |
| `lib/fatturazione/fe-sdi/invoice-xml-hash.ts` | SHA-256 |
| `lib/fatturazione/fe-sdi/sdi-job-processor.server.ts` | XML gen + store + submit |
| `lib/fatturazione/invoice-canonical.ts` | Partial canonical |
| `lib/fatturazione/invoice-pre-submit-validator.ts` | Business rules (partial) |
| `lib/fatturazione/fe-sdi/fatturapa-snapshot.ts` | Orphan stub |

No React XML generation. No server actions building XML.

## DUPLICATIONS

- Template builder + deprecated `buildFatturapaXmlFromSnapshotLegacy`
- IVA ricalcolo in `buildCanonicalInvoiceFromSnapshot` (line 102) duplica VAT Engine
- Default `codice_destinatario = "0000000"` nel builder attuale

## LEGACY PATHS

- FASE 9 seed `FPR12-v1.2.2` senza file XSD in repo
- `invoice_sdi_submissions` (read-only legacy)
- UnoERP routes removed

## MISSING DATA

| Field | Status |
|-------|--------|
| Imposta di bollo | Non su `invoices`; `StampDutyData` in canonical FASE 10 |
| DatiPagamento | Non in snapshot; da `payment_terms` nel mapper |
| CIG/CUP | Non verificati in anagrafica standard |
| FPA12 transmission | Non implementato in builder legacy |
| Riferimenti strutturati DDT/ordine | Non in snapshot; da `invoice_links` |
| `esigibilita_iva` documento | Da `customer_snapshot` + fiscal context |

## SCHEMA VERSION INVENTORY

| schemaVersion | XSD file | specification | format | isActive (target) | Note |
|---------------|----------|---------------|--------|-------------------|------|
| 1.3.1 | VFPR12/VFPA12 v1.2.3 (official XSD) | FatturaPA op. 1.3.1 | FPR12, FPA12 | **yes** | Baseline FASE 10 |
| 1.2.2 | VFPR12-root legacy | 1.2.2 | FPR12 | no (compat) | Solo storico se blob esistenti |

Official XSD downloaded from fatturapa.gov.it (v1.4 bundle, XSD physical 1.2.3). Operational spec baseline: **1.3.1**.

## RISK ITEMS

1. XSD valid ≠ SdI accepted (controlli applicativi aggiuntivi)
2. Accoppiamento XML generation ↔ SDI job processor
3. Nessuna validazione XSD reale pre-FASE 10
4. Inventato codice destinatario default
5. Migrations FASE 8–9 possono non essere applicate in tutti gli ambienti

## RECOMMENDED CANONICAL BOUNDARY

```text
lib/accounting/einvoice/           PURE ENGINE (canonical → XML → XSD)
lib/fatturazione/einvoice/         APPLICATION (auth, load, map, persist)
lib/fatturazione/fe-sdi/           TRANSMISSION ONLY (FASE 11)
```

SSOT contenuto fiscale: `invoice_snapshot` + motori FASE 5–7. XML = artefatto derivato immutabile in `invoice_xml_documents`.
