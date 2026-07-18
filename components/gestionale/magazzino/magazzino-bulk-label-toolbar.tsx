"use client";

import { useCallback, useState } from "react";
import { LoadingButton } from "@/components/design-system";
import { PageActionIconLabels } from "@/components/ui/page-action-menu/page-action-menu-icons";
import { dsBtnGhost } from "@/lib/ui/design-system";
import {
  BULK_SYNC_MAX,
  DEFAULT_LABEL_PRESET,
  LABEL_PRESET_IDS,
  labelPresetOptionLabel,
} from "@/lib/inventory-labels";
import { openUrlInNewTab } from "@/lib/pdf/open-url-new-tab";
import { gestionaleSelectNativePlainClass } from "@/lib/ui/design-system";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

type BulkLabelPhase = "idle" | "preparing" | "generating" | "opening";

function openLabelArtifact(blob: Blob): void {
  const blobUrl = URL.createObjectURL(blob);
  openUrlInNewTab(blobUrl, {
    revokeBlobUrlAfterMs: 120_000,
    blockedMessage: "Impossibile aprire il file in una nuova scheda. Consenti i pop-up per questo sito.",
  });
}

const BULK_FETCH_TIMEOUT_MS = 280_000;

export function MagazzinoBulkLabelToolbar({
  selectedIds,
  onClearSelection,
}: {
  selectedIds: ReadonlySet<string>;
  onClearSelection: () => void;
}) {
  const gestToast = useGestionaleToast();
  const [preset, setPreset] = useState(DEFAULT_LABEL_PRESET);
  const [phase, setPhase] = useState<BulkLabelPhase>("idle");
  const [progress, setProgress] = useState(0);
  const count = selectedIds.size;
  const busy = phase !== "idle";
  const canGenerate = count > 0 && !busy;

  const handlePrint = useCallback(async () => {
    if (!count) return;
    setPhase("preparing");
    setProgress(0);
    try {
      const ids = [...selectedIds];
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), BULK_FETCH_TIMEOUT_MS);
      setPhase("generating");
      const res = await fetch("/api/inventory-labels/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, preset, format: "pdf" }),
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);

      if (res.status === 202) {
        const { jobId } = (await res.json()) as { jobId: string };
        gestToast.info(`Generazione ${ids.length} etichette in corso…`);
        const poll = async (attempt = 0): Promise<void> => {
          if (attempt > 120) throw new Error("Timeout job etichette");
          const jobRes = await fetch(`/api/inventory-labels/bulk/jobs/${jobId}`);
          if (jobRes.headers.get("Content-Type")?.includes("application/pdf")) {
            setPhase("opening");
            setProgress(100);
            const blob = await jobRes.blob();
            openLabelArtifact(blob);
            gestToast.successOnce("bulk-labels", "PDF etichette pronto.");
            return;
          }
          if (jobRes.headers.get("Content-Type")?.includes("application/zip")) {
            setPhase("opening");
            setProgress(100);
            const blob = await jobRes.blob();
            openLabelArtifact(blob);
            gestToast.info("PDF non disponibile — archivio PNG aperto in nuova scheda.");
            return;
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
            const pdfRes = await fetch(`/api/inventory-labels/bulk/jobs/${jobId}`);
            const blob = await pdfRes.blob();
            const isZip = pdfRes.headers.get("Content-Type")?.includes("zip");
            openLabelArtifact(blob);
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
      const skippedHeader = res.headers.get("X-Label-Skipped-Count");
      const skipped = skippedHeader ? Number(skippedHeader) : 0;
      if (skipped > 0) {
        gestToast.warning(`${skipped} ricamb${skipped === 1 ? "o" : "i"} non trovat${skipped === 1 ? "o" : "i"} e esclus${skipped === 1 ? "o" : "i"} dal PDF.`);
      }
      setPhase("opening");
      setProgress(100);
      const blob = await res.blob();
      const isZip = res.headers.get("Content-Type")?.includes("zip");
      openLabelArtifact(blob);
      gestToast.successOnce("bulk-labels-sync", "PDF etichette pronto.");
    } catch (e) {
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
  }, [count, gestToast, preset, selectedIds]);

  const phaseLabel =
    phase === "preparing"
      ? "Preparazione…"
      : phase === "generating"
        ? progress > 0
          ? `Generazione ${progress}%`
          : "Generazione…"
        : phase === "opening"
          ? "Apertura PDF…"
          : "Generazione…";

  return (
    <div
      role="region"
      aria-label="Generazione etichette"
      className="sticky bottom-0 z-20 mt-3 rounded-xl border border-[color:color-mix(in_srgb,var(--cab-primary)_24%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))] px-4 py-3 shadow-[var(--cab-shadow-md)] backdrop-blur-sm"
    >
        <div className="mx-auto flex w-full max-w-[var(--cab-content-max,100%)] flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[color:color-mix(in_srgb,var(--cab-primary)_32%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-surface))] text-[color:var(--cab-primary)]">
                <PageActionIconLabels className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight text-[color:var(--cab-text)]">Etichette ricambi</p>
                <p className="text-xs leading-snug text-[color:var(--cab-text-muted)]">
                  {count === 0
                    ? "Attiva le caselle in lista e scegli il formato"
                    : `${count} ricamb${count === 1 ? "o" : "i"} pront${count === 1 ? "o" : "i"} per la stampa`}
                </p>
              </div>
            </div>
            {count > 0 ? (
              <span className="inline-flex min-h-7 shrink-0 items-center rounded-full border border-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_16%,var(--cab-surface))] px-2.5 text-xs font-semibold tabular-nums text-[color:var(--cab-text)]">
                {count}
              </span>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-xs font-medium text-[color:var(--cab-text-muted)]">Formato etichetta</span>
              <select
                id="magazzino-bulk-label-preset"
                className={`${gestionaleSelectNativePlainClass} max-w-full`}
                value={preset}
                onChange={(e) => setPreset(e.target.value)}
                aria-label="Formato etichetta"
                disabled={busy}
              >
                {LABEL_PRESET_IDS.map((id) => (
                  <option key={id} value={id}>
                    {labelPresetOptionLabel(id)}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
              <LoadingButton
                variant="primary"
                className="min-h-11 min-w-[10.5rem] flex-1 whitespace-nowrap sm:flex-none"
                loading={busy}
                loadingLabel={phaseLabel}
                disabled={!canGenerate}
                onClick={() => void handlePrint()}
              >
                Genera etichette
              </LoadingButton>
              {count > 0 ? (
                <button type="button" className={`${dsBtnGhost} min-h-11`} onClick={onClearSelection} disabled={busy}>
                  Deseleziona
                </button>
              ) : null}
            </div>
          </div>

          {count > BULK_SYNC_MAX ? (
            <p className="text-xs leading-snug text-[color:var(--cab-text-muted)]">
              Selezione ampia: generazione in background (oltre {BULK_SYNC_MAX} etichette).
            </p>
          ) : null}
        </div>
    </div>
  );
}
