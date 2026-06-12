import "server-only";

import { cache } from "react";
import { fetchMovimentiListRows } from "@/lib/movimenti/movimenti-list-fetch";
import { verifyServerSectionRead } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, type ServiceResult } from "@/src/services/service-result";
import type { MovimentiFilters } from "@/src/services/movimenti.service";
import type { MovimentoRicambioRow } from "@/src/types/supabase-tables";

export async function fetchMovimentiListAuthorizedServer(
  filters?: MovimentiFilters,
): Promise<ServiceResult<MovimentoRicambioRow[]>> {
  const allowed = await verifyServerSectionRead("magazzino");
  if (!allowed) return err("Permesso richiesto.");
  const sb = await createSupabaseServerUserClient();
  return fetchMovimentiListRows(sb, filters);
}

export const getMovimentiListServer = cache(async () => {
  return fetchMovimentiListAuthorizedServer(undefined);
});
