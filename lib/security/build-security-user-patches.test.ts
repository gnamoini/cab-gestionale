import assert from "node:assert/strict";
import {
  buildSecurityUserPatches,
  type EditableSecurityUser,
} from "@/lib/security/build-security-user-patches";

const USER_ID = "11111111-1111-4111-8111-111111111111";

function baseUser(overrides: Partial<EditableSecurityUser> = {}): EditableSecurityUser {
  return {
    id: USER_ID,
    nome: "Cliente",
    cognome: null,
    username: "cliente",
    email: "cliente@test.it",
    ruolo: "cliente",
    clienteRef: null,
    createdAt: null,
    lastSignInAt: null,
    accountEnabled: true,
    bannedUntil: null,
    clientLavorazioniAccess: true,
    clientLavorazioniAccessFromRole: true,
    hasModulePermissionOverrides: false,
    ...overrides,
  };
}

const saved = [baseUser({ clienteRef: null })];
const draftWithCliente = [baseUser({ clienteRef: "AMIU Bari" })];
const draftUnchanged = [baseUser({ clienteRef: null })];

import { rbacSeedPermissionKeysForRole } from "@/lib/rbac-seed";

const patches = buildSecurityUserPatches(saved, draftWithCliente, {}, {}, [], {
  cliente: rbacSeedPermissionKeysForRole("cliente"),
});
assert.equal(patches.length, 1, "one patch when clienteRef changes");
assert.equal(patches[0]?.userId, USER_ID, "patch userId");
assert.equal(patches[0]?.clienteRef, "AMIU Bari", "patch clienteRef");

const noPatches = buildSecurityUserPatches(saved, draftUnchanged, {}, {}, [], {
  cliente: rbacSeedPermissionKeysForRole("cliente"),
});
assert.equal(noPatches.length, 0, "no patch when clienteRef unchanged");

console.log("build-security-user-patches.test.ts OK");
