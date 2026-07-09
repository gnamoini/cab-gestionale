# Politica numerazione fatture

## Concorrenza

`allocate_invoice_number()` usa `SELECT … FOR UPDATE` su `invoice_number_sequences`.

## Buchi di numerazione

I **buchi sono accettabili**: se una transazione alloca un numero e poi fa ROLLBACK, il numero non viene riutilizzato.

Esempio:

- Thread A alloca `42` → errore → ROLLBACK
- Thread B ottiene `43`
- Il `42` resta un buco permanente

Non si riutilizzano numeri saltati.
