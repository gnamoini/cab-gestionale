import { normalizeLivelloCarburanteStored } from "@/lib/schede/livello-carburante-value";
import { clampText, clampTextTrimmed, TEXT_EXTRA, TEXT_LONG, TEXT_MEDIUM, TEXT_SHORT } from "@/lib/validation/text-field-limits";
import type { BunderCommercialDocument, BunderProductRiga } from "@/lib/bunder/types";
import type {
  LavorazioneSchedeBundle,
  SchedaIngressoFields,
  SchedaLavorazioniDoc,
  SchedaRicambiDoc,
} from "@/types/schede";

function clampField(value: string, max: number): string {
  return clampText(String(value ?? ""), max);
}

function clampIngressoCampi(campi: SchedaIngressoFields): SchedaIngressoFields {
  const shortKeys: (keyof SchedaIngressoFields)[] = [
    "cliente",
    "cantiere",
    "utilizzatore",
    "tipoAttrezzatura",
    "marcaAttrezzatura",
    "modelloAttrezzatura",
    "matricola",
    "nScuderia",
    "tipoTelaio",
    "marcaTelaio",
    "modelloTelaio",
    "targa",
    "addettoAccettazione",
    "richiedente",
  ];
  const out = { ...campi };
  for (const key of shortKeys) {
    out[key] = clampTextTrimmed(out[key], TEXT_SHORT);
  }
  out.livelloCarburante = normalizeLivelloCarburanteStored(out.livelloCarburante);
  out.descrizioneAnomalia = clampField(out.descrizioneAnomalia, TEXT_EXTRA);
  out.noteIntervento = clampField(out.noteIntervento, TEXT_LONG);
  out.oreLavoro = clampField(out.oreLavoro, TEXT_SHORT);
  out.km = clampField(out.km, TEXT_SHORT);
  out.dataIngresso = clampField(out.dataIngresso, TEXT_SHORT);
  return out;
}

function clampLavorazioniDoc(doc: SchedaLavorazioniDoc): SchedaLavorazioniDoc {
  return {
    ...doc,
    campi: {
      identificazioneMacchina: clampTextTrimmed(doc.campi.identificazioneMacchina, TEXT_SHORT),
      righe: doc.campi.righe.map((r) => ({
        ...r,
        dataLavorazione: clampField(r.dataLavorazione, TEXT_SHORT),
        lavorazioniEffettuate: clampField(r.lavorazioniEffettuate, TEXT_EXTRA),
        addettiAssegnati: r.addettiAssegnati?.map((a) => ({
          ...a,
          addetto: clampTextTrimmed(a.addetto, TEXT_SHORT),
        })),
      })),
    },
  };
}

function clampRicambiDoc(doc: SchedaRicambiDoc): SchedaRicambiDoc {
  return {
    ...doc,
    campi: {
      identificazioneMacchina: clampTextTrimmed(doc.campi.identificazioneMacchina, TEXT_SHORT),
      righe: doc.campi.righe.map((r) => ({
        ...r,
        ricambioNome: clampTextTrimmed(r.ricambioNome, TEXT_SHORT),
        codice: clampTextTrimmed(r.codice, TEXT_SHORT),
        addetto: clampTextTrimmed(r.addetto, TEXT_SHORT),
        dataUtilizzo: clampField(r.dataUtilizzo, TEXT_SHORT),
      })),
    },
  };
}

export function clampSchedeBundle(bundle: LavorazioneSchedeBundle): LavorazioneSchedeBundle {
  return {
    ...bundle,
    ingresso: bundle.ingresso
      ? { ...bundle.ingresso, campi: clampIngressoCampi(bundle.ingresso.campi) }
      : bundle.ingresso,
    lavorazioni: bundle.lavorazioni
      ? clampLavorazioniDoc(bundle.lavorazioni)
      : bundle.lavorazioni,
    ricambi: bundle.ricambi ? clampRicambiDoc(bundle.ricambi) : bundle.ricambi,
  };
}

function clampBunderRiga(r: BunderProductRiga): BunderProductRiga {
  return {
    ...r,
    codice: clampTextTrimmed(r.codice, TEXT_SHORT),
    nome: clampTextTrimmed(r.nome, TEXT_SHORT),
    descrizioneTecnica: clampField(r.descrizioneTecnica, TEXT_EXTRA),
  };
}

export function clampBunderDocument(doc: BunderCommercialDocument): BunderCommercialDocument {
  return {
    ...doc,
    numeroProgressivo: clampTextTrimmed(doc.numeroProgressivo, TEXT_SHORT),
    luogo: clampTextTrimmed(doc.luogo, TEXT_SHORT),
    aziendaDestinatario: clampTextTrimmed(doc.aziendaDestinatario, TEXT_SHORT),
    indirizzo: clampField(doc.indirizzo, TEXT_LONG),
    cap: clampField(doc.cap, TEXT_SHORT),
    citta: clampTextTrimmed(doc.citta, TEXT_SHORT),
    referente: clampTextTrimmed(doc.referente, TEXT_SHORT),
    oggetto: clampField(doc.oggetto, TEXT_LONG),
    settore: clampTextTrimmed(doc.settore, TEXT_SHORT),
    intro: clampField(doc.intro, TEXT_EXTRA),
    clausoleLegali: clampField(doc.clausoleLegali, TEXT_EXTRA),
    chiusura: clampField(doc.chiusura, TEXT_LONG),
    noteFirma: clampField(doc.noteFirma, TEXT_LONG),
    riferimentoInterno: clampTextTrimmed(doc.riferimentoInterno, TEXT_SHORT),
    righe: doc.righe.map(clampBunderRiga),
    condizioni: {
      iva: clampField(doc.condizioni.iva, TEXT_MEDIUM),
      resa: clampField(doc.condizioni.resa, TEXT_MEDIUM),
      trasporto: clampField(doc.condizioni.trasporto, TEXT_MEDIUM),
      assemblaggio: clampField(doc.condizioni.assemblaggio, TEXT_MEDIUM),
      consegna: clampField(doc.condizioni.consegna, TEXT_MEDIUM),
      pagamento: clampField(doc.condizioni.pagamento, TEXT_MEDIUM),
      garanzia: clampField(doc.condizioni.garanzia, TEXT_MEDIUM),
      validitaOfferta: clampField(doc.condizioni.validitaOfferta, TEXT_MEDIUM),
    },
  };
}