import "server-only";

import { cache } from "react";
import {
  fetchMezziGestitiListRows,
  fetchMezziListRows,
  type MezziListVariant,
} from "@/lib/mezzi/mezzi-list-fetch";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, type ServiceResult } from "@/src/services/service-result";
import type { MezzoFilters } from "@/src/services/mezzi.service";
import type { MezzoRow } from "@/src/types/supabase-tables";

export async function fetchMezziListAuthorizedServer(
  filters?: MezzoFilters,
  variant: MezziListVariant = "list",
): Promise<ServiceResult<MezzoRow[]>> {
  const allowed = await verifyServerPageRead("mezzi");
  if (!allowed) return err("Permesso richiesto.");
  const sb = await createSupabaseServerUserClient();
  return fetchMezziListRows(sb, { filters, variant });
}

export async function fetchMezziGestitiAuthorizedServer(
  filters?: MezzoFilters,
  variant: MezziListVariant = "list",
): Promise<ServiceResult<MezzoGestito[]>> {
  const allowed = await verifyServerPageRead("mezzi");
  if (!allowed) return err("Permesso richiesto.");
  const sb = await createSupabaseServerUserClient();
  return fetchMezziGestitiListRows(sb, { filters, variant });
}

export const getMezziListLightServer = cache(async () => {
  return fetchMezziGestitiAuthorizedServer(undefined, "list");
});

export const getMezziReportLightServer = cache(async () => {
  return fetchMezziGestitiAuthorizedServer(undefined, "report");
});
