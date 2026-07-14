"use client";

import { useCallback, useState } from "react";
import { erpBtnAccent } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { BULK_SYNC_MAX, DEFAULT_LABEL_PRESET, LABEL_PRESET_IDS } from "@/lib/inventory-labels";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

function openPdfInNewTab(blob: Blob): boolean {
  const blobUrl = URL.createObjectURL(blob);
  const opened = window.open(blobUrl, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 120_000);
  return Boolean(opened);
}

export function MagazzinoBulkLabelToolbar({
  selectedIds,
  onClearSelection,
}: {
  selectedIds: ReadonlySet<string>;
  onClearSelection: () => void;
}) {
  const gestToast = useGestionaleToast();
  const [preset, setPreset] = useState(DEFAULT_LABEL_PRESET);
  const [busy, setBusy] = useState(false);
  const count = selectedIds.size;

  const handlePrint = useCallback(async () => {
    if (!count) return;
    setBusy(true);
    try {
      const ids = [...selectedIds];
      const res = await fetch("/api/inventory-labels/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, preset, format: "pdf" }),
      });

      if (res.status === 202) {
        const { jobId } = (await res.json()) as { jobId: string };
        gestToast.info(`Generazione ${ids.length} etichette in corso…`);
        const poll = async (attempt = 0): Promise<void> => {
          if (attempt > 120) throw new Error("Timeout job etichette");
          const jobRes = await fetch(`/api/inventory-labels/bulk/jobs/${jobId}`);
          if (jobRes.headers.get("Content-Type")?.includes("application/pdf")) {
            const blob = await jobRes.blob();
            if (!openPdfInNewTab(blob)) throw new Error("Consenti i popup per aprire il PDF.");
            gestToast.successOnce("bulk-labels", "PDF etichette aperto in una nuova scheda.");
            onClearSelection();
            return;
          }
          const status = (await jobRes.json()) as { status: string; error?: string };
          if (status.status === "failed") throw new Error(status.error ?? "Job fallito");
          if (status.status === "completed") {
            const pdfRes = await fetch(`/api/inventory-labels/bulk/jobs/${jobId}`);
            const blob = await pdfRes.blob();
            if (!openPdfInNewTab(blob)) throw new Error("Consenti i popup per aprire il PDF.");
            onClearSelection();
            return;
          }
          await new Promise((r) => window.setTimeout(r, 1500));
          return poll(attempt + 1);
        };
        await poll();
        return;
      }

      if (!res.ok) throw new Error("Stampa bulk non riuscita");
      const blob = await res.blob();
      if (!openPdfInNewTab(blob)) throw new Error("Consenti i popup per aprire il PDF.");
      gestToast.successOnce("bulk-labels-sync", "PDF etichette aperto in una nuova scheda.");
      onClearSelection();
    } catch (e) {
      gestToast.error(e instanceof Error ? e.message : "Stampa etichette non riuscita.");
    } finally {
      setBusy(false);
    }
  }, [count, gestToast, onClearSelection, preset, selectedIds]);

  if (!count) return null;

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
      {count > BULK_SYNC_MAX ? (
        <span className="text-xs text-[color:var(--cab-text-muted)]">Job async (&gt;{BULK_SYNC_MAX})</span>
      ) : null}
      <button type="button" className="text-xs underline" onClick={onClearSelection}>
        Deseleziona
      </button>
    </div>
  );
}
