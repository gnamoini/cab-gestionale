/**
 * Mock SOLO frontend per la sezione «Log modifiche» della pagina Lavorazioni
 * quando la tabella `log_modifiche` non restituisce righe o la query fallisce.
 * Non viene mai scritto nulla su DB.
 */
export const LAVORAZIONI_MOCK_MODIFICHE_FLAG = true;

export type LavorazioniModificaLogUi = {
  id: string;
  created_at: string;
  azione: string;
  entita_id: string;
  utenteLabel: string;
  campoModificato: string;
  isMockData: true;
};

const isoHoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

/** Voci dimostrative (struttura allineata al modello reale: azione, utente, timestamp, campo). */
export const LAVORAZIONI_MOCK_MODIFICHE_ENTRIES: LavorazioniModificaLogUi[] = [
  {
    isMockData: true,
    id: "mock-lav-log-1",
    created_at: isoHoursAgo(2),
    azione: "create",
    entita_id: "lav-demo-1",
    utenteLabel: "Operatore (demo)",
    campoModificato: "—",
  },
  {
    isMockData: true,
    id: "mock-lav-log-2",
    created_at: isoHoursAgo(5),
    azione: "update",
    entita_id: "lav-demo-1",
    utenteLabel: "Mario Rossi (demo)",
    campoModificato: "stato",
  },
  {
    isMockData: true,
    id: "mock-lav-log-3",
    created_at: isoHoursAgo(26),
    azione: "update",
    entita_id: "lav-demo-2",
    utenteLabel: "Operatore (demo)",
    campoModificato: "note",
  },
  {
    isMockData: true,
    id: "mock-lav-log-4",
    created_at: isoHoursAgo(50),
    azione: "delete",
    entita_id: "lav-demo-3",
    utenteLabel: "Admin (demo)",
    campoModificato: "bozza annullata",
  },
];
