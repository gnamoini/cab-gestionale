import assert from "node:assert/strict";
import {
  buildLavorazioneStatoUpdatePatch,
  findKanbanColumnIdForRow,
  isKanbanDropTargetColumnId,
  resolveKanbanDropStato,
} from "@/lib/lavorazioni/kanban-stato-move";
import { KANBAN_UNMAPPED_COLUMN_ID } from "@/lib/lavorazioni/kanban-operational";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

const STATI: StatoLavorazioneConfig[] = [
  { id: "accettazione", label: "Accettazione", color: "#52525b" },
  { id: "attesa_preventivo", label: "Attesa preventivo", color: "#ea580c" },
  { id: "in_lavorazione", label: "In lavorazione", color: "#0284c7" },
  { id: "completata", label: "Completata", color: "#15803d", closed: true },
];

const WORKFLOW_IDS = new Set(["accettazione", "in_lavorazione"]);

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

// patch: stato aperto → azzera data_uscita
{
  const patch = buildLavorazioneStatoUpdatePatch("in_lavorazione", ["completata"]);
  assert.equal(patch.stato, "in_lavorazione");
  assert.equal(patch.data_uscita, null);
}

// patch: stato chiuso → non tocca data_uscita
{
  const patch = buildLavorazioneStatoUpdatePatch("completata", ["completata"]);
  assert.equal(patch.stato, "completata");
  assert.equal(patch.data_uscita, undefined);
}

// resolve drop: unmapped rejected
{
  assert.equal(isKanbanDropTargetColumnId(KANBAN_UNMAPPED_COLUMN_ID), false);
  assert.equal(resolveKanbanDropStato(KANBAN_UNMAPPED_COLUMN_ID, STATI, "completata"), null);
}

// resolve drop: workflow + completate
{
  assert.equal(resolveKanbanDropStato("in_lavorazione", STATI, "completata"), "in_lavorazione");
  assert.equal(resolveKanbanDropStato("completata", STATI, "completata"), "completata");
}

// source column: attesa preventivo nested id
{
  const r = row({ id: "ap1", stato: "attesa_preventivo" });
  assert.equal(
    findKanbanColumnIdForRow(r, STATI, "completata", "attesa_preventivo", WORKFLOW_IDS),
    "attesa_preventivo",
  );
}

// source column: completate bucket
{
  const r = row({ id: "c1", stato: "completata", archived: false });
  assert.equal(
    findKanbanColumnIdForRow(r, STATI, "completata", "attesa_preventivo", WORKFLOW_IDS),
    "completata",
  );
}

console.log("kanban-stato-move.test.ts OK");
