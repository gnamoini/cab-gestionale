"use client";

import { useMemo } from "react";
import type { FixedListPillOption } from "@/components/gestionale/global-input/global-fixed-list-pill";
import {
  dipendenteDisplayName,
  getActiveDipendentiRecords,
  getAddettiRecords,
  type DipendenteRecord,
} from "@/lib/dipendenti/dipendente-record";
import {
  addettoColorKey,
  addettoDisplayName,
  findAddettoById,
  findAddettoByStoredName,
  sortAddettiRecordsByCognomeNome,
  type AddettoRecord,
} from "@/lib/lavorazioni/addetto-model";
import { addettoDisplayColorById } from "@/lib/lavorazioni/addetto-colors-assign";
import { pillStyleFromHex } from "@/lib/lavorazioni/color-utils";
import { useGlobalOptions } from "@/src/hooks/use-global-options";

export type AddettiPickerMode = "addetti" | "all";

function sortDipendentiByCognomeNome(records: readonly DipendenteRecord[]): DipendenteRecord[] {
  return [...records].sort((a, b) => {
    const c = (a.cognome ?? "").localeCompare(b.cognome ?? "", "it", { sensitivity: "base" });
    if (c !== 0) return c;
    return a.nome.localeCompare(b.nome, "it", { sensitivity: "base" });
  });
}

function dipendentePickerRecords(
  dipendentiRecords: readonly DipendenteRecord[],
  mode: AddettiPickerMode,
): readonly DipendenteRecord[] {
  return mode === "all" ? getActiveDipendentiRecords(dipendentiRecords) : getAddettiRecords(dipendentiRecords);
}

export function useAddettiPickerOptions(storedId?: string | null, mode: AddettiPickerMode = "addetti") {
  const global = useGlobalOptions();
  const dipendentiRecords = global.dipendenti.dipendentiRecords;
  const colorMap = global.lavorazioni.addettoColors;
  const records = dipendentePickerRecords(dipendentiRecords, mode);

  return useMemo(() => {
    const sorted = sortDipendentiByCognomeNome(records);
    const addettiForColor = global.lavorazioni.addettiRecords;
    const items: FixedListPillOption[] = sorted.map((rec) => {
      const key = addettoColorKey(rec);
      return {
        value: rec.id,
        label: dipendenteDisplayName(rec),
        pillStyle: pillStyleFromHex(addettoDisplayColorById(key, colorMap, addettiForColor)),
      };
    });
    const sid = storedId?.trim();
    if (sid && !items.some((o) => o.value === sid)) {
      const ghostDip = dipendentiRecords.find((r) => r.id === sid);
      const ghostAddetto =
        findAddettoById(addettiForColor, sid) ?? findAddettoByStoredName(addettiForColor, sid);
      const label = ghostDip
        ? dipendenteDisplayName(ghostDip)
        : ghostAddetto
          ? addettoDisplayName(ghostAddetto)
          : sid;
      items.unshift({
        value: sid,
        label,
        pillStyle: pillStyleFromHex(addettoDisplayColorById(sid, colorMap, addettiForColor)),
      });
    }
    return { options: items, records: addettiForColor, colorMap, dipendentiRecords: records };
  }, [records, colorMap, storedId, dipendentiRecords, global.lavorazioni.addettiRecords]);
}

export function buildAddettoPickerOptionsFromRecords(
  records: readonly AddettoRecord[],
  colorMap: Record<string, string>,
  storedId?: string | null,
): FixedListPillOption[] {
  const sorted = sortAddettiRecordsByCognomeNome(records);
  const items: FixedListPillOption[] = sorted.map((rec) => {
    const key = addettoColorKey(rec);
    return {
      value: rec.id,
      label: addettoDisplayName(rec),
      pillStyle: pillStyleFromHex(addettoDisplayColorById(key, colorMap, records)),
    };
  });
  const sid = storedId?.trim();
  if (sid && !items.some((o) => o.value === sid)) {
    const ghost = findAddettoById(records, sid) ?? findAddettoByStoredName(records, sid);
    items.unshift({
      value: sid,
      label: ghost ? addettoDisplayName(ghost) : sid,
      pillStyle: pillStyleFromHex(addettoDisplayColorById(sid, colorMap, records)),
    });
  }
  return items;
}
