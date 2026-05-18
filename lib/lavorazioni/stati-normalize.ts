import { normalizeHex } from "@/lib/lavorazioni/color-utils";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import {
  DEFAULT_STATI_LAVORAZIONI_DB,
  migrateStatoConfigId,
} from "@/src/shared/selectors";

/** Normalizza elenco stati da impostazioni (id DB, colori #rrggbb validi). */
export function normalizeStatiList(stati: StatoLavorazioneConfig[]): StatoLavorazioneConfig[] {
  const defMap = new Map(DEFAULT_STATI_LAVORAZIONI_DB.map((s) => [s.id, s]));
  return stati.map((s) => {
    const id = migrateStatoConfigId(s.id);
    const label = s.label || defMap.get(id)?.label || defMap.get(s.id)?.label || s.label || id;
    const nh = normalizeHex(s.color);
    if (nh) return { id, label, color: nh };
    return { id, label };
  });
}
