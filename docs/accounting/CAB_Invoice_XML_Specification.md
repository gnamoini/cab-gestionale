# CAB Invoice XML Specification (FASE 9)

## Schema versioning

Table `invoice_xml_schema_versions`:

- `schema_version`, `specification_version`, `namespace`, `root_format`
- `xsd_path`, `xsd_sha256`, `active_from`, `active_to`

Default: `FPR12-v1.2.2`

## Generation pipeline

```text
invoice_snapshot (immutable)
  → CanonicalInvoice
    → buildInvoiceXmlFromCanonical
      → validateInvoiceXml (structural + FPR12 contract)
        → hashInvoiceXml (SHA-256)
          → store_invoice_xml_document
```

## Production gate

XML must pass structural + schema contract validation before `sdi_status=generata`.

Blocked transitions on validation failure.

## Storage

`invoice_xml_documents.xml_content` + `xml_sha256` — authoritative transmitted artifact.
