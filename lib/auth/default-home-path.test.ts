import assert from "node:assert/strict";
import { defaultHomePathForRole, resolveFirstAccessiblePageHref } from "@/lib/auth/rbac";

assert.equal(defaultHomePathForRole("operatore"), "/agenda");
assert.equal(defaultHomePathForRole("cliente"), "/lavorazioni-clienti");
assert.equal(defaultHomePathForRole("manager"), "/dashboard");
assert.equal(defaultHomePathForRole("guest"), "/dashboard");

assert.equal(
  resolveFirstAccessiblePageHref({
    roleKey: "operatore",
    rolePageAccess: { dashboard: "write" },
  }),
  "/dashboard",
  "DB override can restore dashboard when explicitly granted",
);

console.log("default-home-path.test.ts OK");
