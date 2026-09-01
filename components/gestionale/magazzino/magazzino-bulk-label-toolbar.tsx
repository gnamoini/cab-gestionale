"use client";

import { useCallback, useState } from "react";
import { LoadingButton } from "@/components/design-system";
import { HubIconClose } from "@/components/design-system/hub-table-action-icons";
import { gestionaleModalFooterCancelBtnClass } from "@/components/design-system/gestionale-modal-footer-actions";
import { GlobalFixedListPillSelect } from "@/components/gestionale/global-input/global-fixed-list-pill";
import { PageActionIconLabels } from "@/components/ui/page-action-menu/page-action-menu-icons";
import {
  dsCheckboxInput,
  dsPageToolbar,
} from "@/lib/ui/design-system";
import {
  DEFAULT_LABEL_PRESET,
  LABEL_PRESET_IDS,
  labelPresetOptionLabel,
} from "@/lib/inventory-labels/domain/templates";
import { BULK_SYNC_MAX } from "@/lib/inventory-labels/validation";
import {
  labelQuantitiesToCompactItems,
  type LabelSelection,
} from "@/lib/inventory-labels/client/label-selection";
import {
  bulkLabelPhaseLabel,
  generateBulkLabelPdf,
  type BulkLabelGeneratePhase,
} from "@/lib/inventory-labels/client/bulk-generate";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

const TOOLBAR_BTN_ICON_CLASS = "h-4 w-4 shrink-0";

const LABEL_PRESET_SELECT_ITEMS = LABEL_PRESET_IDS.map((id) => ({
  value: id,
  label: labelPresetOptionLabel(id),
}));

const LABEL_PRESET_PICKER_SHELL =
  "w-full min-w-0 !justify-between !text-left rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_88%,var(--cab-border))] bg-[var(--cab-surface)] font-semibold text-[color:var(--cab-text)] shadow-[var(--cab-shadow-sm)] outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-out hover:border-[color:color-mix(in_srgb,var(--cab-primary)_42%,var(--cab-border))] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))] focus:border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--cab-primary)_26%,transparent)]";

export function MagazzinoBulkLabelToolbar({
  selection,
  onClearSelection,
}: {
  selection: LabelSelection;
  onClearSelection: () => void;
}) {
  const gestToast = useGestionaleToast();
  const [preset, setPreset] = useState(DEFAULT_LABEL_PRESET);
  const [clienteLabel, setClienteLabel] = useState(false);
  const [phase, setPhase] = useState<BulkLabelGeneratePhase>("idle");
  const [progress, setProgress] = useState(0);
  const { totalLabels, totalItems, hasSelection } = selection;
  const busy = phase !== "idle";
  const canGenerate = hasSelection && !busy;

  const handlePrint = useCallback(async () => {
    if (!hasSelection) return;
    const items = labelQuantitiesToCompactItems(selection.quantities);
    await generateBulkLabelPdf(items, totalLabels, preset, clienteLabel, gestToast, {
      onPhaseChange: (nextPhase, nextProgress) => {
        setPhase(nextPhase);
        setProgress(nextProgress);
      },
    });
  }, [gestToast, hasSelection, clienteLabel, preset, selection.quantities, totalLabels]);

  const phaseLabel = bulkLabelPhaseLabel(phase, progress);

  return (
    <div
      role="region"
      aria-label="Generazione etichette"
      className={`${dsPageToolbar} sticky bottom-0 z-20 mt-3 w-full min-w-0`}
    >
      <div className="flex min-w-0 flex-col gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight text-[color:var(--cab-text)]">Etichette ricambi</p>
          <p className="text-xs leading-snug text-[color:var(--cab-text-muted)]">
            {!hasSelection
              ? "Imposta la quantità per ogni ricambio in lista"
              : `${totalLabels} etichett${totalLabels === 1 ? "a" : "e"} · ${totalItems} ricamb${totalItems === 1 ? "o" : "i"}`}
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-2 border-t border-[color:var(--cab-border)] pt-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-md">
            <span className="text-xs font-medium text-[color:var(--cab-text-muted)]">Formato etichetta</span>
            <GlobalFixedListPillSelect
              value={preset}
              onChange={setPreset}
              options={LABEL_PRESET_SELECT_ITEMS}
              ariaLabel="Formato etichetta"
              sheetTitle="Formato etichetta"
              disabled={busy}
              size="form"
              shellClass={LABEL_PRESET_PICKER_SHELL}
            />
          </div>

          <label className="flex min-h-10 shrink-0 cursor-pointer items-center gap-2 text-sm text-[color:var(--cab-text)] sm:min-h-11 sm:self-end">
            <input
              type="checkbox"
              className={dsCheckboxInput}
              checked={clienteLabel}
              onChange={(e) => setClienteLabel(e.target.checked)}
              disabled={busy}
              aria-label="Etichetta cliente"
            />
            Etichetta cliente
          </label>

          <div className="flex w-full min-w-0 flex-col gap-2 sm:ms-auto sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-2">
            {hasSelection ? (
              <button
                type="button"
                className={`${gestionaleModalFooterCancelBtnClass} w-full justify-center sm:w-auto sm:shrink-0`}
                onClick={onClearSelection}
                disabled={busy}
              >
                <HubIconClose className={TOOLBAR_BTN_ICON_CLASS} aria-hidden />
                <span className="sm:hidden">Azzera</span>
                <span className="hidden sm:inline">Azzera quantità</span>
              </button>
            ) : null}
            <LoadingButton
              className="w-full justify-center whitespace-nowrap sm:w-auto sm:min-w-[10rem] sm:shrink-0"
              loading={busy}
              loadingLabel={phaseLabel}
              disabled={!canGenerate}
              onClick={() => void handlePrint()}
            >
              {!busy ? <PageActionIconLabels className={TOOLBAR_BTN_ICON_CLASS} aria-hidden /> : null}
              {hasSelection
                ? `Genera ${totalLabels} etichett${totalLabels === 1 ? "a" : "e"}`
                : "Genera etichette"}
            </LoadingButton>
          </div>
        </div>

        {totalLabels > BULK_SYNC_MAX ? (
          <p className="text-xs leading-snug text-[color:var(--cab-text-muted)]">
            Selezione ampia: generazione in background (oltre {BULK_SYNC_MAX} etichette).
          </p>
        ) : null}
      </div>
    </div>
  );
}
