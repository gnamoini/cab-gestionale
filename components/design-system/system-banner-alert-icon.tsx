"use client";

import { ShellNavIconAlertTriangle } from "@/components/design-system/shell-nav-icons";
import { dsSystemBannerIconWrapWarning } from "@/lib/ui/design-system";

export function SystemBannerAlertIcon() {
  return (
    <div className={dsSystemBannerIconWrapWarning} aria-hidden>
      <ShellNavIconAlertTriangle dense className="h-5 w-5" />
    </div>
  );
}
