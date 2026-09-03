# Field ownership

Categorie:

| Categoria | Comportamento |
|---|---|
| CAB_MASTER | Sync da CAB; read-back; ripristino se modificato in UnoERP |
| UNOERP_MASTER | Mai scritto da CAB |
| CAB_READ_ONLY | Letto, non scritto |
| IMMUTABLE_AFTER_CREATE | Solo CREATE |
| IMMUTABLE_AFTER_CONFIRM | DDT: anno, serie, numero, sezionale |
| REFERENCE_ONLY | `unoerp_customer_id` — non in UPDATE payload |

Esempio preventivo (nomi CAB; nomi UnoERP da discovery):

- CAB_MASTER: descrizione, righe, qty, prezzi, sconti, IVA
- REFERENCE_ONLY: customer id mappato
- UNOERP_MASTER: dati fiscali/bancari/config

Note/allegati interni CAB: default **DO NOT SYNC** finché discovery non classifica SYNC.

Drift: EXPECTED (UNOERP_MASTER) / UNEXPECTED (CAB_MASTER) / IDENTITY (cliente/record/sezionale/numero).
