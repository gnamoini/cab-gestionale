"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import {
  buildAppendGlobalListUpsert,
  isHierarchyListContext,
  resolveGlobalListOptions,
  type GlobalSettingsListContext,
  type GlobalSettingsListKey,
} from "@/src/lib/global-list/global-settings-list-keys";
import {
  fetchCabAppSettingsPayload,
  mergeAppSettingsUpsertWithVersions,
  useMagazzinoSettingsUpsertMutation,
  useSettingsUpsertMutation,
} from "@/src/hooks/gestionale/use-settings-queries";
import { usePermissions } from "@/src/hooks/use-permissions";
import { findSimilarSettingsDuplicate } from "@/lib/settings/settings-list-duplicate";
import { suppressSettingsRemoteNotify } from "@/lib/sistema/settings-remote-notify-guard";
import { findExactEntityInPool } from "@/lib/validation/global-entity-validation";
import { appendGlobalListSuccessMessage } from "@/lib/global-list/append-success-message";
import { QK } from "@/src/lib/react-query/invalidate-related";
import { SETTINGS_CONCURRENCY_CONFLICT } from "@/lib/domain/settings-entry";

const SETTINGS_PAYLOAD_QK = [...QK.settings, "payload"] as const;
const APPEND_OCC_MAX_ATTEMPTS = 3;

function isSettingsConcurrencyConflict(e: unknown): boolean {
  return e instanceof Error && e.message === SETTINGS_CONCURRENCY_CONFLICT;
}

function isMagazzinoSettingsListKey(listKey: GlobalSettingsListKey): boolean {
  return listKey.startsWith("magazzino:");
}

function isMagazzinoScopedListAppend(listKey: GlobalSettingsListKey, ctx?: GlobalSettingsListContext): boolean {
  return isMagazzinoSettingsListKey(listKey) || isHierarchyListContext(ctx);
}

export function useAppendGlobalListValue(listKey: GlobalSettingsListKey, ctx?: GlobalSettingsListContext) {
  const { canManageSettings } = usePermissions();
  const magPerm = usePermissions("magazzino");
  const gestToast = useGestionaleToast();
  const queryClient = useQueryClient();
  const settingsUpsert = useSettingsUpsertMutation();
  const magazzinoUpsert = useMagazzinoSettingsUpsertMutation();
  const magazzinoScoped = isMagazzinoScopedListAppend(listKey, ctx);
  const canAppend = magazzinoScoped ? magPerm.canWrite : canManageSettings;
  const upsert = magazzinoScoped ? magazzinoUpsert : settingsUpsert;

  const append = useCallback(
    async (rawValue: string): Promise<string | null> => {
      if (!canAppend) {
        gestToast.validation("Non hai permesso di modificare gli elenchi globali.");
        return null;
      }

      const trimmed = rawValue.trim();
      if (!trimmed) return null;

      for (let attempt = 0; attempt < APPEND_OCC_MAX_ATTEMPTS; attempt++) {
        let payload: Awaited<ReturnType<typeof fetchCabAppSettingsPayload>>;
        try {
          payload = await queryClient.fetchQuery({
            queryKey: SETTINGS_PAYLOAD_QK,
            queryFn: fetchCabAppSettingsPayload,
            staleTime: 0,
          });
        } catch {
          gestToast.warning("Configurazione non ancora caricata.");
          return null;
        }

        const { resolved, rows } = payload;
        const existing = resolveGlobalListOptions(resolved, listKey, ctx);
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
          await queryClient.refetchQueries({ queryKey: SETTINGS_PAYLOAD_QK });
          gestToast.success(appendGlobalListSuccessMessage(listKey, ctx));
          return built.canonicalValue;
        } catch (e) {
          if (isSettingsConcurrencyConflict(e) && attempt < APPEND_OCC_MAX_ATTEMPTS - 1) {
            continue;
          }
          if (isSettingsConcurrencyConflict(e)) {
            gestToast.warning("Impostazioni aggiornate da un altro utente. Riprova tra un attimo.");
          } else {
            gestToast.error(e);
          }
          return null;
        }
      }

      return null;
    },
    [canAppend, ctx, gestToast, listKey, queryClient, upsert],
  );

  return { append, canAppend, isPending: upsert.isPending };
}
