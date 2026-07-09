"use client";

import { useStatusColor } from "@/components/report/design-system/internal/use-semantic-color";
import type { StatusTone } from "@/components/report/design-system/internal/semantic-types";

export function StatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: StatusTone;
}) {
  const shell = useStatusColor(tone);
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${shell}`}>
      {label}
    </span>
  );
}
