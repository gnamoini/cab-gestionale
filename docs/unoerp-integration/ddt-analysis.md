# DDT analysis

**Stato: PARTIALLY_VERIFIED** — documento movimento magazzino identificato.

## Modulo DDT / documento di trasporto

| Campo | Valore |
|-------|--------|
| UNOERP_MODULE | `Magazzino` |
| UNOERP_FILE | `movimento` |
| PRIMARY_KEY | `id_movimento` |
| Tipo documento | **movimento magazzino** (non file `ddt` — quello risponde HTTP 500) |
| Evidenza | `info` PASS, 58 campi fieldset |

`Magazzino/ddt` → HTTP 500 (OBSERVED, non leggibile).

## Testata (OBSERVED schema)

| Concetto | Campo | Formato |
|----------|-------|---------|
| ID | `id_movimento` | |
| Numero documento | `doc_number`, `doc_number_padded` | text |
| Data | `data` | data |
| Data registrazione | `data_registrazione` | data |
| Sezionale | `sezionale` | menu (valori) |
| Protocollo | `cod`, `id_prot` | menu/text |
| Causale movimento | `causale_id` | menu |
| Causale interna | `causale_interna_id` | menu |
| Causale trasporto | `causale_trasporto_id` | menu |
| Cliente | `anagrafica_id`, `clifor_id` | |
| Destinazione | `destinatario_mov`, `indirizzo`, `citta`, `provincia` | |
| Vettore | `vettore_id` | menu |
| Depositi | `deposito_id`, `deposito_a` | menu |
| Task | `id_task` | text |
| Rif. ordine | `vsrif` | text |
| Totali | `totale_fattura`, `totale_iva`, `totale_ivato` | |
| Stato | `status`, `half_status` | |

## Righe

**NOT VERIFIED** — `index`/`show` senza record nel campione; probabile sub-struttura movimento (non esplorata).

## Causali e sezionali correlati

| Module/File | Uso |
|-------------|-----|
| Magazzino/causali_magazzino | configurazione causali (`sezionale_id`, `autoprot`, `causale_trasporto_id`) |
| Magazzino/causali_trasporto | causali trasporto |
| Amministrazione/sezionali | sezionali numerazione (`numerazione`, `formato`) |
| Base/vettori | anagrafica vettori |
| Base/modalita_pagamento | pagamento |

## Processo amministrativo/fatturativo

- Movimento valorizzabile (`totale_fattura`, IVA flags su causali)
- `to_cont` presente in schema — possibile contabilizzazione
- Utilità fatturazione downstream: **UNKNOWN** (serve `show` su movimento reale + workflow UnoERP)

## Sezionali / causali / pagamenti

Documentati in schema movimento + moduli satellite sopra. ID interni da menu `valori` — mapping label→ID richiede `info` valori o mapping manuale.
