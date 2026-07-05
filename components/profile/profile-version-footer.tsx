"use client";

import { formatAppBuildFooterLines } from "@/lib/env/app-build-info";
import { PrivacyPolicyLink, profileFooterActionClass } from "@/components/legal/privacy-policy-link";

export function ProfileVersionFooter() {
  const lines = formatAppBuildFooterLines();
  return (
    <div className="flex-safe-row min-w-0 max-w-full flex-nowrap items-center justify-center gap-x-2 gap-y-1 sm:flex-wrap">
      <span className={`${profileFooterActionClass} text-center`}>{lines.join(" · ")}</span>
      <span className={`${profileFooterActionClass} min-h-0 px-0 py-0`} aria-hidden>
        ·
      </span>
      <PrivacyPolicyLink />
    </div>
  );
}
