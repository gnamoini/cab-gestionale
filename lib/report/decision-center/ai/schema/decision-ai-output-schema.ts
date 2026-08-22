import { z } from "zod";

export const decisionAiOutputSchema = z.object({
  decisions: z
    .array(
      z.object({
        candidateId: z.string().min(1),
        title: z.string().max(120).optional(),
        explanation: z.string().min(1).max(600),
        wording: z.enum(["assertive", "qualified"]).default("qualified"),
      }),
    )
    .max(12),
});

export type DecisionAiOutput = z.infer<typeof decisionAiOutputSchema>;
