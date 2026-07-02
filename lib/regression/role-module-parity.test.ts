/**
 * RBAC v3.1 — parità TS roleModuleDefault / resolveModuleAccess (contratto SQL).
 */
import assert from "node:assert/strict";
import {
  resolveModuleAccess,
  roleModuleDefault,
  resolveCanonicalRole,
} from "@/lib/rbac";
import { GESTIONALE_PERMISSION_MODULES } from "@/src/lib/permissions/gestionale-modules";

const ERP_MODULES = GESTIONALE_PERMISSION_MODULES;

function expectModule(
  role: string,
  module: (typeof ERP_MODULES)[number],
  op: "read" | "write",
  expected: boolean,
) {
  const canonical = resolveCanonicalRole(role);
  const actual = resolveModuleAccess(canonical, module, op);
  assert.equal(actual, expected, `${role} ${module} ${op}`);
}

// operatore: officina only
for (const m of ["magazzino", "lavorazioni", "mezzi", "documenti"] as const) {
  expectModule("operatore", m, "read", true);
  expectModule("operatore", m, "write", true);
}
for (const m of ["preventivi", "fatturazione", "ddt", "ordini_fornitori", "report", "dipendenti"] as const) {
  expectModule("operatore", m, "read", false);
  expectModule("operatore", m, "write", false);
}

// addetto: amministrativo only
for (const m of ["preventivi", "fatturazione", "ddt", "ordini_fornitori", "report"] as const) {
  expectModule("addetto_amministrativo", m, "read", true);
  expectModule("addetto_amministrativo", m, "write", true);
}
expectModule("addetto_amministrativo", "magazzino", "read", false);

// guest: audit read-all
for (const m of ERP_MODULES) {
  expectModule("guest", m, "read", true);
  expectModule("guest", m, "write", false);
}

// manager: all rw
for (const m of ERP_MODULES) {
  const def = roleModuleDefault("manager", m);
  assert.equal(def.canRead, true, `manager ${m} read`);
  assert.equal(def.canWrite, true, `manager ${m} write`);
}

// override beats role default
assert.equal(
  resolveModuleAccess("operatore", "preventivi", "read", {
    can_read: true,
    can_write: false,
  }),
  true,
);
assert.equal(
  resolveModuleAccess("operatore", "preventivi", "write", {
    can_read: true,
    can_write: false,
  }),
  false,
);

// legacy commerciale → addetto
assert.equal(resolveCanonicalRole("commerciale"), "addetto_amministrativo");

console.log("role-module-parity.test.ts OK");
