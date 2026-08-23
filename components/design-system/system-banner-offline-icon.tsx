"use client";

import { ShellNavIconWifiOff } from "@/components/design-system/shell-nav-icons";
import { dsSystemBannerIconWrapWarning } from "@/lib/ui/design-system";

export function SystemBannerOfflineIcon() {
  return (
    <div className={dsSystemBannerIconWrapWarning} aria-hidden>
      <ShellNavIconWifiOff dense className="h-5 w-5" />
    </div>
  );
}
