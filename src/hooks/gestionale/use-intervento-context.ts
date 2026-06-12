"use client";

import { useMemo } from "react";
import {
  composeInterventoContextFromBundle,
  resolveInterventoDisplay,
} from "@/lib/domain/intervento-context";
import type { InterventoContext, InterventoDisplay } from "@/lib/domain/intervento-context";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import { useSchedeBundle } from "@/src/hooks/use-schede-store-query";
import { useLavorazioneBase } from "@/src/services/domain/lavorazioni-domain.queries";
import type { LavorazioneRow } from "@/src/types/supabase-tables";
import { toMezzoUI } from "@/lib/mezzi/mezzi-db-ui-adapter";
import { useMezziListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";

export function useInterventoContext(
  lavorazioneId: string | undefined,
  options?: {
    enabled?: boolean;
    legacyLavorazione?: LavorazioneAttiva | LavorazioneArchiviata | null;
    mezzoGestito?: MezzoGestito | null;
  },
) {
  const id = lavorazioneId?.trim() ?? "";
  const enabled = (options?.enabled ?? true) && id.length > 0;

  const base = useLavorazioneBase(enabled ? id : undefined);
  const { bundle: schedeBundle, isLoading: schedeBundleLoading } = useSchedeBundle(
    enabled ? id : undefined,
  );
  const mezziQ = useMezziListQuery(undefined, { enabled, staleTime: 30_000 });

  const mezzoRow = useMemo(() => {
    const mezzoId = base.data?.mezzo_id?.trim();
    if (!mezzoId) return null;
    const rows = mezziQ.data ?? [];
    return rows.find((m) => m.id === mezzoId) ?? null;
  }, [base.data?.mezzo_id, mezziQ.data]);

  const mezzoGestito = useMemo(() => {
    if (options?.mezzoGestito) return options.mezzoGestito;
    if (mezzoRow) return toMezzoUI(mezzoRow);
    return null;
  }, [mezzoRow, options?.mezzoGestito]);

  const context = useMemo((): InterventoContext | undefined => {
    if (!enabled || !base.data) return undefined;
    return composeInterventoContextFromBundle(id, schedeBundle ?? null, {
      lavorazioneRow: base.data as LavorazioneRow,
      mezzoRow,
      mezzoGestito,
      legacyLavorazione: options?.legacyLavorazione ?? null,
    });
  }, [
    enabled,
    base.data,
    schedeBundle,
    id,
    mezzoGestito,
    mezzoRow,
    options?.legacyLavorazione,
  ]);

  const display = useMemo((): InterventoDisplay | undefined => {
    if (!context) return undefined;
    return resolveInterventoDisplay(context);
  }, [context]);

  const isLoading = enabled && (base.isLoading || schedeBundleLoading);
  const isError = enabled && base.isError;
  const error = base.error ?? null;

  return {
    context,
    display,
    ident: display?.ident ?? context?.ident,
    isLoading,
    isError,
    error,
  };
}
