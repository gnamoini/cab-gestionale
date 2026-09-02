import assert from "node:assert/strict";
import { buildEmptyManualPreventivo } from "@/lib/preventivi/build-empty-manual-preventivo";
import { preventivoRecordToInsert } from "@/lib/preventivi/preventivi-db-mapper";
import { pickPreventivoWritePayload } from "@/lib/validation/services/preventivi-payload";

const MEZZO_ID = "550e8400-e29b-41d4-a716-446655440001";

const draft = buildEmptyManualPreventivo("Operatore", []);
const insert = preventivoRecordToInsert(draft, MEZZO_ID);
const picked = pickPreventivoWritePayload(insert as Record<string, unknown>);

assert.equal(
  picked.stato_workflow,
  "bozza",
  "insert write payload must include stato_workflow (NOT NULL column without DB default)",
);

assert.equal(
  insert.stato_workflow,
  "bozza",
  "preventivoRecordToInsert must set stato_workflow column",
);

console.log("preventivo-save-write-path.test.ts OK");
