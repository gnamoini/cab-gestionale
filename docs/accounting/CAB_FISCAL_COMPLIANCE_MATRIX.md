# CAB Fiscal Compliance Matrix

Normative requirements mapped to CAB implementation. **UNKNOWN ≠ PASS.**

Legend: **PASS** | **GAP** | **PARTIAL** | **NOT_APPLICABLE** | **UNKNOWN**

---

## Primary Sources

| # | Fonte | URL | Versione / data |
|---|-------|-----|-----------------|
| S1 | DPR 633/1972 art. 21 (contenuto fattura) | [Normattiva](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.del.presidente.della.repubblica:1972-10-26;633) | vigente |
| S2 | Direttiva 2006/112/CE art. 226 | [EUR-Lex](https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX:32006L0112) | vigente |
| S3 | Specifiche tecniche FatturaPA | [fatturapa.gov.it](https://www.fatturapa.gov.it/it/norme-e-regole/documentazione-fattura-elettronica/formato-fattura/) | v1.4 bundle / XSD 1.2.3 |
| S4 | SdI — documentazione | [agenziaentrate.gov.it](https://www.agenziaentrate.gov.it/portale/web/guest/fatturazione-elettronica) | consultata 2026-09-10 |
| S5 | Linee guida AgID documenti informatici | [AgID](https://www.agid.gov.it/it/design-servizi/lifecycle-di-un-servizio-digitale/dati-e-vocabolari) | riferimento conservazione |
| S6 | GDPR Reg. UE 2016/679 | [EUR-Lex](https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX:32016R0679) | vigente |

---

## Matrix

| Requisito | Fonte | Sezione | Implementazione CAB | Stato | Evidenza |
|-----------|-------|---------|---------------------|-------|----------|
| Numerazione progressiva per serie/anno | S1 art. 21 | — | `allocate_document_number()` FASE 6; emit-only assignment | **PASS** | `20270210120000`, concurrency tests |
| Unicità numero fiscale concorrente | S1; best practice | — | Atomic sequence + advisory pattern | **PASS** | `document-numbering.concurrency.test.ts` |
| Dati cedente/prestatore su documento emesso | S1 art. 21; S3 | CedentePrestatore | `company_fiscal_profile` + `invoice_snapshot` | **PASS** | FASE 5/8 snapshot immutability test |
| Dati cessionario/committente | S1 art. 21; S3 | CessionarioCommittente | `customer_snapshot` at emit | **PASS** | `snapshot-immutability.test.ts` |
| Aliquota IVA / natura / imponibile / imposta | S1; S2 art. 226 | DatiRiepilogo | VAT Engine FASE 7 RPC + row snapshot | **PASS** | `vat-invariants.test.ts` |
| Arrotondamenti monetari deterministici | S2; S3 | decimali | `numeric` DB + explicit rounding in RPC | **PASS** | invoice calculations tests |
| Tipo documento TD01 fattura | S3 | TipoDocumento | Enabled TD01 | **PASS** | `CAB_Fase10_XML_Supported_Documents.md` |
| Nota di credito TD04 | S3 | TipoDocumento | Enabled + linked invoice | **PASS** | golden TD04 test |
| Fattura differita TD24/TD25 + DDT | S3; S1 | DatiDDT | Enabled with DDT links | **PARTIAL** | builder + tests; verify all DDT edge cases |
| Acconto TD02/TD03 | S3 | — | Schema supported, **NOT enabled** | **NOT_APPLICABLE** | Documented out of scope |
| Autofatture TD16–23 | S3 | — | Schema only, disabled | **NOT_APPLICABLE** | Explicitly disabled |
| Esterometro / TD17+ cross-border | S3 | — | Not ciclo attivo CAB | **NOT_APPLICABLE** | — |
| Termine emissione (12 giorni regola generale) | S4 guida FE | — | **Not enforced automatically** | **UNKNOWN** | Requires commercialista policy in FASE 2 |
| Imposta di bollo | S3; S4 | DatiBollo | `StampDutyData` in canonical; no DB rule engine | **UNKNOWN** | `CAB_Fase10_XML_Final_Report.md` limitation |
| Split payment | S3 | — | Not in CAB domain (workshop B2B) | **NOT_APPLICABLE** | — |
| Reverse charge automatico | S3 natura N6.x | — | VAT codes configurable; not all N6 validated live | **PARTIAL** | VAT engine supports nature codes |
| Partita IVA / CF validation | S1 | — | `lib/fiscal/validate.ts` centralized | **PASS** | `fiscal-normalize.test.ts` |
| Codice destinatario / PEC | S3 | — | Snapshot + XML builder | **PASS** | golden PEC test |
| XML conforme XSD FatturaPA | S3 | VFPR12 | Offline XSD validation FASE 10 | **PASS** | `xsd-offline.test.ts` |
| XML deterministico | Best practice SdI | — | Golden byte-for-byte tests | **PASS** | `golden.test.ts` |
| Stato fiscale authority separato da bozza | S4 | RC/NS/MC | `fiscal_validity` axis | **GAP** | Direct UPDATE bypass P0-SEC-01 |
| Conservazione sostitutiva a norma | S5; S4 | — | Storage only (Supabase); no LTA | **GAP** | Documented — external service required |
| Tracciabilità modifiche fiscali | S5 | — | `invoice_state_history`, `invoice_events` | **PASS** | FASE 9 schema |
| Minimizzazione dati in log | S6 art. 5 | — | Partial — no full XML in standard logs | **PARTIAL** | security.test.ts; webhook payload review needed |
| Immutabilità post-emissione | S1; audit | — | Triggers on numero, snapshot, VAT rows | **PASS** | migration triggers F7/F8 |
| Contabilità partita doppia | Civilistico | — | FASE 3 engine DEBIT=CREDIT | **PASS** | `accounting-invariants.test.ts` |
| Period lock | FASE 4 policy | — | `accounting_periods` + RPC guards | **PASS** | `accounting-periods.integration.test.ts` |
| Regole fiscali authoritative | FASE 2 spec | — | Spec **DRAFT** | **UNKNOWN** | `CAB_Accounting_Fiscal_Specification.md` |

---

## TD Code Coverage

| Codice | Classificazione CAB | Note |
|--------|---------------------|------|
| TD01 | SUPPORTED | Ciclo attivo standard |
| TD02 | NOT_SUPPORTED | Out of scope UI |
| TD03 | NOT_SUPPORTED | Out of scope UI |
| TD04 | SUPPORTED | Nota credito |
| TD05 | SUPPORTED | Nota debito |
| TD06 | NOT_SUPPORTED | Parcella |
| TD07–TD09 | NOT_APPLICABLE | Special sectors |
| TD16–TD23 | PARTIALLY_SUPPORTED | Builder/schema; not enabled |
| TD24 | SUPPORTED | Differita art. 21 c.4 lett. a) |
| TD25 | SUPPORTED | Differita lett. b) |
| TD26–TD28 | NOT_SUPPORTED | Casi speciali |

Official TD definitions: S3 Allegati tecnici FatturaPA — `TipoDocumento` code list.

---

## Summary Counts

| Stato | Count |
|-------|-------|
| PASS | 18 |
| PARTIAL | 3 |
| GAP | 2 |
| NOT_APPLICABLE | 6 |
| UNKNOWN | 3 |
