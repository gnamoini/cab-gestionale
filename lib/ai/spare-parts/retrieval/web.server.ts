import "server-only";

import { google } from "@ai-sdk/google";
import { aiService } from "@/lib/ai/runtime/service";
import { isSparePartsMockMode, mockWebSearchHits, type MockWebHit } from "@/lib/ai/spare-parts/providers/mock";

export type WebSearchStageResult = {
  used: boolean;
  hits: MockWebHit[];
  webCount: number;
};

export async function runWebSearchStage(input: {
  query: string;
  vehicleBrand?: string;
  vehicleModel?: string;
}): Promise<WebSearchStageResult> {
  const query = [input.vehicleBrand, input.vehicleModel, input.query].filter(Boolean).join(" ");

  if (isSparePartsMockMode()) {
    const hits = mockWebSearchHits(query);
    return { used: hits.length > 0, hits, webCount: hits.length };
  }

  const result = await aiService.generateText({
    prompt: `Find OEM spare part numbers for: ${query}. List only explicitly cited part numbers.`,
    operation: "spare_parts_web_search",
    tools: {
      google_search: google.tools.googleSearch({}),
    },
  });

  if (!result.ok) {
    return { used: false, hits: [], webCount: 0 };
  }

  const text = result.data.text ?? "";
  const hits: MockWebHit[] = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((line, i) => ({
      title: `Web fonte ${i + 1}`,
      url: "https://www.google.com/search",
      excerpt: line,
      candidatePartNumber: null,
    }));

  return { used: hits.length > 0, hits, webCount: hits.length };
}
