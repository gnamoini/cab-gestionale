"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/context/toast-context";
import {
  buildAppendGlobalListUpsert,
  resolveGlobalListOptions,
  type GlobalSettingsListContext,
  type GlobalSettingsListKey,
} from "@/src/lib/global-list/global-settings-list-keys";
import {
  mergeAppSettingsUpsertWithVersions,
  useCabAppSettingsPayloadQuery,
  useSettingsUpsertMutation,
} from "@/src/hooks/gestionale/use-settings-queries";
import { usePermissions } from "@/src/hooks/use-permissions";
import { QK } from "@/src/lib/react-query/invalidate-related";
import { dispatchLavorazioniPrefsRefresh, dispatchMagazzinoMasterRefresh, dispatchMezziListeRefresh } from "@/lib/sistema/cab-events";

export function useAppendGlobalListValue(listKey: GlobalSettingsListKey, ctx?: GlobalSettingsListContext) {
  const { canManageSettings } = usePermissions();
  const { push } = useToast();
  const qc = useQueryClient();
  const { data: payload } = useCabAppSettingsPayloadQuery();
  const upsert = useSettingsUpsertMutation();

  const append = useCallback(
    async (rawValue: string): Promise<string | null> => {
      if (!canManageSettings) {
        push("Non hai permesso di modificare gli elenchi globali.", "warning", 4200);
        return null;
      }
      const resolved = payload?.resolved;
      const rows = payload?.rows;
      if (!resolved || !rows) {
        push("Impostazioni non ancora caricate.", "warning", 3200);
        return null;
      }

      const existing = resolveGlobalListOptions(resolved, listKey, ctx);
      const trimmed = rawValue.trim();
      const already = existing.find((x) => x.trim().toLowerCase() === trimmed.toLowerCase());
      if (already) return already;

      const built = buildAppendGlobalListUpsert(resolved, listKey, rawValue, ctx);
      if (!built.ok) {
        if (built.reason === "missing_marca") {
          push("Seleziona prima la marca.", "warning", 3200);
        }
        return null;
      }

      const withVersions = mergeAppSettingsUpsertWithVersions([built.upsert], rows)[0];
      if (!withVersions) return null;

      try {
        await upsert.mutateAsync(withVersions);
      } catch (e) {
        push(e instanceof Error ? e.message : "Errore salvataggio elenco.", "error", 4500);
        return null;
      }

      await qc.invalidateQueries({ queryKey: [...QK.settings] });
      if (listKey.startsWith("mezzi:") || ctx?.hierarchyTree) {
        dispatchMezziListeRefresh();
      }
      if (listKey.startsWith("lavorazioni:")) {
        dispatchLavorazioniPrefsRefresh();
      }
      if (listKey.startsWith("magazzino:")) {
        dispatchMagazzinoMasterRefresh();
      }

      return built.canonicalValue;
    },
    [canManageSettings, ctx, listKey, payload?.resolved, payload?.rows, push, qc, upsert],
  );

  return { append, canAppend: canManageSettings, isPending: upsert.isPending };
}
