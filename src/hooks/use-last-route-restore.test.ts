import assert from "node:assert/strict";
import { shouldRestoreLastRoute } from "@/src/hooks/use-last-route-restore";

const canAccess = (route: string) => route.startsWith("/lavorazioni") || route === "/dashboard";

assert.equal(
  shouldRestoreLastRoute({
    pathname: "/dashboard",
    currentRoute: "/dashboard",
    homePath: "/dashboard",
    storedRoute: "/lavorazioni",
    canAccessRoute: canAccess,
    restoreAlreadyAttempted: false,
  }),
  "/lavorazioni",
);

assert.equal(
  shouldRestoreLastRoute({
    pathname: "/dashboard",
    currentRoute: "/dashboard",
    homePath: "/dashboard",
    storedRoute: "/lavorazioni",
    canAccessRoute: canAccess,
    restoreAlreadyAttempted: true,
  }),
  null,
  "skip when restore already attempted",
);

assert.equal(
  shouldRestoreLastRoute({
    pathname: "/agenda",
    currentRoute: "/agenda",
    homePath: "/dashboard",
    storedRoute: "/lavorazioni",
    canAccessRoute: canAccess,
    restoreAlreadyAttempted: false,
  }),
  null,
  "skip when not on home",
);

assert.equal(
  shouldRestoreLastRoute({
    pathname: "/dashboard",
    currentRoute: "/dashboard",
    homePath: "/dashboard",
    storedRoute: "/dashboard",
    canAccessRoute: canAccess,
    restoreAlreadyAttempted: false,
  }),
  null,
  "skip when stored equals current",
);

assert.equal(
  shouldRestoreLastRoute({
    pathname: "/dashboard",
    currentRoute: "/dashboard",
    homePath: "/dashboard",
    storedRoute: "/magazzino",
    canAccessRoute: canAccess,
    restoreAlreadyAttempted: false,
  }),
  null,
  "skip when RBAC denies stored route",
);

console.log("use-last-route-restore.test.ts OK");
