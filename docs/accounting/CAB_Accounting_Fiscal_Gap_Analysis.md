# CAB Accounting & Fiscal Gap Analysis

| Campo | Valore |
|-------|--------|
| Documento | CAB Accounting & Fiscal Gap Analysis |
| Versione | 0.1 |
| Stato | DRAFT — PENDING COMMERCIALIST REVIEW |
| Data | 2026-09-10 |
| Riferimento | [CAB_Accounting_Fiscal_Specification.md](./CAB_Accounting_Fiscal_Specification.md) |

---

## Scopo

Analisi read-only dello stato attuale del Gestionale CAB rispetto ai requisiti di una futura contabilità e fiscalità complete. Questo documento **non** definisce regole fiscali o contabili: identifica gap, fonti dati e decisioni necessarie.

**Legenda classificazione (A–E):**

| Classe | Significato |
|--------|-------------|
| **A — Esistente e utilizzabile** | Dati/strutture già presenti, riutilizzabili in FASE 3 |
| **B — Esistente ma insufficiente** | Presente ma incompleto per adempimenti fiscali/contabili |
| **C — Mancante** | Non esiste nel sistema |
| **D — Da decidere con il commercialista** | Scelta fiscale/contabile — non determinabile dal software |
| **E — Da decidere tecnicamente** | Scelta architetturale post-approvazione fiscale |

---

## Riepilogo per classe

| Classe | Conteggio aree |
|--------|----------------|
| A | 8 |
| B | 12 |
| C | 14 |
| D | 18 |
| E | 6 |

---

## Analisi dettagliata per area

### 1. Anagrafica fiscale CAB (emittente)

| Campo | Valore |
|-------|--------|
| **AREA** | Anagrafica fiscale CAB |
| **CLASSE** | C — Mancante |
| **STATO ATTUALE** | Nessuna tabella o settings dedicati all'emittente fiscale. `CabBrandingSettings` contiene solo logo, colore primario e URL sito (`lib/branding/branding-settings-model.ts`). |
| **FONTE DATI** | `app_settings` (branding), PDF preventivi/DDT/fatture (dati emittente non centralizzati) |
| **PROBLEMA/GAP** | Impossibile emettere fatture elettroniche o registrare scritture senza anagrafica fiscale completa dell'azienda (P.IVA, CF, regime, codice destinatario, PEC, sede legale). |
| **DECISIONE NECESSARIA** | **D — FISCALE:** regime fiscale, regime IVA, dati obbligatori FatturaPA. **DA FORNIRE A CAB:** denominazione, P.IVA, CF, sedi, PEC, codice destinatario. |
| **DECISIONE DEL COMMERCIALISTA** | PENDING |
| **IMPATTO FUTURO** | FASE 3: tabella/settings `company_fiscal_profile` o equivalente; prerequisito SdI e contabilità |

---

### 2. Anagrafica clienti fiscale

| Campo | Valore |
|-------|--------|
| **AREA** | Anagrafica clienti fiscale |
| **CLASSE** | B — Esistente ma insufficiente |
| **STATO ATTUALE** | Due anagrafiche parallele: `clienti_anagrafiche` (operativa: P.IVA, codice destinatario, sedi, contatti PEC) e `billing_customers` (fatturazione: P.IVA, CF, PEC, codice SDI, indirizzo JSON). Bridge: `lib/fatturazione/billing-customer-bridge.ts`. |
| **FONTE DATI** | `clienti_anagrafiche`, `clienti_sedi`, `clienti_contatti`, `billing_customers`, `billing_customer_profiles` |
| **PROBLEMA/GAP** | Duplicazione dati; `codice_fiscale` assente come colonna in `clienti_anagrafiche` (solo in `meta` JSONB o in billing); rischio disallineamento snapshot fattura vs anagrafica operativa. |
| **DECISIONE NECESSARIA** | **E — TECNICA:** modello unificato vs snapshot al momento fattura. **D — FISCALE:** campi obbligatori per cliente in fattura (B2B, B2C, PA). |
| **DECISIONE DEL COMMERCIALISTA** | PENDING (solo parte fiscale) |
| **IMPATTO FUTURO** | FASE 3: policy snapshot immutabile post-emissione; eventuale unificazione anagrafica |

---

### 3. Anagrafica fornitori fiscale

| Campo | Valore |
|-------|--------|
| **AREA** | Anagrafica fornitori fiscale |
| **CLASSE** | B — Esistente ma insufficiente |
| **STATO ATTUALE** | Nessuna tabella relazionale. Dati in `app_settings` → `magazzino.fornitoreAnagraficaByFornitore` (JSON): ragione sociale, indirizzo, P.IVA, CF, telefono, email. Snapshot su ordine: `ordini_fornitori.fornitore_snapshot`. **Mancano:** PEC, codice destinatario SDI. |
| **FONTE DATI** | `lib/magazzino/fornitore-anagrafica.ts`, `ordini_fornitori`, `components/dashboard/settings/settings-fornitore-anagrafica-fields.tsx` |
| **PROBLEMA/GAP** | Insufficiente per fatture passive, registri IVA acquisti, partite fornitore. |
| **DECISIONE NECESSARIA** | **D — FISCALE:** campi obbligatori fornitore. **E — TECNICA:** tabella `fornitori_anagrafiche` vs JSON settings. |
| **DECISIONE DEL COMMERCIALISTA** | PENDING |
| **IMPATTO FUTURO** | FASE 3: modulo AP; anagrafica fornitori relazionale |

---

### 4. Preventivi e consuntivi

| Campo | Valore |
|-------|--------|
| **AREA** | Preventivi / consuntivi |
| **CLASSE** | A — Esistente e utilizzabile (operativo) |
| **STATO ATTUALE** | Tabella `preventivi` con `tipoDocumento`: `preventivo` \| `consuntivo` (`lib/preventivi/types.ts`). Righe JSONB (ricambi, manodopera, costi). View `preventivi_billing_status` per stato fatturazione. Nessuna rilevanza contabile diretta nel sistema. |
| **FONTE DATI** | `preventivi`, `preventivo_events`, `lib/domain/preventivi-entry.ts`, `lib/fatturazione/preventivo-to-invoice-draft.ts` |
| **PROBLEMA/GAP** | Il consuntivo non è documento fiscale autonomo. Percorso verso fattura non definito fiscalmente (immediata vs differita). |
| **DECISIONE NECESSARIA** | **D — FISCALE/OPERATIVA:** rilevanza contabile preventivo/consuntivo (candidato: `NON_GENERA_SCRITTURA`). Percorso consuntivo → fattura. |
| **DECISIONE DEL COMMERCIALISTA** | PENDING |
| **IMPATTO FUTURO** | FASE 3: regole collegamento preventivo/DDT/fattura; anti-overbilling già parzialmente presente |

---

### 5. DDT (documenti di trasporto)

| Campo | Valore |
|-------|--------|
| **AREA** | DDT |
| **CLASSE** | A — Esistente e utilizzabile (operativo) |
| **STATO ATTUALE** | `ddt_documents`, `ddt_rows`, `ddt_links`. Stati: bozza → confermato → stampato → consegnato. Origini: preventivo, lavorazione, ordine, fattura, manuale. Bridge a fattura: `lib/fatturazione/ddt-to-invoice-draft.ts`. |
| **FONTE DATI** | `supabase/migrations/20260720120000_ddt_module.sql`, `lib/domain/ddt-entry.ts` |
| **PROBLEMA/GAP** | Rilevanza contabile e IVA del DDT non definita. Fatturazione differita: regole data competenza, periodo, raggruppamento righe assenti. |
| **DECISIONE NECESSARIA** | **D — FISCALE:** DDT genera scrittura? (candidato: `DA_DEFINIRE` / `NON_GENERA_SCRITTURA` fino a fattura). Regole fatturazione differita. |
| **DECISIONE DEL COMMERCIALISTA** | PENDING |
| **IMPATTO FUTURO** | FASE 3: collegamento DDT–fattura; eventuale registro merce |

---

### 6. Fatture attive (AR)

| Campo | Valore |
|-------|--------|
| **AREA** | Fatture attive |
| **CLASSE** | A — Esistente e utilizzabile (operativo AR) |
| **STATO ATTUALE** | Modulo completo: `invoices`, `invoice_rows`, `invoice_links`, tipi `fattura`/`nota_credito`/`proforma`, origini manuale/preventivo/ddt/multi_preventivo. Assi stato: `document_status`, `payment_status`, `sdi_status`, `accounting_status`. UI hub `/fatturazione`. |
| **FONTE DATI** | `lib/fatturazione/`, `src/services/invoices.service.ts`, migrations `20260716130000` … `20260910150800` |
| **PROBLEMA/GAP** | Modulo AR ≠ contabilità generale. Scritture contabili non generate (`accounting_status` presente ma auto-gen disabilitata). Regole IVA per riga (default 22%) non approvate fiscalmente. |
| **DECISIONE NECESSARIA** | **D — FISCALE/CONTABILE:** scrittura fattura cliente, aliquote, nature, fatture differite, miste servizi/materiali. |
| **DECISIONE DEL COMMERCIALISTA** | PENDING |
| **IMPATTO FUTURO** | FASE 3: motore scritture da fattura emessa |

---

### 7. Note credito e note debito

| Campo | Valore |
|-------|--------|
| **AREA** | Note credito / debito |
| **CLASSE** | B — Esistente ma insufficiente |
| **STATO ATTUALE** | NC cliente: `document_type = nota_credito`, RPC `create_credit_note_from_invoice`, sezione UI note credito. ND cliente e NC/ND fornitore: **assenti**. |
| **FONTE DATI** | `20260910150100_fatturazione_erp_phase1b.sql`, `lib/fatturazione/credit-note-pdf-generate.ts` |
| **PROBLEMA/GAP** | Trattamento contabile NC (storno vs rettifica), IVA, scadenze, collegamento obbligatorio a fattura originale — non definiti. ND e lato fornitore assenti. |
| **DECISIONE NECESSARIA** | **D — FISCALE/CONTABILE:** scrittura NC cliente/fornitore, ND, storno, correzione post-SdI. |
| **DECISIONE DEL COMMERCIALISTA** | PENDING |
| **IMPATTO FUTURO** | FASE 3: causali NC/ND; integrazione SdI per NC |

---

### 8. Acconti cliente e fornitore

| Campo | Valore |
|-------|--------|
| **AREA** | Acconti |
| **CLASSE** | B — Esistente ma insufficiente |
| **STATO ATTUALE** | Schema `customer_open_items.source_type` include `customer_advance`. Nessuna UI/workflow dedicato acconti. Acconti fornitore: **assenti**. |
| **FONTE DATI** | `customer_open_items`, reconciliation report in `20260910150600` |
| **PROBLEMA/GAP** | Trattamento IVA acconti, conto transitorio, compensazione con fattura finale, scadenziario — non definiti. |
| **DECISIONE NECESSARIA** | **D — FISCALE/CONTABILE:** quando nasce scrittura acconto; IVA; conto; chiusura/compensazione. |
| **DECISIONE DEL COMMERCIALISTA** | PENDING |
| **IMPATTO FUTURO** | FASE 3: workflow acconti; partite cliente avanzate |

---

### 9. Incassi cliente

| Campo | Valore |
|-------|--------|
| **AREA** | Incassi |
| **CLASSE** | A — Esistente e utilizzabile (operativo) |
| **STATO ATTUALE** | `customer_payments` + `payment_allocations` (multi-documento). Legacy `invoice_payments`. Metodi: bonifico, contanti, assegno, pos, altro. RPC `register_customer_payment_multi`. |
| **FONTE DATI** | `20260910150000_fatturazione_erp_phase1a.sql`, `components/fatturazione/fattura-multi-payment-modal.tsx` |
| **PROBLEMA/GAP** | Separazione documento fiscale vs movimento finanziario non formalizzata fiscalmente. Scrittura incasso (DARE banca/cassa, AVERE cliente) non definita. Commissioni, differenze, insoluti non gestiti. |
| **DECISIONE NECESSARIA** | **D — CONTABILE:** scrittura incasso; conto banca/cassa; gestione differenze e commissioni. |
| **DECISIONE DEL COMMERCIALISTA** | PENDING |
| **IMPATTO FUTURO** | FASE 3: causale incasso; collegamento a conti bancari |

---

### 10. Pagamenti fornitore

| Campo | Valore |
|-------|--------|
| **AREA** | Pagamenti fornitore |
| **CLASSE** | C — Mancante |
| **STATO ATTUALE** | Nessun modulo pagamenti fornitore. IBAN fornitore solo in settings ordini (`lib/officina/officina-banche-ordini.ts`) come istruzioni pagamento ordine. |
| **FONTE DATI** | — |
| **PROBLEMA/GAP** | Impossibile registrare pagamenti, chiudere partite fornitore, riconciliare banca lato AP. |
| **DECISIONE NECESSARIA** | **D — CONTABILE:** scrittura pagamento; conti; abbinamento a fatture passive. |
| **DECISIONE DEL COMMERCIALISTA** | PENDING |
| **IMPATTO FUTURO** | FASE 3: modulo AP completo |

---

### 11. Scadenziario

| Campo | Valore |
|-------|--------|
| **AREA** | Scadenziario |
| **CLASSE** | B — Esistente ma insufficiente |
| **STATO ATTUALE** | Scadenziario **cliente** via `customer_open_items` (`due_date`, `remaining_signed`, stati open/partial/closed). UI `fatturazione-scadenziario-section.tsx`. `invoices.data_scadenza`. Nessuno scadenziario fornitore. |
| **FONTE DATI** | `customer_open_items`, `lib/fatturazione/open-items.ts` |
| **PROBLEMA/GAP** | Master della scadenza (operativo vs contabile) non definito. Rate, compensazione, riapertura, insoluti — regole contabili assenti. |
| **DECISIONE NECESSARIA** | **D — CONTABILE/OPERATIVA:** chi è master scadenza; regole rate e compensazione. |
| **DECISIONE DEL COMMERCIALISTA** | PENDING |
| **IMPATTO FUTURO** | FASE 3: allineamento scadenziario operativo e contabile |

---

### 12. Piano dei conti

| Campo | Valore |
|-------|--------|
| **AREA** | Piano dei conti |
| **CLASSE** | C — Mancante |
| **STATO ATTUALE** | `accounting_entry_lines.account_code` (testo libero) senza piano dei conti, mastrini, sottoconti. |
| **FONTE DATI** | `accounting_entries`, `accounting_entry_lines` (`20260910150300`) |
| **PROBLEMA/GAP** | Nessun conto ricavi, costi, IVA, clienti, fornitori, banche definito. |
| **DECISIONE NECESSARIA** | **D — CONTABILE:** piano completo da commercialista. |
| **DECISIONE DEL COMMERCIALISTA** | PENDING |
| **IMPATTO FUTURO** | FASE 3: tabella `chart_of_accounts`; validazione `account_code` |

---

### 13. Registri IVA e liquidazione

| Campo | Valore |
|-------|--------|
| **AREA** | Registri IVA |
| **CLASSE** | C — Mancante |
| **STATO ATTUALE** | IVA per riga fattura (`invoice_rows.iva_percent`). Sezione UI rollup IVA (`fatturazione-iva-section.tsx`) — solo riepilogo operativo. Enum `accounting_status`: `da_liquidare`, `liquidata` — senza workflow. |
| **FONTE DATI** | `invoice_rows`, `invoices.accounting_status` |
| **PROBLEMA/GAP** | Nessun registro vendite/acquisti, periodicità liquidazione, versamenti, compensazioni credito/debito IVA. |
| **DECISIONE NECESSARIA** | **D — FISCALE:** periodicità, registri, data riferimento, competenza, esigibilità, eccezioni CAB. |
| **DECISIONE DEL COMMERCIALISTA** | PENDING |
| **IMPATTO FUTURO** | FASE 3: registri IVA; liquidazione periodica |

---

### 14. Aliquote e nature IVA

| Campo | Valore |
|-------|--------|
| **AREA** | Aliquote / nature IVA |
| **CLASSE** | B — Esistente ma insufficiente |
| **STATO ATTUALE** | Default tecnico 22% su `invoice_rows.iva_percent`. `billing_customer_profiles`: `regime_fiscale`, `split_payment`, natura IVA default. Nessuna matrice aliquote/nature approvata. |
| **FONTE DATI** | `invoice_rows`, `billing_customer_profiles` |
| **PROBLEMA/GAP** | Aliquota non è regola fiscale CAB. Nature (N1–N7), reverse charge, split payment — non configurati. |
| **DECISIONE NECESSARIA** | **D — FISCALE:** matrice aliquote/nature applicabili a CAB (servizi officina, ricambi, PA). |
| **DECISIONE DEL COMMERCIALISTA** | PENDING |
| **IMPATTO FUTURO** | FASE 3: tabella `vat_codes`; validazione righe fattura |

---

### 15. Causali contabili

| Campo | Valore |
|-------|--------|
| **AREA** | Causali contabili |
| **CLASSE** | C — Mancante |
| **STATO ATTUALE** | Nessuna tabella causali. `accounting_entries.description` testo libero. |
| **FONTE DATI** | `accounting_entries` |
| **PROBLEMA/GAP** | Impossibile mappare evento → scrittura standardizzata senza causali approvate. |
| **DECISIONE NECESSARIA** | **D — CONTABILE:** elenco causali con conti dare/avere, registro IVA, gestione scadenze. |
| **DECISIONE DEL COMMERCIALISTA** | PENDING |
| **IMPATTO FUTURO** | FASE 3: `accounting_causals` + motore generazione |

---

### 16. Prima nota / scritture automatiche

| Campo | Valore |
|-------|--------|
| **AREA** | Prima nota |
| **CLASSE** | B — Esistente ma insufficiente |
| **STATO ATTUALE** | `accounting_entries` + `accounting_entry_lines` (draft/posted/reversed). `entry_origin`: manual, automatic, imported, reversed. **Generazione automatica disabilitata in produzione** (`docs/fatturazione-production-readiness.md`, `docs/fatturazione-accounting-idempotency.md`). Export CSV: `lib/fatturazione/accounting-export.ts`. |
| **FONTE DATI** | Phase 3 migration, `components/fatturazione/sections/fatturazione-contabilita-section.tsx` |
| **PROBLEMA/GAP** | Schema presente; regole di generazione, idempotenza e quadratura non approvate. |
| **DECISIONE NECESSARIA** | **D — CONTABILE:** quali eventi generano scrittura automatica. **E — TECNICA:** idempotenza `(source_type, source_id)`. |
| **DECISIONE DEL COMMERCIALISTA** | PENDING |
| **IMPATTO FUTURO** | FASE 3: abilitazione auto-gen post-approvazione |

---

### 17. Lavorazioni e schede (consuntivo operativo)

| Campo | Valore |
|-------|--------|
| **AREA** | Lavorazioni / schede |
| **CLASSE** | A — Esistente e utilizzabile (operativo) |
| **STATO ATTUALE** | `lavorazioni`, `scheda_lavorazione` (JSONB ore/interventi/ricambi). `actual_labor_hours` denormalizzato. Collegamento a preventivo, fattura via `invoice_links`. |
| **FONTE DATI** | `lib/domain/`, `scheda_lavorazione` |
| **PROBLEMA/GAP** | Ore consuntive non sono documento fiscale. Costi interni non tracciati in contabilità. |
| **DECISIONE NECESSARIA** | **D — CONTABILE:** rilevanza contabile costi manodopera interna (candidato: `NON_GENERA_SCRITTURA` fino a fatturazione). |
| **DECISIONE DEL COMMERCIALISTA** | PENDING |
| **IMPATTO FUTURO** | FASE 3: collegamento lavorazione → fattura → ricavo |

---

### 18. Magazzino e movimenti ricambi

| Campo | Valore |
|-------|--------|
| **AREA** | Magazzino |
| **CLASSE** | A — Esistente e utilizzabile (operativo) |
| **STATO ATTUALE** | `magazzino_ricambi`, `movimenti_ricambi` (entrate/uscite). Ricezione merce: `inventory_documents`. Nessuna valorizzazione contabile magazzino. |
| **FONTE DATI** | migrations magazzino, `lib/magazzino/` |
| **PROBLEMA/GAP** | Rimanenze, costo medio, scritture carico/scarico magazzino non definiti. |
| **DECISIONE NECESSARIA** | **D — CONTABILE:** metodo valorizzazione; scritture magazzino (candidato ricezione: `DA_DEFINIRE`). |
| **DECISIONE DEL COMMERCIALISTA** | PENDING |
| **IMPATTO FUTURO** | FASE 3: eventuale modulo magazzino contabile |

---

### 19. Ordini fornitori

| Campo | Valore |
|-------|--------|
| **AREA** | Ordini fornitori |
| **CLASSE** | A — Esistente e utilizzabile (operativo) |
| **STATO ATTUALE** | `ordini_fornitori` + righe. Totali imponibile/IVA/totale header-level. Stati logistici. PDF ordine. |
| **FONTE DATI** | `20261031120000_ordini_fornitori_module.sql`, `lib/ordini-fornitori/` |
| **PROBLEMA/GAP** | Ordine ≠ fattura passiva. Nessuna registrazione contabile (candidato: `NON_GENERA_SCRITTURA`). |
| **DECISIONE NECESSARIA** | **D — CONTABILE:** rilevanza contabile ordine fornitore. |
| **DECISIONE DEL COMMERCIALISTA** | PENDING |
| **IMPATTO FUTURO** | FASE 3: collegamento ordine → fattura passiva → pagamento |

---

### 20. Fatture passive (AP)

| Campo | Valore |
|-------|--------|
| **AREA** | Fatture passive |
| **CLASSE** | C — Mancante |
| **STATO ATTUALE** | Nessun modulo. Ricezione fatture elettroniche non implementata. |
| **FONTE DATI** | — |
| **PROBLEMA/GAP** | Blocco per registri IVA acquisti, partite fornitore, contabilità completa. |
| **DECISIONE NECESSARIA** | **D — FISCALE/CONTABILE:** workflow ricezione, registrazione, IVA detraibile, scadenze pagamento. |
| **DECISIONE DEL COMMERCIALISTA** | PENDING |
| **IMPATTO FUTURO** | FASE 3: modulo AP + SdI ricezione |

---

### 21. Banche e riconciliazione

| Campo | Valore |
|-------|--------|
| **AREA** | Banche |
| **CLASSE** | B — Esistente ma insufficiente |
| **STATO ATTUALE** | IBAN in `app_settings` per ordini fornitore (`officina-banche-ordini`). Nessun conto bancario contabile, movimenti, import CBI/CAMT, riconciliazione. |
| **FONTE DATI** | `lib/officina/officina-banche-ordini.ts` |
| **PROBLEMA/GAP** | Impossibile quadratura banca, abbinamento incassi/pagamenti, commissioni. |
| **DECISIONE NECESSARIA** | **D — CONTABILE:** conti bancari, cassa, riconciliazione. **E — TECNICA:** integrazione bancaria (non in FASE 2). |
| **DECISIONE DEL COMMERCIALISTA** | PENDING |
| **IMPATTO FUTURO** | FASE 3: ledger bancario |

---

### 22. Cespiti e ammortamenti

| Campo | Valore |
|-------|--------|
| **AREA** | Cespiti / ammortamenti |
| **CLASSE** | C — Mancante |
| **STATO ATTUALE** | Nessun modulo cespiti. `mezzi` e `attrezzature` sono asset operativi, non contabili. |
| **FONTE DATI** | `mezzi`, `attrezzature` |
| **PROBLEMA/GAP** | Registrazione acquisto cespite, quote ammortamento, dismissione — assenti. |
| **DECISIONE NECESSARIA** | **D — CONTABILE:** applicabilità a CAB (SI/NO/DA CONFERMARE); categorie, aliquote, metodi. |
| **DECISIONE DEL COMMERCIALISTA** | PENDING |
| **IMPATTO FUTURO** | FASE 3: modulo cespiti (se applicabile) |

---

### 23. SdI / FatturaPA

| Campo | Valore |
|-------|--------|
| **AREA** | Fatturazione elettronica |
| **CLASSE** | B — Esistente ma insufficiente |
| **STATO ATTUALE** | Tabelle: `invoice_fatturapa_snapshots`, `invoice_sdi_submissions` (provider `stub`). Assi `sdi_status`. Snapshot JSON: `lib/fatturazione/fe-sdi/fatturapa-snapshot.ts`. Webhook stub: `app/api/fatturazione/sdi-webhook/route.ts`. PA meta: CIG, CUP. **Nessun invio reale, nessun XML.** |
| **FONTE DATI** | `20260910150200_fatturazione_erp_phase2.sql` |
| **PROBLEMA/GAP** | Integrazione SdI non operativa. Conservazione, ricevute, scarti, NC elettroniche — da definire. |
| **DECISIONE NECESSARIA** | **D — FISCALE:** requisiti emissione/ricezione; **E — TECNICA:** provider (Aruba o altro). |
| **DECISIONE DEL COMMERCIALISTA** | PENDING |
| **IMPATTO FUTURO** | FASE 3: adapter provider; workflow stati SdI |

---

### 24. Provider fatturazione (Aruba / altro)

| Campo | Valore |
|-------|--------|
| **AREA** | Provider esterno |
| **CLASSE** | E — Da decidere tecnicamente |
| **STATO ATTUALE** | `invoice_sdi_submissions.provider` default `stub`. Nessuna integrazione API. |
| **FONTE DATI** | Schema phase 2 |
| **PROBLEMA/GAP** | Scelta provider non vincola regole fiscali ma impatta implementazione. |
| **DECISIONE NECESSARIA** | **E — TECNICA:** requisiti API, webhook, conservazione, idempotenza. CAB decide fornitore. |
| **DECISIONE DEL COMMERCIALISTA** | N/A (solo requisiti funzionali se richiesti) |
| **IMPATTO FUTURO** | FASE 3: integrazione provider |

---

### 25. Chiusura esercizio e assestamenti

| Campo | Valore |
|-------|--------|
| **AREA** | Chiusura esercizio |
| **CLASSE** | C — Mancante |
| **STATO ATTUALE** | Nessun concetto di esercizio contabile, blocco periodi, scritture di assestamento (ratei, risconti, rimanenze). |
| **FONTE DATI** | — |
| **PROBLEMA/GAP** | Impossibile chiudere bilancio da gestionale. |
| **DECISIONE NECESSARIA** | **D — CONTABILE:** scritture assestamento applicabili; blocco esercizio; riapertura. |
| **DECISIONE DEL COMMERCIALISTA** | PENDING |
| **IMPATTO FUTURO** | FASE 3: modulo chiusura |

---

### 26. Audit trail contabile

| Campo | Valore |
|-------|--------|
| **AREA** | Audit trail |
| **CLASSE** | B — Esistente ma insufficiente |
| **STATO ATTUALE** | `invoice_events` (event sourcing fattura), `log_modifiche`, `preventivo_events`, `app_settings_audit`. Non esteso a scritture contabili immutabili. |
| **FONTE DATI** | Varie tabelle audit |
| **PROBLEMA/GAP** | Requisiti audit contabile (chi, quando, storno, rettifica) non formalizzati. |
| **DECISIONE NECESSARIA** | **D — CONTABILE/OPERATIVA:** policy immutabilità post-registrazione. **E — TECNICA:** implementazione trail. |
| **DECISIONE DEL COMMERCIALISTA** | PENDING |
| **IMPATTO FUTURO** | FASE 3: audit su `accounting_entries` |

---

### 27. Reportistica economica (eco_*)

| Campo | Valore |
|-------|--------|
| **AREA** | Report economici |
| **CLASSE** | A — Esistente e utilizzabile (informativo) |
| **STATO ATTUALE** | Metriche `eco_fatturato`, `eco_incassato`, `eco_da_incassare`, `eco_importo_scaduto` in report engine. Non sono registri contabili. |
| **FONTE DATI** | `lib/report/metrics/report-metric-registry.ts` |
| **PROBLEMA/GAP** | Dashboard economica ≠ bilancio/contabilità. Rischio confusione. |
| **DECISIONE NECESSARIA** | **E — TECNICA:** separazione report gestionali vs report contabili. |
| **DECISIONE DEL COMMERCIALISTA** | PENDING (quali report contabili obbligatori) |
| **IMPATTO FUTURO** | FASE 3: report da registri contabili approvati |

---

### 28. Integrazione UnoERP

| Campo | Valore |
|-------|--------|
| **AREA** | Integrazioni ERP esterne |
| **CLASSE** | C — Mancante (rimosso) |
| **STATO ATTUALE** | Integrazione UnoERP rimossa dal codice applicativo. Migration `20261404120000_remove_unoerp.sql` elimina tabelle sync. |
| **FONTE DATI** | Migration remove_unoerp |
| **PROBLEMA/GAP** | Nessuna integrazione contabile esterna attiva. Contabilità sarà interna al gestionale. |
| **DECISIONE NECESSARIA** | **E — TECNICA:** conferma nessun ERP esterno per contabilità. |
| **DECISIONE DEL COMMERCIALISTA** | N/A |
| **IMPATTO FUTURO** | FASE 3: motore contabile nativo CAB |

---

### 29. Permessi RBAC fatturazione

| Campo | Valore |
|-------|--------|
| **AREA** | Permessi |
| **CLASSE** | A — Esistente e utilizzabile |
| **STATO ATTUALE** | Modulo `fatturazione` in RBAC. Workflow permissions configurabili. Gate regression: `fatturazione-rbac-write-parity.test.ts`. |
| **FONTE DATI** | `lib/fatturazione/fatturazione-workflow-permissions.ts`, migration `20260717130000` |
| **PROBLEMA/GAP** | Permessi contabili (registrazione, storno, chiusura esercizio) non definiti. |
| **DECISIONE NECESSARIA** | **D — OPERATIVA:** chi può registrare/stornare/chiudere. **E — TECNICA:** estensione RBAC. |
| **DECISIONE DEL COMMERCIALISTA** | PENDING (policy operativa) |
| **IMPATTO FUTURO** | FASE 3: permessi modulo contabilità |

---

### 30. Dipendenti e costi del personale

| Campo | Valore |
|-------|--------|
| **AREA** | Personale / costi interni |
| **CLASSE** | A — Esistente e utilizzabile (operativo) |
| **STATO ATTUALE** | `dipendenti`, timesheet, presenze. Non collegati a contabilità o costi commessa. |
| **FONTE DATI** | modulo dipendenti |
| **PROBLEMA/GAP** | Costo orario, imputazione su lavorazioni, scritture costo personale — non definiti. |
| **DECISIONE NECESSARIA** | **D — CONTABILE:** rilevanza contabile costi personale (candidato: `NON_GENERA_SCRITTURA` o `DA_DEFINIRE`). |
| **DECISIONE DEL COMMERCIALISTA** | PENDING |
| **IMPATTO FUTURO** | FASE 3: eventuale analytics costi (non contabilità obbligatoria) |

---

## Sintesi gap critici per FASE 3

| Priorità | Gap | Blocca |
|----------|-----|--------|
| 1 | Anagrafica fiscale CAB | SdI, fatturazione legale |
| 2 | Piano dei conti + causali | Qualsiasi scrittura |
| 3 | Regole Documento → Scrittura approvate | Motore contabile |
| 4 | Matrice IVA/nature | Registri IVA |
| 5 | Fatture passive / AP | Ciclo acquisti completo |
| 6 | Banche / riconciliazione | Quadratura tesoreria |
| 7 | SdI operativo | Compliance fatturazione elettronica |

---

## Riferimenti

- [CAB_Accounting_Fiscal_Specification.md](./CAB_Accounting_Fiscal_Specification.md)
- [CAB_Accounting_Fiscal_Review.md](./CAB_Accounting_Fiscal_Review.md)
- [fatturazione-production-readiness.md](../fatturazione-production-readiness.md)
- [fatturazione-accounting-idempotency.md](../fatturazione-accounting-idempotency.md)
