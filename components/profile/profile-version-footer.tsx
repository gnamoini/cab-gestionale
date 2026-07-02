"use client";

import { formatAppBuildFooterLines } from "@/lib/env/app-build-info";

export function ProfileVersionFooter() {
  const lines = formatAppBuildFooterLines();
  return (
    <footer className="border-t border-[color:var(--cab-border)] pt-3 text-center">
      <p className="text-[10px] leading-relaxed text-[color:var(--cab-text-muted)]">{lines.join(" · ")}</p>
    </footer>
  );
}
