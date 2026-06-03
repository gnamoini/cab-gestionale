"use client";

import { useCallback } from "react";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
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
import { appendGlobalListSuccessMessage } from "@/lib/global-list/append-success-message";

export function useAppendGlobalListValue(listKey: GlobalSettingsListKey, ctx?: GlobalSettingsListContext) {
  const { canManageSettings } = usePermissions();
  const gestToast = useGestionaleToast();
  const { data: payload } = useCabAppSettingsPayloadQuery();
  const upsert = useSettingsUpsertMutation();

  const append = useCallback(
    async (rawValue: string): Promise<string | null> => {
      if (!canManageSettings) {
        gestToast.validation("Non hai permesso di modificare gli elenchi globali.");
        return null;
      }
      const resolved = payload?.resolved;
      const rows = payload?.rows;
      if (!resolved || !rows) {
        gestToast.warning("Configurazione non ancora caricata.");
        return null;
      }

      const existing = resolveGlobalListOptions(resolved, listKey, ctx);
      const trimmed = rawValue.trim();
      const exact = findExactEntityInPool(trimmed, existing);
      if (exact) return exact;

      const similar = findSimilarSettingsDuplicate(existing, trimmed);
      if (similar && similar.trim().toLowerCase() !== trimmed.toLowerCase()) {
        gestToast.warning(`Attenzione: esiste già un valore simile («${similar}»).`);
      }

      const built = buildAppendGlobalListUpsert(resolved, listKey, rawValue, ctx);
      if (!built.ok) {
        if (built.reason === "missing_marca") {
          gestToast.validation("Seleziona prima la marca.");
        }
        return null;
      }

      const withVersions = mergeAppSettingsUpsertWithVersions([built.upsert], rows)[0];
      if (!withVersions) return null;

      suppressSettingsRemoteNotify(6000);
      try {
        await upsert.mutateAsync(withVersions);
      } catch (e) {
        gestToast.error(e);
        return null;
      }

      gestToast.success(appendGlobalListSuccessMessage(listKey, ctx));
      return built.canonicalValue;
    },
    [canManageSettings, ctx, listKey, payload?.resolved, payload?.rows, gestToast, upsert],
  );

  return { append, canAppend: canManageSettings, isPending: upsert.isPending };
}
