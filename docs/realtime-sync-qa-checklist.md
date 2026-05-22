# Checklist QA — sync realtime multi-utente / multi-tab

Ambiente Supabase con migrations Realtime applicate:
- `20260521180000_gestionale_realtime_publication.sql`
- `20260520220000_lavorazione_documents.sql`
- `20260520210000_support_notes.sql`

## Multi-tab (stesso browser, stesso utente)

Apri due tab sulla stessa origine (es. `/lavorazioni`).

| Test | Criterio |
|------|----------|
| Creazione lavorazione | Tab A crea → Tab B mostra la riga entro ~1s (Realtime) o ~20s (polling fallback) |
| Modifica stato/priorità | Tab A modifica → Tab B aggiorna senza refresh |
| Eliminazione | Tab A elimina → Tab B rimuove la riga |
| Schede | Tab A salva schede con modale aperta su Tab B → Tab B aggiorna via cab-sync |
| PDF lavorazione | Tab A carica PDF → Tab B aggiorna documenti |
| Refresh Tab B | Dati coerenti con Tab A |

## Multi-utente (due sessioni browser)

Admin + operatore, stesso ambiente Supabase.

| Test | Criterio |
|------|----------|
| Impostazioni | Modifica stato/addetto in A → elenco in B aggiornato entro ~2s; al massimo un toast settings / 10s |
| Lavorazione | Cambio stato/priorità in A → tabella/card B senza refresh manuale |
| Preventivo | Creazione/modifica in A → lista B aggiornata |
| Ricambi | Movimento in A → giacenza B |
| Supporto | Nota creata/risolta cross-user |
| Anti-duplicazione | Bulk settings → un solo toast |
| Fallback RT | Con Realtime disabilitato: polling ≤20s o focus ripristina dati |

Feature flag opzionali: `NEXT_PUBLIC_PREVENTIVI_DB_PRIMARY=true`, `NEXT_PUBLIC_SCHEDE_DB_PRIMARY=true`.
