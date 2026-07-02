import { z } from "zod";
import { descriptionSourceTypeSchema } from "./engine-meta.contract";

export const overrideActionSchema = z.enum(["excluded", "rephrased", "moved"]);
export const overrideStatusSchema = z.enum(["active", "obsolete", "reapplied"]);

export const descriptionActivityOverrideSchema = z.object({
  id: z.string().uuid(),
  generationId: z.string().uuid(),
  activityId: z.string().min(1),
  sourceType: descriptionSourceTypeSchema,
  sourceId: z.string().min(1),
  action: overrideActionSchema,
  overrideStatus: overrideStatusSchema,
  originalText: z.string().min(1),
  newText: z.string().optional(),
  newSort: z.number().int().optional(),
  reason: z.string().optional(),
  obsoleteReason: z
    .enum(["kb_version_changed", "activity_deprecated", "superseded_by_regeneration"])
    .optional(),
  at: z.string(),
  by: z.string(),
  kbVersionAtOverride: z.number().int().min(0),
});

export type DescriptionActivityOverrideContract = z.infer<typeof descriptionActivityOverrideSchema>;

/** Transizioni overrideStatus ammesse in production. */
export const OVERRIDE_STATUS_TRANSITIONS: Record<
  z.infer<typeof overrideStatusSchema>,
  readonly z.infer<typeof overrideStatusSchema>[]
> = {
  active: ["obsolete", "reapplied"],
  obsolete: [],
  reapplied: ["obsolete"],
};

export function isValidOverrideStatusTransition(
  from: z.infer<typeof overrideStatusSchema>,
  to: z.infer<typeof overrideStatusSchema>,
): boolean {
  return OVERRIDE_STATUS_TRANSITIONS[from].includes(to);
}
