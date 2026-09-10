# CAB FASE 10 — XML FatturaPA Final Report

```
STATUS: PASS
```

## AUDIT SUMMARY

Read-only audit: [`CAB_Fase10_XML_Audit.md`](CAB_Fase10_XML_Audit.md). Migrated FASE 9 template builder to isolated pure engine. Legacy `fe-sdi` XML modules removed.

## OFFICIAL SCHEMA VERSION

- **Operational spec baseline:** 1.3.1
- **XSD physical files:** 1.2.3 (fatturapa.gov.it v1.4 bundle)
- **Legacy:** 1.2.2 deprecated (`active_to` in migration)

## SUPPORTED FORMATS

- FPR12 (B2B/privati)
- FPA12 (PA — builder ready; enablement when anagrafica PA extended)

## SUPPORTED DOCUMENT TYPES

CAB enabled: TD01, TD04, TD05, TD24, TD25  
Schema-only: TD02–TD03, TD06, TD16–TD23, TD26–TD28

## CANONICAL MODEL

`lib/accounting/einvoice/canonical/` — `CanonicalElectronicInvoice`, `StampDutyData`, `SchemaSupportedDocumentType` / `CabEnabledDocumentType`

## XML BUILDER

`lib/accounting/einvoice/builders/faturapa/` — semantic model → version adapter → XML AST → serializer

## BUSINESS VALIDATOR

`lib/accounting/einvoice/validation/business-rules.ts` — CANONICAL / BUSINESS / XSD levels

## XSD VALIDATOR

`lib/accounting/einvoice/validation/xsd-validator.ts` — libxmljs2, offline dependencies, `xsd-offline.test.ts`

## DATABASE CHANGES

- Migration `20270311120000_fase10_einvoice_schema_1_3_1.sql` — seed FPR12/FPA12 1.3.1, deprecate 1.2.2
- Reuses FASE 9 `invoice_xml_documents` (no parallel tables)

## FILES CREATED

- `lib/accounting/einvoice/**` (engine)
- `lib/fatturazione/einvoice/**` (application boundary)
- `docs/accounting/CAB_Fase10_XML_*.md`
- `app/api/fatturazione/[id]/generate-xml/route.ts`
- Official XSD + MANIFEST under `schemas/faturapa/`

## FILES MODIFIED

- `lib/fatturazione/fe-sdi/fatturapa-xml.server.ts` — delegates to engine
- `lib/fatturazione/fe-sdi/sdi-job-processor.server.ts` — centralized filename
- `lib/fatturazione/invoice-canonical.ts` — compatibility re-export
- `package.json` — `test:fase10`, `libxmljs2`

## LEGACY CODE REMOVED

- `invoice-xml-builder.ts`, `invoice-xml-validator.ts`, `invoice-xml-version.ts`, `fatturapa-snapshot.ts`

## TEST RESULTS

`npm run test:fase10` — **PASS** (golden, business, invariants, xsd-offline, security, fixtures, ciclo-attivo, engine invariants)

## GOLDEN TEST RESULTS

Deterministic byte-for-byte XML + SHA-256 for TD01, PEC, TD04 with reference

## XSD TEST RESULTS

Valid TD01 passes official XSD offline; invalid cases rejected at business layer

## SECURITY TEST RESULTS

Pure engine rejects tampered totals; no string/XML injection path

## PERFORMANCE RESULTS

Bounded reads in mapper (invoice + links + payment_terms); no per-line queries in engine

## KNOWN LIMITATIONS

- Imposta di bollo: `StampDutyData` in canonical; DB field pending fiscal engine decision
- FPA12 PA fields (CIG/CUP) partial via customer_snapshot
- XSD valid ≠ SdI accepted (documented)

## FASE 11 INPUT CONTRACT

```ts
type GeneratedInvoiceXml = {
  xml: string
  schemaVersion: string
  transmissionFormat: "FPR12" | "FPA12"
  documentType: SchemaSupportedDocumentType
  documentNumber: string
  documentDate: string
  sha256: string
  filename: string
  validated: true
}
```

Provider adapters consume `GeneratedInvoiceXml` or stored `invoice_xml_documents` blob — no reopening of fiscal domain.
