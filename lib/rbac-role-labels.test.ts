import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { CANONICAL_ROLES, ROLE_LABELS } from "@/lib/rbac";
import { roleLabel } from "@/lib/auth/rbac";

assert.deepEqual(ROLE_LABELS, {
  admin: "Admin",
  manager: "Direttore",
  operatore: "Personale Tecnico",
  addetto_amministrativo: "Personale Amministrativo",
  guest: "Ospite",
  cliente: "Cliente",
});

for (const role of CANONICAL_ROLES) {
  assert.equal(roleLabel(role), ROLE_LABELS[role], `roleLabel(${role})`);
}

const ROOT = process.cwd();
const LEGACY_LABELS = [
  "Admin System",
  "Admin Operativo",
  "Personale Officina",
  "Addetto Preventivi",
  "Viewer / Audit",
  "Viewer/Audit",
];

for (const label of LEGACY_LABELS) {
  for (const rel of [
    "lib/auth/rbac.ts",
    "lib/rbac.ts",
    "components/dashboard/security/security-user-module-permissions-editor.tsx",
    "src/actions/security-users-permissions.ts",
  ]) {
    const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
    assert.doesNotMatch(src, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${rel} still has legacy label: ${label}`);
  }
}

console.log("rbac-role-labels.test.ts OK");
