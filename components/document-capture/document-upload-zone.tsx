"use client";

import { HubIconUpload } from "@/components/design-system/hub-table-action-icons";
import { GestionaleUploadDropExpand } from "@/components/gestionale/upload";
import type { UploadConfig } from "@/lib/document-capture/capture-experience-adapter";
import { dsUploadDropExpand } from "@/lib/ui/design-system";

type Props = {
  config: UploadConfig;
  disabled?: boolean;
  showHeading?: boolean;
  onFile: (file: File) => void;
};

export function DocumentUploadZone({ config, disabled = false, showHeading = true, onFile }: Props) {
  return (
    <section className="space-y-3">
      {showHeading ? <h3 className="text-sm font-medium">Carica documento</h3> : null}
      <GestionaleUploadDropExpand
        overlay
        accept={config.accept}
        disabled={disabled}
        onFile={onFile}
        dropTitle={config.dropTitle}
        dropHint={config.dropHint}
        className="min-w-0"
      >
        <div
          className={`${dsUploadDropExpand} px-4 py-8 transition-[border-color,background-color,box-shadow,transform] duration-200 ease-out hover:border-[color:color-mix(in_srgb,var(--cab-primary)_38%,var(--cab-border))] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_6%,var(--cab-surface))] active:scale-[0.995] motion-reduce:transition-none motion-reduce:hover:transform-none`}
        >
          <span
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--cab-primary)_16%,var(--cab-surface))] text-[color:var(--cab-primary)] shadow-[var(--cab-shadow-sm)]"
            aria-hidden
          >
            <HubIconUpload className="h-5 w-5 shrink-0" />
          </span>
          <p className="text-sm font-semibold text-[color:var(--cab-text)]">{config.chooseLabel}</p>
          <p className="max-w-md text-xs leading-snug text-[color:var(--cab-text-muted)]">{config.dragHint}</p>
          <p className="text-[10px] uppercase tracking-wide text-[color:var(--cab-text-muted)]">{config.formatHint}</p>
        </div>
      </GestionaleUploadDropExpand>
    </section>
  );
}
