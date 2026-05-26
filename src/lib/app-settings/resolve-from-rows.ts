"use client";

import { syncAddettoColorMap } from "@/lib/lavorazioni/addetto-colors-assign";
import { DEFAULT_ADDETTI_LAVORAZIONI } from "@/lib/lavorazioni/constants";
import { orderPrioritaList } from "@/lib/lavorazioni/priorita-order";
import { DEFAULT_STATI_LAVORAZIONI_WORKFLOW, normalizeStatiList } from "@/lib/lavorazioni/stati-dynamic";
import type { PrioritaLav, StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import { migrateMezziListePrefs } from "@/lib/mezzi/attrezzature-prefs";
import { parseScontoRicambiByCliente } from "@/lib/mezzi/cliente-commerciale";
import { createMezziListePrefsDefault, type MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import type { MagazzinoMasterPrefs } from "@/lib/magazzino/magazzino-master-prefs-storage";
import { parseScontoFornitoreByMarca } from "@/lib/magazzino/marca-fornitore-sconto";
import type { SistemaPreventiviDefaults } from "@/lib/sistema/sistema-preventivi-defaults-storage";
import { CAB_SETTINGS_KEY, CAB_SETTINGS_MODULE } from "@/src/lib/app-settings/keys";
import type { AppSettingRow } from "@/src/types/supabase-tables";
import type { PrioritaLavorazione } from "@/src/types/supabase-tables";

export const DEFAULT_PRIORITA_LAVORAZIONI_DB: PrioritaLavorazione[] = ["bassa", "media", "alta", "urgente"];

export type CabAppSettingsResolved = {
  lavorazioni: {
    stati: StatoLavorazioneConfig[];
    addetti: string[];
    addettoColors: Record<string, string>;
    prioritaColors: Partial<Record<PrioritaLav, string>>;
    prioritaDb: PrioritaLavorazione[];
  };
  mezziListe: MezziListePrefs;
  magazzinoMaster: MagazzinoMasterPrefs;
  preventiviDefaults: SistemaPreventiviDefaults;
};

const FALLBACK_PREVENTIVI: SistemaPreventiviDefaults = { costoOrarioDefault: 48 };

function defaultLavorazioni(): CabAppSettingsResolved["lavorazioni"] {
  const addetti = [...DEFAULT_ADDETTI_LAVORAZIONI];
  return {
    stati: [...DEFAULT_STATI_LAVORAZIONI_WORKFLOW],
    addetti,
    addettoColors: syncAddettoColorMap(addetti, undefined),
    prioritaColors: {},
    prioritaDb: [...DEFAULT_PRIORITA_LAVORAZIONI_DB],
  };
}

function parsePrioritaDb(raw: unknown): PrioritaLavorazione[] {
  if (!Array.isArray(raw)) return [...DEFAULT_PRIORITA_LAVORAZIONI_DB];
  const allowed = new Set(DEFAULT_PRIORITA_LAVORAZIONI_DB);
  const parsed = raw.filter((x): x is PrioritaLavorazione => typeof x === "string" && allowed.has(x as PrioritaLavorazione));
  return parsed.length ? orderPrioritaList([...new Set(parsed)]) : [...DEFAULT_PRIORITA_LAVORAZIONI_DB];
}

function parseLavorazioniPayload(raw: unknown): CabAppSettingsResolved["lavorazioni"] {
  const base = defaultLavorazioni();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  if (Array.isArray(o.stati)) {
    const stati = normalizeStatiList(o.stati as StatoLavorazioneConfig[]);
    if (stati.length) base.stati = stati;
  }
  if (Array.isArray(o.addetti)) {
    const addetti = (o.addetti as unknown[])
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .map((x) => x.trim());
    if (addetti.length) {
      base.addetti = addetti;
      base.addettoColors = syncAddettoColorMap(
        addetti,
        o.addettoColors && typeof o.addettoColors === "object" && !Array.isArray(o.addettoColors)
          ? (o.addettoColors as Record<string, string>)
          : undefined,
      );
    }
  }
  if (o.addettoColors && typeof o.addettoColors === "object" && !Array.isArray(o.addettoColors)) {
    base.addettoColors = { ...base.addettoColors, ...(o.addettoColors as Record<string, string>) };
  }
  if (o.prioritaColors && typeof o.prioritaColors === "object" && !Array.isArray(o.prioritaColors)) {
    base.prioritaColors = { ...base.prioritaColors, ...(o.prioritaColors as Partial<Record<PrioritaLav, string>>) };
  }
  base.prioritaDb = parsePrioritaDb(o.prioritaDb);
  return base;
}

function parseMezziListePayload(raw: unknown): MezziListePrefs {
  const d = createMezziListePrefsDefault();
  if (!raw || typeof raw !== "object") return d;
  const o = raw as Record<string, unknown>;
  const out: MezziListePrefs = {
    clienti: Array.isArray(o.clienti) ? o.clienti.filter((x): x is string => typeof x === "string") : d.clienti,
    utilizzatori: Array.isArray(o.utilizzatori)
      ? o.utilizzatori.filter((x): x is string => typeof x === "string")
      : d.utilizzatori,
    cantieri: Array.isArray(o.cantieri) ? o.cantieri.filter((x): x is string => typeof x === "string") : d.cantieri,
    marche: Array.isArray(o.marche) ? o.marche.filter((x): x is string => typeof x === "string") : d.marche,
    modelli: Array.isArray(o.modelli) ? o.modelli.filter((x): x is string => typeof x === "string") : d.modelli,
    tipiAttrezzatura: Array.isArray(o.tipiAttrezzatura)
      ? o.tipiAttrezzatura.filter((x): x is string => typeof x === "string")
      : d.tipiAttrezzatura,
    stati: Array.isArray(o.stati) ? o.stati.filter((x): x is string => typeof x === "string") : d.stati,
    attrezzature: Array.isArray(o.attrezzature) ? (o.attrezzature as MezziListePrefs["attrezzature"]) : d.attrezzature,
    telai: Array.isArray(o.telai) ? (o.telai as MezziListePrefs["telai"]) : d.telai,
    tipiTelaio: Array.isArray(o.tipiTelaio) ? o.tipiTelaio.filter((x): x is string => typeof x === "string") : d.tipiTelaio,
    scontoRicambiByCliente: parseScontoRicambiByCliente(o.scontoRicambiByCliente),
  };
  return migrateMezziListePrefs(out);
}

function parseMagazzinoMasterPayload(raw: unknown): MagazzinoMasterPrefs {
  const empty: MagazzinoMasterPrefs = { marche: [], categorie: [], mezziCompatibili: [], fornitori: [] };
  if (!raw || typeof raw !== "object") return empty;
  const o = raw as Record<string, unknown>;
  return {
    marche: Array.isArray(o.marche) ? o.marche.filter((x): x is string => typeof x === "string") : [],
    scontoFornitoreByMarca: parseScontoFornitoreByMarca(o.scontoFornitoreByMarca),
    categorie: Array.isArray(o.categorie) ? o.categorie.filter((x): x is string => typeof x === "string") : [],
    mezziCompatibili: Array.isArray(o.mezziCompatibili)
      ? o.mezziCompatibili.filter((x): x is string => typeof x === "string")
      : [],
    fornitori: Array.isArray(o.fornitori) ? o.fornitori.filter((x): x is string => typeof x === "string") : [],
  };
}

function parsePreventiviDefaultsPayload(raw: unknown): SistemaPreventiviDefaults {
  if (!raw || typeof raw !== "object") return { ...FALLBACK_PREVENTIVI };
  const c = Number((raw as { costoOrarioDefault?: unknown }).costoOrarioDefault);
  return {
    costoOrarioDefault: Number.isFinite(c) && c > 0 ? Math.round(c * 100) / 100 : FALLBACK_PREVENTIVI.costoOrarioDefault,
  };
}

export function resolveCabAppSettingsFromRows(
  rows: AppSettingRow[],
  legacy?: Partial<CabAppSettingsResolved> | null,
): CabAppSettingsResolved {
  const pick = (m: string, k: string): AppSettingRow | undefined =>
    rows.find((r) => r.module === m && r.key === k);

  const lavRow = pick(CAB_SETTINGS_MODULE.lavorazioni, CAB_SETTINGS_KEY.prefs);
  const lavorazioni =
    lavRow != null
      ? parseLavorazioniPayload(lavRow.value)
      : legacy?.lavorazioni != null
        ? parseLavorazioniPayload(legacy.lavorazioni as unknown)
        : defaultLavorazioni();

  const mezziRow = pick(CAB_SETTINGS_MODULE.mezzi, CAB_SETTINGS_KEY.liste);
  const mezziListe =
    mezziRow != null
      ? parseMezziListePayload(mezziRow.value)
      : legacy?.mezziListe != null
        ? migrateMezziListePrefs(legacy.mezziListe)
        : createMezziListePrefsDefault();

  const magRow = pick(CAB_SETTINGS_MODULE.magazzino, CAB_SETTINGS_KEY.master);
  const magazzinoMaster =
    magRow != null
      ? parseMagazzinoMasterPayload(magRow.value)
      : legacy?.magazzinoMaster != null
        ? legacy.magazzinoMaster
        : { marche: [], categorie: [], mezziCompatibili: [], fornitori: [] };

  const prevRow = pick(CAB_SETTINGS_MODULE.preventivi, CAB_SETTINGS_KEY.defaults);
  const preventiviDefaults =
    prevRow != null
      ? parsePreventiviDefaultsPayload(prevRow.value)
      : legacy?.preventiviDefaults != null
        ? legacy.preventiviDefaults
        : { ...FALLBACK_PREVENTIVI };

  return { lavorazioni, mezziListe, magazzinoMaster, preventiviDefaults };
}

export function buildBulkRowsFromResolved(r: CabAppSettingsResolved): { module: string; key: string; value: Record<string, unknown> }[] {
  return [
    {
      module: CAB_SETTINGS_MODULE.lavorazioni,
      key: CAB_SETTINGS_KEY.prefs,
      value: {
        stati: r.lavorazioni.stati,
        addetti: r.lavorazioni.addetti,
        addettoColors: r.lavorazioni.addettoColors,
        prioritaColors: r.lavorazioni.prioritaColors,
        prioritaDb: r.lavorazioni.prioritaDb,
      },
    },
    {
      module: CAB_SETTINGS_MODULE.mezzi,
      key: CAB_SETTINGS_KEY.liste,
      value: { ...(r.mezziListe as unknown as Record<string, unknown>) },
    },
    {
      module: CAB_SETTINGS_MODULE.magazzino,
      key: CAB_SETTINGS_KEY.master,
      value: { ...(r.magazzinoMaster as unknown as Record<string, unknown>) },
    },
    {
      module: CAB_SETTINGS_MODULE.preventivi,
      key: CAB_SETTINGS_KEY.defaults,
      value: { ...(r.preventiviDefaults as unknown as Record<string, unknown>) },
    },
  ];
}
