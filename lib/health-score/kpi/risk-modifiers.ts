import { registerRiskModifier } from "@/lib/health-score/registry/risk-modifier-registry";
import type { RiskModifierDefinition } from "@/lib/health-score/registry/types";

const RISK_MODIFIERS: RiskModifierDefinition[] = [
  {
    id: "stagnation",
    title: "Stagnazione stati attesa",
    compute: (ctx) => {
      const inactive = ctx.snapshot.inactiveLavorazioniCount;
      const excess = ctx.snapshot.inactiveWeightedExcessDays;
      if (inactive <= 0) {
        return { penalty: 0, motivation: "Nessuna stagnazione rilevata", trace: [] };
      }
      // Excess soft (attesa ricambi / fornitori) abbassa la penalità sotto il puro count.
      const penalty = Math.min(
        Math.min(inactive, Math.max(excess * 2, inactive * 0.35)),
        15,
      );
      return {
        penalty,
        motivation: `${inactive} lavorazioni ferme oltre la media degli stati di attesa`,
        trace: [
          {
            step: "stagnation_penalty",
            formula: "min(15, min(count, max(excess*2, count*0.35)))",
            input: { count: inactive, weightedExcessDays: excess },
            output: penalty,
          },
        ],
      };
    },
  },
  {
    id: "late-ingress",
    title: "Ritardo ingresso",
    compute: (ctx) => {
      const open = Math.max(ctx.snapshot.openCount, 1);
      const late = ctx.snapshot.lateIngressCount;
      if (late <= 0) {
        return { penalty: 0, motivation: "Nessun ritardo ingresso", trace: [] };
      }
      const ratio = late / open;
      const penalty = Math.min(12 * ratio, 12);
      const lateLabel = Number.isInteger(late) ? String(late) : late.toFixed(1);
      return {
        penalty,
        motivation: `${lateLabel} lavorazioni in ritardo su ${open} aperte`,
        trace: [
          {
            step: "late_ingress_penalty",
            formula: "min(12, 12 * (lateCount / openCount))",
            input: { lateCount: late, openCount: open },
            output: penalty,
          },
        ],
      };
    },
  },
];

export function registerDefaultRiskModifiers(): void {
  for (const m of RISK_MODIFIERS) registerRiskModifier(m);
}
