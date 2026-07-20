import assert from "node:assert/strict";
import { classifyDiaryEntry } from "@/lib/operational-intelligence/diary/classify-diary-entry";

const supplier = classifyDiaryEntry("2026-07-15", "Attesa ricambio pompa lavaggio");
assert.equal(supplier.category, "supplier");
assert.equal(supplier.severity, "medium");

const machine = classifyDiaryEntry("2026-07-15", "Mezzo 42 fermo per guasto critico");
assert.equal(machine.category, "machine");
assert.equal(machine.severity, "high");
