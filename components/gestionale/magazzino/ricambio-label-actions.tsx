"use client";

import { useCallback, useState, type ReactNode } from "react";
import { DisabledElementTooltip } from "@/components/ui";
import { LoadingButton } from "@/components/design-system";
import { PageActionIconLabels } from "@/components/ui/page-action-menu/page-action-menu-icons";
import { GlobalFixedListPillSelect } from "@/components/gestionale/global-input/global-fixed-list-pill";
import {
  DEFAULT_LABEL_PRESET,
  LABEL_PRESET_IDS,
  labelPresetOptionLabel,
} from "@/lib/inventory-labels/domain/templates";
import { BULK_SYNC_MAX } from "@/lib/inventory-labels/validation";
import { clampLabelQuantity } from "@/lib/inventory-labels/client/label-selection";
import {
  bulkLabelPhaseLabel,
  generateBulkLabelPdf,
  type BulkLabelGeneratePhase,
} from "@/lib/inventory-labels/client/bulk-generate";
import { dsCheckboxInput } from "@/lib/ui/design-system";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { READONLY_PERMISSION_HINT } from "@/src/lib/auth/permissions";
import { MagazzinoLabelQtyStepper } from "@/components/gestionale/magazzino/magazzino-label-qty-stepper";

const LABEL_PRESET_SELECT_ITEMS = LABEL_PRESET_IDS.map((id) => ({
  value: id,
  label: labelPresetOptionLabel(id),
}));

const LABEL_PRESET_PICKER_SHELL =
  "w-full min-w-0 !justify-between !text-left rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_88%,var(--cab-border))] bg-[var(--cab-surface)] font-semibold text-[color:var(--cab-text)] shadow-[var(--cab-shadow-sm)] outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-out hover:border-[color:color-mix(in_srgb,var(--cab-primary)_42%,var(--cab-border))] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))] focus:border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--cab-primary)_26%,transparent)]";

export function RicambioLabelActions({
  ricambioId,
  codice,
  canRead,
  trailingAction,
}: {
  ricambioId: string;
  codice: string;
  canRead: boolean;
  trailingAction?: ReactNode;
}) {
  const gestToast = useGestionaleToast();
  const [preset, setPreset] = useState(DEFAULT_LABEL_PRESET);
  const [clienteLabel, setClienteLabel] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [phase, setPhase] = useState<BulkLabelGeneratePhase>("idle");
  const [progress, setProgress] = useState(0);
  const busy = phase !== "idle";
  const canGenerate = canRead && quantity > 0 && !busy;

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;
    const qty = clampLabelQuantity(quantity);
    if (qty <= 0) return;
    const items = [{ id: ricambioId, quantity: qty }];
    await generateBulkLabelPdf(items, qty, preset, clienteLabel, gestToast, {
      onPhaseChange: (nextPhase, nextProgress) => {
        setPhase(nextPhase);
        setProgress(nextProgress);
      },
    });
  }, [canGenerate, clienteLabel, gestToast, preset, quantity, ricambioId]);

  const generateButton = (
    <DisabledElementTooltip content={READONLY_PERMISSION_HINT} disabled={!canRead}>
      <LoadingButton
        className="w-full justify-center whitespace-nowrap"
        loading={busy}
        loadingLabel={bulkLabelPhaseLabel(phase, progress)}
        disabled={!canGenerate}
        onClick={() => void handleGenerate()}
      >
        {!busy ? <PageActionIconLabels className="h-4 w-4 shrink-0" aria-hidden /> : null}
        {`Genera ${quantity} etichett${quantity === 1 ? "a" : "e"}`}
      </LoadingButton>
    </DisabledElementTooltip>
  );

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <div className="space-y-2 rounded-lg border border-[color:var(--cab-border)] bg-[color:var(--cab-surface)] p-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-[color:var(--cab-text-muted)]">
          Formato etichetta
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
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-[color:var(--cab-text-muted)]">
          Quantità etichette
          <MagazzinoLabelQtyStepper
            value={quantity}
            onChange={(next) => setQuantity(Math.max(1, clampLabelQuantity(next)))}
            disabled={busy}
            ariaLabel={`Quantità etichette ${codice}`}
          />
        </label>

        <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm text-[color:var(--cab-text)]">
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

        {quantity > BULK_SYNC_MAX ? (
          <p className="text-xs leading-snug text-[color:var(--cab-text-muted)]">
            Selezione ampia: generazione in background (oltre {BULK_SYNC_MAX} etichette).
          </p>
        ) : null}
      </div>

      {trailingAction ? (
        <div className="grid grid-cols-2 gap-2">
          {generateButton}
          {trailingAction}
        </div>
      ) : (
        generateButton
      )}
    </div>
  );
}
