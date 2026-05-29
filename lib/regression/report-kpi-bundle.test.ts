import assert from "node:assert/strict";
import { buildReportLavorazioniBundle } from "@/lib/report/lavorazioni-report-selectors";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

function mockRow(overrides: Partial<LavorazioneListRow> = {}): LavorazioneListRow {
  return {
    id: "lav-1",
    codice: "L1",
    stato_id: "s1",
    archived: false,
    deleted_at: null,
    created_at: "2025-01-01T00:00:00.000Z",
    updated_at: "2025-01-01T00:00:00.000Z",
    ...overrides,
  } as LavorazioneListRow;
}

const active = mockRow({ id: "a1", archived: false });
const archivedOpen = mockRow({ id: "c1", archived: true, archived_at: null });
const archivedDone = mockRow({
  id: "c2",
  archived: true,
  archived_at: "2025-02-15T10:00:00.000Z",
});

const bundle = buildReportLavorazioniBundle([active, archivedOpen, archivedDone]);

assert.equal(bundle.attive.length, 1);
assert.equal(bundle.attive[0]?.id, "a1");
assert.ok(bundle.storico.length >= 1);
assert.equal(bundle.completate.length, 1);
assert.equal(bundle.completate[0]?.id, "c2");

console.log("report-kpi-bundle.test.ts OK");
