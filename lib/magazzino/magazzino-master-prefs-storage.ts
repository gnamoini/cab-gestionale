/** Anagrafiche magazzino (liste guidate) persistite in locale — condivise tra Magazzino e Impostazioni sistema. */

import { parseProduttoriByFornitore } from "@/lib/magazzino/fornitore-produttore-master";
import { parseScontoFornitoreByMarca } from "@/lib/magazzino/marca-fornitore-sconto";

/** @deprecated Persistenza spostata su `public.app_settings` (modulo `magazzino`, chiave `master`). */
export const MAGAZZINO_MASTER_PREFS_KEY = "gestionale-magazzino-master-prefs-v1";

export type MagazzinoMasterPrefs = {
  marche: string[];
  /** Sconto % fornitore su listino OE per marca (chiave normalizzata lowercase). */
  scontoFornitoreByMarca?: Record<string, number>;
  categorie: string[];
  mezziCompatibili: string[];
  fornitori: string[];
  /** Produttori per fornitore alternativo (chiave = normalizeFornitoreKey). */
  produttoriByFornitore?: Record<string, string[]>;
};

/** @deprecated Preferire `public.app_settings` (modulo `magazzino`, chiave `master`). */
export function loadMagazzinoMasterPrefs(): MagazzinoMasterPrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(MAGAZZINO_MASTER_PREFS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as unknown;
    if (!p || typeof p !== "object") return null;
    const o = p as Record<string, unknown>;
    return {
      marche: Array.isArray(o.marche) ? (o.marche as string[]).filter((x) => typeof x === "string") : [],
      scontoFornitoreByMarca: parseScontoFornitoreByMarca(o.scontoFornitoreByMarca),
      categorie: Array.isArray(o.categorie) ? (o.categorie as string[]).filter((x) => typeof x === "string") : [],
      mezziCompatibili: Array.isArray(o.mezziCompatibili)
        ? (o.mezziCompatibili as string[]).filter((x) => typeof x === "string")
        : [],
      fornitori: Array.isArray(o.fornitori) ? (o.fornitori as string[]).filter((x) => typeof x === "string") : [],
      produttoriByFornitore: parseProduttoriByFornitore(o.produttoriByFornitore),
    };
  } catch {
    return null;
  }
}

/** @deprecated Preferire `public.app_settings` (modulo `magazzino`, chiave `master`). */
export function saveMagazzinoMasterPrefs(prefs: MagazzinoMasterPrefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MAGAZZINO_MASTER_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* quota */
  }
}
