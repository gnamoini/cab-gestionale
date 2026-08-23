export type SemanticColorContext = "metricTrend" | "status" | "trust" | "chartSeries";

export type MetricTrendTone = "up" | "down" | "flat";
export type StatusTone = "success" | "warning" | "danger" | "neutral" | "info";
export type TrustTone = "exact" | "derived" | "estimated";
export type ChartSeriesTone = "primary" | "secondary" | "muted" | "accent";

export type SemanticTone =
  | MetricTrendTone
  | StatusTone
  | TrustTone
  | ChartSeriesTone;

const ALLOWED: Record<SemanticColorContext, readonly SemanticTone[]> = {
  metricTrend: ["up", "down", "flat"],
  status: ["success", "warning", "danger", "neutral", "info"],
  trust: ["exact", "derived", "estimated"],
  chartSeries: ["primary", "secondary", "muted", "accent"],
};

const TONE_CLASS: Record<SemanticColorContext, Record<string, string>> = {
  metricTrend: {
    up: "text-[color:color-mix(in_srgb,var(--cab-success)_92%,var(--cab-text))]",
    down: "text-[color:color-mix(in_srgb,var(--cab-danger)_92%,var(--cab-text))]",
    flat: "text-[color:var(--cab-text-muted)]",
  },
  status: {
    success:
      "border-[color:color-mix(in_srgb,var(--cab-success)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-success)_8%,var(--cab-card))] text-[color:color-mix(in_srgb,var(--cab-success)_92%,var(--cab-text))]",
    warning:
      "border-[color:color-mix(in_srgb,var(--cab-warning)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_8%,var(--cab-card))] text-[color:color-mix(in_srgb,var(--cab-warning)_92%,var(--cab-text))]",
    danger:
      "border-[color:color-mix(in_srgb,var(--cab-danger)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-danger)_8%,var(--cab-card))] text-[color:color-mix(in_srgb,var(--cab-danger)_92%,var(--cab-text))]",
    neutral:
      "border-[color:var(--cab-border)] bg-[var(--cab-card)] text-[color:var(--cab-text-muted)]",
    info: "border-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-card))] text-[color:var(--cab-text)]",
  },
  trust: {
    exact: "text-[color:var(--cab-text-muted)]",
    derived: "text-[color:var(--cab-text-muted)]",
    estimated: "text-[color:var(--cab-text-muted)]",
  },
  chartSeries: {
    primary: "var(--cab-primary)",
    secondary: "var(--cab-success)",
    muted: "var(--cab-text-muted)",
    accent: "var(--cab-warning)",
  },
};

/** Dev/test only — non blocca report in produzione. */
export function assertSemanticUsage(context: SemanticColorContext, tone: SemanticTone): void {
  if (process.env.NODE_ENV === "production") return;
  const allowed = ALLOWED[context];
  if (!allowed.includes(tone)) {
    throw new Error(`semantic-colors-policy: tone "${tone}" non ammesso per context "${context}"`);
  }
}

export function semanticColorClass(context: SemanticColorContext, tone: SemanticTone): string {
  assertSemanticUsage(context, tone);
  return TONE_CLASS[context][tone] ?? "";
}

export function semanticChartColor(context: "chartSeries", tone: ChartSeriesTone): string {
  assertSemanticUsage(context, tone);
  return TONE_CLASS.chartSeries[tone] ?? "var(--cab-primary)";
}
