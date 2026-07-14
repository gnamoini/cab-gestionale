import type { FormulaTraceStep, KpiRawValue } from "@/lib/health-score/types";
import type { KpiContext } from "@/lib/health-score/types";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function deltaPct(current: number, previous: number | null): number | null {
  if (previous == null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function tanhTrendNormalizer(
  raw: KpiRawValue,
  _target: number,
  ctx: KpiContext,
  invert: boolean,
): { score: number; trace: FormulaTraceStep[] } {
  const kTrend = ctx.config.normalizers.kTrend;
  const pct = deltaPct(raw.current, raw.previous);
  const signed = pct == null ? 0 : invert ? -pct : pct;
  const inner = signed / kTrend;
  const score = clamp(50 + 40 * Math.tanh(inner), 5, 95);
  return {
    score,
    trace: [
      {
        step: "trend_normalizer",
        formula: "50 + 40 * tanh(signedDeltaPct / kTrend)",
        input: { current: raw.current, previous: raw.previous ?? 0, signedDeltaPct: signed, kTrend },
        output: score,
      },
    ],
  };
}

export function tanhLevelNormalizer(
  raw: KpiRawValue,
  target: number,
  ctx: KpiContext,
  invert: boolean,
): { score: number; trace: FormulaTraceStep[] } {
  const scale = Math.max(target * ctx.config.normalizers.kLevel, 1);
  const delta = invert ? target - raw.current : raw.current - target;
  const inner = delta / scale;
  const score = clamp(50 + 40 * Math.tanh(inner), 5, 95);
  return {
    score,
    trace: [
      {
        step: "level_normalizer",
        formula: "50 + 40 * tanh(delta / scale)",
        input: { value: raw.current, target, scale, delta, invert },
        output: score,
      },
    ],
  };
}

export function blendTrendLevel(
  trendScore: number,
  levelScore: number,
  trendWeight: number,
  levelWeight: number,
): { score: number; trace: FormulaTraceStep[] } {
  const wSum = trendWeight + levelWeight;
  const score = wSum > 0 ? (trendScore * trendWeight + levelScore * levelWeight) / wSum : 50;
  return {
    score,
    trace: [
      {
        step: "blend",
        formula: "(trendScore * wTrend + levelScore * wLevel) / (wTrend + wLevel)",
        input: { trendScore, levelScore, trendWeight, levelWeight },
        output: score,
      },
    ],
  };
}
