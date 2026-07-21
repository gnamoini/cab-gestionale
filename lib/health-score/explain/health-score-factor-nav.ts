import {
  Q_FOCUS_LAV_ROW,
  Q_FOCUS_RICAMBIO,
} from "@/lib/navigation/dashboard-log-links";
import type { HealthScoreFactorSources } from "@/lib/health-score/types";

export function buildLavorazioneFocusHref(lavorazioneId: string): string {
  const sp = new URLSearchParams();
  sp.set(Q_FOCUS_LAV_ROW, lavorazioneId.trim());
  return `/lavorazioni?${sp.toString()}`;
}

export function buildMagazzinoRicambioFocusHref(ricambioId: string): string {
  const sp = new URLSearchParams();
  sp.set(Q_FOCUS_RICAMBIO, ricambioId.trim());
  return `/magazzino?${sp.toString()}`;
}

export function resolveHealthScoreFactorHref(
  sources: HealthScoreFactorSources,
  ref: { kind: "kpi" | "risk"; id: string },
): string | undefined {
  switch (ref.id) {
    case "late-ingress":
    case "sla-late-pct": {
      const id = sources.lateIngressLavorazioneIds[0];
      return id ? buildLavorazioneFocusHref(id) : "/lavorazioni";
    }
    case "stagnation": {
      const id = sources.inactiveLavorazioneIds[0];
      return id ? buildLavorazioneFocusHref(id) : "/lavorazioni";
    }
    case "stock-critical": {
      const id = sources.stockCriticalRicambioIds[0];
      return id ? buildMagazzinoRicambioFocusHref(id) : "/magazzino";
    }
    case "backlog":
    case "backlog-age":
    case "completate":
    case "close-time":
    case "urgent-turnaround":
      return "/lavorazioni";
    case "mag-movements":
    case "mag-entrate":
    case "mag-consumi":
      return "/magazzino";
    case "hours-worked":
    case "overtime-pct":
    case "absence-procapite":
      return "/dipendenti";
    case "preventivi-emessi":
      return "/preventivi";
    case "fatturato":
    case "incassato":
      return "/report";
    default:
      return ref.kind === "risk" ? "/lavorazioni" : undefined;
  }
}
