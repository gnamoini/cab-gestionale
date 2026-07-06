import "server-only";

import type { DocumentDeliverySource } from "@/lib/documents/document-delivery-types";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";

/** RBAC gate for document proxy delivery — aligned with metadata list access. */
export async function verifyDocumentDeliveryAccess(source: DocumentDeliverySource): Promise<boolean> {
  switch (source) {
    case "archive":
      return verifyServerPageRead("documenti");
    case "lavorazione":
      return verifyServerPageRead("lavorazioni");
    default: {
      const _exhaustive: never = source;
      return _exhaustive;
    }
  }
}
