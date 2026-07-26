"use client";

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
import { gestionaleLogger } from "@/lib/observability/logger";
import { incrementHealthCounter } from "@/lib/observability/runtime-health";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";

export async function buildBrowserMezzoResolveDeps(): Promise<ResolveOrCreateMezzoDeps> {
  const client = await getBrowserSupabase();
  return {
    getById: (id) => mezziGetById(client, id),
    findByVinNorm: (vin) => mezziFindByVinNorm(client, vin),
    findByTargaNorm: (targa) => mezziFindByTargaNorm(client, targa),
    listPartialIdentityCandidates: (input) => mezziListPartialIdentityCandidates(client, input),
    createRaw: (data) => mezziCreateRaw(client, data),
    updateRaw: (id, patch) => mezziUpdateRaw(client, id, patch),
    logResolvedExisting: (input) =>
      logMezzoResolvedExisting(client, input).then(() => {
        incrementHealthCounter("mezziDuplicatePrevented");
      }),
    logConflictKept: (input) =>
      logMezzoConflictKept(client, {
        mezzoId: input.mezzoId,
        field: input.conflict.field,
        existingValue: input.conflict.existingValue,
        incomingValue: input.conflict.incomingValue,
      }),
    logDuplicatePrevented: (input) =>
      logMezzoDuplicatePrevented(client, input).then(() => {
        incrementHealthCounter("mezziDuplicatePrevented");
      }),
    logUpgradeAmbiguous: ({ reason }) => {
      gestionaleLogger.warn("mezzi.upgrade_ambiguous", { meta: { reason } });
    },
  };
}
