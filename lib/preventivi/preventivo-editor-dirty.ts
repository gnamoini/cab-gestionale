import {
  defaultTargetTypeForProfilo,
  type OfficinaProfiloOperativo,
} from "@/lib/officina/officina-profilo-operativo";
import { ensurePreventivoStruttura } from "@/lib/preventivi/preventivi-struttura";
import { calcolaTotaliPreventivo } from "@/lib/preventivi/preventivi-totals";
import type { PreventivoRecord } from "@/lib/preventivi/types";

/** Allinea defaults editor (targetType scheda ingresso, struttura righe) prima del confronto dirty. */
export function normalizePreventivoEditorRecord(
  record: PreventivoRecord,
  profilo: OfficinaProfiloOperativo,
): PreventivoRecord {
  const targetType = record.targetType ?? defaultTargetTypeForProfilo(profilo);
  const strutturato = ensurePreventivoStruttura({
    ...record,
    targetType,
    attrezzaturaId: record.attrezzaturaId ?? "",
  });
  return { ...strutturato, ...calcolaTotaliPreventivo(strutturato) };
}

/** Snapshot stabile — esclude timestamp volatile. */
export function preventivoEditorSnapshot(record: PreventivoRecord): string {
  const { aggiornatoAt: _aggiornatoAt, ...rest } = record;
  return JSON.stringify(rest);
}

export function isPreventivoEditorDirty(
  current: PreventivoRecord,
  baseline: PreventivoRecord,
): boolean {
  return preventivoEditorSnapshot(current) !== preventivoEditorSnapshot(baseline);
}
