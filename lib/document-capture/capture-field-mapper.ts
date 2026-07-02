import { emptySchedaIngressoFields } from "@/lib/domain/intervento-context/build-intervento-context";
import { newRigaId, newSchedaMeta } from "@/lib/schede/schede-ui";
import type {
  LavorazioneSchedeBundle,
  SchedaIngressoFields,
  SchedaLavorazioniDoc,
  SchedaLavorazioniFields,
  SchedaRicambiDoc,
  SchedaRicambiFields,
} from "@/types/schede";

const INGRESSO_KEY_MAP: Record<string, keyof SchedaIngressoFields> = {
  cliente: "cliente",
  cantiere: "cantiere",
  utilizzatore: "utilizzatore",
  dataingresso: "dataIngresso",
  data_ingresso: "dataIngresso",
  tipoattrezzatura: "tipoAttrezzatura",
  tipo_attrezzatura: "tipoAttrezzatura",
  marcaattrezzatura: "marcaAttrezzatura",
  marca_attrezzatura: "marcaAttrezzatura",
  modelloattrezzatura: "modelloAttrezzatura",
  modello_attrezzatura: "modelloAttrezzatura",
  matricola: "matricola",
  nscuderia: "nScuderia",
  numero_scuderia: "nScuderia",
  orelavoro: "oreLavoro",
  ore_lavoro: "oreLavoro",
  tipotelaio: "tipoTelaio",
  tipo_telaio: "tipoTelaio",
  marcatelaio: "marcaTelaio",
  marca_telaio: "marcaTelaio",
  modellotelaio: "modelloTelaio",
  modello_telaio: "modelloTelaio",
  targa: "targa",
  km: "km",
  descrizioneanomalia: "descrizioneAnomalia",
  descrizione_anomalia: "descrizioneAnomalia",
  livellocarburante: "livelloCarburante",
  livello_carburante: "livelloCarburante",
  addettoaccettazione: "addettoAccettazione",
  addetto_accettazione: "addettoAccettazione",
  richiedente: "richiedente",
  noteintervento: "noteIntervento",
  note_intervento: "noteIntervento",
};

function normKey(key: string): string {
  return key.trim().toLowerCase().replace(/^ingresso\./, "");
}

export type CaptureFieldRow = {
  field_key: string;
  confirmed_value: string | null;
  normalized_value: string | null;
};

export function resolveCaptureFieldValue(row: CaptureFieldRow): string {
  const v = row.confirmed_value ?? row.normalized_value ?? "";
  return typeof v === "string" ? v.trim() : "";
}

export function mapCaptureFieldsToIngresso(fields: readonly CaptureFieldRow[]): SchedaIngressoFields {
  const out = emptySchedaIngressoFields();
  for (const row of fields) {
    const mapped = INGRESSO_KEY_MAP[normKey(row.field_key)];
    if (!mapped || mapped === "targetType" || mapped === "attrezzaturaId") continue;
    out[mapped] = resolveCaptureFieldValue(row);
  }
  if (!out.dataIngresso.trim()) {
    out.dataIngresso = new Date().toLocaleDateString("it-IT");
  }
  return out;
}

function emptyLavorazioniFields(): SchedaLavorazioniFields {
  return { identificazioneMacchina: "", righe: [] };
}

function emptyRicambiFields(): SchedaRicambiFields {
  return { identificazioneMacchina: "", righe: [] };
}

export function buildCaptureSchedeBundle(input: {
  lavorazioneId: string;
  fields: readonly CaptureFieldRow[];
  createdBy: string;
  includeLavorazioni?: boolean;
  includeRicambi?: boolean;
}): LavorazioneSchedeBundle {
  const ingressoFields = mapCaptureFieldsToIngresso(input.fields);
  const user = input.createdBy.trim() || "Document Capture";

  const bundle: LavorazioneSchedeBundle = {
    lavorazioneId: input.lavorazioneId,
    codice: null,
    ingresso: {
      ...newSchedaMeta("ingresso", user),
      tipo: "ingresso",
      campi: ingressoFields,
    },
    lavorazioni: null,
    ricambi: null,
  };

  if (input.includeLavorazioni) {
    bundle.lavorazioni = {
      ...newSchedaMeta("lavorazioni", user),
      tipo: "lavorazioni",
      campi: {
        ...emptyLavorazioniFields(),
        identificazioneMacchina:
          [ingressoFields.marcaAttrezzatura, ingressoFields.modelloAttrezzatura, ingressoFields.matricola]
            .filter(Boolean)
            .join(" ")
            .trim() || ingressoFields.targa,
        righe: [
          {
            id: newRigaId(),
            dataLavorazione: ingressoFields.dataIngresso,
            lavorazioniEffettuate: ingressoFields.descrizioneAnomalia || ingressoFields.noteIntervento,
            addettiAssegnati: ingressoFields.addettoAccettazione
              ? [{ addetto: ingressoFields.addettoAccettazione, oreImpiegate: 0 }]
              : [],
          },
        ],
      },
    };
  }

  if (input.includeRicambi) {
    bundle.ricambi = {
      ...newSchedaMeta("ricambi", user),
      tipo: "ricambi",
      campi: {
        ...emptyRicambiFields(),
        identificazioneMacchina:
          [ingressoFields.marcaAttrezzatura, ingressoFields.modelloAttrezzatura].filter(Boolean).join(" ").trim() ||
          ingressoFields.targa,
        righe: [],
      },
    };
  }

  return bundle;
}
