import assert from "node:assert/strict";
import {
  isReportArchivioCompletataRow,
  lavorazioneListRowToAttiva,
  lavorazioneListRowToArchiviata,
  lavorazioneReportClosureIso,
  splitLavorazioniListRowsForReport,
} from "@/lib/lavorazioni/lavorazioni-report-adapter";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

function mockRow(overrides: Partial<LavorazioneListRow> = {}): LavorazioneListRow {
  return {
    id: "lav-1",
    mezzo_id: "mezzo-1",
    stato: "da_lavorare",
    priorita: "media",
    data_ingresso: "2025-01-10T10:00:00.000Z",
    data_uscita: null,
    note: null,
    created_by: null,
    created_at: "2025-01-10T10:00:00.000Z",
    updated_at: "2025-06-01T12:00:00.000Z",
    archived: false,
    archived_at: null,
    deleted_at: null,
    mezzo: null,
    ...overrides,
  };
}

assert.equal(
  lavorazioneListRowToAttiva(mockRow({ data_uscita: "2025-03-01T00:00:00.000Z" })).dataCompletamento,
  null,
  "attive must not expose data_uscita as dataCompletamento",
);

assert.equal(
  lavorazioneReportClosureIso({
    archived_at: null,
    data_uscita: null,
    updated_at: "2025-06-01T12:00:00.000Z",
  } as Parameters<typeof lavorazioneReportClosureIso>[0] & { updated_at: string }),
  null,
  "closure must not fall back to updated_at",
);

assert.equal(
  lavorazioneReportClosureIso({ archived_at: "2025-04-01T08:00:00.000Z", data_uscita: null }),
  "2025-04-01T08:00:00.000Z",
  "closure prefers archived_at",
);

assert.equal(
  lavorazioneReportClosureIso({ archived_at: null, data_uscita: "2025-04-02T08:00:00.000Z" }),
  "2025-04-02T08:00:00.000Z",
  "closure uses data_uscita when archived_at missing",
);

const archived = lavorazioneListRowToArchiviata(
  mockRow({
    archived: true,
    archived_at: null,
    data_uscita: null,
    updated_at: "2025-06-01T12:00:00.000Z",
  }),
);
assert.equal(archived.dataCompletamento, "", "archived without persistent closure has empty dataCompletamento");
assert.equal(archived.meseCompletamento, "", "archived without persistent closure has empty meseCompletamento");

const split = splitLavorazioniListRowsForReport([
  mockRow({ id: "active", archived: false, data_uscita: "2025-03-01T00:00:00.000Z" }),
  mockRow({ id: "archived", archived: true, archived_at: "2025-05-01T00:00:00.000Z" }),
  mockRow({ id: "deleted", deleted_at: "2025-05-02T00:00:00.000Z" }),
]);
assert.equal(split.attive.length, 1);
assert.equal(split.attive[0]?.id, "active");
assert.equal(split.storico.length, 1);
assert.equal(split.storico[0]?.id, "archived");

assert.equal(
  isReportArchivioCompletataRow(
    mockRow({ archived: true, archived_at: "2025-05-01T00:00:00.000Z" }),
  ),
  true,
  "archived with closure counts as report completata",
);

assert.equal(
  isReportArchivioCompletataRow(
    mockRow({ archived: false, stato: "completata", data_uscita: "2025-03-01T00:00:00.000Z" }),
  ),
  false,
  "in-corso with stato completata must not count as report completata",
);

assert.equal(
  isReportArchivioCompletataRow(
    mockRow({ archived: true, archived_at: null, data_uscita: null, updated_at: "2025-06-01T12:00:00.000Z" }),
  ),
  false,
  "archived without persistent closure must not count as report completata",
);

console.log("lavorazioni-report-adapter.test.ts OK");
