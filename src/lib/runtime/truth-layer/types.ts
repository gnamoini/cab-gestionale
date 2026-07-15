import type { ResolvedPageAccess } from "@/src/lib/rbac/resolve-page-access";
import type { AppRole, RequiredRbacContext } from "@/lib/auth/rbac";
import type { PageAccessLevel } from "@/src/lib/permissions/gestionale-pages";
import type { PilotSettingsState } from "@/src/lib/runtime/truth-layer/resolve-pilot-settings-state";
import type { RbacEvaluationContext } from "@/lib/rbac";

export type EffectivePermissionsInput = {
  userId: string | null;
  roleKey: string | null | undefined;
  /** @deprecated use roleKey */
  ruolo?: string | null | undefined;
  rolePageAccess: Record<string, PageAccessLevel>;
  userPageOverrideRows: { page_key: string; access_level: string }[] | undefined;
  pilotDbEnabled: boolean;
  /** true solo dopo caricamento DB role_page_access (+ override); evita phantom write da seed. */
  permissionsHydrated?: boolean;
};

export type EffectivePermissionsSnapshot = {
  userId: string | null;
  role: AppRole;
  roleKey: string;
  pilot: PilotSettingsState;
  rbacContext: RbacEvaluationContext & { resolved: ResolvedPageAccess };
  resolved: ResolvedPageAccess;
  rolePageAccess: Record<string, PageAccessLevel>;
  /** Moduli ERP derivati dal resolver pagina (bridge RLS). */
  modules: ResolvedPageAccess["modules"];
  /** Snapshot autorizzativo pronto (matrice pagina da DB, non seed). */
  permissionsHydrated: boolean;
};
