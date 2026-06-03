/** Validazione input server actions sicurezza / impostazioni portale clienti. */

import { APP_ROLES, type AppRole } from "@/lib/auth/rbac";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_BATCH_PATCHES = 100;

export type ValidatedSecurityUserBatchPatch = {
  userId: string;
  nome?: string;
  ruolo?: AppRole;
  clientLavorazioniAccess?: boolean;
};

export function validateUserId(userId: string | null | undefined): string | null {
  const t = userId?.trim() ?? "";
  if (!t) return "Utente non valido.";
  if (!UUID_RE.test(t)) return "ID utente non valido.";
  return null;
}

export function validateOptionalDisplayName(nome: string | null | undefined): string | null {
  if (nome == null) return null;
  const t = nome.trim();
  if (!t) return "Il nome non può essere vuoto.";
  if (t.length < 2 || t.length > 120) return "Nome non valido (2–120 caratteri).";
  return null;
}

export function validateAppRoleValue(ruolo: string | null | undefined): ruolo is AppRole {
  if (!ruolo) return false;
  return (APP_ROLES as readonly string[]).includes(ruolo);
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

    if (p.ruolo !== undefined) {
      if (typeof p.ruolo !== "string" || !validateAppRoleValue(p.ruolo)) {
        return { ok: false, message: "Ruolo non valido." };
      }
      patch.ruolo = p.ruolo;
    }

    if (p.clientLavorazioniAccess !== undefined) {
      if (typeof p.clientLavorazioniAccess !== "boolean") {
        return { ok: false, message: "Flag accesso clienti non valido." };
      }
      patch.clientLavorazioniAccess = p.clientLavorazioniAccess;
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
