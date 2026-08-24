import { statoDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import { migrateStatoConfigId } from "@/lib/lavorazioni/stati-dynamic";
import { statoWorkflowOrderIndex } from "@/lib/lavorazioni/stato-order";

export type ClientPortalStatoProgressStep = {
  id: string;
  label: string;
  color: string;
  status: "done" | "current" | "upcoming";
  /** ISO primo passaggio in timeline log. */
  changedAt?: string;
};

export function buildClientPortalStatoProgress(
  statiOpts: readonly { id: string; label: string; color?: string }[],
  currentStatoId: string,
): {
  steps: ClientPortalStatoProgressStep[];
  currentIndex: number;
  progressPct: number;
} {
  if (!statiOpts.length) {
    return { steps: [], currentIndex: 0, progressPct: 0 };
  }

  const orderIds = statiOpts.map((s) => s.id);
  const resolved = migrateStatoConfigId((currentStatoId ?? "").trim());
  let currentIndex = orderIds.indexOf(resolved);
  if (currentIndex < 0) {
    const orderIdx = statoWorkflowOrderIndex(resolved, orderIds);
    currentIndex = orderIdx >= orderIds.length ? orderIds.length - 1 : Math.max(0, orderIdx);
  }

  const steps: ClientPortalStatoProgressStep[] = statiOpts.map((s, i) => ({
    id: s.id,
    label: s.label,
    color: statoDisplayColor(s.id, statiOpts),
    status: i < currentIndex ? "done" : i === currentIndex ? "current" : "upcoming",
  }));

  const progressPct =
    steps.length <= 1 ? 100 : Math.round((currentIndex / (steps.length - 1)) * 100);

  return { steps, currentIndex, progressPct };
}

export function clientPortalStatoStepPositionPct(index: number, stepCount: number): number {
  if (stepCount <= 1) return 100;
  return (index / (stepCount - 1)) * 100;
}

/** Quota del tratto corrente→successivo coperta dalla barra colorata. */
export const CLIENT_PORTAL_STATO_PROGRESS_LEAD_RATIO = 0.6;

/** Riempimento fino al pallino corrente + avanzamento verso il successivo. */
export function clientPortalStatoProgressFillPcts(
  currentIndex: number,
  stepCount: number,
): { solidPct: number; leadPct: number } {
  if (stepCount <= 1) return { solidPct: 100, leadPct: 100 };
  const solidPct = clientPortalStatoStepPositionPct(currentIndex, stepCount);
  if (currentIndex >= stepCount - 1) return { solidPct: 100, leadPct: 100 };
  const nextPct = clientPortalStatoStepPositionPct(currentIndex + 1, stepCount);
  const leadPct = solidPct + (nextPct - solidPct) * CLIENT_PORTAL_STATO_PROGRESS_LEAD_RATIO;
  return { solidPct, leadPct };
}

/** Aggiunge data/ora cambio stato da eventi timeline portale. */
export function enrichClientPortalStatoProgressWithTimeline(
  progress: ReturnType<typeof buildClientPortalStatoProgress>,
  events: readonly { statoId: string; at: string }[],
): ReturnType<typeof buildClientPortalStatoProgress> {
  const atByStato = new Map<string, string>();
  for (const ev of events) {
    if (!atByStato.has(ev.statoId)) atByStato.set(ev.statoId, ev.at);
  }
  return {
    ...progress,
    steps: progress.steps.map((s) => ({
      ...s,
      changedAt: atByStato.get(s.id),
    })),
  };
}
