import type { BulkLabelCompactItem } from "@/lib/inventory-labels/domain/bulk-items";
import { isBulkSyncCount } from "@/lib/inventory-labels/validation";
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
import type { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";

export type BulkLabelGeneratePhase = "idle" | "preparing" | "generating" | "opening";

const BULK_FETCH_TIMEOUT_MS = 280_000;

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

export type BulkLabelGenerateCallbacks = {
  onPhaseChange: (phase: BulkLabelGeneratePhase, progress: number) => void;
};

export async function generateBulkLabelPdf(
  items: readonly BulkLabelCompactItem[],
  totalLabels: number,
  preset: string,
  clienteLabel: boolean,
  gestToast: ReturnType<typeof useGestionaleToast>,
  callbacks?: BulkLabelGenerateCallbacks,
): Promise<void> {
  if (items.length === 0 || totalLabels <= 0) return;

  const setPhase = (phase: BulkLabelGeneratePhase, progress = 0) => {
    callbacks?.onPhaseChange(phase, progress);
  };

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
  try {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), BULK_FETCH_TIMEOUT_MS);
    setPhase("generating");
    const res = await fetch("/api/inventory-labels/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, preset, format: "pdf", clienteLabel }),
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
          setPhase("opening", 100);
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
        if (typeof status.progress === "number") setPhase("generating", status.progress);
        if (status.status === "completed") {
          setPhase("opening");
          const opened = openBulkLabelPdfUrl(jobPdfUrl, deferred);
          if (!opened) gestToast.error("Impossibile aprire il PDF etichette.");
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
      gestToast.warning(
        `${skipped} ricamb${skipped === 1 ? "o" : "i"} non trovat${skipped === 1 ? "o" : "i"} e esclus${skipped === 1 ? "o" : "i"} dal PDF.`,
      );
    }
    setPhase("opening", 100);
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
  }
}

export function bulkLabelPhaseLabel(phase: BulkLabelGeneratePhase, progress: number): string {
  if (phase === "preparing") return "Preparazione…";
  if (phase === "generating") return progress > 0 ? `${progress}%` : "Generazione…";
  if (phase === "opening") return "Apertura…";
  return "Generazione…";
}
