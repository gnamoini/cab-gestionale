import {
  formatIdentificazioneMezzoLine,
  identificazionePartsFromLavorazione,
} from "@/lib/mezzi/identificazione-mezzo";
import { lavorazioneMatchesMezzo } from "@/lib/mezzi/lavorazioni-sync";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type {
  SchedaIngressoFields,
  SchedaLavorazioniFields,
  SchedaRicambiFields,
} from "@/types/schede";

function isoDateOnly(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "";
  }
}

export function findMezzoForLavorazione(
  mezzi: MezzoGestito[],
  lav: LavorazioneAttiva | LavorazioneArchiviata,
): MezzoGestito | null {
  return mezzi.find((m) => lavorazioneMatchesMezzo(m, lav)) ?? null;
}

/** Edit hub: FK `mezzo_id` vince sul fuzzy match display (lavorazioneMatchesMezzo). */
export function resolveMezzoForLavorazioneEdit(
  mezzi: readonly MezzoGestito[],
  lav: LavorazioneAttiva | LavorazioneArchiviata,
  mezzoIdFk?: string | null,
): MezzoGestito | null {
  const fk = mezzoIdFk?.trim();
  if (fk) {
    const byFk = mezzi.find((m) => m.id === fk);
    if (byFk) return byFk;
  }
  const legacyFk = "mezzoId" in lav ? lav.mezzoId?.trim() : "";
  if (legacyFk) {
    const byLegacy = mezzi.find((m) => m.id === legacyFk);
    if (byLegacy) return byLegacy;
  }
  return findMezzoForLavorazione([...mezzi], lav);
}

export function buildIdentificazioneMacchina(
  lav: LavorazioneAttiva | LavorazioneArchiviata,
  mezzo: MezzoGestito | null,
): string {
  return formatIdentificazioneMezzoLine(identificazionePartsFromLavorazione(lav, mezzo));
}

export function buildSchedaIngressoFieldsFromContext(
  lav: LavorazioneAttiva | LavorazioneArchiviata,
  mezzo: MezzoGestito | null,
  addettiDefault: string,
): SchedaIngressoFields {
  const ingIso = lav.dataIngresso;
  return {
    dataIngresso: isoDateOnly(ingIso) || new Date().toLocaleDateString("it-IT"),
    cliente: lav.cliente ?? "",
    cantiere: lav.utilizzatore?.trim() ? lav.utilizzatore : "",
    utilizzatore: lav.utilizzatore ?? "",
    tipoAttrezzatura: mezzo?.tipoAttrezzatura ?? "",
    marcaAttrezzatura: mezzo?.marca ?? "",
    modelloAttrezzatura: mezzo?.modello ?? "",
    matricola: lav.matricola ?? mezzo?.matricola ?? "",
    nScuderia: "",
    oreLavoro: mezzo != null ? String(mezzo.oreKm ?? "") : "",
    tipoTelaio: "",
    marcaTelaio: "",
    modelloTelaio: "",
    vin: mezzo?.vin ?? "",
    targa: lav.targa ?? mezzo?.targa ?? "",
    km:
      mezzo != null
        ? mezzo.km != null && String(mezzo.km).trim() !== ""
          ? String(mezzo.km)
          : mezzo.oreKm != null
            ? String(mezzo.oreKm)
            : ""
        : "",
    descrizioneAnomalia: lav.note?.trim() ?? "",
    livelloCarburante: "",
    addettoAccettazione: lav.addetto?.trim() || addettiDefault,
    richiedente: "",
    richiedenteTelefono: "",
  };
}

export function buildSchedaLavorazioniFieldsFromContext(
  lav: LavorazioneAttiva | LavorazioneArchiviata,
  mezzo: MezzoGestito | null,
): SchedaLavorazioniFields {
  const ident = buildIdentificazioneMacchina(lav, mezzo);
  return {
    identificazioneMacchina: ident,
    righe: [],
  };
}

export function buildSchedaRicambiFieldsFromContext(
  lav: LavorazioneAttiva | LavorazioneArchiviata,
  mezzo: MezzoGestito | null,
): SchedaRicambiFields {
  return {
    identificazioneMacchina: buildIdentificazioneMacchina(lav, mezzo),
    righe: [],
  };
}
