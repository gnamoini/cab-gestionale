"use server";

import { createServiceAdminClient } from "@/lib/supabase/create-service-admin-client.server";
import { assertAdminCaller } from "@/lib/auth/assert-admin-caller.server";
import {
  listAllPermissions,
  listAllRoles,
  loadRolePermissionKeys,
  ROLES_COLUMNS,
} from "@/src/lib/rbac/load-rbac-data";
import type { PermissionRow, RoleRow } from "@/src/types/supabase-tables";
import { invalidateRbacTruthServer } from "@/src/lib/rbac/invalidate-rbac-truth.server";

export type RolePermissionMatrixCell = {
  permissionId: string;
  permissionKey: string;
  module: string | null;
  action: string | null;
  label: string;
  allowed: boolean;
};

export type RolePermissionMatrix = {
  role: RoleRow;
  cells: RolePermissionMatrixCell[];
};

type Ok<T> = { ok: true } & T;
type VoidOk = { ok: true };
type Err = { ok: false; message: string };

async function adminClientOrErr() {
  const caller = await assertAdminCaller();
  if (!caller.ok) return { ok: false as const, message: caller.message };
  return { ok: true as const, admin: createServiceAdminClient(caller.url, caller.serviceKey) };
}

export async function listRolesAction(): Promise<Ok<{ roles: RoleRow[] }> | Err> {
  try {
    const ctx = await adminClientOrErr();
    if (!ctx.ok) return ctx;
    const roles = await listAllRoles(ctx.admin);
    return { ok: true, roles };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Errore elenco ruoli" };
  }
}

export async function listPermissionsAction(): Promise<Ok<{ permissions: PermissionRow[] }> | Err> {
  try {
    const ctx = await adminClientOrErr();
    if (!ctx.ok) return ctx;
    const permissions = await listAllPermissions(ctx.admin);
    return { ok: true, permissions };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Errore elenco permessi" };
  }
}

export async function getRolePermissionMatrixAction(
  roleKey: string,
): Promise<Ok<{ matrix: RolePermissionMatrix }> | Err> {
  try {
    const ctx = await adminClientOrErr();
    if (!ctx.ok) return ctx;
    const { data: role, error: roleErr } = await ctx.admin
      .from("roles")
      .select(ROLES_COLUMNS)
      .eq("key", roleKey)
      .maybeSingle();
    if (roleErr || !role) return { ok: false, message: "Ruolo non trovato" };

    const [permissions, allowedKeys] = await Promise.all([
      listAllPermissions(ctx.admin),
      loadRolePermissionKeys(ctx.admin, roleKey),
    ]);
    const allowedSet = new Set(allowedKeys);

    const cells: RolePermissionMatrixCell[] = permissions.map((p) => ({
      permissionId: p.id,
      permissionKey: p.key,
      module: p.module,
      action: p.action,
      label: p.label,
      allowed: allowedSet.has(p.key),
    }));

    return { ok: true, matrix: { role: role as RoleRow, cells } };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Errore matrice ruolo" };
  }
}

export async function createRoleAction(input: {
  key: string;
  name: string;
  description?: string | null;
  cloneFromRoleKey?: string | null;
}): Promise<Ok<{ role: RoleRow }> | Err> {
  try {
    const ctx = await adminClientOrErr();
    if (!ctx.ok) return ctx;
    const key = input.key.trim().toLowerCase();
    if (!/^[a-z][a-z0-9_]{1,48}$/.test(key)) {
      return { ok: false, message: "Key ruolo non valida" };
    }
    const { data: role, error } = await ctx.admin
      .from("roles")
      .insert({
        key,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        is_system: false,
        is_active: true,
      })
      .select(ROLES_COLUMNS)
      .single();
    if (error) return { ok: false, message: error.message };

    if (input.cloneFromRoleKey) {
      const dup = await duplicateRolePermissionsAction(key, input.cloneFromRoleKey);
      if (!dup.ok) return dup;
    }

    invalidateRbacTruthServer();
    return { ok: true, role: role as RoleRow };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Errore creazione ruolo" };
  }
}

export async function updateRoleAction(input: {
  roleKey: string;
  name?: string;
  description?: string | null;
  isActive?: boolean;
}): Promise<Ok<{ role: RoleRow }> | Err> {
  try {
    const ctx = await adminClientOrErr();
    if (!ctx.ok) return ctx;
    const { data: existing } = await ctx.admin.from("roles").select(ROLES_COLUMNS).eq("key", input.roleKey).maybeSingle();
    if (!existing) return { ok: false, message: "Ruolo non trovato" };

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.name != null) patch.name = input.name.trim();
    if (input.description !== undefined) patch.description = input.description;
    if (input.isActive !== undefined) {
      if (existing.is_system && !input.isActive) {
        return { ok: false, message: "I ruoli di sistema non possono essere disattivati" };
      }
      patch.is_active = input.isActive;
    }

    const { data: role, error } = await ctx.admin
      .from("roles")
      .update(patch)
      .eq("key", input.roleKey)
      .select(ROLES_COLUMNS)
      .single();
    if (error) return { ok: false, message: error.message };
    invalidateRbacTruthServer();
    return { ok: true, role: role as RoleRow };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Errore aggiornamento ruolo" };
  }
}

export async function deactivateRoleAction(roleKey: string): Promise<VoidOk | Err> {
  try {
    const ctx = await adminClientOrErr();
    if (!ctx.ok) return ctx;
    const { data: role } = await ctx.admin.from("roles").select("id, is_system").eq("key", roleKey).maybeSingle();
    if (!role) return { ok: false, message: "Ruolo non trovato" };
    if (role.is_system) return { ok: false, message: "I ruoli di sistema non possono essere disattivati" };

    const { count } = await ctx.admin
      .from("user_roles")
      .select("user_id", { count: "exact", head: true })
      .eq("role_id", role.id);
    if ((count ?? 0) > 0) {
      return { ok: false, message: "Il ruolo ha utenti assegnati" };
    }

    const { error } = await ctx.admin.from("roles").update({ is_active: false }).eq("key", roleKey);
    if (error) return { ok: false, message: error.message };
    invalidateRbacTruthServer();
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Errore disattivazione ruolo" };
  }
}

export async function updateRolePermissionsAction(input: {
  roleKey: string;
  allowedPermissionIds: string[];
}): Promise<VoidOk | Err> {
  try {
    const ctx = await adminClientOrErr();
    if (!ctx.ok) return ctx;
    const { data: role } = await ctx.admin.from("roles").select("id, is_system").eq("key", input.roleKey).maybeSingle();
    if (!role) return { ok: false, message: "Ruolo non trovato" };

    const { error: delErr } = await ctx.admin.from("role_permissions").delete().eq("role_id", role.id);
    if (delErr) return { ok: false, message: delErr.message };

    if (input.allowedPermissionIds.length > 0) {
      const rows = input.allowedPermissionIds.map((permission_id) => ({
        role_id: role.id,
        permission_id,
        effect: "allow" as const,
      }));
      const { error: insErr } = await ctx.admin.from("role_permissions").insert(rows);
      if (insErr) return { ok: false, message: insErr.message };
    }

    invalidateRbacTruthServer();
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Errore aggiornamento permessi ruolo" };
  }
}

export async function duplicateRolePermissionsAction(
  targetRoleKey: string,
  sourceRoleKey: string,
): Promise<VoidOk | Err> {
  try {
    const ctx = await adminClientOrErr();
    if (!ctx.ok) return ctx;
    const sourceKeys = await loadRolePermissionKeys(ctx.admin, sourceRoleKey);
    const { data: perms } = await ctx.admin.from("permissions").select("id, key").in("key", sourceKeys);
    const ids = (perms ?? []).map((p) => p.id as string);
    return updateRolePermissionsAction({ roleKey: targetRoleKey, allowedPermissionIds: ids });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Errore duplicazione permessi" };
  }
}
