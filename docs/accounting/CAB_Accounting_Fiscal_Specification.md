# CAB Accounting & Fiscal Specification

| Campo | Valore |
|-------|--------|
| Documento | CAB Accounting & Fiscal Specification |
| Versione | 0.1 |
| Stato | DRAFT — PENDING COMMERCIALIST REVIEW |
| Data | 2026-09-10 |

Documenti correlati:

- [CAB_Accounting_Fiscal_Gap_Analysis.md](./CAB_Accounting_Fiscal_Gap_Analysis.md)
- [CAB_Accounting_Fiscal_Review.md](./CAB_Accounting_Fiscal_Review.md) (template revisione commercialista)

---

## Autorità della specifica

> **Questo documento non costituisce consulenza fiscale né contabile.**
>
> La presente versione rappresenta una raccolta strutturata delle regole, decisioni e domande necessarie alla progettazione della futura contabilità del Gestionale CAB.
>
> Nessuna regola marcata `PENDING`, `PROPOSED`, `NEEDS_CLARIFICATION` o `DA APPROVARE` può essere utilizzata come regola definitiva di produzione.
>
> La futura implementazione deve derivare esclusivamente dalla versione della specifica formalmente approvata da CAB e dal proprio professionista fiscale/contabile.

---

## Indice

1. [Contesto e perimetro](#contesto-e-perimetro)
2. [Anagrafica fiscale CAB](#anagrafica-fiscale-cab)
3. [Piano dei conti](#piano-dei-conti)
4. [Registri IVA](#registri-iva)
5. [Aliquote IVA e natura IVA](#aliquote-iva-e-natura-iva)
6. [Causali contabili](#causali-contabili)
7. [Documento → Scrittura Contabile](#documento--scrittura-contabile)
8. [Schede dettaglio documenti ed eventi](#schede-dettaglio-documenti-ed-eventi)
9. [Fatture clienti](#fatture-clienti)
10. [Fatture differite](#fatture-differite)
11. [Note credito e note debito](#note-credito-e-note-debito)
12. [Acconti](#acconti)
13. [Incassi](#incassi)
14. [Pagamenti](#pagamenti)
15. [Scadenziario](#scadenziario)
16. [Banche](#banche)
17. [Cespiti](#cespiti)
18. [Ammortamenti](#ammortamenti)
19. [IVA periodica](#iva-periodica)
20. [Chiusura esercizio](#chiusura-esercizio)
21. [Scritture di assestamento](#scritture-di-assestamento)
22. [Regole di competenza](#regole-di-competenza)
23. [Annullamenti e correzioni](#annullamenti-e-correzioni)
24. [Audit trail](#audit-trail)
25. [Regole di immutabilità](#regole-di-immutabilità)
26. [Integrazione SdI / FatturaPA](#integrazione-sdi--fatturapa)
27. [Provider fatturazione elettronica](#provider-fatturazione-elettronica)
28. [Separazione regole fiscali e implementazione tecnica](#separazione-regole-fiscali-e-implementazione-tecnica)
29. [Matrice di approvazione](#matrice-di-approvazione)
30. [Commercialista Review Questionnaire](#commercialista-review-questionnaire)
31. [Assumptions & Open Issues](#assumptions--open-issues)
32. [Checklist completamento FASE 2](#checklist-completamento-fase-2)

---

## Contesto e perimetro

### Obiettivo FASE 2

Produrre la specifica funzionale, fiscale e contabile per il Gestionale CAB **prima** di qualsiasi implementazione del motore contabile, fatturazione elettronica operativa, registri IVA, scadenziario contabile, prima nota, integrazione bancaria o altra logica fiscale.

### Stato attuale del software (sintesi audit)

Il Gestionale CAB dispone di un **modulo Fatturazione AR** (fatture attive, incassi, scadenziario cliente, note credito) con scaffolding contabile (`accounting_entries`) e schema SdI, ma **senza contabilità generale approvata**.

| Componente | Stato | Nota |
|------------|-------|------|
| Fatture attive | Operativo | `invoices`, hub `/fatturazione` |
| Incassi / partite cliente | Operativo | `customer_payments`, `customer_open_items` |
| Note credito cliente | Operativo | `create_credit_note_from_invoice` |
| Prima nota | Scaffolding | Auto-generazione **disabilitata** |
| SdI | Schema + stub | Nessun invio reale |
| Fatture passive | Assente | — |
| Piano dei conti | Assente | — |
| Registri IVA | Assente | — |

**Implementazioni operative correnti (NON approvate fiscalmente):**

- IVA default 22% su `invoice_rows.iva_percent`
- Tipi documento: `fattura`, `nota_credito`, `proforma`
- Metodi pagamento: bonifico, contanti, assegno, pos, altro
- Assi stato: `document_status`, `payment_status`, `sdi_status`, `accounting_status`

### Regola Documento → Scrittura

Per ogni evento nella matrice principale sono possibili questi esiti:

| Esito | Significato |
|-------|-------------|
| `GENERA_SCRITTURA` | L'evento produce una registrazione contabile approvata |
| `NON_GENERA_SCRITTURA` | Esito esplicito: nessuna registrazione (non è un dato mancante) |
| `GENERA_SCRITTURA_CONDIZIONALE` | Registrazione solo se si verificano condizioni approvate |
| `DA_DEFINIRE` | Decisione non ancora presa |

**Nessuna scrittura deve essere dedotta dal solo fatto che il documento esiste nel Gestionale CAB.**

### Classificazione decisioni

Ogni decisione nella matrice di approvazione ha un **TIPO**:

- `FISCALE` — scelta fiscale (commercialista)
- `CONTABILE` — scelta contabile (commercialista)
- `OPERATIVA` — processo gestionale (CAB / commercialista se impatta fiscalità)
- `TECNICA` — architettura software (team tecnico)
- `MISTA` — coinvolge più autorità

---

## Anagrafica fiscale CAB

Dati dell'emittente necessari per fatturazione elettronica, registrazioni contabili e adempimenti fiscali.

| Campo | Valore | Fonte / Note |
|-------|--------|--------------|
| Denominazione / Ragione sociale | [DA FORNIRE A CAB] | Non centralizzato in DB |
| Forma giuridica | [DA CONFERMARE CON COMMERCIALISTA] | |
| Partita IVA | [DA FORNIRE A CAB] | |
| Codice fiscale | [DA FORNIRE A CAB] | |
| Sede legale | [DA FORNIRE A CAB] | |
| Sede operativa | [DA FORNIRE A CAB] | Se diversa da legale |
| Codice destinatario (SdI) | [DA FORNIRE A CAB] | |
| PEC | [DA FORNIRE A CAB] | |
| Regime fiscale | [DA CONFERMARE CON COMMERCIALISTA] | |
| Regime IVA particolare | [DA CONFERMARE CON COMMERCIALISTA] | Es. split payment, forfettario, ecc. |
| REA / CCIAA | [DA FORNIRE A CAB] | Se applicabile |
| Capitale sociale | [DA FORNIRE A CAB] | Se applicabile |
| Rappresentante legale | [DA FORNIRE A CAB] | |
| Dati FatturaPA emittente | [DA CONFERMARE CON COMMERCIALISTA] | Campi obbligatori XML |

**Stato attuale sistema:** `CabBrandingSettings` (`lib/branding/branding-settings-model.ts`) contiene solo logo, colore e URL sito. **Nessun profilo fiscale emittente in database.**

**APPROVAZIONE COMMERCIALISTA:** DA APPROVARE

---

## Piano dei conti

Il piano dei conti **non è definito**. Il sistema non deve creare conti automaticamente senza regola approvata.

| Codice | Conto | Tipo | Utilizzo | Approvazione |
|--------|-------|------|----------|--------------|
| DA DEFINIRE | DA DEFINIRE | Ricavo/Costo/Attivo/Passivo/Patrimonio | DA DEFINIRE | Commercialista |
| DA DEFINIRE | Clienti | Attivo | Partite clienti | Commercialista |
| DA DEFINIRE | Fornitori | Passivo | Partite fornitori | Commercialista |
| DA DEFINIRE | Ricavi servizi officina | Ricavo | Fatture servizi | Commercialista |
| DA DEFINIRE | Ricavi vendita ricambi | Ricavo | Fatture materiali | Commercialista |
| DA DEFINIRE | IVA vendite | Passivo | Registro vendite | Commercialista |
| DA DEFINIRE | IVA acquisti | Attivo | Registro acquisti | Commercialista |
| DA DEFINIRE | Banca c/c | Attivo | Incassi/pagamenti | Commercialista |
| DA DEFINIRE | Cassa | Attivo | Incassi contanti | Commercialista |
| DA DEFINIRE | Acconti clienti | Passivo/Attivo | DA DEFINIRE | Commercialista |
| DA DEFINIRE | Acconti fornitori | Attivo/Passivo | DA DEFINIRE | Commercialista |
| DA DEFINIRE | Conti transitori | DA DEFINIRE | DA DEFINIRE | Commercialista |
| DA DEFINIRE | Cespiti | Attivo | Se applicabile | Commercialista |
| DA DEFINIRE | Ammortamenti | Costo | Se applicabile | Commercialista |

**Stato attuale sistema:** `accounting_entry_lines.account_code` è testo libero senza validazione (`20260910150300_fatturazione_erp_phase3.sql`).

**APPROVAZIONE COMMERCIALISTA:** DA APPROVARE

---

## Registri IVA

| Aspetto | Valore proposto | Approvazione |
|---------|-----------------|--------------|
| Registro IVA vendite | DA DEFINIRE | Commercialista |
| Registro IVA acquisti | DA DEFINIRE | Commercialista |
| Registri speciali | DA DEFINIRE | Commercialista |
| Numerazione registri | DA DEFINIRE | Commercialista |
| Periodicità liquidazione | DA DEFINIRE | Commercialista |
| Modalità liquidazione | DA DEFINIRE | Commercialista |
| Data di riferimento registrazione | DA DEFINIRE | Commercialista |
| Competenza vs esigibilità | DA DEFINIRE | Commercialista |
| Eccezioni applicabili a CAB | DA DEFINIRE | Commercialista |

**Stato attuale sistema:** rollup IVA operativo in UI (`fatturazione-iva-section.tsx`); enum `accounting_status` include `da_liquidare`/`liquidata` senza workflow.

**APPROVAZIONE COMMERCIALISTA:** DA APPROVARE

---

## Aliquote IVA e natura IVA

Matrice template. Solo casistiche **plausibili** per officina CAB (servizi, ricambi, eventuale PA). Non includere reverse charge o altre casistiche se non confermate applicabili.

| Codice | Aliquota | Descrizione | Natura | Registro | Conto IVA | Note | Approvazione |
|--------|----------|-------------|--------|----------|-----------|------|--------------|
| DA DEFINIRE | 22% (default tecnico sistema) | Servizi officina / manodopera | DA DEFINIRE | Vendite | DA DEFINIRE | Default `invoice_rows.iva_percent` — **NON approvato** | Commercialista |
| DA DEFINIRE | DA DEFINIRE | Vendita ricambi / materiali | DA DEFINIRE | Vendite | DA DEFINIRE | | Commercialista |
| DA DEFINIRE | DA DEFINIRE | Operazioni PA | DA DEFINIRE | DA DEFINIRE | DA DEFINIRE | `invoice_public_administration_meta` (CIG/CUP) | Commercialista |
| DA DEFINIRE | DA DEFINIRE | Esente / non imponibile | DA DEFINIRE | DA DEFINIRE | DA DEFINIRE | Solo se applicabile CAB | Commercialista |
| DA DEFINIRE | DA DEFINIRE | Split payment | DA DEFINIRE | DA DEFINIRE | DA DEFINIRE | `billing_customer_profiles.split_payment` esiste — regola non definita | Commercialista |
| DA DEFINIRE | DA DEFINIRE | Reverse charge | DA DEFINIRE | DA DEFINIRE | DA DEFINIRE | **DA CONFERMARE** se applicabile CAB | Commercialista |

**APPROVAZIONE COMMERCIALISTA:** DA APPROVARE

---

## Causali contabili

Per ogni causale: tutte le voci sotto `DA DEFINIRE` / `DA APPROVARE`.

### Causale: Fattura cliente

| Campo | Valore |
|-------|--------|
| Codice | DA DEFINIRE |
| Descrizione | Emissione fattura attiva |
| Tipo documento | `fattura` |
| Documento sorgente | `invoices` (`lib/fatturazione/`) |
| Data registrazione | DA DEFINIRE |
| Data competenza | DA DEFINIRE |
| Registro IVA | Vendite — DA DEFINIRE |
| Tipo movimento | DA DEFINIRE |
| Conto Dare | Cliente — DA DEFINIRE |
| Conto Avere | Ricavi + IVA vendite — DA DEFINIRE |
| Gestione IVA | DA DEFINIRE |
| Gestione scadenze | DA DEFINIRE |
| Gestione cliente/fornitore | Cliente — DA DEFINIRE |
| Note | |
| Approvazione commercialista | DA APPROVARE |

### Causale: Fattura fornitore

| Campo | Valore |
|-------|--------|
| Codice | DA DEFINIRE |
| Descrizione | Registrazione fattura passiva |
| Tipo documento | Fattura acquisto — modulo assente |
| Documento sorgente | DA DEFINIRE |
| Conto Dare | Costi + IVA acquisti — DA DEFINIRE |
| Conto Avere | Fornitore — DA DEFINIRE |
| Approvazione commercialista | DA APPROVARE |

### Causale: Nota credito cliente

| Campo | Valore |
|-------|--------|
| Codice | DA DEFINIRE |
| Documento sorgente | `invoices` con `document_type = nota_credito` |
| Collegamento | `parent_invoice_id` / `invoice_relations` |
| Approvazione commercialista | DA APPROVARE |

### Causale: Nota credito fornitore

| Campo | Valore |
|-------|--------|
| Codice | DA DEFINIRE |
| Documento sorgente | Modulo assente |
| Approvazione commercialista | DA APPROVARE |

### Causale: Nota debito cliente / fornitore

| Campo | Valore |
|-------|--------|
| Codice | DA DEFINIRE |
| Documento sorgente | Modulo assente |
| Approvazione commercialista | DA APPROVARE |

### Causale: Acconto cliente

| Campo | Valore |
|-------|--------|
| Codice | DA DEFINIRE |
| Documento sorgente | `customer_open_items` con `source_type = customer_advance` |
| Gestione IVA | DA DEFINIRE |
| Approvazione commercialista | DA APPROVARE |

### Causale: Acconto fornitore

| Campo | Valore |
|-------|--------|
| Codice | DA DEFINIRE |
| Documento sorgente | Modulo assente |
| Approvazione commercialista | DA APPROVARE |

### Causale: Incasso cliente

| Campo | Valore |
|-------|--------|
| Codice | DA DEFINIRE |
| Documento sorgente | `customer_payments` + `payment_allocations` |
| Conto Dare | Banca/Cassa — DA DEFINIRE |
| Conto Avere | Cliente — DA DEFINIRE |
| Gestione IVA | NO |
| Approvazione commercialista | DA APPROVARE |

### Causale: Pagamento fornitore

| Campo | Valore |
|-------|--------|
| Codice | DA DEFINIRE |
| Documento sorgente | Modulo assente |
| Approvazione commercialista | DA APPROVARE |

### Causale: Giroconto / movimento bancario

| Campo | Valore |
|-------|--------|
| Codice | DA DEFINIRE |
| Approvazione commercialista | DA APPROVARE |

### Causale: Apertura esercizio

| Campo | Valore |
|-------|--------|
| Codice | DA DEFINIRE |
| Approvazione commercialista | DA APPROVARE |

### Causale: Chiusura esercizio

| Campo | Valore |
|-------|--------|
| Codice | DA DEFINIRE |
| Approvazione commercialista | DA APPROVARE |

### Causale: Assestamento

| Campo | Valore |
|-------|--------|
| Codice | DA DEFINIRE |
| Tipi | Ratei, risconti, ammortamenti, accantonamenti, rimanenze — DA DEFINIRE |
| Approvazione commercialista | DA APPROVARE |

---

## Documento → Scrittura Contabile

### Tabella master

| Documento/Evento | Rilevanza contabile | Esito scrittura | Scrittura automatica | IVA | Scadenza | Conto Dare | Conto Avere | Approvazione |
|------------------|---------------------|-----------------|----------------------|-----|----------|------------|-------------|--------------|
| Preventivo | Commerciale | `NON_GENERA_SCRITTURA` (candidato) | NO | NO | NO | — | — | DA APPROVARE |
| Consuntivo | Commerciale | `NON_GENERA_SCRITTURA` (candidato) | NO | NO | NO | — | — | DA APPROVARE |
| Lavorazione / scheda | Operativo | `NON_GENERA_SCRITTURA` (candidato) | NO | NO | NO | — | — | DA APPROVARE |
| DDT uscita | Logistico | `DA_DEFINIRE` | DA DEFINIRE | DA DEFINIRE | NO | DA DEFINIRE | DA DEFINIRE | DA APPROVARE |
| Fattura cliente | Fiscale | `GENERA_SCRITTURA` (candidato) | DA DEFINIRE | SI | SI | DA DEFINIRE | DA DEFINIRE | DA APPROVARE |
| Fattura differita (da DDT) | Fiscale | `GENERA_SCRITTURA` (candidato) | DA DEFINIRE | SI | SI | DA DEFINIRE | DA DEFINIRE | DA APPROVARE |
| Proforma | Commerciale | `DA_DEFINIRE` | DA DEFINIRE | DA DEFINIRE | DA DEFINIRE | DA DEFINIRE | DA DEFINIRE | DA APPROVARE |
| Nota credito cliente | Fiscale | `GENERA_SCRITTURA` (candidato) | DA DEFINIRE | SI | SI | DA DEFINIRE | DA DEFINIRE | DA APPROVARE |
| Nota debito cliente | Fiscale | `DA_DEFINIRE` | DA DEFINIRE | DA DEFINIRE | DA DEFINIRE | DA DEFINIRE | DA DEFINIRE | DA APPROVARE |
| Acconto cliente | Finanziario | `DA_DEFINIRE` | DA DEFINIRE | DA DEFINIRE | SI | DA DEFINIRE | DA DEFINIRE | DA APPROVARE |
| Incasso cliente | Finanziario | `GENERA_SCRITTURA` (candidato) | DA DEFINIRE | NO | NO | DA DEFINIRE | DA DEFINIRE | DA APPROVARE |
| Ordine fornitore | Operativo | `NON_GENERA_SCRITTURA` (candidato) | NO | NO | NO | — | — | DA APPROVARE |
| Ricezione merce | Logistico | `DA_DEFINIRE` | DA DEFINIRE | DA DEFINIRE | NO | DA DEFINIRE | DA DEFINIRE | DA APPROVARE |
| Fattura fornitore | Fiscale | `GENERA_SCRITTURA` (candidato) | DA DEFINIRE | SI | SI | DA DEFINIRE | DA DEFINIRE | DA APPROVARE |
| Nota credito fornitore | Fiscale | `GENERA_SCRITTURA` (candidato) | DA DEFINIRE | SI | SI | DA DEFINIRE | DA DEFINIRE | DA APPROVARE |
| Acconto fornitore | Finanziario | `DA_DEFINIRE` | DA DEFINIRE | DA DEFINIRE | SI | DA DEFINIRE | DA DEFINIRE | DA APPROVARE |
| Pagamento fornitore | Finanziario | `GENERA_SCRITTURA` (candidato) | DA DEFINIRE | NO | NO | DA DEFINIRE | DA DEFINIRE | DA APPROVARE |
| Movimento bancario | Finanziario | `DA_DEFINIRE` | DA DEFINIRE | NO | NO | DA DEFINIRE | DA DEFINIRE | DA APPROVARE |
| Liquidazione IVA | Fiscale | `GENERA_SCRITTURA` (candidato) | DA DEFINIRE | SI | NO | DA DEFINIRE | DA DEFINIRE | DA APPROVARE |
| Chiusura esercizio | Contabile | `GENERA_SCRITTURA` (candidato) | DA DEFINIRE | DA DEFINIRE | NO | DA DEFINIRE | DA DEFINIRE | DA APPROVARE |
| Ammortamento cespite | Contabile | `DA_DEFINIRE` | DA DEFINIRE | NO | NO | DA DEFINIRE | DA DEFINIRE | DA APPROVARE |

> **Nota:** valori "candidato" sono proposte iniziali per la revisione commercialista, **non regole definitive**.

---

## Schede dettaglio documenti ed eventi

### 1. Fattura cliente

#### Evento

Emissione/conferma fattura attiva verso cliente.

#### Documento sorgente

- Tabella: `invoices` (`document_type = fattura`)
- Servizi: `src/services/invoices.service.ts`, `lib/domain/invoices-entry.ts`
- Origini: `manuale`, `preventivo`, `ddt`, `multi_preventivo` (colonna `origine`)
- Bridge: `lib/fatturazione/preventivo-to-invoice-draft.ts`, `lib/fatturazione/ddt-to-invoice-draft.ts`

#### Esito scrittura

`GENERA_SCRITTURA` (candidato) — **DA APPROVARE**

#### Dati necessari

- Anagrafica cliente fiscale (snapshot `customer_snapshot` / `billing_customers`)
- Righe: `invoice_rows` (descrizione, imponibile, `iva_percent`, totale)
- Collegamenti: `invoice_links` (preventivo, lavorazione, DDT)
- Date: `data_emissione`, `data_scadenza`
- Totali: `imponibile`, `iva`, `totale`
- Numerazione: `numero`, `anno`

#### Scrittura contabile (esempio concettuale — NON definitiva)

```
DARE
  Cliente                    [TOTALE FATTURA]

AVERE
  Ricavi                     [IMPONIBILE]
  IVA vendite                [IVA]
```

**APPROVAZIONE COMMERCIALISTA:** DA APPROVARE

#### Impatto IVA

Registro vendite — DA DEFINIRE. Data competenza/esigibilità — DA DEFINIRE.

#### Impatto scadenziario

Creazione partita su `customer_open_items` (operativo esistente). Regole contabili scadenza — DA DEFINIRE.

#### Data registrazione / competenza

DA DEFINIRE.

#### Casi particolari

Fatture miste servizi+ricambi, sconti, maggiorazioni, PA (CIG/CUP) — DA DEFINIRE.

#### Storno / modifica / annullamento

`cancel_invoice` RPC; `document_status = annullata`. Policy contabile post-registrazione — DA DEFINIRE.

#### Idempotenza (FASE 3)

Chiave logica: `(source_type='invoice', source_id=invoice.id)` — vedi `docs/fatturazione-accounting-idempotency.md`.

---

### 2. Fattura differita (da DDT)

#### Evento

Emissione fattura che riepiloga DDT precedentemente emessi.

#### Documento sorgente

- `invoices` con origine `ddt`
- `ddt_documents` collegati via `invoice_links` / wizard `fatturazione-wizard-modal.tsx`
- Bridge: `lib/fatturazione/ddt-to-invoice-draft.ts`

#### Esito scrittura

`GENERA_SCRITTURA` (candidato) — **DA APPROVARE**

#### Dati necessari

- DDT collegati (numeri, date consegna)
- Periodo fatturazione
- Righe con importi (DDT draft spesso a prezzo 0 — importi in wizard)
- Regole raggruppamento righe — DA DEFINIRE

#### Scrittura contabile

Come fattura cliente — **DA APPROVARE**. Eventuale rettifica vs fattura immediata — DA DEFINIRE.

#### Impatto IVA

Data competenza vs data DDT — **DA DEFINIRE** (punto critico fatturazione differita).

---

### 3. Nota credito cliente

#### Evento

Emissione nota credito collegata a fattura originale.

#### Documento sorgente

- `invoices` con `document_type = nota_credito`
- RPC: `create_credit_note_from_invoice`
- `parent_invoice_id`, `invoice_relations`

#### Esito scrittura

`GENERA_SCRITTURA` (candidato) — **DA APPROVARE**

#### Scrittura contabile (esempio concettuale)

```
DARE
  Ricavi                     [IMPONIBILE NC]
  IVA vendite                [IVA NC]

AVERE
  Cliente                    [TOTALE NC]
```

**APPROVAZIONE COMMERCIALISTA:** DA APPROVARE

#### Storno

Storno vs rettifica vs NC — DA DEFINIRE. Integrazione SdI NC — DA DEFINIRE.

---

### 4. Proforma

#### Evento

Emissione documento proforma (non fiscale).

#### Documento sorgente

- `invoices` con `document_type = proforma`

#### Esito scrittura

`DA_DEFINIRE` — candidato `NON_GENERA_SCRITTURA` se documento non fiscale.

#### Note

Chiedere al commercialista se la proforma ha rilevanza contabile o solo commerciale.

---

### 5. DDT uscita merce

#### Evento

Conferma/consegna DDT.

#### Documento sorgente

- `ddt_documents`, `ddt_rows`, `ddt_links`
- `lib/domain/ddt-entry.ts`

#### Esito scrittura

`DA_DEFINIRE` — candidato `NON_GENERA_SCRITTURA` fino a fattura.

#### Dati necessari

Cliente, righe merce, date, collegamento preventivo/lavorazione.

#### Impatto IVA

Solo se fatturazione differita — DA DEFINIRE.

---

### 6. Preventivo / consuntivo

#### Evento

Creazione/accettazione preventivo o consuntivo.

#### Documento sorgente

- `preventivi` con `tipoDocumento`: `preventivo` | `consuntivo`
- `lib/domain/preventivi-entry.ts`

#### Esito scrittura

`NON_GENERA_SCRITTURA` (candidato) — **DA APPROVARE**

#### Note

Documento commerciale pre-fiscale. Percorso verso fattura via `preventivo-to-invoice-draft.ts`.

---

### 7. Incasso cliente

#### Evento

Registrazione incasso e allocazione a partite/fatture.

#### Documento sorgente

- `customer_payments`, `payment_allocations`
- RPC: `register_customer_payment_multi`
- UI: `fattura-multi-payment-modal.tsx`

#### Esito scrittura

`GENERA_SCRITTURA` (candidato) — **DA APPROVARE**

#### Separazione concettuale

**Documento fiscale** (fattura) ≠ **movimento finanziario** (incasso). L'incasso chiude la partita operativa; la scrittura contabile è distinta.

#### Scrittura contabile (esempio concettuale)

```
DARE
  Banca / Cassa              [IMPORTO]

AVERE
  Cliente                    [IMPORTO]
```

**APPROVAZIONE COMMERCIALISTA:** DA APPROVARE

#### Casi particolari

Incasso parziale, multiplo, multi-documento, differenze, commissioni, insoluti — DA DEFINIRE.

---

### 8. Acconto cliente

#### Evento

Ricezione acconto da cliente prima della fattura definitiva.

#### Documento sorgente

- `customer_open_items` con `source_type = customer_advance` (schema esistente, UI limitata)

#### Esito scrittura

`DA_DEFINIRE`

#### Dati da definire con commercialista

- Quando nasce la scrittura
- Trattamento IVA acconto
- Conto transitorio
- Compensazione con fattura finale
- Gestione scadenziario

---

### 9. Ordine fornitore

#### Evento

Creazione/conferma ordine a fornitore.

#### Documento sorgente

- `ordini_fornitori`, `ordini_fornitori_righe`
- `lib/domain/ordini-fornitori-entry.ts`

#### Esito scrittura

`NON_GENERA_SCRITTURA` (candidato) — **DA APPROVARE**

#### Note

Impegno operativo/logistico. Totali IVA a livello header per riferimento, non registrazione contabile.

---

### 10. Ricezione merce

#### Evento

Registrazione ricezione merce da fornitore (magazzino).

#### Documento sorgente

- `inventory_documents`, `inventory_document_lines`
- `movimenti_ricambi`

#### Esito scrittura

`DA_DEFINIRE` — dipende da metodo valorizzazione magazzino approvato.

---

### 11. Fattura fornitore

#### Evento

Registrazione fattura passiva.

#### Documento sorgente

**Modulo assente** — da implementare in FASE 3.

#### Esito scrittura

`GENERA_SCRITTURA` (candidato) — **DA APPROVARE**

#### Scrittura contabile (esempio concettuale)

```
DARE
  Costi                      [IMPONIBILE]
  IVA acquisti               [IVA]

AVERE
  Fornitore                  [TOTALE]
```

**APPROVAZIONE COMMERCIALISTA:** DA APPROVARE

---

### 12. Pagamento fornitore

#### Evento

Pagamento a fornitore.

#### Documento sorgente

**Modulo assente**

#### Esito scrittura

`GENERA_SCRITTURA` (candidato) — **DA APPROVARE**

---

### 13. Nota credito / debito fornitore

#### Evento

NC/ND da fornitore.

#### Documento sorgente

**Modulo assente**

#### Esito scrittura

`GENERA_SCRITTURA` (candidato) — **DA APPROVARE**

---

### 14. Movimento bancario / giroconto

#### Evento

Movimento tra conti o registrazione estratto conto.

#### Documento sorgente

**Modulo assente**

#### Esito scrittura

`DA_DEFINIRE`

---

### 15. Liquidazione IVA / chiusura esercizio

#### Evento

Liquidazione periodica IVA o chiusura esercizio contabile.

#### Documento sorgente

**Modulo assente**

#### Esito scrittura

`GENERA_SCRITTURA` (candidato) — **DA APPROVARE**

---

## Fatture clienti

### Tipologie da analizzare

| Tipologia | Documento commerciale | Documento fiscale | Registrazione IVA | Scrittura contabile | Scadenze |
|-----------|----------------------|-------------------|-------------------|---------------------|----------|
| Fattura immediata | Preventivo/consuntivo o manuale | `invoices` fattura | DA DEFINIRE | DA DEFINIRE | DA DEFINIRE |
| Fattura da DDT | DDT + wizard | `invoices` fattura | DA DEFINIRE | DA DEFINIRE | DA DEFINIRE |
| Fattura differita | Multi DDT | `invoices` fattura | DA DEFINIRE | DA DEFINIRE | DA DEFINIRE |
| Fattura lavorazioni | `lavorazioni` + righe | `invoices` fattura | DA DEFINIRE | DA DEFINIRE | DA DEFINIRE |
| Fattura ricambi | `magazzino_ricambi` / preventivo | `invoice_rows` tipo ricambio | DA DEFINIRE | DA DEFINIRE | DA DEFINIRE |
| Fattura mista | Preventivo misto | `invoices` fattura | DA DEFINIRE | DA DEFINIRE | DA DEFINIRE |
| Servizi | `invoice_rows` manodopera/lavorazione | | DA DEFINIRE | DA DEFINIRE | DA DEFINIRE |
| Materiali | `invoice_rows` ricambio/articolo | | DA DEFINIRE | DA DEFINIRE | DA DEFINIRE |
| Sconti / maggiorazioni | `sconto_percent` su righe | | DA DEFINIRE | DA DEFINIRE | — |
| Acconti | `customer_advance` | DA DEFINIRE | DA DEFINIRE | DA DEFINIRE | DA DEFINIRE |
| Ritenute | Non implementato | — | DA DEFINIRE | DA DEFINIRE | DA DEFINIRE |
| Bollo | Non implementato | — | DA DEFINIRE | DA DEFINIRE | — |

**APPROVAZIONE COMMERCIALISTA:** DA APPROVARE per ogni riga.

---

## Fatture differite

| Aspetto | Valore |
|---------|--------|
| Condizioni di utilizzo | DA DEFINIRE |
| Documenti sorgente | `ddt_documents` collegati |
| DDT collegati | `ddt_links`, `invoice_links` |
| Periodo | DA DEFINIRE |
| Data fattura | `invoices.data_emissione` |
| Data competenza | DA DEFINIRE |
| Registrazione IVA | DA DEFINIRE |
| Scrittura contabile | DA DEFINIRE |
| Gestione righe | DA DEFINIRE |
| Raggruppamenti | DA DEFINIRE |

**Non assumere** la logica di fatturazione differita. Il commercialista deve definire il trattamento.

---

## Note credito e note debito

### Nota credito cliente

| Aspetto | Valore |
|---------|--------|
| Documento sorgente | Fattura originale obbligatoria (RPC esistente) |
| Collegamento | Obbligatorio — `parent_invoice_id` |
| Segno contabile | DA DEFINIRE |
| IVA | DA DEFINIRE |
| Scadenze | DA DEFINIRE |
| Scrittura | DA DEFINIRE |
| Storno | DA DEFINIRE |
| Correzione | DA DEFINIRE |

### Nota credito fornitore

Modulo assente — tutti i campi DA DEFINIRE.

### Nota debito cliente / fornitore

Modulo assente — tutti i campi DA DEFINIRE.

---

## Acconti

### Acconto cliente

| Aspetto | Valore |
|---------|--------|
| Quando nasce la scrittura | DA DEFINIRE |
| Trattamento IVA | DA DEFINIRE |
| Conto utilizzato | DA DEFINIRE |
| Collegamento documento finale | DA DEFINIRE |
| Compensazione | DA DEFINIRE |
| Scadenziario | DA DEFINIRE |
| Storno/chiusura | DA DEFINIRE |

### Acconto fornitore

Modulo assente — tutti i campi DA DEFINIRE.

---

## Incassi

| Scenario | Gestione operativa attuale | Scrittura contabile |
|----------|---------------------------|---------------------|
| Incasso cliente singolo | `register_invoice_payment` (legacy) | DA DEFINIRE |
| Incasso multi-allocazione | `register_customer_payment_multi` | DA DEFINIRE |
| Incasso parziale | `payment_allocations` | DA DEFINIRE |
| Incasso multi-documento | `payment_allocations` | DA DEFINIRE |
| Abbinamento | Manuale via UI | DA DEFINIRE |
| Conto banca/cassa | Non modellato contabilmente | DA DEFINIRE |
| Chiusura scadenza | `customer_open_items.status = closed` | DA DEFINIRE |
| Differenze importo | Non gestito | DA DEFINIRE |
| Commissioni | Non gestito | DA DEFINIRE |
| Insoluti | Non gestito | DA DEFINIRE |

**Separazione obbligatoria:** documento fiscale ≠ movimento finanziario.

---

## Pagamenti

Stessa struttura degli incassi, lato fornitore. **Modulo assente.** Tutti i campi DA DEFINIRE.

---

## Scadenziario

| Aspetto | Valore |
|---------|--------|
| Data emissione | `invoices.data_emissione` |
| Data scadenza | `invoices.data_scadenza`, `customer_open_items.due_date` |
| Condizioni pagamento | Non modellate — DA DEFINIRE |
| Rate | Non implementate — DA DEFINIRE |
| Pagamento parziale | `customer_open_items.status = partial` |
| Pagamento completo | `status = closed` |
| Insoluto | DA DEFINIRE |
| Riapertura | DA DEFINIRE |
| Compensazione | DA DEFINIRE |
| Note di credito | Collegamento a NC — DA DEFINIRE |
| Acconti | `customer_advance` — DA DEFINIRE |
| **Master scadenza** | DA DEFINIRE — operativo (`customer_open_items`) vs ledger contabile |

---

## Banche

| Aspetto | Valore |
|---------|--------|
| Conti bancari | Parziale: IBAN in `officina-banche-ordini` (settings ordini) |
| IBAN | Settings, non tabella DB |
| Conto contabile associato | DA DEFINIRE |
| Movimenti | DA DEFINIRE |
| Riconciliazione | DA DEFINIRE |
| Importazione estratti | DA DEFINIRE |
| Abbinamento incassi/pagamenti | DA DEFINIRE |
| Differenze | DA DEFINIRE |
| Commissioni | DA DEFINIRE |
| Quadratura | DA DEFINIRE |

**Nessuna integrazione bancaria in FASE 2.**

---

## Cespiti

| Aspetto | Valore |
|---------|--------|
| APPLICABILE A CAB | DA CONFERMARE |
| Definizione cespite | DA DEFINIRE |
| Data acquisizione | DA DEFINIRE |
| Valore | DA DEFINIRE |
| Categoria | DA DEFINIRE |
| Conto | DA DEFINIRE |
| Aliquota ammortamento | DA DEFINIRE |
| Decorrenza | DA DEFINIRE |
| Metodo | DA DEFINIRE |
| Dismissione / cessione | DA DEFINIRE |
| Plusvalenza/minusvalenza | DA DEFINIRE |

**Nota:** `mezzi` e `attrezzature` sono asset operativi, non cespiti contabili.

---

## Ammortamenti

| Aspetto | Valore |
|---------|--------|
| APPLICABILE A CAB | DA CONFERMARE |
| Periodicità | DA DEFINIRE |
| Metodo | DA DEFINIRE |
| Aliquote | DA DEFINIRE — **non inventare** |
| Decorrenza | DA DEFINIRE |
| Arrotondamenti | DA DEFINIRE |
| Quote | DA DEFINIRE |
| Registrazione | DA DEFINIRE |
| Chiusura esercizio | DA DEFINIRE |
| Modifiche / dismissioni | DA DEFINIRE |

---

## IVA periodica

### Flusso richiesto

```
Documenti
  → Registri IVA
  → Liquidazione
  → Scrittura contabile
  → Debito/Credito IVA
  → Versamento
```

| Aspetto | Valore |
|---------|--------|
| Periodicità | DA DEFINIRE |
| Registri coinvolti | DA DEFINIRE |
| Liquidazione | DA DEFINIRE |
| Debito IVA | DA DEFINIRE |
| Credito IVA | DA DEFINIRE |
| Compensazioni | DA DEFINIRE |
| Versamenti | DA DEFINIRE |
| Casistiche CAB | DA DEFINIRE |

---

## Chiusura esercizio

| Aspetto | Valore |
|---------|--------|
| Chiusura IVA | DA DEFINIRE |
| Chiusura conti economici | DA DEFINIRE |
| Chiusura conti patrimoniali | DA DEFINIRE |
| Apertura nuovo esercizio | DA DEFINIRE |
| Saldi iniziali | DA DEFINIRE |
| Scritture automatiche | DA DEFINIRE |
| Blocco esercizio | DA DEFINIRE |
| Riapertura controllata | DA DEFINIRE |

---

## Scritture di assestamento

| Tipo | APPLICABILE A CAB | Note |
|------|-------------------|------|
| Ratei attivi | DA CONFERMARE | |
| Ratei passivi | DA CONFERMARE | |
| Risconti attivi | DA CONFERMARE | |
| Risconti passivi | DA CONFERMARE | |
| Ammortamenti | DA CONFERMARE | |
| Accantonamenti | DA CONFERMARE | |
| Rimanenze magazzino | DA CONFERMARE | |
| Altre scritture | DA CONFERMARE | |

---

## Regole di competenza

| Tipo data | Definizione | Può divergere da | Note |
|-----------|-------------|------------------|------|
| Data documento | Data sul documento commerciale/fiscale | — | Es. `data_emissione` |
| Data registrazione | Data in cui si registra contabilmente | Data documento | DA DEFINIRE |
| Data IVA | Data per registro IVA | Data documento/competenza | DA DEFINIRE |
| Data competenza economica | Periodo di competenza del ricavo/costo | Data documento | DA DEFINIRE |
| Data scadenza | Scadenza pagamento/incasso | — | `data_scadenza` |
| Data pagamento/incasso | Data effettiva movimento finanziario | Data scadenza | `customer_payments.data` |

**Situazioni di divergenza** (es. fattura differita, incasso anticipato) — DA DEFINIRE con commercialista.

---

## Annullamenti e correzioni

| Scenario | Policy |
|----------|--------|
| Storno scrittura | Nuova entry `entry_origin = reversed` (schema esistente) — regole DA DEFINIRE |
| Rettifica | DA DEFINIRE |
| Nota credito | Meccanismo preferito per correzione post-emissione? — DA DEFINIRE |
| Annullamento documento | `cancel_invoice`, `document_status = annullata` |
| Documento già registrato | DA DEFINIRE — blocco modifica |
| Documento già inviato SdI | DA DEFINIRE |
| Esercizio chiuso | DA DEFINIRE — blocco totale |
| Registrazione bloccata | DA DEFINIRE |

**Il sistema non deve permettere correzione arbitraria di scritture** se la regola approvata richiede storno/rettifica.

---

## Audit trail

### Requisiti futuri (non implementati)

| Evento | Tracciare |
|--------|-----------|
| Creazione documento/scrittura | Chi, quando |
| Modifica | Chi, quando, valore precedente/nuovo |
| Conferma/emissione | Chi, quando |
| Annullamento | Chi, quando, motivo |
| Documento sorgente | Collegamento immutabile |
| Scrittura generata | `accounting_entries` + `source_type`/`source_id` |
| Storno | Entry reversed + riferimento originale |
| Rettifica | Entry collegata |

### Base esistente

- `invoice_events` — timeline fattura
- `log_modifiche` — audit generale
- `preventivo_events` — lifecycle preventivo
- `app_settings_audit`

---

## Regole di immutabilità

### Separazione concetti

| Concetto | Descrizione | Esempio CAB |
|----------|-------------|-------------|
| Documento operativo CAB | Workflow officina/commerciale | preventivo, lavorazione, DDT |
| Documento fiscale | Documento con rilevanza fiscale | fattura emessa, NC |
| Scrittura contabile | Registrazione in prima nota | `accounting_entries` |
| Movimento finanziario | Incasso/pagamento effettivo | `customer_payments` |

### Immutabilità per fase (DA DEFINIRE)

| Dato | Dopo emissione | Dopo registrazione | Dopo invio SdI | Dopo chiusura periodo | Dopo chiusura esercizio |
|------|----------------|--------------------|----------------|-----------------------|-------------------------|
| Fattura cliente | DA DEFINIRE | DA DEFINIRE | DA DEFINIRE | DA DEFINIRE | DA DEFINIRE |
| Righe fattura | DA DEFINIRE | DA DEFINIRE | DA DEFINIRE | DA DEFINIRE | DA DEFINIRE |
| Scrittura contabile | — | DA DEFINIRE | — | DA DEFINIRE | DA DEFINIRE |
| Incasso | DA DEFINIRE | DA DEFINIRE | — | DA DEFINIRE | DA DEFINIRE |

---

## Integrazione SdI / FatturaPA

### Requisiti futuri (non implementati in FASE 2)

| Aspetto | Stato attuale | Requisito |
|---------|---------------|-----------|
| Emissione FE | Snapshot JSON stub | XML FatturaPA, invio SdI |
| Ricezione FE | Assente | Workflow fatture passive |
| XML | `fatturapa_schema_version` 3.0 in schema | Generazione conforme |
| Codice destinatario / PEC | Su `billing_customers` | Validazione pre-invio |
| Stati invio | `sdi_status` enum | Workflow completo |
| Ricevute | `invoice_sdi_submissions` | Gestione RC, NS, MC, ecc. |
| Scarti / rifiuti | `last_error` in submissions | Retry, correzione |
| Conservazione | Assente | Requisiti commercialista |
| NC/ND elettroniche | NC cliente parziale | Integrazione SdI NC |
| Autofatture | Non implementato | DA CONFERMARE se applicabile |

### Schema esistente

- `invoice_fatturapa_snapshots`
- `invoice_sdi_submissions` (provider `stub`)
- `invoice_public_administration_meta` (CIG, CUP)
- Webhook: `app/api/fatturazione/sdi-webhook/route.ts` (stub)

---

## Provider fatturazione elettronica

### Requisiti che il provider dovrà soddisfare (scelta CAB, non vincola regole fiscali)

| Requisito | Note |
|-----------|------|
| Emissione XML | Conforme FatturaPA |
| Ricezione XML | Fatture passive |
| Stati documento | Allineamento con `sdi_status` |
| API / webhook | Polling o push per ricevute |
| Identificativo esterno | Tracciamento invii |
| Gestione errori / retry | Idempotenza `idempotency_key` |
| Conservazione | Se inclusa o separata |
| Riconciliazione con CAB | Match invoice_id ↔ submission |

**Provider candidato:** Aruba o altro — **decisione CAB**, non FASE 2.

---

## Separazione regole fiscali e implementazione tecnica

```
COMMERCIALISTA
      ↓
REGOLA FISCALE / CONTABILE APPROVATA
      ↓
ACCOUNTING SPECIFICATION (questo documento, versione APPROVED)
      ↓
MODELLO DATI
      ↓
MOTORE CONTABILE
      ↓
INTEGRAZIONI (SdI, banca, export)
      ↓
UI
```

**NON:**

```
CODICE
  ↓
"probabile" regola fiscale
```

---

## Matrice di approvazione

### Legenda

| Stato | Significato |
|-------|-------------|
| PENDING | In attesa di decisione |
| PROPOSED | Proposta inserita, da confermare |
| APPROVED | Approvata dal commercialista/CAB |
| REJECTED | Rifiutata |
| NEEDS_CLARIFICATION | Richiede chiarimento |

### Decisioni emergenti dall'audit

| ID | TIPO | AREA | DOMANDA | STATO ATTUALE | PROPOSTA/DEFAULT SISTEMA | DECISIONE RICHIESTA | AUTORITÀ | STATO | IMPATTO FASE 3 |
|----|------|------|---------|---------------|--------------------------|---------------------|----------|-------|----------------|
| FISC-001 | FISCALE | Regime | Qual è il regime fiscale di CAB? | Non in DB | — | Regime fiscale | Commercialista | PENDING | Profilo emittente |
| FISC-002 | FISCALE | Regime IVA | Regime IVA particolare (split, forfettario, ecc.)? | `billing_customer_profiles` ha split_payment | — | Regime IVA CAB | Commercialista | PENDING | Configurazione IVA |
| FISC-003 | FISCALE | Anagrafica CAB | Confermare dati obbligatori FatturaPA emittente | Solo branding | — | Elenco campi | Commercialista + CAB | PENDING | Tabella emittente |
| IVA-001 | FISCALE | Aliquota | Aliquota IVA standard servizi officina? | 22% default tecnico | 22% (NON approvato) | Aliquota | Commercialista | PENDING | `vat_codes` |
| IVA-002 | FISCALE | Aliquota | Aliquota IVA vendita ricambi? | 22% default | 22% (NON approvato) | Aliquota | Commercialista | PENDING | `vat_codes` |
| IVA-003 | FISCALE | Natura | Quali nature IVA (N1–N7) sono utilizzate? | Non implementato | — | Elenco nature | Commercialista | PENDING | Matrice IVA |
| IVA-004 | FISCALE | Split payment | Split payment applicabile a clienti PA? | Campo DB esiste | — | Regole | Commercialista | PENDING | Righe fattura |
| IVA-005 | FISCALE | Reverse charge | Reverse charge applicabile a CAB? | Non implementato | — | SI/NO + casi | Commercialista | PENDING | Se SI: causali |
| IVA-006 | FISCALE | Periodicità | Periodicità liquidazione IVA? | Non implementato | — | Mensile/trimestrale | Commercialista | PENDING | Workflow liquidazione |
| IVA-007 | FISCALE | Competenza | Regole competenza vs esigibilità IVA? | Non definito | — | Regole | Commercialista | PENDING | Date registrazione |
| CONT-001 | CONTABILE | Piano conti | Fornire piano dei conti completo | `account_code` libero | — | Piano conti | Commercialista | PENDING | `chart_of_accounts` |
| CONT-002 | CONTABILE | Conto ricavi | Conto ricavi servizi officina | — | — | Codice conto | Commercialista | PENDING | Causale fattura |
| CONT-003 | CONTABILE | Conto ricavi | Conto ricavi vendita ricambi | — | — | Codice conto | Commercialista | PENDING | Causale fattura |
| CONT-004 | CONTABILE | Conto cliente | Conto partite clienti | — | — | Codice conto | Commercialista | PENDING | Scritture AR |
| CONT-005 | CONTABILE | Conto fornitore | Conto partite fornitori | — | — | Codice conto | Commercialista | PENDING | Scritture AP |
| CONT-006 | CONTABILE | IVA | Conti IVA vendite e acquisti | — | — | Codici conto | Commercialista | PENDING | Registri IVA |
| CONT-007 | CONTABILE | Banca | Conti bancari e cassa | IBAN in settings | — | Codici conto | Commercialista | PENDING | Incassi/pagamenti |
| CONT-008 | CONTABILE | Causale | Scrittura fattura cliente | Auto-gen disabilitata | Esempio in scheda | Dare/Avere approvati | Commercialista | PENDING | Motore scritture |
| CONT-009 | CONTABILE | Causale | Scrittura incasso cliente | Pagamenti operativi | Esempio in scheda | Dare/Avere approvati | Commercialista | PENDING | Motore scritture |
| CONT-010 | CONTABILE | Causale | Scrittura nota credito cliente | NC operativa | Esempio in scheda | Dare/Avere approvati | Commercialista | PENDING | Motore scritture |
| CONT-011 | CONTABILE | Causale | Scrittura fattura fornitore | Modulo assente | Esempio in scheda | Dare/Avere approvati | Commercialista | PENDING | Modulo AP |
| CONT-012 | CONTABILE | Causale | Scrittura pagamento fornitore | Modulo assente | — | Dare/Avere | Commercialista | PENDING | Modulo AP |
| CONT-013 | CONTABILE | Acconti | Trattamento contabile acconto cliente | Schema `customer_advance` | — | Regole complete | Commercialista | PENDING | Workflow acconti |
| CONT-014 | CONTABILE | Acconti | Trattamento IVA su acconti | Non definito | — | Regole | Commercialista | PENDING | Workflow acconti |
| CONT-015 | CONTABILE | Chiusura | Scritture di chiusura esercizio | Non implementato | — | Elenco scritture | Commercialista | PENDING | Modulo chiusura |
| CONT-016 | CONTABILE | Assestamento | Quali assestamenti sono necessari? | Non implementato | — | Elenco | Commercialista | PENDING | Modulo assestamenti |
| CONT-017 | CONTABILE | Cespiti | Gestione cespiti in gestionale? | Non implementato | — | SI/NO | Commercialista | PENDING | Modulo cespiti |
| DOC-001 | MISTA | Scrittura | Preventivo genera scrittura contabile? | Nessuna | `NON_GENERA_SCRITTURA` | Conferma esito | Commercialista | PENDING | — |
| DOC-002 | MISTA | Scrittura | Consuntivo genera scrittura contabile? | Nessuna | `NON_GENERA_SCRITTURA` | Conferma esito | Commercialista | PENDING | — |
| DOC-003 | MISTA | Scrittura | DDT genera scrittura contabile? | Nessuna | `DA_DEFINIRE` | Esito esplicito | Commercialista | PENDING | — |
| DOC-004 | MISTA | Scrittura | Fattura cliente genera scrittura? | `accounting_status` esiste | `GENERA_SCRITTURA` | Conferma + causale | Commercialista | PENDING | Auto-gen |
| DOC-005 | MISTA | Scrittura | Proforma genera scrittura? | Tipo documento esiste | `DA_DEFINIRE` | Esito | Commercialista | PENDING | — |
| DOC-006 | MISTA | Scrittura | Ordine fornitore genera scrittura? | Ordini operativi | `NON_GENERA_SCRITTURA` | Conferma esito | Commercialista | PENDING | — |
| DOC-007 | MISTA | Scrittura | Ricezione merce genera scrittura? | Magazzino operativo | `DA_DEFINIRE` | Esito + metodo | Commercialista | PENDING | Valorizzazione |
| DOC-008 | MISTA | Scrittura | Incasso genera scrittura separata da fattura? | Pagamenti operativi | `GENERA_SCRITTURA` | Conferma | Commercialista | PENDING | Causale incasso |
| DOC-009 | MISTA | Fattura differita | Regole fatturazione differita da DDT? | Bridge esiste | — | Regole complete | Commercialista | PENDING | Wizard fattura |
| DOC-010 | MISTA | Correzione | Meccanismo preferito: storno vs NC vs rettifica? | NC operativa | — | Policy | Commercialista | PENDING | Workflow correzioni |
| OP-001 | OPERATIVA | Scadenziario | Chi è master della scadenza (operativo vs contabile)? | `customer_open_items` | Operativo | Definire master | CAB + Commercialista | PENDING | Allineamento ledger |
| OP-002 | OPERATIVA | Permessi | Chi può registrare/stornare scritture contabili? | RBAC fatturazione | — | Policy | CAB | PENDING | RBAC contabilità |
| OP-003 | OPERATIVA | Report | Quali report contabili devono essere disponibili? | Solo report economici | — | Elenco | Commercialista + CAB | PENDING | Report engine |
| TECH-001 | TECNICA | Anagrafica | Modello `clienti_anagrafiche` vs `billing_customers` | Due tabelle + bridge | Snapshot a fattura | Unificazione o policy snapshot | Team tecnico + CAB | PENDING | Refactor anagrafica |
| TECH-002 | TECNICA | Fornitori | Anagrafica fornitori: tabella vs JSON settings | JSON in `app_settings` | — | Modello dati | Team tecnico | PENDING | Tabella fornitori |
| TECH-003 | TECNICA | Idempotenza | Chiave idempotenza scritture `(source_type, source_id)` | Documentato in idempotency.md | Proposta esistente | Conferma pattern | Team tecnico | PENDING | Motore contabile |
| TECH-004 | TECNICA | Provider SdI | Scelta provider (Aruba o altro) | `stub` | — | Fornitore | CAB | PENDING | Integrazione SdI |
| TECH-005 | TECNICA | ERP esterno | Conferma: nessuna integrazione contabile esterna | UnoERP rimosso | — | Conferma | CAB | PENDING | — |
| SDI-001 | MISTA | Emissione | Requisiti emissione fatture elettroniche | Schema stub | — | Workflow | Commercialista + CAB | PENDING | Adapter SdI |
| SDI-002 | MISTA | Ricezione | Requisiti ricezione fatture passive | Assente | — | Workflow | Commercialista + CAB | PENDING | Modulo AP + SdI |
| SDI-003 | FISCALE | Conservazione | Requisiti conservazione sostitutiva | Assente | — | Regole | Commercialista | PENDING | Integrazione |

---

## Commercialista Review Questionnaire

1. Qual è il regime fiscale applicabile a CAB?
2. Qual è il regime IVA applicabile a CAB?
3. Quali dati fiscali dell'emittente sono obbligatori per la fatturazione elettronica?
4. Qual è il piano dei conti da utilizzare?
5. Quali registri IVA sono utilizzati (vendite, acquisti, speciali)?
6. Qual è la periodicità di liquidazione IVA?
7. Quali aliquote IVA sono applicabili ai servizi officina?
8. Quali aliquote IVA sono applicabili alla vendita ricambi/materiali?
9. Quali nature IVA (N1–N7) sono utilizzate da CAB?
10. Lo split payment è applicabile? In quali casi?
11. Il reverse charge è applicabile a CAB? In quali casi?
12. Quali causali contabili devono essere previste?
13. Qual è la scrittura contabile della fattura cliente (dare/avere/conti)?
14. Qual è la scrittura contabile della fattura fornitore?
15. Come devono essere registrate le note credito cliente?
16. Come devono essere registrate le note credito fornitore?
17. Le note debito sono previste? Come si registrano?
18. Come devono essere gestiti gli acconti cliente (scrittura, IVA, compensazione)?
19. Come devono essere gestiti gli acconti fornitore?
20. Come devono essere trattate le fatture differite da DDT?
21. Qual è la regola per data competenza vs data emissione vs data IVA?
22. Qual è la regola per le scadenze di pagamento?
23. Come devono essere gestiti gli incassi (conto banca/cassa, commissioni, differenze)?
24. Come devono essere gestiti i pagamenti fornitore?
25. Quali conti bancari e di cassa devono essere previsti?
26. Il preventivo ha rilevanza contabile? (candidato: no)
27. Il consuntivo ha rilevanza contabile? (candidato: no)
28. Il DDT ha rilevanza contabile prima della fattura?
29. La proforma ha rilevanza contabile?
30. L'ordine fornitore ha rilevanza contabile? (candidato: no)
31. La ricezione merce genera scritture contabili? Con quale metodo di valorizzazione?
32. Quali regole valgono per i cespiti e gli ammortamenti? (applicabile a CAB?)
33. Quali scritture di assestamento sono necessarie (ratei, risconti, rimanenze)?
34. Come deve essere gestita la liquidazione IVA periodica?
35. Come deve essere gestita la chiusura dell'esercizio?
36. Quali casistiche fiscali particolari sono applicabili a CAB (PA, intracomunitario, ecc.)?
37. Quali documenti devono generare automaticamente una scrittura contabile?
38. Quali documenti NON devono generare scrittura contabile?
39. Quando una scrittura contabile deve diventare immutabile?
40. Come devono essere gestite correzioni e storni (NC vs storno vs rettifica)?
41. Quali operazioni richiedono intervento manuale del commercialista?
42. Quali controlli devono impedire una registrazione contabile errata?
43. Quali report contabili devono essere disponibili nel gestionale?
44. Quali requisiti di conservazione sostitutiva per le fatture elettroniche?
45. Quali campi anagrafica cliente sono obbligatori in fattura (B2B, B2C, PA)?
46. Quali campi anagrafica fornitore sono obbligatori per le fatture passive?
47. Come gestire fatture miste (servizi + materiali) a livello contabile e IVA?
48. Sono previste ritenute d'acconto o bollo? Come si registrano?
49. Qual è il trattamento IVA per clienti con `regime_fiscale` particolare?
50. Confermare che il modulo Fatturazione AR esistente non equivale a contabilità approvata.

---

## Assumptions & Open Issues

| ID | Area | Assunzione | Perché necessaria | Rischio | Chi conferma | Stato |
|----|------|------------|-------------------|---------|--------------|-------|
| ASM-001 | Regime | CAB opera in regime ordinario | Default italiano più comune | Alto se errato | Commercialista | OPEN |
| ASM-002 | IVA | Aliquota 22% come default tecnico non è regola fiscale | Codice usa 22% su righe | Medio | Commercialista | OPEN |
| ASM-003 | Documenti | Preventivo/consuntivo non hanno rilevanza contabile diretta | Audit: nessuna scrittura | Basso se confermato | Commercialista | OPEN |
| ASM-004 | Documenti | DDT non genera scrittura fino a fattura | Pratica comune | Medio | Commercialista | OPEN |
| ASM-005 | AR vs contabilità | Modulo fatturazione ≠ contabilità generale | Architettura attuale | Alto se ignorato | CAB + Commercialista | OPEN |
| ASM-006 | Anagrafica | Snapshot cliente a emissione fattura è sufficiente | `customer_snapshot` esiste | Medio | Commercialista + Tech | OPEN |
| ASM-007 | UnoERP | Nessuna integrazione ERP esterna per contabilità | UnoERP rimosso | Basso | CAB | OPEN |
| ASM-008 | Cespiti | Cespiti potrebbero non essere gestiti in gestionale | Non implementato | Basso | Commercialista | OPEN |
| ASM-009 | Magazzino | Valorizzazione magazzino potrebbe restare esterna | Solo movimenti operativi | Medio | Commercialista | OPEN |
| ASM-010 | SdI | Provider sarà scelto in FASE 3 (Aruba o altro) | Stub attuale | Basso | CAB | OPEN |
| ASM-011 | Acconti | Schema `customer_advance` esiste ma workflow non definito | Migration phase1a | Medio | Commercialista | OPEN |
| ASM-012 | Report | Report `eco_*` sono gestionali, non contabili | Report engine | Medio | CAB | OPEN |

---

## Checklist completamento FASE 2

| # | Verifica | Esito |
|---|----------|-------|
| 1 | Ogni area fiscale richiesta presente | ☑ |
| 2 | Ogni area contabile richiesta presente | ☑ |
| 3 | Matrice Documento → Scrittura presente | ☑ |
| 4 | Ogni scrittura non approvata marcata chiaramente | ☑ |
| 5 | Nessuna regola fiscale inventata | ☑ |
| 6 | Piano dei conti DA DEFINIRE o approvato | ☑ |
| 7 | Aliquote IVA DA DEFINIRE o approvate | ☑ |
| 8 | Nature IVA DA DEFINIRE o approvate | ☑ |
| 9 | Causali DA DEFINIRE o approvate | ☑ |
| 10 | Acconti, NC, ND trattati separatamente | ☑ |
| 11 | Fatture differite trattate | ☑ |
| 12 | Incassi e pagamenti separati | ☑ |
| 13 | Scadenziario definito (con domande aperte) | ☑ |
| 14 | Cespiti e ammortamenti trattati | ☑ |
| 15 | Banche trattate | ☑ |
| 16 | IVA periodica trattata | ☑ |
| 17 | Chiusura esercizio trattata | ☑ |
| 18 | Assestamenti trattati | ☑ |
| 19 | Competenza trattata | ☑ |
| 20 | Storni e correzioni trattati | ☑ |
| 21 | Audit trail definito | ☑ |
| 22 | Immutabilità definita | ☑ |
| 23 | Futura integrazione SdI considerata | ☑ |
| 24 | Futuro provider considerato senza vincolo | ☑ |
| 25 | Questionario commercialista presente | ☑ |
| 26 | Registro decisioni (matrice) presente | ☑ |
| 27 | Registro assunzioni presente | ☑ |
| 28 | Approvazione commercialista richiesta esplicitamente | ☑ |
| 29 | Nessun codice contabile implementato | ☑ |

---

## Changelog

| Versione | Data | Autore | Modifiche |
|----------|------|--------|-----------|
| 0.1 | 2026-09-10 | FASE 2 audit | Bozza iniziale da audit read-only repository |

