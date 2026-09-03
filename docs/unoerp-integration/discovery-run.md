# Discovery run — casbari.unoerp.it

- **Timestamp:** 2026-09-03T20:08:43Z (aggiornato post-scan esteso)
- **Endpoint:** `https://casbari.unoerp.it/intranet/api.php`
- **Account:** `CO***` (UID **613**)
- **Autenticazione:** PASS (Basic Auth → token)
- **Encoding richieste:** `application/x-www-form-urlencoded` (JSON body con `auth` → 401 su questa istanza)
- **READ_ONLY:** PASS
- **Acts usati:** `info`, `index`, `show` — solo questi
- **WRITE TESTS EXECUTED:** 0
- **Worker UnoERP:** non avviato
- **Sync jobs CAB:** non accodati
- **UNOERP_SYNC_HARD_STOP:** non necessario per discovery (nessuna write)

## Operazioni eseguite

1. `verifyUnoerpConnection` (login only)
2. Scan moduli candidati (`info`) — ~700 combinazioni module/file
3. `info` + `index` + `show` su moduli trovati
4. Campionamento record anonimizzato dove `index` restituisce dati

## Moduli leggibili (OBSERVED)

| Module | File | PK | Note |
|--------|------|-----|------|
| Base | iva | id_iva | |
| Base | unita_misura | id_unita_misura | |
| Base | modalita_pagamento | id_magpag | |
| Base | vettori | id_vettore | |
| Magazzino | articoli | id_articoli | index vuoto nel campione |
| Magazzino | causali_magazzino | id_causale | config causali movimento |
| Magazzino | causali_trasporto | id | |
| Magazzino | movimento | id_movimento | **documento DDT/movimento** |
| Magazzino | listini | id_listino | |
| Produzione | ordini | id | ordini vendita (non preventivo) |
| Produzione | task | id_task | commesse/task |
| Amministrazione | sezionali | id | numerazione sezionali |

## Moduli rilevati ma non leggibili (HTTP 500 su `info`)

Interpretazione: endpoint probabilmente presente ma **non accessibile** con l'utente API corrente (permesso o errore server). **Non verificato** come modulo assente.

- `Base/clienti`
- `Produzione/preventivi`, `Produzione/preventivo`
- `Magazzino/ddt`, `Magazzino/movimenti` (plurale)
- `CRM/*` (preventivi, clienti, …)

## Artefatti locali

```
artifacts/unoerp-discovery/
  normalized/     # schema + campioni anonimizzati
  reports/        # discovery-report.json, module-scan*.txt
```

Nessuna password/token nei file.
