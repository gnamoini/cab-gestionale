import "server-only";

import { cache } from "react";
import { fetchPreventiviBillingStatusServer, fetchPreventiviRecordsServer } from "@/lib/preventivi/preventivi-fetch-server";
import type { PreventiviRecordsPayload } from "@/lib/preventivi/preventivi-list-fetch";
import type { PreventivoBillingStatusRow } from "@/src/types/supabase-tables";
import type { ServiceResult } from "@/src/services/service-result";

export type PreventiviPageDTO = {
  preventivi: PreventiviRecordsPayload;
  billing: PreventivoBillingStatusRow[];
};

function unwrap<T>(result: ServiceResult<T>, fallback: T): T {
  return result.success ? (result.data ?? fallback) : fallback;
}

const emptyPreventivi: PreventiviRecordsPayload = { records: [], mezziRows: [] };

/** BFF pagina Preventivi — lista + billing. */
export const fetchPreventiviPageDTOServer = cache(async (): Promise<PreventiviPageDTO> => {
  const [preventiviRes, billingRes] = await Promise.all([
    fetchPreventiviRecordsServer(),
    fetchPreventiviBillingStatusServer(),
  ]);

  return {
    preventivi: unwrap(preventiviRes, emptyPreventivi),
    billing: unwrap(billingRes, []),
  };
});
