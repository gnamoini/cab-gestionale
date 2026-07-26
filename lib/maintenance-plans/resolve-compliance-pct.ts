import type { ComplianceReview } from "@/lib/maintenance-plans/maintenance-task";

/** R3 — compliance effettiva sempre derivata, mai persistita. */
export function resolveCompliancePct(
  auto: number | null | undefined,
  review: ComplianceReview | null | undefined,
): number | null {
  if (auto == null || !Number.isFinite(auto)) return null;
  const reviewSafe = review ?? { approved: false, adjustments: [] };
  if (!reviewSafe.approved) return Math.min(100, Math.max(0, auto));
  const delta = reviewSafe.adjustments.reduce((sum, adj) => sum + (adj.delta ?? 0), 0);
  return Math.min(100, Math.max(0, auto + delta));
}

export function parseComplianceReview(raw: unknown): ComplianceReview {
  if (!raw || typeof raw !== "object") return { approved: false, adjustments: [] };
  const o = raw as Record<string, unknown>;
  const adjustments = Array.isArray(o.adjustments)
    ? o.adjustments
        .filter((a): a is Record<string, unknown> => Boolean(a) && typeof a === "object")
        .map((a) => ({
          taskId: String(a.taskId ?? ""),
          reason: (a.reason as ComplianceReview["adjustments"][0]["reason"]) ?? "altro",
          note: String(a.note ?? ""),
          delta: Number(a.delta ?? 0),
        }))
    : [];
  return {
    approved: Boolean(o.approved),
    reviewedBy: typeof o.reviewedBy === "string" ? o.reviewedBy : undefined,
    reviewedAt: typeof o.reviewedAt === "string" ? o.reviewedAt : undefined,
    adjustments,
  };
}
