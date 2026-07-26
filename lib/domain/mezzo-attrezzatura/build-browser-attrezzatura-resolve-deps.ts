"use client";

import {
  attrezzatureCreateRaw,
  attrezzatureGetById,
  attrezzatureListByMezzo,
  attrezzatureUpdateRaw,
  logAttrezzaturaConflictKept,
  logAttrezzaturaResolvedExisting,
} from "@/lib/domain/mezzo-attrezzatura/attrezzature-repository";
import type { ResolveOrCreateAttrezzaturaDeps } from "@/lib/domain/mezzo-attrezzatura/resolve-or-create-attrezzatura";
import { gestionaleLogger } from "@/lib/observability/logger";
import { incrementHealthCounter } from "@/lib/observability/runtime-health";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";

export async function buildBrowserAttrezzaturaResolveDeps(): Promise<ResolveOrCreateAttrezzaturaDeps> {
  const client = await getBrowserSupabase();
  return {
    getById: (id) => attrezzatureGetById(client, id),
    listByMezzo: (mezzoId) => attrezzatureListByMezzo(client, mezzoId),
    createRaw: (data) => attrezzatureCreateRaw(client, data),
    updateRaw: (id, patch) => attrezzatureUpdateRaw(client, id, patch),
    logResolvedExisting: (input) =>
      logAttrezzaturaResolvedExisting(client, input).then(() => {
        incrementHealthCounter("attrezzatureDuplicatePrevented");
      }),
    logConflictKept: (input) =>
      logAttrezzaturaConflictKept(client, {
        mezzoId: input.mezzoId,
        attrezzaturaId: input.attrezzaturaId,
        field: input.conflict.field,
        existingValue: input.conflict.existingValue,
        incomingValue: input.conflict.incomingValue,
      }),
    logUpgradeAmbiguous: ({ mezzoId, reason }) => {
      gestionaleLogger.warn("attrezzature.upgrade_ambiguous", { meta: { mezzoId, reason } });
    },
  };
}
