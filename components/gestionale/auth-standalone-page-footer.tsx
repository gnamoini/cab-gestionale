"use client";

import { PrivacyPolicyLink, profileFooterActionClass } from "@/components/legal/privacy-policy-link";
import { PwaInstallFooterButton } from "@/components/legal/pwa-install-footer-button";
import { TermsAndConditionsLink } from "@/components/legal/terms-and-conditions-link";
import { ThemeToggle } from "@/components/gestionale/theme-toggle";

/** Footer condiviso pagine standalone (login, reset password): install + legali + tema. */
export function AuthStandalonePageFooter() {
  return (
    <footer className="relative z-10 shrink-0 px-4 pb-5 pt-2 sm:px-6 sm:pb-6">
      <div className="flex-safe-row mx-auto min-w-0 max-w-[32rem] flex-nowrap items-center justify-center gap-x-2 gap-y-1 sm:flex-wrap">
        <PwaInstallFooterButton />
        <span className={`${profileFooterActionClass} min-h-0 px-0 py-0`} aria-hidden>
          ·
        </span>
        <PrivacyPolicyLink />
        <span className={`${profileFooterActionClass} min-h-0 px-0 py-0`} aria-hidden>
          ·
        </span>
        <TermsAndConditionsLink />
        <span className="text-[10px] text-[color:var(--cab-text-muted)] sm:text-xs" aria-hidden>
          ·
        </span>
        <ThemeToggle variant="ghost" />
      </div>
    </footer>
  );
}
