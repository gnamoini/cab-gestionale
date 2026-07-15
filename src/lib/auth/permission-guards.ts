"use client";

import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import { RBAC_DENIED_MESSAGE } from "@/lib/rbac";
import type { GestionalePageKey } from "@/src/lib/permissions/gestionale-pages";
import {
  canReadPage,
  canWritePage,
  moduleAllowsFromResolved,
  type ResolvedPageAccess,
} from "@/src/lib/rbac/resolve-page-access";
import { fetchClientEffectivePermissionsSnapshot } from "@/src/lib/runtime/truth-layer/fetch-client-effective-permissions";
import { readClientEffectivePermissionsSnapshotCache } from "@/src/lib/runtime/truth-layer/client-effective-permissions-cache";
import type { EffectivePermissionsSnapshot } from "@/src/lib/runtime/truth-layer/types";
import { isRbacSnapshotReady } from "@/src/lib/rbac/rbac-snapshot-access";
import { readStickyRbacSnapshot } from "@/src/lib/rbac/sticky-rbac-snapshot";
import { normalizeClienteRef } from "@/src/lib/auth/cliente-portal-scope";
import { err, success, type ServiceResult } from "@/src/services/service-result";

const DENIED_MESSAGE = RBAC_DENIED_MESSAGE;

function snapshotAllows(
  snap: EffectivePermissionsSnapshot | null | undefined,
  check: (resolved: ResolvedPageAccess) => boolean,
): boolean {
  return Boolean(snap && isRbacSnapshotReady(snap) && check(snap.resolved));
}

function readGuardSnapshots(): EffectivePermissionsSnapshot[] {
  const cached = readClientEffectivePermissionsSnapshotCache();
  const sticky = readStickyRbacSnapshot();
  if (cached && sticky && cached !== sticky) return [cached, sticky];
  if (cached) return [cached];
  if (sticky) return [sticky];
  return [];
}

async function ensureWithSnapshot(
  check: (resolved: ResolvedPageAccess) => boolean,
): Promise<ServiceResult<true>> {
  for (const snap of readGuardSnapshots()) {
    if (snapshotAllows(snap, check)) return success(true);
  }

  const fetched = await fetchClientEffectivePermissionsSnapshot();
  if (snapshotAllows(fetched, check)) return success(true);

  for (const snap of readGuardSnapshots()) {
    if (snapshotAllows(snap, check)) return success(true);
  }

  return err(DENIED_MESSAGE);
}

export async function ensurePageRead(pageKey: GestionalePageKey): Promise<ServiceResult<true>> {
  return ensureWithSnapshot((resolved) => canReadPage(resolved, pageKey));
}

export async function ensurePageWrite(pageKey: GestionalePageKey): Promise<ServiceResult<true>> {
  return ensureWithSnapshot((resolved) => canWritePage(resolved, pageKey));
}

export async function ensurePageWriteOrError(pageKey: GestionalePageKey): Promise<void> {
  const allowed = await ensurePageWrite(pageKey);
  if (!allowed.success) throw new Error(allowed.error ?? DENIED_MESSAGE);
}

export async function ensureModuleCan(
  module: GestionalePermissionModule,
  op: "read" | "write",
): Promise<ServiceResult<true>> {
  return ensureWithSnapshot((resolved) => moduleAllowsFromResolved(resolved, module, op));
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
  for (const snap of readGuardSnapshots()) {
    if (snap.roleKey) return snap.roleKey;
  }

  const fetched = await fetchClientEffectivePermissionsSnapshot();
  return fetched?.roleKey ?? null;
}
