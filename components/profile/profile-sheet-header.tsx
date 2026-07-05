"use client";

import { SecurityRoleBadge } from "@/components/dashboard/security/security-role-badge";
import { UserProfileAvatar } from "@/components/gestionale/user-profile-avatar";
import { profileDisplayName } from "@/lib/auth/profile-display-name";
import { resolveRole } from "@/lib/auth/rbac";
import type { PublicAuthUser } from "@/src/types/auth-user";

export function ProfileSheetHeader({ user }: { user: PublicAuthUser }) {
  const role = resolveRole(user.ruolo);
  const headerName =
    profileDisplayName({ nome: user.givenName, cognome: user.cognome }) || user.email || "—";

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_7%,var(--cab-surface))] px-4 py-5 text-center shadow-[var(--cab-shadow-sm)]"
      data-testid="profile-sheet-header"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[radial-gradient(ellipse_80%_100%_at_50%_0%,color-mix(in_srgb,var(--cab-primary)_16%,transparent),transparent)]"
        aria-hidden
      />
      <div className="relative flex flex-col items-center">
        <UserProfileAvatar
          nome={headerName}
          email={user.email}
          variant="sheet"
          className="ring-2 ring-[color:color-mix(in_srgb,var(--cab-primary)_32%,transparent)] ring-offset-2 ring-offset-[color:color-mix(in_srgb,var(--cab-primary)_7%,var(--cab-surface))]"
        />
        <h3 className="mt-3 max-w-full truncate text-lg font-semibold leading-tight text-[color:var(--cab-text)]">
          {headerName}
        </h3>
        {user.email ? (
          <p className="mt-1 max-w-full truncate text-sm text-[color:var(--cab-text-muted)]" title={user.email}>
            {user.email}
          </p>
        ) : null}
        <div className="mt-2.5 flex justify-center">
          <SecurityRoleBadge role={role} />
        </div>
      </div>
    </div>
  );
}
