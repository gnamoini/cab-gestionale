# Permission matrix

Utente API: UID **613** (`CO***`). Metodo: solo operazioni READ eseguite.

## READ

| Risorsa | Act | Module/File | Esito | Evidenza |
|---------|-----|-------------|-------|----------|
| IVA | info/index/show | Base/iva | PASS | OBSERVED |
| UoM | info/index/show | Base/unita_misura | PASS | OBSERVED |
| Pagamenti | info/index/show | Base/modalita_pagamento | PASS | OBSERVED |
| Vettori | info | Base/vettori | PASS | OBSERVED |
| Articoli | info | Magazzino/articoli | PASS | index vuoto |
| Causali mag. | info/index/show | Magazzino/causali_magazzino | PASS | OBSERVED |
| Movimento/DDT | info | Magazzino/movimento | PASS | index vuoto |
| Ordini | info | Produzione/ordini | PASS | index vuoto |
| Task | info/index/show | Produzione/task | PASS | OBSERVED |
| Sezionali | info/index/show | Amministrazione/sezionali | PASS | OBSERVED |
| Clienti | info | Base/clienti | **DENIED?** | HTTP 500 |
| Preventivi | info | Produzione/preventivi | **DENIED?** | HTTP 500 |
| DDT (file) | info | Magazzino/ddt | **DENIED?** | HTTP 500 |
| Consuntivi | info | Produzione/consuntivi | **DENIED?** | HTTP 500 |

Legenda esito HTTP 500: **NOT VERIFIED** se permesso negato vs errore modulo.

## CREATE / UPDATE / DELETE

| Operazione | Stato |
|------------|-------|
| CREATE | **NOT TESTED** |
| UPDATE | **NOT TESTED** |
| DELETE | **NOT TESTED** (vietato da integrazione CAB) |

## Legenda

- **OBSERVED** — eseguito in discovery
- **DOCUMENTED** — da documentazione UnoERP pubblica
- **NOT TESTED** — non eseguito per policy discovery
