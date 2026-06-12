import "server-only";

import type { DocumentDeliverySource } from "@/lib/documents/document-delivery-types";
import { verifyServerSectionRead } from "@/src/lib/auth/server-permission-guards";

/** RBAC gate for document proxy delivery — aligned with metadata list access. */
export async function verifyDocumentDeliveryAccess(source: DocumentDeliverySource): Promise<boolean> {
  switch (source) {
    case "archive":
      return verifyServerSectionRead("documenti");
    case "lavorazione":
      return verifyServerSectionRead("lavorazioni");
    default: {
      const _exhaustive: never = source;
      return _exhaustive;
    }
  }
}
