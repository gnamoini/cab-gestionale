import type { ReactNode } from "react";
import {
  dsBadgeDanger,
  dsBadgeInfo,
  dsBadgeNeutral,
  dsBadgeOk,
  dsBadgeWarn,
} from "@/lib/ui/design-system";

export type BadgeTone = "neutral" | "warn" | "danger" | "ok" | "info";

const toneClass: Record<BadgeTone, string> = {
  neutral: dsBadgeNeutral,
  warn: dsBadgeWarn,
  danger: dsBadgeDanger,
  ok: dsBadgeOk,
  info: dsBadgeInfo,
};

export function Badge({ tone = "neutral", children, className = "" }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return <span className={`${toneClass[tone]} ${className}`.trim()}>{children}</span>;
}
