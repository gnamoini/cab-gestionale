import assert from "node:assert/strict";
import { getOperationIdsForKind } from "@/lib/settings/rename-engine/rename-operation-registry";

const clienteIds = getOperationIdsForKind("cliente");
assert.ok(clienteIds.includes("cliente.alias.old_label"));
assert.ok(clienteIds.includes("cliente.billing.label"));

console.log("settings-rename-registry.test.ts OK");
