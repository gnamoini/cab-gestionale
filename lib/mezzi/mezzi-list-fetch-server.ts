import "server-only";

import { cache } from "react";
import { fetchMezziListRows, type MezziListVariant } from "@/lib/mezzi/mezzi-list-fetch";
import { verifyServerSectionRead } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, type ServiceResult } from "@/src/services/service-result";
import type { MezzoFilters } from "@/src/services/mezzi.service";
import type { MezzoRow } from "@/src/types/supabase-tables";

export async function fetchMezziListAuthorizedServer(
  filters?: MezzoFilters,
  variant: MezziListVariant = "list",
): Promise<ServiceResult<MezzoRow[]>> {
  const allowed = await verifyServerSectionRead("mezzi");
  if (!allowed) return err("Permesso richiesto.");
  const sb = await createSupabaseServerUserClient();
  return fetchMezziListRows(sb, { filters, variant });
}

export const getMezziListLightServer = cache(async () => {
  return fetchMezziListAuthorizedServer(undefined, "list");
});

export const getMezziReportLightServer = cache(async () => {
  return fetchMezziListAuthorizedServer(undefined, "report");
});
