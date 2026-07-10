import { useMemo } from "react";
import { LOG_MODIFICHE_RETENTION_PER_ENTITA } from "@/lib/gestionale-log/log-modifiche-retention";
import {
  buildLogModificheDisplayEntries,
  logAutoreLabel,
} from "@/lib/gestionale-log/log-modifiche-view-model";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import {
  mergeMagazzinoLogFeed,
  ricambioIdFromMovimentoRow,
  type MagazzinoLogFeedItem,
} from "@/lib/magazzino/magazzino-log-feed-merge";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { useLogListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useGestionaleQueryOpts } from "@/src/hooks/gestionale/use-gestionale-query-opts";
import type { LogModificaAutoreSource } from "@/lib/gestionale-log/log-modifiche-view-model";

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

    const resolveOggetto = (row: LogModificaAutoreSource) => {
      if (row.entita === "magazzino_ricambi") {
        return prodottiById.get(row.entita_id)?.descrizione;
      }
      if (row.entita === "movimenti_ricambi") {
        const rid = ricambioIdFromMovimentoRow(row);
        if (rid) return prodottiById.get(rid)?.descrizione;
      }
      return undefined;
    };

    return buildLogModificheDisplayEntries(serverRows, resolveAutore, { resolveOggetto }).map((entry) => ({
      id: entry.id,
      source: "server" as const,
      ricambioId:
        entry.row.entita === "magazzino_ricambi"
          ? entry.row.entita_id
          : ricambioIdFromMovimentoRow(entry.row) ?? entry.row.entita_id,
      vm: entry.vm,
      atMs: new Date(entry.row.created_at).getTime(),
    }));
  }, [enabled, serverRows, opts.authorName, opts.userId, prodottiById]);

  const feed = useMemo(
    () => (enabled ? mergeMagazzinoLogFeed(opts.localEntries, serverItems, serverRows) : []),
    [enabled, opts.localEntries, serverItems, serverRows],
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

  const isLoading = enabled && (magLogsQ.isLoading || movLogsQ.isLoading);

  return {
    feed,
    timelineByRicambio,
    isLoading,
    isLocalId: (id: string) => id.startsWith(LOCAL_LOG_ID_PREFIX),
  };
}
