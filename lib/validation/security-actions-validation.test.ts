import {
  validateDeleteUserByAdminInput,
  validateSecurityUserBatchPatches,
  validateSetClientLavorazioniAccessInput,
  validateUpdateUserRoleInput,
  validateUserId,
} from "@/lib/validation/security-actions-validation";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "22222222-2222-4222-8222-222222222222";

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

const moduleRestore = validateSecurityUserBatchPatches([
  { userId: USER_ID, modulePermissions: null },
]);
assert(moduleRestore.ok === true, "modulePermissions null restores from role");

const modulePatch = validateSecurityUserBatchPatches([
  {
    userId: USER_ID,
    modulePermissions: [{ module: "documenti", canRead: true, canWrite: false }],
  },
]);
assert(modulePatch.ok === true, "valid module permission patch");
if (modulePatch.ok) {
  assert(modulePatch.patches[0]?.modulePermissions?.[0]?.module === "documenti", "documenti module");
}

const badModule = validateSecurityUserBatchPatches([
  { userId: USER_ID, modulePermissions: [{ module: "sicurezza", canRead: true, canWrite: false }] },
]);
assert(badModule.ok === false, "invalid module rejected");

const clienteRefPatch = validateSecurityUserBatchPatches([
  { userId: USER_ID, clienteRef: "Rossi SRL" },
]);
assert(clienteRefPatch.ok === true, "clienteRef patch valid");
if (clienteRefPatch.ok) {
  assert(clienteRefPatch.patches[0]?.clienteRef === "Rossi SRL", "clienteRef normalized");
}

const clearClienteRef = validateSecurityUserBatchPatches([{ userId: USER_ID, clienteRef: null }]);
assert(clearClienteRef.ok === true, "clienteRef null clears association");

const deleteSelf = validateDeleteUserByAdminInput(USER_ID, USER_ID);
assert(deleteSelf.ok === false, "self-delete rejected");

const deleteOther = validateDeleteUserByAdminInput(OTHER_USER_ID, USER_ID);
assert(deleteOther.ok === true, "delete other user valid");
if (deleteOther.ok) assert(deleteOther.userId === OTHER_USER_ID, "userId trimmed");

assert(validateDeleteUserByAdminInput("", USER_ID).ok === false, "empty userId rejected");

console.log("security-actions-validation.test.ts OK");
