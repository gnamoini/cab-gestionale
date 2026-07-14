import { CONTROL_TOWER_LATE_INGRESS_DAYS } from "@/lib/dashboard/control-tower-constants";
import type { KpiExplainNode, RiskModifierExplainNode } from "@/lib/health-score/types";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function prevPhrase(current: number, previous: number | null, unit = ""): string {
  if (previous == null) return "";
  const cur = round1(current);
  const prev = round1(previous);
  if (cur === prev) return " (stabile rispetto al periodo precedente)";
  return ` (${cur}${unit} ora, ${prev}${unit} nel periodo precedente)`;
}

/** Etichetta leggibile in officina — niente SLA, backlog, campione, pro-capite. */
export function humanizeKpiFactorLabel(kpi: KpiExplainNode): string {
  const cur = round1(kpi.current);
  const prev = kpi.previous != null ? round1(kpi.previous) : null;

  switch (kpi.id) {
    case "completate":
      if (prev != null && cur > prev) {
        return `Più lavori chiusi negli ultimi 30 giorni: ${cur} contro ${prev} nel periodo precedente`;
      }
      if (prev != null && cur < prev) {
        return `Meno lavori chiusi del periodo precedente (${cur} contro ${prev})`;
      }
      return `${cur} lavori chiusi negli ultimi 30 giorni`;

    case "backlog":
      return `${cur} lavori ancora aperti in officina${prevPhrase(cur, prev)}`;

    case "backlog-age":
      return `Anzianità media lavori aperti: ${cur} giorni dall'ingresso${prevPhrase(cur, prev, " gg")}`;

    case "close-time":
      return `Tempo medio per chiudere un lavoro: ${cur} giorni${prevPhrase(cur, prev, " gg")}`;

    case "urgent-turnaround":
      if (cur <= 0) return "Nessun lavoro urgente da valutare nel periodo";
      return `Tempo medio sui lavori urgenti: ${cur} giorni${prevPhrase(cur, prev, " gg")}`;

    case "sla-late-pct":
      if (cur <= 0) return `Nessun lavoro aperto oltre ${CONTROL_TOWER_LATE_INGRESS_DAYS} giorni dall'ingresso`;
      return `${cur}% dei lavori aperti supera ${CONTROL_TOWER_LATE_INGRESS_DAYS} giorni dall'ingresso`;

    case "stock-critical":
      if (cur <= 0) return "Nessun ricambio sotto scorta minima";
      return `${cur} ricambi sotto la scorta minima`;

    case "mag-movements":
      return `${cur} movimenti di magazzino nel periodo${prevPhrase(cur, prev)}`;

    case "mag-entrate":
      return `${cur} pezzi entrati in magazzino${prevPhrase(cur, prev)}`;

    case "mag-consumi":
      return `${cur} pezzi usati sui lavori${prevPhrase(cur, prev)}`;

    case "hours-worked":
      return `${cur} ore lavorate dal team${prevPhrase(cur, prev, " h")}`;

    case "overtime-pct":
      if (cur <= 0) return "Nessuno straordinario registrato";
      return `Straordinari: ${cur}% delle ore lavorate`;

    case "absence-procapite":
      if (cur <= 0) return "Nessuna assenza registrata nel periodo";
      return `Assenze del team: circa ${cur}% delle ore (ferie, malattia, permessi)`;

    case "preventivi-emessi":
      return `${cur} preventivi preparati${prevPhrase(cur, prev)}`;

    case "fatturato":
      return `Fatturato emesso: ${formatEuro(cur)}${prev != null ? ` (prima ${formatEuro(prev)})` : ""}`;

    case "incassato":
      return `Incassi: ${formatEuro(cur)}${prev != null ? ` (prima ${formatEuro(prev)})` : ""}`;

    default:
      return kpi.label;
  }
}

export function humanizeRiskFactorLabel(risk: RiskModifierExplainNode): string {
  switch (risk.id) {
    case "late-ingress": {
      const match = risk.motivation.match(/^(\d+) lavorazioni in ritardo su (\d+) aperte$/);
      if (match) {
        const [, late, open] = match;
        return `${late} su ${open} lavori aperti da oltre ${CONTROL_TOWER_LATE_INGRESS_DAYS} giorni dall'ingresso`;
      }
      return `Alcuni lavori aperti da oltre ${CONTROL_TOWER_LATE_INGRESS_DAYS} giorni dall'ingresso`;
    }

    case "stagnation": {
      const match = risk.motivation.match(/^(\d+) lavorazioni ferme oltre la media degli stati di attesa$/);
      if (match) {
        return `${match[1]} lavori in attesa (ricambi, preventivo, coda) oltre la media del proprio stato`;
      }
      return "Lavori in attesa che non avanzano oltre la media del proprio stato";
    }

    default:
      return risk.label;
  }
}

export function humanizeRedactedSummary(summary: string): string {
  return summary.replace(
    "dettaglio non disponibile",
    "dettaglio non disponibile con i tuoi permessi",
  );
}

function formatEuro(amount: number): string {
  if (amount >= 1000) {
    return `${Math.round(amount / 100) / 10}k €`.replace(".", ",");
  }
  return `${Math.round(amount)} €`;
}
