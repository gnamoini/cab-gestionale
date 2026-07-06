"use client";

import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import { RBAC_DENIED_MESSAGE } from "@/lib/rbac";
import type { RequiredRbacContext } from "@/lib/auth/rbac";
import type { GestionalePageKey } from "@/src/lib/permissions/gestionale-pages";
import { canReadPage, canWritePage, moduleAllowsFromResolved } from "@/src/lib/rbac/resolve-page-access";
import { fetchClientEffectivePermissionsSnapshot } from "@/src/lib/runtime/truth-layer/fetch-client-effective-permissions";
import { readClientEffectivePermissionsSnapshotCache } from "@/src/lib/runtime/truth-layer/client-effective-permissions-cache";
import { isRbacSnapshotReady } from "@/src/lib/rbac/rbac-snapshot-access";
import { normalizeClienteRef } from "@/src/lib/auth/cliente-portal-scope";
import { err, success, type ServiceResult } from "@/src/services/service-result";

const DENIED_MESSAGE = RBAC_DENIED_MESSAGE;

async function ensureWithSnapshot(
  check: (ctx: RequiredRbacContext) => boolean,
): Promise<ServiceResult<true>> {
  const cached = readClientEffectivePermissionsSnapshotCache();
  if (cached && isRbacSnapshotReady(cached) && check(cached.rbacContext as RequiredRbacContext)) {
    return success(true);
  }

  const snap = await fetchClientEffectivePermissionsSnapshot();
  if (snap && isRbacSnapshotReady(snap) && check(snap.rbacContext as RequiredRbacContext)) {
    return success(true);
  }

  const cachedAfter = readClientEffectivePermissionsSnapshotCache();
  if (cachedAfter && isRbacSnapshotReady(cachedAfter) && check(cachedAfter.rbacContext as RequiredRbacContext)) {
    return success(true);
  }

  return err(DENIED_MESSAGE);
}

export async function ensurePageRead(pageKey: GestionalePageKey): Promise<ServiceResult<true>> {
  return ensureWithSnapshot((ctx) => canReadPage(ctx.resolved, pageKey));
}

export async function ensurePageWrite(pageKey: GestionalePageKey): Promise<ServiceResult<true>> {
  return ensureWithSnapshot((ctx) => canWritePage(ctx.resolved, pageKey));
}

export async function ensurePageWriteOrError(pageKey: GestionalePageKey): Promise<void> {
  const allowed = await ensurePageWrite(pageKey);
  if (!allowed.success) throw new Error(allowed.error ?? DENIED_MESSAGE);
}

export async function ensureModuleCan(
  module: GestionalePermissionModule,
  op: "read" | "write",
): Promise<ServiceResult<true>> {
  return ensureWithSnapshot((ctx) => moduleAllowsFromResolved(ctx.resolved, module, op));
}

export async function loadCallerClienteRef(): Promise<string | null> {
  const sb = getBrowserSupabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user?.id) return null;
  const { data: prof } = await sb.from("profiles").select("cliente_ref").eq("id", auth.user.id).maybeSingle();
  return normalizeClienteRef(prof?.cliente_ref);
}

export async function ensureClientLavorazioniAccess(): Promise<ServiceResult<true>> {
  return ensurePageRead("lavorazioni_clienti");
}

export async function ensureIsAdmin(): Promise<ServiceResult<true>> {
  return ensurePageWrite("sicurezza");
}

export async function getCurrentRoleForPermissionCheck(): Promise<string | null> {
  const cached = readClientEffectivePermissionsSnapshotCache();
  if (cached?.roleKey) return cached.roleKey;

  const snap = await fetchClientEffectivePermissionsSnapshot();
  return snap?.roleKey ?? null;
}
