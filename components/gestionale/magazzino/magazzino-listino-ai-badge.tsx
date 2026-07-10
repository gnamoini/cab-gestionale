"use client";

import { GeminiSparkIcon } from "@/components/design-system";
import { Tooltip } from "@/components/ui";
import type { ListinoImportMeta } from "@/lib/magazzino/listino-import/listino-import-meta";

function listinoAiBadgeTooltip(meta: ListinoImportMeta): string {
  const date = meta.importatoAt
    ? new Date(meta.importatoAt).toLocaleDateString("it-IT")
    : null;
  return date
    ? `Importato da listino con IA · ${meta.documentoNome} · ${date}`
    : `Importato da listino con IA · ${meta.documentoNome}`;
}

export function MagazzinoListinoAiBadge({
  listinoImport,
  variant = "table",
}: {
  listinoImport?: ListinoImportMeta;
  variant?: "table" | "mobile";
}) {
  if (!listinoImport?.generatoAutomaticamente) return null;

  const label = listinoAiBadgeTooltip(listinoImport);
  const shellClass = variant === "mobile" ? "size-6 rounded-full" : "size-5 rounded-full";

  return (
    <Tooltip content={label} side="top">
      <span
        className={`${shellClass} inline-flex shrink-0 items-center justify-center bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-surface))] text-[color:color-mix(in_srgb,var(--cab-primary)_88%,var(--cab-text))] ring-1 ring-[color:color-mix(in_srgb,var(--cab-primary)_28%,var(--cab-border))]`}
        aria-label={label}
      >
        <GeminiSparkIcon className={variant === "mobile" ? "size-3.5" : "size-3"} />
      </span>
    </Tooltip>
  );
}
