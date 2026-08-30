import type { PriceEvidence } from "@/lib/ai/spare-parts/types/schemas";

export function buildExtractedPartPrice(input: {
  listPrice?: number;
  priceCurrency?: string;
  pageKind: string;
  sourceTitle: string;
}): PriceEvidence | null {
  if (input.listPrice == null || !Number.isFinite(input.listPrice) || input.listPrice <= 0) return null;
  return {
    amount: input.listPrice,
    currency: input.priceCurrency?.trim() || "EUR",
    priceType: input.pageKind === "price_list" ? "list" : "unknown",
    sourceTitle: input.sourceTitle,
  };
}
