import assert from "node:assert/strict";
import { buildAskToolCacheKey } from "@/lib/report/ask-report/conversation/ask-report-conversation-cache";
import { resolvePeriodHintFromMessage } from "@/lib/report/ask-report/intent/resolve-ask-period-hint";
import { classifyAskReportIntent } from "@/lib/report/ask-report/intent/classify-ask-report-intent";
import { resolveAllMetricsFromMessage } from "@/lib/report/ask-report/intent/resolve-metric-from-message";
import { resolveEffectiveContext } from "@/lib/report/ask-report/context/resolve-effective-context.server";
import { getAskReportTool } from "@/lib/report/ask-report/tools/ask-report-tool-registry";
import { formatAskRecidivitaAnswer } from "@/lib/report/ask-report/answer/format-ask-recidivita-answer";

const period = {
  preset: "questo_mese" as const,
  start: "2026-08-01",
  end: "2026-08-21",
  compareMode: "none" as const,
};

const intent = classifyAskReportIntent("Quanto abbiamo fatturato?", {
  period,
  compareMode: "none",
});
assert.equal(intent.planMode, "deterministic");
assert.equal(intent.toolCalls?.[0]?.toolName, "get_metric");

const closedIntent = classifyAskReportIntent("Quante lavorazioni abbiamo chiuso ad agosto?", {
  period,
  compareMode: "none",
});
assert.equal(closedIntent.planMode, "deterministic");
assert.equal(closedIntent.intent, "metric_query");
assert.equal(closedIntent.toolCalls?.[0]?.toolName, "get_metric");
assert.equal((closedIntent.toolCalls?.[0]?.args as { metricId: string }).metricId, "lav-chiusi");

const drillIntent = classifyAskReportIntent("Mostrami le lavorazioni del backlog", {
  period,
  compareMode: "none",
  metricId: "lav-aperti",
});
assert.equal(drillIntent.toolCalls?.[0]?.toolName, "get_drilldown");

const rejected = getAskReportTool("get_metric")!.normalizeArgs({
  metricId: "eco_fatturato",
  table: "invoices",
});
assert.equal(rejected.ok, false);

const effective = resolveEffectiveContext({
  message: "test",
  period,
  compareMode: "avg_3_months",
});
assert.equal(effective.period.compareMode, "prev_period");

const agostoHint = resolvePeriodHintFromMessage("Quante lavorazioni abbiamo chiuso ad agosto?", 2026);
assert.ok(agostoHint);
assert.equal(agostoHint!.start, "2026-08-01");
assert.equal(agostoHint!.end, "2026-08-31");

const twoMonthsHint = resolvePeriodHintFromMessage(
  "qual é la media settimanale di chiusure a luglio e agosto 2026",
  2026,
);
assert.ok(twoMonthsHint);
assert.equal(twoMonthsHint!.start, "2026-07-01");
assert.equal(twoMonthsHint!.end, "2026-08-31");
assert.equal(twoMonthsHint!.label, "Luglio–Agosto 2026");

const weeklyIntent = classifyAskReportIntent(
  "qual é la media settimanale di chiusure a luglio e agosto 2026",
  { period, compareMode: "none" },
);
assert.equal(weeklyIntent.planMode, "deterministic");
assert.equal(weeklyIntent.toolCalls?.[0]?.toolName, "get_metric");
assert.equal((weeklyIntent.toolCalls?.[0]?.args as { metricId: string }).metricId, "lav-chiusi");

const dailyFollowUp = classifyAskReportIntent("e la media giornaliera", {
  period,
  compareMode: "none",
  metricId: "lav-chiusi",
});
assert.equal(dailyFollowUp.intent, "metric_query");
assert.equal(dailyFollowUp.toolCalls?.[0]?.toolName, "get_metric");

const convPeriod = {
  preset: "custom" as const,
  start: "2026-07-01",
  end: "2026-07-31",
  compareMode: "none" as const,
};
const convEffective = resolveEffectiveContext({
  message: "e la media giornaliera",
  conversationId: "conv-1",
  period,
  conversationContext: {
    period: convPeriod,
    compareMode: "none",
    metricId: "lav-chiusi",
  },
});
assert.equal(convEffective.period.start, "2026-07-01");
assert.equal(convEffective.period.end, "2026-07-31");
assert.equal(convEffective.metricId, "lav-chiusi");

const julyCacheKey = buildAskToolCacheKey(
  { metricId: "lav-chiusi" },
  { periodStart: "2026-07-01", periodEnd: "2026-07-31", compareMode: "none" },
);
const augustCacheKey = buildAskToolCacheKey(
  { metricId: "lav-chiusi" },
  { periodStart: "2026-08-01", periodEnd: "2026-08-31", compareMode: "none" },
);
assert.notEqual(julyCacheKey, augustCacheKey);

const agostoIntent = classifyAskReportIntent("ad agosto", {
  period,
  compareMode: "none",
  metricId: "lav-chiusi",
});
assert.equal(agostoIntent.intent, "metric_query");

const vagueLavorazioni = classifyAskReportIntent("quante lavorazioni", { period, compareMode: "none" });
assert.equal(vagueLavorazioni.needsClarification, true);
assert.match(vagueLavorazioni.clarificationQuestion ?? "", /chiuse|aperte|ingressi/i);

const margineIntent = classifyAskReportIntent("Perché è cambiato il margine?", { period, compareMode: "none" });
assert.equal(margineIntent.intent, "explanation_query");
assert.equal(margineIntent.planMode, "llm");
assert.equal((margineIntent.toolCalls?.[0]?.args as { metricId: string }).metricId, "eco_margine_operativo_stimato");

const multiMetric = classifyAskReportIntent("fatturato e incassi a luglio", { period, compareMode: "none" });
assert.equal(multiMetric.toolCalls?.length, 2);
assert.equal((multiMetric.toolCalls?.[0]?.args as { metricId: string }).metricId, "eco_fatturato");
assert.equal((multiMetric.toolCalls?.[1]?.args as { metricId: string }).metricId, "eco_incassato");

const compareIntent = classifyAskReportIntent("confronta chiusure con il periodo precedente", {
  period,
  compareMode: "none",
});
assert.equal(compareIntent.intent, "comparison_query");
assert.equal((compareIntent.toolCalls?.[0]?.args as { compareMode: string }).compareMode, "prev_period");

const meseScorsoHint = resolvePeriodHintFromMessage("quanto abbiamo incassato il mese scorso?", 2026, new Date("2026-08-15"));
assert.ok(meseScorsoHint);
assert.equal(meseScorsoHint!.start, "2026-07-01");

const compareNoPeriodShift = resolvePeriodHintFromMessage("confronta fatturato con il mese scorso", 2026);
assert.equal(compareNoPeriodShift, null);

const metrics = resolveAllMetricsFromMessage("tempo di chiusura e backlog", { period, compareMode: "none" });
assert.ok(metrics.includes("lav-tempo"));
assert.ok(metrics.includes("lav-aperti"));

const trendIntent = classifyAskReportIntent("andamento fatturato ultime settimane", { period, compareMode: "none" });
assert.equal(trendIntent.toolCalls?.[0]?.toolName, "get_series");

const greeting = classifyAskReportIntent("come stai", { period, compareMode: "none" });
assert.equal(greeting.intent, "greeting_query");

const recidivitaOp = classifyAskReportIntent("qual é l'addetto con piu mezzi recidivi", {
  period,
  compareMode: "none",
});
assert.equal(recidivitaOp.intent, "recidivita_query");
assert.equal(recidivitaOp.toolCalls?.[0]?.toolName, "get_recidivita");
assert.equal((recidivitaOp.toolCalls?.[0]?.args as { subject: string }).subject, "operatore");
assert.equal((recidivitaOp.toolCalls?.[0]?.args as { rankBy: string }).rankBy, "mezzi_con_ritorno");

const recidivitaRientri = classifyAskReportIntent(
  "qual é l'addetto che ha avuto piu mezzi rientrati per i mezzi su cui ha lavorato",
  { period, compareMode: "none" },
);
assert.equal(recidivitaRientri.intent, "recidivita_query");
assert.equal((recidivitaRientri.toolCalls?.[0]?.args as { rankBy: string }).rankBy, "mezzi_con_ritorno");

const formatted = formatAskRecidivitaAnswer({
  subject: "operatore",
  rankBy: "mezzi_con_ritorno",
  windowDays: 30,
  periodLabel: "2026-08-01 – 2026-08-21",
  operatori: [
    {
      operatoreKey: "a1",
      operatore: "Mario Rossi",
      interventi: 12,
      ritorni: 4,
      mezziConRitorno: 3,
      returnRatePct: 33.3,
      riskIndex: 1.2,
    },
  ],
  dataWarnings: [],
});
assert.match(formatted, /Mario Rossi/);
assert.match(formatted, /3 mezzi/);

console.log("ask-report-core.test.ts OK");
