import { z } from "zod";
import { HEALTH_SCORE_DEFAULT_CONFIG_VERSION } from "@/lib/health-score/versions";

export const healthScoreConfigSchema = z.object({
  configVersion: z.string().default(HEALTH_SCORE_DEFAULT_CONFIG_VERSION),
  sections: z.record(z.string(), z.number()).default({}),
  targets: z.record(z.string(), z.number()).default({}),
  smoothing: z.object({ alpha: z.number().min(0).max(1).default(0.8) }).default({ alpha: 0.8 }),
  confidence: z
    .object({
      lowMultiplier: z.number().default(0.25),
      mediumMultiplier: z.number().default(0.65),
    })
    .default({ lowMultiplier: 0.25, mediumMultiplier: 0.65 }),
  dataQuality: z
    .object({
      lowMultiplier: z.number().default(0.5),
      mediumMultiplier: z.number().default(0.75),
    })
    .default({ lowMultiplier: 0.5, mediumMultiplier: 0.75 }),
  normalizers: z
    .object({
      kTrend: z.number().default(25),
      kLevel: z.number().default(1),
    })
    .default({ kTrend: 25, kLevel: 1 }),
  riskCap: z.number().default(25),
  dependencies: z
    .array(
      z.object({
        kpiId: z.string(),
        requires: z.array(z.string()),
        rule: z.enum(["downweight_if_backlog_high", "suppress_if_completate_zero", "cap_weight_by_backlog_ratio"]),
        backlogThreshold: z.number().optional(),
      }),
    )
    .default([]),
});

export type HealthScoreConfig = z.infer<typeof healthScoreConfigSchema>;
