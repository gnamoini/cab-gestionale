"use client";

import { useMemo } from "react";
import { migrateMezziListePrefs } from "@/lib/mezzi/attrezzature-prefs";
import { createMezziListePrefsDefault } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import type { PrioritaLav } from "@/lib/lavorazioni/types";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import type { MagazzinoMasterPrefs } from "@/lib/magazzino/magazzino-master-prefs-storage";
import type { SistemaPreventiviDefaults } from "@/lib/sistema/sistema-preventivi-defaults-storage";
import {
  buildStatiLavorazioniOptions,
  debugSelectOptions,
  statiLavorazioniChiusiOptions,
  statiLavorazioniInCorsoOptions,
  statiLavorazioniRapidiOptions,
} from "@/src/shared/selectors";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";
import type { PrioritaLavorazione } from "@/src/types/supabase-tables";
import { DEFAULT_PRIORITA_LAVORAZIONI_DB } from "@/src/lib/app-settings/resolve-from-rows";

export type GlobalOptionsSlice = {
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  source: "app_settings" | "unavailable";
  lavorazioni: {
    stati: StatoLavorazioneConfig[];
    statiInCorso: StatoLavorazioneConfig[];
    statiChiusi: StatoLavorazioneConfig[];
    statiRapidi: StatoLavorazioneConfig[];
    addetti: string[];
    addettoColors: Record<string, string>;
    prioritaColors: Partial<Record<PrioritaLav, string>>;
    prioritaDb: PrioritaLavorazione[];
    prioritaLegacy: PrioritaLav[];
  };
  mezziListe: MezziListePrefs;
  magazzinoMaster: MagazzinoMasterPrefs;
  preventiviDefaults: SistemaPreventiviDefaults;
};

function emptySlice(): GlobalOptionsSlice {
  const mezziListe = createMezziListePrefsDefault();
  return {
    isLoading: true,
    isError: false,
    error: null,
    source: "unavailable",
    lavorazioni: {
      stati: [],
      statiInCorso: [],
      statiChiusi: [],
      statiRapidi: [],
      addetti: [],
      addettoColors: {},
      prioritaColors: {},
      prioritaDb: [],
      prioritaLegacy: [],
    },
    mezziListe,
    magazzinoMaster: { marche: [], categorie: [], mezziCompatibili: [], fornitori: [] },
    preventiviDefaults: { costoOrarioDefault: 48 },
  };
}

/**
 * Fonte unica per elenchi select/autocomplete derivati dalle Impostazioni globali (`app_settings`).
 */
export function useGlobalOptions(options?: { enabled?: boolean; debugTag?: string }): GlobalOptionsSlice {
  const enabled = options?.enabled ?? true;
  const q = useCabAppSettingsPayloadQuery({ enabled });
  const resolved = q.data?.resolved;
  const tag = options?.debugTag ?? "useGlobalOptions";

  return useMemo(() => {
    if (!enabled) return { ...emptySlice(), isLoading: false, source: "unavailable" };

    if (q.isPending && !resolved) {
      debugSelectOptions(tag, { status: "loading", source: "app_settings" });
      return { ...emptySlice(), isLoading: true };
    }

    if (q.isError && !resolved) {
      debugSelectOptions(tag, { status: "error", message: q.error?.message });
      return {
        ...emptySlice(),
        isLoading: false,
        isError: true,
        error: q.error ?? new Error("Impostazioni non disponibili"),
      };
    }

    if (!resolved) {
      debugSelectOptions(tag, { status: "empty", source: "unavailable" });
      return { ...emptySlice(), isLoading: false, source: "unavailable" };
    }

    const stati = buildStatiLavorazioniOptions(resolved.lavorazioni.stati);
    const statiInCorso = statiLavorazioniInCorsoOptions(stati);
    const statiChiusi = statiLavorazioniChiusiOptions(stati);
    const statiRapidi = statiLavorazioniRapidiOptions(stati);
    const mezziListe = migrateMezziListePrefs(resolved.mezziListe);

    debugSelectOptions(tag, {
      status: "ready",
      source: "app_settings",
      statiCount: stati.length,
      addettiCount: resolved.lavorazioni.addetti.length,
      clientiCount: mezziListe.clienti.length,
      utilizzatoriCount: mezziListe.utilizzatori.length,
      cantieriCount: mezziListe.cantieri.length,
      marcheCount: mezziListe.marche.length,
    });

    return {
      isLoading: false,
      isError: false,
      error: null,
      source: "app_settings",
      lavorazioni: {
        stati,
        statiInCorso,
        statiChiusi,
        statiRapidi,
        addetti: resolved.lavorazioni.addetti,
        addettoColors: resolved.lavorazioni.addettoColors,
        prioritaColors: resolved.lavorazioni.prioritaColors,
        prioritaDb: resolved.lavorazioni.prioritaDb.length ? resolved.lavorazioni.prioritaDb : DEFAULT_PRIORITA_LAVORAZIONI_DB,
        prioritaLegacy: resolved.lavorazioni.prioritaDb.filter((p): p is PrioritaLav => p === "urgente" || p === "alta" || p === "media" || p === "bassa"),
      },
      mezziListe,
      magazzinoMaster: resolved.magazzinoMaster,
      preventiviDefaults: resolved.preventiviDefaults,
    };
  }, [enabled, q.isPending, q.isError, q.error, resolved, tag]);
}

/** Alias richiesti dalla specifica. */
export const useSettingsOptions = useGlobalOptions;
export const useClientsOptions = () => {
  const g = useGlobalOptions({ debugTag: "useClientsOptions" });
  return useMemo(
    () => ({
      ...g,
      options: g.mezziListe.clienti,
    }),
    [g],
  );
};
export const useEmployeesOptions = () => {
  const g = useGlobalOptions({ debugTag: "useEmployeesOptions" });
  return useMemo(
    () => ({
      ...g,
      options: g.lavorazioni.addetti,
    }),
    [g],
  );
};
export const useUtilizzatoriOptions = () => {
  const g = useGlobalOptions({ debugTag: "useUtilizzatoriOptions" });
  return useMemo(
    () => ({
      ...g,
      options: g.mezziListe.utilizzatori,
    }),
    [g],
  );
};
export const useCantieriOptions = () => {
  const g = useGlobalOptions({ debugTag: "useCantieriOptions" });
  return useMemo(
    () => ({
      ...g,
      options: g.mezziListe.cantieri,
    }),
    [g],
  );
};
