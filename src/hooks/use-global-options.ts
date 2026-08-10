"use client";

import { useMemo } from "react";
import {
  attrezzatureCatalogToHierarchyTree,
  fetchAttrezzatureCatalogEntries,
  resolveMezziListeWithFleetCatalog,
} from "@/lib/attrezzature/attrezzature-catalog";
import { migrateMezziListePrefs, type AttrezzaturaMarca } from "@/lib/mezzi/attrezzature-prefs";
import { useServiceQuery } from "@/src/hooks/use-service-query";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { createMezziListePrefsDefault } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import type { PrioritaLav } from "@/lib/lavorazioni/types";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import type { MagazzinoMasterPrefs } from "@/lib/magazzino/magazzino-master-prefs-storage";
import type { SistemaPreventiviDefaults } from "@/lib/sistema/sistema-preventivi-defaults-storage";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import type { DipendenteRecord } from "@/lib/dipendenti/dipendente-record";
import {
  getActiveDipendentiRecords,
  getAddettiRecords,
  getAllDipendentiRecords,
} from "@/lib/dipendenti/dipendente-record";
import type { TipoAssenzaConfig } from "@/lib/dipendenti/tipi-assenza-model";
import {
  buildStatiLavorazioniOptions,
  debugSelectOptions,
  statiLavorazioniChiusiOptions,
  statiLavorazioniInCorsoOptions,
  statiLavorazioniRapidiOptions,
} from "@/src/shared/selectors";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";
import type { CabAppSettingsResolved } from "@/src/lib/app-settings/resolve-from-rows";
import { success } from "@/src/services/service-result";
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
    addettiRecords: AddettoRecord[];
    addettoColors: Record<string, string>;
    prioritaColors: Partial<Record<PrioritaLav, string>>;
    prioritaDb: PrioritaLavorazione[];
    prioritaLegacy: PrioritaLav[];
  };
  mezziListe: MezziListePrefs;
  /** Albero settings senza merge flotta — lookup ID stabili compat refs. */
  mezziListePrefs: MezziListePrefs;
  magazzinoMaster: MagazzinoMasterPrefs;
  preventiviDefaults: SistemaPreventiviDefaults;
  dipendenti: {
    dipendentiRecords: DipendenteRecord[];
    tipiAssenza: TipoAssenzaConfig[];
  };
};

function sliceFromResolved(
  resolved: CabAppSettingsResolved,
  source: GlobalOptionsSlice["source"],
  fleetAttrezzatureTree?: ReturnType<typeof attrezzatureCatalogToHierarchyTree>,
): GlobalOptionsSlice {
  const stati = buildStatiLavorazioniOptions(resolved.lavorazioni.stati);
  const statiInCorso = statiLavorazioniInCorsoOptions(stati);
  const statiChiusi = statiLavorazioniChiusiOptions(stati);
  const statiRapidi = statiLavorazioniRapidiOptions(stati);
  const baseListe = migrateMezziListePrefs(resolved.mezziListe);
  const mezziListe = resolveMezziListeWithFleetCatalog(baseListe, fleetAttrezzatureTree ?? []);

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
      addettiRecords: resolved.lavorazioni.addettiRecords,
      addettoColors: resolved.lavorazioni.addettoColors,
      prioritaColors: resolved.lavorazioni.prioritaColors,
      prioritaDb: resolved.lavorazioni.prioritaDb.length ? resolved.lavorazioni.prioritaDb : DEFAULT_PRIORITA_LAVORAZIONI_DB,
      prioritaLegacy: resolved.lavorazioni.prioritaDb.filter(
        (p): p is PrioritaLav => p === "urgente" || p === "alta" || p === "media" || p === "bassa",
      ),
    },
    mezziListe,
    mezziListePrefs: baseListe,
    magazzinoMaster: resolved.magazzinoMaster,
    preventiviDefaults: resolved.preventiviDefaults,
    dipendenti: resolved.dipendenti,
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
  const q = useCabAppSettingsPayloadQuery({ enabled, tier: "static" });
  const fleetQ = useServiceQuery<AttrezzaturaMarca[], readonly ["attrezzature-fleet-catalog"]>(
    ["attrezzature-fleet-catalog"],
    async () => {
      const sb = getBrowserSupabase();
      return success(
        attrezzatureCatalogToHierarchyTree(await fetchAttrezzatureCatalogEntries(sb)),
      );
    },
    { enabled, staleTime: 60_000 },
  );
  const resolved = q.data?.resolved;
  const tag = options?.debugTag ?? "useGlobalOptions";
  const fleetTree = fleetQ.data;

  return useMemo(() => {
    if (!enabled) return { ...emptySlice(), source: "unavailable" as const };

    const fallbackResolved = resolved ?? resolveCabAppSettingsFallback();

    if (q.isPending && !resolved) {
      debugSelectOptions(tag, { status: "loading", source: "fallback" });
      return { ...sliceFromResolved(fallbackResolved, "fallback", fleetTree), isLoading: true };
    }

    if (q.isError && !resolved) {
      debugSelectOptions(tag, { status: "error", message: q.error?.message, source: "fallback" });
      return {
        ...sliceFromResolved(fallbackResolved, "fallback", fleetTree),
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

    return sliceFromResolved(fallbackResolved, resolved ? "app_settings" : "fallback", fleetTree);
  }, [enabled, q.isPending, q.isError, q.error, resolved, tag, fleetTree]);
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

export const useAddettiRecords = () => {
  const g = useGlobalOptions({ debugTag: "useAddettiRecords" });
  return useMemo(
    () => ({
      ...g,
      records: getAddettiRecords(g.dipendenti.dipendentiRecords),
    }),
    [g],
  );
};

export const useDipendentiRecords = () => {
  const g = useGlobalOptions({ debugTag: "useDipendentiRecords" });
  return useMemo(
    () => ({
      ...g,
      records: getAllDipendentiRecords(g.dipendenti.dipendentiRecords),
    }),
    [g],
  );
};

export const useActiveDipendentiRecords = () => {
  const g = useGlobalOptions({ debugTag: "useActiveDipendentiRecords" });
  return useMemo(
    () => ({
      ...g,
      records: getActiveDipendentiRecords(g.dipendenti.dipendentiRecords),
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

export const useTipiAssenza = () => {
  const g = useGlobalOptions({ debugTag: "useTipiAssenza" });
  return useMemo(
    () => ({
      ...g,
      tipi: g.dipendenti.tipiAssenza,
    }),
    [g],
  );
};
