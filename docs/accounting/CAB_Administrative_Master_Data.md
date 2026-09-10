# CAB Administrative Master Data — FASE 5

| Campo | Valore |
|-------|--------|
| Documento | CAB Administrative Master Data |
| Versione | 1.0 |
| Stato | ACTIVE |
| Fase | FASE 5 — Anagrafiche amministrative |

---

## Scopo

Base anagrafica amministrativa affidabile per cliente e fornitore, coerente con il motore contabile FASE 3/4. Fonte autorevole: database CAB (`clienti_anagrafiche`, `fornitori_anagrafiche`).

**Identità relazionale:** primary key interna (`id`). Vietato usare `entity_key`, P.IVA, CF, PEC, label o fuzzy matching come identificatore definitivo.

---

## AUDIT — Inventario pre-FASE 5

### CLIENTE_CURRENT_SCHEMA

| Tabella | Ruolo |
|---------|-------|
| `clienti_anagrafiche` | SSOT operativo (post-FASE 5: SSOT unico) |
| `clienti_sedi` | Sede operativa/legale |
| `clienti_contatti` | Rubrica contatti |
| `cliente_bank_accounts` | Conti bancari partner (FASE 5) |
| `billing_customers` | **Legacy** — in migrazione, read-only fino ad A8 |
| `billing_customer_profiles` | **Legacy** — profili fiscali da migrare |

### FORNITORE_CURRENT_SCHEMA

| Tabella | Ruolo |
|---------|-------|
| `fornitori_anagrafiche` | SSOT fornitore (FASE 5) |
| `fornitore_bank_accounts` | Conti bancari fornitore (FASE 5) |
| `app_settings` JSON `fornitoreAnagraficaByFornitore` | **Legacy** — migrato in A6 |

### LEGACY_FIELDS

- `mezzi.cliente`, `preventivi.cliente` — text operativo
- `billing_customers.codice_sdi` → unificato in `codice_destinatario`
- `clienti_anagrafiche.meta.codice_fiscale` → colonna `codice_fiscale`

### ENTITY_KEY_USAGE

| Classificazione | Ruolo post-FASE 5 |
|-----------------|-------------------|
| IDENTIFICATION | **Rimosso** da lookup fiscale/documenti |
| LEGACY_TECHNICAL | Sync rename/settings — `buildClienteEntityKey(nome_display)` |
| NON_FISCAL | mezzi/ricambi entity_key — invariato |

### TEXT_MATCHING_USAGE

Rimosso come identity definitiva. Ricerca UX ammessa; salvataggio sempre `cliente_id` / `fornitore_id`.

### TEXT_FIELD_ROLE (A0.4)

| Tabella | Colonna | Ruolo |
|---------|---------|-------|
| `mezzi` | `cliente` | OPERATIONAL — migrare filtri a `cliente_id` |
| `preventivi` | `cliente` | OPERATIONAL |
| `ddt_documents` | `cliente_label` | DISPLAY_ONLY post-FK |
| `ordini_fornitori` | `fornitore_label` | DISPLAY_ONLY post-FK |
| `invoices` | `cliente_label` | DISPLAY_ONLY post-FK |

### Reference data FASE 3 (A0.1)

| Concetto | Tabella | Azione FASE 5 |
|----------|---------|---------------|
| Aliquote IVA | `vat_codes` | Riusata — `default_vat_code_id` |
| Condizioni pagamento | `payment_terms` | Riusata — `default_payment_term_id` (quando) |
| Modalità pagamento | `payment_methods` | Riusata — `default_payment_method_id` (come) |
| Regime fiscale | — | Creata `fiscal_regimes` (gap) |

### Sezionale vs giornale contabile (A0.2)

| Oggetto | Semantica |
|---------|-----------|
| `accounting_journals` | Giornale contabile — `default_accounting_journal_id` (opzionale) |
| `document_series` | Serie documentale fatture — `default_document_series_id` |

**Non** confondere sezionale fatture con giornale contabile.

---

## Regola di migrazione SSOT

`billing_customers` è sorgente legacy, non secondo SSOT.

**Gerarchia mapping obbligatoria:**

1. FK relazionale già esistente
2. Mapping storico esplicito (`admin_billing_customer_migration_map`)
3. Identificativo fiscale normalizzato univoco per `company_id`
4. Mapping manuale admin
5. Conflitto → `REVIEW_REQUIRED`

`entity_key` / label → solo proposta in report, mai criterio sufficiente.

**Gate A8** (rimozione `billing_customers`): zero FK, query, RPC, test runtime.

---

## Modello dati cliente (`clienti_anagrafiche`)

### Identità

- `id` (PK, immutabile)
- `company_id` (tenant)
- `nome_display`, `nome_commerciale`, `tipo_soggetto`
- `ragione_sociale`, `partita_iva`, `codice_fiscale`, `nazione`

### Fatturazione elettronica

- `pec`, `codice_destinatario`

### Fiscalità

- `fiscal_regime_id`, `default_vat_code_id`, `split_payment`, `natura_iva_default`

### Pagamenti

- `default_payment_term_id` — **quando** (scadenze)
- `default_payment_method_id` — **come** (strumento)

### Contabilità

- `default_account_id` → `accounting_accounts`
- `default_accounting_journal_id` → `accounting_journals` (giornale contabile)
- `default_document_series_id` → `document_series` (sezionale fatture)

### Vincoli tenant

Cross-company guard: FK configurazione devono appartenere allo stesso `company_id` del cliente.

---

## Modello dati fornitore (`fornitori_anagrafiche`)

Struttura parallela al cliente (senza mega-entità `entities`).

---

## Normalizzazione SSOT

Funzioni SQL: `admin_normalize_partita_iva`, `admin_normalize_codice_fiscale`, `admin_normalize_iban`, `admin_normalize_pec`, `admin_normalize_codice_destinatario`.

Layer TS: `lib/fiscal/normalize.ts`, `lib/fiscal/validate.ts` — allineati a SQL; RPC/DB autoritativi.

---

## Snapshot documentali

Al emissione/contabilizzazione: dati fiscali storicizzati in `customer_snapshot` / `fornitore_snapshot`. Modifiche anagrafica non alterano documenti esistenti.

---

## Limiti FASE 5

- No motore SdI / fatturazione elettronica completa
- No motore scadenziario (solo modello `payment_terms`)
- `billing_customers` rimosso solo post-gate A8

---

## Script pre-migrazione

`scripts/ops/fase5-pre-migration-audit.sql` — read-only, duplicati P.IVA/CF, proposte mapping.
