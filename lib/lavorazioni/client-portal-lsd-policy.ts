export const CLIENT_PORTAL_LSD_NORMAL_MAX = 500;
export const CLIENT_PORTAL_LSD_DEGRADED_MAX = 2000;

export type ClientPortalLsdMode = "normal" | "degraded" | "paginated" | "blocked";

export function resolveClientPortalLsdMode(rowCount: number): ClientPortalLsdMode {
  if (rowCount <= CLIENT_PORTAL_LSD_NORMAL_MAX) return "normal";
  if (rowCount <= CLIENT_PORTAL_LSD_DEGRADED_MAX) return "degraded";
  return "paginated";
}
