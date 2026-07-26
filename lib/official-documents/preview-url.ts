export type OfficialDocumentPreviewSurface = "staff" | "client";

export type OfficialDocumentEntityType = "preventivo" | "ddt";

export function buildStaffOfficialDocumentPreviewPath(
  entityType: OfficialDocumentEntityType,
  entityId: string,
): string {
  return `/documenti/${entityType}/${encodeURIComponent(entityId)}/preview`;
}

export function buildClientOfficialDocumentPreviewPath(token: string): string {
  return `/documenti/${encodeURIComponent(token)}`;
}
