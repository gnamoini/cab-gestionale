import "server-only";

import { cache } from "react";
import { getMagazzinoListServer } from "@/lib/magazzino/magazzino-list-fetch-server";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";
import type { ServiceResult } from "@/src/services/service-result";

export type MagazzinoPageDTO = {
  ricambi: MagazzinoRicambioRow[];
};

function unwrap<T>(result: ServiceResult<T>, fallback: T): T {
  return result.success ? (result.data ?? fallback) : fallback;
}

/** BFF pagina Magazzino — lista ricambi (request-scoped cache). */
export const fetchMagazzinoPageDTOServer = cache(async (): Promise<MagazzinoPageDTO> => {
  const res = await getMagazzinoListServer();
  return { ricambi: unwrap(res, []) };
});
