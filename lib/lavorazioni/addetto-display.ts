import type { CSSProperties } from "react";
import {
  addettoDisplayColorById,
  addettoDisplayColor,
} from "@/lib/lavorazioni/addetto-colors-assign";
import {
  addettoColorKey,
  addettoDisplayName,
  addettoDisplayNameFromNome,
  findAddettoById,
  findAddettoByStoredName,
  type AddettoRecord,
} from "@/lib/lavorazioni/addetto-model";
import { addettoThemeColorFromId } from "@/lib/lavorazioni/lavorazioni-theme";
import { pillStyleFromHex } from "@/lib/lavorazioni/color-utils";
import { LAVORAZIONE_EMPTY_DISPLAY } from "@/lib/lavorazioni/lavorazione-display-helpers";

export type AddettoRef = {
  addettoId?: string | null;

  /**
   * Legacy storico.
   * Non usare per nuove scritture.
   */
  addettoLegacy?: string | null;
};

/** Costruisce ref da campi scheda/preventivo (id-first). */
export function addettoRefFromFields(fields: {
  addettoId?: string | null;
  addettoAccettazioneId?: string | null;
  addetto?: string | null;
  addettoAccettazione?: string | null;
  addettoLegacy?: string | null;
}): AddettoRef {
  const id = (fields.addettoId ?? fields.addettoAccettazioneId)?.trim() || null;
  const legacy =
    fields.addettoLegacy?.trim() ||
    fields.addetto?.trim() ||
    fields.addettoAccettazione?.trim() ||
    null;
  return { addettoId: id, addettoLegacy: id ? null : legacy };
}

export function resolveAddettoRecord(
  records: readonly AddettoRecord[],
  ref: AddettoRef,
): AddettoRecord | null {
  const id = ref.addettoId?.trim();
  if (id) {
    const byId = findAddettoById(records, id);
    if (byId) return byId;
  }
  const legacy = ref.addettoLegacy?.trim();
  if (legacy && legacy !== "—") {
    return findAddettoByStoredName(records, legacy) ?? null;
  }
  return null;
}

export function getAddettoDisplayName(
  records: readonly AddettoRecord[],
  ref: AddettoRef,
): string {
  const rec = resolveAddettoRecord(records, ref);
  if (rec) return addettoDisplayName(rec);
  const legacy = ref.addettoLegacy?.trim();
  if (!legacy || legacy === "—") return "";
  if (records.length) return addettoDisplayNameFromNome(records, legacy);
  return legacy;
}

export function getAddettoDisplayLabel(
  records: readonly AddettoRecord[],
  ref: AddettoRef,
): string {
  const label = getAddettoDisplayName(records, ref);
  return label.trim() || LAVORAZIONE_EMPTY_DISPLAY;
}

export function getAddettoColorKey(
  records: readonly AddettoRecord[],
  ref: AddettoRef,
): string {
  const rec = resolveAddettoRecord(records, ref);
  if (rec) return addettoColorKey(rec);
  const legacy = ref.addettoLegacy?.trim();
  if (legacy) return `legacy:${legacy.trim().toLowerCase()}`;
  const id = ref.addettoId?.trim();
  if (id) return id;
  return "";
}

export function getAddettoPillHex(
  records: readonly AddettoRecord[],
  ref: AddettoRef,
  colorMap: Record<string, string>,
): string {
  const rec = resolveAddettoRecord(records, ref);
  if (rec) {
    const key = addettoColorKey(rec);
    return addettoDisplayColorById(key, colorMap, records);
  }
  const colorKey = getAddettoColorKey(records, ref);
  if (!colorKey) return addettoThemeColorFromId("empty");
  if (colorKey.startsWith("legacy:")) {
    const legacyName = colorKey.slice("legacy:".length);
    return addettoDisplayColor(legacyName, colorMap, records);
  }
  return addettoDisplayColorById(colorKey, colorMap, records);
}

export function getAddettoPillStyle(
  records: readonly AddettoRecord[],
  ref: AddettoRef,
  colorMap: Record<string, string>,
): CSSProperties {
  return pillStyleFromHex(getAddettoPillHex(records, ref, colorMap));
}

/** @deprecated Usare getAddettoColorKey */
export function getAddettoNomeKey(records: readonly AddettoRecord[], ref: AddettoRef): string {
  return getAddettoColorKey(records, ref);
}
