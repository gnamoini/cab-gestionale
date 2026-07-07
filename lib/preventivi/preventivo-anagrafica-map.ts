import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import { buildSchedaIngressoFieldsFromMezzo } from "@/lib/schede/scheda-ingresso-mezzo-autofill";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { normalizeLivelloCarburanteStored } from "@/lib/schede/livello-carburante-value";
import {
  resolveInterventoDisplayForSurface,
  schedaIngressoFieldsFromDisplay,
} from "@/lib/domain/intervento-context/resolve-intervento-display-for-surface";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneSchedeStore, SchedaIngressoFields } from "@/types/schede";

export type PreventivoAnagraficaPatch = Pick<
  PreventivoRecord,
  | "cliente"
  | "cantiere"
  | "utilizzatore"
  | "macchinaRiassunto"
  | "targa"
  | "matricola"
  | "nScuderia"
  | "marcaAttrezzatura"
  | "modelloAttrezzatura"
  | "tipoAttrezzatura"
  | "oreLavoro"
  | "tipoTelaio"
  | "marcaTelaio"
  | "modelloTelaio"
  | "km"
  | "livelloCarburante"
  | "richiedente"
>;

function trimOrEmpty(v: string | undefined | null): string {
  return String(v ?? "").trim();
}

function pickNonEmpty(...values: (string | undefined | null)[]): string {
  for (const v of values) {
    const t = trimOrEmpty(v);
    if (t) return t;
  }
  return "";
}

export function syncMacchinaRiassunto(
  p: Pick<PreventivoAnagraficaPatch, "marcaAttrezzatura" | "modelloAttrezzatura" | "macchinaRiassunto">,
): string {
  const fromMarcaModello = [p.marcaAttrezzatura, p.modelloAttrezzatura].filter(Boolean).join(" ").trim();
  if (fromMarcaModello) return fromMarcaModello;
  return trimOrEmpty(p.macchinaRiassunto);
}

/** Anagrafica preventivo via read model canonico (scheda > lav > mezzo). */
export function anagraficaFromInterventoContext(
  row: LavorazioneListRow,
  schedeStore?: LavorazioneSchedeStore,
): PreventivoAnagraficaPatch {
  const display = resolveInterventoDisplayForSurface("preventivo", {
    lavorazioneRow: row,
    schedeStore,
  });
  return anagraficaFromSchedaIngresso(schedaIngressoFieldsFromDisplay(display));
}

export function anagraficaFromSchedaIngresso(ing: Partial<SchedaIngressoFields>): PreventivoAnagraficaPatch {
  const patch: PreventivoAnagraficaPatch = {
    cliente: trimOrEmpty(ing.cliente),
    cantiere: trimOrEmpty(ing.cantiere),
    utilizzatore: trimOrEmpty(ing.utilizzatore),
    macchinaRiassunto: "",
    targa: trimOrEmpty(ing.targa),
    matricola: trimOrEmpty(ing.matricola),
    nScuderia: trimOrEmpty(ing.nScuderia),
    marcaAttrezzatura: trimOrEmpty(ing.marcaAttrezzatura),
    modelloAttrezzatura: trimOrEmpty(ing.modelloAttrezzatura),
    tipoAttrezzatura: trimOrEmpty(ing.tipoAttrezzatura),
    oreLavoro: trimOrEmpty(ing.oreLavoro),
    tipoTelaio: trimOrEmpty(ing.tipoTelaio),
    marcaTelaio: trimOrEmpty(ing.marcaTelaio),
    modelloTelaio: trimOrEmpty(ing.modelloTelaio),
    km: trimOrEmpty(ing.km),
    livelloCarburante: normalizeLivelloCarburanteStored(ing.livelloCarburante),
    richiedente: trimOrEmpty(ing.richiedente),
  };
  patch.macchinaRiassunto = syncMacchinaRiassunto(patch);
  return patch;
}

export function anagraficaFromMezzo(mezzo: MezzoGestito): PreventivoAnagraficaPatch {
  return anagraficaFromSchedaIngresso(buildSchedaIngressoFieldsFromMezzo(mezzo));
}

export function anagraficaFromLavorazione(
  lav: LavorazioneAttiva | LavorazioneArchiviata,
  mezzo?: MezzoGestito | null,
): PreventivoAnagraficaPatch {
  const patch: PreventivoAnagraficaPatch = {
    cliente: trimOrEmpty(lav.cliente),
    cantiere: pickNonEmpty(lav.cantiere, mezzo?.cantiere),
    utilizzatore: trimOrEmpty(lav.utilizzatore),
    macchinaRiassunto: trimOrEmpty(lav.macchina),
    targa: trimOrEmpty(lav.targa),
    matricola: trimOrEmpty(lav.matricola),
    nScuderia: pickNonEmpty(lav.nScuderia, mezzo?.numeroScuderia),
    marcaAttrezzatura: pickNonEmpty(mezzo?.marca),
    modelloAttrezzatura: pickNonEmpty(mezzo?.modello),
    tipoAttrezzatura: pickNonEmpty(mezzo?.tipoAttrezzatura),
    oreLavoro: mezzo?.oreKm != null && mezzo.oreKm > 0 ? String(mezzo.oreKm) : "",
    tipoTelaio: pickNonEmpty(mezzo?.tipoTelaio),
    marcaTelaio: pickNonEmpty(mezzo?.marcaTelaio),
    modelloTelaio: pickNonEmpty(mezzo?.modelloTelaio),
    km:
      mezzo?.km != null
        ? String(mezzo.km)
        : mezzo?.oreKm != null && mezzo.oreKm > 0
          ? String(mezzo.oreKm)
          : "",
    livelloCarburante: "",
    richiedente: "",
  };
  patch.macchinaRiassunto = syncMacchinaRiassunto(patch);
  return patch;
}

function mergePatch(base: PreventivoAnagraficaPatch, overlay: Partial<PreventivoAnagraficaPatch>): PreventivoAnagraficaPatch {
  const next: PreventivoAnagraficaPatch = { ...base };
  for (const key of Object.keys(overlay) as (keyof PreventivoAnagraficaPatch)[]) {
    const v = trimOrEmpty(overlay[key]);
    if (v) next[key] = v;
  }
  next.macchinaRiassunto = syncMacchinaRiassunto(next);
  return next;
}

/**
 * Merge priorità: ingresso > mezzo > lavorazione (ultimo argomento = priorità più bassa).
 * @deprecated Usare `anagraficaFromInterventoContext(lavorazioneRow, schedeStore)` per export da lavorazione.
 * Legacy merge manuale — solo test di regressione.
 */
export function mergeAnagraficaPreventivo(
  ingresso: Partial<SchedaIngressoFields> | null | undefined,
  mezzo: MezzoGestito | null | undefined,
  lav: LavorazioneAttiva | LavorazioneArchiviata | null | undefined,
): PreventivoAnagraficaPatch {
  let merged: PreventivoAnagraficaPatch = {
    cliente: "",
    cantiere: "",
    utilizzatore: "",
    macchinaRiassunto: "",
    targa: "",
    matricola: "",
    nScuderia: "",
    marcaAttrezzatura: "",
    modelloAttrezzatura: "",
    tipoAttrezzatura: "",
    oreLavoro: "",
    tipoTelaio: "",
    marcaTelaio: "",
    modelloTelaio: "",
    km: "",
    livelloCarburante: "",
    richiedente: "",
  };
  if (lav) merged = mergePatch(merged, anagraficaFromLavorazione(lav, mezzo));
  if (mezzo) merged = mergePatch(merged, anagraficaFromMezzo(mezzo));
  if (ingresso) merged = mergePatch(merged, anagraficaFromSchedaIngresso(ingresso));
  return merged;
}

export function preventivoToSchedaIngressoSlice(p: PreventivoRecord): SchedaIngressoFields {
  return {
    targetType: p.targetType,
    attrezzaturaId: p.attrezzaturaId ?? undefined,
    dataIngresso: "",
    cliente: p.cliente,
    cantiere: p.cantiere,
    utilizzatore: p.utilizzatore,
    tipoAttrezzatura: p.tipoAttrezzatura,
    marcaAttrezzatura: p.marcaAttrezzatura,
    modelloAttrezzatura: p.modelloAttrezzatura,
    matricola: p.matricola,
    nScuderia: p.nScuderia,
    oreLavoro: p.oreLavoro,
    tipoTelaio: p.tipoTelaio,
    marcaTelaio: p.marcaTelaio,
    modelloTelaio: p.modelloTelaio,
    vin: "",
    targa: p.targa,
    km: p.km,
    descrizioneAnomalia: "",
    livelloCarburante: p.livelloCarburante,
    addettoAccettazione: "",
    richiedente: p.richiedente,
    noteIntervento: "",
  };
}

export function schedaIngressoSliceToPreventivoPatch(slice: Partial<SchedaIngressoFields>): Partial<PreventivoRecord> {
  const anag = anagraficaFromSchedaIngresso(slice);
  return {
    ...anag,
    ...(slice.targetType !== undefined ? { targetType: slice.targetType } : {}),
    ...(slice.attrezzaturaId !== undefined ? { attrezzaturaId: slice.attrezzaturaId } : {}),
  };
}

export function applyAnagraficaPatchToPreventivo(
  record: PreventivoRecord,
  patch: Partial<PreventivoAnagraficaPatch> &
    Partial<Pick<PreventivoRecord, "targetType" | "attrezzaturaId">>,
): PreventivoRecord {
  const { targetType, attrezzaturaId, ...anagPatch } = patch;
  const merged = mergePatch(
    {
      cliente: record.cliente,
      cantiere: record.cantiere,
      utilizzatore: record.utilizzatore,
      macchinaRiassunto: record.macchinaRiassunto,
      targa: record.targa,
      matricola: record.matricola,
      nScuderia: record.nScuderia,
      marcaAttrezzatura: record.marcaAttrezzatura,
      modelloAttrezzatura: record.modelloAttrezzatura,
      tipoAttrezzatura: record.tipoAttrezzatura,
      oreLavoro: record.oreLavoro,
      tipoTelaio: record.tipoTelaio,
      marcaTelaio: record.marcaTelaio,
      modelloTelaio: record.modelloTelaio,
      km: record.km,
      livelloCarburante: record.livelloCarburante,
      richiedente: record.richiedente,
    },
    anagPatch,
  );
  return {
    ...record,
    ...merged,
    ...(targetType !== undefined ? { targetType } : {}),
    ...(attrezzaturaId !== undefined ? { attrezzaturaId } : {}),
  };
}
