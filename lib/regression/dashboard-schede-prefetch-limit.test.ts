import assert from "node:assert/strict";
import { DASHBOARD_SCHEde_PREFETCH_LIMIT, pickDashboardPriorityLavorazioneIds } from "@/lib/view/dashboard-widgets-selectors";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

function lavRow(id: string, priorita: string): LavorazioneListRow {
  return { id, priorita, updated_at: "2026-01-01T10:00:00Z" } as LavorazioneListRow;
}

const ids = pickDashboardPriorityLavorazioneIds(
  [
    lavRow("a", "bassa"),
    lavRow("b", "urgente"),
    lavRow("c", "alta"),
    lavRow("d", "media"),
    lavRow("e", "bassa"),
    lavRow("f", "alta"),
    lavRow("g", "urgente"),
    lavRow("h", "bassa"),
    lavRow("i", "media"),
  ],
  DASHBOARD_SCHEde_PREFETCH_LIMIT,
);

assert.equal(ids.length, DASHBOARD_SCHEde_PREFETCH_LIMIT);
assert.deepEqual(ids, ["b", "g", "c", "f", "d", "i", "a", "e"]);

console.log("dashboard-schede-prefetch-limit.test.ts OK");
