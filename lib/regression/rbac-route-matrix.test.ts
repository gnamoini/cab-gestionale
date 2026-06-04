import assert from "node:assert/strict";
import { assertRouteProtection } from "@/lib/regression/assert-route-protection";
import { assertPermissionConsistency } from "@/lib/regression/assert-permission-consistency";
import { resolveEffectivePermissions } from "@/src/lib/runtime/truth-layer/resolve-effective-permissions";

const adminSnap = resolveEffectivePermissions({
  userId: "admin-1",
  ruolo: "admin",
  permissionRows: [],
  pilotDbEnabled: false,
});

assertPermissionConsistency(adminSnap);

assertRouteProtection(
  "admin",
  [
    { pathname: "/dashboard", allowed: true },
    { pathname: "/report", allowed: true },
    { pathname: "/impostazioni", allowed: true },
  ],
  adminSnap,
);

const operatoreNoReport = resolveEffectivePermissions({
  userId: "op-1",
  ruolo: "operatore",
  permissionRows: [
    {
      user_id: "op-1",
      module: "report",
      can_read: false,
      can_write: false,
      can_admin: false,
    },
  ],
  pilotDbEnabled: false,
});

assertRouteProtection(
  "operatore",
  [
    { pathname: "/dashboard", allowed: true },
    { pathname: "/report", allowed: false },
    { pathname: "/magazzino", allowed: true },
  ],
  operatoreNoReport,
);

assertRouteProtection(
  "guest",
  [
    { pathname: "/dashboard", allowed: false },
    { pathname: "/impostazioni", allowed: false },
    { pathname: "/login", allowed: true },
  ],
  null,
);

assertRouteProtection(
  "cliente",
  [
    { pathname: "/dashboard", allowed: false },
    { pathname: "/mezzi", allowed: false },
    { pathname: "/lavorazioni-clienti", allowed: true },
    { pathname: "/lavorazioni-clienti/abc", allowed: true },
  ],
  null,
);

console.log("rbac-route-matrix.test.ts OK");
