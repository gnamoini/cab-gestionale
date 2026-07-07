import {
  addettoPillShellStyleForName,
  prioritaLabel,
  prioritaPillShellStyle,
  statoPillShellStyle,
} from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import type { FixedListPillOption } from "@/components/gestionale/global-input/global-fixed-list-pill";
import { prioritaDisplayColor, statoDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import type { PrioritaLav } from "@/lib/lavorazioni/types";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import { statoLavorazioneLabel } from "@/lib/lavorazioni/stati-dynamic";
import { addettoDisplayNameFromNome, type AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import type { GlobalOptionsSlice } from "@/src/hooks/use-global-options";

export function buildStatoTablePillOptions(
  statiIds: readonly { id: string }[],
  statiOpts: StatoLavorazioneConfig[],
): FixedListPillOption[] {
  return statiIds.map((s) => ({
    value: s.id,
    label: statoLavorazioneLabel(s.id, statiOpts),
    pillStyle: statoPillShellStyle(statoDisplayColor(s.id, statiOpts)),
  }));
}

export function buildPrioritaTablePillOptions(
  prioritaList: readonly string[],
  prioritaColors: Record<string, string> | null,
): FixedListPillOption[] {
  return prioritaList.map((p) => ({
    value: p,
    label: prioritaLabel(p),
    pillStyle: prioritaPillShellStyle(
      p === "urgente" ? "#b91c1c" : prioritaDisplayColor(p as PrioritaLav, prioritaColors),
    ),
  }));
}

export function buildAddettoTablePillOptions(
  storedNome: string,
  addetti: string[],
  addettoColors: Record<string, string>,
  addettiRecords?: readonly AddettoRecord[],
): FixedListPillOption[] {
  const displayLabel = (nome: string) =>
    addettiRecords?.length ? addettoDisplayNameFromNome(addettiRecords, nome) : nome;
  const inList = addetti.includes(storedNome);
  const items: FixedListPillOption[] = [];
  if (!inList && storedNome && storedNome !== "—") {
    items.push({
      value: storedNome,
      label: displayLabel(storedNome),
      pillStyle: addettoPillShellStyleForName(storedNome, addettoColors),
    });
  }
  for (const a of addetti) {
    items.push({
      value: a,
      label: displayLabel(a),
      pillStyle: addettoPillShellStyleForName(a, addettoColors),
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
    addetto: (storedNome: string) =>
      buildAddettoTablePillOptions(
        storedNome,
        global.lavorazioni.addetti,
        global.lavorazioni.addettoColors,
        global.lavorazioni.addettiRecords,
      ),
  };
}
