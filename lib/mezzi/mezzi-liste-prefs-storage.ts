/**
 * @deprecated Persistenza spostata su `public.app_settings` (modulo `mezzi`, chiave `liste`).
 * Le funzioni load/save restano come fallback finché il DB non è popolato o in assenza di permessi.
 */
import { MEZZI_LISTE_DEFAULTS } from "@/lib/mezzi/mezzi-liste-defaults";
import { migrateMezziListePrefs } from "@/lib/mezzi/attrezzature-prefs";
import type { AttrezzaturaMarca, AttrezzaturaModello } from "@/lib/mezzi/attrezzature-prefs";

export const MEZZI_LISTE_PREFS_KEY = "gestionale-mezzi-liste-prefs-v1";

export type MezziListePrefs = {
  clienti: string[];
  utilizzatori: string[];
  cantieri: string[];
  marche: string[];
  /** Modelli mezzo (anagrafica / form) — denormalizzato da `attrezzature`. */
  modelli: string[];
  tipiAttrezzatura: string[];
  stati: string[];
  /** Gerarchia marche → modelli attrezzature (fonte di verità). */
  attrezzature?: AttrezzaturaMarca[];
  /** Gerarchia marche → modelli telaio. */
  telai?: AttrezzaturaMarca[];
  /** Tipi telaio (elenco piatto). */
  tipiTelaio?: string[];
  /** Chiave normalizzata cliente → sconto ricambi % (0–100). */
  scontoRicambiByCliente?: Record<string, number>;
};

const defaultListe = (): MezziListePrefs => ({
  clienti: [...MEZZI_LISTE_DEFAULTS.clienti],
  utilizzatori: [],
  cantieri: [],
  marche: [...MEZZI_LISTE_DEFAULTS.marche],
  modelli: [],
  tipiAttrezzatura: [...MEZZI_LISTE_DEFAULTS.tipiAttrezzatura],
  tipiTelaio: [],
  stati: [],
  attrezzature: undefined,
  telai: [],
});

/** Solo default built-in (nessun localStorage) — utile per seed / merge server. */
export function createMezziListePrefsDefault(): MezziListePrefs {
  return migrateMezziListePrefs(defaultListe());
}

/** @deprecated Preferire `public.app_settings` (modulo `mezzi`, chiave `liste`). */
export function loadMezziListePrefs(): MezziListePrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(MEZZI_LISTE_PREFS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as unknown;
    if (!p || typeof p !== "object") return null;
    const o = p as Record<string, unknown>;
    return {
      clienti: Array.isArray(o.clienti) ? (o.clienti as string[]).filter((x) => typeof x === "string") : [],
      utilizzatori: Array.isArray(o.utilizzatori) ? (o.utilizzatori as string[]).filter((x) => typeof x === "string") : [],
      cantieri: Array.isArray(o.cantieri) ? (o.cantieri as string[]).filter((x) => typeof x === "string") : [],
      marche: Array.isArray(o.marche) ? (o.marche as string[]).filter((x) => typeof x === "string") : [],
      modelli: Array.isArray(o.modelli) ? (o.modelli as string[]).filter((x) => typeof x === "string") : [],
      tipiAttrezzatura: Array.isArray(o.tipiAttrezzatura)
        ? (o.tipiAttrezzatura as string[]).filter((x) => typeof x === "string")
        : [],
      tipiTelaio: Array.isArray(o.tipiTelaio) ? (o.tipiTelaio as string[]).filter((x) => typeof x === "string") : [],
      stati: Array.isArray(o.stati) ? (o.stati as string[]).filter((x) => typeof x === "string") : [],
      attrezzature: normalizeAttrezzatureRaw(o.attrezzature),
      telai: normalizeAttrezzatureRaw(o.telai),
    };
  } catch {
    return null;
  }
}

/** @deprecated Preferire `public.app_settings` (modulo `mezzi`, chiave `liste`). */
export function saveMezziListePrefs(liste: MezziListePrefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MEZZI_LISTE_PREFS_KEY, JSON.stringify(liste));
  } catch {
    /* quota */
  }
}

export function getMezziListePrefsOrDefault(): MezziListePrefs {
  const loaded = loadMezziListePrefs();
  if (!loaded) return migrateMezziListePrefs(defaultListe());
  const d = defaultListe();
  const merged: MezziListePrefs = {
    clienti: loaded.clienti.length ? loaded.clienti : d.clienti,
    utilizzatori: loaded.utilizzatori?.length ? loaded.utilizzatori : d.utilizzatori,
    cantieri: loaded.cantieri?.length ? loaded.cantieri : d.cantieri,
    marche: loaded.marche.length ? loaded.marche : d.marche,
    modelli: loaded.modelli?.length ? loaded.modelli : d.modelli,
    tipiAttrezzatura: loaded.tipiAttrezzatura.length ? loaded.tipiAttrezzatura : d.tipiAttrezzatura,
    tipiTelaio: loaded.tipiTelaio?.length ? loaded.tipiTelaio : d.tipiTelaio,
    /** Legacy “stati mezzo”: non più usati in UI; manteniamo array vuoto. */
    stati: [],
    attrezzature: loaded.attrezzature,
    telai: loaded.telai,
  };
  return migrateMezziListePrefs(merged);
}

function normalizeAttrezzatureRaw(raw: unknown): AttrezzaturaMarca[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: AttrezzaturaMarca[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const id = typeof r.id === "string" && r.id.trim() ? r.id.trim() : "";
    const nome = typeof r.nome === "string" && r.nome.trim() ? r.nome.trim() : "";
    if (!id || !nome) continue;
    const modRaw = r.modelli;
    const modelli: AttrezzaturaModello[] = [];
    if (Array.isArray(modRaw)) {
      for (const m of modRaw) {
        if (!m || typeof m !== "object") continue;
        const mo = m as Record<string, unknown>;
        const mid = typeof mo.id === "string" && mo.id.trim() ? mo.id.trim() : "";
        const mn = typeof mo.nome === "string" && mo.nome.trim() ? mo.nome.trim() : "";
        if (mid && mn) modelli.push({ id: mid, nome: mn });
      }
    }
    out.push({ id, nome, modelli });
  }
  return out.length ? out : undefined;
}
