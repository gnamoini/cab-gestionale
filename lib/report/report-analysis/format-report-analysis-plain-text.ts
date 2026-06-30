import type { ReportAnalysisOutput } from "@/lib/report/report-analysis/report-analysis-schema";

function section(title: string, lines: string[]): string {
  if (lines.length === 0) return "";
  return `## ${title}\n${lines.join("\n")}\n`;
}

function bulletList(items: string[]): string[] {
  return items.map((item) => `- ${item}`);
}

/** Testo plain strutturato per copia negli appunti. */
export function formatReportAnalysisPlainText(data: ReportAnalysisOutput): string {
  const parts: string[] = [
    "# Analisi AI — Report",
    `Generata: ${data.generatedAt}`,
    "",
    "## Executive Summary",
    data.executiveSummary,
    "",
  ];

  const kpiLines = data.kpiPrincipali.map(
    (k) => `**${k.label}**: ${k.valore} — ${k.osservazione}`,
  );
  parts.push(section("KPI Principali", kpiLines));

  const anomalie = data.anomalieRilevate.map(
    (a) => `[${a.gravita}|confidenza:${a.confidenza}] ${a.titolo}: ${a.dettaglio}`,
  );
  parts.push(section("Anomalie Rilevate", bulletList(anomalie)));

  const trend = data.trendPositivi.map((t) => `${t.titolo}: ${t.dettaglio}`);
  parts.push(section("Trend Positivi", bulletList(trend)));

  const crit = data.criticita.map(
    (c) => `[${c.gravita}|confidenza:${c.confidenza}] ${c.titolo}: ${c.dettaglio}`,
  );
  parts.push(section("Criticità", bulletList(crit)));

  const sugg = data.suggerimentiOperativi.map(
    (s) => `[${s.priorita}] ${s.azione} — ${s.motivazione} | Impatto atteso: ${s.impattoAtteso}`,
  );
  parts.push(section("Suggerimenti Operativi", bulletList(sugg)));

  const prio = data.prioritaImmediate.map((p) => `${p.azione} (entro: ${p.entro})`);
  parts.push(section("Priorità Immediate", bulletList(prio)));

  parts.push(
    "## Valutazione Generale",
    `Punteggio: ${data.valutazioneGenerale.punteggio}/10`,
    data.valutazioneGenerale.giudizio,
    "",
  );

  if (data.dataQualityNotes && data.dataQualityNotes.length > 0) {
    parts.push(section("Qualità dati", bulletList(data.dataQualityNotes)));
  }

  parts.push(
    "---",
    "Analisi generativa basata sui KPI del periodo — verificare sempre i dati operativi.",
  );

  return parts.filter(Boolean).join("\n");
}
