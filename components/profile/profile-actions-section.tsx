"use client";

import { useState } from "react";
import { ThemeModeIcon, ThemeToggle } from "@/components/gestionale/theme-toggle";
import { requestPasswordResetEmail } from "@/lib/auth/request-password-reset.client";
import { erpFocus } from "@/lib/ui/erp-tokens";
import { suppressSidebarBlurCollapse } from "@/lib/ui/use-sidebar-collapsed";
import {
  accountMenuItemClass,
  accountMenuItemMutedIconClass,
  accountMenuSessionMenuClass,
} from "@/lib/ui/global-input";
import type { PublicAuthUser } from "@/src/types/auth-user";

function SessionMenuIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-500 dark:bg-zinc-800/80 dark:text-zinc-400">
      {children}
    </span>
  );
}

function PasswordIcon({ className = accountMenuItemMutedIconClass }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c1.657 0 3-1.343 3-3V6a3 3 0 1 0-6 0v2c0 1.657 1.343 3 3 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 11h14v10H5V11z" />
    </svg>
  );
}

function LogoutIcon({ className = accountMenuItemMutedIconClass }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

export function ProfileActionsSection({
  user,
  onLogout,
}: {
  user: PublicAuthUser;
  onLogout: () => void;
}) {
  const [passwordPending, setPasswordPending] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function handlePasswordReset() {
    setPasswordPending(true);
    setPasswordMessage(null);
    setPasswordError(null);
    const res = await requestPasswordResetEmail(user.email);
    setPasswordPending(false);
    if (!res.ok) {
      setPasswordError(res.message);
      return;
    }
    setPasswordMessage(
      user.email?.trim()
        ? `Link inviato a ${user.email.trim()}. Controlla la posta per reimpostare la password.`
        : "Link inviato. Controlla la posta per reimpostare la password.",
    );
  }

  return (
    <section aria-labelledby="profile-actions-heading">
      <h3 id="profile-actions-heading" className="text-sm font-semibold text-[color:var(--cab-text)]">
        Azioni
      </h3>
      <div className="mt-2 overflow-hidden rounded-xl border border-[color:var(--cab-border)] bg-[var(--cab-surface)]">
        <div className={`${accountMenuSessionMenuClass} p-1`} role="presentation">
          <div
            className={`${accountMenuItemClass} cursor-default text-[color:var(--cab-text-muted)] hover:bg-transparent`}
            onPointerDown={(event) => {
              event.stopPropagation();
              suppressSidebarBlurCollapse();
            }}
          >
            <SessionMenuIcon>
              <ThemeModeIcon className="h-4 w-4 text-[color:var(--cab-text-muted)]" />
            </SessionMenuIcon>
            <span className="min-w-0 flex-1 truncate">Aspetto</span>
            <ThemeToggle variant="switch" />
          </div>
          <button
            type="button"
            className={`${accountMenuItemClass} ${erpFocus}`}
            disabled={passwordPending}
            onClick={() => void handlePasswordReset()}
          >
            <SessionMenuIcon>
              <PasswordIcon className="h-4 w-4" />
            </SessionMenuIcon>
            <span className="min-w-0 flex-1 truncate text-left">
              {passwordPending ? "Invio in corso…" : "Cambia password"}
            </span>
          </button>
        </div>
        {passwordMessage ? (
          <p className="border-t border-[color:var(--cab-border)] px-3 py-2 text-xs text-[color:var(--cab-success)]">
            {passwordMessage}
          </p>
        ) : null}
        {passwordError ? (
          <p className="border-t border-[color:var(--cab-border)] px-3 py-2 text-xs text-[color:var(--cab-danger)]">
            {passwordError}
          </p>
        ) : null}
        <div className="border-t border-[color:var(--cab-border)] p-1">
          <button
            type="button"
            role="menuitem"
            data-testid="smoke-logout"
            onClick={onLogout}
            className={`${accountMenuItemClass} w-full hover:bg-[color:color-mix(in_srgb,var(--cab-danger)_8%,var(--cab-hover))] ${erpFocus}`}
          >
            <SessionMenuIcon>
              <LogoutIcon className="h-4 w-4" />
            </SessionMenuIcon>
            <span className="min-w-0 flex-1 truncate text-left">Esci</span>
          </button>
        </div>
      </div>
    </section>
  );
}
