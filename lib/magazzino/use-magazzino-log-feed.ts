"use client";

import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  buildLogModificheDisplayEntries,
  logAutoreLabel,
} from "@/lib/gestionale-log/log-modifiche-view-model";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import { buildMagazzinoGestionaleLogViewModel } from "@/lib/gestionale-log/view-model";
import type { GestionaleLogViewModel } from "@/lib/gestionale-log/view-model";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { useCabSyncListener } from "@/src/hooks/use-cab-sync-listener";
import { useLogListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useGestionaleQueryOpts } from "@/src/hooks/gestionale/use-gestionale-query-opts";
import { QK } from "@/src/lib/react-query/invalidate-related";
import type { LogModificaAutoreSource } from "@/lib/gestionale-log/log-modifiche-view-model";
import type { LogModificaRow, LogModificaWithProfileRow } from "@/src/types/supabase-tables";

const LOCAL_LOG_ID_PREFIX = "log-";
const DEDUPE_WINDOW_MS = 120_000;

export type MagazzinoLogFeedItem = {
  id: string;
  source: "server" | "local";
  ricambioId: string;
  vm: GestionaleLogViewModel;
  /** Presente solo per voci locali (undo scorta). */
  localEntry?: MagazzinoChangeLogEntry;
  atMs: number;
};

function ricambioIdFromMovimentoRow(row: LogModificaRow): string | null {
  const p = row.payload;
  if (!p || typeof p !== "object" || Array.isArray(p)) return null;
  const payload = p as Record<string, unknown>;
  for (const rec of [payload.snapshot, payload.after, payload.before]) {
    if (!rec || typeof rec !== "object" || Array.isArray(rec)) continue;
    const rid = (rec as Record<string, unknown>).ricambio_id;
    if (typeof rid === "string" && rid.trim()) return rid.trim();
  }
  return null;
}

function isLocalOnlyDuplicate(
  local: MagazzinoChangeLogEntry,
  serverRows: LogModificaWithProfileRow[],
): boolean {
  const tLocal = new Date(local.at).getTime();
  if (Number.isNaN(tLocal)) return false;

  for (const row of serverRows) {
    if (row.entita !== "magazzino_ricambi") continue;
    if (row.entita_id !== local.ricambioId) continue;
    const tServer = new Date(row.created_at).getTime();
    if (Number.isNaN(tServer) || Math.abs(tServer - tLocal) > DEDUPE_WINDOW_MS) continue;

    const az = row.azione.toUpperCase();
    if (local.tipo === "aggiunta" && az === "CREATE") return true;
    if (local.tipo === "rimozione" && az === "DELETE") return true;
    if (local.tipo === "update" && az === "UPDATE") {
      const changes = local.changes;
      if (changes.length === 1 && changes[0]?.campo === "Scorta") return true;
    }
  }
  return false;
}

function mergeMagazzinoLogFeed(
  localEntries: MagazzinoChangeLogEntry[],
  serverItems: MagazzinoLogFeedItem[],
  serverRows: LogModificaWithProfileRow[],
): MagazzinoLogFeedItem[] {
  const serverIds = new Set(serverItems.map((s) => s.id));
  const locals: MagazzinoLogFeedItem[] = [];

  for (const local of localEntries) {
    if (local.annullato) continue;
    if (isLocalOnlyDuplicate(local, serverRows)) continue;
    locals.push({
      id: local.id,
      source: "local",
      ricambioId: local.ricambioId,
      vm: buildMagazzinoGestionaleLogViewModel(local),
      localEntry: local,
      atMs: new Date(local.at).getTime(),
    });
  }

  const merged = [...serverItems, ...locals].sort((a, b) => b.atMs - a.atMs);
  const seen = new Set<string>();
  const out: MagazzinoLogFeedItem[] = [];
  for (const item of merged) {
    const key = `${item.ricambioId}:${item.vm.tipoRiga}:${item.atMs}:${item.source}`;
    if (item.source === "server" && seen.has(item.id)) continue;
    if (item.source === "local" && serverIds.has(item.id)) continue;
    seen.add(item.id);
    seen.add(key);
    out.push(item);
  }
  return out.slice(0, 200);
}

export function useMagazzinoLogFeed(opts: {
  localEntries: MagazzinoChangeLogEntry[];
  prodotti: readonly RicambioMagazzino[];
  authorName: string;
  userId: string | null;
}) {
  const qc = useQueryClient();
  const gestOpts = useGestionaleQueryOpts();
  const prodottiById = useMemo(() => new Map(opts.prodotti.map((p) => [p.id, p])), [opts.prodotti]);

  const magLogsQ = useLogListQuery({ entita: "magazzino_ricambi", limit: 200 }, gestOpts);
  const movLogsQ = useLogListQuery({ entita: "movimenti_ricambi", limit: 120 }, gestOpts);

  const invalidateLogs = () => {
    void qc.invalidateQueries({ queryKey: QK.log, refetchType: "active" });
  };

  useCabSyncListener("log_modifiche", invalidateLogs);
  useCabSyncListener("magazzino_ricambi", invalidateLogs);
  useCabSyncListener("movimenti_ricambi", invalidateLogs);

  const serverRows = useMemo(
    () => [...(magLogsQ.data ?? []), ...(movLogsQ.data ?? [])],
    [magLogsQ.data, movLogsQ.data],
  );

  const serverItems = useMemo((): MagazzinoLogFeedItem[] => {
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
  }, [serverRows, opts.authorName, opts.userId, prodottiById]);

  const feed = useMemo(
    () => mergeMagazzinoLogFeed(opts.localEntries, serverItems, serverRows),
    [opts.localEntries, serverItems, serverRows],
  );

  const timelineByRicambio = useMemo(() => {
    const map: Record<string, MagazzinoLogFeedItem[]> = {};
    for (const item of feed) {
      if (!map[item.ricambioId]) map[item.ricambioId] = [];
      map[item.ricambioId]!.push(item);
    }
    for (const k of Object.keys(map)) {
      map[k] = map[k]!.sort((a, b) => b.atMs - a.atMs).slice(0, 80);
    }
    return map;
  }, [feed]);

  const isLoading = magLogsQ.isLoading || movLogsQ.isLoading;

  return {
    feed,
    timelineByRicambio,
    isLoading,
    isLocalId: (id: string) => id.startsWith(LOCAL_LOG_ID_PREFIX),
  };
}
