# Global Autocomplete — checklist QA

## Combobox (form e filtri)

- [ ] Click su campo vuoto: dropdown con elenco completo (browse).
- [ ] Digitazione filtra live (es. "be" → solo voci pertinenti).
- [ ] Enter seleziona voce evidenziata o primo risultato.
- [ ] Esc chiude e ripristina valore committato.
- [ ] Nessun risultato: pannello "Forse cercavi" + "Aggiungi all'elenco" (se permesso).
- [ ] Dopo modifica elenco in Impostazioni, combobox aggiornato entro ~2s (secondo browser).

## Persistenza selezione (form)

- [ ] Seleziona voce → Tab/Enter campo successivo → valore resta nel campo precedente.
- [ ] Seleziona voce → modifica testo → blur → commit corretto (o ripristino se testo invalido).
- [ ] Backspace fino a svuotare → blur → valore azzerato solo se l'utente ha digitato.

## Filtri (`variant="filter"`)

- [ ] Valore neutral (es. "Tutte le categorie"): primo click svuota il campo per cercare.
- [ ] Valore neutral: blur senza selezione → default ripristinato, stato filtro invariato.
- [ ] Valore già selezionato: click → testo committato editabile, non svuotato automaticamente.
- [ ] Selezione da elenco → Tab → filtro attivo e label visibile.

## Matching permissivo

- [ ] Ricerca `cereba` trova opzione salvata `CE.RE.BA`.
- [ ] Case, punti, spazi e trattini ignorati nel filtro live.
- [ ] Commit blur/Enter accetta match loose oltre al match letterale.

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
