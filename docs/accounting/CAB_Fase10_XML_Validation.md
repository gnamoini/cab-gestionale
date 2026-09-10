# CAB FASE 10 — Validation

## Levels

1. **CANONICAL** — struttura e campi obbligatori del modello (`validateCanonicalStructure`)
2. **BUSINESS** — regole fiscali CAB, tipo documento, destinatario, totali, TD04/05/24/25 (`validateBusinessRules`)
3. **XSD** — schema ufficiale FatturaPA offline (`validateXmlAgainstXsd`)

## Error model

| Class | When |
|-------|------|
| `InvoiceCanonicalizationError` | Modello canonical invalido |
| `InvoiceBusinessRuleError` | Regole business / CAB |
| `InvoiceXmlValidationError` | XSD fallito |
| `InvoiceXmlSchemaNotFoundError` | XSD/MANIFEST assente |
| `InvoiceXmlSerializationError` | Serializzazione |

## XSD valid ≠ SdI accepted

La validazione XSD è gate locale. Lo SdI applica controlli applicativi aggiuntivi in fase di trasmissione (FASE 11).

## Offline test

`xsd-offline.test.ts` disabilita `fetch` globale e verifica che la validazione XSD passi solo con file locali.
