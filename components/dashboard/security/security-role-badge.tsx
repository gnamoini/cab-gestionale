"use client";

import { roleLabel, type AppRole } from "@/lib/auth/rbac";

const ROLE_TONE: Record<AppRole, string> = {
  admin: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/35 dark:text-red-200 dark:ring-red-900/60",
  manager: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/35 dark:text-violet-200 dark:ring-violet-900/60",
  operatore: "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/35 dark:text-orange-200 dark:ring-orange-900/60",
  cliente: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/35 dark:text-sky-200 dark:ring-sky-900/60",
  guest: "bg-zinc-100 text-zinc-700 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700",
};

export function SecurityRoleBadge({ role }: { role: AppRole }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${ROLE_TONE[role] ?? ROLE_TONE.guest}`}>
      {roleLabel(role)}
    </span>
  );
}

export function SecurityStatusBadge({ lastSignInAt }: { lastSignInAt: string | null }) {
  if (!lastSignInAt) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-[color:var(--cab-text-muted)]">
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" aria-hidden />
        Mai connesso
      </span>
    );
  }
  const days = (Date.now() - new Date(lastSignInAt).getTime()) / 86_400_000;
  if (days <= 7) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
        Attivo
      </span>
    );
  }
  if (days <= 90) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
        Inattivo
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[color:var(--cab-text-muted)]">
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" aria-hidden />
      Dormiente
    </span>
  );
}
