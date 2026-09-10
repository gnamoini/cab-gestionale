# CAB FASE 10 — XML Architecture

## Pipeline

```text
CAB fiscal document (invoice_snapshot + bounded reads)
        ↓
CanonicalElectronicInvoice          lib/fatturazione/einvoice/
        ↓
normalize + canonical validation    lib/accounting/einvoice/canonical/
        ↓
business validation                 lib/accounting/einvoice/validation/business-rules.ts
        ↓
FatturaPA semantic model            lib/accounting/einvoice/semantic/
        ↓
version adapter (1.3.1 / legacy)    lib/accounting/einvoice/semantic/version-adapter.ts
        ↓
XML AST builders                    lib/accounting/einvoice/builders/faturapa/
        ↓
deterministic serializer            lib/accounting/einvoice/serialization/
        ↓
XSD validation (offline)            lib/accounting/einvoice/validation/xsd-validator.ts
        ↓
GeneratedInvoiceXml                 immutable artifact
```

## Layer separation

| Layer | Path | Responsibility |
|-------|------|----------------|
| Pure engine | `lib/accounting/einvoice/` | No Supabase, no RBAC, no persistence |
| Application boundary | `lib/fatturazione/einvoice/` | Auth, load, map, persist |
| SDI transmission | `lib/fatturazione/fe-sdi/` | Provider, jobs, webhooks (FASE 11) |

## Entry points

- **Pure:** `generateValidatedInvoiceXml(canonical)`
- **Application:** `generateElectronicInvoiceXml(invoiceId)` 
- **API:** `POST /api/fatturazione/[id]/generate-xml`

## Schema versioning

Baseline operational spec **1.3.1** with official XSD physical files **1.2.3** (fatturapa.gov.it v1.4 bundle). Legacy **1.2.2** retained for historical blobs only.

## XSD offline policy

All XSD dependencies vendored under `lib/accounting/einvoice/schemas/faturapa/`. Validator resolves `import`/`include` locally — no HTTP fetch at runtime.
