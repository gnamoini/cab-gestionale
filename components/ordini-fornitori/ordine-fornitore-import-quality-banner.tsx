import type { ImportQualityLevel } from "@/lib/ordini-fornitori/import/ordine-fornitore-import-types";
import { importQualityBannerLabel } from "@/lib/ordini-fornitori/import/compute-import-quality";

const LEVEL_STYLE: Record<ImportQualityLevel, string> = {
  high: "border-[color:color-mix(in_srgb,var(--cab-success)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-success)_12%,var(--cab-surface))]",
  medium:
    "border-[color:color-mix(in_srgb,var(--cab-warning)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_12%,var(--cab-surface))]",
  low: "border-[color:color-mix(in_srgb,var(--cab-danger)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-danger)_12%,var(--cab-surface))]",
};

const LEVEL_ICON: Record<ImportQualityLevel, string> = {
  high: "🟢",
  medium: "🟡",
  low: "🔴",
};

export function OrdineFornitoreImportQualityBanner({ level }: { level: ImportQualityLevel }) {
  return (
    <div
      className={`rounded-[var(--ds-radius-md)] border px-3 py-2 text-sm text-[color:var(--cab-text)] ${LEVEL_STYLE[level]}`}
      role="status"
    >
      <span className="mr-2" aria-hidden>
        {LEVEL_ICON[level]}
      </span>
      {importQualityBannerLabel(level)}
    </div>
  );
}
