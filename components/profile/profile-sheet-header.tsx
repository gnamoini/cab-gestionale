"use client";

import { SecurityRoleBadge } from "@/components/dashboard/security/security-role-badge";
import { UserProfileAvatar } from "@/components/gestionale/user-profile-avatar";
import { resolveRole } from "@/lib/auth/rbac";
import { resolveProfileRoleDescription } from "@/lib/profile/resolve-profile-role-description";
import type { PublicAuthUser } from "@/src/types/auth-user";

export function ProfileSheetHeader({ user }: { user: PublicAuthUser }) {
  const role = resolveRole(user.ruolo);
  return (
    <div className="rounded-xl border border-[color:var(--cab-border)] bg-[var(--cab-surface)] p-4">
      <div className="flex items-start gap-3">
        <UserProfileAvatar
          nome={user.nome}
          email={user.email}
          variant="header"
          className="h-14 w-14 shrink-0 text-lg"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-[color:var(--cab-text)]">{user.nome}</h3>
          <p className="mt-0.5 truncate text-xs text-[color:var(--cab-text-muted)]">{user.email}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <SecurityRoleBadge role={role} />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[color:var(--cab-text-muted)]">
            {resolveProfileRoleDescription(role)}
          </p>
        </div>
      </div>
    </div>
  );
}
