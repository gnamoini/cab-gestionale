import type { CabDocumentType } from "@/lib/integrations/unoerp/types";

export type DocumentLink = {
  cabDocumentId: string;
  cabDocumentType: CabDocumentType;
  unoerpModule: string;
  unoerpFile: string;
  unoerpRecordId: string;
};

export function assertOwnedByCab(opts: {
  link: DocumentLink | null;
  requested: DocumentLink;
}): { ok: true } | { ok: false; code: "UNOERP_OWNERSHIP_VIOLATION" } {
  if (!opts.link) return { ok: false, code: "UNOERP_OWNERSHIP_VIOLATION" };
  const a = opts.link;
  const b = opts.requested;
  if (
    a.cabDocumentId !== b.cabDocumentId ||
    a.cabDocumentType !== b.cabDocumentType ||
    a.unoerpModule !== b.unoerpModule ||
    a.unoerpFile !== b.unoerpFile ||
    a.unoerpRecordId !== b.unoerpRecordId
  ) {
    return { ok: false, code: "UNOERP_OWNERSHIP_VIOLATION" };
  }
  return { ok: true };
}
