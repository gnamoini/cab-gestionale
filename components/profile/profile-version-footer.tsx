"use client";

import { formatAppBuildFooterLines } from "@/lib/env/app-build-info";

export function ProfileVersionFooter() {
  const lines = formatAppBuildFooterLines();
  return (
    <p className="text-center text-[10px] leading-relaxed text-[color:var(--cab-text-muted)]">
      {lines.join(" · ")}
    </p>
  );
}
