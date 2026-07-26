import "server-only";

import {
  logMezzoConflictKept,
  logMezzoDuplicatePrevented,
  logMezzoResolvedExisting,
  mezziCreateRaw,
  mezziFindByTargaNorm,
  mezziFindByVinNorm,
  mezziGetById,
  mezziListPartialIdentityCandidates,
  mezziUpdateRaw,
} from "@/lib/domain/mezzo/mezzi-repository";
import type { ResolveOrCreateMezzoDeps } from "@/lib/domain/mezzo/resolve-or-create-mezzo";
import type { SupabaseClient } from "@supabase/supabase-js";

export function buildServerMezzoResolveDeps(client: SupabaseClient): ResolveOrCreateMezzoDeps {
  return {
    getById: (id) => mezziGetById(client, id),
    findByVinNorm: (vin) => mezziFindByVinNorm(client, vin),
    findByTargaNorm: (targa) => mezziFindByTargaNorm(client, targa),
    listPartialIdentityCandidates: (input) => mezziListPartialIdentityCandidates(client, input),
    createRaw: (data) => mezziCreateRaw(client, data),
    updateRaw: (id, patch) => mezziUpdateRaw(client, id, patch),
    logResolvedExisting: (input) => logMezzoResolvedExisting(client, input),
    logConflictKept: (input) =>
      logMezzoConflictKept(client, {
        mezzoId: input.mezzoId,
        field: input.conflict.field,
        existingValue: input.conflict.existingValue,
        incomingValue: input.conflict.incomingValue,
      }),
    logDuplicatePrevented: (input) => logMezzoDuplicatePrevented(client, input),
  };
}
