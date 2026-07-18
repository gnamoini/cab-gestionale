"use client";

import { PrivacyPolicyLink } from "@/components/legal/privacy-policy-link";

export function ProfileSheetFooter() {
  return (
    <div className="flex-safe-row min-w-0 max-w-full flex-nowrap items-center justify-center gap-x-2 gap-y-1 sm:flex-wrap">
      <PrivacyPolicyLink />
    </div>
  );
}
