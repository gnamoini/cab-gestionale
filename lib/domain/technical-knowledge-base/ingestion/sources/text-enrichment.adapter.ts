import type { TkbSourceAdapter } from "../adapter-registry";
import { registerTkbAdapter } from "../adapter-registry";

/** Tier 4 — placeholder; arricchimento testo delegato a preventivi/schede strutturati. */
export const textEnrichmentAdapter: TkbSourceAdapter = {
  id: "text_enrichment",
  tier: 4,
  supportsIncremental: false,
  async collect(ctx) {
    void ctx;
    return [];
  },
};

registerTkbAdapter(textEnrichmentAdapter);
