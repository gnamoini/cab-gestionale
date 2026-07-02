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

assertRouteProtection(
  "operatore",
  [
    { pathname: "/dashboard", allowed: true },
    { pathname: "/report", allowed: false },
    { pathname: "/magazzino", allowed: true },
    { pathname: "/preventivi", allowed: false },
  ],
  resolveEffectivePermissions({
    userId: "op-1",
    ruolo: "operatore",
    permissionRows: [],
    pilotDbEnabled: false,
  }),
);

assertRouteProtection(
  "guest",
  [
    { pathname: "/dashboard", allowed: true },
    { pathname: "/dipendenti", allowed: true },
    { pathname: "/preventivi", allowed: true },
    { pathname: "/impostazioni", allowed: false },
    { pathname: "/login", allowed: true },
  ],
  resolveEffectivePermissions({
    userId: "guest-1",
    ruolo: "guest",
    permissionRows: [],
    pilotDbEnabled: false,
  }),
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
