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
  BULK_SYNC_MAX,
  DEFAULT_LABEL_PRESET,
  LABEL_PRESET_IDS,
  labelPresetOptionLabel,
  isBulkSyncCount,
} from "@/lib/inventory-labels";
import {
  labelQuantitiesToCompactItems,
  type LabelSelection,
} from "@/lib/inventory-labels/client/label-selection";
import {
  buildInventoryBulkPdfUrl,
  inventoryBulkJobPdfUrl,
} from "@/lib/inventory-labels/client/bulk-pdf-url";
import {
  isDeferredPopupBlocked,
  openDeferredPopup,
  tryOpenViaTemporaryAnchor,
  type DeferredPopupHandle,
} from "@/lib/browser/popup-guard";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

type BulkLabelPhase = "idle" | "preparing" | "generating" | "opening";

const BULK_FETCH_TIMEOUT_MS = 280_000;

const TOOLBAR_BTN_ICON_CLASS = "h-4 w-4 shrink-0";

const LABEL_PRESET_SELECT_ITEMS = LABEL_PRESET_IDS.map((id) => ({
  value: id,
  label: labelPresetOptionLabel(id),
}));

const LABEL_PRESET_PICKER_SHELL =
  "w-full min-w-0 !justify-between !text-left rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_88%,var(--cab-border))] bg-[var(--cab-surface)] font-semibold text-[color:var(--cab-text)] shadow-[var(--cab-shadow-sm)] outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-out hover:border-[color:color-mix(in_srgb,var(--cab-primary)_42%,var(--cab-border))] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))] focus:border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--cab-primary)_26%,transparent)]";

function openBulkLabelPdfUrl(url: string, deferred?: DeferredPopupHandle | null): boolean {
  if (deferred?.isAlive()) {
    const nav = deferred.navigate(url);
    if (nav.status === "opened") return true;
    deferred.close();
  }
  try {
    tryOpenViaTemporaryAnchor(url);
    return true;
  } catch {
    return false;
  }
}

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
  const [phase, setPhase] = useState<BulkLabelPhase>("idle");
  const [progress, setProgress] = useState(0);
  const { totalLabels, totalItems, hasSelection } = selection;
  const busy = phase !== "idle";
  const canGenerate = hasSelection && !busy;

  const handlePrint = useCallback(async () => {
    if (!hasSelection) return;
    const items = labelQuantitiesToCompactItems(selection.quantities);

    if (isBulkSyncCount(totalLabels)) {
      try {
        tryOpenViaTemporaryAnchor(buildInventoryBulkPdfUrl(items, preset, clienteLabel));
        return;
      } catch {
        gestToast.error("Impossibile aprire il PDF etichette.");
        return;
      }
    }

    const deferredResult = openDeferredPopup({ context: "etichette", label: "PDF etichette" });
    if (isDeferredPopupBlocked(deferredResult)) return;
    const deferred = deferredResult;

    setPhase("preparing");
    setProgress(0);
    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), BULK_FETCH_TIMEOUT_MS);
      setPhase("generating");
      const res = await fetch("/api/inventory-labels/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, preset, format: "pdf", includeBarcode: false, clienteLabel }),
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);

      if (res.status === 202) {
        const { jobId } = (await res.json()) as { jobId: string };
        gestToast.info(`Generazione ${totalLabels} etichette in corso…`);
        const jobPdfUrl = inventoryBulkJobPdfUrl(jobId);
        const poll = async (attempt = 0): Promise<void> => {
          if (attempt > 120) throw new Error("Timeout job etichette");
          const jobRes = await fetch(jobPdfUrl);
          if (jobRes.headers.get("Content-Type")?.includes("application/pdf")) {
            setPhase("opening");
            setProgress(100);
            const opened = openBulkLabelPdfUrl(jobPdfUrl, deferred);
            if (!opened) {
              gestToast.error("Impossibile aprire il PDF etichette.");
              return;
            }
            gestToast.successOnce("bulk-labels", "PDF etichette pronto.");
            return;
          }
          if (jobRes.headers.get("Content-Type")?.includes("application/zip")) {
            throw new Error("Generazione PDF non riuscita. Riprova o riduci la selezione.");
          }
          const status = (await jobRes.json()) as {
            status: string;
            progress?: number;
            error?: string;
            errorCode?: string;
          };
          if (status.status === "failed") {
            throw new Error(status.error ?? status.errorCode ?? "Job fallito");
          }
          if (typeof status.progress === "number") setProgress(status.progress);
          if (status.status === "completed") {
            setPhase("opening");
            const opened = openBulkLabelPdfUrl(jobPdfUrl, deferred);
            if (!opened) {
              gestToast.error("Impossibile aprire il PDF etichette.");
            }
            return;
          }
          await new Promise((r) => window.setTimeout(r, 1500));
          return poll(attempt + 1);
        };
        await poll();
        return;
      }

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Stampa bulk non riuscita");
      }
      const contentType = res.headers.get("Content-Type") ?? "";
      if (contentType.includes("application/zip")) {
        throw new Error("Generazione PDF non riuscita. Riprova o riduci la selezione.");
      }
      if (!contentType.includes("application/pdf")) {
        throw new Error("Risposta non valida: atteso PDF etichette.");
      }
      const skippedHeader = res.headers.get("X-Label-Skipped-Count");
      const skipped = skippedHeader ? Number(skippedHeader) : 0;
      if (skipped > 0) {
        gestToast.warning(`${skipped} ricamb${skipped === 1 ? "o" : "i"} non trovat${skipped === 1 ? "o" : "i"} e esclus${skipped === 1 ? "o" : "i"} dal PDF.`);
      }
      setPhase("opening");
      setProgress(100);
      const opened = openBulkLabelPdfUrl(buildInventoryBulkPdfUrl(items, preset, clienteLabel), deferred);
      if (!opened) {
        gestToast.error("Impossibile aprire il PDF etichette.");
        return;
      }
      gestToast.successOnce("bulk-labels-sync", "PDF etichette pronto.");
    } catch (e) {
      deferred.close();
      const msg =
        e instanceof DOMException && e.name === "AbortError"
          ? "Generazione etichette troppo lenta. Riduci la selezione o riprova."
          : e instanceof Error
            ? e.message
            : "Stampa etichette non riuscita.";
      gestToast.error(msg);
    } finally {
      setPhase("idle");
      setProgress(0);
    }
  }, [gestToast, hasSelection, clienteLabel, preset, selection.quantities, totalLabels]);

  const phaseLabel =
    phase === "preparing"
      ? "Preparazione…"
      : phase === "generating"
        ? progress > 0
          ? `${progress}%`
          : "Generazione…"
        : phase === "opening"
          ? "Apertura…"
          : "Generazione…";

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
