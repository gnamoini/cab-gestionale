import { useMemo } from "react";
import { LOG_MODIFICHE_RETENTION_PER_ENTITA } from "@/lib/gestionale-log/log-modifiche-retention";
import {
  buildLogModificheDisplayEntries,
  logAutoreLabel,
} from "@/lib/gestionale-log/log-modifiche-view-model";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import {
  mergeMagazzinoLogFeed,
  movimentoIdFromLogRow,
  ricambioIdFromMovimentoRow,
  type MagazzinoLogFeedItem,
} from "@/lib/magazzino/magazzino-log-feed-merge";
import { resolveRicambioOggettoForLogRow } from "@/lib/magazzino/ricambio-log-label";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { useLogListQuery, useMovimentiListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useGestionaleQueryOpts } from "@/src/hooks/gestionale/use-gestionale-query-opts";
import type { LogModificaAutoreSource } from "@/lib/gestionale-log/log-modifiche-view-model";
import { movimentiRowsToLogFeedItems } from "@/lib/magazzino/magazzino-movimenti-feed";
import {
  buildUltimaModificaByRicambioIdFromLocalEntries,
  buildUltimaModificaByRicambioIdFromLogs,
  type MagazzinoUltimaModificaInfo,
} from "@/lib/magazzino/magazzino-ultima-modifica";
import type { LogModificaRow } from "@/src/types/supabase-tables";

const LOCAL_LOG_ID_PREFIX = "log-";

export type { MagazzinoLogFeedItem };

export function useMagazzinoLogFeed(opts: {
  localEntries: MagazzinoChangeLogEntry[];
  prodotti: readonly RicambioMagazzino[];
  authorName: string;
  userId: string | null;
  enabled?: boolean;
}) {
  const enabled = opts.enabled ?? true;
  const gestOpts = useGestionaleQueryOpts();
  const prodottiById = useMemo(() => new Map(opts.prodotti.map((p) => [p.id, p])), [opts.prodotti]);

  const movimentiQ = useMovimentiListQuery(undefined, { ...gestOpts, enabled });

  const magLogsQ = useLogListQuery(
    { entita: "magazzino_ricambi", limit: LOG_MODIFICHE_RETENTION_PER_ENTITA },
    { ...gestOpts, enabled },
  );
  const movLogsQ = useLogListQuery(
    { entita: "movimenti_ricambi", limit: LOG_MODIFICHE_RETENTION_PER_ENTITA },
    { ...gestOpts, enabled },
  );

  // Invalidation via GestionaleRealtimeBridge → dispatchGestionaleAction (log_modifiche / magazzino tables).

  const serverRows = useMemo(
    () => (enabled ? [...(magLogsQ.data ?? []), ...(movLogsQ.data ?? [])] : []),
    [enabled, magLogsQ.data, movLogsQ.data],
  );

  const serverItems = useMemo((): MagazzinoLogFeedItem[] => {
    if (!enabled) return [];
    const resolveAutore = (row: LogModificaAutoreSource) =>
      logAutoreLabel(row, opts.userId, opts.authorName);

    const resolveOggetto = (row: LogModificaAutoreSource) =>
      resolveRicambioOggettoForLogRow(row as LogModificaRow, prodottiById);

    return buildLogModificheDisplayEntries(serverRows, resolveAutore, {
      resolveOggetto,
      ricambiById: prodottiById,
      suppressRevertedOriginals: false,
    }).map((entry) => ({
      id: entry.id,
      source: "server" as const,
      ricambioId:
        entry.row.entita === "magazzino_ricambi"
          ? entry.row.entita_id
          : ricambioIdFromMovimentoRow(entry.row) ?? entry.row.entita_id,
      vm: entry.vm,
      serverRow: entry.row,
      movimentoId: movimentoIdFromLogRow(entry.row),
      atMs: new Date(entry.row.created_at).getTime(),
    }));
  }, [enabled, serverRows, opts.authorName, opts.userId, prodottiById]);

  const movimentiFeedItems = useMemo((): MagazzinoLogFeedItem[] => {
    if (!enabled) return [];
    const rows = movimentiQ.data ?? [];
    if (!rows.length) return [];
    return movimentiRowsToLogFeedItems(rows, prodottiById);
  }, [enabled, movimentiQ.data, prodottiById]);

  const feed = useMemo(
    () =>
      enabled
        ? mergeMagazzinoLogFeed(opts.localEntries, serverItems, serverRows, movimentiFeedItems)
        : [],
    [enabled, opts.localEntries, serverItems, serverRows, movimentiFeedItems],
  );

  const timelineByRicambio = useMemo(() => {
    if (!enabled) return {} as Record<string, MagazzinoLogFeedItem[]>;
    const map: Record<string, MagazzinoLogFeedItem[]> = {};
    for (const item of feed) {
      if (!map[item.ricambioId]) map[item.ricambioId] = [];
      map[item.ricambioId]!.push(item);
    }
    for (const k of Object.keys(map)) {
      map[k] = map[k]!.sort((a, b) => b.atMs - a.atMs).slice(0, 80);
    }
    return map;
  }, [enabled, feed]);

  const isLoading =
    enabled && (magLogsQ.isLoading || movLogsQ.isLoading || movimentiQ.isLoading);

  const ultimaModificaByRicambioId = useMemo((): Map<string, MagazzinoUltimaModificaInfo> => {
    if (!enabled) return new Map();
    const merged = new Map<string, MagazzinoUltimaModificaInfo>();
    const fromServer = buildUltimaModificaByRicambioIdFromLogs(serverRows, {
      currentUserId: opts.userId,
      currentDisplayName: opts.authorName,
    });
    const fromLocal = buildUltimaModificaByRicambioIdFromLocalEntries(opts.localEntries);
    for (const [id, info] of fromServer) merged.set(id, info);
    for (const [id, info] of fromLocal) {
      const existing = merged.get(id);
      if (!existing || info.iso.localeCompare(existing.iso) > 0) {
        merged.set(id, info);
      } else if (info.iso === existing.iso && info.autore.trim() && !existing.autore.trim()) {
        merged.set(id, { ...existing, autore: info.autore });
      }
    }
    return merged;
  }, [enabled, serverRows, opts.localEntries, opts.authorName, opts.userId]);

  return {
    feed,
    timelineByRicambio,
    ultimaModificaByRicambioId,
    isLoading,
    isLocalId: (id: string) => id.startsWith(LOCAL_LOG_ID_PREFIX),
  };
}
