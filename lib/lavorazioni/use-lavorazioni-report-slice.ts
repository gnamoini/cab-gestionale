"use client";

/* eslint-disable react-hooks/preserve-manual-memoization -- lint phase2: preserve manual memoization contract */

import { useMemo } from "react";
import { enrichLavorazioneListRowsWithMezzi } from "@/lib/db/dto-mappers";
import { mezziGestitiToEmbedMap } from "@/lib/mezzi/mezzi-attrezzature-batch";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { ListQueryResult } from "@/lib/domain/list-types";
import { useLavorazioniList } from "@/src/services/domain/lavorazioni-domain.queries";
import type { LavorazioneFilters, LavorazioneListRow } from "@/src/services/lavorazioni.service";

export type UseLavorazioniReportSliceOpts = {
  archived?: boolean;
  mezziRows?: readonly MezzoGestito[];
  enabled?: boolean;
  staleTime?: number;
};

/** PR-4 — report-mode slice; mezzo embed deferred to caller mezzi cache when provided. */
export function useLavorazioniReportSlice(
  opts?: UseLavorazioniReportSliceOpts,
): ListQueryResult<LavorazioneListRow> {
  const filters = useMemo((): LavorazioneFilters => {
    const f: LavorazioneFilters = { fetchMode: "report", includeMezzo: false };
    if (opts?.archived !== undefined) f.archived = opts.archived;
    return f;
  }, [opts?.archived]);

  const listQ = useLavorazioniList(filters, {
    enabled: opts?.enabled !== false,
    staleTime: opts?.staleTime,
  });

  const data = useMemo(() => {
    const rows = listQ.data ?? [];
    const mezziRows = opts?.mezziRows;
    if (!mezziRows?.length) return rows;
    const needsEnrich = rows.some((row) => Boolean(row.mezzo_id?.trim()) && row.mezzo == null);
    if (!needsEnrich) return rows;
    return enrichLavorazioneListRowsWithMezzi(rows, mezziGestitiToEmbedMap(mezziRows));
  }, [listQ.data, opts?.mezziRows]);

  return { ...listQ, data };
}
