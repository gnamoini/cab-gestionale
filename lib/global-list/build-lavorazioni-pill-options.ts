import { prioritaLabel } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import type { FixedListPillOption } from "@/components/gestionale/global-input/global-fixed-list-pill";
import { addettoDisplayColor } from "@/lib/lavorazioni/addetto-colors-assign";
import { prioritaDisplayColor, statoDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import { readablePillStyleFromHex } from "@/lib/lavorazioni/table-pill-readability";
import type { PrioritaLav } from "@/lib/lavorazioni/types";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import { statoLavorazioneLabel } from "@/lib/lavorazioni/stati-dynamic";
import type { GlobalOptionsSlice } from "@/src/hooks/use-global-options";

export function buildStatoTablePillOptions(
  statiIds: readonly { id: string }[],
  statiOpts: StatoLavorazioneConfig[],
): FixedListPillOption[] {
  return statiIds.map((s) => ({
    value: s.id,
    label: statoLavorazioneLabel(s.id, statiOpts),
    pillStyle: readablePillStyleFromHex(statoDisplayColor(s.id, statiOpts)),
  }));
}

export function buildPrioritaTablePillOptions(
  prioritaList: readonly string[],
  prioritaColors: Record<string, string> | null,
): FixedListPillOption[] {
  return prioritaList.map((p) => ({
    value: p,
    label: prioritaLabel(p),
    pillStyle: readablePillStyleFromHex(
      p === "urgente" ? "#b91c1c" : prioritaDisplayColor(p as PrioritaLav, prioritaColors),
    ),
  }));
}

export function buildAddettoTablePillOptions(
  label: string,
  addetti: string[],
  addettoColors: Record<string, string>,
): FixedListPillOption[] {
  const inList = addetti.includes(label);
  const items: FixedListPillOption[] = [{ value: "", label: "—" }];
  if (!inList && label !== "—") {
    items.push({
      value: label,
      label,
      pillStyle: readablePillStyleFromHex(addettoColors[label]),
    });
  }
  for (const a of addetti) {
    items.push({
      value: a,
      label: a,
      pillStyle: readablePillStyleFromHex(addettoDisplayColor(a, addettoColors)),
    });
  }
  return items;
}

export function buildLavorazioniPillOptionsFromGlobal(global: GlobalOptionsSlice) {
  return {
    stati: (statiIds: readonly { id: string }[]) =>
      buildStatoTablePillOptions(statiIds, global.lavorazioni.stati),
    priorita: (prioritaList: readonly string[]) =>
      buildPrioritaTablePillOptions(prioritaList, global.lavorazioni.prioritaColors),
    addetto: (label: string) =>
      buildAddettoTablePillOptions(label, global.lavorazioni.addetti, global.lavorazioni.addettoColors),
  };
}
