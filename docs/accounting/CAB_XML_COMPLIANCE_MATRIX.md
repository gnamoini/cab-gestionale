# CAB XML Compliance Matrix (FatturaPA)

**Engine:** `lib/accounting/einvoice/**`  
**Schema baseline:** FatturaPA 1.3.1 (operational) / XSD files 1.2.3 (official bundle)  
**Spec reference:** [Documentazione FatturaPA](https://www.fatturapa.gov.it/it/norme-e-regole/documentazione-fattura-elettronica/formato-fattura/) — formato XML v1.4

---

## Validation Layers

| Layer | Module | Gate |
|-------|--------|------|
| CANONICAL | `canonical/` | Type + required fields |
| BUSINESS | `validation/business-rules.ts` | CAB domain rules |
| XSD | `validation/xsd-validator.ts` | libxmljs2 offline |
| GOLDEN | `golden.test.ts` | Byte-stable output |
| SECURITY | `security.test.ts` | Injection / tamper |

---

## Field Matrix (representative)

| Campo XML | Specifica | CAB source | Builder | Test | Stato |
|-----------|-----------|------------|---------|------|-------|
| `FatturaElettronica@versione` | S3 | schema registry 1.3.1 | version adapter | golden | PASS |
| `FatturaElettronicaHeader/DatiTrasmissione/FormatoTrasmissione` | FPR12/FPA12 | customer_snapshot tipo | format resolver | golden | PASS |
| `IdTrasmittente` | S3 | company_fiscal_profile | header builder | golden | PASS |
| `ProgressivoInvio` | S3 | transmission seq | job processor | ciclo-attivo | PASS |
| `CodiceDestinatario` | S3 | customer_snapshot | header | golden PEC/B2B | PASS |
| `PECDestinatario` | S3 | customer_snapshot.pec | header | golden | PASS |
| `CedentePrestatore` | S3 | issuer snapshot | cedente builder | golden | PASS |
| `CessionarioCommittente` | S3 | customer_snapshot | cessionario builder | golden | PASS |
| `DatiGeneraliDocumento/TipoDocumento` | TDxx | invoice.tipo_documento | generali | golden TD01/TD04 | PASS |
| `DatiGeneraliDocumento/Data` | S3 | invoice.data | generali | golden | PASS |
| `DatiGeneraliDocumento/Numero` | S3 | formatted number | generali | golden | PASS |
| `DatiGeneraliDocumento/DatiBollo` | S3 | StampDutyData | bollo section | — | **UNKNOWN** |
| `DatiGeneraliDocumento/DatiDDT` | S3 | invoice_links DDT | DDT builder | ciclo-attivo | PASS |
| `DettaglioLinee` | S3 | invoice_rows snapshot | line builder | golden multi-rate | PASS |
| `DatiRiepilogo` | S3 | VAT aggregation RPC | riepilogo builder | invariants | PASS |
| `AliquotaIVA` | S3 | vat_rate snapshot | riepilogo | golden | PASS |
| `Natura` | S3 | vat_nature snapshot | riepilogo | business-rules | PASS |
| `ImponibileImporto` | S3 | calculated | riepilogo | invariants | PASS |
| `Imposta` | S3 | calculated | riepilogo | invariants | PASS |
| `DatiPagamento` | S3 | payment_terms snapshot | pagamento | fixtures | PARTIAL |
| `Causale` | S3 | invoice note/causale | generali | — | PARTIAL |
| `RiferimentoNumeroLinea` | NC TD04 | invoice_relations | line ref | golden TD04 | PASS |
| Namespace / encoding UTF-8 | S3 | serializer | xml-serializer | golden | PASS |
| Decimali (2 cifre importi) | S3 | rounding SSOT | serializer | invariants | PASS |

---

## Supported Scenarios (test coverage)

| Scenario | TD | Test file | Stato |
|----------|-----|-----------|-------|
| Fattura ordinaria B2B | TD01 | golden.test.ts | PASS |
| Nota di credito | TD04 | golden.test.ts | PASS |
| Cliente PEC | TD01 | golden.test.ts | PASS |
| Multi-aliquota | TD01 | business-rules.test.ts | PASS |
| Natura esente/non imponibile | TD01 | business-rules.test.ts | PASS |
| Arrotondamenti decimali | TD01 | invariants.test.ts | PASS |
| Fattura con DDT | TD24/25 | ciclo-attivo-xml-sdi.test.ts | PASS |
| XSD well-formed + schema | TD01 | xsd-offline.test.ts | PASS |
| Acconto TD02/TD03 | — | — | NOT_SUPPORTED |
| Esterometro | — | — | NOT_APPLICABLE |

---

## Determinism

| Check | Result |
|-------|--------|
| Same canonical input → same XML bytes | PASS (golden SHA-256) |
| Object key ordering in serializer | PASS (explicit sort in AST) |
| Non-deterministic Date.now in XML body | PASS (dates from document) |

---

## Known Gaps

1. **Bollo (`DatiBollo`):** canonical field exists; automatic fiscal rule not implemented — **UNKNOWN / BLOCKED_FOR_MANUAL_REVIEW**
2. **FPA12 PA fields (CIG/CUP):** partial via snapshot — **PARTIAL**
3. **XSD version vs operational 1.3.1:** physical XSD 1.2.3 — documented in FASE 10; SdI may accept — monitor at FASE 11
4. **XSD valid ≠ SdI accepted:** documented; additional SdI controlli applicativi at transmission

---

## Persistence (FASE 9)

| Artifact | Table | Immutability |
|----------|-------|--------------|
| XML blob | `invoice_xml_documents` | append-only trigger |
| Hash | same row | SHA-256 at store |
| Schema version | `invoice_xml_schema_versions` | seeded FPR12/FPA12 1.3.1 |
| Generation audit | `invoice_state_history` | append-only |
