"use client";

import { useMemo } from "react";
import type { FixedListPillOption } from "@/components/gestionale/global-input/global-fixed-list-pill";
import {
  addettoColorKey,
  addettoDisplayName,
  findAddettoById,
  findAddettoByStoredName,
  type AddettoRecord,
} from "@/lib/lavorazioni/addetto-model";
import { addettoDisplayColorById } from "@/lib/lavorazioni/addetto-colors-assign";
import { pillStyleFromHex } from "@/lib/lavorazioni/color-utils";
import { sortAddettiRecordsByCognomeNome } from "@/lib/lavorazioni/addetto-model";
import { useGlobalOptions } from "@/src/hooks/use-global-options";

export function useAddettiPickerOptions(storedId?: string | null) {
  const global = useGlobalOptions();
  const records = global.lavorazioni.addettiRecords;
  const colorMap = global.lavorazioni.addettoColors;

  return useMemo(() => {
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
    return { options: items, records, colorMap };
  }, [records, colorMap, storedId]);
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
