/** Vista UI nota (modulo Supporto). */
export type SupportoNote = {
  id: string;
  /** Testo libero (bug, richieste, promemoria). */
  body: string;
  autore: string;
  at: string;
  /** Per OCC su modifica contenuto. */
  updatedAt: string;
  resolved: boolean;
};
