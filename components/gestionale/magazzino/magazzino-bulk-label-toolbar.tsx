"use client";

import { useCallback, useState } from "react";
import { erpBtnAccent } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { BULK_SYNC_MAX, DEFAULT_LABEL_PRESET, LABEL_PRESET_IDS } from "@/lib/inventory-labels";
import { openPdfBlobInNewTab } from "@/lib/pdf/open-pdf-blob-preview";
import { openUrlInNewTab } from "@/lib/pdf/open-url-new-tab";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

type BulkLabelPhase = "idle" | "preparing" | "generating" | "opening";

async function openLabelArtifact(blob: Blob, filename: string): Promise<void> {
  const isPdf = blob.type === "application/pdf" || filename.endsWith(".pdf");
  if (isPdf) {
    await openPdfBlobInNewTab(blob, filename, { showLoadingFeedback: false });
    return;
  }
  const blobUrl = URL.createObjectURL(blob);
  openUrlInNewTab(blobUrl, {
    revokeBlobUrlAfterMs: 120_000,
    blockedMessage: "Impossibile aprire il file in una nuova scheda. Consenti i pop-up per questo sito.",
  });
}

const BULK_FETCH_TIMEOUT_MS = 240_000;

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
            await openLabelArtifact(blob, `etichette-${ids.length}.pdf`);
            gestToast.successOnce("bulk-labels", "PDF etichette pronto.");
            onClearSelection();
            return;
          }
          if (jobRes.headers.get("Content-Type")?.includes("application/zip")) {
            setPhase("opening");
            setProgress(100);
            const blob = await jobRes.blob();
            await openLabelArtifact(blob, `etichette-${ids.length}.zip`);
            gestToast.info("PDF non disponibile — archivio PNG aperto in nuova scheda.");
            onClearSelection();
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
            await openLabelArtifact(blob, `etichette-${ids.length}.${isZip ? "zip" : "pdf"}`);
            onClearSelection();
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
      setPhase("opening");
      setProgress(100);
      const blob = await res.blob();
      const isZip = res.headers.get("Content-Type")?.includes("zip");
      await openLabelArtifact(blob, `etichette-${ids.length}.${isZip ? "zip" : "pdf"}`);
      gestToast.successOnce("bulk-labels-sync", "PDF etichette pronto.");
      onClearSelection();
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
  }, [count, gestToast, onClearSelection, preset, selectedIds]);

  if (!count) return null;

  const phaseLabel =
    phase === "preparing"
      ? "Preparazione…"
      : phase === "generating"
        ? progress > 0
          ? `Generazione ${progress}%`
          : "Generazione…"
        : phase === "opening"
          ? "Apertura…"
          : null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[color:color-mix(in_srgb,var(--cab-primary)_25%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_6%,var(--cab-surface))] px-3 py-2">
      <span className="text-sm font-medium tabular-nums text-[color:var(--cab-text)]">
        {count} selezionat{count === 1 ? "o" : "i"}
      </span>
      <select
        className="min-h-9 rounded-md border border-[color:var(--cab-border)] bg-white px-2 text-sm dark:bg-zinc-900"
        value={preset}
        onChange={(e) => setPreset(e.target.value)}
        aria-label="Preset etichetta"
        disabled={busy}
      >
        {LABEL_PRESET_IDS.map((id) => (
          <option key={id} value={id}>
            {id.replace("-default", " mm")}
          </option>
        ))}
      </select>
      <button type="button" className={erpBtnAccent} disabled={busy} onClick={() => void handlePrint()}>
        Stampa etichette
      </button>
      {phaseLabel ? (
        <span className="text-xs tabular-nums text-[color:var(--cab-text-muted)]" aria-live="polite">
          {phaseLabel}
        </span>
      ) : null}
      {count > BULK_SYNC_MAX ? (
        <span className="text-xs text-[color:var(--cab-text-muted)]">Job async (&gt;{BULK_SYNC_MAX})</span>
      ) : null}
      <button type="button" className="text-xs underline" onClick={onClearSelection} disabled={busy}>
        Deseleziona
      </button>
    </div>
  );
}
