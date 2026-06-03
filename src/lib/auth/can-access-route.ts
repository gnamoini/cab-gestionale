import {
  canAccessPage,
  pathnameToSection,
  type CanAccessPageOptions,
  type RbacSection,
  type RbacUser,
} from "@/lib/auth/rbac";
import type { RbacEvaluationContext } from "@/lib/rbac";
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
};

export type CanAccessRouteInput = {
  user: RbacUser;
  pathname: string;
  opts?: CanAccessPageOptions;
  ctx?: RbacEvaluationContext;
  /** Se presente, applica anche `user_permissions` (fail-closed su modulo mappato). */
  snapshot?: EffectivePermissionsSnapshot | null;
};

/** Accesso route: capability/ruolo + opzionale moduli granulari dal truth layer. */
export function canAccessRoute(input: CanAccessRouteInput): boolean {
  const { user, pathname, opts, ctx, snapshot } = input;
  const effectiveCtx = ctx ?? snapshot?.rbacContext;
  if (!canAccessPage(user, pathname, opts, effectiveCtx)) return false;
  if (!snapshot) return true;

  const section = pathnameToSection(pathname);
  const module = section ? SECTION_TO_MODULE[section] : undefined;
  if (!module) return true;

  return moduleAllows(snapshot.modules, module, "read");
}
