"use server";

import { createServiceAdminClient } from "@/lib/supabase/create-service-admin-client.server";
import { assertAdminCaller } from "@/lib/auth/assert-admin-caller.server";
import {
  listAllRoles,
  loadAllRolePageAccess,
  loadRolePageAccess,
  ROLES_COLUMNS,
  upsertRolePageAccess,
} from "@/src/lib/rbac/load-rbac-data";
import { GESTIONALE_PAGES, type PageAccessLevel } from "@/src/lib/permissions/gestionale-pages";
import type { RoleRow } from "@/src/types/supabase-tables";
import { invalidateRbacTruthServer } from "@/src/lib/rbac/invalidate-rbac-truth.server";
import { seedPageAccessForRole } from "@/lib/rbac-page-seed";

export type PageMatrixCell = {
  pageKey: string;
  label: string;
  level: PageAccessLevel;
};

export type PageMatrixRow = {
  role: RoleRow;
  cells: PageMatrixCell[];
  locked: boolean;
};

export type PageAccessMatrix = {
  pages: { key: string; label: string }[];
  rows: PageMatrixRow[];
};

type Ok<T> = { ok: true } & T;
type VoidOk = { ok: true };
type Err = { ok: false; message: string };

const VALID_LEVELS = new Set<PageAccessLevel>(["write", "read", "none"]);
const VALID_PAGE_KEYS = new Set<string>(GESTIONALE_PAGES.map((p) => p.key));

function slugRoleKeyFromName(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return slug.length >= 2 ? slug : "ruolo_custom";
}

function resolveCreateRolePageAccess(input: {
  pageAccess?: Record<string, PageAccessLevel> | null;
  cloneFromRoleKey?: string | null;
}): Record<string, PageAccessLevel> {
  const out: Record<string, PageAccessLevel> = {};
  for (const page of GESTIONALE_PAGES) {
    const fromInput = input.pageAccess?.[page.key];
    if (fromInput && VALID_LEVELS.has(fromInput)) {
      out[page.key] = fromInput;
      continue;
    }
    out[page.key] = "none";
  }
  return out;
}

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

export async function getPageMatrixAction(): Promise<Ok<{ matrix: PageAccessMatrix }> | Err> {
  try {
    const ctx = await adminClientOrErr();
    if (!ctx.ok) return ctx;
    const roles = await listAllRoles(ctx.admin);
    const accessByRole = await loadAllRolePageAccess(ctx.admin);

    const pages = GESTIONALE_PAGES.map((p) => ({ key: p.key, label: p.label }));
    const rows: PageMatrixRow[] = roles.map((role) => {
      const roleAccess = accessByRole.get(role.key) ?? seedPageAccessForRole(role.key);
      const locked = role.key === "admin";
      const cells: PageMatrixCell[] = GESTIONALE_PAGES.map((p) => ({
        pageKey: p.key,
        label: p.label,
        level: locked ? "write" : (roleAccess[p.key] ?? "none"),
      }));
      return { role, cells, locked };
    });

    return { ok: true, matrix: { pages, rows } };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Errore matrice pagine" };
  }
}

export async function updatePageMatrixAction(input: {
  patches: { roleKey: string; pageKey: string; level: PageAccessLevel }[];
}): Promise<VoidOk | Err> {
  try {
    const ctx = await adminClientOrErr();
    if (!ctx.ok) return ctx;

    for (const patch of input.patches) {
      if (patch.roleKey === "admin") continue;
      if (!VALID_PAGE_KEYS.has(patch.pageKey)) {
        return { ok: false, message: `Pagina non valida: ${patch.pageKey}` };
      }
      if (!VALID_LEVELS.has(patch.level)) {
        return { ok: false, message: `Livello non valido: ${patch.level}` };
      }

      const { data: role } = await ctx.admin.from("roles").select("id").eq("key", patch.roleKey).maybeSingle();
      if (!role?.id) return { ok: false, message: `Ruolo non trovato: ${patch.roleKey}` };

      await upsertRolePageAccess(ctx.admin, role.id, patch.pageKey, patch.level);
    }

    invalidateRbacTruthServer();
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Errore aggiornamento matrice" };
  }
}

export async function createRoleAction(input: {
  key?: string;
  name: string;
  description?: string | null;
  cloneFromRoleKey?: string | null;
  pageAccess?: Record<string, PageAccessLevel> | null;
}): Promise<Ok<{ role: RoleRow }> | Err> {
  try {
    const ctx = await adminClientOrErr();
    if (!ctx.ok) return ctx;
    const name = input.name.trim();
    if (!name) return { ok: false, message: "Nome ruolo obbligatorio" };
    const key = (input.key?.trim() || slugRoleKeyFromName(name)).toLowerCase();
    if (!/^[a-z][a-z0-9_]{1,48}$/.test(key)) {
      return { ok: false, message: "Key ruolo non valida" };
    }
    const { data: role, error } = await ctx.admin
      .from("roles")
      .insert({
        key,
        name,
        description: input.description?.trim() || null,
        is_system: false,
        is_active: true,
      })
      .select(ROLES_COLUMNS)
      .single();
    if (error) return { ok: false, message: error.message };

    let sourceAccess = resolveCreateRolePageAccess(input);
    if (!input.pageAccess && input.cloneFromRoleKey) {
      const cloned = await loadRolePageAccess(ctx.admin, input.cloneFromRoleKey);
      sourceAccess = { ...sourceAccess, ...seedPageAccessForRole(input.cloneFromRoleKey), ...cloned };
    }

    for (const page of GESTIONALE_PAGES) {
      const level = sourceAccess[page.key] ?? "none";
      if (!VALID_LEVELS.has(level)) continue;
      await upsertRolePageAccess(ctx.admin, role.id as string, page.key, level);
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
