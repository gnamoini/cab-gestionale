# CAB Invoice State Machine (FASE 9)

## document_status (CAB internal)

`bozza` → `da_verificare` → `approvata` → `emessa` → `annullata`

`emessa` means numbered internally — **not** fiscal authority.

## fiscal_validity (fiscal authority)

| Value | Meaning |
|---|---|
| `not_applicable` | Draft |
| `pending` | Emitted, awaiting SdI outcome |
| `validly_issued` | RC or MC received |
| `not_validly_issued` | NS scarto — not fiscally emitted |

## sdi_status (SdI flow)

`da_generare` → `generata` → `inviata` → `consegnata` | `impossibilita_consegna` | `scartata`

`accettata` deprecated for provider_accepted — use transport layer.

## transport_status (invoice_transmissions)

`queued` → `processing` → `provider_accepted` | `provider_error` | `pending_reconciliation` | `failed` | `synced`

### Timeout

```text
TRANSPORT = pending_reconciliation
SDI       = inviata (if submit confirmed) | undetermined
fiscal_validity = pending (unchanged)
```

## Correction after NS

Same `numero/anno/serie/data` → new XML version → new transmission attempt.
