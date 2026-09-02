import assert from "node:assert/strict";
import {
  buildConsolidatedIngressoLavorazionePatch,
} from "@/lib/schede/ingresso-lavorazione-patch";
import { DEFAULT_TAGLIANDO_LAVORAZIONE_FIELDS } from "@/lib/maintenance-plans/tagliando-lavorazione-fields";
import { buildDataIngressoPatchFromFields } from "@/lib/domain/intervento-context/build-edit-lavorazione-patch";
import {
  dedupeIngressoDataIngressoWrite,
  resetIngressoDataIngressoWriteDedupForTests,
} from "@/lib/schede/ingresso-data-ingresso-write-dedup";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { SchedaIngressoFields } from "@/types/schede";

function baseRow(overrides: Partial<LavorazioneListRow> = {}): LavorazioneListRow {
  return {
    id: "lav-1",
    codice: "L-001",
    stato: "in_lavorazione",
    priorita: "normale",
    note: "nota esistente",
    data_ingresso: "2026-01-01",
    mezzo_id: "mezzo-1",
    is_tagliando: false,
    is_garanzia: false,
    is_recidivo: false,
    repair_present: true,
    ...overrides,
  } as LavorazioneListRow;
}

const noteOnly = buildConsolidatedIngressoLavorazionePatch({
  row: baseRow(),
  lavorazioneNote: "nota aggiornata",
});
assert.deepEqual(noteOnly, { note: "nota aggiornata" });
assert.doesNotMatch(Object.keys(noteOnly).join(","), /mezzo_id|data_ingresso/);

const noteAndStato = buildConsolidatedIngressoLavorazionePatch({
  row: baseRow(),
  lavorazioneNote: "nota aggiornata",
  lavorazioneGestione: { stato: "completata" },
});
assert.equal(Object.keys(noteAndStato).length, 2);
assert.equal(noteAndStato.note, "nota aggiornata");
assert.equal(noteAndStato.stato, "completata");

const unchangedTagliando = buildConsolidatedIngressoLavorazionePatch({
  row: baseRow({
    is_tagliando: false,
    is_garanzia: false,
    is_recidivo: false,
    maintenance_execution_kind: "scheduled",
    repair_present: true,
    tagliando_preset_ref: null,
    tagliando_preset_version_ref: null,
    tagliando_assign_preset_to_mezzo: null,
    tagliando_no_preset_reason: null,
  }),
  lavorazioneNote: "nota esistente",
  tagliandoFields: DEFAULT_TAGLIANDO_LAVORAZIONE_FIELDS,
});
assert.equal(Object.keys(unchangedTagliando).length, 0);

const changedTagliando = buildConsolidatedIngressoLavorazionePatch({
  row: baseRow({ is_tagliando: false }),
  tagliandoFields: { ...DEFAULT_TAGLIANDO_LAVORAZIONE_FIELDS, isTagliando: true },
});
assert.equal(changedTagliando.is_tagliando, true);
assert.doesNotMatch(Object.keys(changedTagliando).join(","), /mezzo_id|data_ingresso/);

const unchangedNote = buildConsolidatedIngressoLavorazionePatch({
  row: baseRow({ note: "stessa" }),
  lavorazioneNote: "stessa",
});
assert.equal(Object.keys(unchangedNote).length, 0);

// Fast path patch: data_ingresso idempotente
{
  const row = baseRow({ data_ingresso: "2026-06-01" });
  assert.deepEqual(
    buildDataIngressoPatchFromFields(row, { dataIngresso: "02/06/2026" } as SchedaIngressoFields),
    { data_ingresso: "2026-06-02" },
  );
  assert.deepEqual(
    buildDataIngressoPatchFromFields(row, { dataIngresso: "01/06/2026" } as SchedaIngressoFields),
    {},
  );
}

// Dedup in-flight stesso (lavId, ymd)
async function main(): Promise<void> {
{
  resetIngressoDataIngressoWriteDedupForTests();
  let writes = 0;
  const patch = { data_ingresso: "2026-06-03" };
  const slow = dedupeIngressoDataIngressoWrite("lav-1", patch, async () => {
    writes += 1;
    await new Promise((r) => setTimeout(r, 30));
  });
  const fast = dedupeIngressoDataIngressoWrite("lav-1", patch, async () => {
    writes += 1;
  });
  await Promise.all([slow, fast]);
  assert.equal(writes, 1);
}

console.log("ingresso-backend-sync.test.ts: ok");
}

void main();
