import { buildMagazzinoGestionaleLogViewModel } from "@/lib/gestionale-log/view-model";
import type { GestionaleLogViewModel } from "@/lib/gestionale-log/view-model";
import {
  isHiddenStockTimelinePayload,
  parseStockMovementAuditPayload,
} from "@/lib/magazzino/stock-audit-payload";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import type { LogModificaRow, LogModificaWithProfileRow } from "@/src/types/supabase-tables";

export type MagazzinoLogFeedItem = {
  id: string;
  source: "server" | "local";
  ricambioId: string;
  vm: GestionaleLogViewModel;
  localEntry?: MagazzinoChangeLogEntry;
  serverRow?: LogModificaRow;
  movimentoId?: string | null;
  atMs: number;
};

const DEDUPE_WINDOW_MS = 120_000;

function collectRevertedLogTargets(rows: readonly LogModificaRow[]): Set<string> {
  const targets = new Set<string>();
  for (const row of rows) {
    const p = row.payload;
    if (!p || typeof p !== "object" || Array.isArray(p)) continue;
    const rid = (p as Record<string, unknown>).reverted_log_id;
    if (typeof rid === "string" && rid.trim()) targets.add(rid.trim());
  }
  return targets;
}

function movimentoIdFromLogRow(row: LogModificaRow): string | null {
  const stock = parseStockMovementAuditPayload(row.payload);
  if (stock?.movimentoId) return stock.movimentoId;
  if (row.entita === "movimenti_ricambi" && row.entita_id?.trim()) return row.entita_id.trim();
  return null;
}

function ricambioIdFromMovimentoRow(row: LogModificaRow): string | null {
  const stock = parseStockMovementAuditPayload(row.payload);
  if (stock?.ricambioId) return stock.ricambioId;
  const p = row.payload;
  if (!p || typeof p !== "object" || Array.isArray(p)) return null;
  const payload = p as Record<string, unknown>;
  const rootId = payload.ricambio_id ?? payload.ricambioId;
  if (typeof rootId === "string" && rootId.trim()) return rootId.trim();
  for (const rec of [payload.snapshot, payload.after, payload.before]) {
    if (!rec || typeof rec !== "object" || Array.isArray(rec)) continue;
    const rid = (rec as Record<string, unknown>).ricambio_id;
    if (typeof rid === "string" && rid.trim()) return rid.trim();
  }
  return null;
}

export function isHiddenMagazzinoStockLogRow(row: LogModificaRow): boolean {
  return isHiddenStockTimelinePayload(row.payload);
}

export function isLocalMagazzinoLogDuplicate(
  local: MagazzinoChangeLogEntry,
  serverRows: LogModificaWithProfileRow[],
): boolean {
  const tLocal = new Date(local.at).getTime();
  if (Number.isNaN(tLocal)) return false;
  const isScortaUpdate =
    local.tipo === "update" && local.changes.some((c) => c.campo === "Scorta");

  for (const row of serverRows) {
    const tServer = new Date(row.created_at).getTime();
    if (Number.isNaN(tServer) || Math.abs(tServer - tLocal) > DEDUPE_WINDOW_MS) continue;
    const az = row.azione.toUpperCase();

    if (row.entita === "magazzino_ricambi" && row.entita_id === local.ricambioId) {
      if (local.tipo === "aggiunta" && az === "CREATE") return true;
      if (local.tipo === "rimozione" && az === "DELETE") return true;
      if (isScortaUpdate && az === "UPDATE") return true;
    }

    if (isScortaUpdate && row.entita === "movimenti_ricambi" && az === "CREATE") {
      const rid = ricambioIdFromMovimentoRow(row);
      if (rid === local.ricambioId) return true;
    }
  }
  return false;
}

export function mergeMagazzinoLogFeed(
  localEntries: MagazzinoChangeLogEntry[],
  serverItems: MagazzinoLogFeedItem[],
  serverRows: LogModificaWithProfileRow[],
): MagazzinoLogFeedItem[] {
  const revertedTargets = collectRevertedLogTargets(serverRows);
  const visibleServerItems = serverItems
    .filter((item) => {
      if (item.serverRow?.azione === "reverted") return false;
      return !item.serverRow || !isHiddenMagazzinoStockLogRow(item.serverRow);
    })
    .map((item) => {
      if (!revertedTargets.has(item.id)) return item;
      return {
        ...item,
        vm: {
          ...item.vm,
          annullato: true,
          tipoRiga: "OPERAZIONE ANNULLATA",
        },
      };
    });

  const serverIds = new Set(visibleServerItems.map((s) => s.id));
  const locals: MagazzinoLogFeedItem[] = [];

  for (const local of localEntries) {
    if (isLocalMagazzinoLogDuplicate(local, serverRows)) continue;
    const vm = buildMagazzinoGestionaleLogViewModel(local);
    locals.push({
      id: local.id,
      source: "local",
      ricambioId: local.ricambioId,
      vm: local.annullato
        ? { ...vm, annullato: true, tipoRiga: "OPERAZIONE ANNULLATA" }
        : vm,
      localEntry: local,
      atMs: new Date(local.at).getTime(),
    });
  }

  const merged = [...visibleServerItems, ...locals].sort((a, b) => b.atMs - a.atMs);
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

export { ricambioIdFromMovimentoRow, movimentoIdFromLogRow };
