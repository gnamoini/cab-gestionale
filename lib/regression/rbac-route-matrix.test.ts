import { assertRouteProtection } from "@/lib/regression/assert-route-protection";
import { assertPermissionConsistency } from "@/lib/regression/assert-permission-consistency";
import { buildTestSnapshot } from "@/lib/regression/rbac-test-fixtures";

const adminSnap = buildTestSnapshot({ userId: "admin-1", roleKey: "admin" });

assertPermissionConsistency(adminSnap);

assertRouteProtection(
  "admin",
  [
    { pathname: "/dashboard", allowed: true },
    { pathname: "/agenda", allowed: true },
    { pathname: "/report", allowed: true },
    { pathname: "/impostazioni", allowed: true },
  ],
  adminSnap,
);

assertRouteProtection(
  "operatore",
  [
    { pathname: "/dashboard", allowed: false },
    { pathname: "/report", allowed: false },
    { pathname: "/magazzino", allowed: true },
    { pathname: "/preventivi", allowed: false },
  ],
  buildTestSnapshot({ userId: "op-1", roleKey: "operatore" }),
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
  buildTestSnapshot({ userId: "guest-1", roleKey: "guest" }),
);

assertRouteProtection(
  "cliente",
  [
    { pathname: "/dashboard", allowed: false },
    { pathname: "/mezzi", allowed: false },
    { pathname: "/lavorazioni-clienti", allowed: true },
    { pathname: "/lavorazioni-clienti/abc", allowed: true },
  ],
  buildTestSnapshot({ userId: "cliente-1", roleKey: "cliente" }),
);

console.log("rbac-route-matrix.test.ts OK");
