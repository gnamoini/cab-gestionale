/** Messaggi toast standard — un solo messaggio finale per azione. */
export const GESTIONALE_TOAST = {
  successDone: "Operazione completata",
  successSaved: "Salvataggio completato",
  successDeleted: "Elemento eliminato",
  successCreated: "Elemento creato",
  successUploaded: "Caricamento completato",
  successRefreshed: "Lavorazioni aggiornate",
  genericError: "Operazione non riuscita. Riprova tra poco.",
  networkError: "Connessione non disponibile. Riprova tra poco.",
  offlineWriteBlocked: "Connessione assente. Attiva la connessione per sincronizzare.",
  validationError: "Controlla i dati inseriti e riprova.",
  dipendentiSelectAddettoForPdf:
    "Seleziona un addetto nei filtri per esportare il PDF dipendente.",
  dipendentiFillToday8hNotInMonth:
    "Oggi non è nel mese visualizzato. Usa «Oggi» o seleziona il mese corrente.",
  dipendentiFillToday8hNoEmpty:
    "Nessuna cella vuota da compilare per oggi.",
  dipendentiFillToday8hSuccess: "Presenze di oggi aggiornate (8 ore sulle celle vuote).",
  dipendentiFillTodayFerieNoTipo:
    "Tipo assenza «Ferie» non configurato. Controlla le impostazioni dipendenti.",
  dipendentiFillTodayFerieNoEmpty:
    "Nessuna cella vuota da compilare con ferie per oggi.",
  dipendentiFillTodayFerieSuccess:
    "Assenze di oggi aggiornate (8 ore ferie sulle celle vuote).",
  dipendentiCopyDayToAllSuccess: "Ore copiate a tutti gli addetti per il giorno selezionato.",
  popupBlocked:
    "Il browser ha bloccato i pop-up. Consenti i pop-up per questo sito e ripeti l'azione.",
} as const;
