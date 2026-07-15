"use client";

import { PrivacyPolicyLink, profileFooterActionClass } from "@/components/legal/privacy-policy-link";
import { PwaInstallFooterButton } from "@/components/legal/pwa-install-footer-button";

export function ProfileSheetFooter() {
  return (
    <div className="flex-safe-row min-w-0 max-w-full flex-nowrap items-center justify-center gap-x-2 gap-y-1 sm:flex-wrap">
      <PwaInstallFooterButton />
      <span className={`${profileFooterActionClass} min-h-0 px-0 py-0`} aria-hidden>
        ·
      </span>
      <PrivacyPolicyLink />
    </div>
  );
}
