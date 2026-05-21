# Checklist QA — sync realtime multi-utente

Due sessioni browser (admin + operatore), stesso ambiente Supabase con migration `20260521180000_gestionale_realtime_publication.sql` applicata.

| Test | Criterio |
|------|----------|
| Impostazioni | Modifica stato/addetto in A → elenco in B aggiornato entro ~2s; al massimo un toast settings / 10s |
| Lavorazione | Cambio stato/priorità in A → tabella/card B senza refresh manuale |
| Preventivo | Creazione/modifica in A → lista B aggiornata (dual-write DB + local) |
| Ricambi | Movimento in A → giacenza B |
| Supporto | Nota creata/risolta cross-user |
| Schede | Modifica bundle in A → modale B dopo invalidate |
| Anti-duplicazione | Bulk settings → un solo toast |
| Fallback RT | Con Realtime disabilitato in dashboard: polling ≤25s o focus ripristina dati |

Feature flag opzionali: `NEXT_PUBLIC_PREVENTIVI_DB_PRIMARY=true`, `NEXT_PUBLIC_SCHEDE_DB_PRIMARY=true`.
