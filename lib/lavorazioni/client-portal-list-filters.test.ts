import assert from "node:assert/strict";
import {
  lavRowCompletamentoInRange,
  lavRowMatchesAdvancedFilters,
  LAVORAZIONI_ADVANCED_FILTERS_EMPTY,
  FILTER_ALL,
} from "@/lib/lavorazioni/lavorazioni-advanced-filters";
import {
  clientPortalBundleMatchesFilters,
  CLIENT_PORTAL_FILTERS_EMPTY,
  sanitizePersistedPortalFilters,
  type ClientPortalRowBundle,
} from "@/lib/lavorazioni/client-portal-list-filters";
import {
  buildClientPortalRowFields,
  clientPortalIngressoIso,
} from "@/lib/lavorazioni/client-portal-row-fields";
import {
  lavRowMatchesGlobalSearch,
  lavRowMatchesPageFilters,
} from "@/lib/lavorazioni/lavorazioni-list-ui-filters";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneSchedeStore } from "@/types/schede";

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

const emptySchede: LavorazioneSchedeStore = {};

// Completamento filter must not hide in-corso rows without data_uscita
{
  const row = sampleRow({ data_uscita: null, archived: false });
  const filters = {
    ...LAVORAZIONI_ADVANCED_FILTERS_EMPTY,
    completamentoDa: "2026-01-01",
    completamentoA: "2026-12-31",
  };
  assert.equal(
    lavRowMatchesAdvancedFilters(row, filters, emptySchede, "in_corso"),
    true,
    "in_corso rows ignore completamento filter",
  );
  assert.equal(
    lavRowMatchesAdvancedFilters(row, filters, emptySchede, "archivio"),
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
    clientPortalBundleMatchesFilters(bundle, filters, emptySchede, "in_corso"),
    true,
  );
}

// Ingresso range: no active date filters passes even with missing ingresso on row
{
  const row = sampleRow({ data_ingresso: null, created_at: "" });
  assert.equal(lavRowMatchesPageFilters({ ...row, note: "" }, { ...CLIENT_PORTAL_FILTERS_EMPTY, search: "" }, emptySchede, "in_corso"), true);
}

// Intervallo invertito: normalizzato al confronto
{
  const row = sampleRow({ data_ingresso: "2026-05-15T10:00:00.000Z" });
  const filters = {
    ...LAVORAZIONI_ADVANCED_FILTERS_EMPTY,
    ingressoDa: "2026-05-31",
    ingressoA: "2026-05-01",
  };
  assert.equal(
    lavRowMatchesAdvancedFilters(row, filters, emptySchede, "in_corso"),
    true,
    "inverted ingresso range still matches mid-month row",
  );
}

// Gestionale: completamento non filtra in corso
{
  const row = sampleRow({ data_uscita: null, archived: false });
  const pageFilters = {
    search: "",
    ...LAVORAZIONI_ADVANCED_FILTERS_EMPTY,
    completamentoDa: "2026-01-01",
    completamentoA: "2026-12-31",
  };
  assert.equal(
    lavRowMatchesPageFilters(row, pageFilters, emptySchede, "in_corso"),
    true,
    "page filter in_corso ignores completamento",
  );
  assert.equal(
    lavRowMatchesPageFilters(row, pageFilters, emptySchede, "archivio"),
    false,
    "page filter archivio applies completamento",
  );
}

// Scheda dataIngresso non parseabile → fallback DB per filtri portale
{
  const row = sampleRow({ data_ingresso: "2026-05-01T10:00:00.000Z" });
  const schede: LavorazioneSchedeStore = {
    [row.id]: {
      ingresso: { campi: { dataIngresso: "—" } },
    } as LavorazioneSchedeStore[string],
  };
  assert.equal(clientPortalIngressoIso(row, schede), "2026-05-01");
  const fields = buildClientPortalRowFields(row, schede, [], []);
  const bundle: ClientPortalRowBundle = { row, fields };
  assert.equal(
    clientPortalBundleMatchesFilters(bundle, CLIENT_PORTAL_FILTERS_EMPTY, schede, "in_corso"),
    true,
    "malformed scheda ingresso date must not drop row when filters empty",
  );
}

// Migrazione v3→v4 reset list filters obsoleti
{
  const sanitized = sanitizePersistedPortalFilters(
    {
      search: "test",
      addetto: "Addetto Obsoleto",
      marca: "Marca X",
      stato: "lav-stato-in-lavorazione",
    },
    { resetListFilters: true },
  );
  assert.equal(sanitized.search, "test");
  assert.equal(sanitized.addetto, FILTER_ALL);
  assert.equal(sanitized.marca, FILTER_ALL);
  assert.equal(sanitized.stato, FILTER_ALL);
}

console.log("client-portal-list-filters.test.ts: ok");
