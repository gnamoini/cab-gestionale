"use client";

import { useState } from "react";
import { LIST_DIVIDER_UL } from "@/lib/ui/list-primitives";
import { ThemeModeIcon, ThemeToggle } from "@/components/gestionale/theme-toggle";
import { PwaInstallFooterButton } from "@/components/legal/pwa-install-footer-button";
import { GestionaleConfirmDialogLazy } from "@/components/gestionale/gestionale-confirm-dialog-lazy";
import { requestPasswordResetEmail } from "@/lib/auth/request-password-reset.client";
import { dsFocusRing } from "@/lib/ui/design-system";
import { cabModalZConfirm } from "@/lib/ui/mobile-modal-behavior";
import { suppressSidebarBlurCollapse } from "@/lib/ui/use-sidebar-collapsed";
import {
  accountMenuItemMutedIconClass,
} from "@/lib/ui/global-input";
import type { PublicAuthUser } from "@/src/types/auth-user";

const profileActionItemClass =
  "group flex w-full min-h-11 items-center gap-2.5 px-3 py-2.5 text-left text-xs font-medium text-[color:var(--cab-text)] transition-colors duration-150 hover:bg-[var(--cab-hover)] active:bg-[color:color-mix(in_srgb,var(--cab-hover)_92%,var(--cab-card))] sm:min-h-10";

function SessionMenuIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[color:color-mix(in_srgb,var(--cab-surface-2)_88%,var(--cab-card))] text-[color:var(--cab-text-muted)] transition-colors duration-150 group-hover:bg-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,var(--cab-hover))] group-hover:text-[color:var(--cab-text)]">
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
  const [passwordConfirmOpen, setPasswordConfirmOpen] = useState(false);
  const [passwordPending, setPasswordPending] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const emailLabel = user.email?.trim() || "il tuo indirizzo email";

  function openPasswordConfirm() {
    setPasswordMessage(null);
    setPasswordError(null);
    setPasswordConfirmOpen(true);
  }

  async function handlePasswordReset() {
    setPasswordPending(true);
    setPasswordMessage(null);
    setPasswordError(null);
    const res = await requestPasswordResetEmail(user.email);
    setPasswordPending(false);
    setPasswordConfirmOpen(false);
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
        <div className={`flex flex-col ${LIST_DIVIDER_UL}`} role="presentation">
          <div
            className={`${profileActionItemClass} cursor-default`}
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
          <PwaInstallFooterButton variant="profile-action" />
          <button
            type="button"
            className={`${profileActionItemClass} ${dsFocusRing}`}
            disabled={passwordPending}
            onClick={openPasswordConfirm}
          >
            <SessionMenuIcon>
              <PasswordIcon className="h-4 w-4" />
            </SessionMenuIcon>
            <span className="min-w-0 flex-1 truncate text-left">
              {passwordPending ? "Invio in corso…" : "Cambia password"}
            </span>
          </button>
          {passwordMessage ? (
            <p className="px-3 py-2 text-xs text-[color:var(--cab-success)]">{passwordMessage}</p>
          ) : null}
          {passwordError ? (
            <p className="px-3 py-2 text-xs text-[color:var(--cab-danger)]">{passwordError}</p>
          ) : null}
          <button
            type="button"
            role="menuitem"
            data-testid="smoke-logout"
            onClick={onLogout}
            className={`${profileActionItemClass} ${dsFocusRing}`}
          >
            <SessionMenuIcon>
              <LogoutIcon className="h-4 w-4" />
            </SessionMenuIcon>
            <span className="min-w-0 flex-1 truncate text-left">Esci</span>
          </button>
        </div>
      </div>

      {passwordConfirmOpen ? (
        <GestionaleConfirmDialogLazy
          open={passwordConfirmOpen}
          title="Inviare link di reimpostazione?"
          message={`Invieremo un'email a ${emailLabel} con il link per impostare una nuova password.`}
          confirmLabel="Invia email"
          cancelLabel="Annulla"
          pending={passwordPending}
          layerClassName={cabModalZConfirm}
          onCancel={() => setPasswordConfirmOpen(false)}
          onConfirm={() => void handlePasswordReset()}
        />
      ) : null}
    </section>
  );
}
