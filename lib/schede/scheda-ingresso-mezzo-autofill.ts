import type { MezzoGestito } from "@/lib/mezzi/types";
import type { SchedaIngressoFields } from "@/types/schede";

function blankMezzoField(v: string | undefined, emptyAliases: string[] = ["—"]): string {
  const t = v?.trim();
  if (!t) return "";
  const lower = t.toLowerCase();
  if (emptyAliases.some((a) => a.toLowerCase() === lower)) return "";
  return t;
}

/** Campi scheda ingresso derivati da anagrafica mezzo (senza data ingresso). */
export function buildSchedaIngressoFieldsFromMezzo(mezzo: MezzoGestito): SchedaIngressoFields {
  return {
    dataIngresso: "",
    cliente: blankMezzoField(mezzo.cliente),
    cantiere: blankMezzoField(mezzo.cantiere),
    utilizzatore: blankMezzoField(mezzo.utilizzatore),
    tipoAttrezzatura: blankMezzoField(mezzo.tipoAttrezzatura),
    marcaAttrezzatura: blankMezzoField(mezzo.marca),
    modelloAttrezzatura: blankMezzoField(mezzo.modello),
    matricola: blankMezzoField(mezzo.matricola, ["—", "Non assegnata", "non assegnata"]),
    nScuderia: mezzo.numeroScuderia?.trim() ?? "",
    oreLavoro: "",
    tipoTelaio: blankMezzoField(mezzo.tipoTelaio),
    marcaTelaio: blankMezzoField(mezzo.marcaTelaio),
    modelloTelaio: blankMezzoField(mezzo.modelloTelaio),
    vin: blankMezzoField(mezzo.vin),
    targa: blankMezzoField(mezzo.targa),
    km: "",
    descrizioneAnomalia: "",
    livelloCarburante: "",
    addettoAccettazione: "",
    richiedente: "",
    richiedenteTelefono: "",
  };
}
