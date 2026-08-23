"use client";

import { ShellNavIconRefresh } from "@/components/design-system/shell-nav-icons";
import { dsSystemBannerIconWrap } from "@/lib/ui/design-system";

export function SystemBannerRefreshIcon() {
  return (
    <div className={dsSystemBannerIconWrap} aria-hidden>
      <ShellNavIconRefresh dense className="h-5 w-5" />
    </div>
  );
}
