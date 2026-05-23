"use client";

import { useCallback } from "react";
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
import { findSimilarSettingsDuplicate } from "@/lib/settings/settings-list-duplicate";
import { suppressSettingsRemoteNotify } from "@/lib/sistema/settings-remote-notify-guard";
import { findExactEntityInPool } from "@/lib/validation/global-entity-validation";

export function useAppendGlobalListValue(listKey: GlobalSettingsListKey, ctx?: GlobalSettingsListContext) {
  const { canManageSettings } = usePermissions();
  const { push } = useToast();
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
      const exact = findExactEntityInPool(trimmed, existing);
      if (exact) return exact;

      const similar = findSimilarSettingsDuplicate(existing, trimmed);
      if (similar && similar.trim().toLowerCase() !== trimmed.toLowerCase()) {
        push(`Attenzione: esiste già un valore simile («${similar}»).`, "warning", 4200);
      }

      const built = buildAppendGlobalListUpsert(resolved, listKey, rawValue, ctx);
      if (!built.ok) {
        if (built.reason === "missing_marca") {
          push("Seleziona prima la marca.", "warning", 3200);
        }
        return null;
      }

      const withVersions = mergeAppSettingsUpsertWithVersions([built.upsert], rows)[0];
      if (!withVersions) return null;

      suppressSettingsRemoteNotify(6000);
      try {
        await upsert.mutateAsync(withVersions);
      } catch (e) {
        push(e instanceof Error ? e.message : "Errore salvataggio elenco.", "error", 4500);
        return null;
      }

      return built.canonicalValue;
    },
    [canManageSettings, ctx, listKey, payload?.resolved, payload?.rows, push, upsert],
  );

  return { append, canAppend: canManageSettings, isPending: upsert.isPending };
}
