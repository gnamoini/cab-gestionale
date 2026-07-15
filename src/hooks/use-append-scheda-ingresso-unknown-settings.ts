"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { buildAppendGlobalListUpsert } from "@/src/lib/global-list/global-settings-list-keys";
import {
  fetchCabAppSettingsPayload,
  useSettingsUpsertMutation,
} from "@/src/hooks/gestionale/use-settings-queries";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { usePermissions } from "@/src/hooks/use-permissions";
import { suppressSettingsRemoteNotify } from "@/lib/sistema/settings-remote-notify-guard";
import { SETTINGS_CONCURRENCY_CONFLICT } from "@/lib/domain/settings-entry";
import { mergeAppSettingsUpsertWithVersions } from "@/lib/domain/settings-entry";
import type { SchedaIngressoUnknownSettingItem } from "@/lib/schede/scheda-ingresso-unknown-settings";
import { QK } from "@/src/lib/react-query/invalidate-related";

const SETTINGS_PAYLOAD_QK = [...QK.settings, "payload"] as const;
const APPEND_OCC_MAX_ATTEMPTS = 3;

export function useAppendSchedaIngressoUnknownSettings() {
  const { canManageSettings } = usePermissions();
  const gestToast = useGestionaleToast();
  const queryClient = useQueryClient();
  const upsert = useSettingsUpsertMutation();

  const appendItems = useCallback(
    async (
      items: readonly SchedaIngressoUnknownSettingItem[],
    ): Promise<Partial<Record<SchedaIngressoUnknownSettingItem["fieldKey"], string>> | null> => {
      if (!canManageSettings) {
        gestToast.validation("Non hai permesso di modificare gli elenchi globali.");
        return null;
      }
      if (items.length === 0) return {};

      const canonicalByField: Partial<Record<SchedaIngressoUnknownSettingItem["fieldKey"], string>> = {};

      for (const item of items) {
        let appended = false;
        for (let attempt = 0; attempt < APPEND_OCC_MAX_ATTEMPTS; attempt++) {
          try {
            const payload = await queryClient.fetchQuery({
              queryKey: SETTINGS_PAYLOAD_QK,
              queryFn: fetchCabAppSettingsPayload,
              staleTime: 0,
            });
            const built = buildAppendGlobalListUpsert(payload.resolved, item.listKey, item.value, item.ctx);
            if (!built.ok) {
              appended = true;
              break;
            }
            const withVersions = mergeAppSettingsUpsertWithVersions([built.upsert], payload.rows)[0];
            if (!withVersions) return null;
            suppressSettingsRemoteNotify(6000);
            await upsert.mutateAsync(withVersions);
            canonicalByField[item.fieldKey] = built.canonicalValue;
            appended = true;
            break;
          } catch (e) {
            if (e instanceof Error && e.message === SETTINGS_CONCURRENCY_CONFLICT && attempt < APPEND_OCC_MAX_ATTEMPTS - 1) {
              continue;
            }
            if (e instanceof Error && e.message === SETTINGS_CONCURRENCY_CONFLICT) {
              gestToast.warning("Impostazioni aggiornate da un altro utente. Riprova tra un attimo.");
            } else {
              gestToast.error(e);
            }
            return null;
          }
        }
        if (!appended) return null;
      }

      return canonicalByField;
    },
    [canManageSettings, gestToast, queryClient, upsert],
  );

  return { appendItems, canManageSettings, isPending: upsert.isPending };
}
