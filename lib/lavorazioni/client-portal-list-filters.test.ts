import assert from "node:assert/strict";
import {
  lavRowCompletamentoInRange,
  lavRowMatchesAdvancedFilters,
  LAVORAZIONI_ADVANCED_FILTERS_EMPTY,
} from "@/lib/lavorazioni/lavorazioni-advanced-filters";
import {
  clientPortalBundleMatchesFilters,
  CLIENT_PORTAL_FILTERS_EMPTY,
  type ClientPortalRowBundle,
} from "@/lib/lavorazioni/client-portal-list-filters";
import { buildClientPortalRowFields } from "@/lib/lavorazioni/client-portal-row-fields";
import { lavRowMatchesGlobalSearch } from "@/lib/lavorazioni/lavorazioni-list-ui-filters";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

function sampleRow(overrides: Partial<LavorazioneListRow> = {}): LavorazioneListRow {
  return {
    id: "lav-001",
    mezzo_id: "mezzo-1",
    stato: "in_lavorazione",
    priorita: "normale",
    data_ingresso: "2026-05-01T10:00:00.000Z",
    data_uscita: null,
    note: "Nota test ricerca",
    created_at: "2026-05-01T10:00:00.000Z",
    updated_at: "2026-05-01T10:00:00.000Z",
    archived: false,
    archived_at: null,
    deleted_at: null,
    mezzo: null,
    ...overrides,
  } as LavorazioneListRow;
}

const emptySchede = {};

// Completamento filter must not hide in-corso rows without data_uscita
{
  const row = sampleRow({ data_uscita: null, archived: false });
  const filters = {
    ...LAVORAZIONI_ADVANCED_FILTERS_EMPTY,
    completamentoDa: "2026-01-01",
    completamentoA: "2026-12-31",
  };
  assert.equal(
    lavRowMatchesAdvancedFilters(row, filters, emptySchede, "", "in_corso"),
    true,
    "in_corso rows ignore completamento filter",
  );
  assert.equal(
    lavRowMatchesAdvancedFilters(row, filters, emptySchede, "", "archivio"),
    false,
    "archivio rows without completion date are excluded",
  );
}

// Archivio completamento uses archived_at fallback
{
  const row = sampleRow({
    archived: true,
    data_uscita: null,
    archived_at: "2026-05-15T12:00:00.000Z",
  });
  assert.equal(lavRowCompletamentoInRange(row, "2026-05-01", "2026-05-31"), true);
}

// Shared search haystack finds note and id
{
  const row = sampleRow({ note: "Nota test ricerca", id: "lav-001" });
  assert.equal(lavRowMatchesGlobalSearch(row, "nota test", emptySchede), true);
  assert.equal(lavRowMatchesGlobalSearch(row, "lav-001", emptySchede), true);
  assert.equal(lavRowMatchesGlobalSearch(row, "stato inesistente xyz", emptySchede), false);
}

// Portal bundle filter uses shared search
{
  const row = sampleRow({ note: "xyz-unique-note" });
  const fields = buildClientPortalRowFields(row, emptySchede, [], []);
  const bundle: ClientPortalRowBundle = { row, fields };
  const filters = { ...CLIENT_PORTAL_FILTERS_EMPTY, search: "xyz-unique" };
  assert.equal(
    clientPortalBundleMatchesFilters(bundle, filters, emptySchede, "", "in_corso"),
    true,
  );
}

console.log("client-portal-list-filters.test.ts: ok");
