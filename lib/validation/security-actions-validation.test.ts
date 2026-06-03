import {
  validateSecurityUserBatchPatches,
  validateSetClientLavorazioniAccessInput,
  validateUpdateUserRoleInput,
  validateUserId,
} from "@/lib/validation/security-actions-validation";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const USER_ID = "11111111-1111-4111-8111-111111111111";

assert(validateUserId(USER_ID) === null, "valid uuid");
assert(validateUserId("not-uuid") !== null, "invalid uuid");

const batch = validateSecurityUserBatchPatches([
  { userId: USER_ID, nome: "Mario Rossi", ruolo: "operatore", clientLavorazioniAccess: true },
]);
assert(batch.ok === true, "valid batch");
if (batch.ok) {
  assert(batch.patches.length === 1, "one patch");
  assert(batch.patches[0]?.nome === "Mario Rossi", "nome trimmed");
}

assert(validateSecurityUserBatchPatches([]).ok === true, "empty batch ok");
assert(validateSecurityUserBatchPatches({}).ok === false, "non-array rejected");
assert(
  validateSecurityUserBatchPatches([{ userId: USER_ID, ruolo: "superadmin" }]).ok === false,
  "invalid role rejected",
);

const portal = validateSetClientLavorazioniAccessInput({ userId: USER_ID, enabled: true });
assert(portal.ok === true, "portal access valid");

const role = validateUpdateUserRoleInput({ userId: USER_ID, role: "manager" });
assert(role.ok === true, "role update valid");
if (role.ok) assert(role.role === "manager", "manager role");

console.log("security-actions-validation.test.ts OK");
