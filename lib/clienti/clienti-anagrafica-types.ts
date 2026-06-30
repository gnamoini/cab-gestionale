/** Tipi UI anagrafica clienti estesa (isolata da picker mezzi:clienti). */

export type ClienteSedeTipo = "operativa" | "legale";

export type ClienteContattoTipo =
  | "email"
  | "pec"
  | "cellulare"
  | "telefono"
  | "whatsapp"
  | "sito_web"
  | "altro";

export type ClienteSedeFields = {
  via: string;
  numeroCivico: string;
  cap: string;
  citta: string;
  provincia: string;
  stato: string;
};

export type ClienteSede = ClienteSedeFields & {
  id: string;
  tipo: ClienteSedeTipo;
};

export type ClienteContatto = {
  id: string;
  etichetta: string;
  tipo: ClienteContattoTipo;
  valore: string;
  ordine: number;
};

export type ClienteAnagrafica = {
  id: string;
  nomeDisplay: string;
  entityKey: string;
  ragioneSociale: string;
  partitaIva: string;
  codiceDestinatario: string;
  sedeLegaleUgualeOperativa: boolean;
  inListaSettings: boolean;
  note: string;
  sedi: {
    operativa: ClienteSedeFields;
    legale: ClienteSedeFields;
  };
  contatti: ClienteContatto[];
};

export const CLIENTE_CONTATTO_TIPO_LABELS: Record<ClienteContattoTipo, string> = {
  email: "Email",
  pec: "PEC",
  cellulare: "Cellulare",
  telefono: "Telefono",
  whatsapp: "WhatsApp",
  sito_web: "Sito web",
  altro: "Altro",
};

export const CLIENTE_CONTATTO_TIPO_OPTIONS: ClienteContattoTipo[] = [
  "email",
  "pec",
  "cellulare",
  "telefono",
  "whatsapp",
  "sito_web",
  "altro",
];

export function emptyClienteSedeFields(): ClienteSedeFields {
  return {
    via: "",
    numeroCivico: "",
    cap: "",
    citta: "",
    provincia: "",
    stato: "IT",
  };
}

export function emptyClienteAnagrafica(nomeDisplay: string, entityKey: string): ClienteAnagrafica {
  const empty = emptyClienteSedeFields();
  return {
    id: "",
    nomeDisplay,
    entityKey,
    ragioneSociale: "",
    partitaIva: "",
    codiceDestinatario: "",
    sedeLegaleUgualeOperativa: false,
    inListaSettings: true,
    note: "",
    sedi: { operativa: { ...empty }, legale: { ...empty } },
    contatti: [],
  };
}

export function emptyClienteContatto(ordine: number): Omit<ClienteContatto, "id"> & { id: string } {
  return {
    id: crypto.randomUUID(),
    etichetta: "",
    tipo: "email",
    valore: "",
    ordine,
  };
}
