"use client";

import { PrivacyPolicyLink } from "@/components/legal/privacy-policy-link";
import { TermsAndConditionsLink } from "@/components/legal/terms-and-conditions-link";

export function ProfileSheetFooter() {
  return (
    <div className="flex-safe-row min-w-0 max-w-full flex-nowrap items-center justify-center gap-x-2 gap-y-1 sm:flex-wrap">
      <PrivacyPolicyLink />
      <span className="text-[10px] text-[color:var(--cab-text-muted)] sm:text-xs" aria-hidden>
        ·
      </span>
      <TermsAndConditionsLink />
    </div>
  );
}
