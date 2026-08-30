import {


  type AddettoRecord,
} from "@/lib/lavorazioni/addetto-model";
import {
  addettoDisplayColorById,
} from "@/lib/lavorazioni/addetto-colors-assign";
import type { FixedListPillOption } from "@/components/gestionale/global-input/global-fixed-list-pill";
import { prioritaLabel } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { pillStyleFromHex } from "@/lib/lavorazioni/color-utils";
import { prioritaDisplayColor, statoDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import type { PrioritaLav } from "@/lib/lavorazioni/types";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import { statoLavorazioneLabel } from "@/lib/lavorazioni/stati-dynamic";
import {
  prioritaPillShellStyle,
  statoPillShellStyle,
} from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import type { GlobalOptionsSlice } from "@/src/hooks/use-global-options";
import { buildAddettoPickerOptionsFromRecords } from "@/src/hooks/gestionale/use-addetti-picker-options";

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

/** @deprecated Usare buildAddettoPickerOptionsFromRecords con storedId */
export function buildAddettoTablePillOptions(
  storedNome: string,
  addetti: string[],
  addettoColors: Record<string, string>,
  addettiRecords?: readonly AddettoRecord[],
): FixedListPillOption[] {
  if (addettiRecords?.length) {
    const match = addettiRecords.find((r) => r.nome === storedNome);
    return buildAddettoPickerOptionsFromRecords(addettiRecords, addettoColors, match?.id ?? null);
  }
  const displayLabel = (nome: string) => nome;
  const inList = addetti.includes(storedNome);
  const items: FixedListPillOption[] = [];
  if (!inList && storedNome && storedNome !== "—") {
    items.push({
      value: storedNome,
      label: displayLabel(storedNome),
      pillStyle: pillStyleFromHex(addettoDisplayColorById(storedNome, addettoColors, addettiRecords)),
    });
  }
  for (const a of addetti) {
    items.push({
      value: a,
      label: displayLabel(a),
      pillStyle: pillStyleFromHex(addettoDisplayColorById(a, addettoColors, addettiRecords)),
    });
  }
  return items;
}

export function buildAddettoTablePillOptionsById(
  storedId: string | null,
  addettoColors: Record<string, string>,
  addettiRecords: readonly AddettoRecord[],
): FixedListPillOption[] {
  return buildAddettoPickerOptionsFromRecords(addettiRecords, addettoColors, storedId);
}

export function buildLavorazioniPillOptionsFromGlobal(global: GlobalOptionsSlice) {
  return {
    stati: (statiIds: readonly { id: string }[]) =>
      buildStatoTablePillOptions(statiIds, global.lavorazioni.stati),
    priorita: (prioritaList: readonly string[]) =>
      buildPrioritaTablePillOptions(prioritaList, global.lavorazioni.prioritaColors),
    addetto: (storedId: string | null) =>
      buildAddettoTablePillOptionsById(storedId, global.lavorazioni.addettoColors, global.lavorazioni.addettiRecords),
    /** @deprecated nome legacy */
    addettoByNome: (storedNome: string) =>
      buildAddettoTablePillOptions(
        storedNome,
        global.lavorazioni.addetti,
        global.lavorazioni.addettoColors,
        global.lavorazioni.addettiRecords,
      ),
  };
}
