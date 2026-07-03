import assert from "node:assert/strict";
import {
  assertKanbanPartitionInvariant,
  compareKanbanCards,
  isKanbanCompletateRow,
  isKanbanVisible,
  partitionKanbanByColumn,
  partitionKanbanRows,
  sortKanbanCards,
} from "@/lib/lavorazioni/kanban-operational";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

const STATI: StatoLavorazioneConfig[] = [
  { id: "accettazione", label: "Accettazione", color: "#52525b" },
  { id: "in_lavorazione", label: "In lavorazione", color: "#0284c7" },
  { id: "completata", label: "Completata", color: "#15803d", closed: true },
];

const STATI_WITH_ATTESA: StatoLavorazioneConfig[] = [
  { id: "accettazione", label: "Accettazione", color: "#52525b" },
  { id: "attesa_preventivo", label: "Attesa preventivo", color: "#ea580c" },
  { id: "in_lavorazione", label: "In lavorazione", color: "#0284c7" },
  { id: "completata", label: "Completata", color: "#15803d", closed: true },
];

const COLUMNS_IN_CORSO: StatoLavorazioneConfig[] = STATI_WITH_ATTESA.filter((s) => s.id !== "completata");

function row(overrides: Partial<LavorazioneListRow> & { id: string }): LavorazioneListRow {
  const now = "2026-01-15T10:00:00.000Z";
  const { id, ...rest } = overrides;
  return {
    codice: "26-0001",
    stato: "in_lavorazione",
    priorita: "media",
    mezzo_id: "",
    data_ingresso: now,
    data_uscita: null,
    note: null,
    archived: false,
    archived_at: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    created_by: null,
    mezzo: null,
    id,
    ...rest,
  };
}

// Caso 1: completata non archiviata → visibile in COMPLETATE
{
  const r = row({ id: "c1", stato: "completata", archived: false });
  assert.equal(isKanbanVisible(r), true);
  assert.equal(isKanbanCompletateRow(r, STATI), true);
  const { completate } = partitionKanbanRows([r], STATI);
  assert.equal(completate.length, 1);
  assert.equal(completate[0]?.id, "c1");
}

// Caso 2: completata archiviata → NON visibile
{
  const r = row({ id: "c2", stato: "completata", archived: true });
  assert.equal(isKanbanVisible(r), false);
  assert.equal(isKanbanCompletateRow(r, STATI), false);
  const { operational, completate } = partitionKanbanRows([r], STATI);
  assert.equal(operational.length, 0);
  assert.equal(completate.length, 0);
}

// Caso 3: urgente + vecchia → sopra le altre urgenti
{
  const old = row({ id: "u-old", priorita: "urgente", data_ingresso: "2026-01-10T00:00:00.000Z" });
  const mid = row({ id: "u-mid", priorita: "urgente", data_ingresso: "2026-01-15T00:00:00.000Z" });
  const sorted = sortKanbanCards([mid, old]);
  assert.deepEqual(
    sorted.map((r) => r.id),
    ["u-old", "u-mid"],
  );
}

// Caso 4: urgente + nuova → sotto urgenti più vecchie
{
  const old = row({ id: "u4-old", priorita: "urgente", data_ingresso: "2026-01-10T00:00:00.000Z" });
  const neu = row({ id: "u4-new", priorita: "urgente", data_ingresso: "2026-01-20T00:00:00.000Z" });
  assert.ok(compareKanbanCards(old, neu) < 0);
}

// Caso 5: alta + molto vecchia → sopra ALTA più recenti
{
  const oldAlta = row({ id: "a-old", priorita: "alta", data_ingresso: "2026-01-01T00:00:00.000Z" });
  const newAlta = row({ id: "a-new", priorita: "alta", data_ingresso: "2026-01-25T00:00:00.000Z" });
  const sorted = sortKanbanCards([newAlta, oldAlta]);
  assert.deepEqual(
    sorted.map((r) => r.id),
    ["a-old", "a-new"],
  );
}

// Caso 6: ordine stabile (tie-breaker id)
{
  const sameIngresso = "2026-01-10T00:00:00.000Z";
  const a = row({
    id: "aaa",
    priorita: "media",
    data_ingresso: sameIngresso,
    created_at: "2026-01-10T08:00:00.000Z",
  });
  const b = row({
    id: "bbb",
    priorita: "media",
    data_ingresso: sameIngresso,
    created_at: "2026-01-10T08:00:00.000Z",
  });
  const first = sortKanbanCards([b, a]);
  const second = sortKanbanCards([b, a]);
  assert.deepEqual(
    first.map((r) => r.id),
    second.map((r) => r.id),
  );
  assert.deepEqual(
    first.map((r) => r.id),
    ["aaa", "bbb"],
  );
}

// Caso 7: partition — nessun id in operational e completate insieme
{
  const open = row({ id: "op1", stato: "in_lavorazione" });
  const done = row({ id: "done1", stato: "completata" });
  const archived = row({ id: "arch1", stato: "completata", archived: true });
  const { operational, completate } = partitionKanbanRows([open, done, archived], STATI);
  assert.deepEqual(
    operational.map((r) => r.id),
    ["op1"],
  );
  assert.deepEqual(
    completate.map((r) => r.id),
    ["done1"],
  );
  const opIds = new Set(operational.map((r) => r.id));
  for (const r of completate) {
    assert.equal(opIds.has(r.id), false, `duplicate id in both buckets: ${r.id}`);
  }
}

// Caso 8: partitionKanbanByColumn — attesa preventivo in nested subset only
{
  const rawRowsFixture: LavorazioneListRow[] = [
    row({ id: "acc1", stato: "accettazione" }),
    row({ id: "ap1", stato: "attesa_preventivo" }),
    row({ id: "lav1", stato: "in_lavorazione" }),
  ];
  const partition = partitionKanbanByColumn(rawRowsFixture, COLUMNS_IN_CORSO, STATI_WITH_ATTESA);
  assert.deepEqual(partition.attesaPreventivoNested.map((r) => r.id), ["ap1"]);
  assert.deepEqual(partition.byStato.get("accettazione")?.map((r) => r.id), ["acc1"]);
  assert.deepEqual(partition.byStato.get("in_lavorazione")?.map((r) => r.id), ["lav1"]);
  assert.equal(partition.unmapped.length, 0);
  assertKanbanPartitionInvariant(partition, rawRowsFixture, STATI_WITH_ATTESA);
}

// Caso 9: partitionKanbanByColumn — stato sconosciuto → unmapped only
{
  const rawRowsFixture: LavorazioneListRow[] = [row({ id: "unk1", stato: "stato_inesistente_xyz" })];
  const partition = partitionKanbanByColumn(rawRowsFixture, COLUMNS_IN_CORSO, STATI_WITH_ATTESA);
  assert.deepEqual(partition.unmapped.map((r) => r.id), ["unk1"]);
  assert.equal(partition.attesaPreventivoNested.length, 0);
  assert.equal([...partition.byStato.values()].flat().length, 0);
  assertKanbanPartitionInvariant(partition, rawRowsFixture, STATI_WITH_ATTESA);
}

// Caso 10: unmapped sempre presente (anche vuoto)
{
  const rawRowsFixture: LavorazioneListRow[] = [row({ id: "op1", stato: "in_lavorazione" })];
  const partition = partitionKanbanByColumn(rawRowsFixture, COLUMNS_IN_CORSO, STATI_WITH_ATTESA);
  assert.ok(Array.isArray(partition.unmapped));
  assert.equal(partition.unmapped.length, 0);
}

console.log("kanban-operational.test.ts OK");
