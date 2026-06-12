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
  validationError: "Controlla i dati inseriti e riprova.",
  dipendentiSelectAddettoForPdf:
    "Seleziona un addetto nei filtri per esportare il PDF dipendente.",
  dipendentiFillToday8hNotInMonth:
    "Oggi non è nel mese visualizzato. Usa «Oggi» o seleziona il mese corrente.",
  dipendentiFillToday8hNoEmpty:
    "Nessuna cella vuota da compilare per oggi.",
  dipendentiFillToday8hSuccess: "Presenze di oggi aggiornate (8 ore sulle celle vuote).",
  dipendentiCopyDayToAllSuccess: "Ore copiate a tutti gli addetti per il giorno selezionato.",
} as const;
