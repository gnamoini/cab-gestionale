import assert from "node:assert/strict";
import { buildDdtSemanticKey } from "@/lib/inventory-receiving/ddt-semantic-key";
import { buildApplyPayloadFromDecisions } from "@/lib/inventory-receiving/apply/build-apply-payload";
import { buildTestSnapshot } from "@/lib/regression/rbac-test-fixtures";
import { canAccessPage } from "@/lib/auth/rbac";

assert.equal(
  buildDdtSemanticKey({ supplierLabel: "ACME", documentNumber: "4587", documentDate: "2026-01-15" }),
  "acme|4587|2026-01-15",
);

const payload = buildApplyPayloadFromDecisions([
  {
    lineId: "line-1",
    action: "add",
    finalQuantity: 8,
    finalItemId: "item-1",
  },
]);
assert.equal(payload[0]?.final_quantity, 8);

const operatore = buildTestSnapshot({ userId: "u1", roleKey: "operatore" });
assert.equal(canAccessPage("/magazzino/carichi", { resolved: operatore.resolved }), true);
assert.equal(canAccessPage("/magazzino/carichi/nuovo", { resolved: operatore.resolved }), true);

const admin = buildTestSnapshot({ userId: "u2", roleKey: "addetto_amministrativo" });
assert.equal(canAccessPage("/magazzino/carichi", { resolved: admin.resolved }), false);

console.log("inventory-receiving-permissions.test: OK");
