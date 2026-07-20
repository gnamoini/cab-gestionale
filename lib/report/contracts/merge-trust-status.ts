import type { TrustStatus } from "@/lib/report/contracts/metadata-envelope";

/** RED > AMBER > GREEN — shared by executive, cross-analysis, insights. */
export function mergeTrustStatus(statuses: TrustStatus[]): TrustStatus {
  if (statuses.includes("RED")) return "RED";
  if (statuses.includes("AMBER")) return "AMBER";
  return "GREEN";
}
