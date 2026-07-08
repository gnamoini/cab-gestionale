import type { SchedaIngressoStringKey } from "@/lib/schede/scheda-ingresso-typed-fields";
import { normalizeLivelloCarburanteStored } from "@/lib/schede/livello-carburante-value";
import { clampText, clampTextTrimmed, TEXT_EXTRA, TEXT_LONG, TEXT_MEDIUM, TEXT_SHORT } from "@/lib/validation/text-field-limits";
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
  const shortKeys: SchedaIngressoStringKey[] = [
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
    "vin",
    "targa",
    "addettoAccettazione",
    "richiedente",
    "richiedenteTelefono",
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