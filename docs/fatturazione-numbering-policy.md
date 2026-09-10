# Politica numerazione fatture (legacy)

**Sostituita da FASE 6.** SSOT attuale:

- [`CAB_Numbering_Architecture.md`](./CAB_Numbering_Architecture.md)
- [`CAB_Numbering_Specification.md`](./CAB_Numbering_Specification.md)

## Riepilogo

- Motore centralizzato: `document_number_sequences` + `allocate_document_number()` (interno, non client).
- Fattura bozza: `numero IS NULL`; emissione via `invoice_apply_transition('emit')`.
- Buchi di numerazione accettabili su rollback transazione (nessun riciclo).
