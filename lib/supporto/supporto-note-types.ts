/** Vista UI segnalazione (modulo Supporto). */
export type SupportoNote = {
  id: string;
  /** Testo libero (bug, richieste, promemoria). */
  body: string;
  autore: string;
  at: string;
  resolved: boolean;
};
