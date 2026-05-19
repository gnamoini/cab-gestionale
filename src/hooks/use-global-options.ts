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
import type { CabAppSettingsResolved } from "@/src/lib/app-settings/resolve-from-rows";
import { DEFAULT_PRIORITA_LAVORAZIONI_DB } from "@/src/lib/app-settings/resolve-from-rows";
import { resolveCabAppSettingsFallback } from "@/src/lib/app-settings/settings-fallback";
import type { PrioritaLavorazione } from "@/src/types/supabase-tables";

export type GlobalOptionsSlice = {
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  source: "app_settings" | "fallback" | "unavailable";
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

function sliceFromResolved(resolved: CabAppSettingsResolved, source: GlobalOptionsSlice["source"]): GlobalOptionsSlice {
  const stati = buildStatiLavorazioniOptions(resolved.lavorazioni.stati);
  const statiInCorso = statiLavorazioniInCorsoOptions(stati);
  const statiChiusi = statiLavorazioniChiusiOptions(stati);
  const statiRapidi = statiLavorazioniRapidiOptions(stati);
  const mezziListe = migrateMezziListePrefs(resolved.mezziListe);

  return {
    isLoading: false,
    isError: false,
    error: null,
    source,
    lavorazioni: {
      stati,
      statiInCorso,
      statiChiusi,
      statiRapidi,
      addetti: resolved.lavorazioni.addetti,
      addettoColors: resolved.lavorazioni.addettoColors,
      prioritaColors: resolved.lavorazioni.prioritaColors,
      prioritaDb: resolved.lavorazioni.prioritaDb.length ? resolved.lavorazioni.prioritaDb : DEFAULT_PRIORITA_LAVORAZIONI_DB,
      prioritaLegacy: resolved.lavorazioni.prioritaDb.filter(
        (p): p is PrioritaLav => p === "urgente" || p === "alta" || p === "media" || p === "bassa",
      ),
    },
    mezziListe,
    magazzinoMaster: resolved.magazzinoMaster,
    preventiviDefaults: resolved.preventiviDefaults,
  };
}

function emptySlice(): GlobalOptionsSlice {
  return sliceFromResolved(resolveCabAppSettingsFallback(), "fallback");
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
    if (!enabled) return { ...emptySlice(), source: "unavailable" as const };

    const fallbackResolved = resolved ?? resolveCabAppSettingsFallback();

    if (q.isPending && !resolved) {
      debugSelectOptions(tag, { status: "loading", source: "fallback" });
      return { ...sliceFromResolved(fallbackResolved, "fallback"), isLoading: true };
    }

    if (q.isError && !resolved) {
      debugSelectOptions(tag, { status: "error", message: q.error?.message, source: "fallback" });
      return {
        ...sliceFromResolved(fallbackResolved, "fallback"),
        isLoading: false,
        isError: true,
        error: q.error ?? new Error("Impostazioni non disponibili"),
      };
    }

    debugSelectOptions(tag, {
      status: "ready",
      source: resolved ? "app_settings" : "fallback",
      statiCount: fallbackResolved.lavorazioni.stati.length,
      addettiCount: fallbackResolved.lavorazioni.addetti.length,
      clientiCount: fallbackResolved.mezziListe.clienti.length,
      utilizzatoriCount: fallbackResolved.mezziListe.utilizzatori.length,
      cantieriCount: fallbackResolved.mezziListe.cantieri.length,
      marcheCount: fallbackResolved.mezziListe.marche.length,
    });

    return sliceFromResolved(fallbackResolved, resolved ? "app_settings" : "fallback");
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
export const useTipiTelaioOptions = () => {
  const g = useGlobalOptions({ debugTag: "useTipiTelaioOptions" });
  return useMemo(
    () => ({
      ...g,
      options: g.mezziListe.tipiTelaio ?? [],
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
