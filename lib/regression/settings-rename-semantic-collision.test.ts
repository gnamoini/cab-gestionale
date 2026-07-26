import assert from "node:assert/strict";
import { detectSemanticCollision } from "@/lib/settings/rename-engine/rename-semantic-collision";
import { buildRenamePlan } from "@/lib/settings/rename-engine/rename-plan";

const plan = buildRenamePlan({ kind: "cliente", oldLabel: "Si.eco", newLabel: "SI.ECO Srl" });
const report = detectSemanticCollision(plan, ["SI ECO SRL", "Altro cliente"]);
assert.equal(report.hasCollision, true);
assert.ok(report.items[0]!.similarity >= 85);

console.log("settings-rename-semantic-collision.test.ts OK");
