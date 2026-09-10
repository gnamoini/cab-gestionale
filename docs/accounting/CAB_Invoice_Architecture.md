# CAB Invoice Engine — Architecture (FASE 9)

## Layer model

```text
UI (fatturazione)
  → RPC / API server
    → Canonical Invoice (read model)
      → XML Engine (builder + validator + hash)
        → invoice_xml_documents (blob)
          → invoice_transmissions (transport_status)
            → Provider (Aruba WS / simulator)
              → invoice_sdi_events (canonical + raw)
                → apply_sdi_event (sole writer sdi_status + fiscal_validity)
```

## Four independent axes

| Axis | Authority | Writer |
|---|---|---|
| `document_status` | Documentale CAB | `invoice_apply_transition` |
| `fiscal_validity` | Fiscale (KPI, incassi, NC) | `apply_sdi_event` only |
| `sdi_status` | Flusso SdI | `apply_sdi_event` only |
| `transport_status` | Canale provider | Job processor on `invoice_transmissions` |

**Rule:** `provider_accepted` never modifies `fiscal_validity`.

## Correlation chain

```text
invoice_xml_documents.id
  → invoice_transmissions.xml_document_id
    → provider_request_id / sdi_identifier
      → invoice_sdi_events
```

## Integrations

- Numbering: FASE 6 `allocate_document_number` on emit
- VAT: FASE 7 validate + consolidate on emit
- Accounting: FASE 3 post on emit; reverse on NS scarto
- Master data: `clienti_anagrafiche` + emission snapshot
