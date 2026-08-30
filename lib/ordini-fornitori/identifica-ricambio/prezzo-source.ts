import type { CandidatePart, PartEvidence, PriceEvidence } from "@/lib/ai/spare-parts/types/schemas";
import type { PrezzoSourceType } from "@/lib/ordini-fornitori/identifica-ricambio/types";

export function prezzoSourceFromEvidence(
  price: PriceEvidence | null,
  evidence: PartEvidence[],
): { type: PrezzoSourceType; label: string | null } {
  if (price?.sourceTitle?.includes("Magazzino")) {
    return { type: "magazzino", label: price.sourceTitle ?? "Magazzino CAB" };
  }
  const ev =
    evidence.find((e) => e.type === "price_list") ??
    evidence.find((e) => e.type === "catalog" || e.type === "parts_table" || e.type === "exploded_view") ??
    evidence.find((e) => e.type === "web");
  if (!ev && !price) return { type: "unknown", label: null };
  if (price?.priceType === "list") {
    return { type: "listino", label: price.sourceTitle ?? ev?.title ?? null };
  }
  if (ev?.type === "web") {
    return { type: "web", label: ev.title ?? price?.sourceTitle ?? null };
  }
  if (ev?.type === "price_list") {
    return { type: "listino", label: ev.title ?? price?.sourceTitle ?? null };
  }
  if (ev) {
    return { type: "catalogo", label: ev.title ?? price?.sourceTitle ?? null };
  }
  return { type: "unknown", label: price?.sourceTitle ?? null };
}

export function fornitoreHintFromPart(part: CandidatePart): string | null {
  const catalog = part.evidence.find(
    (e) => e.type === "catalog" || e.type === "price_list" || e.type === "manufacturer",
  );
  const fromEvidence = catalog?.title?.trim();
  if (fromEvidence && fromEvidence !== "Magazzino CAB") return fromEvidence;
  return part.manufacturer?.trim() || null;
}
