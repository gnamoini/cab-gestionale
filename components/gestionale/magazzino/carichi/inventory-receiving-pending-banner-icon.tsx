"use client";

import { ShellNavIconFileText } from "@/components/design-system/shell-nav-icons";
import { dsSystemBannerIconWrapWarning } from "@/lib/ui/design-system";

export function InventoryReceivingPendingBannerIcon() {
  return (
    <div className={dsSystemBannerIconWrapWarning} aria-hidden>
      <ShellNavIconFileText dense className="h-5 w-5" />
    </div>
  );
}
