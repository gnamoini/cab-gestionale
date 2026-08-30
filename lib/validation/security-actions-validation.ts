/* eslint-disable @next/next/no-assign-module-variable -- lint phase2: dynamic import interop requires module handle */
/** Validazione input server actions sicurezza / impostazioni portale clienti. */

import type { SupabaseClient } from "@supabase/supabase-js";
import { APP_ROLES, type AppRole } from "@/lib/auth/rbac";
import { normalizeClienteRef } from "@/src/lib/auth/cliente-portal-scope";
import { normalizeUsername, usernameFieldError } from "@/src/lib/auth/username";
import { GESTIONALE_PERMISSION_MODULES, type GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import { GESTIONALE_PAGES, type PageAccessLevel } from "@/src/lib/permissions/gestionale-pages";

export type ValidatedModulePermissionEntry = {
  module: GestionalePermissionModule;
  canRead: boolean;
  canWrite: boolean;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_BATCH_PATCHES = 100;

export type ValidatedPagePermissionEntry = {
  pageKey: string;
  accessLevel: PageAccessLevel;
};

export type ValidatedSecurityUserBatchPatch = {
  userId: string;
  nome?: string;
  cognome?: string | null;
  username?: string;
  ruolo?: string;
  clienteRef?: string | null;
  pagePermissions?: ValidatedPagePermissionEntry[];
  clearPagePermissions?: boolean;
  /** @deprecated bridge module editor */
  modulePermissions?: ValidatedModulePermissionEntry[] | null;
  /** @deprecated */
  clearModulePermissions?: boolean;
};

function validateModulePermissionsPayload(
  raw: unknown,
): { ok: true; value: ValidatedModulePermissionEntry[] | null } | { ok: false; message: string } {
  if (raw === null) return { ok: true, value: null };
  if (!Array.isArray(raw)) return { ok: false, message: "Permessi pagine non validi." };
  if (raw.length > GESTIONALE_PERMISSION_MODULES.length) {
    return { ok: false, message: "Troppi permessi modulo." };
  }

  const seen = new Set<string>();
  const out: ValidatedModulePermissionEntry[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { ok: false, message: "Voce permesso modulo non valida." };
    }
    const row = item as Record<string, unknown>;
    const module = typeof row.module === "string" ? row.module : "";
    if (!(GESTIONALE_PERMISSION_MODULES as readonly string[]).includes(module)) {
      return { ok: false, message: "Modulo permesso non valido." };
    }
    if (seen.has(module)) return { ok: false, message: "Modulo permesso duplicato." };
    seen.add(module);
    if (typeof row.canRead !== "boolean" || typeof row.canWrite !== "boolean") {
      return { ok: false, message: "Flag permesso modulo non valido." };
    }
    const canRead = row.canRead;
    const canWrite = canRead ? row.canWrite : false;
    out.push({
      module: module as GestionalePermissionModule,
      canRead,
      canWrite,
    });
  }

  return { ok: true, value: out };
}

const VALID_PAGE_KEYS = new Set<string>(GESTIONALE_PAGES.map((p) => p.key));
const PAGE_ACCESS_LEVELS = new Set<PageAccessLevel>(["write", "read", "none"]);

function validatePagePermissionsPayload(
  raw: unknown,
): { ok: true; value: ValidatedPagePermissionEntry[] } | { ok: false; message: string } {
  if (!Array.isArray(raw)) return { ok: false, message: "Permessi pagina non validi." };
  if (raw.length > GESTIONALE_PAGES.length) {
    return { ok: false, message: "Troppi permessi pagina." };
  }

  const seen = new Set<string>();
  const out: ValidatedPagePermissionEntry[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { ok: false, message: "Voce permesso pagina non valida." };
    }
    const row = item as Record<string, unknown>;
    const pageKey = typeof row.pageKey === "string" ? row.pageKey : "";
    if (!VALID_PAGE_KEYS.has(pageKey)) {
      return { ok: false, message: "Pagina permesso non valida." };
    }
    if (seen.has(pageKey)) return { ok: false, message: "Pagina permesso duplicata." };
    seen.add(pageKey);
    const accessLevel = row.accessLevel;
    if (typeof accessLevel !== "string" || !PAGE_ACCESS_LEVELS.has(accessLevel as PageAccessLevel)) {
      return { ok: false, message: "Livello accesso pagina non valido." };
    }
    out.push({ pageKey, accessLevel: accessLevel as PageAccessLevel });
  }

  return { ok: true, value: out };
}

export function validateUserId(userId: string | null | undefined): string | null {
  const t = userId?.trim() ?? "";
  if (!t) return "Utente non valido.";
  if (!UUID_RE.test(t)) return "ID utente non valido.";
  return null;
}

export function validateOptionalCognome(cognome: string | null | undefined): string | null {
  if (cognome == null) return null;
  const t = cognome.trim();
  if (!t) return null;
  if (t.length > 120) return "Cognome troppo lungo (max 120 caratteri).";
  return null;
}

export function validateOptionalDisplayName(nome: string | null | undefined): string | null {
  if (nome == null) return null;
  const t = nome.trim();
  if (!t) return "Il nome non può essere vuoto.";
  if (t.length < 2 || t.length > 120) return "Nome non valido (2–120 caratteri).";
  return null;
}

const ROLE_KEY_RE = /^[a-z][a-z0-9_]{0,63}$/;

export function validateRoleKeyValue(roleKey: string | null | undefined): roleKey is string {
  if (!roleKey) return false;
  return ROLE_KEY_RE.test(roleKey);
}

export function validateAppRoleValue(ruolo: string | null | undefined): ruolo is AppRole {
  if (!ruolo) return false;
  return (APP_ROLES as readonly string[]).includes(ruolo);
}

export function validateOptionalClienteRef(clienteRef: string | null | undefined): string | null {
  if (clienteRef == null) return null;
  if (typeof clienteRef !== "string") return "Cliente associato non valido.";
  const t = clienteRef.trim();
  if (!t) return null;
  if (t.length > 120) return "Nome cliente troppo lungo.";
  return null;
}

export function validateSecurityUserBatchPatches(
  patches: unknown,
):
  | { ok: true; patches: ValidatedSecurityUserBatchPatch[] }
  | { ok: false; message: string } {
  if (!Array.isArray(patches)) {
    return { ok: false, message: "Payload batch non valido." };
  }
  if (patches.length > MAX_BATCH_PATCHES) {
    return { ok: false, message: `Troppi aggiornamenti (max ${MAX_BATCH_PATCHES}).` };
  }

  const out: ValidatedSecurityUserBatchPatch[] = [];

  for (const raw of patches) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { ok: false, message: "Voce batch non valida." };
    }
    const p = raw as Record<string, unknown>;
    const userIdErr = validateUserId(typeof p.userId === "string" ? p.userId : "");
    if (userIdErr) return { ok: false, message: userIdErr };

    const patch: ValidatedSecurityUserBatchPatch = {
      userId: (p.userId as string).trim(),
    };

    if (p.nome !== undefined) {
      if (typeof p.nome !== "string") return { ok: false, message: "Nome non valido." };
      const nomeErr = validateOptionalDisplayName(p.nome);
      if (nomeErr) return { ok: false, message: nomeErr };
      patch.nome = p.nome.trim();
    }

    if (p.cognome !== undefined) {
      if (p.cognome !== null && typeof p.cognome !== "string") {
        return { ok: false, message: "Cognome non valido." };
      }
      const cognomeErr = validateOptionalCognome(p.cognome as string | null);
      if (cognomeErr) return { ok: false, message: cognomeErr };
      patch.cognome = typeof p.cognome === "string" ? p.cognome.trim() || null : null;
    }

    if (p.username !== undefined) {
      if (typeof p.username !== "string") return { ok: false, message: "Nome utente non valido." };
      const normalized = normalizeUsername(p.username);
      const usernameErr = usernameFieldError(normalized);
      if (usernameErr) return { ok: false, message: usernameErr };
      patch.username = normalized;
    }

    if (p.ruolo !== undefined) {
      if (typeof p.ruolo !== "string" || !validateRoleKeyValue(p.ruolo)) {
        return { ok: false, message: "Ruolo non valido." };
      }
      patch.ruolo = p.ruolo;
    }

    if (p.clienteRef !== undefined) {
      if (p.clienteRef !== null && typeof p.clienteRef !== "string") {
        return { ok: false, message: "Cliente associato non valido." };
      }
      const clienteRefErr = validateOptionalClienteRef(
        p.clienteRef === null ? null : (p.clienteRef as string),
      );
      if (clienteRefErr) return { ok: false, message: clienteRefErr };
      patch.clienteRef = normalizeClienteRef(p.clienteRef as string | null | undefined);
    }

    if (p.pagePermissions !== undefined) {
      const pageRes = validatePagePermissionsPayload(p.pagePermissions);
      if (!pageRes.ok) return pageRes;
      patch.pagePermissions = pageRes.value;
    }

    if (p.clearPagePermissions !== undefined) {
      if (typeof p.clearPagePermissions !== "boolean") {
        return { ok: false, message: "Flag ripristino permessi pagina non valido." };
      }
      patch.clearPagePermissions = p.clearPagePermissions;
    }

    if (p.modulePermissions !== undefined) {
      const modRes = validateModulePermissionsPayload(p.modulePermissions);
      if (!modRes.ok) return modRes;
      patch.modulePermissions = modRes.value;
    }

    if (p.clearModulePermissions !== undefined) {
      if (typeof p.clearModulePermissions !== "boolean") {
        return { ok: false, message: "Flag ripristino permessi non valido." };
      }
      patch.clearModulePermissions = p.clearModulePermissions;
    }

    out.push(patch);
  }

  return { ok: true, patches: out };
}

export function validateSetClientLavorazioniAccessInput(input: unknown):
  | { ok: true; userId: string; enabled: boolean }
  | { ok: false; message: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, message: "Richiesta non valida." };
  }
  const raw = input as Record<string, unknown>;
  const userIdErr = validateUserId(typeof raw.userId === "string" ? raw.userId : "");
  if (userIdErr) return { ok: false, message: userIdErr };
  if (typeof raw.enabled !== "boolean") {
    return { ok: false, message: "Flag abilitazione non valido." };
  }
  return { ok: true, userId: (raw.userId as string).trim(), enabled: raw.enabled };
}

export function validateUpdateUserRoleInput(input: unknown):
  | { ok: true; userId: string; role: AppRole }
  | { ok: false; message: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, message: "Richiesta non valida." };
  }
  const raw = input as Record<string, unknown>;
  const userIdErr = validateUserId(typeof raw.userId === "string" ? raw.userId : "");
  if (userIdErr) return { ok: false, message: userIdErr };
  const roleRaw = typeof raw.role === "string" ? raw.role : "";
  if (!validateAppRoleValue(roleRaw)) {
    return { ok: false, message: "Ruolo non valido." };
  }
  return { ok: true, userId: (raw.userId as string).trim(), role: roleRaw };
}

export function validateDeleteUserByAdminInput(
  userId: string | null | undefined,
  callerId: string | null | undefined,
): { ok: true; userId: string } | { ok: false; message: string } {
  const userIdErr = validateUserId(userId);
  if (userIdErr) return { ok: false, message: userIdErr };
  const trimmed = (userId as string).trim();
  if (callerId && trimmed === callerId) {
    return { ok: false, message: "Non puoi eliminare il tuo account da qui." };
  }
  return { ok: true, userId: trimmed };
}

export function validateSetUserAccountEnabledInput(
  input: unknown,
  callerId: string | null | undefined,
): { ok: true; userId: string; enabled: boolean } | { ok: false; message: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, message: "Richiesta non valida." };
  }
  const raw = input as Record<string, unknown>;
  const userIdErr = validateUserId(typeof raw.userId === "string" ? raw.userId : "");
  if (userIdErr) return { ok: false, message: userIdErr };
  if (typeof raw.enabled !== "boolean") {
    return { ok: false, message: "Flag abilitazione non valido." };
  }
  const userId = (raw.userId as string).trim();
  if (!raw.enabled && callerId && userId === callerId) {
    return { ok: false, message: "Non puoi disattivare il tuo account." };
  }
  return { ok: true, userId, enabled: raw.enabled };
}

/** Impedisce delete/disable/downgrade dell'ultimo admin attivo. */
export async function validateLastAdminTarget(
  admin: SupabaseClient,
  _targetUserId: string,
  targetRole: AppRole,
  operation: "delete" | "disable" | "role_downgrade",
): Promise<string | null> {
  if (targetRole !== "admin") return null;
  const { count, error } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role_key", "admin");
  if (error) return error.message;
  if ((count ?? 0) <= 1) {
    if (operation === "delete") {
      return "Impossibile eliminare l'ultimo amministratore del sistema.";
    }
    if (operation === "disable") {
      return "Impossibile disattivare l'ultimo amministratore del sistema.";
    }
    return "Impossibile rimuovere il ruolo admin all'ultimo amministratore.";
  }
  return null;
}
