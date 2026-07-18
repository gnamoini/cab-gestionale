import { CONTROL_TOWER_LATE_INGRESS_DAYS } from "@/lib/dashboard/control-tower-constants";
import type { KpiExplainNode, RiskModifierExplainNode } from "@/lib/health-score/types";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function formatKpiValue(id: string, value: number): string {
  const n = round1(value);
  switch (id) {
    case "hours-worked":
      return `${n} h`;
    case "backlog-age":
    case "close-time":
    case "urgent-turnaround":
      return `${n} gg`;
    case "absence-procapite":
    case "overtime-pct":
    case "sla-late-pct":
      return `${n}%`;
    case "fatturato":
    case "incassato":
      return formatEuro(n);
    case "completate":
    case "backlog":
    case "mag-movements":
    case "mag-entrate":
    case "mag-consumi":
    case "stock-critical":
    case "preventivi-emessi":
      return String(n);
    default:
      return String(n);
  }
}

/** Etichetta leggibile in officina — niente SLA, backlog, campione, pro-capite. */
export function humanizeKpiFactorLabel(kpi: KpiExplainNode): string {
  const cur = round1(kpi.current);
  const prev = kpi.previous != null ? round1(kpi.previous) : null;

  switch (kpi.id) {
    case "completate":
      if (prev != null && cur > prev) return "Più lavori chiusi";
      if (prev != null && cur < prev) return "Meno lavori chiusi";
      return "Lavori chiusi nel periodo";

    case "backlog":
      return "Lavori aperti in officina";

    case "backlog-age":
      return "Anzianità media lavori aperti";

    case "close-time":
      return "Tempo medio di chiusura";

    case "urgent-turnaround":
      if (cur <= 0) return "Nessun lavoro urgente nel periodo";
      return "Tempo sui lavori urgenti";

    case "sla-late-pct":
      if (cur <= 0) return `Nessun ritardo oltre ${CONTROL_TOWER_LATE_INGRESS_DAYS} giorni`;
      return `Quota lavori oltre ${CONTROL_TOWER_LATE_INGRESS_DAYS} giorni`;

    case "stock-critical":
      if (cur <= 0) return "Nessun ricambio sotto scorta";
      return "Ricambi sotto scorta minima";

    case "mag-movements":
      return "Movimenti di magazzino";

    case "mag-entrate":
      return "Entrate in magazzino";

    case "mag-consumi":
      return "Pezzi usati sui lavori";

    case "hours-worked":
      if (prev != null && cur > prev) return "Più ore lavorate";
      if (prev != null && cur < prev) return "Meno ore lavorate";
      return "Ore lavorate dal team";

    case "overtime-pct":
      if (cur <= 0) return "Nessuno straordinario";
      return "Straordinari registrati";

    case "absence-procapite":
      if (cur <= 0) return "Nessuna assenza nel periodo";
      return "Assenze del team";

    case "preventivi-emessi":
      return "Preventivi preparati";

    case "fatturato":
      return "Fatturato emesso";

    case "incassato":
      return "Incassi registrati";

    default:
      return kpi.label;
  }
}

export function humanizeKpiFactorMeta(kpi: KpiExplainNode): string {
  const cur = round1(kpi.current);
  const prev = kpi.previous != null ? round1(kpi.previous) : null;
  const now = formatKpiValue(kpi.id, cur);
  const parts: string[] = [];

  if (prev != null) {
    if (cur === prev) {
      parts.push(`${now}, uguale al periodo precedente`);
    } else {
      parts.push(`${now} (prima ${formatKpiValue(kpi.id, prev)})`);
      if (kpi.trendPct != null && Number.isFinite(kpi.trendPct)) {
        const sign = kpi.trendPct > 0 ? "+" : "";
        parts.push(`${sign}${round1(kpi.trendPct)}%`);
      }
    }
  } else {
    parts.push(now);
  }

  parts.push(`valutazione ${round1(kpi.kpiScore)}/100`);

  const weightPct = Math.round(kpi.effectiveWeight * 100);
  if (weightPct > 0) {
    parts.push(`peso ${weightPct}% sul totale`);
  }

  if (kpi.confidence !== "high") {
    parts.push(`affidabilità ${kpi.confidence === "medium" ? "media" : "bassa"}`);
  }

  return parts.join(" · ");
}

export function humanizeRiskFactorLabel(risk: RiskModifierExplainNode): string {
  switch (risk.id) {
    case "late-ingress":
      return `Ritardo oltre ${CONTROL_TOWER_LATE_INGRESS_DAYS} giorni dall'ingresso`;

    case "stagnation":
      return "Lavori in attesa oltre la media";

    default:
      return risk.label;
  }
}

export function humanizeRiskFactorMeta(risk: RiskModifierExplainNode): string {
  const penalty = Math.round(risk.penalty);
  const lateMatch = risk.motivation.match(/^(\d+) lavorazioni in ritardo su (\d+) aperte$/);
  if (lateMatch) {
    return `${lateMatch[1]} su ${lateMatch[2]} lavori aperti in ritardo · penalità −${penalty} pt sul totale`;
  }

  const stagnationMatch = risk.motivation.match(/^(\d+) lavorazioni ferme oltre la media degli stati di attesa$/);
  if (stagnationMatch) {
    const count = Number(stagnationMatch[1]);
    const label = count === 1 ? "1 lavorazione ferma" : `${count} lavorazioni ferme`;
    return `${label} oltre la media di attesa · penalità −${penalty} pt sul totale`;
  }

  if (penalty > 0) {
    return `${risk.motivation} · penalità −${penalty} pt sul totale`;
  }

  return risk.motivation;
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
