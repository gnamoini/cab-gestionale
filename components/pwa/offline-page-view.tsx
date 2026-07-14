"use client";

import {
  AuthStandaloneCardHeader,
  AuthStandalonePageShell,
  authStandaloneCardClass,
} from "@/components/gestionale/auth-standalone-page";
import {
  PWA_OFFLINE_MESSAGE,
  PWA_OFFLINE_RETRY_LABEL,
  PWA_OFFLINE_TITLE,
} from "@/lib/pwa/sw-offline";

export function OfflinePageView() {
  return (
    <AuthStandalonePageShell showThemeToggle decorativeBackground>
      <div className="flex min-h-dvh items-center justify-center px-4 py-10">
        <div className={authStandaloneCardClass}>
          <AuthStandaloneCardHeader srOnlyTitle={PWA_OFFLINE_TITLE} />
          <div className="text-center">
            <h2 className="text-lg font-semibold text-[color:var(--cab-text)]">{PWA_OFFLINE_TITLE}</h2>
            <p className="mt-3 text-sm leading-relaxed text-[color:var(--cab-text-muted)]">
              {PWA_OFFLINE_MESSAGE}
            </p>
            <button
              type="button"
              className="mt-6 w-full rounded-lg bg-[color:var(--cab-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
              onClick={() => window.location.reload()}
            >
              {PWA_OFFLINE_RETRY_LABEL}
            </button>
          </div>
        </div>
      </div>
    </AuthStandalonePageShell>
  );
}
