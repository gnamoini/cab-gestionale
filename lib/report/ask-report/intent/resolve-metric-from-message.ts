import type { EffectiveAskContext } from "@/lib/report/ask-report/types";
import { normalizeAskMessage } from "@/lib/report/ask-report/intent/normalize-ask-message";

/** Ordine importante: pattern più specifici prima di quelli generici. */
const METRIC_KEYWORDS: Array<{ pattern: RegExp; metricId: string }> = [
  { pattern: /\bchius[oaie]?\b|\bchiusur/i, metricId: "lav-chiusi" },
  { pattern: /\bnuove?\s+lavorazioni|\bingress/i, metricId: "lav-periodo" },
  { pattern: /\blavorazioni?\s+apert|\bbacklog\b|\bda\s+completare/i, metricId: "lav-aperti" },
  { pattern: /\btempo\s+(medio\s+)?(di\s+)?chiusur|\bgiorni\s+(di\s+)?chiusur|\bpermanen/i, metricId: "lav-tempo" },
  { pattern: /\bolltre\s+il\s+termine|\bsla\b|\btermine\s+previsto/i, metricId: "lav_late_sla" },
  { pattern: /\bannullat/i, metricId: "lav_cancelled" },
  { pattern: /\bpreventiv[oi]\s+approv|\bapprovat/i, metricId: "eco_preventivi_approvati" },
  { pattern: /\bwin\s*rate|\baccettazion/i, metricId: "win_rate_preventivi" },
  { pattern: /\bvalore\s+(dei\s+)?preventiv/i, metricId: "eco_preventivi_valore" },
  { pattern: /\bpreventiv/i, metricId: "eco_preventivi" },
  { pattern: /\bfatturat/i, metricId: "eco_fatturato" },
  { pattern: /\bincass/i, metricId: "eco_incassato" },
  { pattern: /\bda\s+incass|\bcrediti\s+apert|\bfatture\s+apert/i, metricId: "eco_da_incassare" },
  { pattern: /\bscadut|\bscadenz/i, metricId: "eco_importo_scaduto" },
  { pattern: /\bmargine/i, metricId: "eco_margine_operativo_stimato" },
  { pattern: /\bclienti\s+attiv|\bclienti\b/i, metricId: "clienti" },
  { pattern: /\bscorta|\bsotto\s+scorta|\bdisponibilita\s+magazzino/i, metricId: "scorta" },
  { pattern: /\bconsum|\bricambi\s+usat/i, metricId: "ric-usati" },
  { pattern: /\bcapitale\s+immobil|\bvalore\s+magazzino/i, metricId: "cap" },
  { pattern: /\bordini\s+(ai\s+)?fornitor/i, metricId: "mag_orders" },
  { pattern: /\bmoviment/i, metricId: "mag_movement_value" },
  { pattern: /\bstraordinar/i, metricId: "ore_straordinari" },
  { pattern: /\bsaturaz|\bcapacita\s+officina/i, metricId: "saturazione_team" },
  { pattern: /\bore\s+consunt|\bore\s+lavorat/i, metricId: "actual_labor_hours_total" },
  { pattern: /\bore\s+(di\s+)?presenz|\bore\s+total/i, metricId: "presence_hours_total" },
  { pattern: /\bmezzi\s+in\s+officina|\bflotta\b|\bofficina\s+mezzi/i, metricId: "flotta-officina" },
  { pattern: /\befficienz|\bchiusure\s+per\s+ora/i, metricId: "cross_efficiency" },
  { pattern: /\bvalore\s+per\s+ora/i, metricId: "cross_value_hour" },
  { pattern: /\bcosto\s+(medio\s+)?(per\s+)?lavoraz/i, metricId: "cross_cost_job" },
  { pattern: /\bricambi\s+per\s+intervent/i, metricId: "cross_parts_job" },
];

const MAX_METRICS_PER_QUERY = 3;

function matchMetricsInText(text: string): string[] {
  const found: string[] = [];
  for (const { pattern, metricId } of METRIC_KEYWORDS) {
    if (pattern.test(text) && !found.includes(metricId)) found.push(metricId);
  }
  return found;
}

/** Tutte le metriche citate nella domanda (max 3). */
export function resolveAllMetricsFromMessage(message: string, ctx: EffectiveAskContext): string[] {
  const text = normalizeAskMessage(message);
  const found = matchMetricsInText(text);
  if (found.length) return found.slice(0, MAX_METRICS_PER_QUERY);

  if (/\blavorazion/i.test(text)) return [];

  if (ctx.metricId) return [ctx.metricId];
  return [];
}

export function resolveMetricFromMessage(message: string, ctx: EffectiveAskContext): string | undefined {
  const all = resolveAllMetricsFromMessage(message, ctx);
  return all[0];
}

export function isAmbiguousLavorazioniQuery(message: string): boolean {
  const text = normalizeAskMessage(message);
  if (!/\blavorazion/i.test(text)) return false;
  if (/\bchius|\bapert|\bingress|\bnuov|\bbacklog|\bcompletar/i.test(text)) return false;
  return true;
}

export function buildLavorazioniClarification(): string {
  return "Vuoi le lavorazioni chiuse nel periodo, quelle ancora aperte, o i nuovi ingressi?";
}
