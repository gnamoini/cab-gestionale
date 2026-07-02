import assert from "node:assert/strict";
import { resolveProfileRoleDescription } from "@/lib/profile/resolve-profile-role-description";

assert.equal(resolveProfileRoleDescription("admin"), "Accesso completo al gestionale");
assert.equal(resolveProfileRoleDescription("cliente"), "Accesso al portale clienti");
assert.ok(resolveProfileRoleDescription("guest").length > 0);

console.log("resolve-profile-role-description.test.ts OK");
