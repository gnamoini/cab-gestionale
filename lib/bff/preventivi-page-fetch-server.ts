import "server-only";

import { cache } from "react";
import { fetchPreventiviBillingStatusServer, fetchPreventiviRecordsServer } from "@/lib/preventivi/preventivi-fetch-server";
import { fetchOrdiniFornitoriRecordsServer } from "@/lib/ordini-fornitori/ordine-fornitore-fetch-server";
import type { PreventiviRecordsPayload } from "@/lib/preventivi/preventivi-list-fetch";
import type { OrdineFornitoreRecord } from "@/lib/ordini-fornitori/types";
import type { PreventivoBillingStatusRow } from "@/src/types/supabase-tables";
import type { ServiceResult } from "@/src/services/service-result";

export type PreventiviPageDTO = {
  preventivi: PreventiviRecordsPayload;
  billing: PreventivoBillingStatusRow[];
  ordini?: OrdineFornitoreRecord[];
};

function unwrap<T>(result: ServiceResult<T>, fallback: T): T {
  return result.success ? (result.data ?? fallback) : fallback;
}

const emptyPreventivi: PreventiviRecordsPayload = { records: [], mezziRows: [] };

/** BFF pagina Preventivi — lista + billing; ordini opzionale (deep link tab). */
export const fetchPreventiviPageDTOServer = cache(async (includeOrdini = false): Promise<PreventiviPageDTO> => {
  const [preventiviRes, billingRes, ordiniRes] = await Promise.all([
    fetchPreventiviRecordsServer(),
    fetchPreventiviBillingStatusServer(),
    includeOrdini ? fetchOrdiniFornitoriRecordsServer() : Promise.resolve(null),
  ]);

  const dto: PreventiviPageDTO = {
    preventivi: unwrap(preventiviRes, emptyPreventivi),
    billing: unwrap(billingRes, []),
  };
  if (includeOrdini && ordiniRes) {
    dto.ordini = unwrap(ordiniRes, []);
  }
  return dto;
});
