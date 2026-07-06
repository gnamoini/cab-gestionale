import "server-only";

import { cache } from "react";
import {
  fetchMagazzinoListRows,
  type MagazzinoListVariant,
} from "@/lib/magazzino/magazzino-list-fetch";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, type ServiceResult } from "@/src/services/service-result";
import type { MagazzinoFilters } from "@/src/services/magazzino.service";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";

export async function fetchMagazzinoListAuthorizedServer(
  filters?: MagazzinoFilters,
  variant: MagazzinoListVariant = "list",
): Promise<ServiceResult<MagazzinoRicambioRow[]>> {
  const allowed = await verifyServerPageRead("magazzino");
  if (!allowed) return err("Permesso richiesto.");
  const sb = await createSupabaseServerUserClient();
  return fetchMagazzinoListRows(sb, { filters, variant });
}

export const getMagazzinoListServer = cache(async () => {
  return fetchMagazzinoListAuthorizedServer(undefined, "list");
});

export const getMagazzinoReportLightServer = cache(async () => {
  return fetchMagazzinoListAuthorizedServer(undefined, "report");
});
