# Global Autocomplete — checklist QA

## Combobox (form e filtri)

- [ ] Click su campo vuoto: dropdown con elenco completo (browse).
- [ ] Digitazione filtra live (es. "be" → solo voci pertinenti).
- [ ] Enter seleziona voce evidenziata o primo risultato.
- [ ] Esc chiude e ripristina valore committato.
- [ ] Nessun risultato: pannello "Forse cercavi" + "Aggiungi all'elenco" (se permesso).
- [ ] Dopo modifica elenco in Impostazioni, combobox aggiornato entro ~2s (secondo browser).

## Liste settings

- [ ] `lavorazioni:stati` / `lavorazioni:priorita`: voci colorate, no aggiunta dinamica.
- [ ] `lavorazioni:addetti`, `mezzi:clienti`, `magazzino:categorie`: sync da DB, append funziona.

## Pill tabella lavorazioni

- [ ] Click-only (no ricerca nel campo pill).
- [ ] Stato / priorità / addetto allineati a impostazioni globali.

## Regressioni

- [ ] Creazione lavorazione: stato e priorità da combobox globali.
- [ ] Filtri avanzati lavorazioni / preventivi / magazzino: elenchi da `app_settings`.
- [ ] Schede: addetto riga con `GlobalSettingsListSelect`.
