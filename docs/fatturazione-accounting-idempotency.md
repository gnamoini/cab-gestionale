# Contabilità — idempotenza e entry lifecycle

## entry_status (colonna `status`)

`accounting_entries.status` è il SSOT del ciclo di vita:

- `draft` — bozza non contabilizzata
- `posted` — registrata
- `reversed` — stornata

## entry_origin

- `manual` — inserimento utente / export CSV
- `automatic` — generazione da evento fattura (non attiva in prod Fase 3)
- `imported` — import esterno
- `reversed` — riga di storno

## Idempotenza futura

Chiave logica: `(source_type, source_id)` + `status` per evitare doppie scritture sullo stesso evento.

Pattern storno: nuova entry con `entry_origin = reversed` che referenzia l'entry originale nel payload.

Generazione automatica da `emit` / `pay` / NC / `cancel` **non abilitata** finché quadratura V2 non è verde in staging.
