import assert from "node:assert/strict";
import { planEmployeeBootstrap } from "@/lib/dipendenti/timesheet-bootstrap";
import type { DipendenteTimesheetEmployeeRow } from "@/lib/dipendenti/types";

function row(
  partial: Partial<DipendenteTimesheetEmployeeRow> & Pick<DipendenteTimesheetEmployeeRow, "id" | "display_name">,
): DipendenteTimesheetEmployeeRow {
  return {
    source_addetto_name: null,
    source_addetto_id: null,
    in_settings: true,
    created_at: "",
    updated_at: "",
    ...partial,
  };
}

const addettoMarco = { id: "addetto-marco", nome: "Marco", cognome: "Rossi" as string | null };
const addettoLuigi = { id: "addetto-luigi", nome: "Luigi", cognome: null as string | null };

// Insert nuovo addetto per id
{
  const plan = planEmployeeBootstrap([], [addettoMarco, addettoLuigi]);
  assert.equal(plan.inserts.length, 2);
  assert.equal(plan.inserts[0]?.sourceAddettoId, "addetto-marco");
  assert.equal(plan.inserts[0]?.displayName, "Marco Rossi");
}

// Match per source_addetto_id
{
  const existing = [
    row({
      id: "1",
      display_name: "Marco Rossi",
      source_addetto_id: "addetto-marco",
      source_addetto_name: "Marco",
    }),
  ];
  const plan = planEmployeeBootstrap(existing, [addettoMarco]);
  assert.equal(plan.inserts.length, 0);
  assert.equal(plan.displayUpdates.length, 0);
}

// Update displayName quando cambia cognome
{
  const existing = [
    row({
      id: "1",
      display_name: "Marco",
      source_addetto_id: "addetto-marco",
      in_settings: true,
    }),
  ];
  const plan = planEmployeeBootstrap(existing, [addettoMarco]);
  assert.equal(plan.displayUpdates.length, 1);
  assert.equal(plan.displayUpdates[0]?.displayName, "Marco Rossi");
}

// Nessun delete se addetto rimosso
{
  const existing = [row({ id: "1", display_name: "Marco Rossi", source_addetto_id: "addetto-marco" })];
  const plan = planEmployeeBootstrap(existing, []);
  assert.equal(plan.inserts.length, 0);
  assert.equal(plan.settingsUpdates.some((u) => u.id === "1" && u.inSettings === false), true);
}

console.log("timesheet-bootstrap.test.ts OK");
