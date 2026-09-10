# CAB Accounting & Fiscal Review

> **Template per revisione commercialista**
>
> Questo documento è la versione leggibile della matrice di approvazione in [CAB_Accounting_Fiscal_Specification.md](./CAB_Accounting_Fiscal_Specification.md).
>
> **Esportazione DOCX:** aprire questo file in Microsoft Word o eseguire localmente:
> `pandoc CAB_Accounting_Fiscal_Review.md -o CAB_Accounting_Fiscal_Review.docx`
>
> Il DOCX **non è SSOT**. La versione approvata resta nel markdown versionato con stato `APPROVED`.

| Campo | Valore |
|-------|--------|
| Documento | CAB Accounting & Fiscal Review |
| Versione specifica | 0.1 |
| Stato | DRAFT — PENDING COMMERCIALIST REVIEW |
| Data | 2026-09-10 |
| Revisore | _________________________ |
| Data revisione | _________________________ |

---

## Istruzioni per il revisore

Per ogni riga:

1. Leggere la **Domanda** e la **Proposta attuale**
2. Selezionare **Approvata** o **Modificata**
3. In caso di **Modificata**, scrivere la decisione nella colonna **Decisione commercialista**
4. Aggiungere eventuali **Note**

Le decisioni con TIPO `TECNICA` sono in sezione separata — non richiedono approvazione fiscale.

---

## Sezione A — Decisioni fiscali e contabili

### A.1 Regime e anagrafica

| ID | Domanda | Proposta attuale | ☐ Approvata | ☐ Modificata | Decisione commercialista | Note |
|----|---------|------------------|-------------|--------------|--------------------------|------|
| FISC-001 | Qual è il regime fiscale di CAB? | DA CONFERMARE | ☐ | ☐ | | |
| FISC-002 | Regime IVA particolare (split, forfettario, ecc.)? | DA CONFERMARE | ☐ | ☐ | | |
| FISC-003 | Dati obbligatori FatturaPA emittente | DA FORNIRE A CAB | ☐ | ☐ | | |

### A.2 IVA

| ID | Domanda | Proposta attuale | ☐ Approvata | ☐ Modificata | Decisione commercialista | Note |
|----|---------|------------------|-------------|--------------|--------------------------|------|
| IVA-001 | Aliquota IVA standard servizi officina | 22% (default tecnico — NON approvato) | ☐ | ☐ | | |
| IVA-002 | Aliquota IVA vendita ricambi | 22% (default tecnico — NON approvato) | ☐ | ☐ | | |
| IVA-003 | Nature IVA utilizzate (N1–N7) | DA DEFINIRE | ☐ | ☐ | | |
| IVA-004 | Split payment per clienti PA | DA DEFINIRE | ☐ | ☐ | | |
| IVA-005 | Reverse charge applicabile a CAB? | DA CONFERMARE | ☐ | ☐ | | |
| IVA-006 | Periodicità liquidazione IVA | DA DEFINIRE | ☐ | ☐ | | |
| IVA-007 | Regole competenza vs esigibilità IVA | DA DEFINIRE | ☐ | ☐ | | |

### A.3 Piano dei conti e causali

| ID | Domanda | Proposta attuale | ☐ Approvata | ☐ Modificata | Decisione commercialista | Note |
|----|---------|------------------|-------------|--------------|--------------------------|------|
| CONT-001 | Piano dei conti completo | DA DEFINIRE | ☐ | ☐ | | |
| CONT-002 | Conto ricavi servizi officina | DA DEFINIRE | ☐ | ☐ | | |
| CONT-003 | Conto ricavi vendita ricambi | DA DEFINIRE | ☐ | ☐ | | |
| CONT-004 | Conto partite clienti | DA DEFINIRE | ☐ | ☐ | | |
| CONT-005 | Conto partite fornitori | DA DEFINIRE | ☐ | ☐ | | |
| CONT-006 | Conti IVA vendite e acquisti | DA DEFINIRE | ☐ | ☐ | | |
| CONT-007 | Conti bancari e cassa | DA DEFINIRE | ☐ | ☐ | | |
| CONT-008 | Scrittura fattura cliente (dare/avere) | Esempio in specifica — DA APPROVARE | ☐ | ☐ | | |
| CONT-009 | Scrittura incasso cliente (dare/avere) | Esempio in specifica — DA APPROVARE | ☐ | ☐ | | |
| CONT-010 | Scrittura nota credito cliente | Esempio in specifica — DA APPROVARE | ☐ | ☐ | | |
| CONT-011 | Scrittura fattura fornitore | Esempio in specifica — DA APPROVARE | ☐ | ☐ | | |
| CONT-012 | Scrittura pagamento fornitore | DA DEFINIRE | ☐ | ☐ | | |
| CONT-013 | Trattamento contabile acconto cliente | DA DEFINIRE | ☐ | ☐ | | |
| CONT-014 | Trattamento IVA su acconti | DA DEFINIRE | ☐ | ☐ | | |
| CONT-015 | Scritture chiusura esercizio | DA DEFINIRE | ☐ | ☐ | | |
| CONT-016 | Scritture di assestamento necessarie | DA DEFINIRE | ☐ | ☐ | | |
| CONT-017 | Gestione cespiti in gestionale (SI/NO) | DA CONFERMARE | ☐ | ☐ | | |

### A.4 Documento → Scrittura contabile

| ID | Domanda | Proposta attuale | ☐ Sì genera | ☐ No | ☐ Condizionale | ☐ Da definire | Decisione | Note |
|----|---------|------------------|-------------|------|----------------|---------------|-----------|------|
| DOC-001 | Preventivo genera scrittura? | NON_GENERA_SCRITTURA | ☐ | ☐ | ☐ | ☐ | | |
| DOC-002 | Consuntivo genera scrittura? | NON_GENERA_SCRITTURA | ☐ | ☐ | ☐ | ☐ | | |
| DOC-003 | DDT genera scrittura? | DA_DEFINIRE | ☐ | ☐ | ☐ | ☐ | | |
| DOC-004 | Fattura cliente genera scrittura? | GENERA_SCRITTURA | ☐ | ☐ | ☐ | ☐ | | |
| DOC-005 | Proforma genera scrittura? | DA_DEFINIRE | ☐ | ☐ | ☐ | ☐ | | |
| DOC-006 | Ordine fornitore genera scrittura? | NON_GENERA_SCRITTURA | ☐ | ☐ | ☐ | ☐ | | |
| DOC-007 | Ricezione merce genera scrittura? | DA_DEFINIRE | ☐ | ☐ | ☐ | ☐ | | |
| DOC-008 | Incasso genera scrittura separata da fattura? | GENERA_SCRITTURA | ☐ | ☐ | ☐ | ☐ | | |
| DOC-009 | Regole fatturazione differita da DDT | DA DEFINIRE | ☐ | ☐ | ☐ | ☐ | | |
| DOC-010 | Meccanismo correzione: storno vs NC vs rettifica | DA DEFINIRE | ☐ | ☐ | ☐ | ☐ | | |

### A.5 Operatività e scadenziario

| ID | Domanda | Proposta attuale | ☐ Approvata | ☐ Modificata | Decisione | Note |
|----|---------|------------------|-------------|--------------|-----------|------|
| OP-001 | Master scadenza: operativo vs contabile | Operativo (`customer_open_items`) | ☐ | ☐ | | |
| OP-002 | Chi può registrare/stornare scritture | DA DEFINIRE | ☐ | ☐ | | |
| OP-003 | Report contabili obbligatori nel gestionale | DA DEFINIRE | ☐ | ☐ | | |

### A.6 Fatturazione elettronica e conservazione

| ID | Domanda | Proposta attuale | ☐ Approvata | ☐ Modificata | Decisione | Note |
|----|---------|------------------|-------------|--------------|-----------|------|
| SDI-001 | Requisiti emissione fatture elettroniche | Schema stub — DA DEFINIRE | ☐ | ☐ | | |
| SDI-002 | Requisiti ricezione fatture passive | Modulo assente | ☐ | ☐ | | |
| SDI-003 | Requisiti conservazione sostitutiva | DA DEFINIRE | ☐ | ☐ | | |

---

## Sezione B — Decisioni tecniche (informativo per CAB / team sviluppo)

> Non richiedono approvazione fiscale. Il commercialista può leggere per contesto.

| ID | Domanda | Proposta | Decisione CAB/Tech | Note |
|----|---------|----------|-------------------|------|
| TECH-001 | Modello anagrafica: `clienti_anagrafiche` vs `billing_customers` | Policy snapshot a fattura | | |
| TECH-002 | Anagrafica fornitori: tabella vs JSON settings | DA DEFINIRE | | |
| TECH-003 | Idempotenza scritture `(source_type, source_id)` | Pattern proposto in idempotency.md | | |
| TECH-004 | Provider SdI (Aruba o altro) | DA SCEGLIERE | | |
| TECH-005 | Nessuna integrazione ERP esterna per contabilità | UnoERP rimosso | | |

---

## Sezione C — Dati da fornire a CAB

Compilare i campi mancanti dell'anagrafica fiscale emittente:

| Campo | Valore |
|-------|--------|
| Denominazione | |
| Forma giuridica | |
| Partita IVA | |
| Codice fiscale | |
| Sede legale | |
| Sede operativa | |
| Codice destinatario SdI | |
| PEC | |
| REA / CCIAA | |
| Capitale sociale | |
| Rappresentante legale | |

---

## Firma e approvazione

| Ruolo | Nome | Firma | Data |
|-------|------|-------|------|
| Commercialista / Consulente fiscale | | | |
| Responsabile CAB | | | |

**Esito revisione:**

- ☐ Specifica approvata senza modifiche → aggiornare stato a `APPROVED` in CAB_Accounting_Fiscal_Specification.md v0.2
- ☐ Specifica approvata con modifiche → documentare modifiche in changelog
- ☐ Richiede ulteriori chiarimenti → stato `NEEDS_CLARIFICATION`

---

## Riferimenti

- [CAB_Accounting_Fiscal_Specification.md](./CAB_Accounting_Fiscal_Specification.md) — documento canonico
- [CAB_Accounting_Fiscal_Gap_Analysis.md](./CAB_Accounting_Fiscal_Gap_Analysis.md) — gap analysis
