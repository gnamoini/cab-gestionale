import "server-only";

import {
  attrezzatureCreateRaw,
  attrezzatureGetById,
  attrezzatureListByMezzo,
  attrezzatureUpdateRaw,
  logAttrezzaturaConflictKept,
  logAttrezzaturaResolvedExisting,
} from "@/lib/domain/mezzo-attrezzatura/attrezzature-repository";
import type { ResolveOrCreateAttrezzaturaDeps } from "@/lib/domain/mezzo-attrezzatura/resolve-or-create-attrezzatura";
import type { SupabaseClient } from "@supabase/supabase-js";

export function buildServerAttrezzaturaResolveDeps(
  client: SupabaseClient,
): ResolveOrCreateAttrezzaturaDeps {
  return {
    getById: (id) => attrezzatureGetById(client, id),
    listByMezzo: (mezzoId) => attrezzatureListByMezzo(client, mezzoId),
    createRaw: (data) => attrezzatureCreateRaw(client, data),
    updateRaw: (id, patch) => attrezzatureUpdateRaw(client, id, patch),
    logResolvedExisting: (input) => logAttrezzaturaResolvedExisting(client, input),
    logConflictKept: (input) =>
      logAttrezzaturaConflictKept(client, {
        mezzoId: input.mezzoId,
        attrezzaturaId: input.attrezzaturaId,
        field: input.conflict.field,
        existingValue: input.conflict.existingValue,
        incomingValue: input.conflict.incomingValue,
      }),
  };
}
