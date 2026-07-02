"use client";

import { interventoTargetBadge } from "@/lib/domain/mezzo-attrezzatura/intervento-target";
import type { InterventoTargetType } from "@/src/types/supabase-tables";

export function InterventoTargetBadge({
  targetType,
  attrezzaturaMarca,
  className = "",
}: {
  targetType: InterventoTargetType;
  attrezzaturaMarca?: string;
  className?: string;
}) {
  const text = interventoTargetBadge(targetType, attrezzaturaMarca);
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-zinc-600 ring-1 ring-zinc-200 dark:text-zinc-300 dark:ring-zinc-700 ${className}`}
    >
      {text}
    </span>
  );
}
