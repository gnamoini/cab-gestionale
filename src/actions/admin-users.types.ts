import type { AppRole } from "@/lib/auth/rbac";

export type CreateUserByAdminInput = {
  nome: string;
  cognome?: string | null;
  username: string;
  email: string;
  password: string;
  ruolo: AppRole;
  clienteRef?: string | null;
};

export type CreateUserByAdminResult =
  | { ok: true; userId: string }
  | { ok: false; message: string };

export type CheckUsernameAvailabilityResult =
  | { ok: true; available: boolean }
  | { ok: false; message: string };

export type SecurityUserAdminRow = {
  id: string;
  nome: string;
  cognome: string | null;
  username: string | null;
  email: string;
  ruolo: AppRole;
  clienteRef: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  accountEnabled: boolean;
  bannedUntil: string | null;
};

export type SetUserAccountEnabledResult = { ok: true } | { ok: false; message: string };

export type SendPasswordResetByAdminResult = { ok: true } | { ok: false; message: string };

export type ListUsersByAdminResult =
  | { ok: true; users: SecurityUserAdminRow[] }
  | { ok: false; message: string };

export type ResetGlobalChangeLogsResult =
  | { ok: true; deletedCount: number | null }
  | { ok: false; message: string };

export type DeleteUserByAdminResult = { ok: true } | { ok: false; message: string };

export type AdminCallerContext =
  | { ok: true; callerId: string; callerName: string; serviceKey: string; url: string }
  | { ok: false; message: string };
