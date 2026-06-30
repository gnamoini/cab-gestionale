"use client";

import { userHasClientLavorazioniAccess } from "@/lib/lavorazioni/client-portal-access";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { moduleAllows, type ModulePermissionOp } from "@/src/lib/auth/effective-module-access";
import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import { hasCapability, RBAC_DENIED_MESSAGE, type Capability } from "@/lib/rbac";
import type { RbacEvaluationContext } from "@/lib/rbac";
import { resolveRole, canRead, canWrite, canDelete, hasPermission, type PermissionKey, type RbacSection } from "@/lib/auth/rbac";
import { fetchClientEffectivePermissionsSnapshot } from "@/src/lib/runtime/truth-layer/fetch-client-effective-permissions";
import {
  readAuthRoleHint,
  readClientEffectivePermissionsSnapshotCache,
} from "@/src/lib/runtime/truth-layer/client-effective-permissions-cache";
import { normalizeClienteRef } from "@/src/lib/auth/cliente-portal-scope";
import { err, success, type ServiceResult } from "@/src/services/service-result";

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
  ordini_fornitori: "ordini_fornitori",
};

const DENIED_MESSAGE = RBAC_DENIED_MESSAGE;
const CLIENT_DENIED = "Accesso al portale lavorazioni clienti non autorizzato.";

export async function getCurrentRoleForPermissionCheck(): Promise<string | null> {
  const snap = await fetchClientEffectivePermissionsSnapshot();
  return snap?.role ?? null;
}

/** Cache → auth hint → fetch profilo (stesso ordine di `useRbac` / UI). */
async function ensureWithRoleResolution(
  check: (role: string, ctx?: RbacEvaluationContext) => boolean,
): Promise<ServiceResult<true>> {
  const cached = readClientEffectivePermissionsSnapshotCache();
  if (cached && check(cached.role, cached.rbacContext)) return success(true);

  const hint = readAuthRoleHint();
  if (hint && check(hint.ruolo)) return success(true);

  const snap = await fetchClientEffectivePermissionsSnapshot();
  if (snap && check(snap.role, snap.rbacContext)) return success(true);

  const cachedAfter = readClientEffectivePermissionsSnapshotCache();
  if (cachedAfter && check(cachedAfter.role, cachedAfter.rbacContext)) return success(true);

  if (hint && check(hint.ruolo)) return success(true);

  return err(DENIED_MESSAGE);
}

export async function ensurePermission(permission: PermissionKey): Promise<ServiceResult<true>> {
  return ensureWithRoleResolution((role, ctx) => hasPermission(role, permission, ctx));
}

/** Allineato a RLS `can_write_operational` (promemoria dashboard, bunder, ecc.). */
export async function ensureOperationalWrite(): Promise<ServiceResult<true>> {
  return ensureWithRoleResolution((role, ctx) => hasCapability(role, "can_write_operational", ctx));
}

export async function ensurePermissionOrError(permission: PermissionKey): Promise<void> {
  const allowed = await ensurePermission(permission);
  if (!allowed.success) throw new Error(allowed.error ?? DENIED_MESSAGE);
}

export async function ensureIsAdmin(): Promise<ServiceResult<true>> {
  return ensureWithRoleResolution((role) => resolveRole(role) === "admin");
}

export async function ensureModuleCan(
  module: GestionalePermissionModule,
  op: ModulePermissionOp,
): Promise<ServiceResult<true>> {
  const snap = await fetchClientEffectivePermissionsSnapshot();
  if (!snap || !moduleAllows(snap.modules, module, op)) return err(DENIED_MESSAGE);
  return success(true);
}

export async function ensureSectionRead(section: RbacSection): Promise<ServiceResult<true>> {
  const mod = SECTION_TO_MODULE[section];
  if (mod) return ensureModuleCan(mod, "read");
  return ensureWithRoleResolution((role, ctx) => canRead(role, section, ctx));
}

export async function ensureSectionWrite(section: RbacSection): Promise<ServiceResult<true>> {
  const mod = SECTION_TO_MODULE[section];
  if (mod) return ensureModuleCan(mod, "write");
  return ensureWithRoleResolution((role, ctx) => canWrite(role, section, ctx));
}

export async function ensureSectionDelete(section: RbacSection): Promise<ServiceResult<true>> {
  const mod = SECTION_TO_MODULE[section];
  if (mod) return ensureModuleCan(mod, "write");
  return ensureWithRoleResolution((role, ctx) => canDelete(role, section, ctx));
}

export async function ensureSectionWriteOrError(section: RbacSection): Promise<void> {
  const allowed = await ensureSectionWrite(section);
  if (!allowed.success) throw new Error(allowed.error ?? DENIED_MESSAGE);
}

async function loadClientPortalAccessForCurrentUser(): Promise<{ role: string | null; userId: string | null }> {
  const sb = getBrowserSupabase();
  const { data: auth } = await sb.auth.getUser();
  const userId = auth.user?.id ?? null;
  if (!userId) return { role: null, userId: null };
  const snap = await fetchClientEffectivePermissionsSnapshot();
  return { role: snap?.role ?? null, userId };
}

/** `profiles.cliente_ref` dell'utente corrente (portale / filtri lista). */
export async function loadCallerClienteRef(): Promise<string | null> {
  const sb = getBrowserSupabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user?.id) return null;
  const { data: prof } = await sb.from("profiles").select("cliente_ref").eq("id", auth.user.id).maybeSingle();
  return normalizeClienteRef(prof?.cliente_ref);
}

/** Portale lavorazioni clienti: solo ruoli admin e cliente. */
export async function ensureClientLavorazioniAccess(): Promise<ServiceResult<true>> {
  const { role, userId } = await loadClientPortalAccessForCurrentUser();
  if (!userId) return err("Sessione non valida.");
  if (!userHasClientLavorazioniAccess(role, userId)) return err(CLIENT_DENIED);
  return success(true);
}
