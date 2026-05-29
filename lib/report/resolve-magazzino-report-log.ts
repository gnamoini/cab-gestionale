import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import { readLocalMagazzinoLogCache } from "@/lib/magazzino/magazzino-change-log-storage";
import {
  isLocalMagazzinoLogDuplicate,
  type MagazzinoLogFeedItem,
} from "@/lib/magazzino/magazzino-log-feed-merge";
import type { LogModificaWithProfileRow } from "@/src/types/supabase-tables";

/** localStorage: solo cache opzionale (undo non ancora su server). */
export { readLocalMagazzinoLogCache };

function logRowToChangeEntry(row: LogModificaWithProfileRow): MagazzinoChangeLogEntry | null {
  if (row.entita !== "magazzino_ricambi") return null;
  const az = row.azione.toUpperCase();
  const tipo =
    az === "CREATE" ? "aggiunta" : az === "DELETE" ? "rimozione" : az === "UPDATE" ? "update" : null;
  if (!tipo) return null;

  const payload = row.payload;
  let changes: MagazzinoChangeLogEntry["changes"] = [];
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const p = payload as Record<string, unknown>;
    const diff = p.diff ?? p.changes;
    if (Array.isArray(diff)) {
      changes = diff
        .filter((c) => c && typeof c === "object")
        .map((c) => {
          const x = c as Record<string, unknown>;
          return {
            campo: typeof x.campo === "string" ? x.campo : String(x.field ?? ""),
            prima: typeof x.prima === "string" ? x.prima : String(x.before ?? ""),
            dopo: typeof x.dopo === "string" ? x.dopo : String(x.after ?? ""),
          };
        });
    }
  }

  return {
    id: `server-${row.id}`,
    tipo,
    ricambioId: row.entita_id,
    ricambio: "",
    autore: "Sistema",
    at: row.created_at,
    riepilogo: row.azione,
    changes,
    annullato: false,
  };
}

/** Server authoritative + overlay local non duplicato (report / KPI log). */
export function resolveMagazzinoReportLogEntries(
  localEntries: MagazzinoChangeLogEntry[],
  serverRows: LogModificaWithProfileRow[],
  serverFeedItems?: MagazzinoLogFeedItem[],
): MagazzinoChangeLogEntry[] {
  const fromLocal = localEntries.filter(
    (e) => !e.annullato && !isLocalMagazzinoLogDuplicate(e, serverRows),
  );

  const fromServerFeed = (serverFeedItems ?? [])
    .map((item) => item.localEntry)
    .filter((e): e is MagazzinoChangeLogEntry => e != null);

  const fromServerRows: MagazzinoChangeLogEntry[] = [];
  for (const row of serverRows) {
    if (row.entita !== "magazzino_ricambi") continue;
    const entry = logRowToChangeEntry(row);
    if (entry) fromServerRows.push(entry);
  }

  const byId = new Map<string, MagazzinoChangeLogEntry>();
  for (const e of [...fromServerRows, ...fromLocal, ...fromServerFeed]) {
    byId.set(e.id, e);
  }

  return [...byId.values()].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 200);
}
