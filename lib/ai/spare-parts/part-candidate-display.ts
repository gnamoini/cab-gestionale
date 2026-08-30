import type { CandidatePart, PriceEvidence } from "@/lib/ai/spare-parts/types/schemas";

export function partCodeLabel(
  match: Pick<CandidatePart, "verifiedPartNumber" | "candidatePartNumber">,
): string | null {
  return match.verifiedPartNumber ?? match.candidatePartNumber;
}

export function resolvePartPrice(
  part: Pick<CandidatePart, "verifiedPrice" | "priceCandidate">,
): PriceEvidence | null {
  return part.verifiedPrice ?? part.priceCandidate;
}

export function partCatalogSource(part: CandidatePart): string | null {
  const ev = part.evidence.find((e) =>
    e.type === "catalog" || e.type === "price_list" || e.type === "parts_table" || e.type === "exploded_view",
  );
  return ev?.title?.trim() || resolvePartPrice(part)?.sourceTitle?.trim() || null;
}

export function partCatalogDescription(part: CandidatePart): string {
  const primary = part.description.trim();
  const excerpt = part.evidence
    .map((e) => e.excerpt?.trim())
    .filter((t): t is string => Boolean(t))
    .sort((a, b) => b.length - a.length)[0];
  if (!excerpt || excerpt === primary) return primary;
  if (primary.includes(excerpt) || excerpt.includes(primary)) return primary.length >= excerpt.length ? primary : excerpt;
  return excerpt;
}

export function buildPartEvidenceNotes(part: CandidatePart): string | null {
  const lines: string[] = [];
  if (!part.verifiedPartNumber && part.candidatePartNumber) {
    lines.push(`Codice candidato (non verificato): ${part.candidatePartNumber}`);
  }
  for (const ev of part.evidence.slice(0, 4)) {
    const bits = [ev.title, ev.excerpt, ev.url].filter(Boolean);
    if (bits.length) lines.push(bits.join(" — "));
  }
  return lines.length ? lines.join("\n") : null;
}

export function primarySourceDocumentId(part: CandidatePart): string | null {
  const ev = part.evidence.find((e) => e.documentId);
  return ev?.documentId ?? null;
}

export function formatPartPrice(price: PriceEvidence | null | undefined): string | null {
  if (!price || !Number.isFinite(price.amount)) return null;
  try {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: price.currency || "EUR",
    }).format(price.amount);
  } catch {
    return `${price.amount} ${price.currency || "EUR"}`;
  }
}

export function formatPartPriceLine(price: PriceEvidence | null | undefined): string | null {
  const formatted = formatPartPrice(price);
  if (!formatted) return null;
  const typeLabel =
    price?.priceType === "list" ? "listino" : price?.priceType === "net" ? "netto" : price?.priceType === "web" ? "web" : null;
  const source = price?.sourceTitle?.trim();
  return [formatted, typeLabel, source].filter(Boolean).join(" · ");
}
