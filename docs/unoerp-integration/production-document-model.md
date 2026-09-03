# Production document model

Fonte: `Produzione/ordini` — **non equivale a Preventivo**, solo modello strutturale.

PK: `id`

## Testata (campi non-tab)

- `anagrafica_id` (livesearch) — Cliente
- `oggetto` (text) — Oggetto
- `destinazione_id` (menu) — Destinazione
- `task_id` (task) — Task
- `contratto_attivita_id` (menu) — Contratto
- `listino_id` (menu) — Listino
- `ufficio_id` (menu) — Centro di attività
- `mod_pagamento` (menu) — Mod.Pagamento
- `banca_id` (menu) — Banca
- `conto_id` (menu) — Conto
- `agente_id` (menu) — Agente
- `segnalatore_mezzo_id` (menu) — Provenienza contatto
- `includi_canoni` (check) — Includi canoni nel movimento
- `data` (data) — Data
- `data_pagamento` (data) — Data pagamento
- `data_scadenza` (data) — Data Scadenza
- `data_fine` (data) — Data Consegna
- `note_data_fine` (text) — Note Consegna
- `note` (textarea) — Note
- `note_integrazioni` (textarea) — Specifiche da integrazione esterna
- `prot_id` (hidden) — 
- `confAddCanoni` (hidden) — 
- `confAddTrasportoIncasso` (hidden) — 
- `allegati_ca` (function) — Allegati
- `status` (check) — Includi spenti
- `id` (null) — ID

## Tab (probabili sub-strutture / righe)

- `materiali` — tipo tab (child structure NOT_VERIFIED senza show con dati)
- `subappalti` — tipo tab (child structure NOT_VERIFIED senza show con dati)
- `risorse_umane` — tipo tab (child structure NOT_VERIFIED senza show con dati)
- `risorse_tecniche` — tipo tab (child structure NOT_VERIFIED senza show con dati)
- `canoni` — tipo tab (child structure NOT_VERIFIED senza show con dati)
- `riepilogo` — tipo tab (child structure NOT_VERIFIED senza show con dati)

## Relazioni chiave

- `anagrafica_id` livesearch → cliente (target Base/clienti inferred)
- `task_id` → Produzione/task
- `mod_pagamento` → Base/modalita_pagamento (menu)
- `materiali`, `risorse_umane` → righe documento (NOT_VERIFIED)