"use client";

import { roleLabel } from "@/lib/auth/rbac";
import { formatSecurityNullableWhen } from "@/lib/security/format-last-sign-in";
import type { PublicAuthUser } from "@/src/types/auth-user";

function ProfileInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <dt className="shrink-0 text-[color:var(--cab-text-muted)]">{label}</dt>
      <dd className="min-w-0 truncate text-right text-[color:var(--cab-text)]" title={value}>
        {value}
      </dd>
    </div>
  );
}

export function ProfileAccountSection({ user }: { user: PublicAuthUser }) {
  const rows: Array<{ label: string; value: string }> = [
    { label: "Nome", value: user.givenName || "—" },
    { label: "Cognome", value: user.cognome ?? "—" },
    { label: "Nome visualizzato", value: user.nome || "—" },
    { label: "Email", value: user.email || "—" },
    { label: "Ruolo", value: roleLabel(user) },
  ];

  if (user.username) {
    rows.push({ label: "Nome utente", value: user.username });
  }

  rows.push(
    { label: "ID utente", value: user.id },
    { label: "Account creato", value: formatSecurityNullableWhen(user.createdAt) },
  );

  return (
    <section aria-labelledby="profile-account-heading">
      <h3 id="profile-account-heading" className="text-sm font-semibold text-[color:var(--cab-text)]">
        Informazioni account
      </h3>
      <dl className="mt-2 space-y-2 rounded-xl border border-[color:var(--cab-border)] bg-[var(--cab-surface)] p-3">
        {rows.map((row) => (
          <ProfileInfoRow key={row.label} label={row.label} value={row.value} />
        ))}
      </dl>
    </section>
  );
}
