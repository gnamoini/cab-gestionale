"use client";

import { useEffect, useState } from "react";
import { roleLabel, resolveRole, type AppRole } from "@/lib/auth/rbac";
import {
  formatSecurityWhen,
  SECURITY_USER_PRESENCE_LABEL,
  securityUserPresence,
  type SecurityUserPresence,
} from "@/lib/security/format-last-sign-in";

const ROLE_TONE: Record<AppRole, string> = {
  admin: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/35 dark:text-red-200 dark:ring-red-900/60",
  manager: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/35 dark:text-violet-200 dark:ring-violet-900/60",
  operatore: "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/35 dark:text-orange-200 dark:ring-orange-900/60",
  addetto_amministrativo:
    "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/35 dark:text-amber-200 dark:ring-amber-900/60",
  cliente: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/35 dark:text-sky-200 dark:ring-sky-900/60",
  guest: "bg-zinc-100 text-zinc-700 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700",
};

const PRESENCE_TONE: Record<SecurityUserPresence, { text: string; dot: string }> = {
  online: { text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  offline: { text: "text-[color:var(--cab-text-muted)]", dot: "bg-zinc-400" },
  never: { text: "text-[color:var(--cab-text-muted)]", dot: "bg-zinc-400" },
};

export function SecurityRoleBadge({ role }: { role: string }) {
  const canonical = resolveRole(role);
  return (
    <span className={`inline-flex min-w-0 max-w-full rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${ROLE_TONE[canonical] ?? ROLE_TONE.guest}`}>
      {roleLabel(role)}
    </span>
  );
}

export function SecurityStatusBadge({
  lastSignInAt,
  accountEnabled = true,
  align = "start",
}: {
  lastSignInAt: string | null;
  accountEnabled?: boolean;
  align?: "start" | "end";
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const alignClass = align === "end" ? "items-end text-right" : "items-start text-left";

  if (!mounted) {
    return (
      <span className={`inline-flex min-w-0 max-w-full flex-col gap-0.5 ${alignClass}`}>
        <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-[color:var(--cab-text-muted)]">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" aria-hidden />
          —
        </span>
      </span>
    );
  }

  if (!accountEnabled) {
    return (
      <span className={`inline-flex min-w-0 max-w-full flex-col gap-0.5 ${alignClass}`}>
        <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-[color:var(--cab-danger)]">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--cab-danger)]" aria-hidden />
          Disattivato
        </span>
      </span>
    );
  }

  const presence = securityUserPresence(lastSignInAt);
  const tone = PRESENCE_TONE[presence];
  const lastAccessLabel = lastSignInAt ? formatSecurityWhen(lastSignInAt) : "Mai connesso";

  return (
    <span className={`inline-flex min-w-0 max-w-full flex-col gap-0.5 ${alignClass}`}>
      <span className={`inline-flex min-w-0 items-center gap-1.5 text-xs font-medium ${tone.text}`}>
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`} aria-hidden />
        {SECURITY_USER_PRESENCE_LABEL[presence]}
      </span>
      <span className="text-[10px] leading-tight tabular-nums text-[color:var(--cab-text-muted)]">{lastAccessLabel}</span>
    </span>
  );
}
