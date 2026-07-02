import {
  canAccessPage,
  pathnameToSection,
  type CanAccessPageOptions,
  type RbacSection,
  type RbacUser,
} from "@/lib/auth/rbac";
import type { RequiredRbacContext } from "@/lib/rbac";
import { hasResolvedCapability } from "@/src/lib/rbac/resolve-user-permissions";
import { moduleAllows } from "@/src/lib/auth/effective-module-access";
import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import type { EffectivePermissionsSnapshot } from "@/src/lib/runtime/truth-layer/types";

const SECTION_TO_MODULE: Partial<Record<RbacSection, GestionalePermissionModule>> = {
  magazzino: "magazzino",
  preventivi: "preventivi",
  lavorazioni: "lavorazioni",
  mezzi: "mezzi",
  report: "report",
  documenti: "documenti",
  dipendenti: "dipendenti",
  fatturazione: "fatturazione",
  ddt: "ddt",
};

/** Hard gate / derived — non passano da user_permissions (RBAC_PRECEDENCE step 1). */
const NON_MODULE_SECTIONS = new Set<RbacSection>([
  "dashboard",
  "security",
  "impostazioni",
  "lavorazioni_clienti",
]);

export type CanAccessRouteInput = {
  user: RbacUser;
  pathname: string;
  opts?: CanAccessPageOptions;
  ctx?: RequiredRbacContext;
  /** Se presente, applica user_permissions + role_permissions via snapshot DB. */
  snapshot?: EffectivePermissionsSnapshot | null;
};

/** Accesso route: hard gate + moduli ERP via snapshot (precedence allineata). */
export function canAccessRoute(input: CanAccessRouteInput): boolean {
  const { user, pathname, opts, ctx, snapshot } = input;
  const effectiveCtx = ctx ?? snapshot?.rbacContext;
  const section = pathnameToSection(pathname);

  if (!section || NON_MODULE_SECTIONS.has(section)) {
    if (!effectiveCtx?.resolved) return false;
    return canAccessPage(user, pathname, opts, effectiveCtx as RequiredRbacContext);
  }

  const module = SECTION_TO_MODULE[section];
  if (!module) {
    if (!effectiveCtx?.resolved) return false;
    return canAccessPage(user, pathname, opts, effectiveCtx as RequiredRbacContext);
  }

  const resolved = snapshot?.resolved ?? effectiveCtx?.resolved;
  if (!resolved || !hasResolvedCapability(resolved, "can_read_operational")) {
    return false;
  }

  if (snapshot) {
    return moduleAllows(snapshot.modules, module, "read");
  }

  if (!effectiveCtx?.resolved) return false;
  return canAccessPage(user, pathname, opts, effectiveCtx as RequiredRbacContext);
}
