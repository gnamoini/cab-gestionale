import { z } from "zod";
import { generatedNarrativeSectionSchema } from "@/lib/report/narrative/narrative-schema";
import type { GeneratedNarrativeSection } from "@/lib/report/narrative/types";

/** Solo ciò che il modello può produrre — no generatedAt, no modelMetadata. */
export type GeneratedNarrativeContent = {
  sections: GeneratedNarrativeSection[];
  disclaimer?: string;
};

export const generatedNarrativeContentSchema = z.object({
  sections: z.array(generatedNarrativeSectionSchema),
  disclaimer: z.string().min(1).max(500).optional(),
});
