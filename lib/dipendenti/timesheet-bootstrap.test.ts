import assert from "node:assert/strict";
import { planEmployeeBootstrap } from "@/lib/dipendenti/timesheet-bootstrap";
import type { DipendenteRecord } from "@/lib/dipendenti/dipendente-record";
import type { DipendenteTimesheetEmployeeRow } from "@/lib/dipendenti/types";

function row(
  partial: Partial<DipendenteTimesheetEmployeeRow> & Pick<DipendenteTimesheetEmployeeRow, "id" | "display_name">,
): DipendenteTimesheetEmployeeRow {
  return {
    source_addetto_name: null,
    source_addetto_id: null,
    in_settings: true,
    employee_type: "ADDETTO",
    attivo: true,
    created_at: "",
    updated_at: "",
    ...partial,
  };
}

function dip(
  id: string,
  nome: string,
  cognome: string | null,
  employeeType: DipendenteRecord["employeeType"],
  attivo: boolean,
): DipendenteRecord {
  return { id, nome, cognome, colorKey: id, employeeType, attivo };
}

const addettoMarco = dip("addetto-marco", "Marco", "Rossi", "ADDETTO", true);
const addettoLuigi = dip("addetto-luigi", "Luigi", null, "ADDETTO", true);

// Insert nuovo dipendente per id
{
  const plan = planEmployeeBootstrap([], [addettoMarco, addettoLuigi]);
  assert.equal(plan.inserts.length, 2);
  assert.equal(plan.inserts[0]?.sourceAddettoId, "addetto-marco");
  assert.equal(plan.inserts[0]?.displayName, "Marco Rossi");
  assert.equal(plan.inserts[0]?.employeeType, "ADDETTO");
}

// Match per source_addetto_id
{
  const existing = [
    row({
      id: "ts-1",
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
      id: "ts-1",
      display_name: "Marco",
      source_addetto_id: "addetto-marco",
      in_settings: true,
    }),
  ];
  const plan = planEmployeeBootstrap(existing, [addettoMarco]);
  assert.equal(plan.displayUpdates.length, 1);
  assert.equal(plan.displayUpdates[0]?.displayName, "Marco Rossi");
}

// Nessun delete se dipendente rimosso da anagrafica
{
  const existing = [row({ id: "ts-1", display_name: "Marco Rossi", source_addetto_id: "addetto-marco" })];
  const plan = planEmployeeBootstrap(existing, []);
  assert.equal(plan.inserts.length, 0);
  assert.equal(plan.settingsUpdates.some((u) => u.id === "ts-1" && u.inSettings === false), true);
}

// Match legacy employee per display_name completo (non solo nome)
{
  const existing = [
    row({
      id: "ts-1",
      display_name: "Marco Rossi",
      source_addetto_id: null,
      in_settings: true,
    }),
  ];
  const plan = planEmployeeBootstrap(existing, [addettoMarco]);
  assert.equal(plan.inserts.length, 0, "match per display_name completo senza duplicare insert");
}

// INVARIANT: stesso anagrafica id → stesso timesheet row id su ADDETTO→ALTRO
{
  const existing = [
    row({
      id: "ts-marco",
      display_name: "Marco Rossi",
      source_addetto_id: "addetto-marco",
      employee_type: "ADDETTO",
      attivo: true,
      in_settings: true,
    }),
  ];
  const altroMarco = dip("addetto-marco", "Marco", "Rossi", "ALTRO", true);
  const plan = planEmployeeBootstrap(existing, [altroMarco]);
  assert.equal(plan.inserts.length, 0, "no reinsert on type change");
  assert.equal(plan.mirrorUpdates.length, 1);
  assert.equal(plan.mirrorUpdates[0]?.id, "ts-marco");
  assert.equal(plan.mirrorUpdates[0]?.employeeType, "ALTRO");
}

// INVARIANT: ATTIVO→INATTIVO aggiorna mirror senza insert
{
  const existing = [
    row({
      id: "ts-luigi",
      display_name: "Luigi",
      source_addetto_id: "addetto-luigi",
      employee_type: "ADDETTO",
      attivo: true,
      in_settings: true,
    }),
  ];
  const inattivo = dip("addetto-luigi", "Luigi", null, "ADDETTO", false);
  const plan = planEmployeeBootstrap(existing, [inattivo]);
  assert.equal(plan.inserts.length, 0);
  assert.equal(plan.mirrorUpdates[0]?.id, "ts-luigi");
  assert.equal(plan.mirrorUpdates[0]?.attivo, false);
  assert.equal(plan.mirrorUpdates[0]?.inSettings, false);
}

console.log("timesheet-bootstrap.test.ts OK");
