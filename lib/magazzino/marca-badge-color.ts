import type { CSSProperties } from "react";
import { normalizeHex } from "@/lib/lavorazioni/color-utils";
import { readablePillStyleFromHex } from "@/lib/lavorazioni/table-pill-readability";
import type { MagazzinoMasterPrefs } from "@/lib/magazzino/magazzino-master-prefs-storage";
import { normMarcaKey } from "@/lib/magazzino/marca-fornitore-sconto";

export const MAGAZZINO_MARCA_BADGE_GRAY = "#71717a";

export function parseColorByMarca(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const key = normMarcaKey(k);
    if (!key || typeof v !== "string") continue;
    const nh = normalizeHex(v);
    if (nh) out[key] = nh;
  }
  return out;
}

export function getMarcaBadgeColorHex(
  mag: MagazzinoMasterPrefs,
  marcaNome: string,
): string | undefined {
  const key = normMarcaKey(marcaNome);
  if (!key) return undefined;
  return mag.colorByMarca?.[key];
}

export function magazzinoMarcaBadgeStyle(
  marca: string,
  mag?: MagazzinoMasterPrefs | null,
): CSSProperties {
  const configured = mag ? getMarcaBadgeColorHex(mag, marca) : undefined;
  return readablePillStyleFromHex(configured ?? MAGAZZINO_MARCA_BADGE_GRAY);
}

export function setMarcaBadgeColor(
  mag: MagazzinoMasterPrefs,
  marcaNome: string,
  hex: string,
): MagazzinoMasterPrefs {
  const key = normMarcaKey(marcaNome);
  const nh = normalizeHex(hex);
  if (!key || !nh) return mag;
  return {
    ...mag,
    colorByMarca: { ...(mag.colorByMarca ?? {}), [key]: nh },
  };
}

export function removeMarcaBadgeColor(
  mag: MagazzinoMasterPrefs,
  marcaNome: string,
): MagazzinoMasterPrefs {
  const key = normMarcaKey(marcaNome);
  if (!key || !mag.colorByMarca) return mag;
  const next = { ...mag.colorByMarca };
  delete next[key];
  return { ...mag, colorByMarca: Object.keys(next).length ? next : undefined };
}

export function renameMarcaBadgeColor(
  mag: MagazzinoMasterPrefs,
  from: string,
  to: string,
): MagazzinoMasterPrefs {
  const oldKey = normMarcaKey(from);
  const newKey = normMarcaKey(to);
  if (!mag.colorByMarca || !oldKey || !newKey || oldKey === newKey) return mag;
  if (!(oldKey in mag.colorByMarca)) return mag;
  const next = { ...mag.colorByMarca };
  next[newKey] = next[oldKey]!;
  delete next[oldKey];
  return { ...mag, colorByMarca: next };
}
