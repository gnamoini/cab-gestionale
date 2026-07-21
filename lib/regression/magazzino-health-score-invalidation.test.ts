import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isLocalMagazzinoLogDuplicate } from "@/lib/magazzino/magazzino-log-feed-merge";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const inv = fs.readFileSync(path.join(ROOT, "src/lib/react-query/invalidate-related.ts"), "utf8");
assert.match(inv, /invalidateAfterMagazzinoOrMovimenti/);
assert.match(inv, /\["dashboard",\s*"health-score"\]/);

const local: MagazzinoChangeLogEntry = {
  id: "log-1",
  tipo: "update",
  ricambioId: "ric-1",
  ricambio: "Filtro",
  riepilogo: "Scorta 10 → 9",
  autore: "Test",
  at: "2026-07-21T10:00:00.000Z",
  changes: [{ campo: "Scorta", prima: "10", dopo: "9" }],
};

const serverRows = [
  {
    id: "srv-mov-1",
    entita: "movimenti_ricambi",
    entita_id: "mov-1",
    azione: "CREATE",
    created_at: "2026-07-21T10:00:01.000Z",
    payload: { snapshot: { ricambio_id: "ric-1", tipo: "uscita", quantita: 1 } },
  },
] as Parameters<typeof isLocalMagazzinoLogDuplicate>[1];

assert.equal(isLocalMagazzinoLogDuplicate(local, serverRows), true);

console.log("magazzino-health-score-invalidation.test.ts OK");
