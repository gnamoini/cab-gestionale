import "server-only";

import { cache } from "react";
import { getMezziListLightServer } from "@/lib/mezzi/mezzi-list-fetch-server";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { ServiceResult } from "@/src/services/service-result";

export type MezziPageDTO = {
  mezzi: MezzoGestito[];
};

function unwrap<T>(result: ServiceResult<T>, fallback: T): T {
  return result.success ? (result.data ?? fallback) : fallback;
}

/** BFF pagina Mezzi — lista flotta (request-scoped cache). */
export const fetchMezziPageDTOServer = cache(async (): Promise<MezziPageDTO> => {
  const res = await getMezziListLightServer();
  return { mezzi: unwrap(res, []) };
});
